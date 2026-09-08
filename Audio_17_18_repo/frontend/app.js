'use strict';

// ── Utilities ──────────────────────────────────────────────────────────────
const $ = (id) => document.getElementById(id);

const FORCE_COLOURS = {
  'BSF':           '#003380',
  'ITBP':          '#1A6B3C',
  'Assam Rifles':  '#F4762A',
};

// ── IST Clock ──────────────────────────────────────────────────────────────
function tickClock() {
  const now  = new Date();
  const tz   = { timeZone: 'Asia/Kolkata' };
  const time = new Intl.DateTimeFormat('en-GB', { ...tz, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(now);
  const date = new Intl.DateTimeFormat('en-IN', { ...tz, weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' }).format(now);
  $('clock').textContent     = time;
  $('clockDate').textContent = date;
}
setInterval(tickClock, 1000);
tickClock();

// ── State ──────────────────────────────────────────────────────────────────
let posts       = [];
let armed       = false;
let mediaStream = null;

// ── Boot ───────────────────────────────────────────────────────────────────
async function boot() {
  try {
    await Promise.all([loadHealth(), loadSectors()]);
    await refreshAlerts();
    await refreshHistory();
    connectWs();
  } catch (err) {
    setStatus('Console initialisation failed: ' + err.message, true);
  }
}

// ── Health / model status ──────────────────────────────────────────────────
async function loadHealth() {
  const h = await fetch('/api/v1/health').then(r => r.json());
  renderModelPills(h);
}

function renderModelPills(h) {
  const models = h.models || {};
  const defs = [
    { key: 'yamnet',          label: 'YAMNet' },
    { key: 'panns_cnn14',     label: 'PANNs CNN14' },
    { key: 'whisper',         label: 'Whisper-' + (models.whisper?.size || 'base') },
    { key: 'drone_physics',   label: 'UAV Physics' },
    { key: 'dsp_specialists', label: 'DSP Specialists' },
  ];
  const wrap = $('modelPills');
  wrap.innerHTML = '';

  for (const { key, label } of defs) {
    const v     = models[key];
    const ready = v?.ready === true;
    const cls   = ready ? 'pill-on' : (v === undefined ? 'pill-wait' : 'pill-off');
    const pill  = document.createElement('span');
    pill.className = 'model-pill ' + cls;
    const dot = document.createElement('span');
    dot.className = 'pill-dot';
    pill.appendChild(dot);
    pill.appendChild(document.createTextNode(label));
    if (!ready && v?.error) pill.title = v.error;
    wrap.appendChild(pill);
  }

  const opSpan = document.createElement('span');
  opSpan.className = 'op-status ' + (models.operational ? 'op-ok' : 'op-deg');
  opSpan.textContent = models.operational ? 'OPERATIONAL' : 'DEGRADED';
  wrap.appendChild(opSpan);
}

// ── Sectors ────────────────────────────────────────────────────────────────
async function loadSectors() {
  const data = await fetch('/api/v1/sectors').then(r => r.json());
  posts = data.sectors || [];
  const sel = $('postSelect');
  sel.innerHTML = posts.map(p =>
    `<option value="${p.post_id}">${p.post_id} — ${p.sector} (${p.state}) [${p.force}]</option>`
  ).join('');
  drawMap();
}

function selectedPost() {
  const id = $('postSelect').value;
  return posts.find(p => p.post_id === id) || posts[0] || {
    post_id: 'BOP-RJ-014', sector: 'Barmer-Jaisalmer Sector',
    state: 'Rajasthan', force: 'BSF', lat: 26.9157, lon: 70.9083,
  };
}

// ── Map ────────────────────────────────────────────────────────────────────
function drawMap() {
  const svg = $('indiaMap');
  const W = 300, H = 340;

  svg.innerHTML = `
    <rect width="${W}" height="${H}" fill="#F4F6FB"/>
    <path d="M148 22 L173 44 L194 76 L204 120 L201 170 L190 220 L174 268 L150 310 L130 284 L112 234 L104 176 L111 124 L130 76 Z"
      fill="#DDEEFF" stroke="#B0BFCE" stroke-width="1.2" stroke-linejoin="round"/>
    <text x="152" y="156" fill="#9AAABB" font-size="8" text-anchor="middle"
      font-family="'Noto Sans',sans-serif" letter-spacing="1">INDIA</text>
  `;

  const project = (lat, lon) => {
    const x = (lon - 67.5) / (98 - 67.5) * (W - 36) + 18;
    const y = (38 - lat)   / (38 - 7)    * (H - 36) + 18;
    return [Math.round(x), Math.round(y)];
  };

  const legend   = $('postLegend');
  legend.innerHTML = '';
  const activeId = $('postSelect').value;

  posts.forEach(p => {
    const [x, y]  = project(p.lat, p.lon);
    const colour  = FORCE_COLOURS[p.force] || '#555';
    const isActive = p.post_id === activeId;

    if (isActive) {
      const ring = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      ring.setAttribute('cx', x); ring.setAttribute('cy', y); ring.setAttribute('r', 11);
      ring.setAttribute('fill', 'none'); ring.setAttribute('stroke', colour);
      ring.setAttribute('stroke-width', '1.5'); ring.setAttribute('opacity', '0.35');
      svg.appendChild(ring);
    }

    const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    c.setAttribute('cx', x); c.setAttribute('cy', y);
    c.setAttribute('r', isActive ? 5.5 : 4);
    c.setAttribute('fill', colour);
    c.setAttribute('stroke', '#FFFFFF');
    c.setAttribute('stroke-width', isActive ? '1.5' : '1.2');
    c.style.cursor = 'pointer';
    c.setAttribute('aria-label', p.post_id + ' — ' + p.sector);
    c.addEventListener('click', () => { $('postSelect').value = p.post_id; drawMap(); });
    svg.appendChild(c);

    const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    label.setAttribute('x', x + 7); label.setAttribute('y', y + 4);
    label.setAttribute('fill', '#2C3E50'); label.setAttribute('font-size', '8');
    label.setAttribute('font-family', "'Noto Sans', sans-serif");
    label.textContent = p.post_id;
    svg.appendChild(label);

    // Legend row
    const li = document.createElement('li');
    li.innerHTML =
      `<span class="legend-dot" style="background:${colour}"></span>` +
      `<span><strong>${escHtml(p.post_id)}</strong> &mdash; ${escHtml(p.sector)} ` +
      `<span class="legend-force">(${escHtml(p.force)})</span></span>`;
    li.addEventListener('click', () => { $('postSelect').value = p.post_id; drawMap(); });
    legend.appendChild(li);
  });
}

$('postSelect').addEventListener('change', drawMap);

// ── Microphone ─────────────────────────────────────────────────────────────
async function captureBurst(seconds = 4) {
  try {
    mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch (e) {
    setStatus('Microphone access denied: ' + e.message, true);
    return;
  }
  const ctx   = new AudioContext({ sampleRate: 16000 });
  const sr    = ctx.sampleRate;
  const src   = ctx.createMediaStreamSource(mediaStream);
  const proc  = ctx.createScriptProcessor(4096, 1, 1);
  const chunks = [];

  src.connect(proc);
  proc.connect(ctx.destination);
  armed = true;
  $('btnMic').disabled  = true;
  $('btnStop').disabled = false;
  setStatus('Recording — ' + seconds + ' s burst in progress…');

  proc.onaudioprocess = (e) => {
    if (!armed) return;
    const data = e.inputBuffer.getChannelData(0);
    chunks.push(new Float32Array(data));
    const rms = Math.sqrt(data.reduce((a, v) => a + v * v, 0) / data.length);
    $('vu').firstElementChild.style.width = Math.min(100, rms * 500) + '%';
  };

  await new Promise(res => setTimeout(res, seconds * 1000));
  armed = false;
  proc.disconnect(); src.disconnect();
  mediaStream.getTracks().forEach(t => t.stop());
  await ctx.close();
  $('btnMic').disabled  = false;
  $('btnStop').disabled = true;
  $('vu').firstElementChild.style.width = '0%';

  const total = chunks.reduce((n, c) => n + c.length, 0);
  const pcm   = new Float32Array(total);
  let offset  = 0;
  chunks.forEach(c => { pcm.set(c, offset); offset += c.length; });
  await uploadBlob(encodeWav(pcm, sr), 'mic-burst.wav');
}

$('btnStop').onclick = () => {
  armed = false;
  if (mediaStream) mediaStream.getTracks().forEach(t => t.stop());
  $('btnMic').disabled  = false;
  $('btnStop').disabled = true;
};
$('btnMic').onclick = () => captureBurst(4).catch(err => {
  setStatus('Microphone error: ' + err.message, true);
  $('btnMic').disabled = false;
});

// ── File upload ────────────────────────────────────────────────────────────
$('fileIn').onchange = async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  $('fileNameDisplay').textContent = file.name;
  await uploadBlob(file, file.name);
};

// ── Self-test ──────────────────────────────────────────────────────────────
$('btnSelfTest').onclick = async () => {
  $('btnSelfTest').disabled = true;
  setStatus('Downloading field clips and running real models. First run may take several minutes.');
  try {
    const res  = await fetch('/api/v1/ops/self-test', { method: 'POST' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'HTTP ' + res.status);
    setStatus('Field battery complete — ' + data.count + ' clips processed successfully.');
    await Promise.all([refreshAlerts(), refreshHistory(), loadHealth()]);
  } catch (err) {
    setStatus('Self-test failed: ' + err.message, true);
  } finally {
    $('btnSelfTest').disabled = false;
  }
};

// ── Upload and analyse ─────────────────────────────────────────────────────
async function uploadBlob(blob, name) {
  const p  = selectedPost();
  const fd = new FormData();
  fd.append('file',    blob, name);
  fd.append('post_id', p.post_id);
  fd.append('sector',  p.sector);
  fd.append('state',   p.state  || '');
  fd.append('lat',     p.lat);
  fd.append('lon',     p.lon);
  setStatus('Submitting to YAMNet + PANNs CNN14 + Whisper + UAV Physics pipeline…');
  try {
    const res  = await fetch('/api/v1/audio/analyze', { method: 'POST', body: fd });
    if (!res.ok) throw new Error('Server error HTTP ' + res.status);
    const data = await res.json();
    renderAnalysis(data);
    await Promise.all([refreshAlerts(), refreshHistory()]);
  } catch (err) {
    setStatus('Analysis failed: ' + err.message, true);
  }
}

// ── Render full analysis ───────────────────────────────────────────────────
function renderAnalysis(data) {
  // KPI
  $('kpiDur').textContent = (data.duration_sec || 0).toFixed(1) + ' s';
  const topEv = (data.events || [])[0];
  $('kpiEvent').textContent = topEv ? topEv.label : '—';

  const droneScore = data.drone?.threat_score || 0;
  $('kpiDrone').textContent = droneScore.toFixed(3);

  const droneCard = $('kpiDroneCard');
  if (data.drone?.threat) {
    droneCard.style.borderTopColor = 'var(--crit)';
    $('kpiDrone').style.color = 'var(--crit)';
  } else {
    droneCard.style.borderTopColor = 'var(--saffron)';
    $('kpiDrone').style.color = droneScore > 0.35 ? 'var(--high)' : 'var(--navy)';
  }

  // Spectrogram
  if (data.spectrogram_png_b64) {
    const img = $('specImg');
    img.src = 'data:image/png;base64,' + data.spectrogram_png_b64;
    img.style.display = 'block';
    $('specPlaceholder').style.display = 'none';
  }

  renderDrone(data.drone  || {});
  renderEvents(data.events || []);
  renderTranscript(data.transcript || {});

  const sha    = (data.evidence_sha256 || '').substring(0, 24);
  const models = (data.models_used    || []).join(' | ');
  setStatus('ID: ' + data.analysis_id + '  |  Models: ' + models + '  |  SHA-256: ' + sha + '…');
}

// ── Drone panel ────────────────────────────────────────────────────────────
function renderDrone(drone) {
  const badge  = $('droneBadge');
  const detail = $('droneDetail');

  if (drone.threat) {
    badge.textContent = 'DRONE / UAV THREAT';
    badge.className   = 'drone-status-badge threat';
  } else {
    badge.textContent = 'NO THREAT';
    badge.className   = 'drone-status-badge';
  }

  if (drone.threat_score === undefined && !drone.threat) {
    detail.innerHTML = '<div class="drone-empty">No clip analysed yet. Submit audio to begin.</div>';
    return;
  }

  const sig   = drone.signature    || {};
  const votes = drone.model_votes  || {};
  const isCrit = drone.threat && drone.class_name === 'multirotor_uav';

  const metrics = [
    { label: 'Fused Threat Score', value: (drone.threat_score || 0).toFixed(4), alert: drone.threat },
    { label: 'Classification',     value: (drone.class_name   || 'none'), small: true },
    { label: 'Confidence',         value: (drone.class_confidence || 0).toFixed(4) },
    { label: 'BPF (Blade-Pass)',   value: sig.bpf_hz ? sig.bpf_hz + ' Hz' : '—' },
    { label: 'Physics Score',      value: sig.physics_score !== undefined ? sig.physics_score : '—' },
    { label: 'F0 Stability',       value: sig.f0_stability  !== undefined ? sig.f0_stability  : '—' },
    { label: 'YAMNet Aerial',      value: (votes.yamnet_aerial || 0).toFixed(4) },
    { label: 'PANNs Aerial',       value: (votes.panns_aerial  || 0).toFixed(4) },
    { label: 'Rotor Modulation',   value: (votes.rotor_mod     || 0).toFixed(4) },
  ];

  const metricsHtml = metrics.map(m =>
    `<div class="drone-metric">
      <div class="drone-metric-label">${escHtml(m.label)}</div>
      <div class="drone-metric-value" style="${m.alert ? 'color:var(--crit)' : ''};${m.small ? 'font-size:12px' : ''}">${escHtml(String(m.value))}</div>
    </div>`
  ).join('');

  detail.innerHTML = `
    <div class="drone-metrics-grid">${metricsHtml}</div>
    <div class="drone-action ${isCrit ? 'critical' : ''}">
      <strong>Recommended Action:</strong> ${escHtml(drone.recommended_action || 'Monitor acoustic sentry.')}
    </div>
  `;
}

// ── Events table ───────────────────────────────────────────────────────────
function renderEvents(events) {
  const tbody = $('eventBody');
  if (!events.length) {
    tbody.innerHTML = '<tr><td colspan="4" class="empty-state">No events detected.</td></tr>';
    return;
  }
  tbody.innerHTML = events.slice(0, 14).map(e => {
    const score    = e.score || 0;
    const pct      = Math.round(score * 100);
    const fillCls  = score >= 0.70 ? 'fill-high' : score >= 0.40 ? 'fill-med' : 'fill-low';
    const catSlug  = (e.category || 'other').replace(/[^a-z_]/g, '');
    const catLabel = catSlug.replace(/_/g, ' ');
    const srcLabel = (e.sources || [e.source_model]).join(' + ');
    return `<tr>
      <td>
        <div class="event-label">${escHtml(e.label)}</div>
        ${e.hindi_label ? `<div class="event-hindi">${escHtml(e.hindi_label)}</div>` : ''}
      </td>
      <td><span class="cat-badge cat-${catSlug}">${escHtml(catLabel)}</span></td>
      <td><span class="model-tag">${escHtml(srcLabel)}</span></td>
      <td>
        <div class="score-cell">
          <div class="score-bar"><div class="score-fill ${fillCls}" style="width:${pct}%"></div></div>
          <span class="score-num">${score.toFixed(3)}</span>
        </div>
      </td>
    </tr>`;
  }).join('');
}

// ── Transcript panel ───────────────────────────────────────────────────────
function renderTranscript(tr) {
  $('transcript').textContent = tr.text || tr.clean_text || 'No speech detected in this clip.';

  const langB = $('langBadge');
  const langCode = tr.language_code || tr.language || tr.primary_language || '';
  if (langCode && (tr.language_probability || 0) > 0.30) {
    const native = tr.language_native ? tr.language_native + ' ' : '';
    const name   = tr.language_name   ? '(' + tr.language_name + ')' : langCode.toUpperCase();
    const prob   = Math.round((tr.language_probability || 0) * 100);
    const script = tr.script || tr.language_script || 'Latin';
    langB.innerHTML = `${escHtml(native + name)} &nbsp;&bull;&nbsp; <strong>${prob}%</strong> &nbsp;&bull;&nbsp; <span class="script-badge">${escHtml(script)}</span>`;
    langB.style.display = 'block';
  } else {
    langB.style.display = 'none';
  }

  const distBox = $('distressBox');
  const phrases = tr.distress_phrases || [];
  const threats = tr.threat_keywords  || [];
  const isDist  = tr.is_distress || tr.distress || phrases.length > 0 || threats.length > 0;

  if (isDist && (phrases.length || threats.length)) {
    distBox.style.display = 'flex';
    const chips = threats.map(t => `<span class="threat-chip">⚠️ ${escHtml(t)}</span>`).join(' ');
    const phraseStr = phrases.length ? 'Distress: ' + phrases.slice(0, 5).join(', ') : '';
    $('distressPhrases').innerHTML = `
      <div>${escHtml(phraseStr)}</div>
      ${threats.length ? `<div class="threat-chip-container">${chips}</div>` : ''}
    `;
  } else {
    distBox.style.display = 'none';
  }
}

// ── Alert ledger ───────────────────────────────────────────────────────────
async function refreshAlerts() {
  try {
    const data  = await fetch('/api/v1/alerts?limit=60').then(r => r.json());
    const items = data.alerts || [];
    const open  = items.filter(a => !a.acknowledged).length;

    $('kpiOpen').textContent = open;
    $('kpiOpen').style.color = open > 0 ? 'var(--crit)' : 'var(--green)';

    const list = $('alertList');
    if (!items.length) {
      list.innerHTML = '<div class="empty-state">No alerts in ledger.</div>';
      return;
    }
    list.innerHTML = items.map(a => {
      const sev  = a.severity || 'LOW';
      const ackH = a.acknowledged
        ? `<span class="ack-done">Acknowledged</span>`
        : `<button class="btn-ack" onclick="ackAlert(${a.id})">Acknowledge</button>`;
      return `<div class="alert-item">
        <div class="alert-sev-bar ${sev}"></div>
        <div class="alert-content">
          <div class="alert-title-row">
            <span class="alert-sev-tag tag-${sev}">${sev}</span>
            <span class="alert-title-text">${escHtml(a.title)}</span>
          </div>
          ${a.title_hi ? `<div class="alert-hindi">${escHtml(a.title_hi)}</div>` : ''}
          <div class="alert-meta">
            Post: <strong>${escHtml(a.post_id || '—')}</strong>
            &nbsp;&nbsp;Score: <strong>${(a.score || 0).toFixed(3)}</strong>
          </div>
          <div class="alert-detail">${escHtml((a.detail || '').substring(0, 200))}</div>
        </div>
        <div class="alert-ack">${ackH}</div>
      </div>`;
    }).join('');
  } catch (_) {}
}

window.ackAlert = async (id) => {
  await fetch('/api/v1/alerts/' + id + '/ack', { method: 'POST' });
  refreshAlerts();
};
$('refreshAlerts').onclick = refreshAlerts;

// ── Evidence history ───────────────────────────────────────────────────────
async function refreshHistory() {
  try {
    const data  = await fetch('/api/v1/analyses?limit=12').then(r => r.json());
    const tbody = $('histBody');
    const rows  = data.analyses || [];
    if (!rows.length) {
      tbody.innerHTML = '<tr><td colspan="4" class="empty-state">No analyses recorded.</td></tr>';
      return;
    }
    tbody.innerHTML = rows.map(r => `<tr>
      <td title="${escHtml(r.created_at || '')}">${escHtml((r.created_at || '').replace('T', ' ').substring(0, 19))}</td>
      <td title="${escHtml(r.post_id || '')}">${escHtml(r.post_id || '—')}</td>
      <td title="${escHtml(r.id || '')}">${escHtml((r.id || '—').substring(0, 12))}</td>
      <td title="${escHtml(r.evidence_sha256 || '')}">${escHtml((r.evidence_sha256 || '').substring(0, 12))}…</td>
    </tr>`).join('');
  } catch (_) {}
}

// ── WebSocket ──────────────────────────────────────────────────────────────
function connectWs() {
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  const ws    = new WebSocket(proto + '://' + location.host + '/ws/ops');
  ws.onmessage = (ev) => {
    try {
      const msg = JSON.parse(ev.data);
      if (msg.type === 'analysis') {
        refreshAlerts();
        refreshHistory();
      } else if (msg.type === 'hello') {
        renderModelPills({ models: msg.models });
      }
    } catch (_) {}
  };
  ws.onclose = () => setTimeout(connectWs, 4000);
  ws.onerror = () => ws.close();
}

// ── WAV encoder ────────────────────────────────────────────────────────────
function encodeWav(f32, sr) {
  const n   = f32.length;
  const buf = new ArrayBuffer(44 + n * 2);
  const v   = new DataView(buf);
  const ws  = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  ws(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); ws(8, 'WAVE'); ws(12, 'fmt ');
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, sr, true); v.setUint32(28, sr * 2, true);
  v.setUint16(32, 2, true);  v.setUint16(34, 16, true); ws(36, 'data');
  v.setUint32(40, n * 2, true);
  let off = 44;
  for (let i = 0; i < n; i++, off += 2) {
    const s = Math.max(-1, Math.min(1, f32[i]));
    v.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }
  return new Blob([buf], { type: 'audio/wav' });
}

// ── Helpers ────────────────────────────────────────────────────────────────
function setStatus(msg, isError) {
  const el = $('statusLine');
  el.textContent  = msg;
  el.style.color  = isError ? 'var(--crit)' : 'var(--text-muted)';
}

function escHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Init ───────────────────────────────────────────────────────────────────
boot().catch(err => setStatus('Boot failed: ' + err.message, true));
