// ── CONFIG ──────────────────────────────────────────────────────────────────
const MODEL_URL        = "https://teachablemachine.withgoogle.com/models/MZin2nasg/";
const CONFIDENCE       = 0.80;
const SCAN_HOLD_MS     = 1800;   // hold-steady before adding to cart
const BUFFER_MS        = 4000;
const PREDICT_EVERY_MS = 250;

// ── UPI CONFIG — edit these ─────────────────────────────────────────────────
// Set your merchant UPI ID here. QR will encode a proper UPI deep link.
const MERCHANT_UPI_ID   = "merchant@upi";      // e.g. yourname@paytm
const MERCHANT_NAME     = "SmartBilling";

// ── TWILIO SMS — direct API (no proxy needed) ────────────────────────────────
// Uses Basic Auth directly to Twilio's REST API, same as the standalone sender.
let twilioConfig = JSON.parse(localStorage.getItem('twilio_config') || 'null');

function updateTwilioCredStatus(){
  const sid   = document.getElementById('tw-sid') ? document.getElementById('tw-sid').value.trim() : '';
  const token = document.getElementById('tw-token') ? document.getElementById('tw-token').value.trim() : '';
  const from  = document.getElementById('tw-from') ? document.getElementById('tw-from').value.trim() : '';
  const statusEl = document.getElementById('twilio-cred-status');
  const sendBtn  = document.getElementById('btn-send-sms');
  const hasAll = sid.startsWith('AC') && token.length > 0 && from.startsWith('+');
  if(statusEl){
    if(hasAll){
      statusEl.style.cssText = 'font-family:var(--mono);font-size:10px;padding:6px 10px;border-radius:6px;background:#d4edda;color:#155724;margin-top:6px;';
      statusEl.textContent = '✅ Credentials valid — ready to send SMS';
    } else {
      statusEl.style.cssText = 'font-family:var(--mono);font-size:10px;padding:6px 10px;border-radius:6px;background:var(--card3);color:var(--ink3);margin-top:6px;';
      const missing = [];
      if(!sid.startsWith('AC')) missing.push('Account SID (starts with AC)');
      if(!token) missing.push('Auth Token');
      if(!from.startsWith('+')) missing.push('Phone Number (starts with +)');
      statusEl.textContent = '⚠ Missing: ' + missing.join(', ');
    }
  }
  if(sendBtn) sendBtn.disabled = !hasAll;
}

function saveTwilioConfig(){
  const sid   = document.getElementById('tw-sid').value.trim();
  const token = document.getElementById('tw-token').value.trim();
  const from  = document.getElementById('tw-from').value.trim();
  if(!sid.startsWith('AC') || !token || !from.startsWith('+')){
    showToast('Fill all 3 Twilio fields correctly','warn'); return;
  }
  twilioConfig = { sid, token, from };
  localStorage.setItem('twilio_config', JSON.stringify(twilioConfig));
  showToast('✅ Twilio credentials saved!','success');
}

function buildSMSText(){
  const lines = cartItems.map(i=>`${i.name} x${i.qty}=Rs${i.totalPrice}`).join(', ');
  return `SmartBill: ${lines}. TOTAL: Rs${total}. Thank you! -${MERCHANT_NAME}`;
}

function openTwilioModal(){
  // Legacy function — Twilio is now a home-page card; just update SMS preview
  if(document.getElementById('sms-preview')){
    document.getElementById('sms-preview').textContent = buildSMSText();
  }
}

async function sendSMSViaTwilio(mobile){
  const sid   = document.getElementById('tw-sid').value.trim();
  const token = document.getElementById('tw-token').value.trim();
  const from  = document.getElementById('tw-from').value.trim();
  const statusEl = document.getElementById('sms-status');

  if(!mobile){ statusEl.textContent = '⚠ Enter recipient number with country code'; return false; }
  const phoneRegex = /^\+\d{10,15}$/;
  if(!phoneRegex.test(mobile)){ statusEl.textContent = '❌ Invalid format. Use +919876543210'; return false; }
  if(!sid || !token || !from){ statusEl.textContent = '⚠ Save Twilio credentials first'; return false; }

  const btn = document.getElementById('btn-send-sms');
  if(btn) btn.disabled = true;
  statusEl.style.color = 'var(--ink3)';
  statusEl.textContent = '📡 Connecting to Twilio…';

  try {
    const apiUrl = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;
    const formData = new URLSearchParams();
    formData.append('To', mobile);
    formData.append('From', from);
    formData.append('Body', buildSMSText());

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + btoa(`${sid}:${token}`),
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: formData
    });
    const data = await response.json();

    if(response.ok){
      statusEl.style.color = 'var(--green)';
      statusEl.textContent = `✅ SMS sent! SID: ${data.sid}`;
      showToast('📱 Bill SMS sent!','success');
      if(btn) btn.disabled = false;
      return true;
    } else {
      let errMsg = data.message || 'Twilio error';
      if(errMsg.includes('not verified')) errMsg = 'Number not verified. Trial accounts must verify numbers in Twilio Console → Verified Caller IDs.';
      else if(errMsg.includes('authenticate')) errMsg = 'Wrong Account SID or Auth Token.';
      statusEl.style.color = 'var(--red)';
      statusEl.textContent = '❌ ' + errMsg;
      if(btn) btn.disabled = false;
      return false;
    }
  } catch(e) {
    statusEl.style.color = 'var(--red)';
    statusEl.textContent = '❌ Network error — check connection or ad-blocker';
    if(btn) btn.disabled = false;
    return false;
  }
}

