// Safari Rescue - shared front-end core (ES module, no build step).
// utils · icons · SVG art · API client · UI helpers · router · action registry

/* ---------- utils ---------- */
export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
export const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const pad = (n) => String(n).padStart(2, '0');
export const UGX = (n) => 'UGX ' + Math.round(n || 0).toLocaleString('en-US');
export const RNG = (p) => UGX(p[0]) + ' – ' + Math.round(p[1]).toLocaleString('en-US');
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const fD = (i) => { const d = new Date(i); return pad(d.getDate()) + ' ' + MON[d.getMonth()] + ' ' + d.getFullYear(); };
export const fT = (i) => { const d = new Date(i); const h = d.getHours(); return pad(h % 12 || 12) + ':' + pad(d.getMinutes()) + ' ' + (h < 12 ? 'AM' : 'PM'); };
export const fDT = (i) => fD(i) + ' • ' + fT(i);
export const fShort = (i) => { const d = new Date(i); return MON[d.getMonth()] + ' ' + d.getDate(); };
export function ago(ms) {
  const d = Date.now() - ms;
  if (d < 60e3) return 'Just now';
  const t = new Date(ms); const n = new Date();
  if (t.toDateString() === n.toDateString()) return fT(ms);
  const y = new Date(n); y.setDate(n.getDate() - 1);
  if (t.toDateString() === y.toDateString()) return 'Yesterday';
  const days = Math.floor(d / 864e5);
  return days < 14 ? days + ' days ago' : fD(ms);
}
export function since(ms) {
  const m = Math.floor((Date.now() - ms) / 60000);
  if (m < 1) return 'Just now';
  if (m < 60) return m + (m === 1 ? ' min ago' : ' mins ago');
  const h = Math.floor(m / 60);
  if (h < 24) return h + (h === 1 ? ' hour ago' : ' hours ago');
  const d = Math.floor(h / 24);
  return d + (d === 1 ? ' day ago' : ' days ago');
}
export const ini = (n) => String(n || '?').trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
export const phoneFmt = (p) => (/^256\d{9}$/.test(p || '') ? `+256 ${p.slice(3, 6)} ${p.slice(6, 9)} ${p.slice(9)}` : p || '');

