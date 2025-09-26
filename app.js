/* ===== Basic config ===== */
const BASE_PREVIEW_SCALE = 0.90;
const PREVIEW_MAX_WIDTH = 500;

/* ===== Supabase (config + helpers) ===== */
const SB = {
  url:            (window.SUPABASE_CFG && window.SUPABASE_CFG.url)            || '',
  anon:           (window.SUPABASE_CFG && window.SUPABASE_CFG.anon)           || '',
  bucket:         (window.SUPABASE_CFG && window.SUPABASE_CFG.bucket)         || 'signatures',
  folder:         (window.SUPABASE_CFG && window.SUPABASE_CFG.folder)         || 'avatars',
  bannersFolder:  (window.SUPABASE_CFG && window.SUPABASE_CFG.bannersFolder)  || 'banners',
};
const supabase = (SB.url && SB.anon) ? window.supabase.createClient(SB.url, SB.anon) : null;

/* ===== Image helpers (compression WebP) ===== */
const AVATAR_MAX_SIDE = 600;
const BANNER_MAX_W    = 1200;
const BANNER_MAX_H    = 600;
const WEBP_QUALITY_AVATAR = 0.86;
const WEBP_QUALITY_BANNER = 0.84;

function loadImageFromFile(file){
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = (e) => { URL.revokeObjectURL(url); reject(e); };
    img.src = url;
  });
}
function canvasToBlob(canvas, type, quality){
  return new Promise(res => canvas.toBlob(b => res(b), type, quality));
}
async function compressImage(file, {maxW, maxH, quality=0.85, prefer='image/webp'}){
  const img = await loadImageFromFile(file);
  const inW = img.naturalWidth || img.width;
  const inH = img.naturalHeight || img.height;

  let outW = inW, outH = inH;
  if (maxW || maxH){
    const rW = maxW ? maxW / inW : 1;
    const rH = maxH ? maxH / inH : 1;
    const ratio = Math.min(rW, rH, 1);
    outW = Math.max(1, Math.round(inW * ratio));
    outH = Math.max(1, Math.round(inH * ratio));
  }

  const canvas = document.createElement('canvas');
  canvas.width = outW; canvas.height = outH;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, outW, outH);

  let blob = await canvasToBlob(canvas, prefer, quality);
  if (!blob) blob = await canvasToBlob(canvas, 'image/jpeg', Math.min(0.9, quality + 0.05));
  return { blob, width: outW, height: outH };
}

function blobToFile(blob, filename){
  try { return new File([blob], filename, { type: blob.type || 'image/webp' }); }
  catch { blob.name = filename; return blob; }
}

function slugifyFilename(name='asset'){
  return name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'').slice(0,40) || 'asset';
}
function fileExt(file){ return (file.name && file.name.match(/\.\w+$/) || [''])[0] || '.jpg'; }

/* truncate middle for labels */
function truncateMiddle(str, max = 36){
  if (!str) return '';
  if (str.length <= max) return str;
  const half = Math.floor((max - 3) / 2);
  return str.slice(0, half) + '…' + str.slice(-half);
}

/** Upload → Public URL */
async function uploadToSupabaseFolder(file, folderName, userHint='user') {
  if (!supabase) throw new Error('Supabase not configured');

  const okTypes = ['image/jpeg','image/png','image/webp','image/gif'];
  const MAX_MB = 8;
  const type = file.type || 'application/octet-stream';
  if (!okTypes.includes(type)) throw new Error('Invalid format (jpg/png/webp/gif)');
  if (file.size > MAX_MB * 1024 * 1024) throw new Error(`File too large (> ${MAX_MB} MB)`);

  const id = (crypto && crypto.randomUUID) ? crypto.randomUUID() : String(Date.now());
  const base = slugifyFilename(userHint || 'user');
  const ext  = file.name && file.name.includes('.') ? ('.' + file.name.split('.').pop()) : (type === 'image/webp' ? '.webp' : fileExt(file));
  const path = `${folderName}/${base}-${id}${ext}`;

  const { error } = await supabase.storage
    .from(SB.bucket)
    .upload(path, file, {
      upsert: false,
      cacheControl: '31536000',
      contentType: type
    });
  if (error) throw error;

  const pub = supabase.storage.from(SB.bucket).getPublicUrl(path);
  return pub.data.publicUrl;
}
function showUploadError(kind, err){
  const msg = (err && (err.message || err.error || err.msg)) ? String(err.message || err.error || err.msg) : String(err);
  alert(
    `Failed to host ${kind}.\n\n` +
    `${msg}\n\n` +
    `Check: Storage bucket "${SB.bucket}" public, RLS policies (avatars/% or banners/%), and CORS (Settings → API).\n` +
    `See console for detailed logs.`
  );
}