function sendSMSFromModal(){
  const mobile = document.getElementById('sms-mobile').value.trim();
  sendSMSViaTwilio(mobile);
}

function proceedToPayment(){ checkout(); }
function sendAndPay(){ sendSMSFromModal(); }
function sendSMSReceipt(){}
function sendSMSReceiptCash(){}

// Load saved Twilio config on startup
window.addEventListener('DOMContentLoaded', ()=>{
  if(twilioConfig){
    setTimeout(()=>{
      const s = document.getElementById('tw-sid');
      const t = document.getElementById('tw-token');
      const f = document.getElementById('tw-from');
      if(s) s.value = twilioConfig.sid || '';
      if(t) t.value = twilioConfig.token || '';
      if(f) f.value = twilioConfig.from || '';
      updateTwilioCredStatus();
    }, 200);
  }
});

// ── PRODUCT DATA ────────────────────────────────────────────────────────────
const PRODUCT_DATA = {
  Coke:   { price:40,  emoji:'🥤', class:'0' },
  KitKat: { price:30,  emoji:'🍫', class:'1' },
  Lays:   { price:20,  emoji:'🍟', class:'2' },
};
const VALID_PRODUCTS = Object.keys(PRODUCT_DATA);

const RECO_RULES = {
  Coke:   ['Lays','KitKat'],
  Lays:   ['Coke'],
  KitKat: ['Coke','Lays'],
};

const CLASS_MAP = {
  "0":"Coke","1":"KitKat","2":"Lays","3":"nothing",
  "Coke":"Coke","coke":"Coke",
  "KitKat":"KitKat","kitkat":"KitKat",
  "Lays":"Lays","lays":"Lays",
  "nothing":"nothing","Nothing":"nothing"
};

