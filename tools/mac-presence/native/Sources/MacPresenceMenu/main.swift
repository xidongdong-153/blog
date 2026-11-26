import AppKit

private let openSettings = Notification.Name("com.xdd.mac-presence.openSettings")

final class MenuApp: NSObject, NSApplicationDelegate, NSWindowDelegate {
    private let controller: ReportingController
    private let settings: SettingsWindow
    private var item: NSStatusItem!
    private let quickToggle = NSMenuItem()
    private var refreshTimer: Timer?
    private var terminationSignal: DispatchSourceSignal?

    init(_ installation: Installation) {
        controller = ReportingController(installation)
        settings = SettingsWindow(controller)
        super.init()
        settings.window.delegate = self
    }

    private func settingsItem() -> NSMenuItem {
        let item = NSMenuItem(title: "设置…", action: #selector(showSettings), keyEquivalent: ",")
        item.target = self
        return item
    }

    func applicationDidFinishLaunching(_ notification: Notification) {
        let appMenu = NSMenu()
        appMenu.addItem(settingsItem())
        let mainMenu = NSMenu()
        let appItem = NSMenuItem()
        appItem.submenu = appMenu
        mainMenu.addItem(appItem)
        let edit = NSMenu(title: "编辑")
        for (title, action, key) in [("剪切", "cut:", "x"), ("复制", "copy:", "c"), ("粘贴", "paste:", "v"), ("全选", "selectAll:", "a")] {
            edit.addItem(withTitle: title, action: Selector(action), keyEquivalent: key)
        }
        let editItem = NSMenuItem(title: "编辑", action: nil, keyEquivalent: "")
        editItem.submenu = edit
        mainMenu.addItem(editItem)
        let windowMenu = NSMenu(title: "窗口")
        windowMenu.addItem(withTitle: "关闭窗口", action: #selector(NSWindow.performClose(_:)), keyEquivalent: "w")
        let windowItem = NSMenuItem(title: "窗口", action: nil, keyEquivalent: "")
        windowItem.submenu = windowMenu
        mainMenu.addItem(windowItem)
        NSApp.mainMenu = mainMenu

        item = NSStatusBar.system.statusItem(withLength: NSStatusItem.squareLength)
        item.button?.setAccessibilityLabel("Mac Presence")
        let menu = NSMenu(title: "Mac Presence")
        menu.autoenablesItems = false
        menu.addItem(settingsItem())
        menu.addItem(.separator())
        quickToggle.target = self
        quickToggle.action = #selector(toggle)
        menu.addItem(quickToggle)
        item.menu = menu
        DistributedNotificationCenter.default().addObserver(self, selector: #selector(showSettings), name: openSettings, object: nil)
        controller.didChange = { [weak self] in self?.refresh() }
        controller.didStop = { NSApp.reply(toApplicationShouldTerminate: true) }
        signal(SIGTERM, SIG_IGN)
        let source = DispatchSource.makeSignalSource(signal: SIGTERM, queue: .main)
        source.setEventHandler { NSApp.terminate(nil) }
        source.resume()
        terminationSignal = source
        controller.reconcile()
        refreshTimer = Timer.scheduledTimer(withTimeInterval: 1, repeats: true) { [weak self] _ in
            guard let self, settings.window.isVisible else { return }
            controller.refreshStatus()
            settings.refresh()
        }
        let requested = URL(fileURLWithPath: controller.installation.stateDirectory).appendingPathComponent("show-settings")
        if FileManager.default.fileExists(atPath: requested.path) || controller.preferences.endpoint.isEmpty {
            try? FileManager.default.removeItem(at: requested)
            showSettings()
        }
    }

    private func refresh() {
        let enabled = controller.preferences.enabled
        quickToggle.title = enabled ? "暂停上报" : "开启上报"
        quickToggle.isEnabled = !controller.preferences.endpoint.isEmpty
        item.button?.image = NSImage(systemSymbolName: enabled ? "antenna.radiowaves.left.and.right" : "pause.circle", accessibilityDescription: "Mac Presence")
        item.button?.image?.isTemplate = true
        item.button?.toolTip = enabled ? "Mac Presence · 活动上报" : "Mac Presence · 已暂停"
        settings.refresh()
    }

    @objc func showSettings() { NSApp.setActivationPolicy(.regular); settings.show() }
    @objc private func toggle() { settings.toggleReporting() }
    func applicationShouldHandleReopen(_ sender: NSApplication, hasVisibleWindows flag: Bool) -> Bool { showSettings(); return true }
    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool { false }
    func windowWillClose(_ notification: Notification) { NSApp.setActivationPolicy(.accessory) }
    func applicationShouldTerminate(_ sender: NSApplication) -> NSApplication.TerminateReply {
        controller.prepareToQuit() ? .terminateNow : .terminateLater
    }
}

func launchctl(_ args: [String]) -> Bool {
    let p = Process()
    p.executableURL = URL(fileURLWithPath: "/bin/launchctl")
    p.arguments = args
    p.standardOutput = FileHandle.nullDevice
    p.standardError = FileHandle.nullDevice
    do { try p.run(); p.waitUntilExit(); return p.terminationStatus == 0 } catch { return false }
}

umask(0o077)
let app = NSApplication.shared
app.setActivationPolicy(.accessory)
do {
    let descriptor = Bundle.main.url(forResource: "Installation", withExtension: "plist")
    guard let descriptor else { throw SettingsError(message: "请先运行 tools/mac-presence/bin/install 安装 Mac Presence。") }
    let installation = try PropertyListDecoder().decode(Installation.self, from: Data(contentsOf: descriptor))
    if !CommandLine.arguments.contains("--agent") {
        let domain = "gui/\(getuid())"
        let registered = launchctl(["print", "\(domain)/com.xdd.mac-presence"])
        if registered {
            DistributedNotificationCenter.default().postNotificationName(openSettings, object: nil, userInfo: nil, deliverImmediately: true)
        } else {
            let request = URL(fileURLWithPath: installation.stateDirectory).appendingPathComponent("show-settings")
            try Data().write(to: request, options: .atomic)
            let plist = NSHomeDirectory() + "/Library/LaunchAgents/com.xdd.mac-presence.plist"
            guard launchctl(["bootstrap", domain, plist]) else { throw SettingsError(message: "无法启动登录服务，请重新运行 bin/install。") }
        }
    } else {
        let delegate = MenuApp(installation)
        app.delegate = delegate
        withExtendedLifetime(delegate) { app.run() }
    }
} catch {
    app.setActivationPolicy(.regular)
    app.activate(ignoringOtherApps: true)
    let alert = NSAlert()
    alert.messageText = "无法打开 Mac Presence"
    alert.informativeText = error.localizedDescription
    alert.runModal()
    exit(1)
}
