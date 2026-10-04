/**
 * Domain Circuit Breaker: Detects systemic WAF/blocking or infrastructure degradation
 * across domains to prevent false-positive deactivations.
 */

class CircuitBreaker {
  constructor(options = {}) {
    this.minSample = options.minSample || 10;
    this.degradationThreshold = options.threshold || 0.50; // 50% failure rate
    this.domains = new Map();
  }

  record(registrableDomain, classification, statusCode) {
    if (!registrableDomain || registrableDomain === 'unknown') return;

    if (!this.domains.has(registrableDomain)) {
      this.domains.set(registrableDomain, {
        checked: 0,
        ok2xx: 0,
        dead404: 0,
        blocked403: 0,
        restricted401: 0,
        rateLimited429: 0,
        serverError5xx: 0,
        tempErrors: 0,
        suspect: 0,
        closed: 0,
        softDead: 0
      });
    }

    const stats = this.domains.get(registrableDomain);
    stats.checked++;

    if (statusCode >= 200 && statusCode < 300) stats.ok2xx++;
    if (statusCode === 404 || statusCode === 410) stats.dead404++;
    if (statusCode === 403) stats.blocked403++;
    if (statusCode === 401) stats.restricted401++;
    if (statusCode === 429) stats.rateLimited429++;
    if (statusCode >= 500 && statusCode < 600) stats.serverError5xx++;

    if (classification === 'TEMP_ERROR') stats.tempErrors++;
    if (classification === 'SUSPECT') stats.suspect++;
    if (classification === 'CLOSED') stats.closed++;
    if (classification === 'SOFT_DEAD') stats.softDead++;
  }

  isDomainDegraded(registrableDomain) {
    const stats = this.domains.get(registrableDomain);
    if (!stats || stats.checked < this.minSample) {
      return { degraded: false, reason: 'INSUFFICIENT_SAMPLE', sample: stats ? stats.checked : 0 };
    }

    // Systemic failures = Blocked (403) + Rate limited (429) + 5xx
    const systemicFailures = stats.blocked403 + stats.rateLimited429 + stats.serverError5xx;
    const failureRate = systemicFailures / stats.checked;

    if (failureRate >= this.degradationThreshold) {
      return {
        degraded: true,
        reason: `HIGH_SYSTEMIC_FAILURE_RATE (${(failureRate * 100).toFixed(1)}%)`,
        sample: stats.checked,
        failureRate
      };
    }

    return { degraded: false, reason: 'HEALTHY', sample: stats.checked, failureRate };
  }

  getAllStats() {
    const results = [];
    for (const [domain, stats] of this.domains.entries()) {
      const { degraded, reason } = this.isDomainDegraded(domain);
      results.push({
        domain,
        ...stats,
        degraded,
        healthStatus: degraded ? 'DEGRADED' : (stats.checked < this.minSample ? 'INSUFFICIENT_SAMPLE' : 'STABLE')
      });
    }
    return results.sort((a, b) => b.checked - a.checked);
  }
}

module.exports = { CircuitBreaker };
