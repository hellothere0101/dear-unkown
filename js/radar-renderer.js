import { O, C } from './constants.js';

/**
 * @param {HTMLCanvasElement} canvas
 * @param {() => Array<{angle:number,r:number,amp:number,label:string}>} getRadarDots
 */
export function createRadarDrawer(canvas, getRadarDots) {
  const rX = canvas.getContext('2d');
  if (!rX) throw new Error('2d context unavailable');

  return function drawRadar(t) {
    const w = canvas.width;
    const h = canvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const R = Math.min(w, h) * 0.42;
    const radarDots = getRadarDots();

    rX.clearRect(0, 0, w, h);
    [0.33, 0.66, 1].forEach((s) => {
      rX.beginPath();
      rX.arc(cx, cy, R * s, 0, Math.PI * 2);
      rX.strokeStyle = O(0.1 + s * 0.05);
      rX.lineWidth = 0.5;
      rX.stroke();
    });
    rX.strokeStyle = O(0.07);
    rX.lineWidth = 0.5;
    [0, 1, 2, 3].forEach((i) => {
      const a = (i * Math.PI) / 2;
      rX.beginPath();
      rX.moveTo(cx, cy);
      rX.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R);
      rX.stroke();
    });
    const sa = (t * 0.0008) % (Math.PI * 2);
    rX.beginPath();
    rX.moveTo(cx, cy);
    rX.arc(cx, cy, R, sa, sa + 0.9);
    rX.closePath();
    rX.fillStyle = O(0.06);
    rX.fill();
    rX.beginPath();
    rX.moveTo(cx, cy);
    rX.lineTo(cx + Math.cos(sa) * R, cy + Math.sin(sa) * R);
    rX.strokeStyle = O(0.7);
    rX.lineWidth = 1;
    rX.stroke();
    radarDots.forEach((d) => {
      const x = cx + Math.cos(d.angle) * d.r * R;
      const y = cy + Math.sin(d.angle) * d.r * R;
      const diff = (((d.angle - sa) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
      const fade = diff < 1.6 ? 1 - diff / 1.6 : 0.07;
      rX.beginPath();
      rX.arc(x, y, 1.5 + d.amp * 2, 0, Math.PI * 2);
      rX.fillStyle = O(fade * 0.9 + 0.1);
      rX.fill();
      rX.font = 'bold 9px Courier New';
      rX.fillStyle = O(Math.min(1, fade * 1.3 + 0.2));
      rX.textAlign = 'center';
      rX.fillText(d.label, x, y - 8);
    });
    rX.beginPath();
    rX.arc(cx, cy, 3, 0, Math.PI * 2);
    rX.fillStyle = C;
    rX.fill();
  };
}
