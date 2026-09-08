'use strict';

// ── Utilities ──────────────────────────────────────────────────────────────
const $ = (id) => document.getElementById(id);
const escHtml = (s) => String(s ?? '')
  .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

// Refresh interval: poll every 8 seconds
const POLL_MS = 8000;
let _pollTimer = null;
let _lastDroneData = null;    // last drone_update from WebSocket
let _lastTimeline  = [];      // last per-frame timeline array

// ── IST Clock ──────────────────────────────────────────────────────────────
function tickClock() {
  const tz   = { timeZone: 'Asia/Kolkata' };
  const now  = new Date();
  $('clock').textContent     = new Intl.DateTimeFormat('en-GB', { ...tz, hour:'2-digit', minute:'2-digit', second:'2-digit', hour12:false }).format(now);
  $('clockDate').textContent = new Intl.DateTimeFormat('en-IN', { ...tz, weekday:'short', day:'2-digit', month:'short', year:'numeric' }).format(now);
}
setInterval(tickClock, 1000);
tickClock();

// ── Boot ───────────────────────────────────────────────────────────────────
async function boot() {
  try {
    await Promise.all([loadHealth(), loadDroneStatus()]);
    await Promise.all([loadTracks(), loadProfiles()]);
    connectWs();
    _pollTimer = setInterval(() => {
      loadDroneStatus();
      loadTracks();
    }, POLL_MS);
  } catch (err) {
    console.error('Drone console boot failed:', err);
  }
}

// ── Health / model pills ───────────────────────────────────────────────────
async function loadHealth() {
  const h = await fetch('/api/v1/health').then(r => r.json());
  const models = h.models || {};
  const defs = [
    { key: 'yamnet',           label: 'YAMNet' },
    { key: 'panns_cnn14',      label: 'PANNs CNN14' },
    { key: 'drone_classifier', label: 'Drone Classifier' },
    { key: 'drone_physics',    label: 'UAV Physics' },
    { key: 'dsp_specialists',  label: 'DSP Specialists' },
  ];
  const wrap = $('modelPills');
  wrap.innerHTML = '';
  for (const { key, label } of defs) {
    const v     = models[key];
    const ready = v?.ready === true;
    const pill  = document.createElement('span');
    pill.className = 'model-pill ' + (ready ? 'pill-on' : (v === undefined ? 'pill-wait' : 'pill-off'));
    const dot = document.createElement('span'); dot.className = 'pill-dot';
    pill.appendChild(dot);
    pill.appendChild(document.createTextNode(label));
    wrap.appendChild(pill);
  }
  const op = document.createElement('span');
  op.className   = 'op-status ' + (models.operational ? 'op-ok' : 'op-deg');
  op.textContent = models.operational ? 'OPERATIONAL' : 'DEGRADED';
  wrap.appendChild(op);
}

// ── Drone status ───────────────────────────────────────────────────────────
async function loadDroneStatus() {
  try {
    const data = await fetch('/api/v1/drone/status').then(r => r.json());
    renderDroneStatus(data);
    if (data.active_threats?.length) {
      renderThreatList(data.active_threats);
    }
  } catch (e) { console.warn('drone status fetch failed', e); }
}

function renderDroneStatus(data) {
  const ew    = data.system_warning_level || 'NONE';
  const score = data.highest_threat_score || 0;

  // EW badge in status bar
  const ewBadge = $('ewBadge');
  ewBadge.textContent  = 'WATCH LEVEL: ' + ew;
  ewBadge.className    = 'ew-badge ew-' + ew;

  // KPI cards
  const ewLevel = $('kpiEwLevel');
  ewLevel.textContent = ew;
  ewLevel.className   = 'kpi-ew-level ' + ew;

  $('kpiScore').textContent   = score.toFixed(3);
  $('kpiScore').style.color   = ew === 'CRITICAL' ? 'var(--crit)' : ew === 'ALERT' ? 'var(--high)' : 'var(--navy)';
  $('kpiThreats').textContent = (data.active_threats || []).length;
  $('kpiThreats').style.color = data.active_threats?.length ? 'var(--crit)' : 'var(--navy)';
  $('kpiPosts').textContent   = data.posts_monitored || 0;
  $('kpiTotal').textContent   = data.db_stats?.total ?? data.total_detections ?? 0;
}

