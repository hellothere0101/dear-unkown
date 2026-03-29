import '../css/signal-translator.css';
import { state } from './state.js';
import { detectLang, textToFeatures, generateWave, generateRadarDots } from './signal-engine.js';
import { createRadarDrawer } from './radar-renderer.js';
import { createOscilloDrawer } from './oscillo-renderer.js';
import { getBgCropMetrics, getRatioDims, renderPosterToCanvas } from './poster.js';

function $(id) {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing #${id}`);
  return el;
}

/** HUD에서 숨긴 경우 없을 수 있음 — 없으면 방문 카운터만 생략 */
function $optional(id) {
  return document.getElementById(id);
}

const COUNTER_TYPES = {
  visits: 'visits',
  images: 'images',
};
const SESSION_VISIT_KEY = 'hailmary_visit_counted';

function formatCounter(value) {
  return String(value).padStart(3, '0');
}

function getLocalCounter(key) {
  return Number(localStorage.getItem(`counter_${key}`) || '0');
}

function setLocalCounter(key, value) {
  localStorage.setItem(`counter_${key}`, String(value));
}

async function incrementRemoteCounter(key) {
  const endpoint = `/api/counter?action=hit&counter=${encodeURIComponent(key)}`;
  const res = await fetch(endpoint);
  if (!res.ok) throw new Error(`Counter fetch failed: ${res.status}`);
  const data = await res.json();
  return Number(data.value || 0);
}

async function getRemoteCounter(key) {
  const endpoint = `/api/counter?action=get&counter=${encodeURIComponent(key)}`;
  const res = await fetch(endpoint);
  if (!res.ok) throw new Error(`Counter get failed: ${res.status}`);
  const data = await res.json();
  return Number(data.value || 0);
}

async function updateCounterText(el, key, shouldIncrement) {
  if (!el) return;
  try {
    let count;
    if (shouldIncrement) {
      count = await incrementRemoteCounter(key);
      setLocalCounter(key, count);
    } else {
      count = await getRemoteCounter(key);
      setLocalCounter(key, count);
    }
    el.textContent = formatCounter(count);
  } catch (_err) {
    const current = getLocalCounter(key);
    const next = shouldIncrement ? current + 1 : current;
    if (shouldIncrement) setLocalCounter(key, next);
    el.textContent = formatCounter(next);
  }
}

function doTranslate(els) {
  const text = els.textInput.value.trim();
  if (!text) return;
  state.currentText = text;
  state.currentLang = detectLang(text);
  els.langBadge.textContent = 'AUTO: ' + state.currentLang.toUpperCase();
  els.statusText.textContent = 'TRANSLATING...';
  els.signalText.textContent = 'DETECTED';
  els.charCount.textContent = String(text.length);
  state.features = textToFeatures(text, state.currentLang);
  state.waveData = generateWave(state.features, 512, state.currentLang);
  state.radarDots = generateRadarDots(state.features);
  const dom = state.features.reduce((a, b) => (a.freq > b.freq ? a : b), { freq: 0 });
  els.phonemeCount.textContent = String(state.features.length);
  els.freqText.textContent = Math.round(dom.freq) + ' Hz';
  els.ampDisplay.textContent =
    'AMP: ' + (state.features.reduce((s, f) => s + f.amp, 0) / state.features.length).toFixed(2);
  els.exportBtn.disabled = false;
  setTimeout(() => {
    els.statusText.textContent = 'SIGNAL LOCKED';
    els.signalText.textContent = 'COMPLETE';
  }, 700);
}

function openModal(els) {
  if (!state.waveData.length) return;
  renderPosterToCanvas(els.previewCanvas);
  els.modalOverlay.style.display = 'flex';
}

function closeModal(els) {
  els.modalOverlay.style.display = 'none';
}

function updateWaveControlLabels(els) {
  els.waveAmpValue.textContent = state.posterWaveAmplitude.toFixed(2);
}

