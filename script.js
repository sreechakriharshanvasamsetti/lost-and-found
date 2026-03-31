/* ═══════════════════════════════════════════════════════════════════════════
   Lost & Found Portal — script.js
   Email delivery via EmailJS (https://www.emailjs.com)

   ┌─────────────────────────────────────────────────────────┐
   │  SETUP INSTRUCTIONS                                     │
   │  1. Create a free account at emailjs.com                │
   │  2. Add an Email Service (Gmail, Outlook, SMTP…)        │
   │  3. Create TWO Email Templates:                         │
   │                                                         │
   │  LOST TEMPLATE variables:                               │
   │    {{to_email}}      recipient address                  │
   │    {{report_type}}   "Lost Item Report"                 │
   │    {{from_name}}     reporter's name                    │
   │    {{from_email}}    reporter's email                   │
   │    {{item_name}}     lost item name                     │
   │    {{category}}      item category                      │
   │    {{description}}   item description                   │
   │    {{date_lost}}     date lost                          │
   │    {{time_lost}}     approximate time                   │
   │    {{location}}      last known location                │
   │    {{phone}}         reporter's phone                   │
   │    {{reward}}        reward offered                     │
   │    {{extra_info}}    additional notes                   │
   │    {{photo_name}}    filename of uploaded photo         │
   │                                                         │
   │  FOUND TEMPLATE variables:                              │
   │    {{to_email}}      recipient address                  │
   │    {{report_type}}   "Found Item Report"                │
   │    {{from_name}}     finder's name                      │
   │    {{from_email}}    finder's email                     │
   │    {{item_name}}     found item name                    │
   │    {{category}}      item category                      │
   │    {{description}}   item description                   │
   │    {{date_found}}    date found                         │
   │    {{time_found}}    approximate time                   │
   │    {{location}}      where it was found                 │
   │    {{stored_at}}     where it's stored now              │
   │    {{phone}}         finder's phone                     │
   │    {{extra_info}}    additional notes                   │
   │    {{photo_name}}    filename of uploaded photo         │
   │                                                         │
   │  4. Replace the credentials below                       │
   └─────────────────────────────────────────────────────────┘
═══════════════════════════════════════════════════════════════════════════ */

// ── ✏️  YOUR EMAILJS CREDENTIALS ─────────────────────────────────────────────
const EMAILJS_PUBLIC_KEY      = 'd_xmsEhGvVufUvP0P';     // Account → API Keys
const EMAILJS_SERVICE_ID      = 'service_ba9hyde';     // Email Services
const EMAILJS_LOST_TEMPLATE   = 'template_0owbt2m';  // Lost template
const EMAILJS_FOUND_TEMPLATE  = 'YOUR_FOUND_TEMPLATE_ID'; // Found template
// ─────────────────────────────────────────────────────────────────────────────

// Initialise EmailJS
emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });

/* ════════════════════════════════════════════════════════════
   TAB SWITCHING
════════════════════════════════════════════════════════════ */
const tabLost    = document.getElementById('tabLost');
const tabFound   = document.getElementById('tabFound');
const panelLost  = document.getElementById('panelLost');
const panelFound = document.getElementById('panelFound');

tabLost.addEventListener('click', () => switchTab('lost'));
tabFound.addEventListener('click', () => switchTab('found'));

function switchTab(tab) {
  if (tab === 'lost') {
    tabLost.classList.add('active');
    tabFound.classList.remove('active');
    panelLost.classList.remove('hidden');
    panelFound.classList.add('hidden');
  } else {
    tabFound.classList.add('active');
    tabLost.classList.remove('active');
    panelFound.classList.remove('hidden');
    panelLost.classList.add('hidden');
  }
}

