(() => {
  'use strict';
  const $=id=>document.getElementById(id), cfg=window.KINIOO7_SUPABASE||{};
  const names={starter:'Starter',growth:'Growth',business:'Business'};
  const periods={monthly:'Monthly',quarterly:'Quarterly (3 months)',half_yearly:'Half-Yearly (6 months)',yearly:'Yearly (12 months)'};
  let db,user,category=null,selected=null;
  const say=(id,msg,err=false)=>{const e=$(id);e.textContent=msg;e.style.color=err?'#b42318':'#087b5e'};
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  async function init(){
    if(!cfg.url||!cfg.publishableKey||!window.supabase?.createClient)throw Error('Supabase config/SDK missing.');
    db=window.supabase.createClient(cfg.url,cfg.publishableKey);
    const {data:{session},error}=await db.auth.getSession();if(error)throw error;if(!session?.user){location.href='seller.html';return;}user=session.user;
    const {data:profile,error:pe}=await db.from('seller_profiles').select('country_code,country_name,income_category').eq('user_id',user.id).maybeSingle();if(pe)throw pe;
    if(profile){$('countryCode').value=(profile.country_code||'').trim();$('countryName').value=profile.country_name||'';if(profile.income_category)category=Number(profile.income_category);}
    showCategory();await loadPlans();await loadHistory();
    $('notice').textContent='Choose a plan. Membership activates only after admin payment verification.';$('notice').className='notice success';
  }
  function showCategory(){$('categoryLabel').textContent='Pricing category: '+(category?'Category '+category:'Not verified');}
  async function verifyCountry(){
    const code=$('countryCode').value.trim().toUpperCase();if(!/^[A-Z]{2}$/.test(code)){say('countryMessage','Enter a valid 2-letter ISO country code.',true);return;}
    say('countryMessage','Checking World Bank classification…');
    try{
      const res=await fetch(`https://api.worldbank.org/v2/country/${encodeURIComponent(code)}?format=json`);if(!res.ok)throw Error('World Bank API unavailable');const data=await res.json();const c=data?.[1]?.[0];if(!c||!c.incomeLevel?.id)throw Error('Country not found in World Bank data.');
      const group=c.incomeLevel.id;const map={LIC:1,LMC:1,UMC:2,HIC:3};if(!map[group])throw Error('World Bank income group not available for this territory.');category=map[group];$('countryName').value=c.name;
      // Country category is derived from the World Bank API in this UI.
      // Do not let a seller write to the shared country_categories reference table.
      const {error:pe}=await db.from('seller_profiles').update({country_code:code,country_name:c.name,income_category:category}).eq('user_id',user.id);if(pe)throw pe;
      showCategory();await loadPlans();say('countryMessage',`${c.name}: World Bank ${group}. Category ${category} saved.`);
    }catch(e){say('countryMessage',e.message||'Country verification failed.',true);}
  }
  async function loadPlans(){
    const host=$('plans');if(!category){host.innerHTML='<p class="empty">Verify your country first to see the correct prices.</p>';return;}
    const {data,error}=await db.from('kini007_membership_prices').select('plan_code,duration_code,amount_usd').eq('pricing_category',category).order('plan_code').order('amount_usd');if(error)throw error;
    const grouped={};for(const r of data||[]){(grouped[r.plan_code]||= {})[r.duration_code]=Number(r.amount_usd);}
    host.innerHTML=Object.keys(names).map(plan=>`<article class="plan-card"><h3>${names[plan]}</h3><p>${plan==='starter'?'For new sellers':plan==='growth'?'For growing shops':'For established sellers'}</p><label>Subscription period<select data-period="${plan}">${Object.keys(periods).map(k=>`<option value="${k}">${periods[k]} — $${Number(grouped[plan]?.[k]??0).toFixed(2)}</option>`).join('')}</select></label><button type="button" data-choose="${plan}">Choose ${names[plan]}</button></article>`).join('');
  }
  async function choose(plan){if(!category){say('paymentMessage','Verify your country first.',true);return;}const duration=$(`[data-period="${plan}"]`).value;const {data,error}=await db.from('kini007_membership_prices').select('amount_usd').eq('pricing_category',category).eq('plan_code',plan).eq('duration_code',duration).single();if(error)throw error;selected={plan,duration,amount:Number(data.amount_usd)};$('paymentBox').hidden=false;$('selectedTitle').textContent=`${names[plan]} — ${periods[duration]}`;$('selectedPrice').textContent=`Amount due: $${selected.amount.toFixed(2)} USD`;$('paymentReference').value='';say('paymentMessage','');$('paymentBox').scrollIntoView({behavior:'smooth'});}
  async function submitPayment(){if(!selected)return;const ref=$('paymentReference').value.trim();if(ref.length<4){say('paymentMessage','Enter a valid transaction/reference ID.',true);return;}$('submitPayment').disabled=true;say('paymentMessage','Submitting…');try{
      const {data:membership,error:me}=await db.from('kini007_memberships').insert({seller_id:user.id,pricing_category:category,plan_code:selected.plan,duration_code:selected.duration,amount_usd:selected.amount,status:'pending'}).select('id').single();if(me)throw me;
      const {error:pay}=await db.from('kini007_membership_payments').insert({membership_id:membership.id,seller_id:user.id,payment_method:$('paymentMethod').value,transaction_reference:ref,payer_note:$('paymentNote').value.trim()||null,status:'pending'});if(pay)throw pay;
      say('paymentMessage','Submitted. Your membership is PENDING until an admin verifies the payment.');await loadHistory();
    }catch(e){say('paymentMessage',e.message||'Could not submit payment.',true);}finally{$('submitPayment').disabled=false;}}
  async function loadHistory(){const {data,error}=await db.from('kini007_memberships').select('plan_code,duration_code,amount_usd,status,expires_at,created_at').eq('seller_id',user.id).order('created_at',{ascending:false});if(error)throw error;$('history').innerHTML=(data||[]).length?(data||[]).map(x=>`<tr><td>${esc(names[x.plan_code]||x.plan_code)}</td><td>${esc(periods[x.duration_code]||x.duration_code)}</td><td>$${Number(x.amount_usd).toFixed(2)}</td><td>${esc(x.status)}</td><td>${x.expires_at?new Date(x.expires_at).toLocaleDateString():'—'}</td></tr>`).join(''):'<tr><td colspan="5">No membership history yet.</td></tr>';}
  $('saveCountry').addEventListener('click',verifyCountry);$('plans').addEventListener('click',e=>{const b=e.target.closest('[data-choose]');if(b)choose(b.dataset.choose).catch(x=>say('paymentMessage',x.message,true));});$('submitPayment').addEventListener('click',submitPayment);$('logout').addEventListener('click',async()=>{await db.auth.signOut();location.href='seller.html';});
  init().catch(e=>{$('notice').textContent=e.message||'Membership page failed to load.';$('notice').className='notice error';});
})();