// ── LANGUAGES ───────────────────────────────────────────────────────────────
const LANG = {
  en:{
    'txt-cart':'Cart','txt-no-items':'No items scanned yet','txt-items':'Items','txt-discount':'Discount',
    'txt-total':'Total','txt-checkout':'Proceed to Checkout','txt-clear':'Clear Cart',
    'txt-detected-item':'Detected item','txt-confidence':'Confidence','txt-camera-off':'Camera off',
    'txt-start-cam':'Start Camera','txt-manual-add':'Quick Add Items','txt-quantity':'Qty',
    'txt-add-btn':'Add','txt-stat-items':'Items','txt-stat-unique':'Unique','txt-stat-avg':'Avg Price',
    'txt-reco':'Suggested for you','txt-undo':'Undo','txt-redo':'Redo',
    'txt-payment-title':'💳 Payment','txt-payment-sub':'Scan QR · Confirm · Done',
    'txt-bill-amount':'Bill Amount','txt-cash-received':'Cash Received',
    'txt-ch-total':'Bill Total','txt-ch-received':'Received','txt-ch-change':'Change',
    'txt-split-btn':'Split Bill','txt-receipt-btn':'Receipt',
  },
  hi:{
    'txt-cart':'कार्ट','txt-no-items':'कोई आइटम नहीं','txt-items':'आइटम','txt-discount':'छूट',
    'txt-total':'कुल','txt-checkout':'चेकआउट करें','txt-clear':'कार्ट खाली करें',
    'txt-detected-item':'पहचाना गया','txt-confidence':'विश्वास','txt-camera-off':'कैमरा बंद',
    'txt-start-cam':'कैमरा शुरू करें','txt-manual-add':'आइटम जोड़ें','txt-quantity':'मात्रा',
    'txt-add-btn':'जोड़ें','txt-stat-items':'आइटम','txt-stat-unique':'अलग','txt-stat-avg':'औसत',
    'txt-reco':'सुझाव','txt-undo':'वापस','txt-redo':'फिर',
    'txt-payment-title':'💳 भुगतान','txt-payment-sub':'QR स्कैन करें',
    'txt-bill-amount':'बिल राशि','txt-cash-received':'नकद',
    'txt-ch-total':'कुल','txt-ch-received':'प्राप्त','txt-ch-change':'वापसी',
    'txt-split-btn':'बिल बाँटें','txt-receipt-btn':'रसीद',
  },
  gu:{
    'txt-cart':'કાર્ટ','txt-no-items':'આઈટમ નથી','txt-items':'આઈટમ','txt-discount':'ડિસ્કાઉન્ટ',
    'txt-total':'કુલ','txt-checkout':'ચેકઆઉટ','txt-clear':'કાર્ટ સાફ',
    'txt-detected-item':'ઓળખ','txt-confidence':'ખાતરી','txt-camera-off':'કૅમેરો બંધ',
    'txt-start-cam':'કૅમેરો શરૂ','txt-manual-add':'આઈટમ ઉમેરો','txt-quantity':'જથ્થો',
    'txt-add-btn':'ઉમેરો','txt-stat-items':'આઈટમ','txt-stat-unique':'અલગ','txt-stat-avg':'સરેરાશ',
    'txt-reco':'સૂચન','txt-undo':'પૂર્વવત','txt-redo':'ફ઼ેર',
    'txt-payment-title':'💳 ચૂકવણી','txt-payment-sub':'QR સ્કૅન કરો',
    'txt-bill-amount':'રકમ','txt-cash-received':'નાણું',
    'txt-ch-total':'કુલ','txt-ch-received':'મળ્યું','txt-ch-change':'બાકી',
    'txt-split-btn':'ખર્ચ વહેંચો','txt-receipt-btn':'રસીદ',
  },
  es:{
    'txt-cart':'Carrito','txt-no-items':'Sin artículos','txt-items':'Artículos','txt-discount':'Descuento',
    'txt-total':'Total','txt-checkout':'Pagar','txt-clear':'Vaciar',
    'txt-detected-item':'Detectado','txt-confidence':'Confianza','txt-camera-off':'Cámara apagada',
    'txt-start-cam':'Iniciar cámara','txt-manual-add':'Añadir','txt-quantity':'Cantidad',
    'txt-add-btn':'Añadir','txt-stat-items':'Artículos','txt-stat-unique':'Únicos','txt-stat-avg':'Promedio',
    'txt-reco':'Sugerencias','txt-undo':'Deshacer','txt-redo':'Rehacer',
    'txt-payment-title':'💳 Pago','txt-payment-sub':'Escanea el QR',
    'txt-bill-amount':'Total','txt-cash-received':'Efectivo',
    'txt-ch-total':'Total','txt-ch-received':'Recibido','txt-ch-change':'Cambio',
    'txt-split-btn':'Dividir','txt-receipt-btn':'Recibo',
  },
  fr:{
    'txt-cart':'Panier','txt-no-items':'Aucun article','txt-items':'Articles','txt-discount':'Remise',
    'txt-total':'Total','txt-checkout':'Commander','txt-clear':'Vider',
    'txt-detected-item':'Détecté','txt-confidence':'Confiance','txt-camera-off':'Caméra éteinte',
    'txt-start-cam':'Démarrer','txt-manual-add':'Ajouter','txt-quantity':'Quantité',
    'txt-add-btn':'Ajouter','txt-stat-items':'Articles','txt-stat-unique':'Uniques','txt-stat-avg':'Moy.',
    'txt-reco':'Suggestions','txt-undo':'Annuler','txt-redo':'Refaire',
    'txt-payment-title':'💳 Paiement','txt-payment-sub':'Scannez le QR',
    'txt-bill-amount':'Montant','txt-cash-received':'Espèces',
    'txt-ch-total':'Total','txt-ch-received':'Reçu','txt-ch-change':'Monnaie',
    'txt-split-btn':'Partager','txt-receipt-btn':'Reçu',
  },
  ar:{
    'txt-cart':'السلة','txt-no-items':'لا توجد عناصر','txt-items':'عناصر','txt-discount':'خصم',
    'txt-total':'الإجمالي','txt-checkout':'الدفع','txt-clear':'إفراغ',
    'txt-detected-item':'المكتشف','txt-confidence':'الثقة','txt-camera-off':'الكاميرا مغلقة',
    'txt-start-cam':'تشغيل','txt-manual-add':'إضافة','txt-quantity':'الكمية',
    'txt-add-btn':'أضف','txt-stat-items':'عناصر','txt-stat-unique':'مختلفة','txt-stat-avg':'متوسط',
    'txt-reco':'مقترحات','txt-undo':'تراجع','txt-redo':'إعادة',
    'txt-payment-title':'💳 الدفع','txt-payment-sub':'امسح رمز QR',
    'txt-bill-amount':'المبلغ','txt-cash-received':'النقد',
    'txt-ch-total':'الإجمالي','txt-ch-received':'المستلم','txt-ch-change':'الباقي',
    'txt-split-btn':'تقسيم','txt-receipt-btn':'فاتورة',
  },
  mr:{
    'txt-cart':'कार्ट','txt-no-items':'वस्तू नाही','txt-items':'वस्तू','txt-discount':'सूट',
    'txt-total':'एकूण','txt-checkout':'चेकआउट','txt-clear':'कार्ट रिकामी',
    'txt-detected-item':'ओळखले','txt-confidence':'खात्री','txt-camera-off':'कॅमेरा बंद',
    'txt-start-cam':'कॅमेरा सुरू','txt-manual-add':'वस्तू जोडा','txt-quantity':'प्रमाण',
    'txt-add-btn':'जोडा','txt-stat-items':'वस्तू','txt-stat-unique':'वेगळ्या','txt-stat-avg':'सरासरी',
    'txt-reco':'सुचवलेले','txt-undo':'मागे','txt-redo':'पुढे',
    'txt-payment-title':'💳 पेमेंट','txt-payment-sub':'QR स्कॅन करा',
    'txt-bill-amount':'बिल रक्कम','txt-cash-received':'रोख',
    'txt-ch-total':'एकूण','txt-ch-received':'मिळाले','txt-ch-change':'परत',
    'txt-split-btn':'बिल विभागा','txt-receipt-btn':'पावती',
  },
};
let currentLang = 'en';

