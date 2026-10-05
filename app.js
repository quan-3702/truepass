const $ = (id) => document.getElementById(id);
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const STORE_BILLING = 'https://store.microsoft.com/billing';
const PRO_SKU = 'truepass_pro';
const PRO_IDS = [PRO_SKU];
let STORE_URL = 'https://apps.microsoft.com/detail/9NNMBXF2VJG5';
let proAvailable = false; // Pro limits apply only when the Store actually sells the add-on
let proSku = PRO_SKU;
let isPro = false;
try { isPro = localStorage.getItem('truepass-pro') === '1'; } catch (_) {}
const unlocked = () => isPro || !proAvailable;

async function billing() {
  if (!('getDigitalGoodsService' in window)) return null;
  try { return await window.getDigitalGoodsService(STORE_BILLING); } catch (_) { return null; }
}
function setPro(v) {
  isPro = v;
  try { localStorage.setItem('truepass-pro', v ? '1' : '0'); } catch (_) {}
  const b = $('proBtn');
  b.textContent = v ? '★ Pro' : '★ Get Pro';
  b.classList.toggle('is-pro', v);
  b.hidden = !proAvailable && !v;
  document.body.classList.toggle('unlocked', unlocked());
  if (typeof renderAll === 'function') renderAll();
}
async function checkPro() {
  const svc = await billing();
  if (!svc) return false;
  try {
    const details = await svc.getDetails(PRO_IDS).catch(() => []);
    proAvailable = details.length > 0;
    if (details[0]) { proSku = details[0].itemId; if (!PRO_IDS.includes(proSku)) PRO_IDS.push(proSku); }
    const list = await svc.listPurchases();
    const owned = list.some((p) => PRO_IDS.includes(p.itemId));
    setPro(owned);
    return owned;
  } catch (_) { return isPro; }
}
function proMessage(text) { const m = $('proMsg'); m.hidden = !text; m.textContent = text || ''; }
async function openPro(reason) {
  proMessage(reason || '');
  const svc = await billing();
  if (!svc) {
    $('buyBtn').textContent = 'Get TruePass on Microsoft Store';
    $('restoreBtn').hidden = true;
  } else {
    $('restoreBtn').hidden = false;
    try {
      const [d] = await svc.getDetails([proSku]);
      const price = d && d.price ? new Intl.NumberFormat(undefined, { style: 'currency', currency: d.price.currency }).format(Number(d.price.value)) : '';
      $('buyBtn').textContent = price ? `Unlock Pro – ${price}` : 'Unlock Pro';
    } catch (_) { $('buyBtn').textContent = 'Unlock Pro'; }
  }
  if (!$('proDialog').open) $('proDialog').showModal();
}
async function buyPro() {
  const svc = await billing();
  if (!svc) { window.open(STORE_URL, '_blank'); return; }
  const methods = [{ supportedMethods: STORE_BILLING, data: { sku: proSku } }];
  try {
    let req;
    try { req = new PaymentRequest(methods); }
    catch (_) { req = new PaymentRequest(methods, { total: { label: 'Total', amount: { currency: 'USD', value: '0' } } }); }
    const res = await req.show();
    await res.complete('success');
  } catch (e) {
    if (e && e.name === 'AbortError') return;
    proMessage('Purchase could not be completed: ' + (e.message || e));
    return;
  }
  if (await checkPro()) { proMessage('Thank you! Pro is unlocked. ★'); setTimeout(() => $('proDialog').close(), 1500); }
}
function needsPro(reason) {
  if (unlocked()) return false;
  openPro(reason);
  return true;
}