// ── Threat board ───────────────────────────────────────────────────────────
async function loadThreats() {
  const data = await fetch('/api/v1/drone/active-threats').then(r => r.json());
  renderDroneStatus(data.status || {});
  renderThreatList(data.threats || []);
}

function renderThreatList(threats) {
  const list = $('threatList');
  if (!threats.length) {
    list.innerHTML = '<div class="empty-state">No active drone threats. System monitoring all posts.</div>';
    return;
  }
  list.innerHTML = threats.map(t => {
    const tier  = tierFromScore(t.threat_score);
    const ts    = t.ts ? new Date(t.ts * 1000).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour12: false }) : '—';
    return `<div class="threat-item">
      <div class="threat-bar ${tier}"></div>
      <div class="threat-content">
        <div class="threat-post">${escHtml(t.post_id || '—')}</div>
        <div class="threat-class">${escHtml(t.class_label || t.drone_class || 'Unknown UAV')}</div>
        ${t.class_label_hi ? `<div class="threat-class-hi">${escHtml(t.class_label_hi)}</div>` : ''}
        <div class="threat-meta">
          EW: ${escHtml(t.early_warning_level || '—')} &nbsp;|&nbsp;
          BPF: ${t.bpf_hz ? t.bpf_hz.toFixed(0) + ' Hz' : '—'} &nbsp;|&nbsp;
          ${ts}
        </div>
        ${t.recommended_action ? `<div class="threat-action">${escHtml(t.recommended_action.substring(0, 140))}</div>` : ''}
      </div>
      <div class="threat-score-badge score-${tier}">${(t.threat_score || 0).toFixed(3)}</div>
    </div>`;
  }).join('');
}

// ── Camera cue update ──────────────────────────────────────────────────────
function renderCameraCue(drone) {
  const cue     = drone.camera_cue || {};
  const bearing = drone.bearing_deg;
  const priority = cue.priority || 'ROUTINE';

  // Compass rotation
  const needle = $('compassNeedle');
  if (bearing != null && needle) {
    needle.setAttribute('transform', `rotate(${bearing}, 100, 100)`);
    $('compassBearingLabel').textContent = bearing.toFixed(0) + ' \u00b0';
  } else {
    $('compassBearingLabel').textContent = '--- \u00b0';
  }

  // PTZ params
  $('ptzPan').textContent  = cue.pan_deg  != null ? cue.pan_deg.toFixed(1) + '\u00b0'  : '---';
  $('ptzTilt').textContent = cue.tilt_deg != null ? cue.tilt_deg.toFixed(1) + '\u00b0' : '---';
  $('ptzZoom').textContent = cue.zoom_level != null ? '\u00d7' + cue.zoom_level : '---';

  // Priority badge
  const badge = $('camPriorityBadge');
  badge.textContent = priority;
  badge.className   = 'cam-priority-badge ' + (priority === 'IMMEDIATE' || priority === 'ELEVATED' ? priority : '');

  // Action note
  const note = $('camActionNote');
  note.textContent = cue.note || 'Camera in patrol scan mode.';
  note.className   = 'cam-action-note' + (priority === 'IMMEDIATE' ? ' immediate' : '');
}

