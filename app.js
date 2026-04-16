/* ══════════════════════════════════════════════════════════
   ConciURGE v4.0 — The REMY Apartments (A LIVEBe Community)
   (c) AXG Systems — All Rights Reserved
   ══════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  // ── CONFIG ──
  const SHEETS_API_URL = '';
  const SHEETS_ENABLED = SHEETS_API_URL.length > 0;

  // ── DATA ──
  const KEYS = { residents:'pd_residents', packages:'pd_packages', prefs:'pd_prefs', shiftNotes:'pd_shiftnotes', feedback:'pd_feedback' };
  function load(k)    { try { return JSON.parse(localStorage.getItem(k)) || []; } catch { return []; } }
  function save(k, d) { localStorage.setItem(k, JSON.stringify(d)); }
  function loadObj(k)  { try { return JSON.parse(localStorage.getItem(k)) || {}; } catch { return {}; } }

  let residents  = load(KEYS.residents);
  let packages   = load(KEYS.packages);
  let prefs      = loadObj(KEYS.prefs);
  let shiftNotes = load(KEYS.shiftNotes);
  let feedback   = load(KEYS.feedback);

  function nextId() { return packages.reduce((m, p) => Math.max(m, p.id || 0), 0) + 1; }

  // ── SHEETS SYNC ──
  async function sync(action, data) {
    if (!SHEETS_ENABLED) return;
    try {
      await fetch(SHEETS_API_URL, { method:'POST', headers:{'Content-Type':'text/plain'}, body: JSON.stringify({ action, ...data }) });
    } catch (e) { console.warn('Sync fail:', e); }
  }

  // ── HELPERS ──
  function fmtDate(d) { return new Date(d).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}); }
  function fmtTime(d) { return new Date(d).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit',second:'2-digit'}); }
  function fmtFull(d) { return fmtDate(d)+' at '+fmtTime(d); }
  function hoursAgo(h){ return new Date(Date.now()-h*3600000).toISOString(); }
  function daysAgo(d) { return new Date(Date.now()-d*86400000).toISOString(); }
  function hBetween(a,b){ return Math.abs(new Date(b)-new Date(a))/3600000; }
  function esc(s){ const e=document.createElement('span'); e.textContent=s; return e.innerHTML; }

  // ── TOAST ──
  function toast(msg, type='info') {
    const el = document.createElement('div');
    el.className = `toast toast-${type}`;
    el.textContent = msg;
    document.getElementById('toastContainer').appendChild(el);
    setTimeout(() => el.remove(), 4000);
  }

  // ── SUCCESS OVERLAY (log) ──
  function showSuccess(title, detail) {
    document.getElementById('successTitle').textContent = title;
    document.getElementById('successDetail').innerHTML = esc(detail).replace(/\n/g,'<br>');
    const o = document.getElementById('successOverlay');
    o.classList.add('show');
    setTimeout(() => o.classList.remove('show'), 1800);
  }

  // ══════════════════════════════════════════════
  //  CELEBRATION (Pickup)
  // ══════════════════════════════════════════════

  const GREETINGS = [
    { emoji:'\u{1F91C}\u{1F91B}', greeting:'Thanks, {name}!', sub:'Have an awesome {tod}!' },
    { emoji:'\u{1F44B}',          greeting:'You\'re all set, {name}!', sub:'Enjoy your {tod}!' },
    { emoji:'\u{2728}',           greeting:'Thanks, {name}!', sub:'Have a wonderful {tod}!' },
    { emoji:'\u{1F389}',          greeting:'Got it, {name}!', sub:'See you next time!' },
    { emoji:'\u{1F44D}',          greeting:'All yours, {name}!', sub:'Have a great one!' },
    { emoji:'\u{1F91D}',          greeting:'Pleasure, {name}!', sub:'Enjoy your packages!' },
    { emoji:'\u{1F60E}',          greeting:'You\'re good, {name}!', sub:'Have a fantastic {tod}!' },
    { emoji:'\u{1F4E6}\u{2705}',  greeting:'Picked up! Thanks, {name}!', sub:'See you around!' },
    { emoji:'\u{1F3C6}',          greeting:'Package secured, {name}!', sub:'Have an excellent {tod}!' },
    { emoji:'\u{1F31F}',          greeting:'You\'re a star, {name}!', sub:'Enjoy the rest of your {tod}!' },
    { emoji:'\u{1F918}',          greeting:'Rock on, {name}!', sub:'Catch you later!' },
    { emoji:'\u{1F64F}',          greeting:'Appreciate you, {name}!', sub:'Have a blessed {tod}!' },
  ];

  function tod() { const h=new Date().getHours(); return h<12?'morning':h>=17?'evening':'day'; }

  function showCelebration(resName, pickupTime) {
    const first = resName.split(' ')[0];
    const t = GREETINGS[Math.floor(Math.random()*GREETINGS.length)];
    document.getElementById('celebrationEmoji').textContent = t.emoji;
    document.getElementById('celebrationGreeting').textContent = t.greeting.replace('{name}',first);
    document.getElementById('celebrationSub').textContent = t.sub.replace('{tod}',tod());
    document.getElementById('celebrationTime').textContent = fmtFull(pickupTime);
    document.getElementById('celebrationOverlay').classList.add('show');
    launchConfetti();
    setTimeout(() => {
      document.getElementById('celebrationOverlay').classList.remove('show'); stopConfetti();
      // Show feedback modal after celebration
      setTimeout(() => showFeedbackModal(resName), 400);
    }, 3800);
  }

  // ── CONFETTI ENGINE ──
  let cParticles=[], cFrame=null;
  function launchConfetti() {
    const cv=document.getElementById('confettiCanvas'), cx=cv.getContext('2d');
    cv.width=window.innerWidth; cv.height=window.innerHeight;
    cParticles=[];
    const colors=['#c9a84c','#dfc36e','#a08630','#e8d48b','#7c2d3d','#a0374c','#1e5fb3','#3b82f6','#ffffff','#f4f2ed'];
    const shapes=['rect','circle','star'];
    const bursts=[{x:cv.width*.15,y:cv.height*.25},{x:cv.width*.5,y:cv.height*.1},{x:cv.width*.85,y:cv.height*.25}];
    for(const b of bursts) for(let i=0;i<55;i++){
      const a=Math.random()*Math.PI*2, v=4+Math.random()*9;
      cParticles.push({x:b.x+(Math.random()-.5)*80,y:b.y+(Math.random()-.5)*50,vx:Math.cos(a)*v,vy:Math.sin(a)*v-3,
        sz:4+Math.random()*9,color:colors[Math.floor(Math.random()*colors.length)],shape:shapes[Math.floor(Math.random()*shapes.length)],
        rot:Math.random()*360,rs:(Math.random()-.5)*14,g:.12+Math.random()*.08,dr:.98+Math.random()*.015,op:1,
        wb:Math.random()*10,ws:.03+Math.random()*.05,wp:Math.random()*Math.PI*2,life:0});
    }
    function drawStar(cx,x,y,s,r){cx.save();cx.translate(x,y);cx.rotate(r*Math.PI/180);cx.beginPath();
      for(let i=0;i<5;i++){const a=(i*4*Math.PI)/5-Math.PI/2;cx.lineTo(Math.cos(a)*s,Math.sin(a)*s);
      const a2=a+(2*Math.PI)/10;cx.lineTo(Math.cos(a2)*(s*.4),Math.sin(a2)*(s*.4));}cx.closePath();cx.fill();cx.restore();}
    function anim(){
      cx.clearRect(0,0,cv.width,cv.height); let alive=false;
      for(const p of cParticles){p.life++;p.vy+=p.g;p.vx*=p.dr;p.vy*=p.dr;
        p.x+=p.vx+Math.sin(p.wp+p.life*p.ws)*p.wb*.1;p.y+=p.vy;p.rot+=p.rs;
        if(p.y>cv.height*.65)p.op=Math.max(0,1-(p.y-cv.height*.65)/(cv.height*.35));
        if(p.op<=0||p.y>cv.height+50)continue; alive=true; cx.globalAlpha=p.op; cx.fillStyle=p.color;
        if(p.shape==='rect'){cx.save();cx.translate(p.x,p.y);cx.rotate(p.rot*Math.PI/180);cx.fillRect(-p.sz/2,-p.sz/4,p.sz,p.sz/2);cx.restore();}
        else if(p.shape==='circle'){cx.beginPath();cx.arc(p.x,p.y,p.sz/2,0,Math.PI*2);cx.fill();}
        else drawStar(cx,p.x,p.y,p.sz/2,p.rot);
      }
      cx.globalAlpha=1; if(alive)cFrame=requestAnimationFrame(anim);
    }
    cFrame=requestAnimationFrame(anim);
  }
  function stopConfetti(){if(cFrame){cancelAnimationFrame(cFrame);cFrame=null;}
    const cv=document.getElementById('confettiCanvas');cv.getContext('2d').clearRect(0,0,cv.width,cv.height);cParticles=[];}

  // ══════════════════════════════════════════════
  //  CLOCK + PENDING
  // ══════════════════════════════════════════════
  function updateClock(){const el=document.getElementById('clock');if(!el)return;const n=new Date();
    el.textContent=n.toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'})+'  '+n.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit',second:'2-digit'});}
  setInterval(updateClock,1000);updateClock();
  function updatePending(){document.getElementById('pendingCount').textContent=packages.filter(p=>p.status==='pending').length;}

  // ══════════════════════════════════════════════
  //  TABS
  // ══════════════════════════════════════════════
  document.querySelectorAll('.tab-btn').forEach(b=>{b.addEventListener('click',()=>{
    document.querySelectorAll('.tab-btn').forEach(x=>x.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(x=>x.classList.remove('active'));
    b.classList.add('active');document.getElementById('tab-'+b.dataset.tab).classList.add('active');
  });});

  // ══════════════════════════════════════════════
  //  SEARCHABLE RESIDENT DROPDOWN (Round 2)
  // ══════════════════════════════════════════════

  function setupResidentSearch(inputId, dropdownId, hiddenId, onSelect) {
    const input = document.getElementById(inputId);
    const dropdown = document.getElementById(dropdownId);
    const hidden = document.getElementById(hiddenId);

    function pendingCount(resId) {
      return packages.filter(p => p.residentId === resId && p.status === 'pending').length;
    }

    function frequentResidents() {
      const counts = {};
      packages.forEach(p => { counts[p.residentId] = (counts[p.residentId] || 0) + 1; });
      return new Set(Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,3).map(e=>e[0]));
    }

    function render(query) {
      const q = (query || '').toLowerCase();
      const freq = frequentResidents();
      let sorted = [...residents].sort((a, b) => {
        const af = freq.has(a.id) ? 0 : 1;
        const bf = freq.has(b.id) ? 0 : 1;
        if (af !== bf) return af - bf;
        return a.name.localeCompare(b.name);
      });

      if (q) {
        sorted = sorted.filter(r =>
          r.name.toLowerCase().includes(q) ||
          r.apartment.toLowerCase().includes(q)
        );
      }

      if (!sorted.length) {
        dropdown.innerHTML = '<div class="resident-option" style="color:var(--text-muted);cursor:default;">No matches</div>';
      } else {
        dropdown.innerHTML = sorted.map(r => {
          const pc = pendingCount(r.id);
          const isFreq = freq.has(r.id);
          return `<div class="resident-option" data-id="${r.id}">
            <div>
              <span class="resident-option-name">${esc(r.name)}</span>
              ${isFreq ? '<span class="resident-option-freq">Frequent</span>' : ''}
            </div>
            <div style="display:flex;align-items:center;gap:0.5rem;">
              <span class="resident-option-apt">Apt ${esc(r.apartment)}</span>
              ${pc ? `<span class="resident-option-badge">${pc}</span>` : ''}
            </div>
          </div>`;
        }).join('');
      }

      dropdown.classList.add('open');
    }

    input.addEventListener('focus', () => render(input.value));
    input.addEventListener('input', () => render(input.value));

    dropdown.addEventListener('click', e => {
      const opt = e.target.closest('.resident-option');
      if (!opt || !opt.dataset.id) return;
      const res = residents.find(r => r.id === opt.dataset.id);
      if (!res) return;
      hidden.value = res.id;
      input.value = `${res.name} (Apt ${res.apartment})`;
      dropdown.classList.remove('open');
      if (onSelect) onSelect(res);
    });

    document.addEventListener('click', e => {
      if (!e.target.closest('.resident-search-wrap')) dropdown.classList.remove('open');
    });
  }

  // ══════════════════════════════════════════════
  //  RESIDENTS TAB
  // ══════════════════════════════════════════════

  function renderResidents(filter) {
    const tbody = document.getElementById('residentTableBody');
    const empty = document.getElementById('resEmpty');
    const q = (filter || document.getElementById('resTableSearch').value || '').toLowerCase();

    let data = [...residents].sort((a,b) => a.apartment.localeCompare(b.apartment,undefined,{numeric:true}));
    if (q) data = data.filter(r => r.name.toLowerCase().includes(q) || r.apartment.includes(q) || (r.email||'').toLowerCase().includes(q));

    if (!data.length) { tbody.innerHTML=''; empty.style.display='block'; empty.textContent=residents.length?'No matches.':'No residents added yet.'; return; }
    empty.style.display='none';

    tbody.innerHTML = data.map(r => {
      const pc = packages.filter(p=>p.residentId===r.id && p.status==='pending').length;
      return `<tr>
        <td>${esc(r.name)}</td><td>${esc(r.apartment)}</td>
        <td>${esc(r.email||'—')}</td><td>${esc(r.phone||'—')}</td>
        <td>${pc ? `<span class="resident-option-badge">${pc}</span>` : '0'}</td>
        <td><button class="btn btn-danger-sm" data-del="${r.id}">Remove</button></td>
      </tr>`;
    }).join('');

    tbody.querySelectorAll('[data-del]').forEach(b => {
      b.addEventListener('click', () => {
        if (!confirm('Remove this resident?')) return;
        residents = residents.filter(r => r.id !== b.dataset.del);
        save(KEYS.residents, residents);
        renderResidents();
        toast('Resident removed','warning');
      });
    });
  }

  document.getElementById('resTableSearch').addEventListener('input', e => renderResidents(e.target.value));

  document.getElementById('residentForm').addEventListener('submit', e => {
    e.preventDefault();
    const name=document.getElementById('res-name').value.trim(), apt=document.getElementById('res-apt').value.trim();
    const email=document.getElementById('res-email').value.trim(), phone=document.getElementById('res-phone').value.trim();
    if(!name||!apt)return;
    if(residents.some(r=>r.apartment===apt)){toast('Apt '+apt+' already has a resident.','error');return;}
    const res={id:crypto.randomUUID(),name,apartment:apt,email:email||null,phone:phone||null};
    residents.push(res); save(KEYS.residents,residents); renderResidents();
    sync('addResident',{resident:res}); e.target.reset(); toast(`${name} added to Apt ${apt}`,'success');
  });

  // ── CSV IMPORT ──
  let csvRows=[];
  document.getElementById('csvFileInput').addEventListener('change',e=>{
    const f=e.target.files[0]; if(!f)return;
    const r=new FileReader(); r.onload=ev=>{
      const parsed=parseCSV(ev.target.result);
      if(!parsed.length){toast('No valid rows found','error');return;}
      csvRows=parsed; renderCSVPreview(parsed);
    }; r.readAsText(f); e.target.value='';
  });

  function parseCSV(text){
    const lines=text.split(/\r?\n/).filter(l=>l.trim()); if(lines.length<2)return[];
    const sep=lines[0].includes('\t')?'\t':',';
    const h=lines[0].split(sep).map(c=>c.replace(/^["']|["']$/g,'').trim().toLowerCase());
    const nc=h.findIndex(x=>/name|resident|tenant|full.?name/i.test(x));
    const ac=h.findIndex(x=>/apt|apartment|unit|suite|room/i.test(x));
    const ec=h.findIndex(x=>/email|e-mail|mail/i.test(x));
    const pc=h.findIndex(x=>/phone|cell|mobile|tel/i.test(x));
    if(nc===-1||ac===-1){toast('CSV needs Name and Apartment columns','error');return[];}
    const rows=[];
    for(let i=1;i<lines.length;i++){
      const c=splitCSV(lines[i],sep);
      const name=(c[nc]||'').trim(), apt=(c[ac]||'').trim();
      if(!name||!apt)continue;
      rows.push({name,apartment:apt,email:ec>=0?(c[ec]||'').trim():'',phone:pc>=0?(c[pc]||'').trim():''});
    }
    return rows;
  }
  function splitCSV(line,sep){const r=[];let cur='',inQ=false;
    for(let i=0;i<line.length;i++){const ch=line[i];if(ch==='"')inQ=!inQ;else if(ch===sep&&!inQ){r.push(cur.trim());cur='';}else cur+=ch;}
    r.push(cur.trim());return r;}

  function renderCSVPreview(rows){
    document.getElementById('csvPreviewCount').textContent=`${rows.length} residents found`;
    document.getElementById('csvPreviewHead').innerHTML='<th>Name</th><th>Apt</th><th>Email</th><th>Phone</th>';
    document.getElementById('csvPreviewBody').innerHTML=rows.slice(0,50).map(r=>`<tr><td>${esc(r.name)}</td><td>${esc(r.apartment)}</td><td>${esc(r.email||'—')}</td><td>${esc(r.phone||'—')}</td></tr>`).join('');
    document.getElementById('csvPreview').style.display='block';
  }
  document.getElementById('csvCancelBtn').addEventListener('click',()=>{csvRows=[];document.getElementById('csvPreview').style.display='none';});
  document.getElementById('csvConfirmBtn').addEventListener('click',()=>{
    let added=0,skip=0;
    csvRows.forEach(row=>{if(residents.some(r=>r.apartment===row.apartment)){skip++;return;}
      const res={id:crypto.randomUUID(),name:row.name,apartment:row.apartment,email:row.email||null,phone:row.phone||null};
      residents.push(res);sync('addResident',{resident:res});added++;});
    save(KEYS.residents,residents);renderResidents();csvRows=[];
    document.getElementById('csvPreview').style.display='none';
    toast(`${added} imported${skip?`, ${skip} skipped`:''}`,'success');
  });

  // ══════════════════════════════════════════════
  //  LOG PACKAGE
  // ══════════════════════════════════════════════

  let logCarrier = prefs.carrier || 'Amazon';
  let logSize    = prefs.size    || 'Small';
  let logStaff   = prefs.staff   || 'Front Desk';
  let selectedNotes = new Set();
  let lastLoggedPkgId = null;

  // Restore saved selections
  document.querySelectorAll('.carrier-btn').forEach(b => { if(b.dataset.carrier===logCarrier) { document.querySelectorAll('.carrier-btn').forEach(x=>x.classList.remove('selected')); b.classList.add('selected'); } });
  document.querySelectorAll('.size-btn').forEach(b => { if(b.dataset.size===logSize) { document.querySelectorAll('.size-btn').forEach(x=>x.classList.remove('selected')); b.classList.add('selected'); } });
  document.querySelectorAll('.staff-btn').forEach(b => { if(b.dataset.staff===logStaff) { document.querySelectorAll('.staff-btn').forEach(x=>x.classList.remove('selected')); b.classList.add('selected'); } });

  // Carrier grid
  document.getElementById('carrierGrid').addEventListener('click',e=>{
    const b=e.target.closest('.carrier-btn');if(!b)return;
    document.querySelectorAll('.carrier-btn').forEach(x=>x.classList.remove('selected'));
    b.classList.add('selected'); logCarrier=b.dataset.carrier;
    prefs.carrier=logCarrier; save(KEYS.prefs,prefs);
  });

  // Size toggle
  document.getElementById('sizeToggle').addEventListener('click',e=>{
    const b=e.target.closest('.size-btn');if(!b)return;
    document.querySelectorAll('.size-btn').forEach(x=>x.classList.remove('selected'));
    b.classList.add('selected'); logSize=b.dataset.size;
    prefs.size=logSize; save(KEYS.prefs,prefs);
  });

  // Notes chips (multi-select)
  document.getElementById('notesChipGrid').addEventListener('click',e=>{
    const b=e.target.closest('.chip');if(!b)return;
    b.classList.toggle('selected');
    if(b.classList.contains('selected')) selectedNotes.add(b.dataset.note);
    else selectedNotes.delete(b.dataset.note);
  });

  // Staff grid
  document.getElementById('staffGrid').addEventListener('click',e=>{
    const b=e.target.closest('.staff-btn');if(!b)return;
    document.querySelectorAll('.staff-btn').forEach(x=>x.classList.remove('selected'));
    b.classList.add('selected'); logStaff=b.dataset.staff;
    prefs.staff=logStaff; save(KEYS.prefs,prefs);
  });

  // Resident search (log tab)
  setupResidentSearch('residentSearch','residentDropdown','log-resident-id', res => {
    document.getElementById('logAptValue').textContent = res.apartment;
    document.getElementById('logAptDisplay').style.display = 'flex';
    document.getElementById('logSubmit').disabled = false;
  });

  document.getElementById('clearResident').addEventListener('click',()=>{
    document.getElementById('log-resident-id').value='';
    document.getElementById('residentSearch').value='';
    document.getElementById('logAptDisplay').style.display='none';
    document.getElementById('logSubmit').disabled=true;
  });

  // Submit
  document.getElementById('logForm').addEventListener('submit',e=>{
    e.preventDefault();
    const resId=document.getElementById('log-resident-id').value;
    const res=residents.find(r=>r.id===resId);
    if(!res){toast('Select a resident','error');return;}

    const customNote=document.getElementById('log-notes-custom').value.trim();
    const allNotes=[...selectedNotes];
    if(customNote) allNotes.push(customNote);
    const tracking=document.getElementById('log-tracking').value.trim();

    const pkg={
      id:nextId(), residentId:res.id, residentName:res.name, apartment:res.apartment,
      carrier:logCarrier, size:logSize, tracking:tracking||null,
      notes:allNotes.length?allNotes.join(', '):null,
      loggedBy:logStaff, checkinTime:new Date().toISOString(), status:'pending',
      pickupTime:null, signature:null, typedSignature:null, signatureMethod:null
    };

    packages.push(pkg); save(KEYS.packages,packages);
    updatePending(); updateAnalytics(); renderDashboard();
    sync('logPackage',{package:pkg});
    if(res.email) sync('sendNotification',{email:res.email,residentName:res.name,apartment:res.apartment,carrier:pkg.carrier,size:pkg.size,packageId:pkg.id});

    showSuccess('Package Logged!',`#${pkg.id} — ${res.name} (Apt ${res.apartment}) — ${logCarrier} ${logSize}\nLogged: ${fmtFull(pkg.checkinTime)}`);
    launchConfetti(); setTimeout(stopConfetti, 3000);
    if(res.email) toast(`Notification sent to ${res.email}`,'info');

    // Undo support
    lastLoggedPkgId = pkg.id;
    showUndo(`Package #${pkg.id} logged for ${res.name}`);

    // Reset form
    document.getElementById('log-resident-id').value='';
    document.getElementById('residentSearch').value='';
    document.getElementById('logAptDisplay').style.display='none';
    document.getElementById('logSubmit').disabled=true;
    document.getElementById('log-tracking').value='';
    document.getElementById('log-notes-custom').value='';
    selectedNotes.clear();
    document.querySelectorAll('.chip.selected').forEach(c=>c.classList.remove('selected'));
  });

  // ── UNDO (Round 6) ──
  let undoTimer = null;
  function showUndo(text) {
    const bar = document.getElementById('undoBar');
    document.getElementById('undoText').textContent = text;
    bar.style.display = 'flex';
    clearTimeout(undoTimer);
    undoTimer = setTimeout(() => { bar.style.display='none'; lastLoggedPkgId=null; }, 6000);
  }

  document.getElementById('undoBtn').addEventListener('click',()=>{
    if(!lastLoggedPkgId) return;
    packages = packages.filter(p=>p.id!==lastLoggedPkgId);
    save(KEYS.packages,packages);
    updatePending(); updateAnalytics(); renderDashboard();
    document.getElementById('undoBar').style.display='none';
    toast('Package log undone','warning');
    lastLoggedPkgId=null;
  });

  // ══════════════════════════════════════════════
  //  PICKUP
  // ══════════════════════════════════════════════

  let selectedIds = new Set();

  setupResidentSearch('pkResidentSearch','pkResidentDropdown','pk-resident-id', res => {
    selectedIds.clear();
    renderPending(res.id);
  });

  function renderPending(resId) {
    const list=document.getElementById('pendingPackagesList');
    const sig=document.getElementById('signatureSection');
    if(!resId){list.innerHTML='<p class="empty-state">Search for a resident to see pending packages.</p>';sig.style.display='none';return;}
    const pending=packages.filter(p=>p.residentId===resId&&p.status==='pending');
    if(!pending.length){list.innerHTML='<p class="empty-state">No pending packages for this resident.</p>';sig.style.display='none';return;}

    // Select All button
    list.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.5rem;">
      <span style="font-size:0.82rem;color:var(--text-muted);font-weight:600;">${pending.length} package${pending.length>1?'s':''} pending</span>
      <button class="btn btn-outline" id="selectAllPkgs" style="min-height:36px;font-size:0.8rem;">Select All</button>
    </div>` + pending.map(p=>`
      <div class="pkg-item" data-pkg-id="${p.id}">
        <div class="pkg-item-info">
          <span><strong>#${p.id}</strong></span>
          <span>${esc(p.carrier)}</span>
          <span>${esc(p.size)}</span>
          <span>Delivered: ${fmtFull(p.checkinTime)}</span>
          ${p.notes?`<span>${esc(p.notes)}</span>`:''}
        </div>
        <input type="checkbox" data-cb="${p.id}">
      </div>`).join('');

    // Select All
    document.getElementById('selectAllPkgs').addEventListener('click',()=>{
      list.querySelectorAll('.pkg-item').forEach(item=>{
        const cb=item.querySelector('input[type="checkbox"]');
        cb.checked=true; selectedIds.add(Number(item.dataset.pkgId)); item.classList.add('selected');
      });
      sig.style.display='block';
    });

    list.querySelectorAll('.pkg-item').forEach(item=>{
      const cb=item.querySelector('input[type="checkbox"]');
      item.addEventListener('click',ev=>{
        if(ev.target!==cb) cb.checked=!cb.checked;
        const id=Number(item.dataset.pkgId);
        if(cb.checked){selectedIds.add(id);item.classList.add('selected');}
        else{selectedIds.delete(id);item.classList.remove('selected');}
        sig.style.display=selectedIds.size>0?'block':'none';
      });
    });
    sig.style.display='none';
  }

  // Sig toggle
  let sigMode='draw';
  document.querySelectorAll('.sig-toggle-btn').forEach(b=>{b.addEventListener('click',()=>{
    document.querySelectorAll('.sig-toggle-btn').forEach(x=>x.classList.remove('active'));
    b.classList.add('active'); sigMode=b.dataset.mode;
    document.getElementById('sigDrawMode').style.display=sigMode==='draw'?'block':'none';
    document.getElementById('sigTypeMode').style.display=sigMode==='type'?'block':'none';
  });});

  // Canvas
  const cv=document.getElementById('signatureCanvas'), cx=cv.getContext('2d');
  let drawing=false;
  function resizeCV(){const r=cv.parentElement.getBoundingClientRect();cv.width=r.width;cv.height=200;cx.strokeStyle='#1a1a2e';cx.lineWidth=2.5;cx.lineCap='round';cx.lineJoin='round';}
  function gp(e){const r=cv.getBoundingClientRect(),t=e.touches?e.touches[0]:e;return{x:t.clientX-r.left,y:t.clientY-r.top};}
  cv.addEventListener('mousedown',e=>{drawing=true;cx.beginPath();const p=gp(e);cx.moveTo(p.x,p.y);});
  cv.addEventListener('mousemove',e=>{if(!drawing)return;const p=gp(e);cx.lineTo(p.x,p.y);cx.stroke();});
  cv.addEventListener('mouseup',()=>drawing=false); cv.addEventListener('mouseleave',()=>drawing=false);
  cv.addEventListener('touchstart',e=>{e.preventDefault();drawing=true;cx.beginPath();const p=gp(e);cx.moveTo(p.x,p.y);},{passive:false});
  cv.addEventListener('touchmove',e=>{e.preventDefault();if(!drawing)return;const p=gp(e);cx.lineTo(p.x,p.y);cx.stroke();},{passive:false});
  cv.addEventListener('touchend',()=>drawing=false);
  window.addEventListener('resize',resizeCV); setTimeout(resizeCV,100);
  document.getElementById('clearSigBtn').addEventListener('click',()=>cx.clearRect(0,0,cv.width,cv.height));
  function isBlank(){const b=document.createElement('canvas');b.width=cv.width;b.height=cv.height;return cv.toDataURL()===b.toDataURL();}

  // Confirm Pickup
  document.getElementById('confirmPickupBtn').addEventListener('click',()=>{
    if(!selectedIds.size){toast('Select at least one package','error');return;}
    let sigData=null,typedName=null;
    if(sigMode==='draw'){if(isBlank()){toast('Draw your signature or switch to typed name','error');return;}sigData=cv.toDataURL('image/png');}
    else{typedName=document.getElementById('typedSignature').value.trim();if(!typedName){toast('Type your name to confirm','error');return;}}

    const now=new Date().toISOString();
    selectedIds.forEach(id=>{const pkg=packages.find(p=>p.id===id);if(pkg){pkg.status='picked_up';pkg.pickupTime=now;pkg.signature=sigData;pkg.typedSignature=typedName;pkg.signatureMethod=sigMode;sync('logPickup',{package:pkg});}});
    save(KEYS.packages,packages); updatePending(); updateAnalytics(); renderDashboard();

    const pkResId=document.getElementById('pk-resident-id').value;
    const pkRes=residents.find(r=>r.id===pkResId);
    showCelebration(pkRes?pkRes.name:(typedName||'Friend'), now);

    selectedIds.clear(); cx.clearRect(0,0,cv.width,cv.height);
    document.getElementById('typedSignature').value='';
    document.getElementById('signatureSection').style.display='none';
    renderPending(pkResId);
  });

  // ══════════════════════════════════════════════
  //  ANALYTICS
  // ══════════════════════════════════════════════

  function updateAnalytics(){
    const today=new Date();today.setHours(0,0,0,0);
    const tp=packages.filter(p=>new Date(p.checkinTime)>=today);
    const pend=packages.filter(p=>p.status==='pending');
    const over=pend.filter(p=>hBetween(p.checkinTime,new Date().toISOString())>=48);
    const pu=packages.filter(p=>p.status==='picked_up'&&p.pickupTime);
    let avg='—';
    if(pu.length){const t=pu.reduce((s,p)=>s+hBetween(p.checkinTime,p.pickupTime),0)/pu.length;
      avg=t<1?Math.round(t*60)+'m':t<24?t.toFixed(1)+'h':(t/24).toFixed(1)+'d';}
    const cc={};packages.forEach(p=>cc[p.carrier]=(cc[p.carrier]||0)+1);
    const top=Object.entries(cc).sort((a,b)=>b[1]-a[1])[0];
    document.getElementById('statToday').textContent=tp.length;
    document.getElementById('statPending').textContent=pend.length;
    document.getElementById('statOverdue').textContent=over.length;
    document.getElementById('statAvgPickup').textContent=avg;
    document.getElementById('statTopCarrier').textContent=top?top[0]:'—';
    document.getElementById('statLost').textContent=packages.filter(p=>p.status==='lost').length;
  }

  // ══════════════════════════════════════════════
  //  DASHBOARD
  // ══════════════════════════════════════════════

  function renderDashboard(){
    const tbody=document.getElementById('packageTableBody'), empty=document.getElementById('dashEmpty');
    const filter=document.getElementById('dashFilter').value, search=document.getElementById('dashSearch').value.toLowerCase();
    let data=[...packages];
    if(filter==='pending')data=data.filter(p=>p.status==='pending');
    if(filter==='picked_up')data=data.filter(p=>p.status==='picked_up');
    if(filter==='overdue')data=data.filter(p=>p.status==='pending'&&hBetween(p.checkinTime,new Date().toISOString())>=48);
    if(filter==='lost')data=data.filter(p=>p.status==='lost');
    if(search)data=data.filter(p=>p.residentName.toLowerCase().includes(search)||p.apartment.toLowerCase().includes(search)||p.carrier.toLowerCase().includes(search)||(p.tracking||'').toLowerCase().includes(search)||(p.notes||'').toLowerCase().includes(search)||String(p.id).includes(search));
    data.sort((a,b)=>new Date(b.checkinTime)-new Date(a.checkinTime));

    if(!data.length){tbody.innerHTML='';empty.style.display='block';empty.textContent=packages.length?'No matches.':'No packages logged yet.';return;}
    empty.style.display='none';

    tbody.innerHTML=data.map(p=>{
      const isOver=p.status==='pending'&&hBetween(p.checkinTime,new Date().toISOString())>=48;
      const isLost=p.status==='lost';
      let sc='status-pending', st='Pending';
      if(p.status==='picked_up'){sc='status-picked-up';st='Picked Up';}
      if(isOver){sc='status-overdue';st='OVERDUE';}
      if(isLost){sc='status-lost';st='LOST';}
      const rowStyle=isOver?' style="background:rgba(220,38,38,0.03);"':isLost?' style="background:rgba(139,69,19,0.03);"':'';

      // Action buttons
      let actions='';
      if(p.status==='pending') actions=`<button class="void-btn" data-void="${p.id}">Void</button> <button class="void-btn" data-lost="${p.id}" style="border-color:rgba(139,69,19,0.2);color:#8b4513;">Lost?</button>`;
      if(isLost) actions=`<button class="void-btn" data-found="${p.id}" style="border-color:rgba(22,163,74,0.2);color:var(--success);">Found</button>`;

      return `<tr${rowStyle}>
        <td><strong>#${p.id}</strong></td>
        <td>${fmtDate(p.checkinTime)}</td><td>${fmtTime(p.checkinTime)}</td>
        <td>${esc(p.residentName)}</td><td>${esc(p.apartment)}</td>
        <td>${esc(p.carrier)}</td><td>${esc(p.size)}</td>
        <td>${esc(p.notes||'—')}</td><td>${esc(p.loggedBy)}</td>
        <td><span class="status-badge ${sc}">${st}</span></td>
        <td>${p.pickupTime?fmtDate(p.pickupTime):'—'}</td><td>${p.pickupTime?fmtTime(p.pickupTime):'—'}</td>
        <td>${p.status==='picked_up'?(p.signatureMethod==='type'?esc(p.typedSignature||'—'):(p.signature?'Signed':'—')):'—'}</td>
        <td>${actions}</td>
      </tr>`;
    }).join('');

    // Action buttons
    tbody.querySelectorAll('[data-void]').forEach(b=>{b.addEventListener('click',()=>{
      if(!confirm('Void this package? It will be removed.'))return;
      packages=packages.filter(p=>p.id!==Number(b.dataset.void));
      save(KEYS.packages,packages);updatePending();updateAnalytics();renderDashboard();
      toast('Package voided','warning');
    });});

    // Lost package buttons
    tbody.querySelectorAll('[data-lost]').forEach(b=>{b.addEventListener('click',()=>{
      openLostModal(Number(b.dataset.lost));
    });});

    // Found buttons
    tbody.querySelectorAll('[data-found]').forEach(b=>{b.addEventListener('click',()=>{
      const pkg=packages.find(p=>p.id===Number(b.dataset.found));
      if(pkg){pkg.status='pending'; pkg.lostNote=null; pkg.lostAt=null;
        save(KEYS.packages,packages);updatePending();updateAnalytics();renderDashboard();
        toast('Package marked as found!','success');}
    });});
  }

  document.getElementById('dashFilter').addEventListener('change',renderDashboard);
  document.getElementById('dashSearch').addEventListener('input',renderDashboard);

  // CSV Export
  document.getElementById('exportCsvBtn').addEventListener('click',()=>{
    if(!packages.length){toast('No data','warning');return;}
    const h=['ID','Delivered Date','Delivered Time','Resident','Apartment','Carrier','Size','Tracking','Notes','Staff','Status','Pickup Date','Pickup Time','Sig Method','Signed Name'];
    const rows=packages.map(p=>[p.id,fmtDate(p.checkinTime),fmtTime(p.checkinTime),p.residentName,p.apartment,p.carrier,p.size,p.tracking||'',p.notes||'',p.loggedBy,p.status==='pending'?'Pending':'Picked Up',p.pickupTime?fmtDate(p.pickupTime):'',p.pickupTime?fmtTime(p.pickupTime):'',p.signatureMethod||'',p.typedSignature||'']);
    const csv=[h,...rows].map(r=>r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob=new Blob([csv],{type:'text/csv'}); const url=URL.createObjectURL(blob);
    const a=document.createElement('a');a.href=url;a.download=`the-remy-packages-${new Date().toISOString().slice(0,10)}.csv`;a.click();URL.revokeObjectURL(url);
    toast('CSV exported','success');
  });

  // ══════════════════════════════════════════════
  //  DEMO DATA
  // ══════════════════════════════════════════════

  function seedDemo(){
    if(residents.length||packages.length)return;
    const dr=[
      {id:crypto.randomUUID(),name:'Maria Santos',apartment:'101',email:'maria.santos@email.com',phone:'555-201-1010'},
      {id:crypto.randomUUID(),name:'James Parker',apartment:'102',email:'jparker77@email.com',phone:'555-201-1020'},
      {id:crypto.randomUUID(),name:'Aisha Thompson',apartment:'103',email:'aisha.t@email.com',phone:'555-201-1030'},
      {id:crypto.randomUUID(),name:'Kevin Nguyen',apartment:'201',email:'knguyen@email.com',phone:'555-201-2010'},
      {id:crypto.randomUUID(),name:'Rachel Kim',apartment:'202',email:'rachelkim@email.com',phone:'555-201-2020'},
      {id:crypto.randomUUID(),name:'David Washington',apartment:'203',email:'dwash@email.com',phone:'555-201-2030'},
      {id:crypto.randomUUID(),name:'Sophia Martinez',apartment:'204',email:'sophia.m@email.com',phone:'555-201-2040'},
      {id:crypto.randomUUID(),name:'Tyler Brooks',apartment:'301',email:'tbrooks@email.com',phone:'555-201-3010'},
      {id:crypto.randomUUID(),name:'Jasmine Lee',apartment:'302',email:'jasmine.lee@email.com',phone:'555-201-3020'},
      {id:crypto.randomUUID(),name:'Marcus Johnson',apartment:'303',email:'marcusj@email.com',phone:'555-201-3030'},
      {id:crypto.randomUUID(),name:'Emily Chen',apartment:'304',email:'echen@email.com',phone:'555-201-3040'},
      {id:crypto.randomUUID(),name:'Andre Williams',apartment:'401',email:'andre.w@email.com',phone:'555-201-4010'},
      {id:crypto.randomUUID(),name:'Natalie Rivera',apartment:'402',email:'natrivera@email.com',phone:'555-201-4020'},
      {id:crypto.randomUUID(),name:"Brian O'Malley",apartment:'403',email:'bomalley@email.com',phone:'555-201-4030'},
      {id:crypto.randomUUID(),name:'Lisa Patel',apartment:'404',email:'lisa.patel@email.com',phone:'555-201-4040'},
      {id:crypto.randomUUID(),name:'Darnell White',apartment:'501',email:'dwhite@email.com',phone:'555-201-5010'},
      {id:crypto.randomUUID(),name:'Yuki Tanaka',apartment:'502',email:'yuki.t@email.com',phone:'555-201-5020'},
      {id:crypto.randomUUID(),name:'Carlos Reyes',apartment:'503',email:'creyes@email.com',phone:'555-201-5030'},
      {id:crypto.randomUUID(),name:'Hannah Morgan',apartment:'601',email:'hmorgan@email.com',phone:'555-201-6010'},
      {id:crypto.randomUUID(),name:'Robert Chen',apartment:'602',email:'rchen@email.com',phone:'555-201-6020'},
    ];
    residents=dr;save(KEYS.residents,residents);
    packages=[
      {id:1,residentId:dr[0].id,residentName:'Maria Santos',apartment:'101',carrier:'Amazon',size:'Medium',tracking:'TBA927364810',notes:'Multiple Boxes',loggedBy:'Alex M.',checkinTime:daysAgo(5),status:'picked_up',pickupTime:daysAgo(4.5),signature:null,typedSignature:'Maria Santos',signatureMethod:'type'},
      {id:2,residentId:dr[4].id,residentName:'Rachel Kim',apartment:'202',carrier:'USPS',size:'Envelope',tracking:'9400111899223847563012',notes:null,loggedBy:'Front Desk',checkinTime:daysAgo(4),status:'picked_up',pickupTime:daysAgo(3.5),signature:null,typedSignature:'Rachel Kim',signatureMethod:'type'},
      {id:3,residentId:dr[7].id,residentName:'Tyler Brooks',apartment:'301',carrier:'UPS',size:'Large',tracking:'1Z999AA10123456784',notes:'Heavy, Fragile',loggedBy:'Jordan T.',checkinTime:daysAgo(3),status:'picked_up',pickupTime:daysAgo(2.5),signature:null,typedSignature:'Tyler Brooks',signatureMethod:'type'},
      {id:4,residentId:dr[9].id,residentName:'Marcus Johnson',apartment:'303',carrier:'FedEx',size:'Small',tracking:'7489273649201',notes:null,loggedBy:'Front Desk',checkinTime:daysAgo(2),status:'picked_up',pickupTime:daysAgo(1.5),signature:null,typedSignature:'Marcus Johnson',signatureMethod:'type'},
      {id:5,residentId:dr[15].id,residentName:'Darnell White',apartment:'501',carrier:'Amazon',size:'Small',tracking:'TBA192837465',notes:null,loggedBy:'Sam R.',checkinTime:daysAgo(1.5),status:'picked_up',pickupTime:daysAgo(1),signature:null,typedSignature:'Darnell White',signatureMethod:'type'},
      {id:6,residentId:dr[2].id,residentName:'Aisha Thompson',apartment:'103',carrier:'Amazon',size:'Small',tracking:'TBA038571924',notes:'Electronics',loggedBy:'Front Desk',checkinTime:hoursAgo(8),status:'pending',pickupTime:null,signature:null,typedSignature:null,signatureMethod:null},
      {id:7,residentId:dr[5].id,residentName:'David Washington',apartment:'203',carrier:'FedEx',size:'Medium',tracking:'2748192034851',notes:'Fragile, Electronics',loggedBy:'Chris P.',checkinTime:hoursAgo(6),status:'pending',pickupTime:null,signature:null,typedSignature:null,signatureMethod:null},
      {id:8,residentId:dr[8].id,residentName:'Jasmine Lee',apartment:'302',carrier:'UPS',size:'Large',tracking:'1Z999BB20198765432',notes:'Heavy',loggedBy:'Front Desk',checkinTime:hoursAgo(4),status:'pending',pickupTime:null,signature:null,typedSignature:null,signatureMethod:null},
      {id:9,residentId:dr[11].id,residentName:'Andre Williams',apartment:'401',carrier:'USPS',size:'Envelope',tracking:'9261290100130435895854',notes:'Documents/Legal',loggedBy:'Taylor K.',checkinTime:hoursAgo(3),status:'pending',pickupTime:null,signature:null,typedSignature:null,signatureMethod:null},
      {id:10,residentId:dr[14].id,residentName:'Lisa Patel',apartment:'404',carrier:'Amazon',size:'Oversized',tracking:'TBA748293015',notes:'Oversized - Behind Desk, Heavy',loggedBy:'Front Desk',checkinTime:hoursAgo(2),status:'pending',pickupTime:null,signature:null,typedSignature:null,signatureMethod:null},
      {id:11,residentId:dr[3].id,residentName:'Kevin Nguyen',apartment:'201',carrier:'DHL',size:'Small',tracking:'1234567890',notes:'Perishable',loggedBy:'Alex M.',checkinTime:hoursAgo(1),status:'pending',pickupTime:null,signature:null,typedSignature:null,signatureMethod:null},
      {id:12,residentId:dr[17].id,residentName:'Carlos Reyes',apartment:'503',carrier:'Amazon',size:'Medium',tracking:'TBA556473829',notes:null,loggedBy:'Front Desk',checkinTime:hoursAgo(0.5),status:'pending',pickupTime:null,signature:null,typedSignature:null,signatureMethod:null},
      {id:13,residentId:dr[18].id,residentName:'Hannah Morgan',apartment:'601',carrier:'USPS',size:'Small',tracking:'9400128205559012345678',notes:'Medicine/Rx',loggedBy:'Jordan T.',checkinTime:daysAgo(3),status:'pending',pickupTime:null,signature:null,typedSignature:null,signatureMethod:null},
    ];
    save(KEYS.packages,packages);
  }

  // ══════════════════════════════════════════════
  //  LOST PACKAGE MODAL
  // ══════════════════════════════════════════════

  let lostTargetId = null;

  function openLostModal(pkgId) {
    const pkg = packages.find(p=>p.id===pkgId);
    if(!pkg) return;
    lostTargetId = pkgId;
    document.getElementById('lostPkgLabel').textContent = `#${pkg.id} — ${pkg.residentName} (${pkg.carrier} ${pkg.size})`;
    document.getElementById('lostNoteText').value = '';
    document.getElementById('lostModal').style.display = 'flex';
  }

  document.getElementById('lostCancelBtn').addEventListener('click',()=>{
    document.getElementById('lostModal').style.display='none'; lostTargetId=null;
  });

  document.getElementById('lostConfirmBtn').addEventListener('click',()=>{
    if(!lostTargetId) return;
    const pkg=packages.find(p=>p.id===lostTargetId);
    if(pkg){
      pkg.status='lost';
      pkg.lostAt=new Date().toISOString();
      pkg.lostNote=document.getElementById('lostNoteText').value.trim()||null;
      save(KEYS.packages,packages); updatePending(); updateAnalytics(); renderDashboard();
      toast(`Package #${pkg.id} marked as lost`,'error');
    }
    document.getElementById('lostModal').style.display='none'; lostTargetId=null;
  });

  // ══════════════════════════════════════════════
  //  SHIFT NOTES
  // ══════════════════════════════════════════════

  let shiftNoteStaff = 'Front Desk';

  document.getElementById('shiftNoteStaff').addEventListener('click',e=>{
    const b=e.target.closest('.staff-btn');if(!b)return;
    document.querySelectorAll('#shiftNoteStaff .staff-btn').forEach(x=>x.classList.remove('selected'));
    b.classList.add('selected'); shiftNoteStaff=b.dataset.staff;
  });

  document.getElementById('shiftNoteForm').addEventListener('submit',e=>{
    e.preventDefault();
    const text=document.getElementById('shiftNoteText').value.trim();
    if(!text){toast('Write a note first','error');return;}
    shiftNotes.unshift({
      id: crypto.randomUUID(),
      text,
      from: shiftNoteStaff,
      time: new Date().toISOString(),
      pinned: false
    });
    save(KEYS.shiftNotes,shiftNotes);
    document.getElementById('shiftNoteText').value='';
    renderShiftNotes();
    toast('Shift note posted','success');
  });

  function renderShiftNotes(){
    const list=document.getElementById('shiftNotesList');
    const empty=document.getElementById('shiftNotesEmpty');
    if(!shiftNotes.length){list.innerHTML='';empty.style.display='block';return;}
    empty.style.display='none';

    // Pinned first, then by time
    const sorted=[...shiftNotes].sort((a,b)=>{
      if(a.pinned&&!b.pinned)return -1; if(!a.pinned&&b.pinned)return 1;
      return new Date(b.time)-new Date(a.time);
    });

    list.innerHTML=sorted.map(n=>`
      <div class="shift-note${n.pinned?' pinned':''}" data-note-id="${n.id}">
        <div class="shift-note-header">
          <span class="shift-note-from">${esc(n.from)}${n.pinned?' — Pinned':''}</span>
          <span class="shift-note-time">${fmtFull(n.time)}</span>
        </div>
        <div class="shift-note-body">${esc(n.text)}</div>
        <div class="shift-note-actions">
          <button class="note-action-btn" data-pin="${n.id}">${n.pinned?'Unpin':'Pin'}</button>
          <button class="note-action-btn" data-delnote="${n.id}">Delete</button>
        </div>
      </div>
    `).join('');

    list.querySelectorAll('[data-pin]').forEach(b=>{b.addEventListener('click',()=>{
      const note=shiftNotes.find(n=>n.id===b.dataset.pin);
      if(note){note.pinned=!note.pinned;save(KEYS.shiftNotes,shiftNotes);renderShiftNotes();}
    });});

    list.querySelectorAll('[data-delnote]').forEach(b=>{b.addEventListener('click',()=>{
      shiftNotes=shiftNotes.filter(n=>n.id!==b.dataset.delnote);
      save(KEYS.shiftNotes,shiftNotes);renderShiftNotes();toast('Note deleted','warning');
    });});
  }

  // ══════════════════════════════════════════════
  //  CARRIER DIRECTORY — Copy to clipboard
  // ══════════════════════════════════════════════

  document.getElementById('carrierDirectory').addEventListener('click',e=>{
    const phone=e.target.closest('[data-copy]');
    if(!phone)return;
    e.preventDefault();
    navigator.clipboard.writeText(phone.dataset.copy).then(()=>{
      toast(`Copied: ${phone.dataset.copy}`,'info');
    }).catch(()=>{});
  });

  // ══════════════════════════════════════════════
  //  STATS DASHBOARD — Render Charts
  // ══════════════════════════════════════════════

  function renderStats() {
    if (typeof Charts === 'undefined') return;

    // KPIs
    const today = new Date(); today.setHours(0,0,0,0);
    const todayPkgs = packages.filter(p => new Date(p.checkinTime) >= today);
    const pu = packages.filter(p => p.status === 'picked_up' && p.pickupTime);
    const sameDayPU = pu.filter(p => {
      const ci = new Date(p.checkinTime); ci.setHours(0,0,0,0);
      const po = new Date(p.pickupTime); po.setHours(0,0,0,0);
      return ci.getTime() === po.getTime();
    });
    const rate = pu.length ? Math.round((sameDayPU.length / pu.length) * 100) : 0;
    let avg = '—';
    if (pu.length) {
      const t = pu.reduce((s, p) => s + hBetween(p.checkinTime, p.pickupTime), 0) / pu.length;
      avg = t < 1 ? Math.round(t * 60) + 'm' : t < 24 ? t.toFixed(1) + 'h' : (t / 24).toFixed(1) + 'd';
    }

    document.getElementById('kpiTotal').textContent = packages.length;
    document.getElementById('kpiToday2').textContent = todayPkgs.length;
    document.getElementById('kpiPickupRate').textContent = rate + '%';
    document.getElementById('kpiAvg2').textContent = avg;

    // Volume line chart — last 14 days
    const volData = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i); d.setHours(0,0,0,0);
      const next = new Date(d); next.setDate(next.getDate() + 1);
      const count = packages.filter(p => { const t = new Date(p.checkinTime); return t >= d && t < next; }).length;
      volData.push({ label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), value: count });
    }
    Charts.line('chartVolume', volData, { color: '#c9a84c' });

    // Carrier donut
    const cc = {};
    packages.forEach(p => cc[p.carrier] = (cc[p.carrier] || 0) + 1);
    const carrierData = Object.entries(cc).sort((a, b) => b[1] - a[1]).map(([label, value]) => ({ label, value }));
    Charts.donut('chartCarrier', carrierData, { centerLabel: 'Packages' });

    // Size bar chart
    const sc = {};
    packages.forEach(p => sc[p.size] = (sc[p.size] || 0) + 1);
    const sizeData = ['Envelope', 'Small', 'Medium', 'Large', 'Oversized'].filter(s => sc[s]).map(s => ({ label: s, value: sc[s] || 0 }));
    Charts.bars('chartSize', sizeData);

    // Day of week heatmap
    const dayCount = [0, 0, 0, 0, 0, 0, 0];
    packages.forEach(p => { dayCount[new Date(p.checkinTime).getDay()]++; });
    const dayData = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((label, i) => ({ label, value: dayCount[i] }));
    Charts.heatmap('chartDays', dayData);

    // Render feedback
    renderFeedback();
  }

  // Re-render charts when stats tab is clicked
  document.querySelectorAll('.tab-btn').forEach(b => {
    b.addEventListener('click', () => { if (b.dataset.tab === 'stats') setTimeout(renderStats, 50); });
  });

  // ══════════════════════════════════════════════
  //  FEEDBACK SYSTEM
  // ══════════════════════════════════════════════

  let feedbackRating = 0;
  let feedbackResName = '';

  // Star hover/click
  document.getElementById('starRating').addEventListener('click', e => {
    const star = e.target.closest('.star');
    if (!star) return;
    feedbackRating = Number(star.dataset.star);
    document.querySelectorAll('#starRating .star').forEach(s => {
      s.classList.toggle('active', Number(s.dataset.star) <= feedbackRating);
    });
  });

  document.getElementById('starRating').addEventListener('mouseover', e => {
    const star = e.target.closest('.star');
    if (!star) return;
    const val = Number(star.dataset.star);
    document.querySelectorAll('#starRating .star').forEach(s => {
      s.style.color = Number(s.dataset.star) <= val ? '#c9a84c' : '';
    });
  });

  document.getElementById('starRating').addEventListener('mouseleave', () => {
    document.querySelectorAll('#starRating .star').forEach(s => {
      s.style.color = s.classList.contains('active') ? '#c9a84c' : '';
    });
  });

  function showFeedbackModal(resName) {
    feedbackResName = resName;
    feedbackRating = 0;
    document.querySelectorAll('#starRating .star').forEach(s => s.classList.remove('active'));
    document.getElementById('feedbackText').value = '';
    document.getElementById('feedbackModal').style.display = 'flex';
  }

  document.getElementById('feedbackSkipBtn').addEventListener('click', () => {
    document.getElementById('feedbackModal').style.display = 'none';
  });

  document.getElementById('feedbackSubmitBtn').addEventListener('click', () => {
    if (!feedbackRating) { toast('Tap a star rating', 'error'); return; }
    const text = document.getElementById('feedbackText').value.trim();
    feedback.unshift({
      id: crypto.randomUUID(),
      name: feedbackResName,
      rating: feedbackRating,
      text: text || null,
      time: new Date().toISOString()
    });
    save(KEYS.feedback, feedback);
    document.getElementById('feedbackModal').style.display = 'none';
    toast('Thanks for your feedback!', 'success');
    renderFeedback();
  });

  function renderFeedback() {
    const list = document.getElementById('feedbackList');
    const empty = document.getElementById('feedbackEmpty');
    if (!feedback.length) { list.innerHTML = ''; empty.style.display = 'block'; return; }
    empty.style.display = 'none';
    list.innerHTML = feedback.slice(0, 20).map(f => {
      const stars = '&#9733;'.repeat(f.rating) + '<span style="opacity:0.15;">' + '&#9733;'.repeat(5 - f.rating) + '</span>';
      return `<div class="feedback-item">
        <div class="feedback-stars">${stars}</div>
        <div class="feedback-body">
          <div class="feedback-body-name">${esc(f.name)}</div>
          ${f.text ? `<div class="feedback-body-text">"${esc(f.text)}"</div>` : ''}
          <div class="feedback-body-time">${fmtFull(f.time)}</div>
        </div>
      </div>`;
    }).join('');
  }

  // ══════════════════════════════════════════════
  //  PRINT FULL LOG
  // ══════════════════════════════════════════════

  document.getElementById('printLogBtn').addEventListener('click', () => {
    window.print();
  });

  // ══════════════════════════════════════════════
  //  INIT
  // ══════════════════════════════════════════════

  seedDemo();
  renderResidents();
  renderDashboard();
  renderShiftNotes();
  renderFeedback();
  updatePending();
  updateAnalytics();

  document.getElementById('resetDemoBtn').addEventListener('click',()=>{
    if(!confirm('Erase all data and reload demo?'))return;
    localStorage.removeItem(KEYS.residents);localStorage.removeItem(KEYS.packages);
    localStorage.removeItem(KEYS.prefs);localStorage.removeItem(KEYS.shiftNotes);
    localStorage.removeItem(KEYS.feedback);
    location.reload();
  });

})();
