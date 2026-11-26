import AppKit
import SQLite3

struct Installation: Decodable {
    let node: String
    let toolDirectory: String
    let stateDirectory: String
    let herdr: String
    let version: String

    func command(_ script: String, arguments: [String]) -> Process {
        let process = Process()
        process.executableURL = URL(fileURLWithPath: node)
        process.arguments = [(toolDirectory as NSString).appendingPathComponent(script)] + arguments
        var env = ProcessInfo.processInfo.environment
        env["PRESENCE_HOME"] = stateDirectory
        env["PRESENCE_HERDR_BIN"] = herdr
        env["PRESENCE_VERSION"] = version
        process.environment = env
        return process
    }
}

struct Preferences: Codable {
    var endpoint: String
    var enabled: Bool
}

private struct WorkerStatus: Decodable {
    let pid: Int32
    let lastAckAt: String?
    let lastError: String?
}

struct CredentialReply: Decodable {
    let endpoint: String
    let digest: String
}

struct SettingsError: LocalizedError {
    let message: String
    var errorDescription: String? { message }
}

final class ReportingController {
    let installation: Installation
    private let preferencesFile: URL
    private(set) var preferences = Preferences(endpoint: "", enabled: false)
    private(set) var errorMessage: String?
    private var worker: Process?
    private var workerInput: Pipe?
    private var endingWorker = false
    private var retry: DispatchWorkItem?
    private var shuttingDown = false
    private var lastStatus: WorkerStatus?
    var didChange: (() -> Void)?
    var didStop: (() -> Void)?

    init(_ installation: Installation) {
        self.installation = installation
        preferencesFile = URL(fileURLWithPath: installation.stateDirectory).appendingPathComponent("preferences.json")
        do { preferences = try JSONDecoder().decode(Preferences.self, from: Data(contentsOf: preferencesFile)) }
        catch { errorMessage = "请重新保存博客地址，再开启上报。" }
    }

    func setEnabled(_ enabled: Bool) throws {
        guard !enabled || !preferences.endpoint.isEmpty else { throw SettingsError(message: "请先保存博客 API 地址。") }
        try persist(Preferences(endpoint: preferences.endpoint, enabled: enabled))
        reconcile()
    }

    func saveEndpoint(_ endpoint: String, credentialChanged: Bool) throws {
        let restart = endpoint != preferences.endpoint || credentialChanged
        try persist(Preferences(endpoint: endpoint, enabled: preferences.enabled))
        if restart { lastStatus = nil }
        reconcile(restart: restart)
    }

    private func persist(_ next: Preferences) throws {
        do { try JSONEncoder().encode(next).write(to: preferencesFile, options: .atomic) }
        catch { throw SettingsError(message: "无法写入本机设置，请检查用户目录的写入权限。") }
        preferences = next
        errorMessage = nil
    }

    func reconcile(restart: Bool = false) {
        retry?.cancel()
        retry = nil
        if let worker {
            if (restart || !preferences.enabled || shuttingDown) && !endingWorker {
                endingWorker = true
                // 关闭管道让 Node 发出最后一次 hidden。主程序异常退出也会关闭此管道。
                try? workerInput?.fileHandleForWriting.close()
                DispatchQueue.main.asyncAfter(deadline: .now() + 6) { [weak self, weak worker] in
                    if let self, let worker, self.worker === worker, self.endingWorker, worker.isRunning {
                        kill(worker.processIdentifier, SIGKILL)
                    }
                }
            }
        } else if !shuttingDown && preferences.enabled && !preferences.endpoint.isEmpty {
            startWorker()
        }
        didChange?()
    }

    private func startWorker() {
        let process = installation.command("collector.mts", arguments: [preferences.endpoint, "--supervised"])
        let input = Pipe()
        process.standardInput = input
        process.standardOutput = FileHandle.nullDevice
        process.standardError = FileHandle.nullDevice
        process.terminationHandler = { [weak self] child in
            DispatchQueue.main.async { self?.workerExited(child) }
        }
        do {
            try process.run()
            worker = process
            workerInput = input
            errorMessage = nil
        } catch {
            errorMessage = "采集器启动失败，请检查安装时使用的 Node 是否仍可用。"
            scheduleRetry()
        }
    }

