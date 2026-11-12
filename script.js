const KEY='club-attendance-v1';
const COLORS=['#4f6df5','#e8590c','#12a36b','#a855f7','#d6336c','#0ea5e9'];
const today=()=>fmt(new Date());
function fmt(d){const z=n=>String(n).padStart(2,'0');return d.getFullYear()+'-'+z(d.getMonth()+1)+'-'+z(d.getDate())}
function daysAgo(n){const d=new Date();d.setDate(d.getDate()-n);return fmt(d)}
const pretty=s=>new Date(s+'T00:00').toLocaleDateString(undefined,{weekday:'short',day:'numeric',month:'short'});
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

function seed(){
  const members=[{id:'S001',name:'Aarav Sharma',roll:'CS-101'},{id:'S002',name:'Diya Patel',roll:'CS-102'},{id:'S003',name:'Rohan Nair',roll:'CS-103'}];
  const sessions=[14,11,7,4,1].map(n=>daysAgo(n));
  const att={};  // date -> {id: time}
  const pat={S001:[1,1,1,1,1],S002:[1,1,0,1,1],S003:[1,0,0,1,0]};
  sessions.forEach((d,i)=>{att[d]={};members.forEach(m=>{if(pat[m.id][i])att[d][m.id]='17:0'+i})});
  return {members,att};
}
let db;
try{db=JSON.parse(localStorage.getItem(KEY))}catch(e){}
if(!db||!db.members){db=seed();save()}
function save(){try{localStorage.setItem(KEY,JSON.stringify(db))}catch(e){}}

const sessions=()=>Object.keys(db.att).sort();
const pct=id=>{const s=sessions();if(!s.length)return 0;return Math.round(s.filter(d=>db.att[d][id]).length/s.length*100)};
const present=(id,d)=>!!(db.att[d]||{})[id];
const col=pct=>pct>=75?'var(--ok)':pct>=50?'var(--warn)':'var(--bad)';
const initials=n=>n.split(' ').map(w=>w[0]).join('').slice(0,2);
const colorOf=id=>COLORS[db.members.findIndex(m=>m.id===id)%COLORS.length];

function checkIn(id){
  const m=db.members.find(x=>x.id===id);
  if(!m)return {status:'unknown'};
  const d=today();db.att[d]=db.att[d]||{};
  if(db.att[d][id])return {status:'dup',m,time:db.att[d][id]};
  const t=new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'});
  db.att[d][id]=t;save();return {status:'ok',m,time:t};
}
function showResult(r){
  const ov=document.getElementById('ov');
  let body;
  if(r.status==='unknown')body=`<div class="big bad">✕</div><h2>Tag not recognised</h2><p class="sub">This member ID isn't registered.</p>`;
  else{
    const ok=r.status==='ok';
    body=`<div class="big ${ok?'ok':'warn'}">${ok?'✓':'!'}</div>
    <h2>${ok?'You’re marked present!':'Already checked in'}</h2>
    <p class="sub"><b>${esc(r.m.name)}</b> · ${esc(r.m.roll)}<br>${pretty(today())} at ${esc(r.time)}</p>
    <p>Overall attendance: <b style="color:${col(pct(r.m.id))}">${pct(r.m.id)}%</b></p>`;
  }
  ov.innerHTML=`<div class="overlay"><div class="pop">${body}<button class="btn p" onclick="closeOv()">Continue</button></div></div>`;
}
function closeOv(){document.getElementById('ov').innerHTML='';history.replaceState(null,'',location.pathname);render()}
function toast(t){const e=document.createElement('div');e.className='toast';e.textContent=t;document.body.appendChild(e);setTimeout(()=>e.remove(),2200)}

let tab='today';
const tabs={today:'Today',members:'Members',records:'Records',nfc:'NFC Setup'};
function nav(){document.getElementById('nav').innerHTML=Object.entries(tabs).map(([k,v])=>`<button class="${k===tab?'on':''}" onclick="go('${k}')">${v}</button>`).join('')}
function go(t){tab=t;render()}

function render(){
  nav();
  const a=document.getElementById('app');
  a.innerHTML=({today:vToday,members:vMembers,records:vRecords,nfc:vNfc})[tab]();
}

function vToday(){
  const d=today(),n=db.members.length,p=db.members.filter(m=>present(m.id,d)).length;
  const avg=n?Math.round(db.members.reduce((s,m)=>s+pct(m.id),0)/n):0;
  return `<h2>Today</h2><p class="sub">${new Date().toLocaleDateString(undefined,{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</p>
  <div class="grid" style="margin-bottom:16px">
    <div class="card stat"><b style="color:var(--ok)">${p}</b><span>Present today</span></div>
    <div class="card stat"><b style="color:var(--bad)">${n-p}</b><span>Not yet / absent</span></div>
    <div class="card stat"><b>${sessions().length}</b><span>Sessions held</span></div>
    <div class="card stat"><b style="color:var(--brand)">${avg}%</b><span>Club average</span></div>
  </div>
  <div class="card"><b>Who’s here</b>
  ${db.members.map(m=>{const t=(db.att[d]||{})[m.id];return `<div class="row">
    <div class="av" style="background:${colorOf(m.id)}">${initials(m.name)}</div>
    <div class="grow"><div class="name">${esc(m.name)}</div><div class="mute">${esc(m.roll)} · ${pct(m.id)}% overall</div></div>
    ${t?`<span class="pill ok">Present · ${esc(t)}</span>`:`<span class="pill bad">Absent</span>`}
    ${t?'':`<button class="btn" onclick="tap('${m.id}')">Simulate NFC tap</button>`}
  </div>`}).join('')}
  <div class="tip">Demo tip: “Simulate NFC tap” does exactly what a real tag does — it opens <code>/?m=ID</code>.</div></div>`;
}
function tap(id){showResult(checkIn(id));}

