#!/bin/bash
set -euo pipefail
umask 077
root=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)
support=${PRESENCE_HOME:-"$HOME/Library/Application Support/XDD/MacPresence"}
label=com.xdd.mac-presence
plist="$HOME/Library/LaunchAgents/$label.plist"
domain="gui/$(id -u)"

unload_agent() {
  local attempt
  if ! launchctl print "$domain/$label" >/dev/null 2>&1; then return 0; fi
  launchctl bootout "$domain/$label" || return 1
  for ((attempt=0; attempt<50; attempt++)); do
    if ! launchctl print "$domain/$label" >/dev/null 2>&1; then return 0; fi
    sleep 0.25
  done
  echo '旧采集器仍在退出，可用 bin/status 查看进程状态' >&2
  return 1
}

load_agent() {
  local attempt message
  for ((attempt=0; attempt<50; attempt++)); do
    if message=$(launchctl bootstrap "$domain" "$plist" 2>&1); then return 0; fi
    # bootout 后 launchd 可能仍在释放 label，此时 bootstrap 暂时返回 EIO。
    [[ $message == *'Bootstrap failed: 5:'* ]] || break
    sleep 0.25
  done
  printf '%s\n' "$message" >&2
  return 1
}

node_path() {
  local candidate=${PRESENCE_NODE_BIN:-node}
  "$candidate" -e '
    const [major, minor] = process.versions.node.split(".").map(Number)
    if (major < 26 || (major === 26 && minor < 7)) { console.error("需要 Node 26.7 或更高版本，可通过 PRESENCE_NODE_BIN 指定路径"); process.exit(1) }
    console.log(require("node:fs").realpathSync(process.execPath))'
}