function setLanguage(lang){
  currentLang = lang;
  const dict = LANG[lang]||LANG.en;
  for(const[id,text] of Object.entries(dict)){const el=document.getElementById(id);if(el)el.textContent=text;}
  document.dir=(lang==='ar')?'rtl':'ltr';
  buildManualGrid(); if(splitPeople.length) renderSplitUI();
}

// ── STATE ────────────────────────────────────────────────────────────────────
let model,webcam,running=false,lastPredictTime=0;
let trackItem=null,trackStart=null,lastAdded="",lastAddedTime=0;
let cartItems=[],total=0,manualQty=1;
let undoStack=[],redoStack=[];

// ── INIT ─────────────────────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded',async()=>{
  buildManualGrid(); buildQtySelect(); updateUndoRedo();
  document.getElementById('upi-id-display').textContent = MERCHANT_UPI_ID;
  try{
    const resp=await fetch(MODEL_URL+'metadata.json');
    const meta=await resp.json();
    if(meta.labels&&Array.isArray(meta.labels)){
      for(const label of meta.labels){
        const norm=label.trim();
        if(!norm||norm.toLowerCase()==='nothing'||norm==='3')continue;
        if(norm.toLowerCase().includes('coca')||norm.toLowerCase().includes('cola'))continue;
        const mapped=CLASS_MAP[norm]||CLASS_MAP[norm.toLowerCase()]||norm;
        if(!PRODUCT_DATA[mapped]&&!VALID_PRODUCTS.includes(mapped)){
          PRODUCT_DATA[mapped]={price:50,emoji:'📦',class:norm};
          VALID_PRODUCTS.push(mapped); CLASS_MAP[norm]=mapped;
        }
      }
      buildManualGrid(); buildQtySelect();
    }
  }catch(e){}
});

function buildManualGrid(){
  const grid=document.getElementById('manual-grid'); grid.innerHTML='';
  for(const[name,data] of Object.entries(PRODUCT_DATA)){
    const btn=document.createElement('button'); btn.className='manual-btn';
    btn.innerHTML=`${data.emoji} ${name}<span class="price">₹${data.price}</span>`;
    btn.onclick=()=>addToCart(name,1); grid.appendChild(btn);
  }
}

function buildQtySelect(){
  const sel=document.getElementById('qty-item-select'); sel.innerHTML='';
  for(const[name,data] of Object.entries(PRODUCT_DATA)){
    const opt=document.createElement('option'); opt.value=name;
    opt.textContent=`${data.emoji} ${name} — ₹${data.price}`; sel.appendChild(opt);
  }
}

function switchTab(tab){
  document.getElementById('scan-tab').style.display=tab==='scan'?'':'none';
  document.getElementById('manual-tab').style.display=tab==='manual'?'':'none';
  document.getElementById('tab-scan').classList.toggle('active',tab==='scan');
  document.getElementById('tab-manual').classList.toggle('active',tab==='manual');
  if(tab==='manual') updateStats();
}

function changeQty(delta){manualQty=Math.max(1,Math.min(20,manualQty+delta)); document.getElementById('qty-val').textContent=manualQty;}
function addQtyItem(){const sel=document.getElementById('qty-item-select'); const name=sel.value; if(!name||!PRODUCT_DATA[name])return; addToCart(name,manualQty);}

// ── CAMERA ───────────────────────────────────────────────────────────────────
async function startCamera(){
  const btn=document.getElementById('btn-start'); const errEl=document.getElementById('err-box');
  errEl.classList.remove('on'); btn.disabled=true;
  document.getElementById('txt-start-cam').textContent='Loading model…'; setStatus('loading','LOADING');
  try{
    model=await tmImage.load(MODEL_URL+'model.json',MODEL_URL+'metadata.json');
    document.getElementById('txt-start-cam').textContent='Starting…';
    webcam=new tmImage.Webcam(300,300,true); await webcam.setup(); await webcam.play();
    document.body.appendChild(webcam.canvas);
    webcam.canvas.style.cssText='position:fixed;top:-9999px;left:-9999px;opacity:0;pointer-events:none;';
    document.getElementById('vbox').classList.add('on');
    document.getElementById('txt-start-cam').textContent='📡 Scanner Active';
    btn.disabled=true; setStatus('live','LIVE'); running=true; requestAnimationFrame(loop);
  }catch(e){
    errEl.textContent='Error: Allow camera permissions or run on localhost.'; errEl.classList.add('on');
    btn.disabled=false; document.getElementById('txt-start-cam').textContent='▶ Retry'; setStatus('err','ERROR');
  }
}

