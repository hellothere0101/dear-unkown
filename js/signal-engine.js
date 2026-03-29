import { LABELS } from './constants.js';

/* ── LANG DETECT ── */
export function detectLang(t) {
  const ko = (t.match(/[\uAC00-\uD7A3]/g) || []).length;
  const en = (t.match(/[a-zA-Z]/g) || []).length;
  return ko >= en ? 'ko' : 'en';
}

/* ── PHONEME ENGINE ── */
const EN_P = {
  fricatives: { chars: 'sfzv', freqBase: 600, freqRange: 300, shape: 'noise', amp: 0.55 },
  plosives: { chars: 'pbtdkg', freqBase: 150, freqRange: 100, shape: 'burst', amp: 0.8 },
  nasals: { chars: 'mn', freqBase: 180, freqRange: 60, shape: 'sine', amp: 0.5 },
  liquids: { chars: 'lr', freqBase: 320, freqRange: 80, shape: 'formant', amp: 0.6 },
  glides: { chars: 'wy', freqBase: 260, freqRange: 80, shape: 'formant', amp: 0.55 },
  high_v: { chars: 'ieu', freqBase: 380, freqRange: 120, shape: 'harmonic', amp: 0.75 },
  mid_v: { chars: 'eo', freqBase: 280, freqRange: 100, shape: 'harmonic', amp: 0.7 },
  low_v: { chars: 'aou', freqBase: 200, freqRange: 80, shape: 'harmonic', amp: 0.72 },
  aspirate: { chars: 'h', freqBase: 100, freqRange: 400, shape: 'noise', amp: 0.35 },
};

function classifyEN(ch) {
  const c = ch.toLowerCase();
  for (const p of Object.values(EN_P)) {
    if (p.chars.includes(c)) return p;
  }
  return { freqBase: 250, freqRange: 150, shape: 'sine', amp: 0.4 };
}

export function textToFeatures(text, lang) {
  const feats = [];
  if (lang === 'ko') {
    text.split('').forEach((ch) => {
      const code = ch.charCodeAt(0);
      if (code >= 0xac00 && code <= 0xd7a3) {
        const jamo = code - 0xac00;
        const cho = Math.floor(jamo / 588);
        const jung = Math.floor((jamo % 588) / 28);
        const jong = jamo % 28;
        feats.push({
          freq: 180 + jung * 130 + cho * 25 + Math.random() * 40,
          amp: 0.4 + (jong > 0 ? 0.35 : 0.1) + Math.random() * 0.2,
          shape: jong > 0 ? 'closed' : 'open',
          harmonics: 2 + (jung % 3),
          char: ch,
        });
      } else if (ch.trim()) {
        feats.push({
          freq: 300 + (ch.charCodeAt(0) % 300),
          amp: 0.3 + Math.random() * 0.25,
          shape: 'sine',
          harmonics: 2,
          char: ch,
        });
      }
    });
  } else {
    text.split('').forEach((ch) => {
      if (!ch.trim()) return;
      const p = classifyEN(ch);
      feats.push({
        freq: p.freqBase + Math.random() * p.freqRange,
        amp: p.amp + (Math.random() - 0.5) * 0.15,
        shape: p.shape,
        harmonics: p.shape === 'harmonic' ? 4 : p.shape === 'formant' ? 3 : 1,
        char: ch,
      });
    });
  }
  return feats;
}

export function generateWave(feats, len, lang) {
  const buf = new Float32Array(len);
  if (!feats.length) return buf;
  const cm = lang === 'en' ? 3.5 : 1;
  feats.forEach((f) => {
    const k = (f.freq / 50) * cm;
    const w = f.amp / feats.length;
    if (f.shape === 'noise' || f.shape === 'aspirate') {
      for (let i = 0; i < len; i++) {
        buf[i] += w * (Math.random() * 2 - 1) * 0.6 + w * 0.4 * Math.sin((2 * Math.PI * k * i) / len);
      }
    } else if (f.shape === 'burst') {
      const ct = Math.floor(Math.random() * len);
      for (let i = 0; i < len; i++) {
        const env = Math.exp((-(i - ct) * (i - ct)) / (len * 0.003));
        buf[i] += w * env * (Math.sin((2 * Math.PI * k * i) / len) + (Math.random() - 0.5) * 0.4);
      }
    } else if (f.shape === 'harmonic' || f.shape === 'formant') {
      const nh = f.harmonics || 3;
      for (let h = 1; h <= nh; h++) {
        const jt = 1 + (Math.random() - 0.5) * 0.04;
        for (let i = 0; i < len; i++) buf[i] += (w / h) * Math.sin((2 * Math.PI * k * h * jt * i) / len);
      }
    } else if (f.shape === 'closed') {
      for (let h = 1; h <= 3; h++) for (let i = 0; i < len; i++) buf[i] += (w / h) * Math.sin((2 * Math.PI * k * h * i) / len);
      for (let i = 0; i < len; i++) buf[i] += w * 0.2 * (Math.random() - 0.5);
    } else {
      const nh = f.harmonics || 2;
      for (let h = 1; h <= nh; h++) for (let i = 0; i < len; i++) buf[i] += (w / h) * Math.sin((2 * Math.PI * k * h * i) / len);
    }
  });
  let mx = 0;
  for (let i = 0; i < len; i++) mx = Math.max(mx, Math.abs(buf[i]));
  if (mx > 0) for (let i = 0; i < len; i++) buf[i] /= mx;
  return buf;
}

export function generateRadarDots(feats) {
  return feats.map((f, i) => ({
    angle: (i / feats.length) * Math.PI * 2 + (Math.random() - 0.5) * 0.5,
    r: 0.18 + (f.freq / 1100) * 0.62 + Math.random() * 0.1,
    amp: f.amp,
    label: LABELS[i % 26],
  }));
}