/* ════════════════════════════════════════════════════════════
   PHOTO UPLOAD — generic helper
════════════════════════════════════════════════════════════ */
function initPhotoUpload(inputId, previewId, zoneId) {
  const input   = document.getElementById(inputId);
  const preview = document.getElementById(previewId);
  const zone    = document.getElementById(zoneId);

  input.addEventListener('change', () => {
    const file = input.files[0];
    if (file && file.type.startsWith('image/')) {
      if (file.size > 5 * 1024 * 1024) {
        showToast('Photo must be under 5 MB.', 'error');
        input.value = '';
        return;
      }
      const reader = new FileReader();
      reader.onload = e => {
        preview.src = e.target.result;
        zone.classList.add('has-file');
      };
      reader.readAsDataURL(file);
    } else if (file) {
      showToast('Please upload an image file (JPG, PNG, WEBP).', 'error');
      input.value = '';
    }
  });
}

// Drag-and-drop highlight
['l_uploadZone', 'f_uploadZone'].forEach(zoneId => {
  const zone = document.getElementById(zoneId);
  zone.addEventListener('dragover',  e => { e.preventDefault(); zone.style.borderColor = 'var(--muted)'; });
  zone.addEventListener('dragleave', () => { zone.style.borderColor = ''; });
  zone.addEventListener('drop', e => {
    e.preventDefault();
    zone.style.borderColor = '';
    const file = e.dataTransfer.files[0];
    const inputId = zoneId === 'l_uploadZone' ? 'l_photo' : 'f_photo';
    const input = document.getElementById(inputId);
    const dt = new DataTransfer();
    dt.items.add(file);
    input.files = dt.files;
    input.dispatchEvent(new Event('change'));
  });
});

initPhotoUpload('l_photo', 'l_preview', 'l_uploadZone');
initPhotoUpload('f_photo', 'f_preview', 'f_uploadZone');

/* ════════════════════════════════════════════════════════════
   LOST FORM — STEPS & VALIDATION
════════════════════════════════════════════════════════════ */
const lPanels = {
  1: document.getElementById('lStep1'),
  2: document.getElementById('lStep2'),
  3: document.getElementById('lStep3'),
};
const lDots = {
  1: document.getElementById('ls1dot'),
  2: document.getElementById('ls2dot'),
  3: document.getElementById('ls3dot'),
};
const lLines = [
  document.getElementById('lline1'),
  document.getElementById('lline2'),
];

const lRules = {
  1: [
    { id: 'l_itemName',    errId: 'l_errItemName',    test: v => v.trim().length >= 2,   msg: 'Please enter the item name (min 2 chars).' },
    { id: 'l_category',    errId: 'l_errCategory',    test: v => v !== '',               msg: 'Please select a category.' },
    { id: 'l_description', errId: 'l_errDescription', test: v => v.trim().length >= 10,  msg: 'Please describe the item (min 10 chars).' },
    { id: 'l_dateLost',    errId: 'l_errDateLost',    test: v => v !== '',               msg: 'Please select the date you lost it.' },
    { id: 'l_location',    errId: 'l_errLocation',    test: v => v.trim().length >= 3,   msg: 'Please enter the last known location.' },
  ],
  2: [
    { id: 'l_yourName',       errId: 'l_errYourName',       test: v => v.trim().length >= 2,                 msg: 'Please enter your full name.' },
    { id: 'l_yourEmail',      errId: 'l_errYourEmail',      test: v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), msg: 'Please enter a valid email.' },
    { id: 'l_recipientEmail', errId: 'l_errRecipientEmail', test: v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), msg: 'Please enter a valid recipient email.' },
  ],
};

function lValidate(step) {
  let valid = true;
  lRules[step].forEach(rule => {
    const el  = document.getElementById(rule.id);
    const err = document.getElementById(rule.errId);
    const ok  = rule.test(el.value);
    err.textContent = ok ? '' : rule.msg;
    el.classList.toggle('invalid', !ok);
    if (!ok) valid = false;
  });
  return valid;
}

function lValidateAndGo(from, to) {
  if (lValidate(from)) lGoTo(to);
}