function loop(){if(!running)return; webcam.update(); const now=Date.now(); if(now-lastPredictTime>=PREDICT_EVERY_MS){lastPredictTime=now; predict(now);} requestAnimationFrame(loop);}

function getProduct(className){
  if(!className)return null; const raw=className.trim();
  if(raw.toLowerCase().includes('coca')||raw.toLowerCase().includes('cola'))return 'Coke';
  const mapped=CLASS_MAP[raw]||CLASS_MAP[raw.toLowerCase()];
  if(mapped&&VALID_PRODUCTS.includes(mapped))return mapped;
  if(VALID_PRODUCTS.includes(raw))return raw; return null;
}

let detectBufferStart=null,detectBufferItem=null;

async function predict(now){
  let preds; try{preds=await model.predict(webcam.canvas);}catch(e){return;}
  let best=preds[0]; for(const p of preds)if(p.probability>best.probability)best=p;
  const pct=Math.round(best.probability*100); let product=getProduct(best.className);
  const isNothing=best.className&&(best.className.toLowerCase().includes('nothing')||best.className==='3');
  if(isNothing&&best.probability>=CONFIDENCE)product=null;
  updateConfBar(pct);
  const bufBar=document.getElementById('buffer-bar'); const bufLabel=document.getElementById('buffer-label');
  if(product&&best.probability>=CONFIDENCE){
    document.getElementById('det-name').textContent=product; document.getElementById('det-name').classList.add('hi');
    document.getElementById('scan-item-name').textContent=PRODUCT_DATA[product].emoji+' '+product;
    document.getElementById('reticle-core').classList.add('tracking');
    // No detect buffer — start SCAN_HOLD tracking immediately
    bufBar.style.width='0%'; bufLabel.classList.remove('show');
    if(product!==trackItem){trackItem=product; trackStart=now; updateRing(0,false);}
    const held=now-trackStart; const prog=Math.min(held/SCAN_HOLD_MS,1); updateRing(prog,false);
    const secs=Math.ceil((SCAN_HOLD_MS-held)/1000);
    document.getElementById('scan-status-txt').textContent=prog<1?`Hold steady… ${secs}s`:'Adding…';
    if(prog>=1){
      const cool=(product!==lastAdded)||(now-lastAddedTime>BUFFER_MS);
      if(cool){addToCart(product,1); lastAdded=product; lastAddedTime=now;}
      trackItem=null; trackStart=null; detectBufferItem=null; detectBufferStart=null; updateRing(0,true);
      document.getElementById('scan-status-txt').textContent='Waiting for item…';
      document.getElementById('scan-item-name').textContent=''; document.getElementById('reticle-core').classList.remove('tracking');
    }
  }else{
    trackItem=null; trackStart=null; detectBufferItem=null; detectBufferStart=null;
    bufBar.style.width='0%'; bufLabel.classList.remove('show'); updateRing(0,false);
    document.getElementById('det-name').textContent='—'; document.getElementById('det-name').classList.remove('hi');
    document.getElementById('scan-item-name').textContent=''; document.getElementById('scan-status-txt').textContent='Waiting for item…';
    document.getElementById('reticle-core').classList.remove('tracking');
  }
}

function updateRing(progress,flash){
  const circ=2*Math.PI*18; const ring=document.getElementById('ring'); const pct=document.getElementById('ring-pct');
  if(ring)ring.style.strokeDashoffset=circ*(1-progress); pct.textContent=progress>0?Math.round(progress*100)+'%':'';
  if(flash&&ring){ring.style.stroke='var(--green)'; setTimeout(()=>{if(ring)ring.style.stroke='';},300);}
}

function updateConfBar(pct){
  const fill=document.getElementById('conf-fill'); fill.style.width=pct+'%';
  fill.className='conf-fill '+(pct>=85?'hi':pct>=55?'md':'lo'); document.getElementById('conf-num').textContent=pct+'%';
}

function setStatus(state,txt){
  const pill=document.getElementById('status-pill');
  pill.className='status-pill '+(state==='live'?'live':state==='err'?'err':'');
  document.getElementById('status-txt').textContent=txt;
}

