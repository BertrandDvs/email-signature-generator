/* ===== Basic config ===== */
const BASE_PREVIEW_SCALE = 0.92;
const PREVIEW_MAX_WIDTH = 500;

/* ============================================================================
   Brand profiles (couleurs, site, assets)
   ========================================================================== */
const BRAND_PROFILES = {
  lemlist: {
    key: 'lemlist',
    site: 'www.lemlist.com',
    colors: {
      separator:'#E6E6E6', name:'#213856', role:'#566F8F',
      site:'#98A1AC', text:'#17161B', muted:'#566F8F', accent:'#316BFF'
    },
    gradient: ['#316BFF','#134CDD'],
    assets: {
      // locaux (preview) :
      logoLocal:   'icons/logo.gif',
      avatarLocal: 'icons/avatar-placeholder.png',
      bannerLocal: 'icons/banner-placeholder.png',
      // publics (GitHub Pages) :
      logoPublic:   'logo.gif',
      avatarPublic: 'avatar-placeholder.png',
      bannerPublic: 'banner-placeholder.png',
      // icônes sociaux (communs ici)
      linkedinPublic: 'linkedin.png',
      lemcalPublic:   'lemcal.png'
    }
  },
  taplio: {
    key: 'taplio',
    site: 'www.taplio.com',
    colors: {
      separator:'#E6E6E6', name:'#1A1333', role:'#6F6B80',
      site:'#9BA0AC', text:'#14121A', muted:'#6F6B80', accent:'#7C4DFF'
    },
    gradient: ['#2C58B6','#204698ff'],
    assets: {
      logoLocal:   'icons/taplio-logo.png',
      avatarLocal: 'icons/taplio-avatar.png',
      bannerLocal: 'icons/taplio-banner.png',
      logoPublic:   'taplio-logo.png',
      avatarPublic: 'taplio-avatar.png',
      bannerPublic: 'taplio-banner.png',
      linkedinPublic: 'linkedin.png',
      lemcalPublic:   'lemcal.png'
    }
  }
};

/* ===== Public assets base (GitHub Pages) ===== */
const PUBLIC_ASSET_BASE = 'https://bertranddvs.github.io/email-signature-generator/icons/';

/* ===== State brand/theme (mutable) ===== */
let CURRENT_BRAND = BRAND_PROFILES.lemlist; // défaut
let THEME = { colors: CURRENT_BRAND.colors, site: CURRENT_BRAND.site };
let PUBLIC_ASSETS_CURRENT = mapPublicAssets(CURRENT_BRAND);

/* ===== Colors (fallbacks SVG) ===== */
const LINKEDIN_FALLBACK = rectSVG(40, 40, '#0A66C2', 'in');
const LEMCAL_FALLBACK   = rectSVG(40, 40, '#316BFF', 'cal'); // fallback neutre
const PLACEHOLDER_AVATAR = rectSVG(89, 89, '#E9EEF2', 'Photo');
const PLACEHOLDER_BANNER = rectSVG(600, 120, '#DDEEE8', 'Banner');

/* ===== Local assets (preview / app) ===== */
const ASSETS = {
  linkedin: 'icons/linkedin.png',
  lemcal:   'icons/lemcal.png'
};

/* ===== Image sources (no web fetch) — seront remplacées via applyBrand() ===== */
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
  bannerToggle: byId('bannerToggle'), // ← nouveau
};

const fileBtns = {
  avatar: byId('avatarBtn'),
  banner: byId('bannerBtn'),
};

const els = {
  previewCard: byId('previewCard'),
  preview: byId('signaturePreview'),
};

const btns = {
  copyGmail: byId('copyGmail'),
  openGmail: byId('openGmail'),
  reset: byId('reset'),
};

/* Expose pour les onclick HTML */
window.avatarFile = inputs.avatarFile;
window.bannerFile = inputs.bannerFile;