function vMembers(){
  return `<h2>Members</h2><p class="sub">Attendance calculated across ${sessions().length} sessions.</p>
  <div class="card">${db.members.map(m=>{const s=sessions(),c=s.filter(x=>present(m.id,x)).length,p=pct(m.id);return `<div class="row">
   <div class="av" style="background:${colorOf(m.id)}">${initials(m.name)}</div>
   <div class="grow"><div class="name">${esc(m.name)} <span class="mute">${esc(m.roll)}</span></div>
     <div class="mute">${c} of ${s.length} sessions attended</div>
     <div class="bar2"><div style="width:${p}%;background:${col(p)}"></div></div></div>
   <b style="font-size:20px;color:${col(p)}">${p}%</b></div>`}).join('')}</div>
  <p class="mute">Green ≥ 75% · Amber 50–74% · Red below 50%</p>`;
}

function vRecords(){
  const s=sessions();
  return `<h2>Attendance Records</h2><p class="sub">Every session, every member.</p>
  <div class="card scroll"><table><tr><th>Member</th>${s.map(d=>`<th>${pretty(d)}</th>`).join('')}<th>%</th></tr>
  ${db.members.map(m=>`<tr><td><b>${esc(m.name)}</b></td>${s.map(d=>present(m.id,d)?`<td><span class="dot ok">P</span></td>`:`<td><span class="dot bad">A</span></td>`).join('')}<td><b style="color:${col(pct(m.id))}">${pct(m.id)}%</b></td></tr>`).join('')}
  <tr><td class="mute">Present count</td>${s.map(d=>`<td class="mute">${Object.keys(db.att[d]).length}/${db.members.length}</td>`).join('')}<td></td></tr>
  </table></div>
  <p><button class="btn" onclick="csv()">Download CSV</button> <button class="btn" onclick="resetDemo()">Reset demo data</button></p>`;
}
function csv(){
  const s=sessions();let o='Name,Roll,'+s.join(',')+',Attendance %\n';
  db.members.forEach(m=>o+=[m.name,m.roll,...s.map(d=>present(m.id,d)?'Present':'Absent'),pct(m.id)].join(',')+'\n');
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([o],{type:'text/csv'}));a.download='attendance.csv';a.click();
}
function resetDemo(){if(confirm('Reset all data to the demo set?')){db=seed();save();render();toast('Demo data reset')}}

function vNfc(){
  const base=location.origin+location.pathname.replace(/index\.html$/,'');
  const can='NDEFReader' in window;
  return `<h2>NFC Setup</h2><p class="sub">Each member gets one NFC tag that holds their personal link.</p>
  <div class="card">${db.members.map(m=>`<div class="row">
    <div class="av" style="background:${colorOf(m.id)}">${initials(m.name)}</div>
    <div class="grow"><div class="name">${esc(m.name)}</div><div class="url">${base}?m=${m.id}</div></div>
    <button class="btn" onclick="writeTag('${m.id}')">Write tag</button></div>`).join('')}</div>
  <div class="card" style="margin-top:14px"><b>How it works</b>
  <ol><li>Write each member’s link onto an NFC sticker (button above, or any NFC writer app).</li>
  <li>Member taps their phone on the tag → this site opens → they’re marked present for today.</li>
  <li>A new session is created automatically on the first tap of each day.</li></ol>
  <div class="tip">${can?'Web NFC is available on this device.':'“Write tag” needs Chrome on Android over HTTPS. Otherwise copy the link into an NFC writer app (e.g. NFC Tools).'}</div></div>
  <div class="card" style="margin-top:14px"><b>Add a member</b>
  <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap"><input id="nn" placeholder="Name" style="flex:2;min-width:140px"><input id="nr" placeholder="Roll no." style="flex:1;min-width:100px"><button class="btn p" onclick="addM()">Add</button></div></div>`;
}
async function writeTag(id){
  if(!('NDEFReader' in window))return toast('Web NFC not supported here — copy the link instead');
  try{const url=location.origin+location.pathname.replace(/index\.html$/,'')+'?m='+id;
    toast('Hold a tag near the phone…');await new NDEFReader().write({records:[{recordType:'url',data:url}]});toast('Tag written ✓')}
  catch(e){toast('Could not write: '+e.message)}
}
function addM(){
  const n=document.getElementById('nn').value.trim(),r=document.getElementById('nr').value.trim();
  if(!n)return toast('Enter a name');
  const id='S'+String(db.members.length+1).padStart(3,'0');
  db.members.push({id,name:n,roll:r||'—'});save();render();toast('Added '+n);
}

// handle NFC link: ?m=S001
const q=new URLSearchParams(location.search).get('m');
render();
if(q)showResult(checkIn(q.toUpperCase()));