// ── CART ─────────────────────────────────────────────────────────────────────
function pushUndoState(){undoStack.push(JSON.stringify({items:cartItems,total})); redoStack=[]; updateUndoRedo();}
function undoAction(){if(!undoStack.length)return; redoStack.push(JSON.stringify({items:cartItems,total})); const prev=JSON.parse(undoStack.pop()); cartItems=prev.items; total=prev.total; renderCart(); updateUndoRedo(); showToast('↩ Undone','warn');}
function redoAction(){if(!redoStack.length)return; undoStack.push(JSON.stringify({items:cartItems,total})); const next=JSON.parse(redoStack.pop()); cartItems=next.items; total=next.total; renderCart(); updateUndoRedo(); showToast('↪ Redone','warn');}
function updateUndoRedo(){document.getElementById('btn-undo').disabled=!undoStack.length; document.getElementById('btn-redo').disabled=!redoStack.length;}

function addToCart(item,qty){
  if(!PRODUCT_DATA[item])return; pushUndoState(); const price=PRODUCT_DATA[item].price;
  const existing=cartItems.find(i=>i.name===item);
  if(existing){existing.qty+=qty; existing.totalPrice+=price*qty;}
  else{cartItems.push({id:Date.now(),name:item,qty,price,totalPrice:price*qty});}
  total+=price*qty; renderCart(); updateStats(); showRecommendations(item);
  showToast(`${PRODUCT_DATA[item].emoji} ${item} ×${qty} added`,'success');
}

function removeItem(id){
  const idx=cartItems.findIndex(i=>i.id===id); if(idx===-1)return; pushUndoState();
  total-=cartItems[idx].totalPrice; cartItems.splice(idx,1); renderCart(); updateStats();
}

function changeItemQty(id,delta){
  const item=cartItems.find(i=>i.id===id); if(!item)return; const newQty=item.qty+delta;
  if(newQty<=0){removeItem(id);return;} pushUndoState();
  total+=item.price*delta; item.qty=newQty; item.totalPrice=item.price*newQty; renderCart(); updateStats();
}

function clearCart(){
  if(!cartItems.length)return; pushUndoState(); cartItems=[]; total=0;
  trackItem=null; trackStart=null; lastAdded=''; renderCart(); updateStats();
  document.getElementById('reco-section').style.display='none'; showToast('Cart cleared','warn');
}

function renderCart(){
  const list=document.getElementById('cart-list'); const n=cartItems.length;
  document.getElementById('badge').textContent=n+' item'+(n!==1?'s':'');
  document.getElementById('count-foot').textContent=n;
  document.getElementById('btn-checkout').disabled=n===0;
  document.getElementById('empty-state').style.display=n===0?'flex':'none';
  const td=document.getElementById('total-disp');
  td.textContent='₹'+total; document.getElementById('total-foot').textContent='₹'+total;
  td.classList.add('bump'); setTimeout(()=>td.classList.remove('bump'),140);
  list.querySelectorAll('.citem').forEach(el=>el.remove());
  for(const item of cartItems){
    const div=document.createElement('div'); div.className='citem';
    div.innerHTML=`<span class="citem-emoji">${PRODUCT_DATA[item.name].emoji}</span>
      <div class="citem-info"><div class="citem-name">${item.name}</div><div class="citem-qty">₹${item.price} × ${item.qty}</div></div>
      <span class="citem-price">₹${item.totalPrice}</span>
      <div class="citem-btns">
        <button class="citem-btn" data-id="${item.id}" data-d="-1">−</button>
        <button class="citem-btn" data-id="${item.id}" data-d="1">+</button>
        <button class="citem-btn del" data-id="${item.id}" data-del="1">×</button>
      </div>`;
    list.appendChild(div);
  }
  list.querySelectorAll('.citem-btn').forEach(btn=>{
    btn.addEventListener('click',()=>{const id=Number(btn.dataset.id); if(btn.dataset.del)removeItem(id); else changeItemQty(id,Number(btn.dataset.d));});
  });
}

function updateStats(){
  const n=cartItems.reduce((s,i)=>s+i.qty,0); const unique=cartItems.length;
  const avg=n>0?Math.round(total/n):0;
  document.getElementById('stat-items').textContent=n;
  document.getElementById('stat-unique').textContent=unique;
  document.getElementById('stat-avg').textContent='₹'+avg;
}

function showRecommendations(lastItem){
  const inCart=new Set(cartItems.map(i=>i.name));
  const recos=(RECO_RULES[lastItem]||[]).filter(p=>!inCart.has(p)&&PRODUCT_DATA[p]);
  const sec=document.getElementById('reco-section'); const chips=document.getElementById('reco-chips');
  if(!recos.length){sec.style.display='none';return;}
  sec.style.display=''; chips.innerHTML='';
  for(const name of recos){
    const chip=document.createElement('div'); chip.className='reco-chip';
    chip.innerHTML=`${PRODUCT_DATA[name].emoji} ${name} <span class="reco-chip-price">₹${PRODUCT_DATA[name].price}</span>`;
    chip.onclick=()=>{addToCart(name,1); chip.remove(); if(!chips.children.length)sec.style.display='none';};
    chips.appendChild(chip);
  }
}

// ── CHECKOUT / PAYMENT ───────────────────────────────────────────────────────
const DENOMINATIONS = [2000,500,200,100,50,20,10,5,2,1];