/* ---------- icons (24x24 stroke icons) ---------- */
const IC = {
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  bell: '<path d="M6 16v-5a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>',
  back: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
  next: '<path d="M9 5l7 7-7 7"/>',
  down: '<path d="M6 9l6 6 6-6"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  pin: '<path d="M12 21s-7-6.1-7-11.2a7 7 0 0 1 14 0C19 14.9 12 21 12 21z"/><circle cx="12" cy="9.8" r="2.6"/>',
  wrench: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>',
  car: '<path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/>',
  tow: '<path d="M2 17V9h10v8M12 11h5l3 3.5V17h2"/><path d="M6 9l3-4h5M14 5v3"/><circle cx="6" cy="17.5" r="2"/><circle cx="17" cy="17.5" r="2"/>',
  battery: '<rect x="3" y="7" width="18" height="12" rx="2"/><path d="M7 7V5h3v2M14 7V5h3v2M7 13h4M9 11v4M14 13h4"/>',
  fuel: '<path d="M3 22h12M4 9h10M14 22V4a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v18M14 13h2a2 2 0 0 1 2 2v2a2 2 0 0 0 2 2 2 2 0 0 0 2-2V9.83a2 2 0 0 0-.59-1.42L18 5"/>',
  tire: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4.2"/><circle cx="12" cy="12" r=".8"/><path d="M12 3v4.8M12 16.2V21M3 12h4.8M16.2 12H21"/>',
  engine: '<path d="M3 11v4M21 10v5M6 8h3l1-2h4l1 2h2v2h2v6h-3l-2 2H9l-2-2H6v-3H3"/><path d="M12 11v3M10.5 12.5h3"/>',
  lock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3M12 15v2"/>',
  anchor: '<circle cx="12" cy="5" r="2.5"/><path d="M12 7.5V21M5 12H3a9 9 0 0 0 18 0h-2M8 11h8"/>',
  plus: '<circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/>',
  phone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/>',
  chat: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.5-4.6A8 8 0 1 1 21 12z"/><path d="M8.5 12h.01M12 12h.01M15.5 12h.01"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>',
  star: '<path d="M12 3.2l2.7 5.6 6.1.8-4.5 4.2 1.1 6.1L12 17l-5.4 2.9 1.1-6.1L3.2 9.6l6.1-.8z"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  shield: '<path d="M12 3l8 3v6c0 4.4-3.2 7.6-8 9-4.8-1.4-8-4.6-8-9V6z"/><path d="M8.5 12l2.5 2.5 4.5-4.5"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  map: '<path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z"/><path d="M9 4v14M15 6v14"/>',
  nav: '<path d="M20 4L4 11l7 2 2 7z"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4.5 20.5a7.5 7.5 0 0 1 15 0z"/>',
  home: '<path d="M4 11l8-7 8 7v9H4z"/><path d="M10 20v-5h4v5"/>',
  list: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4h6v3H9zM9 12h6M9 16h4"/>',
  medical: '<path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6z"/>',
  hotel: '<path d="M5 21V4a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v17M3 21h18M9 7h2M13 7h2M9 11h2M13 11h2M10 21v-4h4v4"/>',
  plane: '<path d="M17.8 19.2L16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/>',
  headset: '<path d="M4 14v-2a8 8 0 0 1 16 0v2"/><rect x="3" y="13" width="4" height="6" rx="1.5"/><rect x="17" y="13" width="4" height="6" rx="1.5"/><path d="M19 19c0 1.5-2 2-5 2"/>',
  camera: '<path d="M4 8h3l1.5-2h7L17 8h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
  wheel: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="2"/><path d="M3 12h7M14 12h7M12 14v7"/>',
  tag: '<path d="M3 12V4h8l10 10-8 8z"/><circle cx="7.5" cy="8.5" r="1.2"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5h.01"/>',
  wallet: '<rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18M16 14.5h2"/>',
  gauge: '<path d="M4 17a8 8 0 1 1 16 0"/><path d="M12 17l4-5"/>',
  crown: '<path d="M4 8l4 4 4-6 4 6 4-4-2 11H6z"/>',
  share: '<circle cx="6" cy="12" r="2.5"/><circle cx="17" cy="6" r="2.5"/><circle cx="17" cy="18" r="2.5"/><path d="M8.2 10.8l6.6-3.6M8.2 13.2l6.6 3.6"/>',
  edit: '<path d="M4 20l4-1 11-11-3-3L5 16z"/><path d="M14 6l3 3"/>',
  cal: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/>',
  warn: '<path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18h.01"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><circle cx="17" cy="9" r="2.5"/><path d="M16.5 14.2A5.5 5.5 0 0 1 21.5 20"/>',
  bars: '<path d="M5 20V10M12 20V4M19 20v-7"/>',
  box: '<path d="M3 7l9-4 9 4v10l-9 4-9-4z"/><path d="M3 7l9 4 9-4M12 11v10"/>',
  dollar: '<path d="M12 3v18M16 7.5C15.2 6.3 13.8 5.5 12 5.5c-2.3 0-4 1.2-4 3s1.6 2.6 4 3 4 1.2 4 3-1.7 3-4 3c-2 0-3.5-.9-4.3-2.2"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
  send: '<path d="M21 3L3 10.5l7 2.5 2.5 7z"/><path d="M10 13l11-10"/>',
  out: '<path d="M9 4H5v16h4M16 8l4 4-4 4M20 12H9"/>',
  logo: '<path d="M12 21s-7-6.1-7-11.2a7 7 0 0 1 14 0C19 14.9 12 21 12 21z"/><circle cx="12" cy="9.8" r="2"/>',
};
export const ic = (n, c = '') => `<svg class="ic${c ? ' ' + c : ''}" viewBox="0 0 24 24" aria-hidden="true">${IC[n] || ''}</svg>`;
export const stars = (n) => `<span class="stars" role="img" aria-label="${n} out of 5 stars">${[1, 2, 3, 4, 5].map((i) => ic('star', 'f' + (i > Math.round(n) ? ' off' : ''))).join('')}</span>`;

