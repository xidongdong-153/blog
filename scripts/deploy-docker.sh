#!/usr/bin/env bash
set -euo pipefail
umask 077

fail() {
  printf '%s\n' "$*" >&2
  exit 1
}

image=${DEPLOY_IMAGE:?}
port=${DEPLOY_BLOG_PORT:-4400}
[[ "$image" =~ ^([a-z0-9._:-]+/)+[a-z0-9._-]+@sha256:[0-9a-f]{64}$ ]] || fail 'Expected an image digest.'
if ! [[ "$port" =~ ^[1-9][0-9]{0,4}$ ]] || ((port > 65535)); then
  fail 'Invalid deployment port.'
fi

: "${DEPLOY_COMPOSE:?}" "${DEPLOY_APP_ENV:?}"
cd -- "${DEPLOY_DIR:?}"
deploy_dir=$(pwd -P)

docker_cli=(docker)
if ! docker info --format '{{.ServerVersion}}' </dev/null >/dev/null 2>&1; then
  docker_cli=(sudo -n docker)
  "${docker_cli[@]}" info --format '{{.ServerVersion}}' </dev/null >/dev/null ||
    fail 'Deployment requires docker access or sudo -n docker.'
fi

compose() (
  local release=$1
  shift
  unset BLOG_ENV_FILE BLOG_ENV_FORMAT BLOG_IMAGE BLOG_PORT
  "${docker_cli[@]}" compose --project-name xdd-blog --project-directory "$deploy_dir" \
    --env-file "$release/image.env" --file "$release/compose.yaml" "$@" </dev/null
)

pull_image() (
  if [[ -z "${GHCR_TOKEN:-}" ]]; then
    "${docker_cli[@]}" pull "$image" </dev/null
    return
  fi

  local auth_dir auth
  auth_dir=$(mktemp -d)
  trap 'rm -f -- "$auth_dir/config.json" && rmdir -- "$auth_dir"' EXIT
  auth=$(printf '%s:%s' "${GHCR_USER:?}" "$GHCR_TOKEN" | base64 | tr -d '\n')
  printf '{"auths":{"ghcr.io":{"auth":"%s"}}}\n' "$auth" > "$auth_dir/config.json"
  "${docker_cli[@]}" --config "$auth_dir" pull "$image" </dev/null
)

check_http() {
  local binding=$1 expected=$2 path=$3 status
  shift 3
  status=$(curl --noproxy '*' --http1.1 --silent --show-error --max-time 5 \
    --output /dev/null --write-out '%{http_code}' "$@" "http://$binding$path") || return 1
  printf '%s returned HTTP %s\n' "$path" "$status"
  [[ "$status" == "$expected" ]]
}

start_release() {
  local release=$1 binding
  compose "$release" up -d --no-build --pull never --wait --wait-timeout 90 blog || return 1
  binding=$(compose "$release" port blog 4400) || return 1
  check_http "$binding" 200 / &&
    check_http "$binding" 200 /api/system/db-check &&
    check_http "$binding" 200 /api/visitors/stats &&
    check_http "$binding" 401 /api/visitors/socket \
      -H 'Connection: Upgrade' -H 'Upgrade: websocket' \
      -H 'Sec-WebSocket-Version: 13' -H 'Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ=='
}

previous_release=
if [[ -f "$deploy_dir/current" ]]; then
  IFS= read -r previous_release < "$deploy_dir/current"
  [[ -r "$previous_release/compose.yaml" && -r "$previous_release/image.env" ]] || fail 'Previous release files are missing.'
fi

release=$(mktemp -d "$deploy_dir/release.XXXXXX")
trap '[[ -f "$deploy_dir/current" && "$(<"$deploy_dir/current")" == "$release" ]] || rm -f -- "$release/app.env"' EXIT
printf '%s\n' "$DEPLOY_COMPOSE" > "$release/compose.yaml"
printf '%s\n' "$DEPLOY_APP_ENV" > "$release/app.env"
unset DEPLOY_APP_ENV
printf 'BLOG_IMAGE=%s\nBLOG_PORT=%s\nBLOG_ENV_FILE=%s/app.env\nBLOG_ENV_FORMAT=raw\n' \
  "$image" "$port" "${release##*/}" > "$release/image.env"
printf '%s\n' "$release" > "$release/current"
compose "$release" config --quiet

binding=$(compose "$release" port blog 4400 2>/dev/null || true)
if [[ "$binding" != "127.0.0.1:$port" ]] && (: > "/dev/tcp/127.0.0.1/$port") 2>/dev/null; then
  fail "Port $port is already in use. Set DEPLOY_BLOG_PORT to a free port or release the port before deploying."
fi

pull_image
unset GHCR_TOKEN
compose "$release" run --rm --no-deps --pull never blog pnpm db:migrate
compose "$release" run --rm --no-deps --pull never blog pnpm db:verify
compose "$release" run --rm --no-deps --pull never blog pnpm summary:sync || printf 'AI summary sync failed. Continuing the deployment.\n' >&2

if start_release "$release" && mv -f -- "$release/current" "$deploy_dir/current"; then
  printf 'Deployed %s on 127.0.0.1:%s\n' "$image" "$port"
  exit 0
fi

printf 'Deployment failed.\n' >&2
compose "$release" ps --all >&2 || true
if [[ -n "$previous_release" ]]; then
  printf 'Restoring the previous release.\n' >&2
  start_release "$previous_release" || fail 'The previous release could not be restored.'
else
  compose "$release" rm --stop --force blog || fail 'The failed container could not be removed.'
fi
exit 1