// ---------- document sizes (mm). head = chin to top of hair; top = gap above the hair ----------
const SPECS = [
  { id: 'us', name: 'United States – passport / visa (2 × 2 in)', w: 50.8, h: 50.8, head: [25, 35], top: 5, px: [1200, 1200] },
  { id: 'eu', name: 'Europe / Schengen – passport, ID, visa (35 × 45 mm)', w: 35, h: 45, head: [32, 36], top: 4 },
  { id: 'uk', name: 'United Kingdom – passport (35 × 45 mm)', w: 35, h: 45, head: [29, 34], top: 5 },
  { id: 'ca', name: 'Canada – passport (50 × 70 mm)', w: 50, h: 70, head: [31, 36], top: 12 },
  { id: 'au', name: 'Australia – passport (35 × 45 mm)', w: 35, h: 45, head: [32, 36], top: 4 },
  { id: 'in', name: 'India – passport / OCI (2 × 2 in)', w: 50.8, h: 50.8, head: [25, 35], top: 5 },
  { id: 'cn', name: 'China – visa (33 × 48 mm)', w: 33, h: 48, head: [28, 33], top: 5 },
  { id: 'jp', name: 'Japan – passport (35 × 45 mm)', w: 35, h: 45, head: [32, 36], top: 4 },
  { id: 'g3545', name: 'Standard 35 × 45 mm', w: 35, h: 45, head: [30, 36], top: 4 },
  { id: 'g4060', name: 'Standard 40 × 60 mm (4 × 6 cm)', w: 40, h: 60, head: [36, 44], top: 6 },
  { id: 'g3040', name: 'Standard 30 × 40 mm (3 × 4 cm)', w: 30, h: 40, head: [25, 30], top: 4 },
  { id: 'g2535', name: 'Small 25 × 35 mm', w: 25, h: 35, head: [21, 26], top: 3 },
  { id: 'custom', name: 'My own size… (Pro)', custom: true },
];
const PAPERS = [
  { id: '4x6', name: '4 × 6 in photo paper', w: 101.6, h: 152.4 },
  { id: '5x7', name: '5 × 7 in photo paper', w: 127, h: 177.8 },
  { id: 'a4', name: 'A4', w: 210, h: 297 },
  { id: 'letter', name: 'Letter', w: 215.9, h: 279.4 },
  { id: 'l', name: 'L size (89 × 127 mm)', w: 89, h: 127 },
  { id: 'a6', name: 'A6 / 10 × 15 cm', w: 105, h: 148 },
  { id: 'custom', name: 'My own size… (Pro)', custom: true },
];
const PHOTO_PPM = 600 / 25.4, SHEET_PPM = 300 / 25.4;
const num = (v, lo, hi, d) => { const n = parseFloat(String(v).replace(',', '.')); return isFinite(n) && n >= lo && n <= hi ? n : d; };

let st = { spec: 'us', cw: 35, ch: 45, paper: '4x6', pw: 100, ph: 150, copies: 0, guides: true };
try { Object.assign(st, JSON.parse(localStorage.getItem('truepass') || '{}')); } catch (_) {}
const saveSt = () => { try { localStorage.setItem('truepass', JSON.stringify(st)); } catch (_) {} };
function spec() {
  const s = SPECS.find((x) => x.id === st.spec) || SPECS[0];
  if (!s.custom) return s;
  const w = num(st.cw, 15, 120, 35), h = num(st.ch, 15, 160, 45);
  return { id: 'custom', custom: true, name: `${w} × ${h} mm`, w, h, head: [h * 0.68, h * 0.8], top: h * 0.09 };
}
function paper() {
  const p = PAPERS.find((x) => x.id === st.paper) || PAPERS[0];
  return p.custom ? { id: 'custom', custom: true, w: num(st.pw, 50, 450, 100), h: num(st.ph, 50, 650, 150) } : p;
}

// ---------- photo + placement ----------
let img = null;            // ImageBitmap or canvas
let t = { z: 1, ox: 0, oy: 0, rot: 0, bri: 100, con: 100, white: 0 }; // z = mm per image pixel, ox/oy = image centre offset in mm
let tab = 'photo';
const minZoom = () => { const s = spec(); return Math.max(s.w / img.width, s.h / img.height); };
function resetPlacement() { t = { z: minZoom(), ox: 0, oy: 0, rot: 0, bri: 100, con: 100, white: 0 }; }
function clampPlacement() {
  const s = spec(); t.z = Math.max(minZoom(), Math.min(minZoom() * 8, t.z));
  const mx = Math.max(0, (img.width * t.z - s.w) / 2), my = Math.max(0, (img.height * t.z - s.h) / 2);
  t.ox = Math.max(-mx, Math.min(mx, t.ox)); t.oy = Math.max(-my, Math.min(my, t.oy));
}