/* ---------- SVG art ---------- */
const logoMark = () => '<svg viewBox="0 0 60 78" aria-hidden="true"><path d="M44 26C16 24 10 42 28 46s20 20-16 22" fill="none" style="stroke:var(--wm1)" stroke-width="13" stroke-linecap="round"/><path d="M44 26C16 24 10 42 28 46s20 20-16 22" fill="none" style="stroke:var(--bg)" stroke-width="1.7" stroke-dasharray="3 3.5" stroke-linecap="round"/><path d="M31 2a10 10 0 0 1 10 10c0 8-10 18-10 18S21 20 21 12A10 10 0 0 1 31 2z" style="fill:var(--lime)"/><circle cx="31" cy="12" r="3.6" style="fill:var(--bg)"/></svg>';
export const logo = (fs = 34, light = false) => `<span class="logo${light ? ' lt' : ''}" style="font-size:${fs}px"><span class="lm">${logoMark()}</span><span class="wm"><b>SAFARI</b><i>RESCUE</i></span></span>`;
export const tagline = () => '<div class="tag"><span>HELP IS ON THE WAY</span></div>';

const acacia = (x, y, s = 1, c = 'var(--tree)') => `<g transform="translate(${x} ${y}) scale(${s})"><path d="M0 0c2-18 0-30-6-46M0-26c6-8 14-14 24-18" stroke="#5a4630" stroke-width="5" fill="none" stroke-linecap="round"/><ellipse cx="2" cy="-52" rx="46" ry="13" style="fill:${c}"/><ellipse cx="-16" cy="-60" rx="26" ry="9" style="fill:${c}"/><ellipse cx="24" cy="-48" rx="24" ry="8" style="fill:${c}"/></g>`;