function lGoTo(step) {
  Object.values(lPanels).forEach(p => p.classList.remove('active'));
  lPanels[step].classList.add('active');
  Object.entries(lDots).forEach(([s, dot]) => {
    dot.classList.remove('active', 'done');
    const n = Number(s);
    if (n < step) dot.classList.add('done');
    else if (n === step) dot.classList.add('active');
  });
  lLines.forEach((line, i) => line.classList.toggle('done', i + 1 < step));
  if (step === 3) lBuildReview();
  window.scrollTo({ top: document.querySelector('.panel').offsetTop - 20, behavior: 'smooth' });
}

function lBuildReview() {
  const g = id => document.getElementById(id).value || '—';
  const photoFile = document.getElementById('l_photo').files[0];
  const rows = [
    { label: 'Item Name',      value: g('l_itemName'),            full: false },
    { label: 'Category',       value: g('l_category'),            full: false },
    { label: 'Date Lost',      value: formatDate(g('l_dateLost')), full: false },
    { label: 'Time',           value: g('l_timeLost') || '—',     full: false },
    { label: 'Location',       value: g('l_location'),            full: true  },
    { label: 'Description',    value: g('l_description'),         full: true  },
    { label: 'Reward',         value: g('l_reward') || 'None',    full: false },
    { label: 'Photo',          value: photoFile ? photoFile.name : 'No photo', full: false },
    { label: 'Reporter Name',  value: g('l_yourName'),            full: false },
    { label: 'Reporter Email', value: g('l_yourEmail'),           full: false },
    { label: 'Phone',          value: g('l_yourPhone') || '—',    full: false },
    { label: 'Send Report To', value: g('l_recipientEmail'),      full: false },
    { label: 'Extra Notes',    value: g('l_additionalInfo') || 'None', full: true },
  ];

  let html = rows.map(r => `
    <div class="review-row${r.full ? ' full' : ''}">
      <strong>${r.label}</strong>
      <span>${escHtml(r.value)}</span>
    </div>`).join('');

  const preview = document.getElementById('l_preview');
  if (photoFile && preview.src) {
    html += `
      <div class="review-row full">
        <strong>Photo Preview</strong>
        <img src="${preview.src}" alt="Item photo"
             style="margin-top:8px;max-width:200px;max-height:160px;
                    object-fit:cover;border-radius:10px;
                    border:2px solid var(--border);"/>
      </div>`;
  }
  document.getElementById('l_reviewBox').innerHTML = html;
}

// Clear errors on input
document.querySelectorAll('#lostForm input, #lostForm select, #lostForm textarea').forEach(el => {
  el.addEventListener('input', () => {
    el.classList.remove('invalid');
    const key = 'l_err' + el.id.replace('l_','').charAt(0).toUpperCase() + el.id.replace('l_','').slice(1);
    const errEl = document.getElementById(key);
    if (errEl) errEl.textContent = '';
  });
});

// Submit
document.getElementById('lostForm').addEventListener('submit', async e => {
  e.preventDefault();
  if (!lValidate(2)) { lGoTo(2); return; }
  await sendReport('lost');
});

/* ════════════════════════════════════════════════════════════
   FOUND FORM — STEPS & VALIDATION
════════════════════════════════════════════════════════════ */
const fPanels = {
  1: document.getElementById('fStep1'),
  2: document.getElementById('fStep2'),
  3: document.getElementById('fStep3'),
};
const fDots = {
  1: document.getElementById('fs1dot'),
  2: document.getElementById('fs2dot'),
  3: document.getElementById('fs3dot'),
};
const fLines = [
  document.getElementById('fline1'),
  document.getElementById('fline2'),
];

