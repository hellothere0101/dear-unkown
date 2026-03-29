import { O, C } from './constants.js';

/**
 * @param {HTMLCanvasElement} canvas
 * @param {() => Float32Array} getWaveData
 */
export function createOscilloDrawer(canvas, getWaveData) {
  const oX = canvas.getContext('2d');
  if (!oX) throw new Error('2d context unavailable');

  return function drawOscillo(t) {
    const w = canvas.width;
    const h = canvas.height;
    const cy = h / 2;
    const waveData = getWaveData();

    oX.clearRect(0, 0, w, h);
    oX.strokeStyle = O(0.07);
    oX.lineWidth = 0.5;
    oX.beginPath();
    oX.moveTo(0, cy);
    oX.lineTo(w, cy);
    oX.stroke();
    [0.25, 0.75].forEach((yf) => {
      oX.beginPath();
      oX.moveTo(0, h * yf);
      oX.lineTo(w, h * yf);
      oX.stroke();
    });
    if (!waveData.length) {
      oX.beginPath();
      for (let x = 0; x < w; x++) {
        const v = Math.sin((x / w) * Math.PI * 2 + t * 0.008) * 0.04;
        if (x === 0) oX.moveTo(x, cy + v * cy);
        else oX.lineTo(x, cy + v * cy);
      }
      oX.strokeStyle = O(0.18);
      oX.lineWidth = 1;
      oX.stroke();
      return;
    }
    const shift = (t * 0.12) % waveData.length;
    oX.beginPath();
    for (let x = 0; x < w; x++) {
      const idx = Math.floor((x / w) * waveData.length + shift) % waveData.length;
      if (x === 0) oX.moveTo(x, cy - waveData[idx] * cy * 0.83);
      else oX.lineTo(x, cy - waveData[idx] * cy * 0.83);
    }
    oX.strokeStyle = C;
    oX.lineWidth = 1.5;
    oX.stroke();
    oX.beginPath();
    for (let x = 0; x < w; x++) {
      const idx = Math.floor((x / w) * waveData.length + shift * 0.6 + 30) % waveData.length;
      if (x === 0) oX.moveTo(x, cy - waveData[idx] * cy * 0.5);
      else oX.lineTo(x, cy - waveData[idx] * cy * 0.5);
    }
    oX.strokeStyle = O(0.18);
    oX.lineWidth = 0.5;
    oX.stroke();
  };
}