/* ===== Brand profiles & assets ===== */
const BRAND_PROFILES = {
  lemlist: {
    key: 'lemlist', site: 'www.lemlist.com',
    colors: { separator:'#E6E6E6', name:'#213856', role:'#566F8F', site:'#98A1AC', text:'#17161B', muted:'#566F8F', accent:'#316BFF' },
    gradient: ['#316BFF','#134CDD'],
    assets: {
      logoLocal:   'icons/logo.gif',
      avatarLocal: 'icons/avatar-placeholder.png',
      bannerLocal: 'icons/banner-placeholder.png',
      logoPublic:   'logo.gif',
      avatarPublic: 'avatar-placeholder.png',
      bannerPublic: 'banner-placeholder.png',
      linkedinPublic: 'linkedin.png',
      lemcalPublic:   'lemcal.png'
    }
  },
  taplio: {
    key: 'taplio', site: 'www.taplio.com',
    colors: { separator:'#E6E6E6', name:'#213856', role:'#566F8F', site:'#9BA0AC', text:'#14121A', muted:'#566F8F', accent:'#7C4DFF' },
    gradient: ['#0568CC','#54A9FF'],
    assets: {
      logoLocal:   'icons/taplio-logo.gif',
      avatarLocal: 'icons/taplio-avatar.png',
      bannerLocal: 'icons/taplio-banner.png',
      logoPublic:   'taplio-logo.gif',
      avatarPublic: 'taplio-avatar.png',
      bannerPublic: 'taplio-banner.png',
      linkedinPublic: 'linkedin.png',
      lemcalPublic:   'lemcal.png'
    }
  }
};
const PUBLIC_ASSET_BASE = 'https://bertranddvs.github.io/email-signature-generator/icons/';
const ASSET_VERSION = '2025-09-22-01';

let CURRENT_BRAND = BRAND_PROFILES.lemlist;
let THEME = { colors: CURRENT_BRAND.colors, site: CURRENT_BRAND.site };
let PUBLIC_ASSETS_CURRENT = mapPublicAssets(CURRENT_BRAND);

const LINKEDIN_FALLBACK = rectSVG(40, 40, '#0A66C2', 'in');
const LEMCAL_FALLBACK   = rectSVG(40, 40, '#316BFF', 'cal');
const PLACEHOLDER_AVATAR = rectSVG(89, 89, '#E9EEF2', 'Photo');
const PLACEHOLDER_BANNER = rectSVG(600, 120, '#DDEEE8', 'Banner');

const ASSETS = { linkedin: 'icons/linkedin.png', lemcal: 'icons/lemcal.png' };

let LOGO_SRC           = CURRENT_BRAND.assets.logoLocal;
let ICON_LINKEDIN_SRC  = ASSETS.linkedin;
let ICON_LEMCAL_SRC    = ASSETS.lemcal;
let AVATAR_DEFAULT_SRC = CURRENT_BRAND.assets.avatarLocal;
let BANNER_DEFAULT_SRC = CURRENT_BRAND.assets.bannerLocal;

/* ===== DOM ===== */
const $ = (sel) => document.querySelector(sel);
const byId = (id) => document.getElementById(id);

const inputs = {
  name: byId('name'),
  role: byId('role'),
  email: byId('email'),
  phone: byId('phone'),
  linkedin: byId('linkedin'),
  linkedinToggle: byId('linkedinToggle'),
  lemcal: byId('lemcal'),
  lemcalToggle: byId('lemcalToggle'),
  avatarFile: byId('avatarFile'),
  bannerFile: byId('bannerFile'),
  bannerToggle: byId('bannerToggle'),
};

const fileBtns = { avatar: byId('avatarBtn'), banner: byId('bannerBtn') };
const clearBtns = { avatar: byId('avatarClear'), banner: byId('bannerClear') };
const fileWrappers = {
  avatar: document.querySelector('.file-input[data-kind="avatar"]'),
  banner: document.querySelector('.file-input[data-kind="banner"]'),
};
const fileLabels = {
  avatar: fileWrappers.avatar?.querySelector('.file-label'),
  banner: fileWrappers.banner?.querySelector('.file-label'),
};
/* inline error (unused now but kept) */
const errors = { avatar: document.getElementById('avatarError') };

const els  = { previewCard: byId('previewCard'), preview: byId('signaturePreview') };
const btns = { copyGmail: byId('copyGmail'), openGmail: byId('openGmail') };

