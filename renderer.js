// helper: sanitize a free-text description by removing known noise lines
// (current players, contribution lines, totals) when structured contributions
// are provided. Extracted to top-level so tests can import it.
function sanitizeDescription(raw, hasStructuredContrib) {
  const lines = String(raw || '').split(/\r?\n/).map(l => l.replace(/`/g, '').replace(/(^\*+|\*+$)/g, '').trim());
  // remove any stray single-line 'current players' or 'current_layers' style lines
  const filteredLines = lines.filter(Boolean).filter(l => !/^[\s\-]*current[_\s\-]*(?:players|layers)\b[:\s\-]*/i.test(l));
  const contributionLineRe = /^\s*(?:[-*]\s*)?.+?:.*%\s*$/i;
  if (hasStructuredContrib) {
    const totalLineRe = /^\s*total\s*:?[\s\t]*[-+]?\d[\d,]*(?:\.\d+)?\s*$/i;
    const out = [];
    for (let i = 0; i < filteredLines.length; i++) {
      const l = filteredLines[i];
      // skip contribution header/lines
      if (/^player\s+contribution/i.test(l) || /^boss contribution\s*:?/i.test(l) || contributionLineRe.test(l) || totalLineRe.test(l)) {
        continue;
      }
      // If we encounter a 'Players:' header, drop it and any following plain name lines
      if (/^players?:\s*/i.test(l)) {
        // if names are on the same line (e.g. "Players: A, B"), just skip this line
        if (/^players?:\s*\S+/i.test(l)) continue;
        // otherwise, skip subsequent lines until we hit something that looks like contributions/total/header
        let j = i + 1;
        while (j < filteredLines.length) {
          const next = filteredLines[j];
          if (!next) { j++; continue; }
          if (/^player\s+contribution/i.test(next) || /^boss contribution\s*:?/i.test(next) || contributionLineRe.test(next) || totalLineRe.test(next) || /^players?:\s*/i.test(next)) break;
          // skip this name line
          j++;
        }
        i = j - 1; // advance outer loop
        continue;
      }
      out.push(l);
    }
    return out.filter(Boolean).join('\n').trim();
  }
  return filteredLines.filter(Boolean).join('\n').trim();
}

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', init);
}

async function init() {
  const list = document.getElementById('dungeon-list');
  const details = document.getElementById('dungeon-details');
  const contrib = document.getElementById('contrib-list');
  const status = document.getElementById('status');

  // preserve snapshot (contrib) open/closed states between detail refreshes
  window.__dungeoneer_snapshot_open_states = window.__dungeoneer_snapshot_open_states || {};

  // setStatus is a no-op when the #status element is not present (we removed it from the UI)
  async function setStatus(s) { if (status) status.textContent = s; }

  async function loadList() {
    setStatus('loading dungeons...');
    try {
      const data = await window.api.fetchJSON('/dungeondetails');
      list.innerHTML = '';
      const ids = Object.keys(data).sort((a,b)=>Number(a)-Number(b));
  // ensure countdown updater is running
      // ensure countdown updater is running
      if (!window.__dungeoneer_countdown_interval) {
        // update all visible countdown nodes every second
        window.__dungeoneer_countdown_interval = setInterval(() => {
          try {
            const nodes = document.querySelectorAll('.dungeon-item .countdown');
            const now = Math.floor(Date.now() / 1000);
            nodes.forEach(n => {
              // treat missing attribute as 0
              const attr = n.getAttribute('data-ts');
              if (!attr) { n.textContent = ''; return; }
              const tsNum = Number(attr);
              // if attribute isn't a number, try parsing as JSON (handles objects)
              let ts = tsNum;
              if (isNaN(ts)) {
                try {
                  const parsed = JSON.parse(attr);
                  if (parsed && typeof parsed === 'object') {
                    ts = parsed.sec || parsed.s || parsed.seconds || parsed.ts || 0;
                  } else if (typeof parsed === 'number') ts = parsed;
                } catch (e) {
                  ts = 0;
                }
              }
              ts = Number(ts) || 0;
              if (!ts) { n.textContent = ''; return; }
              const diff = ts - now;
              n.textContent = formatCountdown(diff);
            });
            // also update elapsed timer in the details header (if shown)
            try {
              const nowSec = Math.floor(Date.now() / 1000);
              window.__dungeoneer_elapsed = window.__dungeoneer_elapsed || {};
              const detailTimer = document.querySelector('#detail-title .elapsed-timer');
              if (detailTimer && currentSelectedId) {
                const state = window.__dungeoneer_elapsed[currentSelectedId];
                if (!state) {
                  detailTimer.style.display = 'none';
                  detailTimer.textContent = '';
                } else if (state.status === 'running') {
                  const elapsed = (nowSec - (state.startAt || nowSec)) + (state.baseElapsed || 0);
                  detailTimer.style.display = '';
                  detailTimer.textContent = formatElapsedMMSS(elapsed);
                } else if (state.status === 'stopped') {
                  detailTimer.style.display = '';
                  detailTimer.textContent = formatElapsedMMSS(state.baseElapsed || 0);
                } else {
                  detailTimer.style.display = 'none';
                  detailTimer.textContent = '';
                }
              }
            } catch (ee) { /* ignore elapsed update errors */ }
          } catch (err) {
            // guard against unexpected DOM changes
            // console.error(err);
          }
        }, 1000);
      }
      for (const id of ids) {
  const btn = document.createElement('button');
  btn.className = 'dungeon-item';
  // tag DOM node with id for elapsed timer updates
  btn.setAttribute('data-id', id);
  const rawTitle = data[id] && data[id].title ? String(data[id].title) : '';
        // split into name and state by the first ' - ' separator
        let nameText = rawTitle;
        let stateText = '';
        const sepIndex = rawTitle.indexOf(' - ');
        if (sepIndex !== -1) {
          nameText = rawTitle.slice(0, sepIndex);
          stateText = rawTitle.slice(sepIndex + 3);
        }
  // remove bracketed coordinates like "[6112N 2861E]" (only remove brackets that contain digits)
  const clean = s => String(s || '')
    .replace(/\s*\[[^\]]*\d+[^\]]*\]\s*/g, ' ')
    .replace(/`/g, '')
    .replace(/<[^>]*>/g, '')
    .trim();
  // prefer the structured state.kind when available
  let kindText = '';
  if (data[id] && data[id].state && data[id].state.kind) kindText = String(data[id].state.kind);
  // create structured content: name/state on left, countdown on right (if ts present)
    const left = document.createElement('span');
    left.className = 'dungeon-label';
  left.textContent = kindText ? `${clean(nameText)} — ${clean(kindText)}${playerCountSuffix(data[id], kindText)}` : `${clean(nameText)}${playerCountSuffix(data[id], kindText)}`;
        // apply initial state styling (may be updated by background fetch)
        applyStateClass(btn, data[id], id);
  btn.appendChild(left);
        // if structured kind not present in the listing, fetch the dungeon details in background
        if (!kindText) {
          (async () => {
            try {
              const dd = await window.api.fetchJSON(`/dungeondetails/${id}`);
              const sk = dd && dd.state && dd.state.kind ? String(dd.state.kind) : '';
              if (sk) left.textContent = `${clean(nameText)} — ${clean(sk)}${playerCountSuffix(dd, sk)}`;
              // update styling with full details
              applyStateClass(btn, dd, id);
              // update elapsed state according to new details
              try { updateElapsedStateForBtn(btn, dd, id); } catch (e) { /* swallow */ }
              // if the detailed entry contains a timestamp, update the sidebar countdown element
              try {
                const tsFromDetail = extractTs(dd);
                if (tsFromDetail) {
                  const rightNode = btn.querySelector('.countdown');
                  if (rightNode) {
                    rightNode.setAttribute('data-ts', String(tsFromDetail));
                    rightNode.textContent = formatCountdown(tsFromDetail - Math.floor(Date.now() / 1000));
                  }
                }
              } catch (innerErr) {
                // ignore extraction/update errors
              }
            } catch (e) {
              // ignore background fetch errors
            }
          })();
        }
  const right = document.createElement('span');
  right.className = 'countdown';
        const ts = extractTs(data[id]);
        if (ts) {
          // store numeric seconds value in attribute for the updater to read
          right.setAttribute('data-ts', String(ts));
          // initial value
          right.textContent = formatCountdown(ts - Math.floor(Date.now() / 1000));
        } else {
          right.textContent = '';
        }
        btn.appendChild(right);
  // (elapsed timers are rendered on the main details panel; will be updated when details are loaded)
        btn.onclick = () => loadDetails(id);
        list.appendChild(btn);
      }
      setStatus(`loaded ${ids.length} dungeons`);
    } catch (e) {
      setStatus('error: ' + e.message);
      list.innerHTML = '<div class="error">Could not load dungeons</div>';
    }
  }

  // normalize state kind to simple lowercase string or empty
  function getNormalizedKind(entry) {
    if (!entry) return '';
    try {
      if (entry.state && entry.state.kind) return String(entry.state.kind).toLowerCase();
      if (entry.title) {
        const t = String(entry.title).toLowerCase();
        if (t.includes('boss')) return 'boss';
        if (t.includes('open')) return 'open';
        if (t.includes('cleared')) return 'cleared';
        if (t.includes('closed')) return 'closed';
      }
    } catch (e) {}
    return '';
  }

  function getPlayersCount(entry) {
    if (!entry) return 0;
    const p = entry.players;
    if (!p && p !== 0) return 0;
    if (Array.isArray(p)) return p.length;
    if (typeof p === 'number') return p;
    if (p && typeof p === 'object') return Object.keys(p).length;
    return 0;
  }

  // Manage per-dungeon elapsed timer state stored in window.__dungeoneer_elapsed[<id>]
  // state = { status: 'hidden'|'running'|'stopped', startAt: unixSec, baseElapsed: seconds }
  function updateElapsedStateForBtn(btn, entry, id) {
    window.__dungeoneer_elapsed = window.__dungeoneer_elapsed || {};
    const prev = window.__dungeoneer_elapsed[id] || { status: 'hidden', startAt: 0, baseElapsed: 0 };
    // helper to persist last known elapsed before we reset/hide the timer
    const persistLastElapsed = (p) => {
      try {
        window.__dungeoneer_last_elapsed = window.__dungeoneer_last_elapsed || {};
        let last = 0;
        if (p) {
          last = p.baseElapsed || 0;
          if (p.status === 'running' && p.startAt) {
            last += Math.floor(Date.now() / 1000) - p.startAt;
          }
        }
        window.__dungeoneer_last_elapsed[id] = last;
      } catch (e) { /* swallow */ }
    };
    const kind = getNormalizedKind(entry);
    const players = getPlayersCount(entry);
    // Determine transitions according to rules:
    // - If the dungeon goes from Empty to Active the timer appears and starts counting up.
    //   We'll interpret Active as any non-empty open/active state that is not 'empty' or 'closed' or 'cleared' or 'boss'.
    //   Practically: if previous was empty (no players) and now players>0 and kind is 'open' or '' => start
    // - If we go from any state to Empty state the timer resets and is not rendered.
    // - If we go from Boss state to Cleared state the timer is stopped but stays rendered.
    // - If we go from the Cleared state to Closed state the timer is reset and not rendered.

    // determine if entry is Empty
    const isEmpty = (players === 0);
    // determine if previous was empty
    const prevWasEmpty = prev && prev.prevPlayers === 0;

    // helper to reset
    const resetState = () => { window.__dungeoneer_elapsed[id] = { status: 'hidden', startAt: 0, baseElapsed: 0, prevPlayers: players }; };

    // If any->Empty: handle special-case transitions then reset/hide only when previously running
    if (isEmpty) {
      // Special-case: Cleared -> Closed should reset the timer regardless of prev.status
      if (prev && prev.kind === 'cleared' && kind === 'closed') {
        persistLastElapsed(prev);
        resetState();
        const el = btn.querySelector('.elapsed-timer'); if (el) { el.style.display = 'none'; el.textContent = ''; }
        return;
      }
      // Otherwise, only reset/hide when the timer was previously running (i.e. active)
      if (prev && prev.status === 'running') {
        // previous state was active: reset/hide the timer
        persistLastElapsed(prev);
        resetState();
        // ensure DOM reflects it
        const el = btn.querySelector('.elapsed-timer'); if (el) { el.style.display = 'none'; el.textContent = ''; }
      } else {
        // previous state wasn't actively running — preserve stopped/hidden state but update prevPlayers
        window.__dungeoneer_elapsed[id] = Object.assign({}, prev, { prevPlayers: players });
      }
      return;
    }

    // Transition into Cleared: stop (pause) the timer but keep it rendered
    if (kind === 'cleared' && !(prev && prev.kind === 'cleared')) {
      // stop timer: compute elapsed so far
      let base = (prev && prev.baseElapsed) ? prev.baseElapsed : 0;
      if (prev && prev.status === 'running' && prev.startAt) {
        base += Math.floor(Date.now() / 1000) - prev.startAt;
      }
      window.__dungeoneer_elapsed[id] = { status: 'stopped', startAt: 0, baseElapsed: base, prevPlayers: players, kind };
      const el = btn.querySelector('.elapsed-timer'); if (el) { el.style.display = ''; el.textContent = formatElapsedMMSS(base); }
      return;
    }

    // Cleared -> Closed: reset/hide
    if (prev && prev.kind === 'cleared' && kind === 'closed') {
      persistLastElapsed(prev);
      resetState();
      const el = btn.querySelector('.elapsed-timer'); if (el) { el.style.display = 'none'; el.textContent = ''; }
      return;
    }

    // Empty -> Active: start
    // Detect transition from previously empty (or hidden) to now having players and a non-closed kind
    if ((prevWasEmpty || prev.status === 'hidden') && !isEmpty && kind !== 'closed' && kind !== 'cleared') {
      // start new timer
      window.__dungeoneer_elapsed[id] = { status: 'running', startAt: Math.floor(Date.now() / 1000), baseElapsed: 0, prevPlayers: players, kind };
      const el = btn.querySelector('.elapsed-timer'); if (el) { el.style.display = ''; el.textContent = formatElapsedMMSS(0); }
      return;
    }

    // if we already have a running/stopped state, try to preserve it or update kind/players
    if (prev && prev.status === 'running') {
      window.__dungeoneer_elapsed[id] = Object.assign({}, prev, { prevPlayers: players, kind });
      return;
    }
    if (prev && prev.status === 'stopped') {
      // keep stopped but update prevPlayers/kind
      window.__dungeoneer_elapsed[id] = Object.assign({}, prev, { prevPlayers: players, kind });
      return;
    }

    // default: keep hidden
    resetState();
  }

  function formatElapsedMMSS(seconds) {
    seconds = Math.max(0, Math.floor(seconds || 0));
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    const mm = String(m).padStart(2, '0');
    const ss = String(s).padStart(2, '0');
    return `${mm}:${ss}`;
  }

  // helper: format seconds diff to human friendly short countdown
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

  // helper: extract a unix timestamp (seconds) from various possible shapes
  // supports: entry.ts, entry.state.ts, numeric strings, or nested objects like { sec: 1234 } or { s: 1234 }
  function extractTs(entry) {
    if (!entry) return 0;
    let ts = null;
    if (typeof entry === 'number') ts = entry;
    if (entry && (entry.ts !== undefined && entry.ts !== null)) ts = entry.ts;
    else if (entry.state && (entry.state.ts !== undefined && entry.state.ts !== null)) ts = entry.state.ts;
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
        // normalize: some backends return milliseconds (13-digit) values — convert to seconds
        let n = Math.floor(ts);
        // if the number looks like milliseconds (greater than ~1e11), convert to seconds
        if (n > 1e11) n = Math.floor(n / 1000);
        return n;
      }
    return 0;
  }

  // apply a CSS class to a dungeon button based on its state and players
  function applyStateClass(btn, dataEntry, id) {
    // remove existing state- classes
    btn.classList.remove('state-open-empty','state-open-players','state-boss','state-closing','state-closed');
    const state = dataEntry && dataEntry.state ? dataEntry.state : null;
    const players = dataEntry && dataEntry.players ? dataEntry.players : null;
    // determine class
    const titleText = String((state && state.title) || (dataEntry && dataEntry.title) || '').toLowerCase();
    // prioritize boss detection by inspecting title text (covers cases like 'boss fight!')
    if (/\bboss\b/.test(titleText) || (state && String(state.kind).toLowerCase() === 'boss')) {
      btn.classList.add('state-boss');
      return;
    }
    if (state && state.kind) {
      const kind = String(state.kind).toLowerCase();
      if (kind === 'open') {
        if (!players || players.length === 0) btn.classList.add('state-open-empty');
        else btn.classList.add('state-open-players');
    } else if (kind === 'cleared') {
      // use a dedicated "cleared" class so cleared and boss fights look different
      btn.classList.add('state-cleared');
      } else if (kind === 'closing' || kind === 'closed, opening' || kind === 'closing soon') {
        btn.classList.add('state-closing');
      } else if (kind === 'closed') {
        btn.classList.add('state-closed');
      } else {
        // fallback for other kinds
        if (!players || players.length === 0) btn.classList.add('state-open-empty');
        else btn.classList.add('state-open-players');
      }
    } else {
      // no structured state available: try to infer from dataEntry
      if (dataEntry && dataEntry.title) {
        const t = String(dataEntry.title).toLowerCase();
        if (/\bboss\b/.test(t)) {
          btn.classList.add('state-boss');
        } else if (/open/i.test(t)) {
          if (!players || players.length === 0) btn.classList.add('state-open-empty');
          else btn.classList.add('state-open-players');
        }
      }
    }
  }

  // helper: produce a formatted player-count suffix for sidebar labels
  // - returns '' when the state is closed or players data is absent
  // - returns ' [Empty]' when players is an empty array
  // - returns ' [N]' when players is an array with N members
  function playerCountSuffix(entry, kindTextOverride) {
    if (!entry) return '';
    // determine if the dungeon is explicitly closed
    let isClosed = false;
    if (entry.state && entry.state.kind) {
      try { if (String(entry.state.kind).toLowerCase() === 'closed') isClosed = true; } catch (e) {}
    }
    // if an override kind/title fragment was provided, look for 'closed' there too
    if (!isClosed && kindTextOverride) {
      try { if (String(kindTextOverride).toLowerCase().includes('closed')) isClosed = true; } catch (e) {}
    }
    // fall back to title-based detection
    if (!isClosed && entry.title) {
      try { if (String(entry.title).toLowerCase().includes('closed')) isClosed = true; } catch (e) {}
    }
    if (isClosed) return '';

    const players = entry.players;
    if (!players && players !== 0) return '';
    let count = 0;
    if (Array.isArray(players)) count = players.length;
    else if (typeof players === 'number') count = players;
    else if (players && typeof players === 'object') count = Object.keys(players).length;
    // show words for zero
    if (count === 0) return ' [Empty]';
    return ` [${count}]`;
  }

  // helper: sanitize a free-text description by removing known noise lines
  // (current players, contribution lines, totals) when structured contributions
  // are provided. This is extracted so we can unit test the behavior.
  function sanitizeDescription(raw, hasStructuredContrib) {
    const lines = String(raw || '').split(/\r?\n/).map(l => l.replace(/`/g, '').replace(/(^\*+|\*+$)/g, '').trim());
    // remove any stray single-line 'current players' or 'current_layers' style lines
    const filteredLines = lines.filter(Boolean).filter(l => !/^[\s\-]*current[_\s\-]*(?:players|layers)\b[:\s\-]*/i.test(l));
    const contributionLineRe = /^\s*(?:[-*]\s*)?.+?:.*%\s*$/i;
    if (hasStructuredContrib) {
      const totalLineRe = /^\s*total\s*:?[\s\t]*[-+]?\d[\d,]*(?:\.\d+)?\s*$/i;
      const nonContributionLines = filteredLines.filter(l => {
        if (!l) return false;
        if (/^player\s+contribution/i.test(l)) return false;
        if (/^boss contribution\s*:?/i.test(l)) return false;
        if (contributionLineRe.test(l)) return false;
        if (totalLineRe.test(l)) return false;
        return true;
      });
      return nonContributionLines.filter(Boolean).join('\n').trim();
    }
    return filteredLines.filter(Boolean).join('\n').trim();
  }


  // state for detail auto-refresh
  let currentSelectedId = null;
  let detailsAutoInterval = null;
  let isLoadingDetails = false;

  // Track currently displayed dungeon to force updates when switching
  let currentlyDisplayedDungeonId = null;

  async function loadDetails(id) {
    // loadDetails(id, manual=true)
    // manual=true indicates a user-initiated load (start/reset auto-refresh)
    const manual = arguments.length < 2 ? true : Boolean(arguments[1]);
    if (!id) return;
    setStatus(`loading ${id}...`);
  // avoid overlapping detail fetches — but allow manual (user-initiated)
  // loads to proceed even if an auto-refresh is currently running.
  if (isLoadingDetails && !manual) return;
    isLoadingDetails = true;
    try {
      const d = await window.api.fetchJSON(`/dungeondetails/${id}`);

      // partial DOM updates: only update changed parts to preserve UI state (expanded snapshots, scroll)
      window.__dungeoneer_last_details = window.__dungeoneer_last_details || {};
      const last = window.__dungeoneer_last_details[id] || {};

      // Check if we're switching to a different dungeon - if so, force updates
      const isSwitchingDungeon = currentlyDisplayedDungeonId !== id;
      currentlyDisplayedDungeonId = id;

      // Clean up and compute title/state
      const rawTitle = d.title ? String(d.title) : '';
      // remove bracketed coordinates like "[6112N 2861E]" for display cleanliness
      const cleanText = s => String(s || '')
        .replace(/\s*\[[^\]]*\d+[^\]]*\]\s*/g, ' ')
        .replace(/`/g, '')
        .replace(/<[^>]*>/g, '')
        .replace(/\s+/g, ' ')
        .trim();
      let nameText = rawTitle;
      let stateText = '';
      const sepIndex = rawTitle.indexOf(' - ');
      if (sepIndex !== -1) {
        nameText = rawTitle.slice(0, sepIndex);
        stateText = rawTitle.slice(sepIndex + 3);
      }
      const stateKind = d && d.state && d.state.kind ? String(d.state.kind) : stateText;
      const titleText = stateKind ? `${cleanText(nameText)} — ${cleanText(stateKind)}` : cleanText(nameText);

      // title element (create if missing)
      let titleEl = details.querySelector('#detail-title');
      if (!titleEl) {
        titleEl = document.createElement('h2');
        titleEl.id = 'detail-title';
        details.insertBefore(titleEl, details.firstChild);
      }
      // keep the visible title text inside an inner span so we don't overwrite the elapsed timer
      let titleTextSpan = titleEl.querySelector('.detail-title-text');
      if (!titleTextSpan) {
        titleTextSpan = document.createElement('span');
        titleTextSpan.className = 'detail-title-text';
        titleEl.appendChild(titleTextSpan);
      }
      if (titleTextSpan.textContent !== titleText) titleTextSpan.textContent = titleText;
      // ensure an elapsed timer element is present in the header (right-aligned)
      let titleElapsed = titleEl.querySelector('.elapsed-timer');
      if (!titleElapsed) {
        titleElapsed = document.createElement('span');
        titleElapsed.className = 'elapsed-timer';
        titleElapsed.style.marginLeft = '12px';
        titleElapsed.style.fontFamily = 'Courier New, monospace';
        titleElapsed.style.color = '#9aa6b2';
        titleElapsed.style.fontSize = '0.95em';
        titleElapsed.textContent = '';
        titleEl.appendChild(titleElapsed);
      }

      // description (compute cleaned desc)
      let desc = '';
      if (d.description) {
        const raw = String(d.description || '');
  const lines = raw.split(/\r?\n/).map(l => l.replace(/`/g, '').replace(/(^\*+|\*+$)/g, '').trim());
  // remove any stray single-line 'current players' or 'current_layers' style lines
  // which some backends include in the description; we display players below separately
  const filteredLines = lines.filter(Boolean).filter(l => !/^[\s\-]*current[_\s\-]*(?:players|layers)\b[:\s\-]*/i.test(l));
        // contribution line detection (loose): "Name: ...%" or "Name: ... (12.3)%"
        const contributionLineRe = /^\s*(?:[-*]\s*)?.+?:.*%\s*$/i;
        // Remove contribution-like lines from the description when we also have a structured
        // contributions array (d.contributions) to avoid duplicate rendering.
        // Also strip common contribution headers like "Player Contribution" and "Total: 1234.00" lines.
        const hasStructuredContrib = d.contributions && d.contributions.length;
        if (hasStructuredContrib) {
          const totalLineRe = /^\s*total\s*:?[\s\t]*[-+]?\d[\d,]*(?:\.\d+)?\s*$/i;
          const nonContributionLines = filteredLines.filter(l => {
            if (!l) return false;
            if (/^player\s+contribution/i.test(l)) return false;
            if (/^boss contribution\s*:?/i.test(l)) return false;
            if (contributionLineRe.test(l)) return false;
            if (totalLineRe.test(l)) return false;
            return true;
          });
          // If the description only contained contribution lines (or was emptied after stripping),
          // don't show the description — the structured contributions UI will be shown below.
          desc = nonContributionLines.filter(Boolean).join('\n').trim();
        } else {
          // No structured contributions provided; keep the filtered lines as-is
          desc = filteredLines.filter(Boolean).join('\n').trim();
        }
      }
      const showDesc = Boolean(desc);
      let descEl = details.querySelector('#detail-desc');
      if (showDesc) {
        if (!descEl) {
          descEl = document.createElement('pre');
          descEl.id = 'detail-desc';
          // insert after title
          titleEl.insertAdjacentElement('afterend', descEl);
        }
        // sanitize displayed desc: remove backticks and stray asterisks used for bolding
        const cleanedDesc = desc.split(/\r?\n/).map(l => l.replace(/`/g, '').replace(/(^\*+|\*+$)/g, '').trim()).filter(Boolean).join('\n');
        if (descEl.textContent !== cleanedDesc) descEl.textContent = cleanedDesc;
      } else if (descEl) {
        descEl.remove();
      }

      // players list
      let playersEl = details.querySelector('#detail-players');
      const playersJSON = JSON.stringify(d.players || []);
      // determine "At Boss" status:
      // - Yes if the title or state.kind indicate a boss
      // - Dead if the dungeon has been cleared or is closed
      // - No otherwise
      const titleLowerForBoss = String((d.state && d.state.title) || d.title || '').toLowerCase();
      const kindLowerForBoss = d && d.state && d.state.kind ? String(d.state.kind).toLowerCase() : '';
      let atBossStatus = 'No';
      if (/\bboss\b/.test(titleLowerForBoss) || kindLowerForBoss === 'boss') {
        atBossStatus = 'Yes';
      } else if (kindLowerForBoss === 'cleared' || kindLowerForBoss === 'closed') {
        // treat closed dungeons as 'Dead' for the At Boss display
        atBossStatus = 'Dead';
      } else {
        atBossStatus = 'No';
      }
      if (!playersEl) {
        playersEl = document.createElement('div');
        playersEl.id = 'detail-players';
        playersEl.className = 'players';
        // place after description or title
        if (descEl) titleEl.insertAdjacentElement('afterend', playersEl);
        else titleEl.insertAdjacentElement('afterend', playersEl);
      }
      if (last.players !== playersJSON || last.boss !== atBossStatus || isSwitchingDungeon) {
        playersEl.innerHTML = '';
        if (d.players && d.players.length) {
          const t = document.createElement('strong'); t.textContent = 'Players:'; playersEl.appendChild(t);
          const playersUl = document.createElement('ul'); playersUl.className = 'players-list';
          for (const name of d.players) {
            const li = document.createElement('li'); li.textContent = name; playersUl.appendChild(li);
          }
          playersEl.appendChild(playersUl);
        } else {
          playersEl.innerHTML = '<em>Players: none</em>';
        }
        // add At Boss line in same section
  const bossDiv = document.createElement('div');
  bossDiv.className = 'at-boss';
  // add a small gap between the players list and the At Boss line
  bossDiv.style.marginTop = '0.5em';
        const bossLabel = document.createElement('strong'); bossLabel.textContent = 'At Boss:'; bossDiv.appendChild(bossLabel);
        const bossVal = document.createElement('span'); bossVal.style.marginLeft = '6px'; bossVal.textContent = atBossStatus; bossDiv.appendChild(bossVal);
        playersEl.appendChild(bossDiv);
      }

      // contribution from latest run
      const contribHeaderHtml = '<h3>Contribution (Latest Run) <button id="copy-contributions" style="margin-left: 10px;">Copy</button></h3>';
      const contribListJson = JSON.stringify(d.contributions || []);
      // small helpers to parse and render contribution lines into two columns
      function parseContribution(item) {
        // returns { player, amount, percent }
        if (!item && item !== 0) return null;
        if (typeof item === 'object') {
          let player = item.player || item.name || item.p || '';
          const amount = (item.amount || item.value || item.v || item.amt || item[0]) || '';
          const percent = (item.percent || item.pct || item.percent_of || item[1]);
          player = String(player || '').replace(/`/g, '').replace(/^\*+|\*+$/g, '').trim();
          return { player, amount: amount === undefined ? '' : String(amount).trim(), percent: percent === undefined ? '' : String(percent).trim() };
        }
        // string: try to split by ':' then extract numbers
  const s = String(item).replace(/`/g, '').replace(/^\*+|\*+$/g, '').trim();
        // First try the old colon-delimited form: "Name: ..."
        const parts = s.split(':');
        if (parts.length >= 2) {
          const player = parts.shift().trim();
          const rest = parts.join(':').trim();
          // amount: first numeric token
          const numMatch = rest.match(/[-+]?\d[\d,]*(?:\.\d+)?/);
          const amount = numMatch ? numMatch[0] : '';
          // percent: try to find a percent either as 12.3% or (12.3)% or (12.3)
          let percent = '';
          const pctMatch = rest.match(/([\d.]+)\s*%/);
          if (pctMatch) percent = pctMatch[1];
          else {
            const parenMatch = rest.match(/\((\d+(?:\.\d+)?)\)/);
            if (parenMatch) percent = parenMatch[1];
          }
          return { player, amount: amount.replace(/,/g, ''), percent };
        }

        const altMatch = s.match(/^(.*\S)\s+([-+]?\d[\d,]*(?:\.\d+)?)(?:\s*\(?\s*([\d.]+)\s*%?\s*\)?)?$/);
        if (altMatch) {
          const player = (altMatch[1] || '').trim();
          const amount = (altMatch[2] || '').trim();
          const percent = (altMatch[3] || '').trim();
          return { player, amount: amount.replace(/,/g, ''), percent };
        }
        return { player: s, amount: '', percent: '' };
      }

      function makeContribLi(parsed, isTotal) {
        const li = document.createElement('li');
        li.className = isTotal ? 'total' : '';
        const left = document.createElement('span'); left.className = 'contrib-player';
        left.textContent = parsed.player || '';
        const right = document.createElement('span'); right.className = 'contrib-value';
        const amt = parsed.amount || '';
        const pct = parsed.percent ? `${parsed.percent}%` : '';
        right.textContent = amt + (pct ? `  (${pct})` : '');
        if (isTotal) {
          const strongLeft = document.createElement('strong'); strongLeft.appendChild(left);
          const strongRight = document.createElement('strong'); strongRight.appendChild(right);
          li.appendChild(strongLeft); li.appendChild(strongRight);
        } else {
          li.appendChild(left); li.appendChild(right);
        }
        return li;
      }

      // ensure contrib container header exists (create without clobbering existing children)
      let contribHeader = contrib.querySelector(':scope > h3');
      if (!contribHeader) {
        contribHeader = document.createElement('h3');
        contribHeader.innerHTML = 'Contribution (Latest Run) <button id="copy-contributions" class="copy-btn" style="margin-left: 10px;">Copy</button>';
        contrib.insertBefore(contribHeader, contrib.firstChild);
      }

      if (last.contrib !== contribListJson || isSwitchingDungeon) {
        // remove only the contributions list or "No contributions" message (preserve snapshots/container)
        const existingLists = contrib.querySelectorAll(':scope > .contrib-entries, :scope > p');
        existingLists.forEach(n => n.remove());

        // insert contributions (or placeholder message) immediately after the header
        const snapContainer = contrib.querySelector(':scope > .snapshots-container');
        const insertBeforeNode = snapContainer || contribHeader.nextSibling || null;

        if (d.contributions && d.contributions.length) {
          const cUl = document.createElement('ul');
          cUl.className = 'contrib-entries';
          for (const c of d.contributions) {
            const parsed = parseContribution(c);
            const isTotal = parsed && parsed.player && parsed.player.toLowerCase().includes('total');
            cUl.appendChild(makeContribLi(parsed || { player: String(c), amount: '', percent: '' }, isTotal));
          }
          if (insertBeforeNode) contrib.insertBefore(cUl, insertBeforeNode);
          else contrib.appendChild(cUl);
        } else {
          const p = document.createElement('p');
          p.innerHTML = '<em>Contribution list will populate after boss is defeated... </em>';
          if (insertBeforeNode) contrib.insertBefore(p, insertBeforeNode);
          else contrib.appendChild(p);
        }
      }

      // Add copy button functionality
      const copyBtn = contrib.querySelector('#copy-contributions');
      if (copyBtn) {
        copyBtn.onclick = () => {
          if (!d.contributions || !d.contributions.length) return;
          const formatted = d.contributions
            .filter(c => {
              const parsed = parseContribution(c);
              return parsed && parsed.player && !parsed.player.toLowerCase().includes('total');
            })
            .map(c => {
              const parsed = parseContribution(c);
              return `${parsed.player} - ${parsed.percent}%`;
            })
            .join(' | ');
          // append run time from elapsed timer state for this dungeon (MM:SS)
          let runTimeSegment = '';
          try {
            const elapsedState = (window.__dungeoneer_elapsed || {})[id];
            let elapsedSec = 0;
            if (elapsedState && elapsedState.status) {
              const nowSec = Math.floor(Date.now() / 1000);
              if (elapsedState.status === 'running') {
                elapsedSec = (nowSec - (elapsedState.startAt || nowSec)) + (elapsedState.baseElapsed || 0);
              } else if (elapsedState.status === 'stopped') {
                elapsedSec = elapsedState.baseElapsed || 0;
              }
            } else {
              // fallback: use last persisted elapsed if present
              const last = (window.__dungeoneer_last_elapsed || {})[id];
              if (typeof last === 'number') elapsedSec = last;
            }
            if (elapsedSec) runTimeSegment = ` | Run Time: ${formatElapsedMMSS(elapsedSec)}`;
          } catch (e) { /* ignore run time errors */ }

          navigator.clipboard.writeText(formatted + runTimeSegment);
        };
      }

      // recent snapshots: fetch and only rebuild when changed
      try {
        // API may return either an array of snapshots or an object keyed by index/timestamp.
        // Normalize to an array for consistent rendering.
        const rawSnaps = await window.api.fetchJSON(`/dungeondetails/${id}/contrib`);
        let snaps = rawSnaps;
        if (snaps && !Array.isArray(snaps) && typeof snaps === 'object') {
          // preserve natural ordering when keys are numeric-like
          const keys = Object.keys(snaps);
          const numericKeys = keys.every(k => /^-?\d+$/.test(k));
          if (numericKeys) keys.sort((a,b) => Number(a) - Number(b));
          snaps = keys.map(k => snaps[k]);
        }
        const snapsJson = JSON.stringify(snaps || []);
        if (snaps && snaps.length) {
          if (last.snaps !== snapsJson || isSwitchingDungeon) {
            // remove any existing snapshots container
            const old = contrib.querySelector('.snapshots-container');
            if (old) old.remove();
            const snapContainer = document.createElement('div');
            snapContainer.className = 'snapshots-container';
            snapContainer.innerHTML = '<h4>Recent Runs</h4>';
            for (let si = 0; si < snaps.length; si++) {
              let snap = snaps[si];
              // support snapshot objects like { contributions: [...], ts: 1234 }
              let snapItems = snap;
              let snapTs = null;
              if (snap && typeof snap === 'object' && !Array.isArray(snap)) {
                if (Array.isArray(snap.contributions)) snapItems = snap.contributions;
                else if (Array.isArray(snap.items)) snapItems = snap.items;
                else snapItems = [];
                if (snap.ts !== undefined) snapTs = snap.ts;
              }
              const snapBox = document.createElement('div');
              snapBox.className = 'snapshot';

              const header = document.createElement('div');
              header.className = 'snapshot-header';
              header.tabIndex = 0;
              const titleSpan = document.createElement('span'); titleSpan.className = 'snapshot-title';
              // if snapshot contains ts, show a humanized time
              if (snapTs) {
                const tsSec = (typeof snapTs === 'number' && snapTs > 1e11) ? Math.floor(snapTs/1000) : Math.floor(Number(snapTs) || 0);
                const date = new Date(tsSec * 1000);
                titleSpan.textContent = `Snapshot ${si + 1} — ${date.toLocaleString()}`;
              } else {
                titleSpan.textContent = `Snapshot ${si + 1}`;
              }
              const caret = document.createElement('span'); caret.className = 'caret'; caret.textContent = '▶';
              header.appendChild(titleSpan); header.appendChild(caret);

              const content = document.createElement('div'); content.className = 'snapshot-content';
              const snapKey = `${id}::${si}`;
              const wasOpen = Boolean(window.__dungeoneer_snapshot_open_states[snapKey]);
              content.style.display = wasOpen ? 'block' : 'none';
              if (wasOpen) snapBox.classList.add('open');
              const snapUl = document.createElement('ul');
              for (const item of snapItems) {
                // reuse contribution parsing and rendering for consistent two-column layout
                const raw = (typeof item === 'string') ? item.replace(/^-?\s*/, '') : item;
                const parsed = parseContribution(raw && raw.player ? raw : (typeof raw === 'string' ? raw : raw));
                const isTotal = parsed && parsed.player && parsed.player.toLowerCase().includes('total');
                snapUl.appendChild(makeContribLi(parsed || { player: String(item), amount: '', percent: '' }, isTotal));
              }
              content.appendChild(snapUl);

              const toggle = () => {
                const isOpen = snapBox.classList.toggle('open');
                content.style.display = isOpen ? 'block' : 'none';
                caret.textContent = isOpen ? '▼' : '▶';
                window.__dungeoneer_snapshot_open_states[snapKey] = isOpen;
              };
              header.addEventListener('click', toggle);
              header.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } });

              snapBox.appendChild(header); snapBox.appendChild(content);
              snapContainer.appendChild(snapBox);
            }
            contrib.appendChild(snapContainer);
          }
        } else {
          // remove snapshots container if present and snaps now empty
          const old = contrib.querySelector('.snapshots-container'); if (old) old.remove();
        }
        // store snapshots JSON for diffing
        window.__dungeoneer_last_details[id] = Object.assign({}, last, {
          title: titleText,
          desc: desc,
          players: playersJSON,
          boss: atBossStatus,
          contrib: contribListJson,
          snaps: snapsJson
        });
      } catch (err) {
        // If fetching snapshots failed (404 or other), remove any existing snapshots
        // container so we don't display stale snapshots from a previously-selected
        // dungeon. Also update the cached last_details for this id to reflect
        // an empty snapshots list.
        const old = contrib.querySelector('.snapshots-container'); if (old) old.remove();
        try {
          window.__dungeoneer_last_details[id] = Object.assign({}, last, {
            title: titleText,
            desc: desc,
            players: playersJSON,
            boss: atBossStatus,
            contrib: contribListJson,
            snaps: JSON.stringify([])
          });
        } catch (e) {
          // ignore any errors while trying to update cache
        }
        // swallow the original error to avoid breaking detail rendering
      }

      setStatus('loaded details');
  // update elapsed state for the currently displayed dungeon so the detail header timer is shown/hidden/stopped
  try { updateElapsedStateForBtn(details, d, id); } catch (e) { /* swallow */ }
      // If this load was manual (user clicked), start/reset the auto-refresh for details
      if (manual) {
        currentSelectedId = id;
        if (detailsAutoInterval) clearInterval(detailsAutoInterval);
        detailsAutoInterval = setInterval(() => {
          if (currentSelectedId) loadDetails(currentSelectedId, false);
        }, 5000);
      }
    } catch (e) {
      setStatus('error: ' + e.message);
      details.innerHTML = '<div class="error">Could not load details</div>';
    } finally {
      isLoadingDetails = false;
    }
  }

  await loadList();
  setInterval(loadList, 10000);
}

// export helpers for unit testing in Node (when file is required from test)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { sanitizeDescription };
}