const GLASS = '#A9CBD4';
const wh = (x, y = 92, r = 19) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#131d17"/><circle cx="${x}" cy="${y}" r="${r * 0.5}" fill="#C7CEC6"/><circle cx="${x}" cy="${y}" r="${r * 0.18}" fill="#79837a"/>`;
const arch = (x, r = 22) => `<path d="M${x - r} 92a${r} ${r} 0 0 1 ${r * 2} 0z" fill="#101a14"/>`;
const SHADOW = '<ellipse cx="130" cy="111" rx="112" ry="5" fill="#000" opacity=".15"/>';
const LIGHTS = '<rect x="238" y="62" width="9" height="7" rx="2" fill="#FFEEB0"/><rect x="12" y="62" width="5" height="11" rx="2" fill="#D6463A"/>';
function vInner(t, c, brand) {
  if (t === 'cruiser') {
    return SHADOW + `<path d="M12 60q0-8 9-8h211q16 0 18 14l2 20q0 12-12 12H22q-10 0-10-10z" fill="${c}"/><path d="M36 52l5-30q1-6 8-6h118q6 0 9 5l30 31z" fill="${c}"/><path d="M49 25h39v25H44zM94 25h38v25H94zM138 25h31l22 25h-53z" fill="${GLASS}"/><path d="M91 50v44M135 50v44" stroke="#000" stroke-opacity=".15" stroke-width="1.4"/><path d="M44 11h126M52 11v5M104 11v5M158 11v5" stroke="#1f2c25" stroke-width="3" stroke-linecap="round"/><path d="M186 52V14q0-4 4-4h6" fill="none" stroke="#1f2c25" stroke-width="4" stroke-linecap="round"/>${arch(66)}${arch(192)}${wh(66)}${wh(192)}<rect x="240" y="66" width="11" height="28" rx="4" fill="#1b2620"/>${LIGHTS}<rect x="110" y="58" width="9" height="3" rx="1.5" fill="#000" opacity=".25"/><rect x="150" y="58" width="9" height="3" rx="1.5" fill="#000" opacity=".25"/>`
      + (brand ? '<circle cx="112" cy="77" r="7" fill="#0F4A2C"/><text x="112" y="80.5" text-anchor="middle" font-family="Poppins,Nunito,sans-serif" font-weight="800" font-size="10" fill="#fff">S</text><text x="123" y="76" font-family="Poppins,Nunito,sans-serif" font-weight="800" font-size="6.5" fill="#0F4A2C">SAFARI</text><text x="123" y="83" font-family="Poppins,Nunito,sans-serif" font-weight="800" font-size="6.5" fill="#6FA32B">RESCUE</text>' : '');
  }
  if (t === 'sedan') return SHADOW + `<rect x="12" y="62" width="236" height="32" rx="12" fill="${c}"/><path d="M64 62q10-24 40-26h40q26 2 44 26z" fill="${c}"/><path d="M74 60q8-17 30-19h16v19zM126 41h19q18 1 31 19h-50z" fill="${GLASS}"/>${arch(66)}${arch(196)}${wh(66)}${wh(196)}${LIGHTS}`;
  if (t === 'van') return SHADOW + `<path d="M12 94V40q0-10 10-10h148q12 0 20 10l34 26q20 4 24 14v14z" fill="${c}"/><path d="M26 40h34v22H26zM66 40h34v22H66zM106 40h34v22h-34zM146 40h24q8 0 12 8l12 14h-48z" fill="${GLASS}"/><path d="M62 36v58" stroke="#000" stroke-opacity=".12" stroke-width="1.4"/>${arch(60)}${arch(196)}${wh(60)}${wh(196)}${LIGHTS}`;
  if (t === 'tow' || t === 'flatbed') {
    const load = vInner(t === 'tow' ? 'sedan' : 'suv', t === 'tow' ? '#C94F43' : '#5A7FB8', false).replace(SHADOW, '');
    return SHADOW + `<rect x="8" y="72" width="160" height="10" rx="3" fill="#E9A23B"/><g transform="translate(16 12) scale(.56)">${load}</g><rect x="8" y="82" width="160" height="8" rx="2" fill="#2b3a31"/><path d="M166 94V54q0-8 8-8h30q8 0 14 7l26 22q8 4 8 12v9z" fill="${c}"/><path d="M178 54h26l17 17h-43z" fill="${GLASS}"/>${arch(40, 20)}${arch(204, 20)}${wh(40, 92, 17)}${wh(84, 92, 17)}${wh(204, 92, 17)}`;
  }
  // suv (default)
  return SHADOW + `<rect x="12" y="56" width="236" height="38" rx="11" fill="${c}"/><path d="M44 56l16-26q3-5 9-5h104q8 0 13 6l24 25z" fill="${c}"/><path d="M66 53l11-22h40v22zM122 31h44l19 22h-63z" fill="${GLASS}"/>${arch(68)}${arch(194)}${wh(68)}${wh(194)}${LIGHTS}`;
}
export const veh = (t, c = '#E8DFC6', brand = false) => `<svg viewBox="0 0 260 120" role="img" aria-label="${esc(t)} vehicle">${vInner(t, c, brand)}</svg>`;

export const sceneHero = () => '<svg viewBox="0 0 430 300" preserveAspectRatio="xMidYMax slice" aria-hidden="true"><defs><linearGradient id="hg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--bg)"/><stop offset="1" style="stop-color:var(--sky2)"/></linearGradient></defs><rect width="430" height="300" fill="url(#hg)"/><path d="M120 214l60-48 50 34 60-56 70 62 70-40v100H120z" style="fill:var(--hill)" opacity=".8"/><path d="M100 262q150-30 330-20v58H100z" style="fill:var(--ground)" opacity=".6"/>' + acacia(368, 236, 0.9) + '</svg>';

