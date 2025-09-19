/* ===== Basic config ===== */
const BASE_PREVIEW_SCALE = 0.92;
const PREVIEW_MAX_WIDTH = 500;

/* ===== Colors ===== */
const COLOR_SEPARATOR = '#E6E6E6';
const COLOR_NAME = '#213856';
const COLOR_ROLE = '#566F8F';
const COLOR_SITE = '#98A1AC';
const COLOR_TEXT = '#17161B';
const COLOR_MUTED = '#566F8F';
const COLOR_ACCENT = '#316BFF';

/* ===== Sizes ===== */
const PHOTO_SIZE = 89;
const ICON_SIZE = 40;

/* ===== Fixed content ===== */
const WEBSITE_FIXED = 'www.lemlist.com';

/* ===== Local assets (change paths if needed) ===== */
const ASSETS = {
  logo: 'icons/logo.gif',
  linkedin: 'icons/linkedin.png',
  lemcal: 'icons/lemcal.png',
  avatarPlaceholder: 'icons/avatar-placeholder.png',
  bannerPlaceholder: 'icons/banner-placeholder.png',
};

/* ===== Image sources (no web fetch) ===== */
let LOGO_SRC           = ASSETS.logo;
let ICON_LINKEDIN_SRC  = ASSETS.linkedin;
let ICON_LEMCAL_SRC    = ASSETS.lemcal;
let AVATAR_DEFAULT_SRC = ASSETS.avatarPlaceholder;
let BANNER_DEFAULT_SRC = ASSETS.bannerPlaceholder;

/* ===== Fallbacks (SVG data URIs if local files are absent) ===== */
const LOGO_FALLBACK        = rectSVG(100, 28, COLOR_ACCENT, 'lemlist');
const LINKEDIN_FALLBACK    = rectSVG(ICON_SIZE, ICON_SIZE, '#0A66C2', 'in');
const LEMCAL_FALLBACK      = rectSVG(ICON_SIZE, ICON_SIZE, '#316BFF', 'cal');
const PLACEHOLDER_AVATAR   = rectSVG(PHOTO_SIZE, PHOTO_SIZE, '#E9EEF2', 'Photo');
const PLACEHOLDER_BANNER   = rectSVG(600, 120, '#DDEEE8', 'Banner');

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

/* si ton HTML utilise onclick="avatarFile.click()" */
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
function showCopied(btn, label = 'Copied') {
  if (!btn.dataset.label) btn.dataset.label = btn.textContent.trim();
  btn.disabled = true;
  btn.classList.add('copied');
  btn.innerHTML = `
    <span class="copied-anim" aria-hidden="true">
      <svg viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"/></svg>
      ${label}
    </span>
  `;
  setTimeout(() => {
    btn.classList.remove('copied');
    btn.disabled = false;
    btn.innerHTML = btn.dataset.label;
  }, 1200);
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

  return {
    name, role, email, phone,
    linkedin, linkedinEnabled,
    lemcal, lemcalEnabled,
    avatar: imageCache.avatar,
    logo: LOGO_SRC || LOGO_FALLBACK,
    banner: imageCache.banner,
  };
}