function checkout(){
  if(!cartItems.length)return;

  // Set amount display
  document.getElementById('rzp-amount-disp').textContent = '₹'+total;
  document.getElementById('sms-status').textContent = '';

  // Update SMS preview with current cart
  const smsPreview = document.getElementById('sms-preview');
  if(smsPreview) smsPreview.textContent = buildSMSText();

  openModal('qr-modal');
}

function completePay(){
  closeModal('qr-modal');
  clearCart();
  showToast('✅ Payment complete!','success');
}

function openPaymentModal(){ checkout(); }

function switchPayTab(){} // no-op — tabs removed

function buildQuickAmounts(){} // no-op — cash removed
function calcChange(){}        // no-op — cash removed
function confirmCash(){}       // no-op — cash removed

// ── RECEIPT ──────────────────────────────────────────────────────────────────
function openReceiptModal(){
  const now=new Date().toLocaleString();
  const rows=cartItems.map(i=>`<div class="receipt-item"><span>${PRODUCT_DATA[i.name].emoji} ${i.name} <span class="qty">×${i.qty}</span></span><span>₹${i.totalPrice}</span></div>`).join('')||'<div style="color:var(--ink3);text-align:center;padding:8px;font-size:11px">Cart is empty</div>';
  document.getElementById('receipt-content').innerHTML=`<div class="receipt-head"><div class="receipt-store">SmartBilling</div><div class="receipt-date">${now}</div></div><div class="receipt-items">${rows}</div><hr class="receipt-divider"><div class="receipt-total"><span>TOTAL</span><span>₹${total}</span></div><div class="receipt-footer">Thank you for shopping!<br>Powered by SmartBilling AI</div>`;
  openModal('receipt-modal');
}

function printReceipt(){window.print();}

// ── SPLIT BILL ────────────────────────────────────────────────────────────────
let splitPeople=[],activeSplitPerson=0;

function openSplitModal(){
  if(!cartItems.length){showToast('Add items first','warn');return;}
  splitPeople=[{name:'Person 1',assignedItems:new Set()}]; activeSplitPerson=0;
  renderSplitUI(); openModal('split-modal');
}

function addSplitPerson(){splitPeople.push({name:`Person ${splitPeople.length+1}`,assignedItems:new Set()}); activeSplitPerson=splitPeople.length-1; renderSplitUI();}
function removeSplitPerson(idx){if(splitPeople.length<=1)return; splitPeople.splice(idx,1); activeSplitPerson=Math.min(activeSplitPerson,splitPeople.length-1); renderSplitUI();}
function setActivePerson(idx){activeSplitPerson=idx; renderSplitUI();}
function toggleItemAssignment(cartItemId){
  const person=splitPeople[activeSplitPerson]; if(!person)return;
  splitPeople.forEach((p,i)=>{if(i!==activeSplitPerson)p.assignedItems.delete(cartItemId);});
  if(person.assignedItems.has(cartItemId))person.assignedItems.delete(cartItemId); else person.assignedItems.add(cartItemId);
  renderSplitUI();
}
function getPersonTotal(person){let t=0; for(const id of person.assignedItems){const item=cartItems.find(i=>i.id===id); if(item)t+=item.totalPrice;} return t;}

function renderSplitUI(){
  const tabsEl=document.getElementById('split-people-tabs'); tabsEl.innerHTML='';
  splitPeople.forEach((p,i)=>{
    const t=getPersonTotal(p); const tab=document.createElement('div');
    tab.className='split-person-tab'+(i===activeSplitPerson?' active':'');
    tab.innerHTML=`<span>${p.name}</span><span class="tab-amt">₹${t}</span>`+(splitPeople.length>1?`<button class="split-tab-del" onclick="event.stopPropagation();removeSplitPerson(${i})">×</button>`:'');
    tab.onclick=()=>setActivePerson(i); tabsEl.appendChild(tab);
  });
  const itemList=document.getElementById('split-item-list'); itemList.innerHTML='';
  cartItems.forEach(item=>{
    const owner=splitPeople.findIndex(p=>p.assignedItems.has(item.id));
    const isAssignedToActive=owner===activeSplitPerson; const isAssignedToOther=owner!==-1&&owner!==activeSplitPerson;
    const row=document.createElement('div'); row.className='split-item-row'+(isAssignedToActive?' assigned':'');
    row.style.opacity=isAssignedToOther?'0.4':'1';
    row.innerHTML=`<span class="split-item-emoji">${PRODUCT_DATA[item.name].emoji}</span><span class="split-item-name">${item.name}<span class="split-item-qty-note"> ×${item.qty}</span></span><span class="split-item-price">₹${item.totalPrice}</span><div class="split-item-check">${isAssignedToActive?'✓':''}</div>`;
    if(!isAssignedToOther){row.onclick=()=>toggleItemAssignment(item.id); row.style.cursor='pointer';}
    itemList.appendChild(row);
  });
  const summaryEl=document.getElementById('split-summary'); summaryEl.innerHTML='';
  splitPeople.forEach(p=>{const t=getPersonTotal(p); const row=document.createElement('div'); row.className='split-sum-row'; row.innerHTML=`<span class="split-sum-name">👤 ${p.name}</span><span class="split-sum-amt">₹${t}</span>`; summaryEl.appendChild(row);});
  const assigned=new Set(); splitPeople.forEach(p=>p.assignedItems.forEach(id=>assigned.add(id)));
  const unassigned=cartItems.filter(i=>!assigned.has(i.id));
  const warnEl=document.getElementById('split-warn');
  warnEl.innerHTML=unassigned.length>0?`<div class="split-unassigned-warn">⚠ ${unassigned.length} item(s) not assigned</div>`:'';
}

