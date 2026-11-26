import AppKit

final class SettingsWindow: NSObject, NSTextFieldDelegate {
    let window = NSWindow(contentRect: NSRect(x: 0, y: 0, width: 492, height: 335),
                          styleMask: [.titled, .closable, .miniaturizable], backing: .buffered, defer: false)
    private let controller: ReportingController
    private let toggle = NSSwitch()
    private let address = NSTextField()
    private let token = NSSecureTextField()
    private let connection = NSTextField(wrappingLabelWithString: "")
    private let feedback = NSTextField(wrappingLabelWithString: "")
    private let save = NSButton(title: "保存地址和凭据", target: nil, action: nil)
    private let copyDigest = NSButton(title: "复制凭据摘要", target: nil, action: nil)
    private var busy = false
    private let iso = ISO8601DateFormatter()
    private let localDate = DateFormatter()

    init(_ controller: ReportingController) {
        self.controller = controller
        super.init()
        iso.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        localDate.dateStyle = .short
        localDate.timeStyle = .medium
        window.title = "Mac Presence 设置"
        window.isReleasedWhenClosed = false
        window.center()
        window.setFrameAutosaveName("MacPresenceSettings")
        let content = NSStackView()
        content.orientation = .vertical
        content.alignment = .leading
        content.spacing = 9
        content.translatesAutoresizingMaskIntoConstraints = false
        guard let view = window.contentView else { return }
        view.addSubview(content)
        NSLayoutConstraint.activate([
            content.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 24),
            content.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -24),
            content.topAnchor.constraint(equalTo: view.topAnchor, constant: 22),
        ])
        func section(_ item: NSView) {
            content.addArrangedSubview(item)
            item.widthAnchor.constraint(equalTo: content.widthAnchor).isActive = true
        }
        let heading = NSTextField(labelWithString: "启用活动上报")
        heading.font = .systemFont(ofSize: 15, weight: .semibold)
        toggle.target = self
        toggle.action = #selector(toggleReporting)
        toggle.setAccessibilityLabel("启用活动上报")
        section(row(heading, toggle))
        connection.font = .systemFont(ofSize: 12)
        connection.textColor = .secondaryLabelColor
        section(connection)
        content.setCustomSpacing(14, after: connection)
        let separator = NSBox()
        separator.boxType = .separator
        section(separator)
        content.setCustomSpacing(15, after: separator)
        content.addArrangedSubview(NSTextField(labelWithString: "博客 API 地址"))
        address.placeholderString = "https://blog.example.com/api/presence/report"
        address.setAccessibilityLabel("博客 API 地址")
        address.stringValue = controller.preferences.endpoint
        address.delegate = self
        section(address)
        content.setCustomSpacing(12, after: address)
        content.addArrangedSubview(NSTextField(labelWithString: "Bearer Token（可选）"))
        token.placeholderString = "留空以沿用或生成此站点的凭据"
        token.setAccessibilityLabel("Bearer Token（可选）")
        token.delegate = self
        section(token)
        content.setCustomSpacing(16, after: token)
        copyDigest.target = self
        copyDigest.action = #selector(copyCredential)
        copyDigest.toolTip = "复制给博客配置 PRESENCE_REPORT_TOKEN_SHA256 的 SHA-256 摘要"
        save.target = self
        save.action = #selector(saveSettings)
        save.keyEquivalent = "\r"
        section(row(copyDigest, save))
        feedback.font = .systemFont(ofSize: 12)
        section(feedback)
        window.initialFirstResponder = address
        refresh()
    }

    private func row(_ first: NSView, _ last: NSView) -> NSStackView {
        let spacer = NSView()
        spacer.setContentHuggingPriority(.defaultLow, for: .horizontal)
        let stack = NSStackView(views: [first, spacer, last])
        stack.orientation = .horizontal
        stack.alignment = .centerY
        return stack
    }

    func show() {
        controller.refreshStatus()
        refresh()
        NSApp.activate(ignoringOtherApps: true)
        window.makeKeyAndOrderFront(nil)
    }

    func refresh() {
        toggle.state = controller.preferences.enabled ? .on : .off
        toggle.isEnabled = !controller.preferences.endpoint.isEmpty
        var detail = controller.summary
        if let value = controller.lastAck, let date = iso.date(from: value) {
            detail += "  ·  最近成功 \(localDate.string(from: date))"
        }
        connection.stringValue = detail
        let draft = address.stringValue.trimmingCharacters(in: .whitespacesAndNewlines)
        let dirty = draft != controller.preferences.endpoint || !token.stringValue.isEmpty
        save.isEnabled = !busy && !draft.isEmpty && dirty
        copyDigest.isEnabled = !busy && !dirty && !controller.preferences.endpoint.isEmpty
        address.isEditable = !busy
        token.isEditable = !busy
    }

    func controlTextDidChange(_ notification: Notification) {
        feedback.stringValue = ""
        refresh()
    }

    private func message(_ value: String, error: Bool = false) {
        feedback.stringValue = value
        feedback.textColor = error ? .systemRed : .secondaryLabelColor
        NSAccessibility.post(element: feedback, notification: .valueChanged)
    }

    @objc func toggleReporting() {
        do { try controller.setEnabled(!controller.preferences.enabled); message("") }
        catch { show(); message(error.localizedDescription, error: true) }
        refresh()
    }

    @objc private func saveSettings() {
        guard save.isEnabled else { return }
        busy = true
        let hasToken = !token.stringValue.isEmpty
        refresh()
        message("正在保存…")
        controller.credential("--save", endpoint: address.stringValue, token: token.stringValue) { [weak self] result in
            guard let self else { return }
            busy = false
            do {
                let reply = try result.get()
                try controller.saveEndpoint(reply.endpoint, credentialChanged: hasToken)
                address.stringValue = reply.endpoint
                token.stringValue = ""
                message("已保存。")
            } catch { message(error.localizedDescription, error: true) }
            refresh()
        }
    }

    @objc private func copyCredential() {
        guard copyDigest.isEnabled else { return }
        busy = true
        refresh()
        controller.credential("--digest", endpoint: controller.preferences.endpoint) { [weak self] result in
            guard let self else { return }
            busy = false
            do {
                let reply = try result.get()
                NSPasteboard.general.clearContents()
                NSPasteboard.general.setString(reply.digest, forType: .string)
                message("摘要已复制，可粘贴到博客的 PRESENCE_REPORT_TOKEN_SHA256。")
            } catch { message(error.localizedDescription, error: true) }
            refresh()
        }
    }
}