/* ===== Email HTML ===== */
function buildEmailHTML(state, { align = 'center' } = {}) {
  const {
    name, role, email, phone,
    linkedin, linkedinEnabled,
    lemcal, lemcalEnabled,
    avatar, logo, banner
  } = state;

  const linkedinCell = linkedinEnabled ? `
    <a href="${escapeHtml(linkedin)}" style="display:inline-block; text-decoration:none; line-height:0;">
      <img src="${ICON_LINKEDIN_SRC || LINKEDIN_FALLBACK}" width="${ICON_SIZE}" height="${ICON_SIZE}" alt="LinkedIn" style="display:block; border:0; outline:none; text-decoration:none;">
    </a>` : '';

  const lemcalCell = lemcalEnabled ? `
    <a href="${escapeHtml(lemcal)}" style="display:inline-block; text-decoration:none; line-height:0;">
      <img src="${ICON_LEMCAL_SRC || LEMCAL_FALLBACK}" width="${ICON_SIZE}" height="${ICON_SIZE}" alt="Lemcal" style="display:block; border:0; outline:none; text-decoration:none;">
    </a>` : '';

  const phoneRow = phone ? `<tr><td style="padding:0;"><a href="${toTelHref(phone)}" style="color:${COLOR_MUTED}; text-decoration:none;">${escapeHtml(phone)}</a></td></tr>` : '';
  const emailRow = email ? `<tr><td style="padding:0;"><a href="mailto:${escapeHtml(email)}" style="color:${COLOR_MUTED}; text-decoration:none;">${escapeHtml(email)}</a></td></tr>` : '';

  const rightIcons = (linkedinEnabled || lemcalEnabled) ? `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="white-space:nowrap; font-size:0; line-height:0;">
      <tbody>
        <tr>
          ${linkedinEnabled ? `<td style="padding-left:12px; vertical-align:middle;">${linkedinCell}</td>` : ''}
          ${lemcalEnabled ? `<td style="padding-left:12px; vertical-align:middle;">${lemcalCell}</td>` : ''}
        </tr>
      </tbody>
    </table>` : '';

  const contentRows = `
    <!-- HEADER -->
    <tr>
      <td>
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%; font-size:0;">
          <tbody>
            <tr>
              <td valign="top" style="vertical-align:top; font-size:16px;">
                <div style="font-size:18px; font-weight:800; color:${COLOR_NAME}; line-height:1.2;">${escapeHtml(name)}</div>
                <div style="font-size:14px; color:${COLOR_ROLE}; line-height:1.5;">${escapeHtml(role)}</div>
              </td>
              <td valign="top" align="right" style="text-align:right; white-space:nowrap;">
                <a href="https://${WEBSITE_FIXED}" target="_blank" style="text-decoration:none; display:inline-block;">
                  <img src="${logo}" alt="Logo" style="display:block; height:28px; border:0; outline:none; text-decoration:none;" />
                </a>
              </td>
            </tr>
            <tr>
              <td colspan="2" style="padding-top:12px;">
                <div style="height:2px; background:${COLOR_SEPARATOR};"></div>
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
                        <img src="${avatar}" width="${PHOTO_SIZE}" height="${PHOTO_SIZE}" alt="${escapeHtml(name)}" style="display:block; border-radius:6px;" />
                      </td>
                      <td style="width:16px;"></td>
                      <td valign="middle">
                        <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="font-size:13px; color:${COLOR_MUTED}; line-height:1.7;">
                          <tbody>
                            ${phoneRow}
                            ${emailRow}
                            <tr><td><a href="https://${WEBSITE_FIXED}" style="color:${COLOR_SITE}; text-decoration:none;">${WEBSITE_FIXED}</a></td></tr>
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

    <!-- BANNER -->
    <tr><td style="height:16px;"></td></tr>
    <tr>
      <td align="${align === 'left' ? 'left' : 'center'}">
        <img src="${banner}" alt="Banner" style="display:block; width:100%; max-width:${PREVIEW_MAX_WIDTH}px; height:auto; border-radius:8px;" />
      </td>
    </tr>
  `;

  if (align === 'left') {
    return `
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse; mso-table-lspace:0pt; mso-table-rspace:0pt;">
  <tbody><tr>
    <td align="left" style="padding:0; margin:0;">
      <!--[if mso]><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="${PREVIEW_MAX_WIDTH}"><tr><td><![endif]-->
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="left"
             style="border-collapse:collapse; mso-table-lspace:0pt; mso-table-rspace:0pt;
                    color:${COLOR_TEXT}; font-family:Arial,Helvetica,sans-serif;
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
              color:${COLOR_TEXT}; font-family:Arial,Helvetica,sans-serif;
              max-width:${PREVIEW_MAX_WIDTH}px; width:100%;">
  <tbody>${contentRows}</tbody>
</table>`.trim();
}

/* ===== Preview renderer ===== */
function renderPreview() {
  const state = collectState();
  els.preview.innerHTML = buildEmailHTML(state, { align: 'center' }); // preview centrée

  const card = els.previewCard;
  card.style.maxWidth = PREVIEW_MAX_WIDTH + 'px';
  card.style.transformOrigin = 'top left';

  requestAnimationFrame(() => {
    const wrapRect = $('#previewInner').getBoundingClientRect();
    const cardRect = card.getBoundingClientRect();
    const scale = Math.min(
      BASE_PREVIEW_SCALE,
      (wrapRect.width - 28) / (cardRect.width || PREVIEW_MAX_WIDTH),
      (wrapRect.height - 28) / ((cardRect.height || 1) + 1)
    );
    card.style.transform = `scale(${Math.max(scale, 0.5)})`;
  });
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
[inputs.linkedinToggle, inputs.lemcalToggle]
  .forEach(el => el && el.addEventListener('change', renderPreview));

/* ===== Buttons ===== */
btns.copyGmail.addEventListener('click', async () => {
  const html = wrapForGmail(buildEmailHTML(collectState(), { align: 'left' })); // export à gauche
  try { await copyHtmlToClipboard(html, ''); }
  catch { await navigator.clipboard.writeText(html); }
  finally { showCopied(btns.copyGmail); } // ✓ Copied
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
  renderPreview();
});

/* ===== Init ===== */
window.addEventListener('load', () => {
  // Si tu veux forcer les placeholders générés (sans fichiers), dé-commente :
  // LOGO_SRC = LOGO_FALLBACK;
  // ICON_LINKEDIN_SRC = LINKEDIN_FALLBACK;
  // ICON_LEMCAL_SRC = LEMCAL_FALLBACK;
  // AVATAR_DEFAULT_SRC = PLACEHOLDER_AVATAR;
  // BANNER_DEFAULT_SRC = PLACEHOLDER_BANNER;

  imageCache.avatar = AVATAR_DEFAULT_SRC || PLACEHOLDER_AVATAR;
  imageCache.banner = BANNER_DEFAULT_SRC || PLACEHOLDER_BANNER;
  fileBtns.avatar.textContent = 'Upload photo';
  fileBtns.banner.textContent = 'Upload banner';

  renderPreview();
  window.addEventListener('resize', renderPreview);
});