// whiten: flood from the top and side edges through pixels close to the wall colour
function whiten(ctx, W, H, amount) {
  if (!amount) return;
  const im = ctx.getImageData(0, 0, W, H), d = im.data, tol = 14 + amount * 0.9, tol2 = tol * tol;
  let r = 0, g = 0, b = 0, n = 0; const patch = Math.max(2, Math.round(W * 0.06));
  for (let y = 0; y < patch; y++) for (const x0 of [0, W - patch]) for (let x = x0; x < x0 + patch; x++) { const i = (y * W + x) * 4; r += d[i]; g += d[i + 1]; b += d[i + 2]; n++; }
  r /= n; g /= n; b /= n;
  const dist2 = (i) => { const a = d[i] - r, c = d[i + 1] - g, e = d[i + 2] - b; return a * a + c * c + e * e; };
  const seen = new Uint8Array(W * H), stack = [];
  const push = (x, y) => { const p = y * W + x; if (!seen[p] && dist2(p * 4) <= tol2) { seen[p] = 1; stack.push(p); } };
  for (let x = 0; x < W; x++) push(x, 0);
  for (let y = 0; y < Math.round(H * 0.85); y++) { push(0, y); push(W - 1, y); }
  while (stack.length) {
    const p = stack.pop(), x = p % W, y = (p - x) / W;
    if (x > 0) push(x - 1, y); if (x < W - 1) push(x + 1, y); if (y > 0) push(x, y - 1); if (y < H - 1) push(x, y + 1);
  }
  for (let p = 0; p < W * H; p++) if (seen[p]) {
    const i = p * 4, k = Math.sqrt(dist2(i)) / tol, a = k < 0.6 ? 1 : 1 - (k - 0.6) / 0.4 * 0.5;
    d[i] += (255 - d[i]) * a; d[i + 1] += (255 - d[i + 1]) * a; d[i + 2] += (255 - d[i + 2]) * a;
  }
  ctx.putImageData(im, 0, 0);
}
function renderPhoto(W, H) { // the finished photo at W × H pixels – nothing else is ever drawn on it
  const s = spec(), c = document.createElement('canvas'); c.width = W; c.height = H;
  const ctx = c.getContext('2d', { willReadFrequently: true }), ppm = W / s.w;
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H);
  ctx.imageSmoothingQuality = 'high';
  ctx.filter = `brightness(${t.bri}%) contrast(${t.con}%)`;
  ctx.translate(W / 2 + t.ox * ppm, H / 2 + t.oy * ppm); ctx.rotate(t.rot * Math.PI / 180); ctx.scale(t.z * ppm, t.z * ppm);
  ctx.drawImage(img, -img.width / 2, -img.height / 2);
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.filter = 'none';
  whiten(ctx, W, H, t.white);
  return c;
}
function photoPixels() { const s = spec(); return s.px ? s.px : [Math.round(s.w * PHOTO_PPM), Math.round(s.h * PHOTO_PPM)]; }