// ── Timeline chart (pure Canvas 2D) ───────────────────────────────────────
function renderTimeline(timeline) {
  if (!timeline || !timeline.length) return;
  _lastTimeline = timeline;

  const canvas = $('timelineChart');
  const ph     = $('timelinePlaceholder');
  if (!canvas) return;

  // Size canvas to its CSS width
  const W = canvas.offsetWidth || 400;
  const H = 90;
  canvas.width  = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, W, H);

  const n    = timeline.length;
  const step = W / Math.max(n, 1);

  // Threshold reference lines
  const thresholds = [
    { val: 0.65, color: 'rgba(183,28,28,0.25)',  label: '' },
    { val: 0.42, color: 'rgba(192,80,0,0.20)',   label: '' },
    { val: 0.25, color: 'rgba(245,200,66,0.20)', label: '' },
  ];
  thresholds.forEach(({ val, color }) => {
    const y = H - val * H;
    ctx.strokeStyle = color;
    ctx.setLineDash([4, 4]);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, y); ctx.lineTo(W, y);
    ctx.stroke();
  });
  ctx.setLineDash([]);

  // Fill area under curve
  ctx.beginPath();
  ctx.moveTo(0, H);
  timeline.forEach((pt, i) => {
    const x = i * step + step / 2;
    const y = H - Math.min(pt.score, 1) * H;
    i === 0 ? ctx.lineTo(x, y) : ctx.lineTo(x, y);
  });
  ctx.lineTo((n - 1) * step + step / 2, H);
  ctx.closePath();
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0,   'rgba(0,51,128,0.35)');
  grad.addColorStop(1,   'rgba(0,51,128,0.04)');
  ctx.fillStyle = grad;
  ctx.fill();

  // Line
  ctx.beginPath();
  ctx.lineWidth = 1.8;
  timeline.forEach((pt, i) => {
    const x = i * step + step / 2;
    const y = H - Math.min(pt.score, 1) * H;
    const color = pt.score >= 0.65 ? '#B71C1C' : pt.score >= 0.42 ? '#C05000' : pt.score >= 0.25 ? '#7B5800' : '#003380';
    ctx.strokeStyle = color;
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  ctx.stroke();

  // Dots at high points
  timeline.forEach((pt, i) => {
    if (pt.score >= 0.42) {
      const x = i * step + step / 2;
      const y = H - Math.min(pt.score, 1) * H;
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fillStyle = pt.score >= 0.65 ? '#B71C1C' : '#C05000';
      ctx.fill();
    }
  });

  if (ph) ph.style.display = 'none';
}

// ── Classification result ──────────────────────────────────────────────────
function renderClassification(drone) {
  const el    = $('classResult');
  if (!drone || drone.threat_score === undefined) return;

  const cls   = drone.drone_class || 'none';
  const prof  = drone.profile || {};
  const votes = drone.model_votes || {};
  const tier  = drone.threat_tier || 'NONE';
  const label = drone.class_label || (cls === 'none' ? 'No UAV detected' : cls);
  const hi    = drone.class_label_hi || '';
  const frame = prof.frame || '';

  const voteKeys = [
    { key: 'yamnet_aerial',  label: 'YAMNet Aerial' },
    { key: 'panns_aerial',   label: 'PANNs Aerial'  },
    { key: 'physics',        label: 'Physics'        },
    { key: 'profile_match',  label: 'Profile Match'  },
    { key: 'embed_score',    label: 'Embed Score'    },
    { key: 'harmonic_ratio', label: 'Harmonic'       },
  ];

  const voteHtml = voteKeys.map(v => {
    const score = votes[v.key] ?? 0;
    const pct   = Math.round(score * 100);
    const color = score >= 0.65 ? 'var(--crit)' : score >= 0.42 ? 'var(--high)' : 'var(--navy)';
    return `<div class="vote-item">
      <div class="vote-name">${escHtml(v.label)}</div>
      <div class="vote-score" style="color:${color}">${score.toFixed(4)}</div>
      <div class="vote-bar"><div class="vote-fill" style="width:${pct}%; background:${color}"></div></div>
    </div>`;
  }).join('');

  el.innerHTML = `
    <div class="class-result-header">
      <div class="class-label-block">
        <div class="class-name-en">${escHtml(label)}</div>
        ${hi ? `<div class="class-name-hi">${escHtml(hi)}</div>` : ''}
        ${frame ? `<div class="class-frame">Frame type: ${escHtml(frame)}</div>` : ''}
      </div>
      <div class="class-tier-badge tier-${tier}">${tier}</div>
    </div>
    <div class="vote-grid">${voteHtml}</div>
  `;
}

// ── Physics fingerprint ────────────────────────────────────────────────────
function renderPhysics(drone) {
  const grid = $('physicsGrid');
  const phys = drone.physics_detail || drone.signature || {};
  if (!phys || Object.keys(phys).length === 0) return;

  const fields = [
    { key: 'bpf_hz',         label: 'Blade-Pass Freq', unit: 'Hz',  max: 500 },
    { key: 'harmonic_ratio', label: 'Harmonic Ratio',  unit: '',    max: 20  },
    { key: 'tonal_score',    label: 'Tonal Score',     unit: '',    max: 1   },
    { key: 'whine_score',    label: 'Motor Whine',     unit: '',    max: 1   },
    { key: 'f0_stability',   label: 'F0 Stability',    unit: '',    max: 1   },
    { key: 'physics_score',  label: 'Physics Score',   unit: '',    max: 1   },
    { key: 'narrowband',     label: 'Narrowband',      unit: '',    max: 1   },
    { key: 'peak_db',        label: 'Peak (dB)',        unit: 'dB',  max: 0   },
  ];

  grid.innerHTML = fields.map(f => {
    const val  = phys[f.key];
    if (val === undefined || val === null) return '';
    const disp = typeof val === 'number' ? val.toFixed(f.key === 'bpf_hz' ? 1 : 3) : val;
    const pct  = f.max > 0 ? Math.min(100, Math.round(Math.abs(+val) / f.max * 100)) : 0;
    const color = +val >= 0.65 ? 'var(--crit)' : +val >= 0.42 ? 'var(--high)' : 'var(--navy)';
    return `<div class="phys-item">
      <div class="phys-label">${escHtml(f.label)}</div>
      <div class="phys-value">${escHtml(disp)}${f.unit ? ' ' + f.unit : ''}</div>
      ${f.max > 0 ? `<div class="phys-bar"><div class="phys-fill" style="width:${pct}%;background:${color}"></div></div>` : ''}
    </div>`;
  }).join('');
}

// ── Acoustic profiles catalogue ────────────────────────────────────────────
async function loadProfiles() {
  try {
    const data = await fetch('/api/v1/drone/profiles').then(r => r.json());
    renderProfiles(data.profiles || {});
  } catch (e) { console.warn('profiles fetch failed', e); }
}

function renderProfiles(profiles) {
  const tbody = $('profileBody');
  const rows  = Object.entries(profiles);
  if (!rows.length) {
    tbody.innerHTML = '<tr><td colspan="5" class="empty-state">No profiles loaded.</td></tr>';
    return;
  }
  tbody.innerHTML = rows.map(([key, p]) =>
    `<tr>
      <td>
        <div style="font-weight:600;font-size:11px">${escHtml(p.label || key)}</div>
        ${p.hindi ? `<div style="font-family:var(--font-dev);font-size:10px;color:var(--text-muted)">${escHtml(p.hindi)}</div>` : ''}
      </td>
      <td style="font-family:var(--mono);font-size:10px;text-transform:uppercase">${escHtml(p.frame || '—')}</td>
      <td style="font-family:var(--mono);font-size:10px">${p.bpf_lo}–${p.bpf_hi}</td>
      <td style="font-family:var(--mono);font-size:10px">${p.whine_lo}–${p.whine_hi}</td>
      <td><span class="tier-badge-sm tier-sm-${p.threat_tier || 'HIGH'}">${escHtml(p.threat_tier || 'HIGH')}</span></td>
    </tr>`
  ).join('');
}

$('btnLoadProfiles').onclick = loadProfiles;

// ── Track history ──────────────────────────────────────────────────────────
async function loadTracks() {
  const threatOnly = $('chkThreatOnly').checked;
  const url = `/api/v1/drone/tracks?limit=40&threat_only=${threatOnly}`;
  try {
    const data = await fetch(url).then(r => r.json());
    renderTracks(data.tracks || []);
  } catch (e) { console.warn('tracks fetch failed', e); }
}

function renderTracks(tracks) {
  const tbody = $('trackBody');
  if (!tracks.length) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No track records yet.</td></tr>';
    return;
  }
  tbody.innerHTML = tracks.map(t => {
    const ts  = (t.created_at || '').replace('T', ' ').substring(0, 19);
    const ew  = t.early_warning_level || 'NONE';
    const sc  = (t.threat_score || 0).toFixed(3);
    const scColor = +sc >= 0.65 ? 'var(--crit)' : +sc >= 0.42 ? 'var(--high)' : 'var(--navy)';
    const act = (t.recommended_action || '').substring(0, 100);
    return `<tr>
      <td style="font-family:var(--mono);font-size:10px;white-space:nowrap">${escHtml(ts)}</td>
      <td style="font-weight:600;white-space:nowrap">${escHtml(t.post_id || '—')}</td>
      <td>
        <div style="font-size:11px;font-weight:600">${escHtml(t.class_label || t.drone_class || '—')}</div>
        ${t.class_label_hi ? `<div style="font-family:var(--font-dev);font-size:10px;color:var(--text-muted)">${escHtml(t.class_label_hi)}</div>` : ''}
      </td>
      <td style="font-family:var(--mono);font-size:11px;font-weight:700;color:${scColor}">${sc}</td>
      <td><span class="ew-badge-sm ew-sm-${ew}">${ew}</span></td>
      <td style="font-size:10px;color:var(--text-muted)">${escHtml(act)}</td>
    </tr>`;
  }).join('');
}

