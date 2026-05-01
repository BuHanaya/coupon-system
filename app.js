// ── Storage ──
const STORAGE_KEY = 'coupon_system_data';
function saveData() { localStorage.setItem(STORAGE_KEY, JSON.stringify({ coupons, seq })); }
function loadData() {
  try {
    const d = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    coupons = d.coupons || []; seq = d.seq || 0;
  } catch(e) { coupons = []; seq = 0; }
}

// ── State ──
let coupons = [];
let seq = 0;
let generated = [];
const PASSWORD = 'admin123';

// ── Login ──
function doLogin() {
  const pass = document.getElementById('login-pass').value;
  const err  = document.getElementById('login-error');
  if (pass === PASSWORD) {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('app').classList.remove('hidden');
    loadData(); updateSidebar(); renderTable();
  } else {
    err.style.display = 'block';
    document.getElementById('login-pass').value = '';
    setTimeout(() => err.style.display = 'none', 2500);
  }
}
document.getElementById('login-pass').addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });

function doLogout() {
  if (!confirm('هل تريد تسجيل الخروج؟')) return;
  document.getElementById('app').classList.add('hidden');
  document.getElementById('login-screen').style.display = 'flex';
  document.getElementById('login-pass').value = '';
}

// ── Tabs ──
function switchTab(btn, tabId) {
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.querySelectorAll('.tab-page').forEach(p => p.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('tab-' + tabId).classList.add('active');
  if (tabId === 'manage') renderTable();
  if (tabId === 'stats') renderStats();
}

// ── Utilities ──
function uid() { return Math.random().toString(36).substr(2, 8); }

function randSeg(n) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < n; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

// XXXX-XXXX-XXXX — 12 حرف عشوائي بدون أحرف مشابهة (0/O, 1/I)
function genCode() {
  return randSeg(4) + '-' + randSeg(4) + '-' + randSeg(4);
}

function getStatus(c) {
  if (c.status === 'used') return 'used';
  if (c.exp && new Date(c.exp) < new Date()) return 'expired';
  return 'active';
}

function showAlert(id, msg, type) {
  const el = document.getElementById(id);
  if (!el) return;
  el.innerHTML = `<div class="alert alert-${type}">${msg}</div>`;
  setTimeout(() => el.innerHTML = '', 3000);
}

function copyText(text, btn) {
  navigator.clipboard.writeText(text).catch(() => {
    const ta = document.createElement('textarea');
    ta.value = text; document.body.appendChild(ta); ta.select();
    document.execCommand('copy'); document.body.removeChild(ta);
  }).finally ? null : null;
  const orig = btn.textContent;
  btn.textContent = '✓ تم';
  setTimeout(() => btn.textContent = orig, 1500);
}

// ── Generate ──
function generateCoupons() {
  const name  = document.getElementById('g-name').value.trim();
  const value = parseFloat(document.getElementById('g-value').value);
  const type  = document.getElementById('g-type').value;
  const min   = parseFloat(document.getElementById('g-min').value) || 0;
  const exp   = document.getElementById('g-exp').value;
  const qty   = Math.min(100, Math.max(1, parseInt(document.getElementById('g-qty').value) || 1));

  if (!value || value <= 0) { alert('يرجى إدخال قيمة خصم صحيحة'); return; }
  if (type === 'percent' && value > 100) { alert('نسبة الخصم لا يمكن أن تتجاوز 100%'); return; }

  generated = [];
  for (let i = 0; i < qty; i++) {
    seq++;
    let code = genCode();
    // ضمان عدم التكرار
    while (coupons.find(c => c.code === code)) code = genCode();
    const coupon = {
      id: uid(), seq, code,
      name: name || '—', value, type, min,
      exp: exp || null, status: 'active',
      usedAt: null, createdAt: new Date().toLocaleDateString('ar-SA')
    };
    coupons.push(coupon);
    generated.push(coupon);
  }

  saveData(); updateSidebar();

  document.getElementById('gen-result-card').style.display = 'block';
  document.getElementById('gen-list').innerHTML = generated.map(c => `
    <div class="gen-item">
      <div>
        <span class="gen-code">${c.code}</span>
        <span class="seq-tag">#${c.seq}</span>
      </div>
      <div style="display:flex;align-items:center;gap:8px">
        <span style="font-size:12px;color:var(--text3)">${c.value}${c.type==='percent'?'%':' ريال'}</span>
        <button class="btn-sm" onclick="copyText('${c.code}',this)">نسخ</button>
      </div>
    </div>`).join('');

  ['g-name','g-value','g-min','g-exp'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('g-qty').value = '1';
}

function copyAllGenerated() {
  const all = generated.map(c => c.code).join('\n');
  navigator.clipboard.writeText(all).then(() => alert('تم نسخ جميع الكوبونات!'));
}

// ── Table ──
function renderTable() {
  const search = (document.getElementById('search-input')?.value || '').toLowerCase();
  const filter = document.getElementById('filter-status')?.value || 'all';

  let list = coupons.filter(c => {
    const st = getStatus(c);
    if (filter !== 'all' && st !== filter) return false;
    if (search && !c.code.toLowerCase().includes(search) &&
        !c.name.toLowerCase().includes(search) && !String(c.seq).includes(search)) return false;
    return true;
  });

  const tbody = document.getElementById('coupons-table');
  const empty = document.getElementById('empty-msg');
  if (!tbody) return;

  if (list.length === 0) { tbody.innerHTML = ''; empty.style.display = 'block'; return; }
  empty.style.display = 'none';

  tbody.innerHTML = list.map((c, i) => {
    const st = getStatus(c);
    const badge = st==='active' ? '<span class="badge badge-active">فعّال</span>'
                : st==='used'   ? '<span class="badge badge-used">مستخدم</span>'
                :                 '<span class="badge badge-expired">منتهي</span>';
    return `<tr>
      <td style="color:var(--text3);font-family:var(--mono)">${i+1}</td>
      <td><span class="code-badge">${c.code}</span></td>
      <td style="font-family:var(--mono);color:var(--text3)">#${c.seq}</td>
      <td>${c.name}</td>
      <td style="font-family:var(--mono)">${c.value}${c.type==='percent'?'%':' ر'}</td>
      <td>${badge}</td>
      <td style="color:var(--text3);font-size:12px">${c.usedAt||'—'}</td>
      <td><div style="display:flex;gap:6px">
        ${st==='active'?`<button class="btn-action" onclick="markUsed('${c.id}')">تحديد كمستخدم</button>`:''}
        <button class="btn-action" style="color:var(--red)" onclick="deleteCoupon('${c.id}')">حذف</button>
      </div></td>
    </tr>`;
  }).join('');
}

function markUsed(id) {
  const c = coupons.find(x => x.id === id);
  if (c) { c.status = 'used'; c.usedAt = new Date().toLocaleDateString('ar-SA'); }
  saveData(); renderTable(); updateSidebar();
}

function deleteCoupon(id) {
  if (!confirm('هل تريد حذف هذا الكوبون؟')) return;
  coupons = coupons.filter(x => x.id !== id);
  saveData(); renderTable(); updateSidebar();
}

function clearAll() {
  if (!confirm('هل أنت متأكد من حذف جميع الكوبونات؟ لا يمكن التراجع عن هذا.')) return;
  coupons = []; seq = 0;
  saveData(); renderTable(); updateSidebar();
}

// ── Verify ──
function verifyCoupon() {
  const input = document.getElementById('v-code').value.trim().toUpperCase();
  const res   = document.getElementById('v-result');
  if (!input) { res.style.display = 'none'; return; }

  const coupon = coupons.find(c => c.code === input || String(c.seq) === input);

  if (!coupon) {
    res.className = 'verify-result v-invalid'; res.style.display = 'block';
    res.innerHTML = `<div class="v-title">❌ الكوبون غير موجود</div>
      <div class="v-details">لم يتم العثور على "<span style="font-family:var(--mono)">${input}</span>" في النظام.</div>`;
    return;
  }

  const st = getStatus(coupon);

  if (st === 'used') {
    res.className = 'verify-result v-used'; res.style.display = 'block';
    res.innerHTML = `<div class="v-title">⚠️ الكوبون مستخدم مسبقًا</div>
      <div class="v-details">الكود: <span class="code-badge">${coupon.code}</span><br>تاريخ الاستخدام: ${coupon.usedAt||'—'}</div>`;
    return;
  }

  if (st === 'expired') {
    res.className = 'verify-result v-invalid'; res.style.display = 'block';
    res.innerHTML = `<div class="v-title">❌ الكوبون منتهي الصلاحية</div>
      <div class="v-details">انتهت صلاحية هذا الكوبون في ${coupon.exp}</div>`;
    return;
  }

  res.className = 'verify-result v-valid'; res.style.display = 'block';
  res.innerHTML = `
    <div class="v-title">✓ الكوبون صالح للاستخدام</div>
    <div class="v-details">
      الكود: <span class="code-badge">${coupon.code}</span>
      &nbsp;<span style="font-family:var(--mono);font-size:11px;color:var(--text3)">#${coupon.seq}</span><br>
      العميل: ${coupon.name}<br>
      الخصم: <strong style="color:var(--accent)">${coupon.value}${coupon.type==='percent'?'%':' ريال'}</strong><br>
      ${coupon.min ? `الحد الأدنى للشراء: ${coupon.min} ريال<br>` : ''}
      ${coupon.exp ? `صالح حتى: ${coupon.exp}` : ''}
    </div>
    <div class="v-actions">
      <button class="btn-primary" style="width:auto;padding:8px 20px;margin-top:0" onclick="confirmUse('${coupon.id}')">تأكيد الاستخدام ✓</button>
      <button class="btn-secondary" style="width:auto;padding:8px 16px;margin-top:0" onclick="document.getElementById('v-result').style.display='none'">إغلاق</button>
    </div>`;
}

function confirmUse(id) {
  markUsed(id);
  const res = document.getElementById('v-result');
  res.className = 'verify-result v-used';
  res.innerHTML = `<div class="v-title">✓ تم تسجيل الاستخدام بنجاح</div>`;
  document.getElementById('v-code').value = '';
  setTimeout(() => res.style.display = 'none', 2500);
}

// ── Manual add ──
function addManual() {
  const code  = document.getElementById('m-code').value.trim().toUpperCase();
  const name  = document.getElementById('m-name').value.trim();
  const value = parseFloat(document.getElementById('m-value').value);
  const type  = document.getElementById('m-type').value;
  const exp   = document.getElementById('m-exp').value;

  if (!code)             { showAlert('m-alert','يرجى إدخال كود الكوبون','error'); return; }
  if (!value||value<=0)  { showAlert('m-alert','يرجى إدخال قيمة خصم صحيحة','error'); return; }
  if (coupons.find(c=>c.code===code)) { showAlert('m-alert','هذا الكود موجود مسبقًا','error'); return; }

  seq++;
  coupons.push({ id:uid(), seq, code, name:name||'—', value, type, min:0, exp:exp||null, status:'active', usedAt:null, createdAt:new Date().toLocaleDateString('ar-SA') });
  saveData(); updateSidebar();
  showAlert('m-alert','تمت إضافة الكوبون بنجاح ✓','success');
  ['m-code','m-name','m-value','m-exp'].forEach(id => document.getElementById(id).value = '');
}

// ── Stats ──
function renderStats() {
  const active  = coupons.filter(c=>getStatus(c)==='active').length;
  const used    = coupons.filter(c=>getStatus(c)==='used').length;
  const expired = coupons.filter(c=>getStatus(c)==='expired').length;
  document.getElementById('s-total').textContent   = coupons.length;
  document.getElementById('s-active').textContent  = active;
  document.getElementById('s-used').textContent    = used;
  document.getElementById('s-expired').textContent = expired;

  const usedList = coupons.filter(c=>c.status==='used').slice(-10).reverse();
  document.getElementById('s-used-list').innerHTML = usedList.length
    ? usedList.map(c=>`<div class="simple-row"><span class="code-badge" style="font-size:12px">${c.code}</span><span style="color:var(--text3);font-size:12px">${c.usedAt||'—'}</span></div>`).join('')
    : '<div style="color:var(--text3);font-size:13px;padding:1rem 0">لا يوجد كوبونات مستخدمة بعد</div>';

  const disc = {};
  coupons.forEach(c => { const k=c.value+(c.type==='percent'?'%':' ريال'); disc[k]=(disc[k]||0)+1; });
  document.getElementById('s-discount-list').innerHTML = Object.keys(disc).length
    ? Object.entries(disc).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`<div class="simple-row"><span style="font-family:var(--mono);font-size:13px">${k}</span><span style="color:var(--text3);font-size:12px">${v} كوبون</span></div>`).join('')
    : '<div style="color:var(--text3);font-size:13px;padding:1rem 0">لا يوجد بيانات</div>';
}

function updateSidebar() {
  document.getElementById('sb-total').textContent = coupons.length + ' كوبون';
}