// ---------- print sheet ----------
function sheetLayout() { // try roomy margins first; fall back to tight ones when that fits more photos (e.g. six 2×2 in on 4×6 in)
  const s = spec(), p = paper();
  let best = null;
  const small = Math.max(p.w, p.h) <= 180; // photo paper: borderless layouts are normal there; big office paper keeps margins and the ruler
  for (const [margin, gap, ruler] of (small ? [[5, 2, 9], [0, 0, 0]] : [[5, 2, 9]])) for (const [pw, ph] of [[p.w, p.h], [p.h, p.w]]) {
    const cols = Math.max(0, Math.floor((pw - 2 * margin + gap + 0.01) / (s.w + gap))), rows = Math.max(0, Math.floor((ph - 2 * margin - ruler + gap + 0.01) / (s.h + gap)));
    if (!best || cols * rows > best.n) best = { pw, ph, cols, rows, n: cols * rows, margin, gap, ruler };
  }
  const n = st.copies ? Math.min(st.copies, best.n) : best.n;
  return { ...best, n, s };
}
function renderSheet(ppm) {
  const L = sheetLayout(), c = document.createElement('canvas'); c.width = Math.round(L.pw * ppm); c.height = Math.round(L.ph * ppm);
  const ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
  if (!L.n) return { c, L };
  const pw = Math.round(L.s.w * ppm), ph = Math.round(L.s.h * ppm), photo = renderPhoto(pw, ph);
  const gridW = L.cols * L.s.w + (L.cols - 1) * L.gap, x0 = (L.pw - gridW) / 2, gridH = L.rows * L.s.h + (L.rows - 1) * L.gap, y0 = L.ruler ? L.margin : (L.ph - gridH) / 2;
  ctx.strokeStyle = '#9ca3af'; ctx.lineWidth = Math.max(1, ppm * 0.12);
  for (let i = 0; i < L.n; i++) {
    const x = Math.round((x0 + (i % L.cols) * (L.s.w + L.gap)) * ppm), y = Math.round((y0 + Math.floor(i / L.cols) * (L.s.h + L.gap)) * ppm);
    ctx.drawImage(photo, x, y); ctx.strokeRect(x + 0.5, y + 0.5, pw - 1, ph - 1);
  }
  // check ruler: exactly 50 mm
  const ry = (L.ph - L.margin - 3) * ppm, rx = ((L.pw - 50) / 2) * ppm;
  if (L.ruler && L.pw >= 60) {
    ctx.strokeStyle = '#111'; ctx.fillStyle = '#111'; ctx.lineWidth = Math.max(1, ppm * 0.15);
    ctx.beginPath(); ctx.moveTo(rx, ry); ctx.lineTo(rx + 50 * ppm, ry);
    for (let m = 0; m <= 50; m += 5) { ctx.moveTo(rx + m * ppm, ry); ctx.lineTo(rx + m * ppm, ry - (m % 10 ? 1.2 : 2.2) * ppm); }
    ctx.stroke();
    ctx.font = `${2.4 * ppm}px Segoe UI, Arial, sans-serif`; ctx.textAlign = 'center';
    ctx.fillText('Check: this line is exactly 50 mm (1.97 in)', L.pw * ppm / 2, ry + 2.8 * ppm);
  }
  return { c, L };
}

// ---------- JPEG with the right dpi written into the file ----------
function jpegBlob(canvas, dpi) {
  return new Promise((res) => canvas.toBlob(async (b) => {
    const u = new Uint8Array(await b.arrayBuffer());
    if (u[2] === 0xff && u[3] === 0xe0 && u[6] === 0x4a && u[7] === 0x46) { u[13] = 1; u[14] = dpi >> 8; u[15] = dpi & 255; u[16] = dpi >> 8; u[17] = dpi & 255; }
    res(new Blob([u], { type: 'image/jpeg' }));
  }, 'image/jpeg', 0.95));
}