function updatePosterControlLabels(els) {
  els.accentColorHex.value = state.posterAccentColor.toUpperCase();
  els.subColorHex.value = state.posterSubColor.toUpperCase();
  els.accentColorChip.style.backgroundColor = state.posterAccentColor;
  els.subColorChip.style.backgroundColor = state.posterSubColor;
}

function handleWaveControlChange(els) {
  state.posterWaveAmplitude = Number(els.waveAmp.value);
  updateWaveControlLabels(els);
  renderPosterToCanvas(els.previewCanvas);
}

function handlePosterStyleControlChange(els) {
  state.posterAccentColor = els.accentColor.value;
  state.posterSubColor = els.subColor.value;
  updatePosterControlLabels(els);
  renderPosterToCanvas(els.previewCanvas);
}

function normalizeHexColor(value) {
  const raw = String(value || '').trim().toUpperCase();
  const withHash = raw.startsWith('#') ? raw : `#${raw}`;
  if (/^#[0-9A-F]{6}$/.test(withHash)) return withHash;
  return null;
}

function bindHexColorInput(colorInput, hexInput, apply) {
  const commitHexInput = () => {
    const normalized = normalizeHexColor(hexInput.value);
    if (!normalized) {
      hexInput.value = colorInput.value.toUpperCase();
      return;
    }
    colorInput.value = normalized;
    hexInput.value = normalized;
    apply();
  };

  hexInput.addEventListener('change', commitHexInput);
  hexInput.addEventListener('blur', commitHexInput);
}

function bindColorWheel(els) {
  const iroFactory = window.iro;
  if (!iroFactory || !iroFactory.ColorPicker) return;

  let activeKey = 'accent';
  let isWheelOpen = false;
  const activeClass = 'active';
  const wheelSize = window.matchMedia('(max-width: 520px)').matches ? 230 : 180;
  const picker = new iroFactory.ColorPicker('#colorWheelPicker', {
    width: wheelSize,
    color: state.posterAccentColor,
    borderWidth: 1,
    borderColor: '#4e2b0a',
    layout: [
      { component: iroFactory.ui.Wheel },
      { component: iroFactory.ui.Slider, options: { sliderType: 'value' } },
    ],
  });

  const setActiveTarget = (key) => {
    activeKey = key;
    const isAccent = key === 'accent';
    els.accentColorTarget.classList.toggle(activeClass, isAccent);
    els.subColorTarget.classList.toggle(activeClass, !isAccent);
    els.accentColorTarget.setAttribute('aria-pressed', String(isAccent));
    els.subColorTarget.setAttribute('aria-pressed', String(!isAccent));
    picker.color.set(isAccent ? state.posterAccentColor : state.posterSubColor);
  };

  const setWheelOpen = (open) => {
    isWheelOpen = open;
    els.colorWheelWrap.classList.toggle('hidden', !open);
  };

  const applyPickedColor = (hex) => {
    if (activeKey === 'accent') {
      els.accentColor.value = hex;
      state.posterAccentColor = hex;
    } else {
      els.subColor.value = hex;
      state.posterSubColor = hex;
    }
    updatePosterControlLabels(els);
    renderPosterToCanvas(els.previewCanvas);
  };

  picker.on('color:change', (color) => {
    applyPickedColor(color.hexString.toUpperCase());
  });

  const toggleTarget = (key) => {
    if (isWheelOpen && activeKey === key) {
      setWheelOpen(false);
      return;
    }
    setActiveTarget(key);
    setWheelOpen(true);
  };

  els.accentColorTarget.addEventListener('click', () => toggleTarget('accent'));
  els.subColorTarget.addEventListener('click', () => toggleTarget('sub'));

  const syncWheelFromHex = () => {
    picker.color.set(activeKey === 'accent' ? state.posterAccentColor : state.posterSubColor);
  };
  els.accentColorHex.addEventListener('blur', syncWheelFromHex);
  els.subColorHex.addEventListener('blur', syncWheelFromHex);

  setActiveTarget('accent');
  setWheelOpen(false);
}

function bindPreviewBgDrag(els) {
  let dragging = false;
  let startX = 0;
  let startY = 0;
  let startOffsetX = 0;
  let startOffsetY = 0;

  const onMove = (clientX, clientY) => {
    if (!dragging || !state.bgImage) return;
    const rect = els.previewCanvas.getBoundingClientRect();
    const [PW, PH] = getRatioDims();
    const { maxDx, maxDy } = getBgCropMetrics(state.bgImage, PW, PH, state.posterBgScale);
    const dxCanvas = ((clientX - startX) / rect.width) * PW;
    const dyCanvas = ((clientY - startY) / rect.height) * PH;
    const nextX = maxDx > 0 ? startOffsetX - (dxCanvas / maxDx) * 100 : 0;
    const nextY = maxDy > 0 ? startOffsetY - (dyCanvas / maxDy) * 100 : 0;
    state.posterBgOffsetX = Math.max(-100, Math.min(100, nextX));
    state.posterBgOffsetY = Math.max(-100, Math.min(100, nextY));
    renderPosterToCanvas(els.previewCanvas);
  };

  const endDrag = () => {
    if (!dragging) return;
    dragging = false;
    els.previewCanvas.classList.remove('dragging');
  };

  els.previewCanvas.addEventListener('pointerdown', (e) => {
    if (!state.bgImage) return;
    dragging = true;
    startX = e.clientX;
    startY = e.clientY;
    startOffsetX = state.posterBgOffsetX;
    startOffsetY = state.posterBgOffsetY;
    els.previewCanvas.classList.add('dragging');
    els.previewCanvas.setPointerCapture(e.pointerId);
  });
  els.previewCanvas.addEventListener('pointermove', (e) => onMove(e.clientX, e.clientY));
  els.previewCanvas.addEventListener('pointerup', endDrag);
  els.previewCanvas.addEventListener('pointercancel', endDrag);
  els.previewCanvas.addEventListener('lostpointercapture', endDrag);
  els.previewCanvas.addEventListener(
    'wheel',
    (e) => {
      if (!state.bgImage) return;
      e.preventDefault();
      const direction = e.deltaY > 0 ? -1 : 1;
      const nextScale = state.posterBgScale + direction * 0.05;
      state.posterBgScale = Math.max(1, Math.min(3, nextScale));
      renderPosterToCanvas(els.previewCanvas);
    },
    { passive: false }
  );
}

function setRatio(els, r, btn) {
  state.currentRatio = r;
  els.ratioBtns.forEach((b) => b.classList.remove('active'));
  btn.classList.add('active');
  renderPosterToCanvas(els.previewCanvas);
}

function handleBgUpload(els, e) {
  const file = e.target.files?.[0];
  if (!file) return;
  els.uploadText.textContent = file.name;
  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    img.onload = () => {
      state.bgImage = img;
      renderPosterToCanvas(els.previewCanvas);
    };
    img.src = typeof reader.result === 'string' ? reader.result : '';
  };
  reader.readAsDataURL(file);
}