export const sceneWelcome = () => `<svg viewBox="0 0 430 440" preserveAspectRatio="xMidYMax slice" aria-hidden="true"><defs><linearGradient id="wg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--bg)"/><stop offset=".75" style="stop-color:var(--sky2)"/></linearGradient></defs><rect width="430" height="440" fill="url(#wg)"/><path d="M0 190l60-30 40 20 90-50 70 44 60-34 110 60v100H0z" style="fill:var(--hill)" opacity=".75"/><path d="M0 232q110-24 230-6t200-12v226H0z" style="fill:var(--ground)"/>${acacia(58, 238, 1.5)}${acacia(376, 224, 1.2)}${acacia(300, 208, 0.7)}${acacia(132, 216, 0.6)}<path d="M200 226C170 270 250 290 205 340S120 392 120 440H330C330 392 300 360 285 340 300 300 250 280 236 226z" fill="#C98B4E"/><path d="M214 232C196 272 262 292 232 340S190 400 196 440" fill="none" stroke="#E2AE72" stroke-width="5" opacity=".6"/><ellipse cx="215" cy="398" rx="78" ry="8" fill="#000" opacity=".16"/><rect x="156" y="392" width="22" height="14" rx="3" fill="#131d17"/><rect x="252" y="392" width="22" height="14" rx="3" fill="#131d17"/><rect x="158" y="288" width="114" height="7" rx="2" fill="#1f2c25"/><rect x="170" y="276" width="48" height="12" rx="3" fill="#6b5a2e"/><rect x="150" y="330" width="130" height="62" rx="14" fill="#F4F4F0"/><path d="M162 332l12-34h82l12 34z" fill="#F4F4F0"/><rect x="176" y="304" width="78" height="26" rx="4" fill="#9DBFC9"/><rect x="152" y="344" width="14" height="22" rx="4" fill="#D6463A"/><rect x="264" y="344" width="14" height="22" rx="4" fill="#D6463A"/><circle cx="215" cy="358" r="19" fill="#141e18"/><circle cx="215" cy="358" r="9" fill="#C3CAC2"/><rect x="146" y="386" width="138" height="12" rx="5" fill="#cfd4cc"/></svg>`;

export const sceneSplash = () => `<svg viewBox="0 0 430 900" preserveAspectRatio="xMidYMax slice" aria-hidden="true"><defs><linearGradient id="spg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0A3A22"/><stop offset="1" stop-color="#0B4A2B"/></linearGradient></defs><rect width="430" height="900" fill="url(#spg)"/><g fill="#06301B" opacity=".8"><path d="M0 700q90-14 180-4t250-6v216H0z"/>${acacia(215, 744, 3.4, '#06301B')}</g></svg>`;