/* ===== Utils (non-image) ===== */
function rectSVG(w, h, color, label) {
  const fontSize = 14;
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}' viewBox='0 0 ${w} ${h}'>` +
    `<rect width='100%' height='100%' rx='6' fill='${color}'/>` +
    (label ? `<text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' font-family='Arial,Helvetica,sans-serif' font-size='${fontSize}' fill='#5B6B7D'>${label}</text>` : ``) +
    `</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
function fileToDataURL(file) {
  return new Promise((res, rej) => {
    if (!file) return res(null);
    const reader = new FileReader();
    reader.onload = () => res(reader.result);
    reader.onerror = (e) => rej(e);
    reader.readAsDataURL(file);
  });
}
function toTelHref(raw='') {
  const trimmed = raw.trim();
  const plus = trimmed.startsWith('+') ? '+' : '';
  const digits = trimmed.replace(/[^\d]/g, '');
  return `tel:${plus}${digits}`;
}
function escapeHtml(str=''){
  return str.replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));
}
function wrapForGmail(innerHTML){
  return `<!-- signature --><div style="text-align:left">${innerHTML}</div>`;
}
async function copyHtmlToClipboard(html, plainTextFallback = '') {
  if (window.ClipboardItem && navigator.clipboard?.write) {
    const data = new ClipboardItem({
      'text/html': new Blob([html], { type: 'text/html' }),
      'text/plain': new Blob([plainTextFallback || html.replace(/<[^>]+>/g,'')], { type: 'text/plain' }),
    });
    await navigator.clipboard.write([data]);
    return;
  }
  await navigator.clipboard.writeText(plainTextFallback || html);
}

/* ===== UI helpers upload ===== */
function setFileUI(kind, fileName){
  const wrap = fileWrappers[kind];
  const btn  = (kind === 'avatar') ? fileBtns.avatar : fileBtns.banner;
  const labelEl = fileLabels[kind];
  if (!wrap || !btn || !labelEl) return;

  if (fileName){
    const truncated = truncateMiddle(fileName, 36);
    labelEl.textContent = truncated;
    labelEl.title = fileName;
    btn.classList.add('used');
    wrap.classList.add('has-file');
  } else {
    const placeholder = (kind === 'banner') ? 'Upload banner' : 'Upload photo';
    labelEl.textContent = placeholder;
    labelEl.title = placeholder;
    btn.classList.remove('used');
    wrap.classList.remove('has-file');
  }
}

/* ===== Public assets mapping ===== */
function mapPublicAssets(profile){
  const q = ASSET_VERSION ? `?v=${encodeURIComponent(ASSET_VERSION)}` : '';
  return {
    logo:     PUBLIC_ASSET_BASE + profile.assets.logoPublic     + q,
    avatar:   PUBLIC_ASSET_BASE + profile.assets.avatarPublic   + q,
    banner:   PUBLIC_ASSET_BASE + profile.assets.bannerPublic   + q,
    linkedin: PUBLIC_ASSET_BASE + profile.assets.linkedinPublic + q,
    lemcal:   PUBLIC_ASSET_BASE + profile.assets.lemcalPublic   + q
  };
}

/* ===== Sanitize src for export ===== */
function sanitizeSrcForEmail(src, kind) {
  const q = ASSET_VERSION ? `?v=${encodeURIComponent(ASSET_VERSION)}` : '';
  if (src && /^https:\/\//i.test(src)) {
    try {
      const u = new URL(src);
      if (u.hostname.includes('github.io') && ASSET_VERSION && !u.searchParams.has('v')) {
        u.searchParams.set('v', ASSET_VERSION);
        return u.toString();
      }
    } catch {}
    return src;
  }
  if (kind && PUBLIC_ASSETS_CURRENT[kind]) return PUBLIC_ASSETS_CURRENT[kind];
  const file = String(src || '').split('/').pop();
  return PUBLIC_ASSET_BASE + file + q;
}

/* ===== State ===== */
const imageCache = {
  avatar: AVATAR_DEFAULT_SRC || PLACEHOLDER_AVATAR,
  banner: BANNER_DEFAULT_SRC || PLACEHOLDER_BANNER,
};
function collectState() {
  const name = inputs.name.value.trim();
  const role = inputs.role.value.trim();
  const email = inputs.email.value.trim();
  const phone = inputs.phone.value.trim();

  const linkedin = inputs.linkedin.value.trim();
  const linkedinEnabled = !!inputs.linkedinToggle.checked && !!linkedin;

  const lemcal = inputs.lemcal.value.trim();
  const lemcalEnabled = !!inputs.lemcalToggle.checked && !!lemcal;

  const bannerEnabled = !!(inputs.bannerToggle ? inputs.bannerToggle.checked : true);

  return {
    name, role, email, phone,
    linkedin, linkedinEnabled,
    lemcal, lemcalEnabled,
    avatar: imageCache.avatar,
    logo: LOGO_SRC || rectSVG(100, 28, THEME.colors.accent, CURRENT_BRAND.key),
    banner: imageCache.banner,
    bannerEnabled,
  };
}

/* ===== Email HTML ===== */
function buildEmailHTML(state, { align = 'center' } = {}) {
  const {
    name, role, email, phone,
    linkedin, linkedinEnabled,
    lemcal, lemcalEnabled,
    avatar, logo, banner, bannerEnabled
  } = state;

  const C = THEME.colors;
  const SITE = THEME.site;

  const linkedinCell = linkedinEnabled ? `
    <a href="${escapeHtml(linkedin)}" style="display:inline-block; text-decoration:none; line-height:0;">
      <img src="${ICON_LINKEDIN_SRC || LINKEDIN_FALLBACK}" width="40" height="40" alt="LinkedIn" style="display:block; border:0; outline:none; text-decoration:none;">
    </a>` : '';

  const lemcalCell = lemcalEnabled ? `
    <a href="${escapeHtml(lemcal)}" style="display:inline-block; text-decoration:none; line-height:0;">
      <img src="${ICON_LEMCAL_SRC || LEMCAL_FALLBACK}" width="40" height="40" alt="Lemcal" style="display:block; border:0; outline:none; text-decoration:none;">
    </a>` : '';

  const phoneRow = phone ? `<tr><td style="padding:0;"><a href="${toTelHref(phone)}" style="color:${C.muted}; text-decoration:none;">${escapeHtml(phone)}</a></td></tr>` : '';
  const emailRow = email ? `<tr><td style="padding:0;"><a href="mailto:${escapeHtml(email)}" style="color:${C.muted}; text-decoration:none;">${escapeHtml(email)}</a></td></tr>` : '';

  const rightIcons = (linkedinEnabled || lemcalEnabled) ? `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="white-space:nowrap; font-size:0; line-height:0;">
      <tbody>
        <tr>
          ${linkedinEnabled ? `<td style="padding-left:12px; vertical-align:middle;">${linkedinCell}</td>` : ''}
          ${lemcalEnabled ? `<td style="padding-left:12px; vertical-align:middle;">${lemcalCell}</td>` : ''}
        </tr>
      </tbody>
    </table>` : '';

  const bannerBlock = bannerEnabled ? `
    <tr><td style="height:16px;"></td></tr>
    <tr>
      <td align="${align === 'left' ? 'left' : 'center'}">
        <img src="${banner}" alt="Banner" style="display:block; width:100%; max-width:${PREVIEW_MAX_WIDTH}px; height:auto; border-radius:8px;" />
      </td>
    </tr>` : '';

  const contentRows = `
    <!-- HEADER -->
    <tr>
      <td>
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%; font-size:0;">
          <tbody>
            <tr>
              <td valign="top" style="vertical-align:top; font-size:16px;">
                <div style="font-size:18px; font-weight:800; color:${C.name}; line-height:1.2;">${escapeHtml(name)}</div>
                <div style="font-size:14px; color:${C.role}; line-height:1.5;">${escapeHtml(role)}</div>
              </td>
              <td valign="top" align="right" style="text-align:right; white-space:nowrap;">
                <a href="https://${SITE}" target="_blank" style="text-decoration:none; display:inline-block;">
                  <img src="${logo}" alt="Logo" style="display:block; height:28px; border:0; outline:none; text-decoration:none;" />
                </a>
              </td>
            </tr>
            <tr>
              <td colspan="2" style="padding-top:12px;">
                <div style="height:1px; background:${C.separator};"></div>
              </td>
            </tr>
          </tbody>
        </table>
      </td>
    </tr>

    <!-- INFOS -->
    <tr>
      <td style="padding-top:16px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;">
          <tbody>
            <tr>
              <td valign="middle">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                  <tbody>
                    <tr>
                      <td valign="middle">
                        <img src="${avatar}" width="89" height="89" alt="${escapeHtml(name)}" style="display:block; border-radius:6px;" />
                      </td>
                      <td style="width:16px;"></td>
                      <td valign="middle">
                        <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="font-size:13px; color:${C.muted}; line-height:1.7;">
                          <tbody>
                            ${phoneRow}
                            ${emailRow}
                            <tr><td><a href="https://${SITE}" style="color:${C.site}; text-decoration:none;">${SITE}</a></td></tr>
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </td>
              <td valign="middle" align="right" style="white-space:nowrap; padding-left:12px;">
                ${rightIcons}
              </td>
            </tr>
          </tbody>
        </table>
      </td>
    </tr>

    ${bannerBlock}
  `;

  if (align === 'left') {
    return `
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse; mso-table-lspace:0pt; mso-table-rspace:0pt;">
  <tbody><tr>
    <td align="left" style="padding:0; margin:0;">
      <!--[if mso]><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="${PREVIEW_MAX_WIDTH}"><tr><td><![endif]-->
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="left"
             style="border-collapse:collapse; mso-table-lspace:0pt; mso-table-rspace:0pt;
                    color:${C.text}; font-family:Arial,Helvetica,sans-serif;
                    width:100%; max-width:${PREVIEW_MAX_WIDTH}px;">
        <tbody>${contentRows}</tbody>
      </table>
      <!--[if mso]></td></tr></table><![endif]-->
    </td>
  </tr></tbody>