/* ===== Utils ===== */
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
  return str.replace(/[&<>"']/g, s => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[s]));
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

/* ===== Copied anim ===== */
function showCopied(btn, label = 'Copied') {
  if (!btn.dataset.label) btn.dataset.label = btn.textContent.trim();
  const styles = getComputedStyle(btn);
  btn.style.width = styles.width;
  btn.disabled = true;
  btn.classList.add('is-copied');
  btn.innerHTML = `
    <span class="copied-anim" aria-hidden="true">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 13l4 4L19 7"></path></svg>
      <span>${label}</span>
    </span>`;
  window.setTimeout(() => {
    btn.classList.remove('is-copied');
    btn.disabled = false;
    btn.textContent = btn.dataset.label;
    requestAnimationFrame(() => { btn.style.width = ''; });
  }, 1200);
}

/* ===== Public assets mapping ===== */
function mapPublicAssets(profile){
  return {
    logo:     PUBLIC_ASSET_BASE + profile.assets.logoPublic,
    avatar:   PUBLIC_ASSET_BASE + profile.assets.avatarPublic,
    banner:   PUBLIC_ASSET_BASE + profile.assets.bannerPublic,
    linkedin: PUBLIC_ASSET_BASE + profile.assets.linkedinPublic,
    lemcal:   PUBLIC_ASSET_BASE + profile.assets.lemcalPublic
  };
}

/* ===== Sanitize src for export (force HTTPS public GitHub Pages) ===== */
function sanitizeSrcForEmail(src, kind) {
  if (src && /^https:\/\//i.test(src)) return src;           // déjà https
  if (kind && PUBLIC_ASSETS_CURRENT[kind]) return PUBLIC_ASSETS_CURRENT[kind];
  const file = String(src || '').split('/').pop();
  return PUBLIC_ASSET_BASE + file;
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

/* ===== Email HTML (utilise THEME dynamique) ===== */
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

/* ===== Variante export (force URLs publiques) ===== */
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

/* ===== Preview renderer ===== */
function renderPreview() {
  const state = collectState();
  els.preview.innerHTML = buildEmailHTML(state, { align: 'center' }); // preview centrée

  const card = els.previewCard;
  card.style.maxWidth = PREVIEW_MAX_WIDTH + 'px';
  card.style.transformOrigin = 'top left';

  requestAnimationFrame(() => {
    const wrapRect = byId('previewInner').getBoundingClientRect();
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

  // Set CSS variables (accent + gradient)
  document.documentElement.style.setProperty('--accent', prof.colors.accent);
  document.documentElement.style.setProperty('--grad-start', prof.gradient[0]);
  document.documentElement.style.setProperty('--grad-end',   prof.gradient[1]);

  // Set local defaults
  LOGO_SRC           = prof.assets.logoLocal;
  AVATAR_DEFAULT_SRC = prof.assets.avatarLocal;
  BANNER_DEFAULT_SRC = prof.assets.bannerLocal;

  // Reset uploads à la brand
  inputs.avatarFile.value = '';
  inputs.bannerFile.value = '';
  imageCache.avatar = AVATAR_DEFAULT_SRC || PLACEHOLDER_AVATAR;
  imageCache.banner = BANNER_DEFAULT_SRC || PLACEHOLDER_BANNER;
  fileBtns.avatar.textContent = 'Upload photo';
  fileBtns.banner.textContent = 'Upload banner';
  fileBtns.avatar.classList.remove('used');
  fileBtns.banner.classList.remove('used');

  // Toggle UI state
  const btnL = byId('brandLemlist');
  const btnT = byId('brandTaplio');
  if (btnL && btnT){
    btnL.classList.toggle('is-active', key === 'lemlist');
    btnT.classList.toggle('is-active', key === 'taplio');
    btnL.setAttribute('aria-selected', key === 'lemlist' ? 'true':'false');
    btnT.setAttribute('aria-selected', key === 'taplio' ? 'true':'false');
  }

  renderPreview();
}

/* ===== File inputs ===== */
inputs.avatarFile.addEventListener('change', async (e) => {
  const f = e.target.files?.[0];
  imageCache.avatar = f ? await fileToDataURL(f) : (AVATAR_DEFAULT_SRC || PLACEHOLDER_AVATAR);
  fileBtns.avatar.textContent = f ? f.name : 'Upload photo';
  fileBtns.avatar.classList.toggle('used', !!f);
  renderPreview();
});
inputs.bannerFile.addEventListener('change', async (e) => {
  const f = e.target.files?.[0];
  imageCache.banner = f ? await fileToDataURL(f) : (BANNER_DEFAULT_SRC || PLACEHOLDER_BANNER);
  fileBtns.banner.textContent = f ? f.name : 'Upload banner';
  fileBtns.banner.classList.toggle('used', !!f);
  renderPreview();
});

/* ===== Inputs change ===== */
[inputs.name, inputs.role, inputs.email, inputs.phone, inputs.linkedin, inputs.lemcal]
  .forEach(el => el && el.addEventListener('input', renderPreview));
[inputs.linkedinToggle, inputs.lemcalToggle, inputs.bannerToggle]
  .forEach(el => el && el.addEventListener('change', renderPreview));

/* ===== Buttons ===== */
btns.copyGmail.addEventListener('click', async () => {
  const htmlExport = buildEmailHTMLForExport(collectState(), { align: 'left' });
  const html = wrapForGmail(htmlExport);
  try { await copyHtmlToClipboard(html, ''); }
  catch { await navigator.clipboard.writeText(html); }
  finally { showCopied(btns.copyGmail); }
});

btns.openGmail.addEventListener('click', () => {
  window.open('https://mail.google.com/mail/u/0/#settings/general', '_blank');
});

btns.reset.addEventListener('click', () => {
  inputs.avatarFile.value = '';
  inputs.bannerFile.value = '';
  imageCache.avatar = AVATAR_DEFAULT_SRC || PLACEHOLDER_AVATAR;
  imageCache.banner = BANNER_DEFAULT_SRC || PLACEHOLDER_BANNER;
  fileBtns.avatar.textContent = 'Upload photo';
  fileBtns.banner.textContent = 'Upload banner';
  fileBtns.avatar.classList.remove('used');
  fileBtns.banner.classList.remove('used');
  if (inputs.bannerToggle) inputs.bannerToggle.checked = true; // cohérent avec défaut
  renderPreview();
});

/* ===== Init ===== */
window.addEventListener('load', () => {
  // Initial brand (lemlist)
  applyBrand('lemlist');

  // Wire brand toggle
  document.querySelectorAll('.brand-switch .seg').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const k = e.currentTarget.dataset.brand;
      applyBrand(k);
    });
  });

  window.addEventListener('resize', renderPreview);
});
