const net = require('net');

/**
 * SSRF Guard: Validates that a target URL uses public HTTP/HTTPS protocols
 * and does not point to private, loopback, or cloud-metadata IPs.
 */
function isPrivateIp(ip) {
  if (net.isIPv4(ip)) {
    const parts = ip.split('.').map(Number);
    // 127.0.0.0/8 (Loopback)
    if (parts[0] === 127) return true;
    // 10.0.0.0/8 (Private)
    if (parts[0] === 10) return true;
    // 172.16.0.0/12 (Private)
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
    // 192.168.0.0/16 (Private)
    if (parts[0] === 192 && parts[1] === 168) return true;
    // 169.254.0.0/16 (Link-local / Cloud Metadata)
    if (parts[0] === 169 && parts[1] === 254) return true;
    // 0.0.0.0/8
    if (parts[0] === 0) return true;
    return false;
  }

  if (net.isIPv6(ip)) {
    const normalized = ip.toLowerCase();
    // ::1 (Loopback)
    if (normalized === '::1') return true;
    // fe80::/10 (Link-local)
    if (normalized.startsWith('fe80:')) return true;
    // fc00::/7 (Unique local address)
    if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true;
    return false;
  }

  return false;
}

function validateUrlSecurity(urlString) {
  if (!urlString || typeof urlString !== 'string') {
    return { valid: false, reason: 'invalid_type' };
  }

  let parsed;
  try {
    parsed = new URL(urlString.trim());
  } catch {
    return { valid: false, reason: 'malformed_url' };
  }

  // Protocol check
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { valid: false, reason: `unsupported_protocol_${parsed.protocol}` };
  }

  const hostname = parsed.hostname.toLowerCase();

  // Explicit forbidden hostnames
  const forbiddenHosts = ['localhost', 'metadata.google.internal', 'instance-data'];
  if (forbiddenHosts.includes(hostname) || hostname.endsWith('.local') || hostname.endsWith('.internal')) {
    return { valid: false, reason: 'forbidden_private_host' };
  }

  // Check if hostname is directly an IP
  if (net.isIP(hostname)) {
    if (isPrivateIp(hostname)) {
      return { valid: false, reason: 'private_ip_target' };
    }
  }

  return { valid: true, parsed };
}

module.exports = {
  validateUrlSecurity,
  isPrivateIp
};