// ---------- screen ----------
let toastTimer;
function toast(msg) { const el = $('toast'); el.textContent = msg; el.hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => { el.hidden = true; }, 5000); }
function download(blob, name) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 60000); toast(`Saved ${name} to your Downloads folder`); }
function viewSize() { const s = spec(), box = document.querySelector('.work'), H = Math.max(200, Math.min(box.clientHeight - 32, (box.clientWidth - 32) * s.h / s.w, 640)); return [Math.round(H * s.w / s.h), Math.round(H)]; }
let raf = 0;
function draw() { cancelAnimationFrame(raf); raf = requestAnimationFrame(drawNow); }
function drawNow() {
  if (!img) return;
  if (tab === 'sheet') {
    const { c, L } = renderSheet(4), v = $('sheetView'); v.width = c.width; v.height = c.height; v.getContext('2d').drawImage(c, 0, 0);
    return;
  }
  const [W, H] = viewSize(), s = spec(), v = $('view'), dpr = Math.min(2, window.devicePixelRatio || 1);
  const c = renderPhoto(Math.round(W * dpr), Math.round(H * dpr));
  v.width = c.width; v.height = c.height; v.style.width = W + 'px'; v.style.height = H + 'px'; v.getContext('2d').drawImage(c, 0, 0);
  const k = H / s.h, top = s.top * k, c1 = (s.top + s.head[0]) * k, c2 = (s.top + s.head[1]) * k, g = $('guides');
  g.setAttribute('viewBox', `0 0 ${W} ${H}`);
  g.innerHTML = st.guides ? `<rect x="0" y="${c1}" width="${W}" height="${c2 - c1}" fill="#22c55e" fill-opacity=".28"/><line x1="0" y1="${c1}" x2="${W}" y2="${c1}" stroke="#16a34a" stroke-width="1.5"/><line x1="0" y1="${c2}" x2="${W}" y2="${c2}" stroke="#16a34a" stroke-width="1.5"/><line x1="0" y1="${top}" x2="${W}" y2="${top}" stroke="#2563eb" stroke-width="2"/><line x1="${W / 2}" y1="0" x2="${W / 2}" y2="${H}" stroke="#2563eb" stroke-width="1" stroke-dasharray="5 5" stroke-opacity=".7"/><ellipse cx="${W / 2}" cy="${(top + (c1 + c2) / 2) / 2}" rx="${((c1 + c2) / 2 - top) * 0.37}" ry="${((c1 + c2) / 2 - top) / 2}" fill="none" stroke="#fff" stroke-width="1.5" stroke-dasharray="6 5" stroke-opacity=".85"/><text x="6" y="${top - 5}" font-size="12" fill="#2563eb" font-family="Segoe UI, Arial" font-weight="700">top of hair</text><text x="6" y="${c2 - 5}" font-size="12" fill="#15803d" font-family="Segoe UI, Arial" font-weight="700">chin in this band</text>` : '';
}
function fmtIn(mm) { return (mm / 25.4).toFixed(2).replace(/\.?0+$/, ''); }
function renderAll() {
  const s = spec(), has = !!img;
  $('empty').hidden = has; $('frame').hidden = !has || tab !== 'photo'; $('sheetView').hidden = !has || tab !== 'sheet';
  $('tabPhoto').classList.toggle('on', tab === 'photo'); $('tabSheet').classList.toggle('on', tab === 'sheet');
  $('spec').value = st.spec; $('paper').value = st.paper; $('copies').value = String(st.copies); $('showGuides').checked = st.guides;
  $('customF').hidden = st.spec !== 'custom'; $('paperF').hidden = st.paper !== 'custom';
  if (document.activeElement !== $('cw')) $('cw').value = st.cw; if (document.activeElement !== $('ch')) $('ch').value = st.ch;
  if (document.activeElement !== $('pw')) $('pw').value = st.pw; if (document.activeElement !== $('ph')) $('ph').value = st.ph;
  const [pxw, pxh] = photoPixels();
  $('specLine').textContent = `${s.w} × ${s.h} mm (${fmtIn(s.w)} × ${fmtIn(s.h)} in). Head, chin to hair: ${Math.round(s.head[0])}–${Math.round(s.head[1])} mm. Saved as ${pxw} × ${pxh} pixels. Rules change – please check the official requirements for your document.`;
  const L = sheetLayout();
  $('sheetLine').textContent = L.n ? `${L.n} photo${L.n > 1 ? 's' : ''} on this paper. When you print, choose “Actual size” or Scale 100%, then measure ${L.ruler ? 'the check line' : `one photo (it must be ${s.w} mm wide)`} with a ruler.` : 'This photo size does not fit on this paper.';
  if (has) {
    clampPlacement();
    const srcDpi = 25.4 / t.z;
    $('resLine').textContent = srcDpi < 250 ? `This photo is small (${img.width} × ${img.height}). It may look soft when printed – zoom out or use a larger photo.` : `${img.width} × ${img.height} pixels – sharp enough.`;
    $('zoom').value = String(Math.round(Math.log(t.z / minZoom()) / Math.log(8) * 1000));
    $('rot').value = String(Math.round(t.rot * 10)); $('bri').value = String(t.bri); $('con').value = String(t.con); $('white').value = String(t.white);
    draw();
  } else $('resLine').textContent = 'Tip: stand about 1.5 m from the camera, facing a window, in front of a plain light wall.';
}
async function setImage(source) {
  let bmp;
  try { bmp = source instanceof Blob ? await createImageBitmap(source, { imageOrientation: 'from-image' }) : source; }
  catch (_) { toast('This file could not be opened as a picture.'); return; }
  if (Math.max(bmp.width, bmp.height) > 5000) { // keep huge camera files responsive
    const k = 5000 / Math.max(bmp.width, bmp.height), c = document.createElement('canvas'); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
    const x = c.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(bmp, 0, 0, c.width, c.height); bmp = c;
  }
  img = bmp; tab = 'photo'; resetPlacement(); renderAll();
}