const fRules = {
  1: [
    { id: 'f_itemName',    errId: 'f_errItemName',    test: v => v.trim().length >= 2,   msg: 'Please enter the item name.' },
    { id: 'f_category',    errId: 'f_errCategory',    test: v => v !== '',               msg: 'Please select a category.' },
    { id: 'f_description', errId: 'f_errDescription', test: v => v.trim().length >= 10,  msg: 'Please describe the item (min 10 chars).' },
    { id: 'f_dateFound',   errId: 'f_errDateFound',   test: v => v !== '',               msg: 'Please select the date you found it.' },
    { id: 'f_location',    errId: 'f_errLocation',    test: v => v.trim().length >= 3,   msg: 'Please enter where you found it.' },
  ],
  2: [
    { id: 'f_yourName',       errId: 'f_errYourName',       test: v => v.trim().length >= 2,                 msg: 'Please enter your full name.' },
    { id: 'f_yourEmail',      errId: 'f_errYourEmail',      test: v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), msg: 'Please enter a valid email.' },
    { id: 'f_recipientEmail', errId: 'f_errRecipientEmail', test: v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), msg: 'Please enter a valid recipient email.' },
  ],
};

function fValidate(step) {
  let valid = true;
  fRules[step].forEach(rule => {
    const el  = document.getElementById(rule.id);
    const err = document.getElementById(rule.errId);
    const ok  = rule.test(el.value);
    err.textContent = ok ? '' : rule.msg;
    el.classList.toggle('invalid', !ok);
    if (!ok) valid = false;
  });
  return valid;
}

function fValidateAndGo(from, to) {
  if (fValidate(from)) fGoTo(to);
}

function fGoTo(step) {
  Object.values(fPanels).forEach(p => p.classList.remove('active'));
  fPanels[step].classList.add('active');
  Object.entries(fDots).forEach(([s, dot]) => {
    dot.classList.remove('active', 'done');
    const n = Number(s);
    if (n < step) dot.classList.add('done');
    else if (n === step) dot.classList.add('active');
  });
  fLines.forEach((line, i) => line.classList.toggle('done', i + 1 < step));
  if (step === 3) fBuildReview();
  window.scrollTo({ top: document.querySelector('.panel').offsetTop - 20, behavior: 'smooth' });
}

function fBuildReview() {
  const g = id => document.getElementById(id).value || '—';
  const photoFile = document.getElementById('f_photo').files[0];
  const rows = [
    { label: 'Item Name',      value: g('f_itemName'),             full: false },
    { label: 'Category',       value: g('f_category'),             full: false },
    { label: 'Date Found',     value: formatDate(g('f_dateFound')), full: false },
    { label: 'Time',           value: g('f_timeFound') || '—',     full: false },
    { label: 'Found At',       value: g('f_location'),             full: true  },
    { label: 'Stored At',      value: g('f_storedAt') || '—',      full: false },
    { label: 'Description',    value: g('f_description'),          full: true  },
    { label: 'Photo',          value: photoFile ? photoFile.name : 'No photo', full: false },
    { label: 'Finder Name',    value: g('f_yourName'),             full: false },
    { label: 'Finder Email',   value: g('f_yourEmail'),            full: false },
    { label: 'Phone',          value: g('f_yourPhone') || '—',     full: false },
    { label: 'Send Report To', value: g('f_recipientEmail'),       full: false },
    { label: 'Extra Notes',    value: g('f_additionalInfo') || 'None', full: true },
  ];

  let html = rows.map(r => `
    <div class="review-row${r.full ? ' full' : ''}">
      <strong>${r.label}</strong>
      <span>${escHtml(r.value)}</span>
    </div>`).join('');

  const preview = document.getElementById('f_preview');
  if (photoFile && preview.src) {
    html += `
      <div class="review-row full">
        <strong>Photo Preview</strong>
        <img src="${preview.src}" alt="Found item photo"
             style="margin-top:8px;max-width:200px;max-height:160px;
                    object-fit:cover;border-radius:10px;
                    border:2px solid var(--border);"/>
      </div>`;
  }
  document.getElementById('f_reviewBox').innerHTML = html;
}