    private func workerExited(_ child: Process) {
        guard worker === child else { return }
        let expected = endingWorker
        if !expected { refreshStatus() }
        worker = nil
        workerInput = nil
        endingWorker = false
        if shuttingDown { didStop?(); return }
        if expected { reconcile(); return }
        errorMessage = lastStatus?.lastError ?? "采集器已退出，正在重试。"
        if preferences.enabled { scheduleRetry() }
        didChange?()
    }

    private func scheduleRetry() {
        let work = DispatchWorkItem { [weak self] in self?.reconcile() }
        retry = work
        DispatchQueue.main.asyncAfter(deadline: .now() + 5, execute: work)
    }

    func prepareToQuit() -> Bool {
        shuttingDown = true
        reconcile()
        return worker == nil
    }

    func refreshStatus() {
        guard let worker, !endingWorker else { return }
        var db: OpaquePointer?
        let path = (installation.stateDirectory as NSString).appendingPathComponent("runtime.sqlite")
        defer { sqlite3_close(db) }
        guard sqlite3_open_v2(path, &db, SQLITE_OPEN_READONLY, nil) == SQLITE_OK else { return }
        var stmt: OpaquePointer?
        defer { sqlite3_finalize(stmt) }
        guard sqlite3_prepare_v2(db, "SELECT status FROM runtime WHERE id = 1", -1, &stmt, nil) == SQLITE_OK,
              sqlite3_step(stmt) == SQLITE_ROW, let json = sqlite3_column_text(stmt, 0),
              let status = try? JSONDecoder().decode(WorkerStatus.self, from: Data(String(cString: json).utf8)),
              status.pid == worker.processIdentifier else { return }
        lastStatus = status
    }

    var summary: String {
        if let errorMessage { return errorMessage }
        if endingWorker { return preferences.enabled ? "正在切换采集器…" : "正在暂停…" }
        if !preferences.enabled { return "已暂停" }
        guard let status = lastStatus, status.pid == worker?.processIdentifier else { return "等待首次上报" }
        switch status.lastError {
        case "HTTP 401": return "凭据不匹配，请核对服务端摘要。"
        case "HTTP 503": return "服务暂不可用，请检查博客的上报配置。"
        case let error?: return error
        case nil: return status.lastAckAt == nil ? "等待首次上报" : "已连接"
        }
    }

    var lastAck: String? { lastStatus?.lastAckAt }

    func credential(_ command: String, endpoint: String, token: String = "", completion: @escaping (Result<CredentialReply, Error>) -> Void) {
        let process = installation.command("settings.mts", arguments: [command])
        DispatchQueue.global(qos: .userInitiated).async {
            let result = Result<CredentialReply, Error> {
                let input = Pipe(), output = Pipe(), errors = Pipe()
                process.standardInput = input
                process.standardOutput = output
                process.standardError = errors
                let data = try JSONEncoder().encode(["endpoint": endpoint, "token": token])
                try process.run()
                try input.fileHandleForWriting.write(contentsOf: data)
                try input.fileHandleForWriting.close()
                let reply = output.fileHandleForReading.readDataToEndOfFile()
                let errorData = errors.fileHandleForReading.readDataToEndOfFile()
                process.waitUntilExit()
                guard process.terminationStatus == 0 else {
                    let message = String(decoding: errorData, as: UTF8.self).trimmingCharacters(in: .whitespacesAndNewlines)
                    throw SettingsError(message: message.isEmpty ? "无法处理上报凭据，请重试。" : message)
                }
                return try JSONDecoder().decode(CredentialReply.self, from: reply)
            }
            DispatchQueue.main.async { completion(result) }
        }
    }
}
