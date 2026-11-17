(() => {
  "use strict";
  const cfg = window.KINIOO7_SUPABASE || {};
  const clientLib = window.supabase;
  const $ = (id) => document.getElementById(id);
  const loginShell = $("loginShell"), appShell = $("appShell");
  let db = null, currentUser = null, products = [], stores = [];
  const showMessage = (id, msg, ok=false) => { const el=$(id); if(el){el.textContent=msg;el.style.color=ok?"#087b5e":"#c24141";} };
  const globalMessage = (msg) => { const el=$("globalMessage");el.hidden=!msg;el.textContent=msg||""; };
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const safeWebUrl = (s) => { try { const u=new URL(String(s||"")); return ["https:","http:"].includes(u.protocol)?u.href:""; } catch { return ""; } };
  const isAdmin = async (user) => {
    const {data,error}=await db.from("admin_users").select("user_id,is_active").eq("user_id",user.id).maybeSingle();
    if(error) throw error;
    return !!(data && data.is_active);
  };
  async function enter(user){
    currentUser=user;
    let allowed=false;
    try { allowed=await isAdmin(user); } catch(err) { throw new Error("অ্যাডমিন অনুমতি যাচাই করা যায়নি। SQL setup এবং admin_users entry পরীক্ষা করুন। "+err.message); }
    if(!allowed){await db.auth.signOut();throw new Error("এই অ্যাকাউন্ট Admin হিসেবে অনুমোদিত নয়। নির্দিষ্ট Admin account-টি admin_users টেবিলে যোগ করতে হবে।");}
    loginShell.hidden=true;appShell.hidden=false;$('adminEmail').textContent=user.email||"Admin";
    await refreshAll();
  }
  async function refreshAll(){ globalMessage(""); await Promise.all([loadProducts(),loadStores()]); updateStats(); }
  async function loadProducts(){
    const {data,error}=await db.from("products").select("id,name,description,category,brand,price,currency,image_url,product_url,platform,region,is_active,created_at").order("created_at",{ascending:false}).limit(1000);
    if(error) throw error; products=data||[]; renderProducts(); updateStats();
  }
  async function loadStores(){
    const {data,error}=await db.from("stores").select("id,name,website_url,integration_type,affiliate_url,notes,is_active,created_at").order("created_at",{ascending:false});
    if(error) throw error; stores=data||[]; renderStores(); fillStoreOptions(); updateStats();
  }
  function updateStats(){
    $('statProducts').textContent=products.length;$('statActive').textContent=products.filter(p=>p.is_active).length;$('statStores').textContent=stores.length;$('statBD').textContent=products.filter(p=>String(p.region||"").toLowerCase().includes("bangladesh")).length;
  }
  function renderProducts(){
    const q=$('productSearch').value.trim().toLocaleLowerCase();
    const list=products.filter(p=>[p.name,p.brand,p.platform,p.category].join(" ").toLocaleLowerCase().includes(q));
    $('productTotal').textContent=`${list.length} টি পণ্য`;
    const tbody=$('productRows');tbody.replaceChildren();
    if(!list.length){const tr=document.createElement('tr');const td=document.createElement('td');td.colSpan=6;td.textContent='কোনো পণ্য পাওয়া যায়নি।';tr.append(td);tbody.append(tr);return;}
    list.forEach(p=>{
      const tr=document.createElement('tr');
      const name=document.createElement('td');name.innerHTML=`<strong>${esc(p.name)}</strong><span class="subtext">${esc(p.brand||'')}</span>`;
      const cat=document.createElement('td');cat.textContent=p.category||'—';
      const price=document.createElement('td');price.textContent=p.price==null?'—':`${Number(p.price).toLocaleString()} ${p.currency||'BDT'}`;
      const platform=document.createElement('td');platform.textContent=p.platform||'—';
      const state=document.createElement('td');state.innerHTML=p.is_active?'<span class="status-pill">Active</span>':'<span class="status-pill off">Inactive</span>';
      const actions=document.createElement('td');actions.className='row-actions';
      const edit=document.createElement('button');edit.textContent='Edit';edit.addEventListener('click',()=>openProduct(p));
      const toggle=document.createElement('button');toggle.textContent=p.is_active?'Hide':'Show';toggle.addEventListener('click',()=>toggleProduct(p));
      const del=document.createElement('button');del.textContent='Delete';del.className='delete';del.addEventListener('click',()=>deleteProduct(p));
      actions.append(edit,toggle,del);tr.append(name,cat,price,platform,state,actions);tbody.append(tr);
    });
  }
  function renderStores(){
    const grid=$('storeGrid');grid.replaceChildren();
    if(!stores.length){const e=document.createElement('div');e.className='empty-state';e.textContent='এখনো কোনো স্টোর যোগ করা হয়নি। “নতুন স্টোর” থেকে শুরু করুন।';grid.append(e);return;}
    stores.forEach(s=>{
      const card=document.createElement('article');card.className='store-card';
      const h=document.createElement('h3');h.textContent=s.name;
      const a=document.createElement('a');a.href=safeWebUrl(s.website_url)||'#';a.target='_blank';a.rel='noopener noreferrer';a.textContent=s.website_url;
      const meta=document.createElement('div');meta.className='store-meta';
      const tag=document.createElement('span');tag.className='tag';tag.textContent=({manual:'Manual',affiliate:'Affiliate',csv:'CSV / Feed',api:'Official API'})[s.integration_type]||s.integration_type;
      const state=document.createElement('span');state.className=s.is_active?'status-pill':'status-pill off';state.textContent=s.is_active?'Active':'Inactive';meta.append(tag,state);
      const note=document.createElement('p');note.className='subtext';note.textContent=s.notes||'কোনো নোট নেই।';
      card.append(h,a,meta,note);grid.append(card);
    });
  }
  function fillStoreOptions(){const dl=$('storeOptions');dl.replaceChildren();stores.filter(s=>s.is_active).forEach(s=>{const o=document.createElement('option');o.value=s.name;dl.append(o);});}
  function showView(view){document.querySelectorAll('.view').forEach(v=>v.hidden=v.id!==`view-${view}`);document.querySelectorAll('.nav-item').forEach(b=>b.classList.toggle('active',b.dataset.view===view));$('pageTitle').textContent=({overview:'ড্যাশবোর্ড',products:'পণ্য পরিচালনা',stores:'স্টোর সংযোগ',import:'CSV Import'})[view]||'ড্যাশবোর্ড';}
  function openModal(id){$(id).hidden=false;} function closeModal(id){$(id).hidden=true;}
  function resetProductForm(){ $('productForm').reset();$('productId').value='';$('pActive').checked=true;$('productModalTitle').textContent='নতুন পণ্য যোগ করুন';showMessage('productMessage','',true); }
  function openProduct(p=null){resetProductForm();if(p){$('productId').value=p.id;$('pName').value=p.name||'';$('pDescription').value=p.description||'';$('pCategory').value=p.category||'other';$('pBrand').value=p.brand||'';$('pPrice').value=p.price??'';$('pCurrency').value=p.currency||'BDT';$('pRegion').value=p.region||'Bangladesh';$('pPlatform').value=p.platform||'';$('pImage').value=p.image_url||'';$('pUrl').value=p.product_url||'';$('pActive').checked=!!p.is_active;$('productModalTitle').textContent='পণ্য পরিবর্তন করুন';}openModal('productModal'); }
  async function saveProduct(e){e.preventDefault();const id=$('productId').value;const image=safeWebUrl($('pImage').value),url=safeWebUrl($('pUrl').value);if($('pImage').value&&!image){showMessage('productMessage','সঠিক http/https Image URL দিন।');return;}if($('pUrl').value&&!url){showMessage('productMessage','সঠিক http/https Shopping URL দিন।');return;}
    const payload={name:$('pName').value.trim(),description:$('pDescription').value.trim()||null,category:$('pCategory').value,brand:$('pBrand').value.trim()||null,price:$('pPrice').value===''?null:Number($('pPrice').value),currency:$('pCurrency').value,image_url:image||null,product_url:url||null,platform:$('pPlatform').value.trim()||null,region:$('pRegion').value,is_active:$('pActive').checked};
    $('saveProductBtn').disabled=true;showMessage('productMessage','সংরক্ষণ হচ্ছে…',true);
    const result=id?await db.from('products').update(payload).eq('id',id):await db.from('products').insert(payload);
    $('saveProductBtn').disabled=false;if(result.error){showMessage('productMessage','সংরক্ষণ হয়নি: '+result.error.message);return;}
    closeModal('productModal');await loadProducts();globalMessage(id?'পণ্যের তথ্য আপডেট হয়েছে।':'নতুন পণ্য যোগ হয়েছে।');
  }
  async function toggleProduct(p){const {error}=await db.from('products').update({is_active:!p.is_active}).eq('id',p.id);if(error){globalMessage('পরিবর্তন করা যায়নি: '+error.message);return;}await loadProducts();}
  async function deleteProduct(p){if(!confirm(`“${p.name}” পণ্যটি মুছে ফেলবেন?`))return;const {error}=await db.from('products').delete().eq('id',p.id);if(error){globalMessage('মুছে ফেলা যায়নি: '+error.message);return;}await loadProducts();globalMessage('পণ্য মুছে ফেলা হয়েছে।');}
  async function saveStore(e){e.preventDefault();const website=safeWebUrl($('sUrl').value),affiliate=safeWebUrl($('sAffiliate').value);if(!website){showMessage('storeMessage','সঠিক Store Website URL দিন।');return;}if($('sAffiliate').value&&!affiliate){showMessage('storeMessage','সঠিক Affiliate URL দিন।');return;}
    const payload={name:$('sName').value.trim(),website_url:website,integration_type:$('sType').value,affiliate_url:affiliate||null,notes:$('sNotes').value.trim()||null,is_active:$('sActive').checked};$('saveStoreBtn').disabled=true;showMessage('storeMessage','সংরক্ষণ হচ্ছে…',true);
    const {error}=await db.from('stores').insert(payload);$('saveStoreBtn').disabled=false;if(error){showMessage('storeMessage','স্টোর সংরক্ষণ হয়নি: '+error.message);return;}$('storeForm').reset();$('sActive').checked=true;closeModal('storeModal');await loadStores();globalMessage('নতুন স্টোর যোগ হয়েছে।');
  }
  function parseCsv(text){
    const rows=[];let row=[],field='',quoted=false;
    for(let i=0;i<text.length;i++){
      const c=text[i],next=text[i+1];
      if(quoted){if(c==='"'&&next==='"'){field+='"';i++;}else if(c==='"'){quoted=false;}else{field+=c;}}
      else if(c==='"'){quoted=true;}
      else if(c===','){row.push(field);field='';}
      else if(c==='\n'){row.push(field);rows.push(row);row=[];field='';}
      else if(c!=='\r'){field+=c;}
    }
    if(field.length||row.length){row.push(field);rows.push(row);}
    return rows.filter(r=>r.some(v=>String(v).trim()!==''));
  }
  const headerAliases={name:['name','product_name','title','পণ্যের নাম','নাম'],description:['description','details','বিবরণ'],category:['category','ক্যাটাগরি'],brand:['brand','ব্র্যান্ড'],price:['price','দাম'],currency:['currency','মুদ্রা'],platform:['platform','store','store_name','স্টোর'],region:['region','অঞ্চল'],image_url:['image_url','image','imageurl','ছবির লিংক'],product_url:['product_url','affiliate_url','shopping_url','url','লিংক'],is_active:['is_active','active','সক্রিয়']};
  function normalizeCsvRow(headers,values){const raw={};headers.forEach((h,i)=>raw[String(h||'').replace(/^\uFEFF/,'').trim().toLowerCase()]=String(values[i]??'').trim());const out={};for(const [key,aliases] of Object.entries(headerAliases)){const found=aliases.find(a=>raw[a]!==undefined);if(found!==undefined)out[key]=raw[found];}return out;}
  function csvBoolean(v){return !['false','0','no','না','inactive','off'].includes(String(v||'').trim().toLowerCase());}
  function prepareCsvRows(parsed){
    if(parsed.length<2)throw new Error('CSV-তে header এবং অন্তত একটি product row থাকতে হবে।');
    const headers=parsed[0].map(h=>String(h||'').replace(/^\uFEFF/,'').trim().toLowerCase());
    if(!headers.some(h=>headerAliases.name.includes(h)))throw new Error('CSV-তে name অথবা product_name column পাওয়া যায়নি।');
    const valid=[],invalid=[];
    parsed.slice(1).forEach((values,index)=>{const r=normalizeCsvRow(headers,values),line=index+2;if(!r.name){invalid.push(`লাইন ${line}: name খালি`);return;}let price=null;if(r.price!==undefined&&r.price!==''){price=Number(r.price.replace(/[,৳$ ]/g,''));if(!Number.isFinite(price)||price<0){invalid.push(`লাইন ${line}: price সঠিক নয়`);return;}}const image=r.image_url?safeWebUrl(r.image_url):'';const url=r.product_url?safeWebUrl(r.product_url):'';if(r.image_url&&!image){invalid.push(`লাইন ${line}: image_url সঠিক নয়`);return;}if(r.product_url&&!url){invalid.push(`লাইন ${line}: product_url সঠিক নয়`);return;}valid.push({name:r.name.slice(0,180),description:r.description||null,category:(r.category||'other').toLowerCase(),brand:r.brand||null,price,currency:(r.currency||'BDT').toUpperCase(),platform:r.platform||null,region:r.region||'Bangladesh',image_url:image||null,product_url:url||null,is_active:csvBoolean(r.is_active)});});
    return {valid,invalid};
  }
  function renderCsvPreview(){const head=$('csvPreviewHead'),body=$('csvPreviewRows');head.replaceChildren();body.replaceChildren();if(!csvRows.length){head.innerHTML='<tr><th>Preview</th></tr>';body.innerHTML='<tr><td>CSV ফাইল নির্বাচন করলে এখানে preview দেখা যাবে।</td></tr>';return;}const columns=['name','category','brand','price','currency','platform','region','image_url','product_url','is_active'];const trh=document.createElement('tr');columns.forEach(c=>{const th=document.createElement('th');th.textContent=c;trh.append(th);});head.append(trh);csvRows.slice(0,8).forEach(r=>{const tr=document.createElement('tr');columns.forEach(c=>{const td=document.createElement('td');td.textContent=r[c]??'';tr.append(td);});body.append(tr);});}
  async function handleCsvFile(file){csvRows=[];csvValidRows=[];$('importCsvBtn').disabled=true;$('clearCsvBtn').disabled=true;showMessage('csvMessage','',true);if(!file)return;if(!file.name.toLowerCase().endsWith('.csv')){showMessage('csvMessage','শুধু .csv ফাইল নির্বাচন করুন।');return;}try{const text=(await file.text()).replace(/^\uFEFF/,'');const parsed=parseCsv(text);const result=prepareCsvRows(parsed);csvValidRows=result.valid;csvRows=result.valid.slice(0,8);renderCsvPreview();$('csvSummary').textContent=`মোট data row: ${Math.max(0,parsed.length-1)} | Import করা যাবে: ${result.valid.length} | বাদ যাবে: ${result.invalid.length}${result.invalid.length?` | প্রথম সমস্যা: ${result.invalid.slice(0,3).join(' ; ')}`:''}`;$('importCsvBtn').disabled=!csvValidRows.length;$('clearCsvBtn').disabled=false;showMessage('csvMessage',result.valid.length?'Preview ঠিক আছে। Import করার আগে তথ্যগুলো দেখে নিন।':'কোনো বৈধ product row পাওয়া যায়নি।',!!result.valid.length);}catch(err){renderCsvPreview();$('csvSummary').textContent='CSV পড়া যায়নি।';showMessage('csvMessage',err.message);}}
  async function importCsv(){if(!csvValidRows.length)return;if(!confirm(`${csvValidRows.length}টি পণ্য Database-এ যোগ করবেন? একই নামের পণ্য থাকলেও নতুন row তৈরি হতে পারে।`))return;$('importCsvBtn').disabled=true;$('clearCsvBtn').disabled=true;showMessage('csvMessage','Import শুরু হচ্ছে…',true);let inserted=0;const errors=[];for(let i=0;i<csvValidRows.length;i+=100){const chunk=csvValidRows.slice(i,i+100);const {error}=await db.from('products').insert(chunk);if(error){errors.push(`Batch ${Math.floor(i/100)+1}: ${error.message}`);break;}inserted+=chunk.length;showMessage('csvMessage',`${inserted}/${csvValidRows.length}টি পণ্য Import হয়েছে…`,true);}await loadProducts();if(errors.length){showMessage('csvMessage',`${inserted}টি পণ্য Import হয়েছে, কিন্তু বাকি অংশে সমস্যা: ${errors[0]}`);}else{showMessage('csvMessage',`সফল! ${inserted}টি পণ্য Import হয়েছে।`,true);$('csvSummary').textContent=`সম্পন্ন: ${inserted}টি পণ্য Database-এ যোগ হয়েছে।`;csvValidRows=[];$('csvFileInput').value='';$('importCsvBtn').disabled=true;$('clearCsvBtn').disabled=true;}}
  function downloadCsvTemplate(){const content='name,description,category,brand,price,currency,platform,region,image_url,product_url,is_active\n"Sample Product","Short description",tech,Brand,1200,BDT,"Daraz Bangladesh",Bangladesh,https://example.com/image.jpg,https://example.com/product,true\n';const blob=new Blob(['\uFEFF'+content],{type:'text/csv;charset=utf-8;'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='kini007-product-import-template.csv';a.click();URL.revokeObjectURL(url);}
  function clearCsv(){csvRows=[];csvValidRows=[];$('csvFileInput').value='';$('csvSummary').textContent='এখনো কোনো CSV ফাইল নির্বাচন করা হয়নি।';renderCsvPreview();$('importCsvBtn').disabled=true;$('clearCsvBtn').disabled=true;showMessage('csvMessage','',true);}
  async function logout(){await db.auth.signOut();location.reload();}
  async function boot(){
    if(!cfg.url||!cfg.publishableKey||!clientLib?.createClient){showMessage('loginMessage','Supabase configuration বা SDK পাওয়া যায়নি।');return;}
    db=clientLib.createClient(cfg.url,cfg.publishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
    const {data:{session}}=await db.auth.getSession();if(session){try{await enter(session.user);}catch(err){showMessage('loginMessage',err.message);}}
    db.auth.onAuthStateChange(async(event,session)=>{if(event==='SIGNED_OUT'){loginShell.hidden=false;appShell.hidden=true;} });
  }
  $('loginForm').addEventListener('submit',async e=>{e.preventDefault();$('loginBtn').disabled=true;showMessage('loginMessage','যাচাই করা হচ্ছে…',true);const {data,error}=await db.auth.signInWithPassword({email:$('email').value.trim(),password:$('password').value});$('loginBtn').disabled=false;if(error){showMessage('loginMessage','লগইন হয়নি: '+error.message);return;}try{await enter(data.user);}catch(err){showMessage('loginMessage',err.message);}});
  $('logoutBtn').addEventListener('click',logout);
  document.querySelectorAll('.nav-item').forEach(b=>b.addEventListener('click',()=>showView(b.dataset.view)));
  document.querySelectorAll('[data-goto]').forEach(b=>b.addEventListener('click',()=>showView(b.dataset.goto)));
  $('newProductBtn').addEventListener('click',()=>openProduct());$('newStoreBtn').addEventListener('click',()=>{$('storeForm').reset();$('sActive').checked=true;showMessage('storeMessage','',true);openModal('storeModal');});
  $('productForm').addEventListener('submit',saveProduct);$('storeForm').addEventListener('submit',saveStore);$('productSearch').addEventListener('input',renderProducts);
  $('csvFileInput').addEventListener('change',e=>handleCsvFile(e.target.files?.[0]));$('importCsvBtn').addEventListener('click',importCsv);$('clearCsvBtn').addEventListener('click',clearCsv);$('downloadCsvTemplateBtn').addEventListener('click',downloadCsvTemplate);
  document.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',()=>closeModal(b.dataset.close)));
  document.querySelectorAll('.modal-backdrop').forEach(m=>m.addEventListener('click',e=>{if(e.target===m)closeModal(m.id);}));
  boot().catch(err=>showMessage('loginMessage','প্রাথমিক সেটআপে সমস্যা: '+err.message));
})();