// Clear errors on input
document.querySelectorAll('#foundForm input, #foundForm select, #foundForm textarea').forEach(el => {
  el.addEventListener('input', () => {
    el.classList.remove('invalid');
    const key = 'f_err' + el.id.replace('f_','').charAt(0).toUpperCase() + el.id.replace('f_','').slice(1);
    const errEl = document.getElementById(key);
    if (errEl) errEl.textContent = '';
  });
});

// Submit
document.getElementById('foundForm').addEventListener('submit', async e => {
  e.preventDefault();
  if (!fValidate(2)) { fGoTo(2); return; }
  await sendReport('found');
});

/* ════════════════════════════════════════════════════════════
   SEND EMAIL — shared handler
════════════════════════════════════════════════════════════ */
async function sendReport(type) {
  const isLost = type === 'lost';
  const prefix = isLost ? 'l_' : 'f_';

  const submitBtn  = document.getElementById(`${prefix}submitBtn`);
  const btnLabel   = document.getElementById(`${prefix}btnLabel`);
  const spinner    = document.getElementById(`${prefix}spinner`);
  const btnIcon    = document.getElementById(`${prefix}btnIcon`);

  // Show loading state
  btnLabel.textContent = 'Sending…';
  spinner.classList.remove('hidden');
  btnIcon.classList.add('hidden');
  submitBtn.disabled = true;

  const g = id => document.getElementById(id).value.trim();
  const photoInput = document.getElementById(`${prefix}photo`);
  const photoName  = photoInput.files[0] ? photoInput.files[0].name : 'No photo attached';

  let templateParams, templateId;

  if (isLost) {
    templateId = EMAILJS_LOST_TEMPLATE;
    templateParams = {
      to_email:    g('l_recipientEmail'),
      report_type: 'Lost Item Report',
      from_name:   g('l_yourName'),
      from_email:  g('l_yourEmail'),
      reply_to:    g('l_yourEmail'),
      item_name:   g('l_itemName'),
      category:    document.getElementById('l_category').value,
      description: g('l_description'),
      date_lost:   formatDate(g('l_dateLost')),
      time_lost:   document.getElementById('l_timeLost').value || 'Not specified',
      location:    g('l_location'),
      phone:       g('l_yourPhone') || 'Not provided',
      reward:      g('l_reward')    || 'None',
      extra_info:  g('l_additionalInfo') || 'None',
      photo_name:  photoName,
    };
  } else {
    templateId = EMAILJS_FOUND_TEMPLATE;
    templateParams = {
      to_email:    g('f_recipientEmail'),
      report_type: 'Found Item Report',
      from_name:   g('f_yourName'),
      from_email:  g('f_yourEmail'),
      reply_to:    g('f_yourEmail'),
      item_name:   g('f_itemName'),
      category:    document.getElementById('f_category').value,
      description: g('f_description'),
      date_found:  formatDate(document.getElementById('f_dateFound').value),
      time_found:  document.getElementById('f_timeFound').value || 'Not specified',
      location:    g('f_location'),
      stored_at:   g('f_storedAt') || 'Not specified',
      phone:       g('f_yourPhone') || 'Not provided',
      extra_info:  g('f_additionalInfo') || 'None',
      photo_name:  photoName,
    };
  }

  try {
    await emailjs.send(EMAILJS_SERVICE_ID, templateId, templateParams);
    showSuccessScreen(type, templateParams.from_email);
    showToast('Report sent successfully!', isLost ? 'success' : 'found');
  } catch (err) {
    console.error('EmailJS error:', err);
    // Mailto fallback
    const mailto = buildMailto(type, templateParams);
    showToast('EmailJS not configured — opening mail client.', 'error');
    setTimeout(() => { window.location.href = mailto; }, 1200);
  } finally {
    btnLabel.textContent = isLost ? 'Send Lost Report' : 'Send Found Report';
    spinner.classList.add('hidden');
    btnIcon.classList.remove('hidden');
    submitBtn.disabled = false;
  }
}

