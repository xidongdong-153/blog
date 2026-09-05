#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
config_dir="${HOME}/.hammerspoon"
module_source="${repo_root}/scripts/presence/hammerspoon/presence.lua"
module_target="${config_dir}/presence.lua"
init_target="${config_dir}/init.lua"

mkdir -p "${config_dir}"

if [[ -f "${module_target}" ]] && ! cmp -s "${module_source}" "${module_target}"; then
  backup="${module_target}.backup.$(date +%Y%m%d%H%M%S)"
  cp "${module_target}" "${backup}"
  printf '已备份旧 Hammerspoon 模块：%s\n' "${backup}"
fi
cp "${module_source}" "${module_target}"

if [[ ! -f "${init_target}" ]]; then
  printf '%s\n' 'require("hs.ipc")' 'presence = require("presence")' 'presenceTest = presence' > "${init_target}"
elif ! grep -Fq 'presence = require("presence")' "${init_target}"; then
  printf '\n%s\n%s\n' 'require("hs.ipc")' 'presence = require("presence")' >> "${init_target}"
  printf '%s\n' 'presenceTest = presence' >> "${init_target}"
fi

open -a Hammerspoon
printf '%s\n' 'Hammerspoon 活动监听已安装，请在菜单栏重新加载配置。'
