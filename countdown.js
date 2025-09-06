// Small helper module extracted from renderer.js for unit testing
function formatCountdown(seconds) {
  if (isNaN(seconds)) return '';
  if (seconds <= 0) return 'now';
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return `${seconds}s`;
}

function extractTs(entry) {
  if (!entry) return 0;
  let ts = null;
  if (typeof entry === 'number') ts = entry;
  if (entry && (entry.ts !== undefined && entry.ts !== null)) ts = entry.ts;
  else if (entry && entry.state && (entry.state.ts !== undefined && entry.state.ts !== null)) ts = entry.state.ts;
  // if ts is an object, try usual properties
  if (ts && typeof ts === 'object') {
    if (ts.sec !== undefined) ts = ts.sec;
    else if (ts.s !== undefined) ts = ts.s;
    else if (ts.seconds !== undefined) ts = ts.seconds;
    else if (ts.secs !== undefined) ts = ts.secs;
  }
  if (typeof ts === 'string') {
    const n = parseInt(ts, 10);
    ts = isNaN(n) ? 0 : n;
  }
  if (typeof ts === 'number') {
    // normalize milliseconds to seconds
    let n = Math.floor(ts);
    if (n > 1e11) n = Math.floor(n / 1000);
    return n;
  }
  return 0;
}

module.exports = { formatCountdown, extractTs };