const MAP_BASE = '<rect width="400" height="420" style="fill:var(--land)"/><path d="M262 420L400 296v124z" style="fill:var(--water)"/><path d="M18 322q44-34 96-12l-12 64q-54 12-96-4z" style="fill:var(--park)"/><path d="M236 34q64-22 108 6l-16 54q-54 12-100-6z" style="fill:var(--park)"/><g fill="none" style="stroke:var(--rd)" stroke-width="7" stroke-linecap="round"><path d="M0 118l400-32M0 336l400-44M104 0l22 420M300 0l-34 326M54 206l306 20"/></g><path d="M-10 146l190 150 120 92 110 40" fill="none" style="stroke:var(--rd1)" stroke-width="11" stroke-linecap="round"/>';
export const mapLive = () => `<svg class="map" viewBox="0 0 400 420" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Map showing the route to you">${MAP_BASE}<g class="ml"><text x="62" y="136">Kiwatule</text><text x="34" y="268">Naalya</text><text x="236" y="236">Bukoto</text><text transform="translate(34 168) rotate(38)" class="sm">Northern Bypass</text><text x="296" y="396" class="wt">Lake Victoria</text></g><path class="rt0" d="M118 304C140 262 172 244 172 204S196 134 252 128 332 100 348 104" fill="none" style="stroke:var(--tint)" stroke-width="7" stroke-linecap="round"/><path id="rt" d="M118 304C140 262 172 244 172 204S196 134 252 128 332 100 348 104" fill="none" style="stroke:var(--cta)" stroke-width="5" stroke-linecap="round"/><g transform="translate(348 104)"><circle r="15" style="fill:var(--card)"/><circle r="8" style="fill:var(--cta)"/><circle r="3.4" style="fill:var(--card)"/></g><g id="mv" transform="translate(118 304)"><circle r="30" style="fill:var(--cta)" opacity=".14"/><circle r="19" style="fill:var(--card);stroke:var(--cta)" stroke-width="2"/><g transform="translate(-14 -10) scale(.108)">${vInner('cruiser', '#E8DFC6', false)}</g></g></svg>`;

export const mapPark = (pins = []) => `<svg class="map" viewBox="0 0 400 220" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Map of the pick-up area"><rect width="400" height="220" style="fill:var(--land)"/><path d="M60 30q120-40 250-6l60 60-30 110-150 30-130-20z" style="fill:var(--park)"/><path d="M-10 150q120-30 200-10t230-50" fill="none" style="stroke:var(--rd1)" stroke-width="10" stroke-linecap="round"/><path d="M110 -10q20 80 60 130t30 120" fill="none" style="stroke:var(--rd)" stroke-width="6"/><text x="150" y="70" class="ml">Queen Elizabeth</text><text x="150" y="83" class="ml">National Park</text><text x="318" y="108" class="ml">To Mbarara ›</text><path d="M74 128C130 120 190 150 250 116" fill="none" style="stroke:var(--cta)" stroke-width="3" stroke-dasharray="6 6" stroke-linecap="round"/>${pins.map((p) => `<g transform="translate(${p.x} ${p.y})"><circle r="13" style="fill:${p.c || 'var(--red)'}"/><circle r="5" fill="#fff"/></g><text x="${p.x + 16}" y="${p.y + 4}" class="mb">${esc(p.l || '')}</text>`).join('')}<g transform="translate(250 116)"><circle r="17" style="fill:var(--cta)"/><g transform="translate(-9 -9) scale(.75)" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${IC.wrench}</g></g></svg>`;

export function mapPaint(p) {
  const rt = $('#rt'); const mv = $('#mv');
  if (!rt || !mv) return;
  const L = rt.getTotalLength();
  const pt = rt.getPointAtLength(L * p);
  mv.setAttribute('transform', `translate(${pt.x} ${pt.y})`);
  rt.style.strokeDasharray = `${L} ${L}`;
  rt.style.strokeDashoffset = String(-L * p);
}

/* ---------- state + API ---------- */
export const S = { cfg: null, user: null, vehicles: [], contacts: [], bookings: [], trips: [], messages: [], notifs: [], active: null, partners: [], prov: null, portal: null, skew: 0 };
export const ui = { tt: 'all', all: false, bt: 'up', mt: 'in', pv: 'dash', pj: 0 };
export const hooks = {};
export const LOAD = {}; // per-role data loaders, registered by customer.js / provider.js / portal.js
export const loadAll = () => (S.user && LOAD[S.user.role] ? LOAD[S.user.role]() : Promise.resolve());
export const nowS = () => Date.now() + S.skew;