$('chkThreatOnly').onchange = loadTracks;
$('btnRefreshTracks').onclick  = loadTracks;
$('btnRefreshThreats').onclick = () => { loadThreats(); };

// ── WebSocket ──────────────────────────────────────────────────────────────
function connectWs() {
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  const ws    = new WebSocket(proto + '://' + location.host + '/ws/ops');

  ws.onmessage = (ev) => {
    try {
      const msg = JSON.parse(ev.data);
      if (msg.type === 'drone_update') {
        _lastDroneData = msg;
        handleDroneUpdate(msg);
      } else if (msg.type === 'analysis') {
        // Also refresh track list when a new analysis arrives
        loadTracks();
      } else if (msg.type === 'hello') {
        // refresh pills
        loadHealth();
      }
    } catch (_) {}
  };

  ws.onclose = () => setTimeout(connectWs, 4000);
  ws.onerror = () => ws.close();
}

function handleDroneUpdate(msg) {
  // Build a synthetic drone object from the WS message
  const drone = {
    threat:              msg.threat,
    threat_score:        msg.threat_score,
    drone_class:         msg.drone_class,
    class_label:         msg.class_label,
    early_warning_level: msg.early_warning_level,
    bearing_deg:         msg.bearing_deg,
    camera_cue:          msg.camera_cue || {},
    model_votes:         msg.model_votes || {},
    recommended_action:  msg.recommended_action,
    timeline:            msg.timeline || [],
    threat_tier:         tierFromScore(msg.threat_score),
    profile:             {},
    physics_detail:      {},
  };

  renderCameraCue(drone);
  renderClassification(drone);
  if (drone.timeline?.length) renderTimeline(drone.timeline);

  // Refresh status panels
  loadDroneStatus();
  loadTracks();
}

