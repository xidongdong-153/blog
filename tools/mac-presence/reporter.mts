import type { PresenceReport, PresenceUpload } from '../../src/lib/presence.ts'

interface Sample {
  report: PresenceReport
  observedAt: string
}

interface ReporterOptions {
  url: URL
  token: string
  generation: number
  sample: () => Sample
  onResult: (error: string | null) => void
}

export class Reporter {
  private options: ReporterOptions
  private seq = 0
  private lastAckKey = ''
  private lastAckAt = -Infinity
  private nextAttempt = 0
  private retryDelay = 1000
  private lastAttemptHidden = false
  private inFlight: Promise<void> | null = null
  private controller: AbortController | null = null
  private stopping = false

  constructor(options: ReporterOptions) {
    this.options = options
  }

  update() {
    if (this.stopping) return
    const sample = this.options.sample()
    const urgent = sample.report.availability === 'hidden' && !this.lastAttemptHidden
    if (this.inFlight) {
      if (urgent) this.controller?.abort()
      return
    }
    const key = JSON.stringify(sample.report)
    const now = performance.now()
    if (!urgent && now < this.nextAttempt) return
    if (key === this.lastAckKey && now - this.lastAckAt < 5000) return
    this.inFlight = this.send(sample, key).finally(() => {
      this.inFlight = null
      this.update()
    })
  }

  private async send(sample: Sample, key: string) {
    const { url, token, generation, onResult } = this.options
    this.lastAttemptHidden = sample.report.availability === 'hidden'
    const packet: PresenceUpload = { generation, seq: ++this.seq, ...sample }
    let error: string | null = null
    const controller = new AbortController()
    this.controller = controller
    try {
      const response = await fetch(url, {
        method: 'PUT',
        redirect: 'error',
        signal: AbortSignal.any([controller.signal, AbortSignal.timeout(2500)]),
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(packet),
      })
      if (response.status !== 204) error = `HTTP ${response.status}`
      await response.body?.cancel()
    } catch {
      if (controller.signal.aborted) {
        // 请求可能已经抵达服务端，随后用更大的序号发送最新状态。
        this.lastAckKey = ''
        return
      }
      error = '网络连接失败或请求超时'
    } finally {
      this.controller = null
    }
    if (error) {
      this.lastAckKey = ''
      this.nextAttempt = performance.now() + this.retryDelay
      this.retryDelay = Math.min(this.retryDelay * 2, 15_000)
    } else {
      this.lastAckKey = key
      this.lastAckAt = performance.now()
      this.nextAttempt = 0
      this.retryDelay = 1000
    }
    onResult(error)
  }

  async stop() {
    this.stopping = true
    this.controller?.abort()
    await this.inFlight
    const sample = this.options.sample()
    await this.send(sample, JSON.stringify(sample.report))
  }
}
