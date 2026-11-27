(() => {
  "use strict";
  const cfg = window.KINIOO7_SUPABASE || {};
  const sdk = window.supabase;
  const $ = id => document.getElementById(id);
  const notice = (msg, kind = "") => { const el=$("sellerNotice"); el.textContent=msg; el.className="notice"+(kind?" "+kind:""); };
  const formMessage = (msg, ok=false) => { $("sellerFormMessage").textContent=msg; $("sellerFormMessage").style.color=ok?"#087b5e":"#b42318"; };
  const validHttpUrl = value => { try { const u=new URL(value); return ["http:","https:"].includes(u.protocol) ? u.href : ""; } catch { return ""; } };
  let db, currentUser, sellerProfile, products=[], existingImageUrl="", existingVideoUrl="";
  const bucket = "seller-product-images";
  const videoBucket = "seller-product-videos";

  function escapeText(value) { return String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }

  async function init() {
    if (!cfg.url || !cfg.publishableKey || !sdk?.createClient) {
      notice("Supabase configuration or SDK পাওয়া যায়নি।", "error"); return;
    }
    db = sdk.createClient(cfg.url, cfg.publishableKey, {auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
    const {data:{session},error:sessionError}=await db.auth.getSession();
    if (sessionError) { notice(sessionError.message,"error"); return; }
    if (!session?.user) { notice("আপনার Seller account session পাওয়া যায়নি। আগে Seller Portal-এ লগইন করুন।","error"); return; }
    currentUser=session.user;

    const {data:profile,error:profileError}=await db.from("seller_profiles")
      .select("user_id,full_name,shop_name,is_active")
      .eq("user_id",currentUser.id).maybeSingle();
    if (profileError) { notice("Seller profile load হয়নি: "+profileError.message,"error"); return; }
    if (!profile || profile.is_active !== true) { notice("আপনার সক্রিয় Seller profile পাওয়া যায়নি। Seller Portal-এ profile সম্পন্ন করুন।","error"); return; }
    sellerProfile=profile;
    $("sellerWelcome").textContent=`Welcome, ${profile.full_name || "Seller"} — ${profile.shop_name || "Your shop"}`;
    $("sellerApp").hidden=false;
    notice("আপনার Seller Dashboard প্রস্তুত। নতুন পণ্য Publish করলে সেটি সরাসরি Marketplace-এ Active হবে।","success");
    await loadProducts();
  }

  function resetForm() {
    $("sellerProductForm").reset();
    $("sellerProductId").value="";
    $("productFormHeading").textContent="Add a product";
    $("sellerSaveProduct").textContent="Publish product";
    $("sellerCancelEdit").hidden=true;
    $("spImage").required=true;
    existingImageUrl="";
    existingVideoUrl="";
    $("sellerVideoPreview").hidden=true;
    $("sellerPreviewVideo").removeAttribute("src");
    $("sellerImagePreview").hidden=true;
    $("sellerPreviewImg").removeAttribute("src");
    formMessage("");
  }

  async function loadProducts() {
    $("sellerProducts").innerHTML='<p class="muted">Loading your products…</p>';
    const {data,error}=await db.from("products")
      .select("id,name,description,category,brand,price,currency,image_url,video_url,product_url,platform,region,is_active,created_at,seller_id")
      .eq("seller_id",currentUser.id).order("created_at",{ascending:false});
    if (error) {
      $("sellerProducts").innerHTML='<p class="empty">Products could not be loaded.</p>';
      notice("Product list load হয়নি: "+error.message,"error"); return;
    }
    products=data||[];
    $("sellerProductCount").textContent=products.length;
    $("sellerActiveCount").textContent=products.filter(p=>p.is_active).length;
    renderProducts();
  }

  function renderProducts() {
    const q=$("sellerProductSearch").value.trim().toLowerCase();
    const list=products.filter(p=>[p.name,p.brand,p.category].some(v=>String(v||"").toLowerCase().includes(q)));
    const host=$("sellerProducts");
    if (!list.length) { host.innerHTML='<p class="empty">No products found. Add your first product above.</p>'; return; }
    host.innerHTML=list.map(p=>`
      <article class="product-row">
        <img src="${escapeText(p.image_url||"")}" alt="" onerror="this.style.visibility='hidden'">
        <div><h3>${escapeText(p.name)}</h3>
          <p>${escapeText(p.category||"Other")} · ৳${Number(p.price||0).toLocaleString("en-BD")} · ${p.is_active?"Active":"Inactive"}</p>
          <p>${escapeText(p.description||"")}</p>
        </div>
        <div class="row-actions">
          <button type="button" data-edit="${escapeText(p.id)}">Edit</button>
          <button type="button" data-toggle="${escapeText(p.id)}">${p.is_active?"Hide":"Publish"}</button>
          <button type="button" class="danger" data-delete="${escapeText(p.id)}">Delete</button>
        </div>
      </article>`).join("");
  }

  function editProduct(id) {
    const p=products.find(x=>String(x.id)===String(id)); if(!p)return;
    $("sellerProductId").value=p.id;
    $("spName").value=p.name||"";
    $("spCategory").value=p.category||"other";
    $("spBrand").value=p.brand||"";
    $("spPrice").value=p.price??"";
    $("spDescription").value=p.description||"";
    existingImageUrl=p.image_url||"";
    existingVideoUrl=p.video_url||"";
    $("spImage").required=false;
    $("productFormHeading").textContent="Edit product";
    $("sellerSaveProduct").textContent="Save changes";
    $("sellerCancelEdit").hidden=false;
    if(existingImageUrl){$("sellerPreviewImg").src=existingImageUrl;$("sellerImageHint").textContent="Current image (choose a new file to replace it)";$("sellerImagePreview").hidden=false;}
    if(existingVideoUrl){$("sellerPreviewVideo").src=existingVideoUrl;$("sellerVideoHint").textContent="Current video (choose a new file to replace it)";$("sellerVideoPreview").hidden=false;}
    formMessage("");
    window.scrollTo({top:0,behavior:"smooth"});
  }

  async function uploadImage(file) {
    if (!file) return existingImageUrl;
    const allowed=["image/jpeg","image/png","image/webp"];
    if (!allowed.includes(file.type)) throw new Error("শুধু JPG, PNG বা WEBP image upload করুন।");
    if (file.size>5*1024*1024) throw new Error("Image size 5 MB-এর বেশি হতে পারবে না।");
    const ext=file.type==="image/png"?"png":file.type==="image/webp"?"webp":"jpg";
    const path=`${currentUser.id}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
    const {error}=await db.storage.from(bucket).upload(path,file,{contentType:file.type,upsert:false});
    if(error) throw error;
    const {data}=db.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  }

  async function uploadVideo(file) {
    if (!file) return existingVideoUrl || null;
    if (!["video/mp4","video/webm"].includes(file.type)) throw new Error("শুধু MP4 বা WEBM video upload করুন।");
    if (file.size > 50 * 1024 * 1024) throw new Error("Video size 50 MB-এর বেশি হতে পারবে না।");
    const ext = file.type === "video/webm" ? "webm" : "mp4";
    const path = `${currentUser.id}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
    const { error } = await db.storage.from(videoBucket).upload(path, file, { contentType: file.type, upsert: false });
    if (error) throw error;
    return db.storage.from(videoBucket).getPublicUrl(path).data.publicUrl;
  }

  async function saveProduct(event) {
    event.preventDefault();
    const name=$("spName").value.trim(),description=$("spDescription").value.trim();
    const price=Number($("spPrice").value),file=$("spImage").files[0];
    if(!name||!description||!Number.isFinite(price)||price<0){formMessage("Product name, description এবং সঠিক price দিন।");return;}
    if(!file&&!existingImageUrl){formMessage("একটি product image নির্বাচন করুন।");return;}
    $("sellerSaveProduct").disabled=true; formMessage("পণ্য সংরক্ষণ হচ্ছে…",true);
    try {
      const imageUrl=await uploadImage(file);
      const videoUrl=await uploadVideo($("spVideo").files[0]);
      const payload={
        name,description,category:$("spCategory").value,brand:$("spBrand").value.trim()||null,
        price,currency:"BDT",image_url:imageUrl,video_url:videoUrl,product_url:null,
        platform:"KINI007 Seller Marketplace",region:"Bangladesh",
        is_active:true,seller_id:currentUser.id
      };
      const id=$("sellerProductId").value;
      let result;
      if(id) result=await db.from("products").update(payload).eq("id",id).eq("seller_id",currentUser.id);
      else result=await db.from("products").insert(payload);
      if(result.error) throw result.error;
      resetForm();
      notice(id?"Product updated successfully.":"Product published successfully and is active on the marketplace.","success");
      await loadProducts();
    } catch(err) {
      formMessage("সংরক্ষণ হয়নি: "+(err.message||"Unknown error"));
    } finally { $("sellerSaveProduct").disabled=false; }
  }

  async function toggleProduct(id) {
    const p=products.find(x=>String(x.id)===String(id)); if(!p)return;
    const {error}=await db.from("products").update({is_active:!p.is_active}).eq("id",p.id).eq("seller_id",currentUser.id);
    if(error){notice("Status change হয়নি: "+error.message,"error");return;}
    await loadProducts();
  }

  async function deleteProduct(id) {
    const p=products.find(x=>String(x.id)===String(id)); if(!p)return;
    if(!confirm(`“${p.name}” productটি delete করবেন?`))return;
    const {error}=await db.from("products").delete().eq("id",p.id).eq("seller_id",currentUser.id);
    if(error){notice("Product delete হয়নি: "+error.message,"error");return;}
    notice("Product deleted.","success"); await loadProducts();
  }

  $("sellerProductForm").addEventListener("submit",saveProduct);
  $("resetProductForm").addEventListener("click",resetForm);
  $("sellerCancelEdit").addEventListener("click",resetForm);
  $("sellerProductSearch").addEventListener("input",renderProducts);
  $("sellerProducts").addEventListener("click",e=>{
    const edit=e.target.closest("[data-edit]"),toggle=e.target.closest("[data-toggle]"),del=e.target.closest("[data-delete]");
    if(edit)editProduct(edit.dataset.edit);
    if(toggle)toggleProduct(toggle.dataset.toggle);
    if(del)deleteProduct(del.dataset.delete);
  });
  $("spImage").addEventListener("change",()=>{
    const file=$("spImage").files[0]; if(!file)return;
    $("sellerPreviewImg").src=URL.createObjectURL(file);
    $("sellerImageHint").textContent=file.name;
    $("sellerImagePreview").hidden=false;
  });
  $("spVideo").addEventListener("change",()=>{
    const file=$("spVideo").files[0]; if(!file)return;
    if(!["video/mp4","video/webm"].includes(file.type)||file.size>50*1024*1024){$("spVideo").value="";formMessage("শুধু MP4/WEBM এবং সর্বোচ্চ 50 MB video upload করা যাবে।");return;}
    $("sellerPreviewVideo").src=URL.createObjectURL(file);
    $("sellerVideoHint").textContent=file.name;
    $("sellerVideoPreview").hidden=false;
  });
  $("removeProductVideo").addEventListener("click",()=>{
    existingVideoUrl="";$("spVideo").value="";$("sellerPreviewVideo").removeAttribute("src");$("sellerVideoPreview").hidden=true;$("sellerVideoHint").textContent="";
  });
  $("sellerLogout").addEventListener("click",async()=>{if(db)await db.auth.signOut();location.href="seller.html";});

  init().catch(err=>notice(err.message||"Dashboard load failed.","error"));
})();