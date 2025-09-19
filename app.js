/* ===== Preview config ===== */
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

/* ===== Sizes (fixes) ===== */
const PHOTO_SIZE = 89;
const ICON_SIZE = 40; // LinkedIn & Lemcal

/* ===== Fixed content ===== */
const WEBSITE_FIXED = 'www.lemlist.com';

/* ===== Google Drive file IDs ===== */
const DRIVE_LOGO_ID     = '1ADClWTNozOIXgKZQrzLBgo4-R3dsW5Eh';
const DRIVE_LINKEDIN_ID = '1T3Znjw-xOjmNxE1k0QBEKNp59TPRBe9k';
const DRIVE_LEMCAL_ID   = '1uTcZdXhipZ8Lxpq8kIwSvNL5ZMx5zt1o';
const DRIVE_AVATAR_ID   = '1CkFTdse9AbONKnYaQpJl8oJ1tvQi67Yv';
const DRIVE_BANNER_ID   = '1OKIbkT8Np5tN6howCqga6Hgfxh4VzXRt';

/* ===== Sources d'images (résolues au chargement) ===== */
let LOGO_SRC = '';
let ICON_LINKEDIN_SRC = '';
let ICON_LEMCAL_SRC = '';
let AVATAR_DEFAULT_SRC = '';
let BANNER_DEFAULT_SRC = '';

/* ===== Fallbacks ===== */
const LOGO_FALLBACK = rectSVG(100, 28, COLOR_ACCENT, 'lemlist');
const LINKEDIN_FALLBACK = rectSVG(ICON_SIZE, ICON_SIZE, '#0A66C2', 'in');
const LEMCAL_FALLBACK   = rectSVG(ICON_SIZE, ICON_SIZE, '#316BFF', 'cal');
const PLACEHOLDER_AVATAR = rectSVG(PHOTO_SIZE, PHOTO_SIZE, '#E9EEF2', 'Photo');
const PLACEHOLDER_BANNER = rectSVG(600, 120, '#DDEEE8', 'Banner 500px');

/* ===== DOM helpers ===== */
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

/* Rendre compatibles les onclick inline du HTML (avatarFile.click()) */
window.avatarFile = inputs.avatarFile;
window.bannerFile = inputs.bannerFile;

/* ===== Placeholders (SVG data URIs) ===== */
function rectSVG(w, h, color, label) {
  const fontSize = 14;
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}' viewBox='0 0 ${w} ${h}'>` +
    `<rect width='100%' height='100%' rx='6' fill='${color}'/>` +
    (label ? `<text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' font-family='Arial,Helvetica,sans-serif' font-size='${fontSize}' fill='#5B6B7D'>${label}</text>` : ``) +
    `</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/* ===== Image utils ===== */
function fileToDataURL(file) {
  return new Promise((res, rej) => {
    if (!file) return res(null);
    const reader = new FileReader();
    reader.onload = () => res(reader.result);
    reader.onerror = (e) => rej(e);
    reader.readAsDataURL(file);
  });
}
function testImage(url){
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      if ((img.naturalWidth || 0) > 0 && (img.naturalHeight || 0) > 0) resolve(true);
      else reject(false);
    };
    img.onerror = () => reject(false);
    img.src = url;
  });
}

/* ===== Helpers pour Google Drive ===== */
function driveCandidates(fileId, size = 512) {
  // ordre robuste : download > view > thumbnail
  return [
    `https://drive.google.com/uc?export=download&id=${fileId}`,
    `https://drive.google.com/uc?export=view&id=${fileId}`,
    `https://drive.google.com/thumbnail?id=${fileId}&sz=w${size}`,
  ];
}
async function pickFirstWorking(urls) {
  for (const url of urls) {
    try { await testImage(url); return url; } catch (_) {}
  }
  return null;
}

/* ===== State & cache ===== */
const imageCache = {
  avatar: PLACEHOLDER_AVATAR,
  banner: PLACEHOLDER_BANNER,
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
    logo: LOGO_SRC,
    banner: imageCache.banner,
  };
}

/* ===== tel: href ===== */
function toTelHref(raw='') {
  const trimmed = raw.trim();
  let plus = trimmed.startsWith('+') ? '+' : '';
  const digits = trimmed.replace(/[^\d]/g, '');
  return `tel:${plus}${digits}`;
}

/* ===== Signature builder (HTML) ===== */
/* align: 'center' pour la preview, 'left' pour l'export */
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

  // --- contenu commun (sans table racine)
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

  // --- enveloppe selon l’alignement voulu
  if (align === 'left') {
    return `
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse; mso-table-lspace:0pt; mso-table-rspace:0pt;">
  <tbody><tr>
    <td align="left" style="padding:0; margin:0;">

      <!--[if mso]>
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="${PREVIEW_MAX_WIDTH}"><tr><td>
      <![endif]-->

      <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="left"
             style="border-collapse:collapse; mso-table-lspace:0pt; mso-table-rspace:0pt;
                    color:${COLOR_TEXT}; font-family:Arial,Helvetica,sans-serif;
                    width:100%; max-width:${PREVIEW_MAX_WIDTH}px;">
        <tbody>
          ${contentRows}
        </tbody>
      </table>

      <!--[if mso]></td></tr></table><![endif]-->

    </td>
  </tr></tbody>
</table>
`.trim();
  }

  // align === 'center' (preview)
  return `
<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center"
       style="border-collapse:collapse; mso-table-lspace:0pt; mso-table-rspace:0pt;
              color:${COLOR_TEXT}; font-family:Arial,Helvetica,sans-serif;
              max-width:${PREVIEW_MAX_WIDTH}px; width:100%;">
  <tbody>
    ${contentRows}
  </tbody>
</table>
`.trim();
}