</table>`.trim();
  }

  return `
<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center"
       style="border-collapse:collapse; mso-table-lspace:0pt; mso-table-rspace:0pt;
              color:${C.text}; font-family:Arial,Helvetica,sans-serif;
              max-width:${PREVIEW_MAX_WIDTH}px; width:100%;">
  <tbody>${contentRows}</tbody>
</table>`.trim();
}

/* ===== Export ===== */
function buildEmailHTMLForExport(state, opts) {
  const safeState = {
    ...state,
    logo:   sanitizeSrcForEmail(state.logo,   'logo'),
    avatar: sanitizeSrcForEmail(state.avatar, 'avatar'),
    banner: sanitizeSrcForEmail(state.banner, 'banner'),
  };

  const _iconLinkedin = ICON_LINKEDIN_SRC;
  const _iconLemcal   = ICON_LEMCAL_SRC;

  ICON_LINKEDIN_SRC = sanitizeSrcForEmail(ICON_LINKEDIN_SRC || LINKEDIN_FALLBACK, 'linkedin');
  ICON_LEMCAL_SRC   = sanitizeSrcForEmail(ICON_LEMCAL_SRC   || LEMCAL_FALLBACK,   'lemcal');

  const html = buildEmailHTML(safeState, opts);

  ICON_LINKEDIN_SRC = _iconLinkedin;
  ICON_LEMCAL_SRC   = _iconLemcal;

  return html;
}

/* ===== Preview ===== */
function renderPreview() {
  const state = collectState();
  els.preview.innerHTML = buildEmailHTML(state, { align: 'center' });

  const card = els.previewCard;
  card.style.maxWidth = PREVIEW_MAX_WIDTH + 'px';
  card.style.transformOrigin = 'top left';

  requestAnimationFrame(() => {
    const wrapRect = document.getElementById('previewInner').getBoundingClientRect();
    const cardRect = card.getBoundingClientRect();
    const scale = Math.min(
      BASE_PREVIEW_SCALE,
      (wrapRect.width - 28) / (cardRect.width || PREVIEW_MAX_WIDTH),
      (wrapRect.height - 28) / ((cardRect.height || 1) + 1)
    );
    card.style.transform = `scale(${Math.max(scale, 0.5)})`;
  });
}

/* ===== Brand switching ===== */
function applyBrand(key){
  const prof = BRAND_PROFILES[key] || BRAND_PROFILES.lemlist;
  CURRENT_BRAND = prof;
  THEME = { colors: prof.colors, site: prof.site };
  PUBLIC_ASSETS_CURRENT = mapPublicAssets(prof);

  document.documentElement.style.setProperty('--accent', prof.colors.accent);
  document.documentElement.style.setProperty('--grad-start', prof.gradient[0]);
  document.documentElement.style.setProperty('--grad-end',   prof.gradient[1]);

  LOGO_SRC           = prof.assets.logoLocal;
  AVATAR_DEFAULT_SRC = prof.assets.avatarLocal;
  BANNER_DEFAULT_SRC = prof.assets.bannerLocal;

  inputs.avatarFile.value = '';
  inputs.bannerFile.value = '';
  imageCache.avatar = AVATAR_DEFAULT_SRC || PLACEHOLDER_AVATAR;
  imageCache.banner = BANNER_DEFAULT_SRC || PLACEHOLDER_BANNER;
  setFileUI('avatar', null);
  setFileUI('banner', null);

  const btnL = document.getElementById('brandLemlist');
  const btnT = document.getElementById('brandTaplio');
  if (btnL && btnT){
    btnL.classList.toggle('is-active', key === 'lemlist');
    btnT.classList.toggle('is-active', key === 'taplio');
    btnL.setAttribute('aria-selected', key === 'lemlist' ? 'true':'false');
    btnT.setAttribute('aria-selected', key === 'taplio' ? 'true':'false');
  }

  renderPreview();
}

/* ====== Image Cropper (vanilla + slider) ====== */
(function(){
  const loadImage = (fileOrUrl) => new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    if (fileOrUrl instanceof File || fileOrUrl instanceof Blob) {
      const url = URL.createObjectURL(fileOrUrl);
      img.src = url;
      img._revoke = () => URL.revokeObjectURL(url);
    } else if (typeof fileOrUrl === 'string') {
      img.src = fileOrUrl;
    } else {
      reject(new Error('Unsupported image source'));
    }
  });

  class SimpleCropper {
    constructor(){
      this.modal = document.getElementById('imgCropperModal');
      this.canvas = document.getElementById('cropperCanvas');
      this.ctx = this.canvas.getContext('2d', { alpha:false, desynchronized:true });
      this.overlay = this.modal.querySelector('.crop-box');
      this.btns = this.modal.querySelectorAll('[data-act]');
      this.closeBtn = this.modal.querySelector('.cropper-close');
      this.zoomSlider = document.getElementById('zoomSlider');
      this.resetBtn   = this.modal.querySelector('[data-act="reset"]');

      this.img = null; this.scale = 1; this.tx = 0; this.ty = 0; this.angle = 0;
      this.minScale = .1; this.maxScale = 20;
      this.pointer = { dragging:false, x:0, y:0 };
      this.cropRatio = 1; this.lockRatio = true;

      this.onWheel = this.onWheel.bind(this);
      this.onPointerDown = this.onPointerDown.bind(this);
      this.onPointerMove = this.onPointerMove.bind(this);
      this.onPointerUp = this.onPointerUp.bind(this);
      this.resizeObserver = new ResizeObserver(()=>this.fitToView());

      this.canvas.addEventListener('wheel', this.onWheel, { passive:false });
      this.canvas.addEventListener('pointerdown', this.onPointerDown);
      window.addEventListener('pointerup', this.onPointerUp);
      window.addEventListener('pointercancel', this.onPointerUp);
      this.btns.forEach(b=>b.addEventListener('click', (e)=>this.onAction(e.currentTarget.dataset.act)));
      this.closeBtn.addEventListener('click', ()=>{ this._resolver?.({cancelled:true}); this.hide(); });

      this.zoomSlider?.addEventListener('input', ()=>{ this.setScale(parseFloat(this.zoomSlider.value)); });
      this.resetBtn?.addEventListener('click', ()=> this.reset());

      this.resizeObserver.observe(this.canvas);
    }

    async open(fileOrUrl, { exportSize=512, ratio=1, lockRatio=true } = {}){
      this._exportSize = exportSize;
      this.cropRatio = eval(String(ratio));
      this.lockRatio = !!lockRatio;

      this.modal.setAttribute('aria-hidden','false');
      this.modal.style.display = 'flex';

      this.img = await loadImage(fileOrUrl);
      this.angle = 0; this.scale = 1;

      // Canvas sizing
      const cw = this.canvas.clientWidth, ch = this.canvas.clientHeight;
      this.canvas.width = Math.round(cw * devicePixelRatio);
      this.canvas.height = Math.round(ch * devicePixelRatio);

      // Center image on white area (canvas center)
      const cx = this.canvas.width/2, cy = this.canvas.height/2;
      this.tx = cx; this.ty = cy;

      this.positionCropBox();
      this.fitToView(true);
      this.render();

      const onKey = (e)=>{
        if (e.key === 'Escape') { this._resolver?.({ cancelled:true }); this.hide(); }
        if (e.key === '+' || (e.key === '=' && e.shiftKey)) this.zoom(1.1);
        if (e.key === '-') this.zoom(1/1.1);
      };
      this._keyHandler = onKey;
      window.addEventListener('keydown', onKey);

      return new Promise((resolve)=>{ this._resolver = resolve; });
    }

    hide(){
      this.modal.setAttribute('aria-hidden','true');
      this.modal.style.display = 'none';
      window.removeEventListener('keydown', this._keyHandler);
      if (this.img && this.img._revoke) this.img._revoke();
      this.img = null;
    }

    onAction(act){
      switch(act){
        case 'confirm': this.exportCropped().then(p=>{ this._resolver?.(p); this.hide(); }); break;
        case 'reset': this.reset(); break;
      }
    }

    positionCropBox(){
      const wrap = this.canvas.getBoundingClientRect();
      const W = wrap.width, H = wrap.height, r = this.cropRatio;

      // 76% of the visible area, centered
      let cw = Math.min(W, H * r) * 0.76;
      let ch = cw / r;
      if (ch > H * 0.86){ ch = H * 0.86; cw = ch * r; }

      const left = (W - cw)/2, top = (H - ch)/2;
      Object.assign(this.overlay.style, {
        width:`${cw}px`, height:`${ch}px`, left:`${left}px`, top:`${top}px`,
        borderRadius: r === 1 ? '8px' : '8px'
      });
    }

    fitToView(reset=false){
      if (!this.img) return;
      const cw = this.canvas.clientWidth, ch = this.canvas.clientHeight;
      this.canvas.width = Math.round(cw * devicePixelRatio);
      this.canvas.height = Math.round(ch * devicePixelRatio);

      const box = this.overlay.getBoundingClientRect();
      const wrap = this.canvas.getBoundingClientRect();
      const cropW = box.width, cropH = box.height;

      const iw = this.img.width, ih = this.img.height;
      const s = Math.max(cropW/iw, cropH/ih) * 1.02; // cover the crop box slightly

      if (reset){
        this.scale = s;
        const cx = this.canvas.width/2, cy = this.canvas.height/2;
        this.tx = cx; this.ty = cy;
        this.angle = 0;
      }

      this.syncZoomSlider();
      this.render();
    }

    reset(){
      this.fitToView(true);
      this.render();
    }

    setScale(next){
      next = Math.min(this.maxScale, Math.max(this.minScale, next));
      // keep zoom centered on canvas center
      this.scale = next;
      this.render();
    }

    syncZoomSlider(){
      if (!this.zoomSlider) return;
      const min = parseFloat(this.zoomSlider.min || '2');
      const max = parseFloat(this.zoomSlider.max || '3');
      const v = Math.max(min, Math.min(max, this.scale));
      this.zoomSlider.value = v.toFixed(2);
    }

    zoom(f){
      const prev = this.scale;
      let next = Math.min(this.maxScale, Math.max(this.minScale, prev * f));
      this.scale = next;
      this.syncZoomSlider();
      this.render();
    }

    onWheel(e){ e.preventDefault(); this.zoom((Math.sign(e.deltaY)>0)?1/1.08:1.08); }
    onPointerDown(e){
      this.pointer.dragging=true; this.pointer.x=e.clientX; this.pointer.y=e.clientY;
      this.canvas.parentNode.classList.add('dragging');
      this.canvas.setPointerCapture?.(e.pointerId);
      this.canvas.addEventListener('pointermove', this.onPointerMove);
    }
    onPointerMove(e){
      if(!this.pointer.dragging) return;
      const dx=(e.clientX-this.pointer.x)*devicePixelRatio, dy=(e.clientY-this.pointer.y)*devicePixelRatio;
      this.pointer.x=e.clientX; this.pointer.y=e.clientY;
      this.tx+=dx; this.ty+=dy; this.render();
    }
    onPointerUp(e){
      this.pointer.dragging=false; this.canvas.parentNode.classList.remove('dragging');
      this.canvas.releasePointerCapture?.(e.pointerId);
      this.canvas.removeEventListener('pointermove', this.onPointerMove);
    }

    render(){
      if(!this.img) return;
      const ctx=this.ctx, cw=this.canvas.width, ch=this.canvas.height;
      ctx.save(); ctx.clearRect(0,0,cw,ch); ctx.fillStyle='#fff'; ctx.fillRect(0,0,cw,ch);
      const cx=cw/2, cy=ch/2;
      // draw image centered at (tx,ty) in canvas pixel space
      ctx.translate(this.tx, this.ty);
      ctx.rotate(this.angle);
      ctx.scale(this.scale, this.scale);
      ctx.drawImage(this.img, -this.img.width/2, -this.img.height/2);
      ctx.restore();
    }

    async exportCropped(){
      const box=this.overlay.getBoundingClientRect(), wrap=this.canvas.getBoundingClientRect();
      const L=(box.left-wrap.left)*devicePixelRatio, T=(box.top-wrap.top)*devicePixelRatio;
      const W=box.width*devicePixelRatio, H=box.height*devicePixelRatio;

      // render the transformed scene to an offscreen canvas
      const off=document.createElement('canvas'); off.width=this.canvas.width; off.height=this.canvas.height;
      const o=off.getContext('2d',{alpha:false}); o.fillStyle='#fff'; o.fillRect(0,0,off.width,off.height);
      o.save();
      o.translate(this.tx, this.ty);
      o.rotate(this.angle);
      o.scale(this.scale,this.scale);
      o.drawImage(this.img, -this.img.width/2, -this.img.height/2);
      o.restore();

      // crop the selection
      const crop = o.getImageData(L,T,W,H);

      // scale to export size (square for avatar by default)
      const size = Math.max(64, parseInt(this._exportSize || 512, 10));
      const outW = size;
      const outH = Math.round(size / this.cropRatio);

      const out=document.createElement('canvas'); out.width=outW; out.height=outH;
      const outCtx=out.getContext('2d',{alpha:false});
      const tmp=document.createElement('canvas'); tmp.width=W; tmp.height=H;
      tmp.getContext('2d').putImageData(crop,0,0);
      outCtx.fillStyle='#fff'; outCtx.fillRect(0,0,outW,outH);
      outCtx.imageSmoothingQuality = 'high';
      outCtx.drawImage(tmp, 0,0, outW,outH);

      const blob = await new Promise(res=>out.toBlob(res,'image/png',0.92));
      const dataURL = out.toDataURL('image/png');
      return { blob, dataURL, width: outW, height: outH };
    }
  }

  const __cropper = new SimpleCropper();
  window.openImageEditor = (fileOrUrl, options) => __cropper.open(fileOrUrl, options || {});
})();

/* ===== File inputs ===== */
fileBtns.avatar.addEventListener('click', () => inputs.avatarFile.click());
fileBtns.banner.addEventListener('click', () => inputs.bannerFile.click());

/* --- AVATAR via editor (locked 1:1) --- */
inputs.avatarFile.addEventListener('change', async (e) => {
  const f = e.target.files?.[0];

  if (errors.avatar) errors.avatar.hidden = true;

  if (!f) {
    imageCache.avatar = AVATAR_DEFAULT_SRC || PLACEHOLDER_AVATAR;
    setFileUI('avatar', null);
    renderPreview();
    return;
  }

  // open editor (1:1 locked)
  const edit = await window.openImageEditor(f, { exportSize: 512, ratio: 1, lockRatio: true });
  if (edit?.cancelled) {
    inputs.avatarFile.value = '';
    return;
  }

  // local preview (cropped PNG)
  imageCache.avatar = edit.dataURL;
  setFileUI('avatar', f.name);
  renderPreview();

  // compress + upload (WebP)
  try {
    const pngFile = new File([edit.blob], 'avatar-cropped.png', { type: 'image/png' });
    const { blob } = await compressImage(pngFile, {
      maxW: AVATAR_MAX_SIDE, maxH: AVATAR_MAX_SIDE,
      quality: WEBP_QUALITY_AVATAR, prefer: 'image/webp'
    });

    const newName = `${slugifyFilename(inputs.name?.value || 'user')}-avatar.webp`;
    const webpFile = blobToFile(blob, newName);

    const hostedUrl = await uploadToSupabaseFolder(webpFile, SB.folder, inputs.name?.value || 'user');
    imageCache.avatar = hostedUrl;
    renderPreview();
  } catch (err) {
    console.error('[Avatar upload failed]', err);
    showUploadError('avatar', err);
  }
});

/* --- BANNER via editor (locked 500x160 ratio) --- */
inputs.bannerFile.addEventListener('change', async (e) => {
  const f = e.target.files?.[0];
  if (!f) {
    imageCache.banner = BANNER_DEFAULT_SRC || PLACEHOLDER_BANNER;
    setFileUI('banner', null);
    renderPreview();
    return;
  }

  // target ratio 500:100 ≈ 3.125
  const R = 500/100;
  const edit = await window.openImageEditor(f, { exportSize: 1000, ratio: R, lockRatio: true });
  if (edit?.cancelled) {
    inputs.bannerFile.value = '';
    return;
  }

  // local preview
  imageCache.banner = edit.dataURL;
  setFileUI('banner', f.name);
  renderPreview();

  // compress + upload
  try {
    const pngFile = new File([edit.blob], 'banner-cropped.png', { type: 'image/png' });
    const { blob } = await compressImage(pngFile, { maxW: BANNER_MAX_W, maxH: BANNER_MAX_H, quality: WEBP_QUALITY_BANNER, prefer: 'image/webp' });
    const newName = `${slugifyFilename(inputs.name?.value || 'user')}-banner.webp`;
    const webpFile = blobToFile(blob, newName);

    const hostedUrl = await uploadToSupabaseFolder(webpFile, SB.bannersFolder, (inputs.name?.value || 'user') + '-banner');
    imageCache.banner = hostedUrl;
    renderPreview();
  } catch (err) {
    console.error('[Banner compress/upload failed]', err);
    showUploadError('banner', err);
  }
});

/* CLEAR buttons */
clearBtns.avatar.addEventListener('click', (e) => {
  e.stopPropagation();
  inputs.avatarFile.value = '';
  imageCache.avatar = AVATAR_DEFAULT_SRC || PLACEHOLDER_AVATAR;
  setFileUI('avatar', null);
  if (errors.avatar) errors.avatar.hidden = true;
  renderPreview();
});
clearBtns.banner.addEventListener('click', (e) => {
  e.stopPropagation();
  inputs.bannerFile.value = '';
  imageCache.banner = BANNER_DEFAULT_SRC || PLACEHOLDER_BANNER;
  setFileUI('banner', null);
  renderPreview();
});

/* Inputs change */
[inputs.name, inputs.role, inputs.email, inputs.phone, inputs.linkedin, inputs.lemcal]
  .forEach(el => el && el.addEventListener('input', renderPreview));
[inputs.linkedinToggle, inputs.lemcalToggle, inputs.bannerToggle]
  .forEach(el => el && el.addEventListener('change', renderPreview));

/* Header buttons */
btns.copyGmail.addEventListener('click', async () => {
  const htmlExport = buildEmailHTMLForExport(collectState(), { align: 'left' });
  const html = wrapForGmail(htmlExport);
  try { await copyHtmlToClipboard(html, ''); }
  catch { await navigator.clipboard.writeText(html); }
  finally {
    const btn = btns.copyGmail;
    if (!btn.dataset.label) btn.dataset.label = btn.textContent.trim();
    const styles = getComputedStyle(btn);
    btn.style.width = styles.width;
    btn.disabled = true;
    btn.classList.add('is-copied');
    btn.innerHTML = `
      <span class="copied-anim" aria-hidden="true">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 13l4 4L19 7"></path></svg>
        <span>Copied</span>
      </span>`;
    window.setTimeout(() => {
      btn.classList.remove('is-copied');
      btn.disabled = false;
      btn.textContent = btn.dataset.label;
      requestAnimationFrame(() => { btn.style.width = ''; });
    }, 1200);
  }
});
btns.openGmail.addEventListener('click', () => {
  window.open('https://mail.google.com/mail/u/0/#settings/general', '_blank');
});

/* Init */
window.addEventListener('load', () => {
  applyBrand('lemlist');
  document.querySelectorAll('.brand-switch .seg').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const k = e.currentTarget.dataset.brand;
      applyBrand(k);
    });
  });
  window.addEventListener('resize', renderPreview);
});

/* ===== Modal (Gmail Tutorial) ===== */
(function(){
  const modal = document.getElementById('gmailTutorialModal');
  const openBtn = document.getElementById('gmailTutorialBtn');
  const openGmailFromModal = document.getElementById('openGmailFromModal');
  const backdrop = modal?.querySelector('.modal__backdrop');
  const closeEls = modal?.querySelectorAll('[data-close]');
  let lastFocused = null;

  if (!modal || !openBtn) return;

  const openModal = () => {
    lastFocused = document.activeElement;
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    const title = document.getElementById('gmailTutorialTitle');
    title && title.focus({ preventScroll: true });
    document.body.style.overflow = 'hidden';
  };
  const closeModal = () => {
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    lastFocused && lastFocused.focus();
  };

  openBtn.addEventListener('click', openModal);
  backdrop && backdrop.addEventListener('click', closeModal);
  closeEls && closeEls.forEach(el => el.addEventListener('click', closeModal));

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('is-open')) {
      e.preventDefault(); closeModal();
    }
  });

  openGmailFromModal?.addEventListener('click', () => {
    window.open('https://mail.google.com/mail/u/0/#settings/general', '_blank');
  });

  // minimal focus trap
  modal.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab') return;
    const focusables = modal.querySelectorAll('button, [href], summary, input, select, textarea, [tabindex]:not([tabindex="-1"])');
    const list = Array.from(focusables).filter(el => !el.hasAttribute('disabled'));
    if (!list.length) return;
    const first = list[0], last = list[list.length - 1];
    if (e.shiftKey && document.activeElement === first) { last.focus(); e.preventDefault(); }
    else if (!e.shiftKey && document.activeElement === last) { first.focus(); e.preventDefault(); }
  });
})();