function downloadPoster(els) {
  const pc = document.createElement('canvas');
  renderPosterToCanvas(pc);
  const link = document.createElement('a');
  link.download = `signal_${state.currentText.slice(0, 12).replace(/\s/g, '_')}.png`;
  link.href = pc.toDataURL('image/png');
  link.click();
  void updateCounterText(els.imageCountText, COUNTER_TYPES.images, true);
}

function initCounters(els) {
  const hasCountedVisit = sessionStorage.getItem(SESSION_VISIT_KEY) === '1';
  if (els.visitCountText) {
    void updateCounterText(els.visitCountText, COUNTER_TYPES.visits, !hasCountedVisit);
    if (!hasCountedVisit) sessionStorage.setItem(SESSION_VISIT_KEY, '1');
  }
  void updateCounterText(els.imageCountText, COUNTER_TYPES.images, false);
}

function init() {
  const radarCanvas = /** @type {HTMLCanvasElement} */ ($('radarCanvas'));
  const oscilloCanvas = /** @type {HTMLCanvasElement} */ ($('oscilloCanvas'));
  const previewCanvas = /** @type {HTMLCanvasElement} */ ($('previewCanvas'));

  const els = {
    textInput: /** @type {HTMLInputElement} */ ($('textInput')),
    transmitBtn: $('transmitBtn'),
    statusText: $('statusText'),
    freqText: $('freqText'),
    signalText: $('signalText'),
    charCount: $('charCount'),
    phonemeCount: $('phonemeCount'),
    langBadge: $('langBadge'),
    ampDisplay: $('ampDisplay'),
    exportBtn: /** @type {HTMLButtonElement} */ ($('exportBtn')),
    modalOverlay: /** @type {HTMLElement} */ ($('modalOverlay')),
    previewCanvas,
    uploadText: $('uploadText'),
    bgUpload: /** @type {HTMLInputElement} */ ($('bgUpload')),
    ratioBtns: /** @type {NodeListOf<HTMLButtonElement>} */ (document.querySelectorAll('.ratio-btn')),
    accentColor: /** @type {HTMLInputElement} */ ($('accentColor')),
    accentColorTarget: $('accentColorTarget'),
    accentColorChip: $('accentColorChip'),
    accentColorHex: /** @type {HTMLInputElement} */ ($('accentColorHex')),
    subColor: /** @type {HTMLInputElement} */ ($('subColor')),
    subColorTarget: $('subColorTarget'),
    subColorChip: $('subColorChip'),
    subColorHex: /** @type {HTMLInputElement} */ ($('subColorHex')),
    colorWheelWrap: $('colorWheelWrap'),
    waveAmp: /** @type {HTMLInputElement} */ ($('waveAmp')),
    waveAmpValue: $('waveAmpValue'),
    visitCountText: /** @type {HTMLElement|null} */ ($optional('visitCountText')),
    imageCountText: $('imageCountText'),
  };

  const drawRadar = createRadarDrawer(radarCanvas, () => state.radarDots);
  const drawOscillo = createOscilloDrawer(oscilloCanvas, () => state.waveData);

  function loop(t) {
    drawRadar(t);
    drawOscillo(t);
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  els.transmitBtn.addEventListener('click', () => doTranslate(els));
  els.textInput.addEventListener('input', function () {
    els.charCount.textContent = String(this.value.length);
  });
  els.textInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') doTranslate(els);
  });

  els.exportBtn.addEventListener('click', () => openModal(els));
  els.modalOverlay.addEventListener('click', (e) => {
    if (e.target === els.modalOverlay) closeModal(els);
  });
  $('modalCloseBtn').addEventListener('click', () => closeModal(els));
  $('modalCancelBtn').addEventListener('click', () => closeModal(els));
  $('modalDownloadBtn').addEventListener('click', () => downloadPoster(els));

  els.ratioBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const r = /** @type {'3:4'|'9:16'|'1:1'} */ (btn.dataset.ratio);
      if (r) setRatio(els, r, btn);
    });
  });
  els.bgUpload.addEventListener('change', (e) => handleBgUpload(els, e));

  els.waveAmp.value = String(state.posterWaveAmplitude);
  updateWaveControlLabels(els);
  els.waveAmp.addEventListener('input', () => handleWaveControlChange(els));

  els.accentColor.value = state.posterAccentColor;
  els.subColor.value = state.posterSubColor;
  updatePosterControlLabels(els);
  bindHexColorInput(els.accentColor, els.accentColorHex, () => handlePosterStyleControlChange(els));
  bindHexColorInput(els.subColor, els.subColorHex, () => handlePosterStyleControlChange(els));
  bindColorWheel(els);
  bindPreviewBgDrag(els);
  initCounters(els);
}

init();
