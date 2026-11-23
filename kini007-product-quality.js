(() => {
  "use strict";

  const cfg = window.KINIOO7_SUPABASE || {};
  const supabaseLib = window.supabase;
  let client = null;
  let productCache = [];
  let findings = [];
  const $ = id => document.getElementById(id);

  function styles() {
    if ($("productQualityStyles")) return;
    const s = document.createElement("style");
    s.id = "productQualityStyles";
    s.textContent = `
      .pq-toolbar{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin:16px 0}
      .pq-toolbar button,.pq-toolbar select{font:inherit;padding:9px 13px;border:1px solid #d9e2ec;border-radius:9px}
      .pq-toolbar button{background:#102a43;color:#fff;cursor:pointer}
      .pq-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:14px;margin:16px 0}
      .pq-stat{background:var(--panel,#fff);border:1px solid var(--border,#e2e8f0);border-radius:14px;padding:18px}
      .pq-stat span{display:block;color:var(--muted,#64748b);font-size:13px}
      .pq-stat strong{display:block;font-size:27px;margin-top:8px;color:var(--text,#102a43)}
      .pq-panel{background:var(--panel,#fff);border:1px solid var(--border,#e2e8f0);border-radius:14px;padding:18px;margin-top:16px}
      .pq-table-wrap{overflow:auto}
      .pq-table{width:100%;border-collapse:collapse;min-width:650px}
      .pq-table th,.pq-table td{padding:11px 10px;text-align:left;border-bottom:1px solid var(--border,#e2e8f0);font-size:13px}
      .pq-table th{color:var(--muted,#64748b);font-weight:600}
      .pq-tag{display:inline-block;padding:4px 9px;border-radius:20px;font-size:12px;background:#fff4df;color:#925b00}
      .pq-tag.high{background:#fde8e8;color:#b42318}
      .pq-tag.info{background:#e8f1ff;color:#2459a6}
      .pq-action{border:0;background:none;color:#1769aa;text-decoration:underline;cursor:pointer;font:inherit;padding:3px 5px}
      .pq-note{font-size:13px;color:var(--muted,#64748b);line-height:1.55}
    `;
    document.head.append(s);
  }

  function build() {
    if ($("view-quality")) return true;
    const perfNav = document.querySelector('.nav-item[data-view="performance"]');
    const perfView = $("view-performance");
    if (!perfNav || !perfView) return false;

    const nav = document.createElement("button");
    nav.className = "nav-item";
    nav.dataset.view = "quality";
    nav.innerHTML = '<span aria-hidden="true">✓</span> <span>Product Quality</span>';
    perfNav.insertAdjacentElement("afterend", nav);

    const view = document.createElement("section");
    view.className = "view";
    view.id = "view-quality";
    view.hidden = true;
    view.innerHTML = `
      <div class="section-toolbar">
        <div><h2>Product Quality Management</h2><p>Duplicate product, missing/invalid shopping URL এবং image-এর সমস্যা খুঁজে বের করুন।</p></div>
      </div>
      <div class="pq-toolbar">
        <label for="pqFilter">সমস্যার ধরন:</label>
        <select id="pqFilter">
          <option value="all">সব সমস্যা</option>
          <option value="duplicate">Duplicate</option>
          <option value="url">Shopping URL সমস্যা</option>
          <option value="image">Image URL নেই/ভুল</option>
          <option value="inactive">Inactive Product</option>
        </select>
        <button type="button" id="pqRefresh">Scan Again</button>
      </div>
      <div class="pq-stats">
        <article class="pq-stat"><span>মোট Products</span><strong id="pqTotal">—</strong></article>
        <article class="pq-stat"><span>সমস্যা পাওয়া Products</span><strong id="pqAffected">—</strong></article>
        <article class="pq-stat"><span>Duplicate Findings</span><strong id="pqDuplicates">—</strong></article>
        <article class="pq-stat"><span>URL Issues</span><strong id="pqUrls">—</strong></article>
        <article class="pq-stat"><span>Image Issues</span><strong id="pqImages">—</strong></article>
      </div>
      <div class="pq-panel">
        <h3>Quality Scan Results</h3>
        <p class="pq-note">এটি Database-এর তথ্য পরীক্ষা করে। External marketplace-এর link সত্যিই online আছে কি না, browser security (CORS/redirect/login) কারণে স্বয়ংক্রিয়ভাবে নিশ্চিত করা হচ্ছে না। Link খুলে manual verification করতে পারবেন।</p>
        <div class="pq-table-wrap"><table class="pq-table"><thead><tr><th>Product</th><th>Issue</th><th>Severity</th><th>Action</th></tr></thead><tbody id="pqRows"><tr><td colspan="4">Scan হচ্ছে…</td></tr></tbody></table></div>
      </div>
      <p class="pq-note" id="pqMessage" role="status"></p>
    `;
    perfView.insertAdjacentElement("afterend", view);
    nav.addEventListener("click", show);
    $("pqRefresh").addEventListener("click", scan);
    $("pqFilter").addEventListener("change", renderFindings);
    return true;
  }

  function show() {
    document.querySelectorAll(".view").forEach(v => v.hidden = v.id !== "view-quality");
    document.querySelectorAll(".nav-item").forEach(b => b.classList.toggle("active", b.dataset.view === "quality"));
    $("pageTitle").textContent = "Product Quality Management";
    scan();
  }

  async function verifyAdmin() {
    const { data: sessionData, error: sessionError } = await client.auth.getSession();
    if (sessionError) throw sessionError;
    const user = sessionData?.session?.user;
    if (!user) throw new Error("Admin session পাওয়া যায়নি। আবার লগইন করুন।");
    const { data, error } = await client.from("admin_users")
      .select("is_active").eq("user_id", user.id).maybeSingle();
    if (error) throw error;
    if (!data?.is_active) throw new Error("এই অ্যাকাউন্টের Admin অনুমতি নেই।");
  }

  function normalizedName(value) {
    return String(value || "").toLocaleLowerCase().trim()
      .replace(/[^\p{L}\p{N}]+/gu, " ").replace(/\s+/g, " ");
  }

  function validHttpUrl(value) {
    if (!value) return false;
    try {
      const u = new URL(String(value));
      return (u.protocol === "https:" || u.protocol === "http:") && !!u.hostname;
    } catch { return false; }
  }

  function addFinding(product, type, issue, severity) {
    findings.push({ id:String(product.id), name:product.name || "Unnamed product",
      productUrl:product.product_url || "", type, issue, severity });
  }

  function runScan() {
    findings = [];
    const activeProducts = productCache.filter(p => p.is_active);
    const nameGroups = new Map();
    const urlGroups = new Map();

    productCache.forEach(p => {
      const name = normalizedName(p.name);
      if (name) {
        if (!nameGroups.has(name)) nameGroups.set(name, []);
        nameGroups.get(name).push(p);
      }
      const url = String(p.product_url || "").trim().toLowerCase();
      if (url) {
        if (!urlGroups.has(url)) urlGroups.set(url, []);
        urlGroups.get(url).push(p);
      }

      if (!p.product_url) addFinding(p, "url", "Shopping / Affiliate URL দেওয়া নেই", "high");
      else if (!validHttpUrl(p.product_url)) addFinding(p, "url", "Shopping URL সঠিক HTTP/HTTPS URL নয়", "high");

      if (!p.image_url) addFinding(p, "image", "Product image URL দেওয়া নেই", "info");
      else if (!validHttpUrl(p.image_url)) addFinding(p, "image", "Image URL সঠিক HTTP/HTTPS URL নয়", "medium");

      if (!p.is_active) addFinding(p, "inactive", "Product বর্তমানে Inactive", "info");
    });

    nameGroups.forEach(group => {
      if (group.length > 1) group.forEach(p =>
        addFinding(p, "duplicate", `একই/মিল থাকা product name আরও ${group.length - 1}টি পণ্যে আছে`, "high"));
    });
    urlGroups.forEach(group => {
      if (group.length > 1) group.forEach(p =>
        addFinding(p, "duplicate", `একই Shopping URL আরও ${group.length - 1}টি পণ্যে ব্যবহৃত`, "high"));
    });

    const affected = new Set(findings.map(f => f.id));
    $("pqTotal").textContent = productCache.length.toLocaleString();
    $("pqAffected").textContent = affected.size.toLocaleString();
    $("pqDuplicates").textContent = findings.filter(f => f.type === "duplicate").length.toLocaleString();
    $("pqUrls").textContent = findings.filter(f => f.type === "url").length.toLocaleString();
    $("pqImages").textContent = findings.filter(f => f.type === "image").length.toLocaleString();
    renderFindings();
  }

  function renderFindings() {
    const filter = $("pqFilter").value;
    const rows = $("pqRows");
    rows.replaceChildren();
    const list = findings.filter(f => filter === "all" || f.type === filter);
    list.forEach(f => {
      const tr = document.createElement("tr");
      const name = document.createElement("td"); name.textContent = f.name; tr.append(name);
      const issue = document.createElement("td"); issue.textContent = f.issue; tr.append(issue);
      const sev = document.createElement("td");
      const tag = document.createElement("span");
      tag.className = "pq-tag" + (f.severity === "high" ? " high" : f.severity === "info" ? " info" : "");
      tag.textContent = f.severity === "high" ? "High" : f.severity === "medium" ? "Review" : "Info";
      sev.append(tag); tr.append(sev);
      const action = document.createElement("td");
      const edit = document.createElement("button");
      edit.type = "button"; edit.className = "pq-action"; edit.textContent = "Products-এ খুঁজুন";
      edit.addEventListener("click", () => openInProducts(f.name));
      action.append(edit);
      if (f.productUrl && validHttpUrl(f.productUrl)) {
        const link = document.createElement("a");
        link.href = f.productUrl; link.target = "_blank"; link.rel = "noopener noreferrer";
        link.className = "pq-action"; link.textContent = "Open link";
        action.append(link);
      }
      tr.append(action); rows.append(tr);
    });
    if (!list.length) {
      const tr = document.createElement("tr"), td = document.createElement("td");
      td.colSpan = 4;
      td.textContent = filter === "all" ? "কোনো সমস্যা পাওয়া যায়নি।" : "এই ধরনের কোনো সমস্যা পাওয়া যায়নি।";
      tr.append(td); rows.append(tr);
    }
    $("pqMessage").textContent = `Scan complete: ${list.length}টি finding দেখানো হচ্ছে।`;
  }

  function openInProducts(name) {
    document.querySelectorAll(".view").forEach(v => v.hidden = v.id !== "view-products");
    document.querySelectorAll(".nav-item").forEach(b => b.classList.toggle("active", b.dataset.view === "products"));
    $("pageTitle").textContent = "পণ্য পরিচালনা";
    const search = $("productSearch");
    if (search) {
      search.value = name;
      search.dispatchEvent(new Event("input", { bubbles:true }));
    }
  }

  async function scan() {
    $("pqMessage").textContent = "Product data যাচাই হচ্ছে…";
    $("pqRefresh").disabled = true;
    try {
      await verifyAdmin();
      const { data, error } = await client.from("products")
        .select("id,name,product_url,image_url,platform,is_active")
        .order("name", { ascending:true }).limit(2000);
      if (error) throw error;
      productCache = data || [];
      runScan();
    } catch (error) {
      $("pqMessage").textContent = "Scan করা যায়নি: " + (error.message || error);
    } finally {
      $("pqRefresh").disabled = false;
    }
  }

  function init() {
    if (!cfg.url || !cfg.publishableKey || !supabaseLib?.createClient) return;
    client = supabaseLib.createClient(cfg.url, cfg.publishableKey, {
      auth: { persistSession:true, autoRefreshToken:true, detectSessionInUrl:true }
    });
    styles();
  }

  let attempts = 0;
  const timer = setInterval(() => {
    attempts++;
    if ($("appShell") && $("view-performance") &&
        document.querySelector('.nav-item[data-view="performance"]')) {
      clearInterval(timer);
      init();
      build();
    } else if (attempts > 80) clearInterval(timer);
  }, 250);
})();
