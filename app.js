'use strict';
const KEY='medal-tracker-v1';const $=id=>document.getElementById(id);const fmt=n=>`${n>0?'+':''}${n.toLocaleString('ja-JP')}枚`;const localDate=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
let records=[];let editing=null;
try{const data=JSON.parse(localStorage.getItem(KEY)||'[]');if(Array.isArray(data))records=data.filter(validRecord)}catch(e){alert('保存済みデータを読み込めませんでした。バックアップから復元してください。')}
function validRecord(r){return r&&typeof r.id==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(r.date)&&Number.isSafeInteger(r.invest)&&r.invest>=0&&Number.isSafeInteger(r.payout)&&r.payout>=0}
function save(){try{localStorage.setItem(KEY,JSON.stringify(records));return true}catch(e){alert('保存に失敗しました。空き容量やブラウザ設定を確認してください。');return false}}
function net(r){return r.payout-r.invest}function tint(el,n){el.classList.toggle('pos',n>0);el.classList.toggle('neg',n<0)}
function preview(){const a=$('invest').value,b=$('payout').value;const ok=a!==''&&b!==''&&Number.isSafeInteger(+a)&&Number.isSafeInteger(+b)&&+a>=0&&+b>=0;const n=+b-+a;$('preview').textContent=ok?`収支：${fmt(n)}`:'収支：—';tint($('preview'),ok?n:0)}
function resetForm(){editing=null;$('entryForm').reset();$('date').value=localDate();$('formTitle').textContent='新しい記録';$('saveButton').textContent='記録を保存';$('cancelEdit').classList.add('hidden');preview()}
$('entryForm').addEventListener('submit',e=>{e.preventDefault();const invest=Number($('invest').value),payout=Number($('payout').value),date=$('date').value;if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||![invest,payout].every(n=>Number.isSafeInteger(n)&&n>=0))return alert('正しい日付と0以上の整数を入力してください。');const before=records.slice();if(editing){records=records.map(r=>r.id===editing?{id:editing,date,invest,payout}:r)}else{records.push({id:(crypto.randomUUID?crypto.randomUUID():String(Date.now())+Math.random()),date,invest,payout})}if(!save()){records=before;return}resetForm();render()});
$('cancelEdit').addEventListener('click',resetForm);['invest','payout'].forEach(id=>$(id).addEventListener('input',preview));
$('filter').addEventListener('change',render);
$('history').addEventListener('click',e=>{const btn=e.target.closest('button[data-action]');if(!btn)return;const r=records.find(x=>x.id===btn.dataset.id);if(!r)return;if(btn.dataset.action==='delete'){if(!confirm(`${r.date} の記録を削除しますか？`))return;const old=records.slice();records=records.filter(x=>x.id!==r.id);if(!save())records=old;render()}else{editing=r.id;$('date').value=r.date;$('invest').value=r.invest;$('payout').value=r.payout;$('formTitle').textContent='記録を編集';$('saveButton').textContent='変更を保存';$('cancelEdit').classList.remove('hidden');preview();$('entryForm').scrollIntoView({behavior:'smooth',block:'center'})}});
function render(){const sorted=[...records].sort((a,b)=>a.date.localeCompare(b.date)||a.id.localeCompare(b.id));const month=localDate().slice(0,7);const total=records.reduce((s,r)=>s+net(r),0);const monthly=records.filter(r=>r.date.startsWith(month)).reduce((s,r)=>s+net(r),0);$('total').textContent=fmt(total);$('monthly').textContent=fmt(monthly);tint($('total'),total);tint($('monthly'),monthly);$('count').textContent=`${records.length}回`;$('winrate').textContent=records.length?`${Math.round(records.filter(r=>net(r)>0).length/records.length*100)}%`:'—';const shown=sorted.filter(r=>$('filter').value==='all'||r.date.startsWith(month)).reverse();const history=$('history');history.replaceChildren();if(!shown.length){const p=document.createElement('div');p.className='empty';p.textContent='まだ記録がありません';history.append(p)}for(const r of shown){const entry=document.createElement('div');entry.className='entry';const head=document.createElement('div');head.className='row';const left=document.createElement('div');const date=document.createElement('strong');date.textContent=r.date;const details=document.createElement('div');details.className='muted';details.textContent=`投入 ${r.invest.toLocaleString()}枚 / 獲得 ${r.payout.toLocaleString()}枚`;left.append(date,details);const right=document.createElement('div');right.style.textAlign='right';const amount=document.createElement('strong');amount.textContent=fmt(net(r));tint(amount,net(r));const buttons=document.createElement('div');buttons.style.marginTop='6px';for(const [action,label] of [['edit','編集'],['delete','削除']]){const b=document.createElement('button');b.textContent=label;b.dataset.action=action;b.dataset.id=r.id;b.style.marginLeft='5px';buttons.append(b)}right.append(amount,buttons);head.append(left,right);entry.append(head);history.append(entry)}drawChart(sorted)}
function drawChart(sorted){
  const c=$('chart'),w=Math.max(c.getBoundingClientRect().width,200),h=240,dpr=window.devicePixelRatio||1;
  c.width=Math.round(w*dpr);c.height=Math.round(h*dpr);
  const ctx=c.getContext('2d');ctx.scale(dpr,dpr);ctx.clearRect(0,0,w,h);
  let sum=0;const values=[0,...sorted.map(r=>(sum+=net(r)))];
  const dataMin=Math.min(...values),dataMax=Math.max(...values);
  // Five equal intervals with a human-friendly step (1, 2, 5 x powers of ten).
  const needed=Math.max(dataMax-dataMin,Math.abs(dataMin),Math.abs(dataMax),5);
  const rough=needed/5;
  const power=Math.pow(10,Math.floor(Math.log10(rough)));
  const step=[1,2,5,10].map(n=>n*power).find(n=>n>=rough)||10*power;
  let bottom=Math.floor(dataMin/step)*step;
  let top=bottom+5*step;
  if(top<dataMax){bottom=Math.ceil(dataMax/step)*step-5*step;top=bottom+5*step}
  // Keep zero on the axis and leave breathing room for a flat series.
  if(dataMin===dataMax){bottom=Math.min(0,bottom);top=bottom+5*step}
  const left=Math.min(86,Math.max(58,Math.ceil(String(Math.max(Math.abs(bottom),Math.abs(top))).length*9+20)));
  const right=12,up=14,down=26,plotW=w-left-right,plotH=h-up-down;
  const x=i=>left+plotW*i/Math.max(values.length-1,1);
  const y=n=>up+(top-n)/(top-bottom)*plotH;
  ctx.font='12px -apple-system, BlinkMacSystemFont, sans-serif';ctx.textAlign='right';ctx.textBaseline='middle';
  for(let i=0;i<=5;i++){
    const tick=bottom+i*step,yy=y(tick);
    ctx.beginPath();ctx.strokeStyle=tick===0?'#94a3b8':'#35435e';ctx.lineWidth=tick===0?1.4:1;
    ctx.moveTo(left,yy);ctx.lineTo(w-right,yy);ctx.stroke();
    ctx.fillStyle=tick===0?'#e2e8f0':'#aab4c6';ctx.fillText(`${tick.toLocaleString('ja-JP')}`,left-9,yy);
  }
  ctx.fillStyle='#aab4c6';ctx.textAlign='left';ctx.textBaseline='alphabetic';ctx.fillText('枚',6,12);
  if(sorted.length){
    ctx.beginPath();ctx.strokeStyle='#818cf8';ctx.lineWidth=2.8;ctx.lineJoin='round';ctx.lineCap='round';
    values.forEach((n,i)=>i?ctx.lineTo(x(i),y(n)):ctx.moveTo(x(i),y(n)));ctx.stroke();
    const last=values.at(-1);ctx.beginPath();ctx.fillStyle='#a5b4fc';ctx.arc(x(values.length-1),y(last),4,0,Math.PI*2);ctx.fill();
  }
  $('chartNote').textContent=sorted.length?`初回からの累計推移（${sorted.length}件）・縦軸 ${step.toLocaleString('ja-JP')}枚刻み / 5分割`:'記録するとグラフが表示されます（縦軸：枚数 / 5分割）';
}
function download(name,content,type){const blob=new Blob([content],{type});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500)}
$('exportCsv').addEventListener('click',()=>{const rows=['日付,投入枚数,最終獲得枚数,収支',...records.map(r=>`${r.date},${r.invest},${r.payout},${net(r)}`)];download(`medals-${localDate()}.csv`,'\ufeff'+rows.join('\r\n'),'text/csv;charset=utf-8')});
$('exportJson').addEventListener('click',()=>download(`medals-backup-${localDate()}.json`,JSON.stringify({version:1,records},null,2),'application/json'));
$('importBtn').addEventListener('click',()=>$('importFile').click());$('importFile').addEventListener('change',async e=>{const file=e.target.files[0];if(!file)return;try{const data=JSON.parse(await file.text());if(data.version!==1||!Array.isArray(data.records)||!data.records.every(validRecord)||new Set(data.records.map(r=>r.id)).size!==data.records.length)throw Error('形式が正しくありません');if(!confirm(`バックアップ ${data.records.length}件で現在の${records.length}件を置き換えますか？`))return;const old=records;records=data.records;if(!save())records=old;resetForm();render()}catch(err){alert('正しいバックアップファイルを選択してください。')}finally{e.target.value=''}});
window.addEventListener('resize',()=>drawChart([...records].sort((a,b)=>a.date.localeCompare(b.date)||a.id.localeCompare(b.id))));resetForm();render();if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});
