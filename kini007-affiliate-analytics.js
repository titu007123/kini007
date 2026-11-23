(() => {
  "use strict";

  const cfg = window.KINIOO7_SUPABASE || {};
  const supabaseLib = window.supabase;
  const $ = (id) => document.getElementById(id);
  let analyticsClient = null;
  let activeRows = [];

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
      .affiliate-toolbar button,.affiliate-toolbar select{border:1px solid var(--border,#d9e2ec);border-radius:8px;padding:9px 13px;cursor:pointer;background:var(--panel,#fff);color:var(--text,#102a43);font:inherit}
      .affiliate-toolbar button{background:#102a43;color:white;border-color:#102a43}
      .affiliate-toolbar button:disabled{opacity:.55;cursor:wait}
      .affiliate-chart{width:100%;height:260px;display:block;overflow:visible}
      .affiliate-chart text{font:12px sans-serif;fill:var(--muted,#64748b)}
      .affiliate-chart .gridline{stroke:var(--border,#e2e8f0);stroke-width:1}
      .affiliate-chart .trendline{fill:none;stroke:#159b91;stroke-width:3;stroke-linecap:round;stroke-linejoin:round}
      .affiliate-chart .trendpoint{fill:#159b91}
      @media(max-width:600px){.affiliate-toolbar{align-items:stretch}.affiliate-toolbar select,.affiliate-toolbar button{width:100%}}
    `;
    document.head.append(style);
  }

  function buildView() {
    if ($("view-affiliate")) return;
    const storeView = $("view-stores");
    if (!storeView) return;

    const nav = document.createElement("button");
    nav.className = "nav-item";
    nav.dataset.view = "affiliate";
    nav.innerHTML = '<span aria-hidden="true">↗</span> <span>Affiliate Analytics</span>';
    const storesNav = document.querySelector('.nav-item[data-view="stores"]');
    if (storesNav) storesNav.insertAdjacentElement("afterend", nav);

    const view = document.createElement("section");
    view.className = "view";
    view.id = "view-affiliate";
    view.hidden = true;
    view.innerHTML = `
      <div class="section-toolbar">
        <div><h2>Affiliate Click Analytics</h2><p>কোন পণ্যে এবং কোন marketplace-এ কতবার ক্লিক হয়েছে দেখুন।</p></div>
        <div class="affiliate-toolbar">
          <select id="affiliateDateRange" aria-label="Date range">
            <option value="today">আজ</option>
            <option value="7" selected>শেষ ৭ দিন</option>
            <option value="30">শেষ ৩০ দিন</option>
            <option value="all">সব সময়</option>
          </select>
          <button type="button" id="affiliateRefresh">Refresh</button>
          <button type="button" id="affiliateExport">Export CSV</button>
        </div>
      </div>
      <p class="affiliate-muted" id="affiliateUpdated">ডেটা লোড হয়নি</p>
      <div class="affiliate-grid">
        <article class="affiliate-card"><span>মোট Affiliate Clicks</span><strong id="affiliateTotal">—</strong></article>
        <article class="affiliate-card"><span>এই সময়ের রেকর্ড</span><strong id="affiliateLoaded">—</strong></article>
        <article class="affiliate-card"><span>ভিন্ন Platform</span><strong id="affiliatePlatforms">—</strong></article>
        <article class="affiliate-card"><span>ভিন্ন Product</span><strong id="affiliateProducts">—</strong></article>
      </div>
      <div class="affiliate-panel"><h3>Click Trend</h3><p class="affiliate-muted">নির্বাচিত সময় অনুযায়ী প্রতিদিনের ক্লিক</p><svg id="affiliateTrendChart" class="affiliate-chart" viewBox="0 0 900 260" role="img" aria-label="Daily affiliate click trend"></svg></div>
      <div class="affiliate-panel"><h3>Platform অনুযায়ী ক্লিক</h3><div class="affiliate-table-wrap"><table class="affiliate-table"><thead><tr><th>Platform</th><th>Clicks</th></tr></thead><tbody id="affiliatePlatformRows"><tr><td colspan="2">লোড হচ্ছে…</td></tr></tbody></table></div></div>
      <div class="affiliate-panel"><h3>সবচেয়ে বেশি ক্লিক পাওয়া পণ্য</h3><div class="affiliate-table-wrap"><table class="affiliate-table"><thead><tr><th>Product</th><th>Platform</th><th>Clicks</th></tr></thead><tbody id="affiliateTopRows"><tr><td colspan="3">লোড হচ্ছে…</td></tr></tbody></table></div></div>
      <div class="affiliate-panel"><h3>সাম্প্রতিক Affiliate Clicks</h3><p class="affiliate-muted" id="affiliateRecentCaption">রেকর্ড লোড হচ্ছে…</p><div class="affiliate-table-wrap"><table class="affiliate-table"><thead><tr><th>সময়</th><th>Product</th><th>Platform</th><th>Destination</th></tr></thead><tbody id="affiliateRecentRows"><tr><td colspan="4">লোড হচ্ছে…</td></tr></tbody></table></div></div>
      <p class="affiliate-muted" id="affiliateMessage" role="status"></p>
    `;
    storeView.insertAdjacentElement("afterend", view);

    nav.addEventListener("click", showAffiliateView);
    $("affiliateRefresh").addEventListener("click", loadAnalytics);
    $("affiliateDateRange").addEventListener("change", loadAnalytics);
    $("affiliateExport").addEventListener("click", exportCsv);
  }

  function showAffiliateView() {
    document.querySelectorAll(".view").forEach(v => v.hidden = v.id !== "view-affiliate");
    document.querySelectorAll(".nav-item").forEach(b => b.classList.toggle("active", b.dataset.view === "affiliate"));
    $("pageTitle").textContent = "Affiliate Click Analytics";
    loadAnalytics();
  }

  function getRange() {
    const value = $("affiliateDateRange").value;
    if (value === "all") return null;
    const now = new Date();
    const start = new Date(now);
    if (value === "today") start.setHours(0, 0, 0, 0);
    else {
      start.setDate(start.getDate() - (Number(value) - 1));
      start.setHours(0, 0, 0, 0);
    }
    return start.toISOString();
  }

  async function verifyAdmin() {
    const { data: sessionData, error: sessionError } = await analyticsClient.auth.getSession();
    if (sessionError) throw sessionError;
    const user = sessionData?.session?.user;
    if (!user) throw new Error("Admin session পাওয়া যায়নি। আবার লগইন করুন।");
    const { data, error } = await analyticsClient.from("admin_users")
      .select("is_active").eq("user_id", user.id).maybeSingle();
    if (error) throw error;
    if (!data?.is_active) throw new Error("এই অ্যাকাউন্টের Admin অনুমতি নেই।");
  }

  async function fetchAllRows(startIso) {
    const pageSize = 1000;
    let all = [];
    for (let offset = 0; ; offset += pageSize) {
      let query = analyticsClient.from("affiliate_clicks")
        .select("product_id,product_name,platform,destination_url,clicked_at")
        .order("clicked_at", { ascending: false })
        .range(offset, offset + pageSize - 1);
      if (startIso) query = query.gte("clicked_at", startIso);
      const { data, error } = await query;
      if (error) throw error;
      const batch = data || [];
      all = all.concat(batch);
      if (batch.length < pageSize) break;
    }
    return all;
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
      } else td.textContent = value || "—";
      tr.append(td);
    });
    tbody.append(tr);
  }

  function drawTrend(rows) {
    const svg = $("affiliateTrendChart");
    svg.replaceChildren();
    const range = $("affiliateDateRange").value;
    const dayCount = range === "today" ? 1 : range === "7" ? 7 : range === "30" ? 30 : 14;
    const days = [];
    const today = new Date();
    for (let i = dayCount - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      days.push(d);
    }
    const counts = new Map(days.map(d => [d.toLocaleDateString(), 0]));
    rows.forEach(r => {
      if (!r.clicked_at) return;
      const key = new Date(r.clicked_at).toLocaleDateString();
      if (counts.has(key)) counts.set(key, counts.get(key) + 1);
    });
    if (range === "all") {
      counts.clear();
      rows.forEach(r => {
        if (!r.clicked_at) return;
        const d = new Date(r.clicked_at);
        const key = d.toLocaleDateString();
        counts.set(key, (counts.get(key) || 0) + 1);
      });
      const entries = [...counts.entries()].slice(-14);
      entries.forEach(([label], i) => {
        const d = new Date(label);
        if (!Number.isNaN(d.getTime())) days[i] = d;
      });
      const values = entries.map(x => x[1]);
      drawSvg(values, entries.map(x => x[0]), svg);
      return;
    }
    drawSvg(days.map(d => counts.get(d.toLocaleDateString()) || 0),
      days.map(d => d.toLocaleDateString(undefined, { month: "short", day: "numeric" })), svg);
  }

  function drawSvg(values, labels, svg) {
    const ns = "http://www.w3.org/2000/svg";
    const make = (tag, attrs, content) => {
      const node = document.createElementNS(ns, tag);
      Object.entries(attrs || {}).forEach(([k,v]) => node.setAttribute(k, v));
      if (content !== undefined) node.textContent = content;
      return node;
    };
    const width = 900, height = 260, left = 42, right = 18, top = 18, bottom = 42;
    const plotW = width - left - right, plotH = height - top - bottom;
    const max = Math.max(1, ...values);
    [0, .5, 1].forEach(frac => {
      const y = top + plotH * frac;
      svg.append(make("line", { x1:left, y1:y, x2:width-right, y2:y, class:"gridline" }));
      svg.append(make("text", { x:4, y:y+4 }, String(Math.round(max * (1-frac)))));
    });
    if (!values.length) {
      svg.append(make("text", { x:width/2, y:height/2, "text-anchor":"middle" }, "এখনো কোনো click নেই"));
      return;
    }
    const points = values.map((v,i) => {
      const x = values.length === 1 ? left + plotW/2 : left + i * plotW/(values.length-1);
      const y = top + plotH - (v/max)*plotH;
      return [x,y,v];
    });
    svg.append(make("polyline", { points:points.map(p=>`${p[0]},${p[1]}`).join(" "), class:"trendline" }));
    points.forEach((p,i) => {
      svg.append(make("circle", { cx:p[0], cy:p[1], r:4, class:"trendpoint" }));
      if (values.length <= 14 || i === 0 || i === values.length-1 || i % 5 === 0) {
        svg.append(make("text", { x:p[0], y:height-12, "text-anchor":"middle" }, labels[i] || ""));
      }
    });
  }

  function renderAnalytics(rows) {
    activeRows = rows;
    $("affiliateTotal").textContent = rows.length.toLocaleString();
    $("affiliateLoaded").textContent = rows.length.toLocaleString();
    $("affiliatePlatforms").textContent = new Set(rows.map(r => r.platform || "Unknown")).size;
    $("affiliateProducts").textContent = new Set(rows.map(r => r.product_id || r.product_name || "Unknown")).size;

    const platformCounts = {};
    const productCounts = {};
    rows.forEach(r => {
      const platform = r.platform || "Unknown";
      platformCounts[platform] = (platformCounts[platform] || 0) + 1;
      const key = `${r.product_id || ""}::${r.product_name || "Unnamed product"}::${platform}`;
      if (!productCounts[key]) productCounts[key] = { name:r.product_name || "Unnamed product", platform, count:0 };
      productCounts[key].count++;
    });

    const platformBody = $("affiliatePlatformRows");
    platformBody.replaceChildren();
    Object.entries(platformCounts).sort((a,b)=>b[1]-a[1]).forEach(([name,count])=>addRow(platformBody,[name,count.toLocaleString()]));
    if (!platformBody.children.length) platformBody.innerHTML = '<tr><td colspan="2">এই সময়ের মধ্যে কোনো click নেই।</td></tr>';

    const topBody = $("affiliateTopRows");
    topBody.replaceChildren();
    Object.values(productCounts).sort((a,b)=>b.count-a.count).slice(0,10)
      .forEach(p=>addRow(topBody,[p.name,p.platform,p.count.toLocaleString()]));
    if (!topBody.children.length) topBody.innerHTML = '<tr><td colspan="3">এই সময়ের মধ্যে কোনো click নেই।</td></tr>';

    const recentBody = $("affiliateRecentRows");
    recentBody.replaceChildren();
    rows.slice(0,500).forEach(r=>addRow(recentBody,[
      r.clicked_at ? new Date(r.clicked_at).toLocaleString() : "—",
      r.product_name || "Unnamed product",
      r.platform || "Unknown",
      r.destination_url || ""
    ],3));
    if (!recentBody.children.length) recentBody.innerHTML = '<tr><td colspan="4">এই সময়ের মধ্যে কোনো click নেই।</td></tr>';
    $("affiliateRecentCaption").textContent = `মোট ${rows.length.toLocaleString()}টি রেকর্ড; নিচে সর্বশেষ ${Math.min(rows.length,500)}টি দেখানো হচ্ছে।`;
    drawTrend(rows);
  }

  async function loadAnalytics() {
    const msg = $("affiliateMessage");
    if (!msg) return;
    msg.textContent = "ডেটা লোড হচ্ছে…";
    $("affiliateRefresh").disabled = true;
    $("affiliateExport").disabled = true;
    try {
      await verifyAdmin();
      const rows = await fetchAllRows(getRange());
      renderAnalytics(rows);
      $("affiliateUpdated").textContent = "Updated: " + new Date().toLocaleString();
      msg.textContent = "Analytics সফলভাবে আপডেট হয়েছে।";
    } catch (error) {
      msg.textContent = "ডেটা লোড হয়নি: " + (error.message || error);
    } finally {
      $("affiliateRefresh").disabled = false;
      $("affiliateExport").disabled = false;
    }
  }

  function csvCell(value) {
    const text = String(value ?? "");
    return '"' + text.replace(/"/g, '""') + '"';
  }

  function exportCsv() {
    if (!activeRows.length) {
      $("affiliateMessage").textContent = "Export করার মতো কোনো রেকর্ড নেই।";
      return;
    }
    const header = ["clicked_at","product_id","product_name","platform","destination_url"];
    const lines = [header.map(csvCell).join(",")];
    activeRows.forEach(r => lines.push([
      r.clicked_at, r.product_id, r.product_name, r.platform, r.destination_url
    ].map(csvCell).join(",")));
    const blob = new Blob(["\uFEFF" + lines.join("\r\n")], { type:"text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `kini007-affiliate-clicks-${$("affiliateDateRange").value}-${new Date().toISOString().slice(0,10)}.csv`;
    document.body.append(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    $("affiliateMessage").textContent = `${activeRows.length.toLocaleString()}টি রেকর্ড CSV ফাইলে Export হয়েছে।`;
  }

  function init() {
    if (!cfg.url || !cfg.publishableKey || !supabaseLib?.createClient) return;
    analyticsClient = supabaseLib.createClient(cfg.url, cfg.publishableKey, {
      auth: { persistSession:true, autoRefreshToken:true, detectSessionInUrl:true }
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
    } else if (attempts > 40) clearInterval(timer);
  }, 250);
})();