// ---------- actions ----------
async function savePhoto() {
  if (!img) { toast('Open a photo first.'); return; }
  if (spec().custom && needsPro('Your own photo size is part of Pro. The standard sizes are free.')) return;
  const [w, h] = photoPixels(), s = spec();
  download(await jpegBlob(renderPhoto(w, h), Math.round(w / s.w * 25.4)), `passport-photo-${s.w}x${s.h}mm.jpg`);
}
function sheetAllowed() {
  if (!img) { toast('Open a photo first.'); return false; }
  if (!sheetLayout().n) { toast('This photo size does not fit on this paper.'); return false; }
  return !needsPro('Print sheets are part of Pro. Saving a single photo is free, with no watermark.');
}
function printSheet() {
  if (!sheetAllowed()) return;
  const { c, L } = renderSheet(SHEET_PPM);
  $('pageRule').textContent = `@page { size: ${L.pw}mm ${L.ph}mm; margin: 0; } @media print { #printArea img { width: ${L.pw}mm; height: ${L.ph}mm; display: block; } }`;
  const im = new Image(); im.onload = () => window.print(); im.src = c.toDataURL('image/jpeg', 0.95);
  $('printArea').innerHTML = ''; $('printArea').appendChild(im);
}
async function saveSheet() {
  if (!sheetAllowed()) return;
  const { c, L } = renderSheet(SHEET_PPM);
  download(await jpegBlob(c, 300), `passport-sheet-${Math.round(L.pw)}x${Math.round(L.ph)}mm.jpg`);
}
let stream = null;
async function openCam() {
  try { stream = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 1920 }, height: { ideal: 1080 }, facingMode: 'user' } }); }
  catch (_) { toast('The camera could not be opened. Check that it is connected and allowed.'); return; }
  $('video').srcObject = stream; $('camDialog').showModal();
}
function closeCam() { if (stream) stream.getTracks().forEach((x) => x.stop()); stream = null; if ($('camDialog').open) $('camDialog').close(); }
function snap() {
  const v = $('video'); if (!v.videoWidth) return;
  const c = document.createElement('canvas'); c.width = v.videoWidth; c.height = v.videoHeight; c.getContext('2d').drawImage(v, 0, 0);
  closeCam(); setImage(c);
}

