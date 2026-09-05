local M = {}

local desktopByBundle = {
  ["com.tencent.qq"] = "qq",
  ["com.microsoft.VSCode"] = "vscode",
  ["com.mitchellh.ghostty"] = "ghostty",
  ["com.openai.codex"] = "chatgpt",
  ["com.google.antigravity"] = "antigravity",
  ["com.tencent.QQMusicMac"] = "qqmusic",
  ["com.workbuddy.workbuddy"] = "workbuddy"
}

local hidden = false

local function timestamp()
  return os.date("!%Y-%m-%dT%H:%M:%SZ")
end

local function setSnapshot(availability, desktopApp)
  M.latest = {
    availability = availability,
    desktopApp = desktopApp or "",
    observedAt = timestamp()
  }
  print("[本地活动] " .. hs.json.encode(M.latest))
end

local function refresh()
  if hidden then
    setSnapshot("hidden", nil)
    return
  end

  local app = hs.application.frontmostApplication()
  local bundleId = app and app:bundleID() or nil
  setSnapshot("active", bundleId and desktopByBundle[bundleId] or nil)
end

local function hide()
  hidden = true
  setSnapshot("hidden", nil)
end

local function wake()
  hidden = false
  refresh()
end

M.watcher = hs.application.watcher.new(function(_, event)
  if event == hs.application.watcher.activated then
    refresh()
  end
end)

M.caffeinateWatcher = hs.caffeinate.watcher.new(function(event)
  if event == hs.caffeinate.watcher.screensDidLock
      or event == hs.caffeinate.watcher.systemWillSleep
      or event == hs.caffeinate.watcher.sessionDidResignActive then
    hide()
  elseif event == hs.caffeinate.watcher.screensDidUnlock
      or event == hs.caffeinate.watcher.systemDidWake
      or event == hs.caffeinate.watcher.sessionDidBecomeActive then
    wake()
  end
end)

function M.start()
  hidden = false
  M.watcher:start()
  M.caffeinateWatcher:start()
  refresh()
  return M
end

function M.stop()
  M.watcher:stop()
  M.caffeinateWatcher:stop()
  hide()
  return M
end

function M.getSnapshot()
  refresh()
  return M.latest
end

M.start()
return M
