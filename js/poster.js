import { state } from './state.js';

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function hexToRgb(hex) {
  const clean = hex.replace('#', '').trim();
  if (!/^[\da-fA-F]{6}$/.test(clean)) return { r: 255, g: 140, b: 42 };
  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16),
  };
}

function rgba(rgb, alpha) {
  return `rgba(${rgb.r},${rgb.g},${rgb.b},${alpha})`;
}

function getBaseCropSize(img, PW, PH) {
  const imgAR = img.naturalWidth / img.naturalHeight;
  const canAR = PW / PH;
  if (imgAR > canAR) {
    const sh = img.naturalHeight;
    const sw = Math.round(sh * canAR);
    return { sw, sh };
  }
  const sw = img.naturalWidth;
  const sh = Math.round(sw / canAR);
  return { sw, sh };
}

export function getRatioDims() {
  const BASE = 600;
  if (state.currentRatio === '3:4') return [BASE, Math.round((BASE * 4) / 3)];
  if (state.currentRatio === '9:16') return [BASE, Math.round((BASE * 16) / 9)];
  return [BASE, BASE];
}

/** center-crop + transform: fill PW×PH from img without stretching */
export function drawBgCrop(px, img, PW, PH, scale = 1, offsetXPct = 0, offsetYPct = 0) {
  const zoom = clamp(scale, 1, 3);
  let { sw, sh } = getBaseCropSize(img, PW, PH);
  sw = Math.round(sw / zoom);
  sh = Math.round(sh / zoom);
  const centerSx = Math.round((img.naturalWidth - sw) / 2);
  const centerSy = Math.round((img.naturalHeight - sh) / 2);
  const maxDx = Math.max(0, Math.round((img.naturalWidth - sw) / 2));
  const maxDy = Math.max(0, Math.round((img.naturalHeight - sh) / 2));
  const sx = clamp(centerSx + Math.round((clamp(offsetXPct, -100, 100) / 100) * maxDx), 0, img.naturalWidth - sw);
  const sy = clamp(centerSy + Math.round((clamp(offsetYPct, -100, 100) / 100) * maxDy), 0, img.naturalHeight - sh);
  px.drawImage(img, sx, sy, sw, sh, 0, 0, PW, PH);
}

export function getBgCropMetrics(img, PW, PH, scale = 1) {
  const zoom = clamp(scale, 1, 3);
  const base = getBaseCropSize(img, PW, PH);
  const sw = Math.round(base.sw / zoom);
  const sh = Math.round(base.sh / zoom);
  const maxDx = Math.max(0, Math.round((img.naturalWidth - sw) / 2));
  const maxDy = Math.max(0, Math.round((img.naturalHeight - sh) / 2));
  return { sw, sh, maxDx, maxDy };
}

export function renderPosterToCanvas(canvas) {
  const [PW, PH] = getRatioDims();
  canvas.width = PW;
  canvas.height = PH;
  const px = canvas.getContext('2d');
  if (!px) return;
  const accentRgb = hexToRgb(state.posterAccentColor);
  const subRgb = hexToRgb(state.posterSubColor);
  const accentStrong = rgba(accentRgb, 0.8);
  const accentMain = rgba(accentRgb, 0.65);
  const accentSoft = rgba(accentRgb, 0.5);
  const accentFaint = rgba(accentRgb, 0.32);
  const accentGrid = rgba(accentRgb, 0.055);
  const accentLine = rgba(accentRgb, 0.12);
  const subStrong = rgba(subRgb, 0.93);

  if (state.bgImage) {
    drawBgCrop(px, state.bgImage, PW, PH, state.posterBgScale, state.posterBgOffsetX, state.posterBgOffsetY);
    px.fillStyle = 'rgba(0,0,0,0.50)';
    px.fillRect(0, 0, PW, PH);
  } else {
    px.fillStyle = '#080400';
    px.fillRect(0, 0, PW, PH);
    px.strokeStyle = accentGrid;
    px.lineWidth = 1;
    for (let x = 0; x < PW; x += 40) {
      px.beginPath();
      px.moveTo(x, 0);
      px.lineTo(x, PH);
      px.stroke();
    }
    for (let y = 0; y < PH; y += 40) {
      px.beginPath();
      px.moveTo(0, y);
      px.lineTo(PW, y);
      px.stroke();
    }
  }

  const PAD = PW * 0.1;

  const fs1 = Math.round(PW * 0.018);
  px.font = `${fs1}px 'Courier New',monospace`;
  px.fillStyle = accentSoft;
  px.textAlign = 'left';
  px.fillText('HAIL MARY PROJECT', PAD, PH * 0.06);
  const fs2 = Math.round(PW * 0.03);
  px.font = `${fs2}px 'Courier New',monospace`;
  px.fillStyle = rgba(subRgb, 0.8);
  px.fillText('DEAR UNKOWN.', PAD, PH * 0.06 + fs2 * 1.3);

  const WH = PH * 0.1;
  const WY = PH / 2 - WH / 2 - PH * 0.06;
  const waveSidePad = PAD * 2;
  const WX1 = waveSidePad;
  const WX2 = PW - waveSidePad;
  const ww = WX2 - WX1;
  const wcy = WY + WH / 2;
  px.strokeStyle = accentLine;
  px.lineWidth = 0.5;
  px.beginPath();
  px.moveTo(WX1, wcy);
  px.lineTo(WX2, wcy);
  px.stroke();
  if (state.waveData.length) {
    [
      [7, 0.04],
      [3.5, 0.15],
      [1.5, 0.92],
    ].forEach(([lw, alpha]) => {
      px.beginPath();
      for (let x = 0; x < ww; x++) {
        const idx = Math.floor((x / ww) * state.waveData.length) % state.waveData.length;
        const y = wcy - state.waveData[idx] * WH * 0.44 * state.posterWaveAmplitude;
        if (x === 0) px.moveTo(WX1 + x, y);
        else px.lineTo(WX1 + x, y);
      }
      px.strokeStyle = rgba(accentRgb, alpha);
      px.lineWidth = lw;
      px.stroke();
    });
  }

  const TY = wcy + WH / 2 + PH * 0.06;
  const maxW = PW - PAD * 2.2;
  const fontFamily = state.currentLang === 'ko' ? "'Orbit','Courier New',monospace" : "'Courier New',monospace";
  let fs = Math.round(PW * 0.04);
  px.font = `${fs}px ${fontFamily}`;
  while (px.measureText(`"${state.currentText}"`).width > maxW && fs > 13) {
    fs -= 2;
    px.font = `${fs}px ${fontFamily}`;
  }
  px.fillStyle = subStrong;
  px.textAlign = 'center';
  px.fillText(`"${state.currentText}"`, PW / 2, TY + fs);

  const BY = PH - PH * 0.06;
  const now = new Date();
  const dateTimeText = new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(now);
  px.font = `${Math.round(PW * 0.025)}px 'Courier New',monospace`;
  px.fillStyle = accentMain;
  px.textAlign = 'left';
  px.fillText('DATA FROM', PAD, BY);
  px.font = `${Math.round(PW * 0.025)}px 'Courier New',monospace`;
  px.fillStyle = accentFaint;
  px.fillText(dateTimeText, PAD, BY + Math.round(PW * 0.028));
}