function confirmSplit(){
  const lines=splitPeople.map(p=>`${p.name}: ₹${getPersonTotal(p)}`).join(' · ');
  closeModal('split-modal'); showToast(`Split done — ${lines}`,'success');
}

// ── RAZORPAY ──────────────────────────────────────────────────────────────────
let rzpConfig = JSON.parse(localStorage.getItem('rzp_config') || 'null');

function updateRzpStatus(){
  const key = document.getElementById('rzp-key').value.trim();
  const statusEl = document.getElementById('rzp-cred-status');
  if(key.startsWith('rzp_')){
    statusEl.style.cssText = 'font-family:var(--mono);font-size:10px;padding:6px 10px;border-radius:6px;background:#d4edda;color:#155724;margin-top:6px;';
    statusEl.textContent = '✅ Key looks valid — save to enable payments';
  } else {
    statusEl.style.cssText = 'font-family:var(--mono);font-size:10px;padding:6px 10px;border-radius:6px;background:var(--card3);color:var(--ink3);margin-top:6px;';
    statusEl.textContent = '⚠ Enter Razorpay Key ID (starts with rzp_live_ or rzp_test_)';
  }
}

function saveRzpConfig(){
  const key = document.getElementById('rzp-key').value.trim();
  const biz = document.getElementById('rzp-biz-name').value.trim() || 'SmartBilling';
  if(!key.startsWith('rzp_')){ showToast('Enter a valid Razorpay Key ID','warn'); return; }
  rzpConfig = { key, biz };
  localStorage.setItem('rzp_config', JSON.stringify(rzpConfig));
  showToast('✅ Razorpay config saved','success');
}

function launchRazorpay(){
  if(!rzpConfig || !rzpConfig.key){ showToast('Save Razorpay config first','warn'); return; }
  if(typeof Razorpay === 'undefined'){
    // Dynamically load Razorpay SDK if not present
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = () => _openRzp();
    document.head.appendChild(s);
  } else {
    _openRzp();
  }
}

function _openRzp(){
  const options = {
    key: rzpConfig.key,
    amount: total * 100, // Razorpay expects paise
    currency: 'INR',
    name: rzpConfig.biz || 'SmartBilling',
    description: 'Bill Payment — ' + cartItems.length + ' item(s)',
    theme: { color: '#c97d2a' },
    handler: function(response){
      closeModal('qr-modal');
      clearCart();
      showToast('✅ Payment successful! Payment ID: ' + response.razorpay_payment_id.slice(0,12) + '…','success');
    },
    modal: {
      ondismiss: function(){ showToast('Payment cancelled','warn'); }
    }
  };
  try {
    const rzp = new Razorpay(options);
    rzp.open();
  } catch(e) {
    showToast('Razorpay error — check Key ID','err');
  }
}

// ── HOME SMS TOGGLE ───────────────────────────────────────────────────────────
function toggleHomeSMS(){
  const body = document.getElementById('home-sms-body');
  const btn  = document.getElementById('home-sms-toggle-btn');
  const open = body.classList.toggle('open');
  btn.textContent = open ? '▼ Hide' : '▶ Configure';
  if(open) document.getElementById('sms-preview').textContent = buildSMSText();
}

// Load saved Razorpay config on startup
window.addEventListener('DOMContentLoaded', ()=>{
  if(rzpConfig){
    const k = document.getElementById('rzp-key');
    const b = document.getElementById('rzp-biz-name');
    if(k) k.value = rzpConfig.key || '';
    if(b) b.value = rzpConfig.biz || '';
    updateRzpStatus();
  }
});

function openModal(id){document.getElementById(id).classList.add('show');}
function closeModal(id){document.getElementById(id).classList.remove('show');}
document.querySelectorAll('.modal-backdrop').forEach(m=>{m.addEventListener('click',e=>{if(e.target===m)m.classList.remove('show');});});

// ── TOAST ─────────────────────────────────────────────────────────────────────
let toastT;
function showToast(msg,type=''){
  const t=document.getElementById('toast'); t.textContent=msg; t.className='show '+type;
  clearTimeout(toastT); toastT=setTimeout(()=>t.className='',2400);
}