/* ===== Preview renderer ===== */
function renderPreview() {
  const state = collectState();
  const html = buildEmailHTML(state, { align: 'center' }); // preview centrée
  els.preview.innerHTML = html;

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
  if (f) {
    imageCache.avatar = await fileToDataURL(f);
    fileBtns.avatar.textContent = f.name;
    fileBtns.avatar.classList.add('used');
  } else {
    imageCache.avatar = AVATAR_DEFAULT_SRC || PLACEHOLDER_AVATAR;
    fileBtns.avatar.textContent = 'Upload photo';
    fileBtns.avatar.classList.remove('used');
  }
  renderPreview();
});
inputs.bannerFile.addEventListener('change', async (e) => {
  const f = e.target.files?.[0];
  if (f) {
    imageCache.banner = await fileToDataURL(f);
    fileBtns.banner.textContent = f.name;
    fileBtns.banner.classList.add('used');
  } else {
    imageCache.banner = BANNER_DEFAULT_SRC || PLACEHOLDER_BANNER;
    fileBtns.banner.textContent = 'Upload banner';
    fileBtns.banner.classList.remove('used');
  }
  renderPreview();
});

/* ===== Inputs change ===== */
[
  inputs.name, inputs.role, inputs.email, inputs.phone,
  inputs.linkedin, inputs.linkedinToggle,
  inputs.lemcal, inputs.lemcalToggle
].forEach(el => el && el.addEventListener('input', renderPreview));
[inputs.linkedinToggle, inputs.lemcalToggle].forEach(el => el && el.addEventListener('change', renderPreview));

/* ===== Clipboard helper ===== */
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

/* ===== Buttons ===== */
btns.copyGmail.addEventListener('click', async () => {
  const html = wrapForGmail(buildEmailHTML(collectState(), { align: 'left' })); // export à gauche
  try {
    await copyHtmlToClipboard(html, '');
    pulse(btns.copyGmail);
  } catch (e) {
    await navigator.clipboard.writeText(html);
    pulse(btns.copyGmail);
  }
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

/* ===== Utils ===== */
function wrapForGmail(innerHTML){
  return `<!-- signature --><div style="text-align:left">${innerHTML}</div>`;
}
function escapeHtml(str=''){
  return str.replace(/[&<>"']/g, s => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[s]));
}
function pulse(btn){
  btn.style.transform = 'scale(0.98)';
  setTimeout(()=>{ btn.style.transform = ''; }, 120);
}

/* ===== Init ===== */
window.addEventListener('load', async () => {
  try {
    const [
      resolvedLogo,
      resolvedLinkedin,
      resolvedLemcal,
      resolvedAvatar,
      resolvedBanner
    ] = await Promise.all([
      pickFirstWorking(driveCandidates(DRIVE_LOGO_ID, 512)),
      pickFirstWorking(driveCandidates(DRIVE_LINKEDIN_ID, 256)),
      pickFirstWorking(driveCandidates(DRIVE_LEMCAL_ID, 256)),
      pickFirstWorking(driveCandidates(DRIVE_AVATAR_ID, 256)),
      pickFirstWorking(driveCandidates(DRIVE_BANNER_ID, 800)),
    ]);

    LOGO_SRC = resolvedLogo || LOGO_FALLBACK;
    ICON_LINKEDIN_SRC = resolvedLinkedin || LINKEDIN_FALLBACK;
    ICON_LEMCAL_SRC = resolvedLemcal || LEMCAL_FALLBACK;
    AVATAR_DEFAULT_SRC = resolvedAvatar || PLACEHOLDER_AVATAR;
    BANNER_DEFAULT_SRC = resolvedBanner || PLACEHOLDER_BANNER;

    imageCache.avatar = AVATAR_DEFAULT_SRC;
    imageCache.banner = BANNER_DEFAULT_SRC;

    // init boutons upload (état vierge)
    fileBtns.avatar.textContent = 'Upload photo';
    fileBtns.banner.textContent = 'Upload banner';

  } catch (_) {
    LOGO_SRC = LOGO_FALLBACK;
    ICON_LINKEDIN_SRC = LINKEDIN_FALLBACK;
    ICON_LEMCAL_SRC = LEMCAL_FALLBACK;
    AVATAR_DEFAULT_SRC = PLACEHOLDER_AVATAR;
    BANNER_DEFAULT_SRC = PLACEHOLDER_BANNER;

    imageCache.avatar = AVATAR_DEFAULT_SRC;
    imageCache.banner = BANNER_DEFAULT_SRC;
  } finally {
    renderPreview();
    window.addEventListener('resize', renderPreview);
  }
});