// ---------- events ----------
SPECS.forEach((s) => $('spec').add(new Option(s.name, s.id)));
PAPERS.forEach((p) => $('paper').add(new Option(p.name, p.id)));
const pick = () => { const i = $('fileIn'); i.value = ''; i.onchange = () => { if (i.files[0]) setImage(i.files[0]); }; i.click(); };
$('openBtn').onclick = $('openBig').onclick = pick;
$('camBtn').onclick = $('camBig').onclick = openCam;
$('snapBtn').onclick = snap; $('camClose').onclick = closeCam; $('camDialog').addEventListener('close', closeCam);
$('spec').onchange = () => { st.spec = $('spec').value; saveSt(); if (img) { t.z = Math.max(t.z, minZoom()); } renderAll(); };
$('paper').onchange = () => { st.paper = $('paper').value; saveSt(); renderAll(); };
$('copies').onchange = () => { st.copies = Number($('copies').value); saveSt(); renderAll(); };
[['cw', 'cw'], ['ch', 'ch'], ['pw', 'pw'], ['ph', 'ph']].forEach(([id, k]) => { $(id).oninput = () => { st[k] = $(id).value; saveSt(); renderAll(); }; });
$('showGuides').onchange = () => { st.guides = $('showGuides').checked; saveSt(); draw(); };
$('zoom').oninput = () => { if (!img) return; const z = minZoom() * Math.pow(8, $('zoom').value / 1000), k = z / t.z; t.z = z; t.ox *= k; t.oy *= k; clampPlacement(); draw(); };
$('rot').oninput = () => { t.rot = $('rot').value / 10; draw(); };
$('bri').oninput = () => { t.bri = Number($('bri').value); draw(); };
$('con').oninput = () => { t.con = Number($('con').value); draw(); };
$('white').oninput = () => { t.white = Number($('white').value); draw(); };
$('tabPhoto').onclick = () => { tab = 'photo'; renderAll(); };
$('tabSheet').onclick = () => { if (!img) { toast('Open a photo first.'); return; } tab = 'sheet'; renderAll(); };
let dragAt = null;
const fr = $('frame');
fr.addEventListener('pointerdown', (e) => { dragAt = [e.clientX, e.clientY]; fr.setPointerCapture(e.pointerId); fr.classList.add('drag'); });
fr.addEventListener('pointermove', (e) => { if (!dragAt) return; const k = spec().h / fr.clientHeight; t.ox += (e.clientX - dragAt[0]) * k; t.oy += (e.clientY - dragAt[1]) * k; dragAt = [e.clientX, e.clientY]; clampPlacement(); draw(); });
const endDrag = () => { dragAt = null; fr.classList.remove('drag'); };
fr.addEventListener('pointerup', endDrag); fr.addEventListener('pointercancel', endDrag);
fr.addEventListener('wheel', (e) => { e.preventDefault(); const k = e.deltaY < 0 ? 1.06 : 1 / 1.06, z = Math.max(minZoom(), Math.min(minZoom() * 8, t.z * k)), r = z / t.z; t.z = z; t.ox *= r; t.oy *= r; renderAll(); }, { passive: false });
document.addEventListener('dragover', (e) => e.preventDefault());
document.addEventListener('drop', (e) => { e.preventDefault(); const f = e.dataTransfer && e.dataTransfer.files[0]; if (f) setImage(f); });
window.addEventListener('resize', () => { if (img) draw(); });
$('saveBtn').onclick = savePhoto; $('printBtn').onclick = printSheet; $('saveSheetBtn').onclick = saveSheet;
$('newBtn').onclick = () => { img = null; tab = 'photo'; renderAll(); };
$('moreBtn').onclick = (e) => { e.stopPropagation(); $('menu').hidden = !$('menu').hidden; };
document.addEventListener('click', () => { $('menu').hidden = true; });
$('proBtn').onclick = () => { if (!isPro) openPro(''); };
$('buyBtn').onclick = buyPro;
$('restoreBtn').onclick = async () => { proMessage((await checkPro()) ? 'Pro is unlocked. ★' : 'No purchase was found on this Microsoft account.'); };
$('closePro').onclick = () => $('proDialog').close();

setPro(isPro);
checkPro();
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