// ── Helpers ────────────────────────────────────────────────────────────────
function tierFromScore(score) {
  if (!score) return 'LOW';
  if (score >= 0.65) return 'CRITICAL';
  if (score >= 0.42) return 'HIGH';
  if (score >= 0.25) return 'MEDIUM';
  return 'LOW';
}

// ── Init ───────────────────────────────────────────────────────────────────
boot().catch(err => console.error('Boot error:', err));


// ═══════════════════════════════════════════════════════════════════════════
// Camera & YOLO Visual Detection
// ═══════════════════════════════════════════════════════════════════════════

let _activeSources = [];       // [{source_id, label, is_ip}]
let _activeSourceId = null;    // currently displayed source
let _camPollTimer   = null;
let _camWs          = null;

// ── Source management ──────────────────────────────────────────────────────
async function addWebcam(index = 0) {
  try {
    const r = await fetch('/api/v1/camera/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ index, label: `Webcam ${index}` }),
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || r.status);
    _activeSources = d.sources || [];
    const added = _activeSources.find(s => s.source_id.startsWith('webcam'));
    if (added) switchToSource(added.source_id);
    renderSourceList();
  } catch (e) {
    console.error('addWebcam failed:', e);
    setCamStatus('ERROR: ' + e.message, 'error');
  }
}

