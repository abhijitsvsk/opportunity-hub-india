/**
 * Domain-Aware Throttled Task Queue:
 * Enforces global concurrency while strictly limiting simultaneous requests
 * and minimum inter-request delay per registrable domain.
 */

class DomainQueue {
  constructor(options = {}) {
    this.globalConcurrency = options.globalConcurrency || 12;
    this.perDomainConcurrency = options.perDomainConcurrency || 2;
    this.minDomainDelayMs = options.minDomainDelayMs || 350;

    this.activeGlobal = 0;
    this.domainActive = new Map(); // domain -> count
    this.domainLastRequest = new Map(); // domain -> timestamp
    this.domainRetryAfter = new Map(); // domain -> timestamp until paused
  }

  setRetryAfter(domain, seconds) {
    if (!domain) return;
    const pauseUntil = Date.now() + (seconds * 1000);
    this.domainRetryAfter.set(domain, pauseUntil);
  }

  isDomainPaused(domain) {
    const pauseUntil = this.domainRetryAfter.get(domain);
    if (!pauseUntil) return false;
    if (Date.now() < pauseUntil) return true;
    this.domainRetryAfter.delete(domain);
    return false;
  }

  async acquire(domain) {
    while (true) {
      const activeInDomain = this.domainActive.get(domain) || 0;
      const isPaused = this.isDomainPaused(domain);

      if (this.activeGlobal < this.globalConcurrency && activeInDomain < this.perDomainConcurrency && !isPaused) {
        // Enforce same-domain delay
        const lastTime = this.domainLastRequest.get(domain) || 0;
        const elapsed = Date.now() - lastTime;
        if (elapsed < this.minDomainDelayMs) {
          await new Promise(r => setTimeout(r, this.minDomainDelayMs - elapsed));
        }

        this.activeGlobal++;
        this.domainActive.set(domain, (this.domainActive.get(domain) || 0) + 1);
        this.domainLastRequest.set(domain, Date.now());
        return;
      }

      // Wait 50ms before re-checking slots
      await new Promise(r => setTimeout(r, 50));
    }
  }

  release(domain) {
    this.activeGlobal = Math.max(0, this.activeGlobal - 1);
    const count = this.domainActive.get(domain) || 1;
    if (count <= 1) {
      this.domainActive.delete(domain);
    } else {
      this.domainActive.set(domain, count - 1);
    }
  }
}

module.exports = { DomainQueue };