export async function api(path, opt = {}) {
  let res;
  try {
    res = await fetch('/api' + path, {
      method: opt.method || 'GET', credentials: 'same-origin',
      headers: opt.body ? { 'Content-Type': 'application/json' } : {},
      body: opt.body ? JSON.stringify(opt.body) : undefined,
    });
  } catch (e) {
    const err = new Error('No connection. Check your internet and try again.');
    err.offline = true;
    throw err;
  }
  let j = null;
  try { j = await res.json(); } catch (e) { /* not json */ }
  if (!res.ok) {
    const err = new Error((j && j.error) || `Something went wrong (${res.status})`);
    err.status = res.status;
    if (res.status === 401 && !path.startsWith('/auth/') && hooks.unauthorized) hooks.unauthorized();
    throw err;
  }
  if (j && j.now) S.skew = j.now - Date.now();
  return j || {};
}

/* ---------- toast / sheets ---------- */
export function toast(msg, ms = 2800) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.setAttribute('role', 'status');
  t.textContent = msg;
  $('#layer').appendChild(t);
  setTimeout(() => t.classList.add('out'), ms);
  setTimeout(() => t.remove(), ms + 400);
}
export const fail = (e) => { if (e && e.message) toast(e.message); };

let sheetClose = null;
export function closeSheet() {
  const f = sheetClose; sheetClose = null;
  if (f) { try { f(); } catch (e) { /* ignore */ } }
  $$('.shw').forEach((w) => { w.classList.remove('in'); setTimeout(() => w.remove(), 220); });
}
export function sheet(html, o = {}) {
  closeSheet();
  const w = document.createElement('div');
  w.className = 'shw' + (o.drawer ? ' dr' : '');
  w.innerHTML = o.drawer ? `<div class="scrim" data-act="closeSheet"></div><aside class="drawer" role="dialog" aria-modal="true" aria-label="Menu">${html}</aside>`
    : `<div class="scrim" data-act="closeSheet"></div><div class="sheet${o.cls ? ' ' + o.cls : ''}" role="dialog" aria-modal="true" aria-label="${esc(o.label || 'Dialog')}"><div class="grab"></div>${html}</div>`;
  $('#layer').appendChild(w);
  sheetClose = o.onClose || null;
  requestAnimationFrame(() => requestAnimationFrame(() => w.classList.add('in')));
  const f = $('input,textarea,select', w);
  if (f && !o.drawer && matchMedia('(min-width:700px)').matches) f.focus();
  return w;
}
export function confirmSheet(title, text, yesLabel, yesAct, data = {}, danger = true) {
  const attrs = Object.entries(data).map(([k, v]) => ` data-${k}="${esc(v)}"`).join('');
  return sheet(`<h3>${esc(title)}</h3><p class="muted">${esc(text)}</p><div class="two"><button class="btn ghost" data-act="closeSheet">Keep it</button><button class="btn${danger ? ' dng' : ''}" data-act="${yesAct}"${attrs}>${esc(yesLabel)}</button></div>`, { label: title });
}
export async function busy(btn, fn) {
  if (!btn || btn.disabled) return undefined;
  btn.disabled = true; btn.classList.add('ld');
  try { return await fn(); } finally { btn.disabled = false; btn.classList.remove('ld'); }
}

/* ---------- theme ---------- */
export function applyTheme(t) {
  const r = document.documentElement;
  if (t === 'light' || t === 'dark') r.dataset.theme = t; else delete r.dataset.theme;
}

/* ---------- router ---------- */
export const ROUTES = [];
export const route = (pattern, fn, role) => ROUTES.push({ pattern, fn, role });
let cleanup = []; let navN = 0;
export const later = (f, ms) => { const id = setTimeout(f, ms); cleanup.push(() => clearTimeout(id)); };
export const every = (f, ms) => { const id = setInterval(f, ms); cleanup.push(() => clearInterval(id)); };
export const homePath = () => ({ customer: '/home', provider: '/provider', partner: '/portal' }[S.user && S.user.role] || '/welcome');
export const go = (p) => { if (location.hash === '#' + p) render(); else location.hash = '#' + p; };
export const goR = (p) => { location.replace('#' + p); };
export const back = () => { if (navN > 1) history.back(); else go(homePath()); };