async function addIpCamera() {
  const url = $('ipCamUrl').value.trim();
  if (!url) { alert('Enter a camera URL first.'); return; }
  try {
    const r = await fetch('/api/v1/camera/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, label: 'IP Camera' }),
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || r.status);
    _activeSources = d.sources || [];
    const added = _activeSources.find(s => s.is_ip);
    if (added) switchToSource(added.source_id);
    renderSourceList();
  } catch (e) {
    console.error('addIpCam failed:', e);
    setCamStatus('IP CAM ERROR: ' + e.message, 'error');
  }
}

async function removeSource(sourceId) {
  await fetch(`/api/v1/camera/${sourceId}`, { method: 'DELETE' });
  if (_activeSourceId === sourceId) {
    _activeSourceId = null;
    stopCamFeed();
  }
  const r = await fetch('/api/v1/camera/sources').then(x => x.json());
  _activeSources = r.sources || [];
  renderSourceList();
}

function renderSourceList() {
  const el = $('camSourceList');
  if (!_activeSources.length) {
    el.style.display = 'none';
    return;
  }
  el.style.display = 'flex';
  el.innerHTML = _activeSources.map(s => {
    const stateClass = !s.running ? 'error' : s.visual_score > 0.42 ? 'active' : 'active';
    const label = escHtml(s.label || s.source_id);
    const fps   = s.fps ? `${s.fps} fps` : '';
    return `<span class="cam-source-chip ${stateClass}" data-id="${s.source_id}" onclick="switchToSource('${s.source_id}')">
      <span class="cam-chip-dot"></span>
      ${label} ${fps}
      <span class="cam-chip-remove" onclick="event.stopPropagation();removeSource('${s.source_id}')">&times;</span>
    </span>`;
  }).join('');
}

// ── Feed display ───────────────────────────────────────────────────────────
function switchToSource(sourceId) {
  _activeSourceId = sourceId;

  // Stop previous WS
  if (_camWs) { _camWs.close(); _camWs = null; }
  clearInterval(_camPollTimer);

  // Show MJPEG stream via <img src=...>
  const img = $('camFeedImg');
  const ph  = $('camFeedPlaceholder');
  const bar = $('camOverlayBar');

  img.src = `/api/v1/camera/stream/${sourceId}?t=${Date.now()}`;
  img.style.display = 'block';
  ph.style.display  = 'none';
  bar.style.display = 'flex';
  $('btnStopCam').disabled = false;

  setCamStatus('LIVE', 'live');

  // Open per-camera WebSocket for detections + fused score
  connectCamWs(sourceId);

  // Fallback polling for fused score
  _camPollTimer = setInterval(() => pollFusedThreat(sourceId), 2000);
}

function stopCamFeed() {
  if (_camWs)       { _camWs.close(); _camWs = null; }
  clearInterval(_camPollTimer);
  const img = $('camFeedImg');
  img.src = '';
  img.style.display = 'none';
  $('camFeedPlaceholder').style.display = 'flex';
  $('camOverlayBar').style.display      = 'none';
  $('camDetList').innerHTML              = '';
  $('btnStopCam').disabled               = true;
  setCamStatus('NO CAMERA', '');
}