/* ════════════════════════════════════════════════════════════
   SUCCESS SCREENS
════════════════════════════════════════════════════════════ */
function showSuccessScreen(type, email) {
  const isLost = type === 'lost';
  const form    = document.getElementById(isLost ? 'lostForm'  : 'foundForm');
  const success = document.getElementById(isLost ? 'l_success' : 'f_success');
  const emailEl = document.getElementById(isLost ? 'l_confirmEmail' : 'f_confirmEmail');
  form.classList.add('hidden');
  success.classList.remove('hidden');
  emailEl.textContent = email;
}

function resetLost() {
  document.getElementById('lostForm').reset();
  document.getElementById('l_preview').src = '';
  document.getElementById('l_uploadZone').classList.remove('has-file');
  document.getElementById('lostForm').classList.remove('hidden');
  document.getElementById('l_success').classList.add('hidden');
  document.querySelectorAll('#lostForm .invalid').forEach(el => el.classList.remove('invalid'));
  document.querySelectorAll('#lostForm .err').forEach(el => el.textContent = '');
  lGoTo(1);
}

function resetFound() {
  document.getElementById('foundForm').reset();
  document.getElementById('f_preview').src = '';
  document.getElementById('f_uploadZone').classList.remove('has-file');
  document.getElementById('foundForm').classList.remove('hidden');
  document.getElementById('f_success').classList.add('hidden');
  document.querySelectorAll('#foundForm .invalid').forEach(el => el.classList.remove('invalid'));
  document.querySelectorAll('#foundForm .err').forEach(el => el.textContent = '');
  fGoTo(1);
}

/* ════════════════════════════════════════════════════════════
   MAILTO FALLBACK
════════════════════════════════════════════════════════════ */
function buildMailto(type, p) {
  const isLost = type === 'lost';
  const subject = encodeURIComponent(`${p.report_type}: ${p.item_name}`);
  let body;
  if (isLost) {
    body = encodeURIComponent(
`LOST ITEM REPORT
================
Item Name   : ${p.item_name}
Category    : ${p.category}
Date Lost   : ${p.date_lost}
Time Lost   : ${p.time_lost}
Location    : ${p.location}
Photo       : ${p.photo_name}

Description :
${p.description}

REPORTER DETAILS
================
Name        : ${p.from_name}
Email       : ${p.from_email}
Phone       : ${p.phone}
Reward      : ${p.reward}
Extra Notes : ${p.extra_info}
`);
  } else {
    body = encodeURIComponent(
`FOUND ITEM REPORT
=================
Item Name   : ${p.item_name}
Category    : ${p.category}
Date Found  : ${p.date_found}
Time Found  : ${p.time_found}
Found At    : ${p.location}
Stored At   : ${p.stored_at}
Photo       : ${p.photo_name}

Description :
${p.description}

FINDER DETAILS
==============
Name        : ${p.from_name}
Email       : ${p.from_email}
Phone       : ${p.phone}
Extra Notes : ${p.extra_info}
`);
  }
  return `mailto:${p.to_email}?subject=${subject}&body=${body}`;
}

/* ════════════════════════════════════════════════════════════
   TOAST
════════════════════════════════════════════════════════════ */
function showToast(msg, type = 'success') {
  const toast = document.getElementById('toast');
  const icons = { success: '✓', found: '✓', error: '✕' };
  toast.className = `show ${type}`;
  toast.innerHTML = `<span>${icons[type] || '✓'}</span>${escHtml(msg)}`;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => toast.classList.remove('show'), 3800);
}

/* ════════════════════════════════════════════════════════════
   UTILITIES
════════════════════════════════════════════════════════════ */
function formatDate(dateStr) {
  if (!dateStr || dateStr === '—') return '—';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Set today as max date for both date pickers
const today = new Date().toISOString().split('T')[0];
document.getElementById('l_dateLost').max  = today;
document.getElementById('f_dateFound').max = today;
