(() => {
  "use strict";

  const cfg = window.KINIOO7_SUPABASE || {};
  const supabaseLib = window.supabase;
  const $ = (id) => document.getElementById(id);

  function addStyles() {
    if ($("affiliateAnalyticsStyles")) return;
    const style = document.createElement("style");
    style.id = "affiliateAnalyticsStyles";
    style.textContent = `
      .affiliate-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:14px;margin:18px 0}
      .affiliate-card{background:var(--panel,#fff);border:1px solid var(--border,#e2e8f0);border-radius:14px;padding:18px}
      .affiliate-card span{display:block;color:var(--muted,#64748b);font-size:13px}
      .affiliate-card strong{display:block;font-size:28px;margin-top:8px;color:var(--text,#102a43)}
      .affiliate-panel{background:var(--panel,#fff);border:1px solid var(--border,#e2e8f0);border-radius:14px;padding:18px;margin-top:16px}
      .affiliate-panel h3{margin:0 0 12px}
      .affiliate-table-wrap{overflow:auto}
      .affiliate-table{width:100%;border-collapse:collapse;min-width:560px}
      .affiliate-table th,.affiliate-table td{padding:11px 10px;text-align:left;border-bottom:1px solid var(--border,#e2e8f0);font-size:13px}
      .affiliate-table th{color:var(--muted,#64748b);font-weight:600}
      .affiliate-muted{color:var(--muted,#64748b);font-size:13px}
      .affiliate-toolbar{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap}
      .affiliate-toolbar button{border:0;border-radius:8px;padding:9px 14px;cursor:pointer;background:#102a43;color:white}
    `;
    document.head.append(style);
  }

  function el(tag, text, className) {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    if (className) node.className = className;
    return node;
  }

  function buildView() {
    if ($("view-affiliate")) return;
    const main = document.querySelector(".main-area");
    const storeView = $("view-stores");
    if (!main || !storeView) return;

    const nav = document.createElement("button");
    nav.className = "nav-item";
    nav.dataset.view = "affiliate";
    nav.innerHTML = '<span aria-hidden="true">↗</span> <span>Affiliate Analytics</span>';
    document.querySelector(".side-label")?.insertAdjacentElement("afterend", nav.nextSibling || nav);
    const storesNav = document.querySelector('.nav-item[data-view="stores"]');
    if (storesNav) storesNav.insertAdjacentElement("afterend", nav);

    const view = document.createElement("section");
    view.className = "view";
    view.id = "view-affiliate";
    view.hidden = true;
    view.innerHTML = `
      <div class="section-toolbar">
        <div><h2>Affiliate Click Analytics</h2><p>কোন পণ্যে এবং কোন marketplace-এ কতবার ক্লিক হয়েছে দেখুন।</p></div>
        <div class="affiliate-toolbar"><span class="affiliate-muted" id="affiliateUpdated">ডেটা লোড হয়নি</span><button type="button" id="affiliateRefresh">Refresh</button></div>
      </div>
      <div class="affiliate-grid">
        <article class="affiliate-card"><span>মোট Affiliate Clicks</span><strong id="affiliateTotal">—</strong></article>
        <article class="affiliate-card"><span>সাম্প্রতিক রেকর্ড</span><strong id="affiliateLoaded">—</strong></article>
        <article class="affiliate-card"><span>ভিন্ন Platform</span><strong id="affiliatePlatforms">—</strong></article>
        <article class="affiliate-card"><span>ভিন্ন Product</span><strong id="affiliateProducts">—</strong></article>
      </div>
      <div class="affiliate-panel"><h3>Platform অনুযায়ী ক্লিক</h3><div class="affiliate-table-wrap"><table class="affiliate-table"><thead><tr><th>Platform</th><th>Clicks (সাম্প্রতিক ৫০০ রেকর্ড)</th></tr></thead><tbody id="affiliatePlatformRows"><tr><td colspan="2">লোড হচ্ছে…</td></tr></tbody></table></div></div>
      <div class="affiliate-panel"><h3>সবচেয়ে বেশি ক্লিক পাওয়া পণ্য</h3><div class="affiliate-table-wrap"><table class="affiliate-table"><thead><tr><th>Product</th><th>Platform</th><th>Clicks (সাম্প্রতিক ৫০০ রেকর্ড)</th></tr></thead><tbody id="affiliateTopRows"><tr><td colspan="3">লোড হচ্ছে…</td></tr></tbody></table></div></div>
      <div class="affiliate-panel"><h3>সাম্প্রতিক Affiliate Clicks</h3><p class="affiliate-muted">সর্বশেষ ৫০০টি রেকর্ড দেখানো হচ্ছে।</p><div class="affiliate-table-wrap"><table class="affiliate-table"><thead><tr><th>সময়</th><th>Product</th><th>Platform</th><th>Destination</th></tr></thead><tbody id="affiliateRecentRows"><tr><td colspan="4">লোড হচ্ছে…</td></tr></tbody></table></div></div>
      <p class="affiliate-muted" id="affiliateMessage" role="status"></p>
    `;
    storeView.insertAdjacentElement("afterend", view);

    nav.addEventListener("click", () => showAffiliateView());
    $("affiliateRefresh").addEventListener("click", loadAnalytics);
  }

  function showAffiliateView() {
    document.querySelectorAll(".view").forEach(v => v.hidden = v.id !== "view-affiliate");
    document.querySelectorAll(".nav-item").forEach(b => b.classList.toggle("active", b.dataset.view === "affiliate"));
    $("pageTitle").textContent = "Affiliate Click Analytics";
    loadAnalytics();
  }

  function addRow(tbody, values, linkIndex = -1) {
    const tr = document.createElement("tr");
    values.forEach((value, index) => {
      const td = document.createElement("td");
      if (index === linkIndex && value) {
        const a = document.createElement("a");
        a.href = value;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        a.textContent = "Open link";
        td.append(a);
      } else {
        td.textContent = value || "—";
      }
      tr.append(td);
    });
    tbody.append(tr);
  }

  async function loadAnalytics() {
    const msg = $("affiliateMessage");
    if (!msg) return;
    msg.textContent = "ডেটা লোড হচ্ছে…";
    $("affiliateRefresh").disabled = true;

    try {
      const { data: sessionData, error: sessionError } = await window.__kiniAffiliateClient.auth.getSession();
      if (sessionError) throw sessionError;
      const user = sessionData?.session?.user;
      if (!user) throw new Error("Admin session পাওয়া যায়নি। আবার লগইন করুন।");

      const { data: admin, error: adminError } = await window.__kiniAffiliateClient
        .from("admin_users").select("is_active").eq("user_id", user.id).maybeSingle();
      if (adminError) throw adminError;
      if (!admin?.is_active) throw new Error("এই অ্যাকাউন্টের Admin অনুমতি নেই।");

      const [countResult, rowsResult] = await Promise.all([
        window.__kiniAffiliateClient.from("affiliate_clicks").select("*", { count: "exact", head: true }),
        window.__kiniAffiliateClient.from("affiliate_clicks")
          .select("product_id,product_name,platform,destination_url,clicked_at")
          .order("clicked_at", { ascending: false }).limit(500)
      ]);
      if (countResult.error) throw countResult.error;
      if (rowsResult.error) throw rowsResult.error;

      const rows = rowsResult.data || [];
      $("affiliateTotal").textContent = Number(countResult.count || 0).toLocaleString();
      $("affiliateLoaded").textContent = rows.length.toLocaleString();
      $("affiliatePlatforms").textContent = new Set(rows.map(r => r.platform || "Unknown")).size;
      $("affiliateProducts").textContent = new Set(rows.map(r => r.product_id || r.product_name || "Unknown")).size;

      const platformCounts = {};
      const productCounts = {};
      rows.forEach(r => {
        const platform = r.platform || "Unknown";
        platformCounts[platform] = (platformCounts[platform] || 0) + 1;
        const key = `${r.product_id || ""}::${r.product_name || "Unnamed product"}::${platform}`;
        if (!productCounts[key]) productCounts[key] = { name: r.product_name || "Unnamed product", platform, count: 0 };
        productCounts[key].count++;
      });

      const platformBody = $("affiliatePlatformRows");
      platformBody.replaceChildren();
      Object.entries(platformCounts).sort((a,b) => b[1]-a[1]).forEach(([name,count]) => addRow(platformBody,[name,count.toLocaleString()]));
      if (!platformBody.children.length) platformBody.append(el("tr")).append(el("td","এখনো কোনো click নেই।"));

      const topBody = $("affiliateTopRows");
      topBody.replaceChildren();
      Object.values(productCounts).sort((a,b) => b.count-a.count).slice(0,10)
        .forEach(p => addRow(topBody,[p.name,p.platform,p.count.toLocaleString()]));
      if (!topBody.children.length) topBody.append(el("tr")).append(el("td","এখনো কোনো click নেই।"));

      const recentBody = $("affiliateRecentRows");
      recentBody.replaceChildren();
      rows.forEach(r => addRow(recentBody,[
        r.clicked_at ? new Date(r.clicked_at).toLocaleString() : "—",
        r.product_name || "Unnamed product",
        r.platform || "Unknown",
        r.destination_url || ""
      ],3));
      if (!recentBody.children.length) recentBody.append(el("tr")).append(el("td","এখনো কোনো click নেই।"));

      $("affiliateUpdated").textContent = "Updated: " + new Date().toLocaleString();
      msg.textContent = rows.length === 500
        ? "সর্বশেষ ৫০০টি রেকর্ড থেকে Platform ও Top Product-এর হিসাব করা হয়েছে। মোট Click সংখ্যা সম্পূর্ণ।"
        : "Analytics সফলভাবে আপডেট হয়েছে।";
    } catch (error) {
      msg.textContent = "ডেটা লোড হয়নি: " + (error.message || error);
    } finally {
      $("affiliateRefresh").disabled = false;
    }
  }

  function init() {
    if (!cfg.url || !cfg.publishableKey || !supabaseLib?.createClient) return;
    window.__kiniAffiliateClient = supabaseLib.createClient(cfg.url, cfg.publishableKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    });
    addStyles();
    buildView();
  }

  let attempts = 0;
  const timer = setInterval(() => {
    attempts++;
    if ($("appShell") && $("view-stores")) {
      clearInterval(timer);
      init();
    } else if (attempts > 40) {
      clearInterval(timer);
    }
  }, 250);
})();