// ── Camera WebSocket ───────────────────────────────────────────────────────
function connectCamWs(sourceId) {
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  _camWs = new WebSocket(`${proto}://${location.host}/ws/camera/${sourceId}`);

  _camWs.onmessage = (ev) => {
    try {
      const msg = JSON.parse(ev.data);
      if (msg.type === 'camera_frame') {
        renderDetections(msg.detections || [], msg.visual_score || 0);
        $('camVisualScore').textContent = (msg.visual_score || 0).toFixed(3);
        $('camDetCount').textContent    = (msg.detections || []).length;
        // Update status pill colour
        if (msg.visual_score > 0.42) setCamStatus('DRONE THREAT', 'threat');
        else if (msg.visual_score > 0.20) setCamStatus('WATCH', 'warning');
        else setCamStatus('LIVE', 'live');
      }
    } catch (_) {}
  };
  _camWs.onclose = () => { if (_activeSourceId === sourceId) setTimeout(() => connectCamWs(sourceId), 3000); };
  _camWs.onerror = () => _camWs.close();
}

// ── Fused threat polling ───────────────────────────────────────────────────
async function pollFusedThreat(sourceId) {
  try {
    const d = await fetch(`/api/v1/camera/fused-threat/${sourceId}`).then(r => r.json());
    $('camFusedScore').textContent   = (d.fused_score || 0).toFixed(3);
    const dvEl = $('camDroneVisible');
    dvEl.textContent  = d.drone_visible ? 'YES' : 'NO';
    dvEl.className    = 'cam-overlay-val' + (d.drone_visible ? ' threat' : '');
    const fsEl = $('camFusedScore');
    fsEl.className = 'cam-overlay-val' + (d.fused_score >= 0.42 ? ' threat' : d.fused_score >= 0.25 ? ' alert' : '');
  } catch (_) {}
}

// ── Detection chips ────────────────────────────────────────────────────────
function renderDetections(dets, visualScore) {
  const el = $('camDetList');
  if (!dets.length) { el.innerHTML = ''; return; }
  el.innerHTML = dets.slice(0, 8).map(d => {
    const cls = d.drone_candidate ? 'det-drone'
              : d.label === 'airplane' ? 'det-airplane'
              : d.label === 'bird'     ? 'det-bird'
              : 'det-other';
    return `<span class="cam-det-chip ${cls}">
      ${escHtml(d.label)}
      <span class="det-conf">${(d.conf * 100).toFixed(0)}%</span>
    </span>`;
  }).join('');
}

function setCamStatus(text, cls) {
  const pill = $('camStatusPill');
  if (!pill) return;
  pill.textContent = text;
  pill.className   = 'cam-status-pill' + (cls ? ' ' + cls : '');
}

// ── Button bindings ────────────────────────────────────────────────────────
$('btnAddWebcam').onclick = () => addWebcam(0);
$('btnStopCam').onclick   = () => {
  if (_activeSourceId) removeSource(_activeSourceId);
  else stopCamFeed();
};
$('btnAddIpCam').onclick  = addIpCamera;

// Allow Enter key in IP URL field
$('ipCamUrl').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') addIpCamera();
});

// ── Load existing sources on boot ─────────────────────────────────────────
async function loadCameraSources() {
  try {
    const r = await fetch('/api/v1/camera/sources').then(x => x.json());
    _activeSources = r.sources || [];
    renderSourceList();
    // Auto-attach to first running source if present
    const running = _activeSources.find(s => s.running);
    if (running) switchToSource(running.source_id);
  } catch (_) {}
}

// Inject into boot
const _origBoot = boot;
// Re-export augmented boot
(async () => {
  // loadCameraSources is called after the main boot completes
  loadCameraSources();
})();
