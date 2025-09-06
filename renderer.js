document.addEventListener('DOMContentLoaded', init);

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
          } catch (err) {
            // guard against unexpected DOM changes
            // console.error(err);
          }
        }, 1000);
      }
      for (const id of ids) {
  const btn = document.createElement('button');
  btn.className = 'dungeon-item';
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
  left.textContent = kindText ? `${clean(nameText)} — ${clean(kindText)}` : clean(nameText);
        // apply initial state styling (may be updated by background fetch)
        applyStateClass(btn, data[id], id);
        // if structured kind not present in the listing, fetch the dungeon details in background
        if (!kindText) {
          (async () => {
            try {
              const dd = await window.api.fetchJSON(`/dungeondetails/${id}`);
              const sk = dd && dd.state && dd.state.kind ? String(dd.state.kind) : '';
              if (sk) left.textContent = `${clean(nameText)} — ${clean(sk)}`;
              // update styling with full details
              applyStateClass(btn, dd, id);
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
        btn.appendChild(left);
        btn.appendChild(right);
        btn.onclick = () => loadDetails(id);
        list.appendChild(btn);
      }
      setStatus(`loaded ${ids.length} dungeons`);
    } catch (e) {
      setStatus('error: ' + e.message);
      list.innerHTML = '<div class="error">Could not load dungeons</div>';
    }
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


  // state for detail auto-refresh
  let currentSelectedId = null;
  let detailsAutoInterval = null;
  let isLoadingDetails = false;

  async function loadDetails(id) {
    // loadDetails(id, manual=true)
    // manual=true indicates a user-initiated load (start/reset auto-refresh)
    const manual = arguments.length < 2 ? true : Boolean(arguments[1]);
    if (!id) return;
    setStatus(`loading ${id}...`);
    if (isLoadingDetails) return; // avoid overlapping detail fetches
    isLoadingDetails = true;
    try {
      const d = await window.api.fetchJSON(`/dungeondetails/${id}`);

      // partial DOM updates: only update changed parts to preserve UI state (expanded snapshots, scroll)
      window.__dungeoneer_last_details = window.__dungeoneer_last_details || {};
      const last = window.__dungeoneer_last_details[id] || {};

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
      if (titleEl.textContent !== titleText) titleEl.textContent = titleText;

      // description (compute cleaned desc)
      let desc = '';
      if (d.description) {
        desc = String(d.description || '');
        desc = desc.split(/\r?\n/)
          .filter(line => {
            if (/^\s*current players\s*:/i.test(line)) return false;
            if (/^\s*boss contribution\s*:/i.test(line)) return false;
            if (/^\s*(?:[-*]\s*)?`?.+`?\s*:\s*\d+(?:\.\d+)?%\s*$/i.test(line)) return false;
            return true;
          })
          .map(l => l.replace(/`/g, ''))
          .join('\n')
          .trim();
      }
      const contributionLineRe = /^\s*(?:[-*]\s*)?`?.+`?\s*:\s*[\d.,]+%\s*$/i;
      const remainingLines = desc.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
      const allContrib = remainingLines.length > 0 && remainingLines.every(l => contributionLineRe.test(l) || /^boss contribution\s*:?$/i.test(l));
      const showDesc = desc && !allContrib;
      let descEl = details.querySelector('#detail-desc');
      if (showDesc) {
        if (!descEl) {
          descEl = document.createElement('pre');
          descEl.id = 'detail-desc';
          // insert after title
          titleEl.insertAdjacentElement('afterend', descEl);
        }
        if (descEl.textContent !== desc) descEl.textContent = desc;
      } else if (descEl) {
        descEl.remove();
      }

      // players list
      let playersEl = details.querySelector('#detail-players');
      const playersJSON = JSON.stringify(d.players || []);
      if (!playersEl) {
        playersEl = document.createElement('div');
        playersEl.id = 'detail-players';
        playersEl.className = 'players';
        // place after description or title
        if (descEl) titleEl.insertAdjacentElement('afterend', playersEl);
        else titleEl.insertAdjacentElement('afterend', playersEl);
      }
      if (last.players !== playersJSON) {
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
      }

      // contributions (latest)
      const contribHeaderHtml = '<h3>Contributions (latest)</h3>';
      const contribListJson = JSON.stringify(d.contributions || []);
      // ensure contrib container header exists
      if (!contrib.querySelector(':scope > h3')) contrib.innerHTML = contribHeaderHtml;
      if (last.contrib !== contribListJson) {
        // replace only the list part
        // remove existing list or message nodes after the header
        const existing = Array.from(contrib.children).slice(1);
        existing.forEach(n => n.remove());
        if (d.contributions && d.contributions.length) {
          const cUl = document.createElement('ul');
          for (const c of d.contributions) {
            const li = document.createElement('li');
            if (typeof c === 'string') li.textContent = c;
            else li.textContent = `${c.player}: ${c.percent}%`;
            cUl.appendChild(li);
          }
          contrib.appendChild(cUl);
        } else {
          contrib.innerHTML += '<p><em>No contributions</em></p>';
        }
      }

      // recent snapshots: fetch and only rebuild when changed
      try {
        const snaps = await window.api.fetchJSON(`/dungeondetails/${id}/contrib`);
        const snapsJson = JSON.stringify(snaps || []);
        if (snaps && snaps.length) {
          if (last.snaps !== snapsJson) {
            // remove any existing snapshots container
            const old = contrib.querySelector('.snapshots-container');
            if (old) old.remove();
            const snapContainer = document.createElement('div');
            snapContainer.className = 'snapshots-container';
            snapContainer.innerHTML = '<h4>Recent snapshots</h4>';
            for (let si = 0; si < snaps.length; si++) {
              const snap = snaps[si];
              const snapBox = document.createElement('div');
              snapBox.className = 'snapshot';

              const header = document.createElement('div');
              header.className = 'snapshot-header';
              header.tabIndex = 0;
              const titleSpan = document.createElement('span'); titleSpan.className = 'snapshot-title'; titleSpan.textContent = `Snapshot ${si + 1}`;
              const caret = document.createElement('span'); caret.className = 'caret'; caret.textContent = '▶';
              header.appendChild(titleSpan); header.appendChild(caret);

              const content = document.createElement('div'); content.className = 'snapshot-content';
              const snapKey = `${id}::${si}`;
              const wasOpen = Boolean(window.__dungeoneer_snapshot_open_states[snapKey]);
              content.style.display = wasOpen ? 'block' : 'none';
              if (wasOpen) snapBox.classList.add('open');
              const snapUl = document.createElement('ul');
              for (const item of snap) {
                const li = document.createElement('li');
                if (typeof item === 'string') li.textContent = item.replace(/^-?\s*/, '').replace(/`/g, '');
                else if (item && item.player) li.textContent = `${item.player}: ${item.percent}%`;
                else li.textContent = JSON.stringify(item);
                snapUl.appendChild(li);
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
          contrib: contribListJson,
          snaps: JSON.stringify(snaps || [])
        });
      } catch (err) {
        // ignore snapshot errors
      }

      setStatus('loaded details');
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

  document.getElementById('refresh-btn').addEventListener('click', loadList);
  await loadList();
  // auto-refresh list every 10s
  setInterval(loadList, 10000);
}
