(() => {
  "use strict";

  const cfg = window.KINIOO7_SUPABASE || {};
  const supabaseLib = window.supabase;
  let client = null;
  let products = [];
  let clickRows = [];

  const $ = (id) => document.getElementById(id);

  function addStyles() {
    if ($("productPerformanceStyles")) return;
    const style = document.createElement("style");
    style.id = "productPerformanceStyles";
    style.textContent = `
      .pp-toolbar{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin:16px 0}
      .pp-toolbar select,.pp-toolbar button{font:inherit;padding:9px 13px;border:1px solid #d9e2ec;border-radius:9px}
      .pp-toolbar button{background:#102a43;color:#fff;cursor:pointer}
      .pp-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:14px;margin:16px 0}
      .pp-stat{background:var(--panel,#fff);border:1px solid var(--border,#e2e8f0);border-radius:14px;padding:18px}
      .pp-stat span{display:block;color:var(--muted,#64748b);font-size:13px}
      .pp-stat strong{display:block;font-size:28px;margin-top:8px;color:var(--text,#102a43)}
      .pp-panel{background:var(--panel,#fff);border:1px solid var(--border,#e2e8f0);border-radius:14px;padding:18px;margin-top:16px}
      .pp-panel h3{margin:0 0 12px}
      .pp-table-wrap{overflow:auto}
      .pp-table{width:100%;border-collapse:collapse;min-width:580px}
      .pp-table th,.pp-table td{padding:11px 10px;text-align:left;border-bottom:1px solid var(--border,#e2e8f0);font-size:13px}
      .pp-table th{color:var(--muted,#64748b);font-weight:600}
      .pp-muted{color:var(--muted,#64748b);font-size:13px}
      .pp-status{display:inline-block;padding:3px 8px;border-radius:20px;background:#e8f5f1;color:#087b5e;font-size:12px}
      .pp-status.off{background:#f1f3f5;color:#64748b}
    `;
    document.head.append(style);
  }

  function buildView() {
    if ($("view-performance")) return true;
    const affiliateView = $("view-affiliate");
    const affiliateNav = document.querySelector('.nav-item[data-view="affiliate"]');
    if (!affiliateView || !affiliateNav) return false;

    const nav = document.createElement("button");
    nav.className = "nav-item";
    nav.dataset.view = "performance";
    nav.innerHTML = '<span aria-hidden="true">▤</span> <span>Product Performance</span>';
    affiliateNav.insertAdjacentElement("afterend", nav);

    const view = document.createElement("section");
    view.className = "view";
    view.id = "view-performance";
    view.hidden = true;
    view.innerHTML = `
      <div class="section-toolbar">
        <div><h2>Product Performance</h2><p>কোন পণ্য বেশি Click পাচ্ছে এবং কোন পণ্যে আগ্রহ কম তা দেখুন।</p></div>
      </div>
      <div class="pp-toolbar">
        <label for="ppDateRange">সময় নির্বাচন:</label>
        <select id="ppDateRange">
          <option value="today">আজ</option>
          <option value="7" selected>শেষ ৭ দিন</option>
          <option value="30">শেষ ৩০ দিন</option>
          <option value="all">সব সময়</option>
        </select>
        <button type="button" id="ppRefresh">Refresh</button>
      </div>
      <div class="pp-stats">
        <article class="pp-stat"><span>মোট Product Clicks</span><strong id="ppTotalClicks">—</strong></article>
        <article class="pp-stat"><span>Click পাওয়া Products</span><strong id="ppClickedProducts">—</strong></article>
        <article class="pp-stat"><span>কোনো Click নেই</span><strong id="ppZeroProducts">—</strong></article>
        <article class="pp-stat"><span>সক্রিয় Products</span><strong id="ppActiveProducts">—</strong></article>
      </div>
      <div class="pp-panel">
        <h3>Top Performing Products</h3>
        <p class="pp-muted">নির্বাচিত সময়ের Click অনুযায়ী সর্বোচ্চ ১০টি পণ্য।</p>
        <div class="pp-table-wrap"><table class="pp-table"><thead><tr><th>Rank</th><th>Product</th><th>Platform</th><th>Clicks</th><th>Status</th></tr></thead><tbody id="ppTopRows"><tr><td colspan="5">লোড হচ্ছে…</td></tr></tbody></table></div>
      </div>
      <div class="pp-panel">
        <h3>Low / No Click Products</h3>
        <p class="pp-muted">সক্রিয় পণ্যের মধ্যে নির্বাচিত সময়ে সবচেয়ে কম Click পাওয়া ১০টি পণ্য। এটি আগ্রহের একটি সূচক, বিক্রির পরিমাপ নয়।</p>
        <div class="pp-table-wrap"><table class="pp-table"><thead><tr><th>Product</th><th>Platform</th><th>Clicks</th><th>Status</th></tr></thead><tbody id="ppLowRows"><tr><td colspan="4">লোড হচ্ছে…</td></tr></tbody></table></div>
      </div>
      <p class="pp-muted" id="ppMessage" role="status"></p>
    `;
    affiliateView.insertAdjacentElement("afterend", view);

    nav.addEventListener("click", showView);
    $("ppRefresh").addEventListener("click", loadData);
    $("ppDateRange").addEventListener("change", loadData);
    return true;
  }

  function showView() {
    document.querySelectorAll(".view").forEach(v => v.hidden = v.id !== "view-performance");
    document.querySelectorAll(".nav-item").forEach(b => b.classList.toggle("active", b.dataset.view === "performance"));
    $("pageTitle").textContent = "Product Performance";
    loadData();
  }

  function rangeStart() {
    const value = $("ppDateRange").value;
    if (value === "all") return null;
    const start = new Date();
    if (value === "today") start.setHours(0,0,0,0);
    else {
      start.setDate(start.getDate() - (Number(value) - 1));
      start.setHours(0,0,0,0);
    }
    return start.toISOString();
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

  async function fetchPages(queryFactory) {
    const size = 1000;
    let output = [];
    for (let offset = 0; ; offset += size) {
      const { data, error } = await queryFactory().range(offset, offset + size - 1);
      if (error) throw error;
      const batch = data || [];
      output = output.concat(batch);
      if (batch.length < size) break;
    }
    return output;
  }

  function cell(row, value) {
    const td = document.createElement("td");
    td.textContent = value == null || value === "" ? "—" : String(value);
    row.append(td);
  }

  function statusCell(row, active) {
    const td = document.createElement("td");
    const badge = document.createElement("span");
    badge.className = active ? "pp-status" : "pp-status off";
    badge.textContent = active ? "Active" : "Inactive";
    td.append(badge);
    row.append(td);
  }

  function fillTable(id, list, includeRank) {
    const body = $(id);
    body.replaceChildren();
    list.forEach((item, index) => {
      const tr = document.createElement("tr");
      if (includeRank) cell(tr, index + 1);
      cell(tr, item.name);
      cell(tr, item.platform);
      cell(tr, item.clicks.toLocaleString());
      statusCell(tr, item.active);
      body.append(tr);
    });
    if (!list.length) {
      const tr = document.createElement("tr");
      const td = document.createElement("td");
      td.colSpan = includeRank ? 5 : 4;
      td.textContent = "এই সময়ের মধ্যে কোনো matching product নেই।";
      tr.append(td);
      body.append(tr);
    }
  }

  async function loadData() {
    const message = $("ppMessage");
    if (!message) return;
    message.textContent = "Product performance data লোড হচ্ছে…";
    $("ppRefresh").disabled = true;
    try {
      await verifyAdmin();
      const start = rangeStart();
      const [productData, clicks] = await Promise.all([
        fetchPages(() => client.from("products")
          .select("id,name,platform,is_active").order("created_at", { ascending:false })),
        fetchPages(() => {
          let q = client.from("affiliate_clicks")
            .select("product_id,product_name,platform,clicked_at")
            .order("clicked_at", { ascending:false });
          if (start) q = q.gte("clicked_at", start);
          return q;
        })
      ]);

      products = productData || [];
      clickRows = clicks || [];
      const counts = new Map();
      clickRows.forEach(click => {
        const key = String(click.product_id ?? "");
        if (!key) return;
        counts.set(key, (counts.get(key) || 0) + 1);
      });

      const performance = products.map(product => ({
        id: String(product.id),
        name: product.name || "Unnamed product",
        platform: product.platform || "Unknown",
        active: !!product.is_active,
        clicks: counts.get(String(product.id)) || 0
      }));

      const active = performance.filter(p => p.active);
      const top = [...performance].filter(p => p.clicks > 0)
        .sort((a,b) => b.clicks - a.clicks || a.name.localeCompare(b.name)).slice(0,10);
      const low = [...active].sort((a,b) => a.clicks - b.clicks || a.name.localeCompare(b.name)).slice(0,10);

      $("ppTotalClicks").textContent = clickRows.length.toLocaleString();
      $("ppClickedProducts").textContent = performance.filter(p => p.clicks > 0).length.toLocaleString();
      $("ppZeroProducts").textContent = performance.filter(p => p.clicks === 0).length.toLocaleString();
      $("ppActiveProducts").textContent = active.length.toLocaleString();

      fillTable("ppTopRows", top, true);
      fillTable("ppLowRows", low, false);
      message.textContent = "Product Performance সফলভাবে আপডেট হয়েছে। Click মানে affiliate link click; এটি sales বা commission নয়।";
    } catch (error) {
      message.textContent = "ডেটা লোড হয়নি: " + (error.message || error);
    } finally {
      $("ppRefresh").disabled = false;
    }
  }

  function init() {
    if (!cfg.url || !cfg.publishableKey || !supabaseLib?.createClient) return;
    client = supabaseLib.createClient(cfg.url, cfg.publishableKey, {
      auth: { persistSession:true, autoRefreshToken:true, detectSessionInUrl:true }
    });
    addStyles();
  }

  let attempts = 0;
  const timer = setInterval(() => {
    attempts++;
    if ($("appShell") && $("view-affiliate") && document.querySelector('.nav-item[data-view="affiliate"]')) {
      clearInterval(timer);
      init();
      if (!buildView()) return;
    } else if (attempts > 80) {
      clearInterval(timer);
    }
  }, 250);
})();
