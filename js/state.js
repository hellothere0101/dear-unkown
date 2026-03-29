/** 앱 전역 가변 상태 (캔버스 루프·번역·내보내기에서 공유) */
export const state = {
  waveData: /** @type {Float32Array} */ (new Float32Array(0)),
  radarDots: /** @type {Array<{angle:number,r:number,amp:number,label:string}>} */ ([]),
  features: /** @type {any[]} */ ([]),
  posterWaveAmplitude: 1,
  posterBgScale: 1,
  posterBgOffsetX: 0,
  posterBgOffsetY: 0,
  posterAccentColor: '#ff8c2a',
  posterSubColor: '#ffe3c7',
  currentText: '',
  currentLang: /** @type {'ko'|'en'} */ ('ko'),
  currentRatio: /** @type {'3:4'|'9:16'|'1:1'} */ ('3:4'),
  /** @type {HTMLImageElement|null} */
  bgImage: null,
};