function match(pat, parts) {
  const p = pat.split('/').filter(Boolean);
  if (p.length !== parts.length) return null;
  const o = {};
  for (let i = 0; i < p.length; i++) {
    if (p[i][0] === ':') o[p[i].slice(1)] = decodeURIComponent(parts[i]);
    else if (p[i] !== parts[i]) return null;
  }
  return o;
}

export const bar = (title, o = {}) => `<div class="bar${o.dk ? ' dk' : ''}">${o.noBack ? '<span class="ib"></span>' : `<button class="ib" data-go="back" aria-label="Back">${ic('back')}</button>`}<h1>${title}</h1>${o.right || '<span class="ib"></span>'}</div>`;
export const nb = (n) => (n ? `<em class="bdg">${n}</em>` : '');
export const empty = (icon, title, text, btn = '') => `<div class="empty">${ic(icon)}<h2>${esc(title)}</h2><p class="muted">${text}</p>${btn}</div>`;

export function render(o = {}) {
  cleanup.forEach((f) => { try { f(); } catch (e) { /* ignore */ } });
  cleanup = [];
  const hash = (location.hash || '').replace(/^#/, '');
  const [path, query] = hash.split('?');
  const parts = path.split('/').filter(Boolean);
  if (!parts.length) { goR('/splash'); return; }
  let hit = null; let params = {};
  for (const r of ROUTES) { const m = match(r.pattern, parts); if (m) { hit = r; params = m; break; } }
  if (hit && hit.role) {
    if (!S.user) { goR('/welcome'); return; }
    if (S.user.role !== hit.role) { goR(homePath()); return; }
  }
  let v;
  try {
    v = hit ? hit.fn(params, new URLSearchParams(query || '')) : { top: 'light', html: `${bar('Not found')}<main class="pg">${empty('map', 'Page not found', 'That page does not exist.', '<button class="btn" data-go="/welcome">Go home</button>')}</main>` };
  } catch (e) {
    console.error(e);
    v = { top: 'light', html: `<main class="pg">${empty('warn', 'Something went wrong', esc(e.message), '<button class="btn" data-go="/welcome">Start again</button>')}</main>` };
  }
  if (!o.keep) closeSheet();
  const y = window.scrollY;
  document.documentElement.dataset.top = v.top || 'light';
  const app = $('#app');
  app.className = 'app' + (v.shell ? ' sh-' + v.shell : '') + (v.wide ? ' wide' : '') + (o.keep ? '' : ' enter');
  app.innerHTML = v.html;
  window.scrollTo(0, o.keep ? y : 0);
  if (!o.keep) navN++;
  if (v.after) { try { v.after(); } catch (e) { console.error(e); } }
  const h1 = !o.keep && $('h1', app);
  if (h1) { h1.setAttribute('tabindex', '-1'); }
}

/* ---------- actions (event delegation) ---------- */
export const A = {};
export const INPUT = {};
document.addEventListener('click', (e) => {
  const t = e.target.closest('[data-go],[data-act]');
  if (!t || t.disabled) return;
  if (t.dataset.go) {
    e.preventDefault();
    if (t.dataset.go === 'back') back(); else go(t.dataset.go);
    return;
  }
  const f = A[t.dataset.act];
  if (f) { e.preventDefault(); Promise.resolve().then(() => f(t, e)).catch(fail); }
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeSheet();
  if (e.key === 'Enter' && e.target.dataset && e.target.dataset.enter) { const b = $(e.target.dataset.enter); if (b) b.click(); }
});
const onField = (e) => { const f = INPUT[e.target.dataset.in || e.target.id]; if (f) f(e.target, e); };
document.addEventListener('input', onField);
document.addEventListener('change', onField);
window.addEventListener('hashchange', () => render());
