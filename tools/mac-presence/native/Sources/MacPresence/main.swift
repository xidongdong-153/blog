import AppKit
import CoreGraphics
import IOKit

struct Snapshot: Encodable {
    let availability: String
    let bundleId: String?
    let sampledAt: Int64
}

final class DesktopMonitor: NSObject {
    private var sleeping = false
    private var switchedAway = false
    private var lockNotified = false
    private let registryRoot = IORegistryGetRootEntry(kIOMainPortDefault)

    deinit { IOObjectRelease(registryRoot) }

    func snapshot() -> Snapshot {
        var available = false
        if !sleeping, !switchedAway, !lockNotified,
           let session = CGSessionCopyCurrentDictionary() as? [String: Any],
           session[kCGSessionOnConsoleKey as String] as? Bool == true,
           session[kCGSessionLoginDoneKey as String] as? Bool == true,
           let locked = IORegistryEntryCreateCFProperty(registryRoot, "IOConsoleLocked" as CFString, kCFAllocatorDefault, 0)?.takeRetainedValue() as? Bool {
            available = !locked
        }
        let app = available ? NSWorkspace.shared.frontmostApplication : nil
        return Snapshot(availability: app == nil ? "hidden" : "active", bundleId: app?.bundleIdentifier,
                        sampledAt: Int64(Date().timeIntervalSince1970 * 1000))
    }

    @objc func publish() {
        guard let data = try? JSONEncoder().encode(snapshot()) else { return }
        FileHandle.standardOutput.write(data + Data([0x0a]))
    }

    @objc private func workspaceChanged(_ note: Notification) {
        switch note.name {
        case NSWorkspace.willSleepNotification: sleeping = true
        case NSWorkspace.didWakeNotification: sleeping = false
        case NSWorkspace.sessionDidResignActiveNotification: switchedAway = true
        case NSWorkspace.sessionDidBecomeActiveNotification: switchedAway = false
        default: break
        }
        publish()
    }

    @objc private func lockChanged(_ note: Notification) {
        lockNotified = note.name.rawValue == "com.apple.screenIsLocked"
        publish()
    }

    func start() {
        let workspace = NSWorkspace.shared.notificationCenter
        for name in [NSWorkspace.didActivateApplicationNotification, NSWorkspace.willSleepNotification,
                     NSWorkspace.didWakeNotification, NSWorkspace.sessionDidResignActiveNotification,
                     NSWorkspace.sessionDidBecomeActiveNotification] {
            workspace.addObserver(self, selector: #selector(workspaceChanged(_:)), name: name, object: nil)
        }
        for name in ["com.apple.screenIsLocked", "com.apple.screenIsUnlocked"] {
            DistributedNotificationCenter.default().addObserver(self, selector: #selector(lockChanged(_:)),
                name: Notification.Name(name), object: nil, suspensionBehavior: .deliverImmediately)
        }
        Timer.scheduledTimer(withTimeInterval: 1, repeats: true) { [self] _ in publish() }
        publish()
        RunLoop.main.run()
    }
}

let monitor = DesktopMonitor()
if CommandLine.arguments.contains("--once") { monitor.publish() } else { monitor.start() }
