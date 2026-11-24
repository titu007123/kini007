(() => {
  "use strict";

  const cfg = window.KINIOO7_SUPABASE || {};
  const lib = window.supabase;

  function start() {
    const sidebar = document.querySelector(".sidebar");
    const appShell = document.getElementById("appShell");
    const main = document.querySelector(".main-area");
    if (!sidebar || !appShell || !main) return;

    // Do not add duplicate controls if the script is loaded more than once.
    if (document.getElementById("sellerManagementNav")) return;

    const nav = document.createElement("button");
    nav.type = "button";
    nav.className = "nav-item";
    nav.id = "sellerManagementNav";
    nav.dataset.view = "seller-management";
    nav.innerHTML = '♙ <span>Seller Management</span>';

    const sideBottom = sidebar.querySelector(".side-bottom");
    if (sideBottom) sidebar.insertBefore(nav, sideBottom);
    else sidebar.appendChild(nav);

    const section = document.createElement("section");
    section.className = "view";
    section.id = "view-seller-management";
    section.hidden = true;
    section.innerHTML = `
      <div class="section-toolbar">
        <div><h2>Seller Management</h2><p>Registered seller profiles and private identity-document access.</p></div>
        <button class="primary" id="sellerManagementRefresh" type="button">↻ Refresh</button>
      </div>
      <div class="notice-box"><strong>Privacy:</strong> Seller identity details are confidential. View documents only when necessary for a legitimate verification purpose. Signed links expire after 60 seconds.</div>
      <div class="panel">
        <div class="table-tools">
          <input id="sellerManagementSearch" type="search" placeholder="Search name, shop, phone or user ID">
          <span id="sellerManagementCount" class="muted"></span>
        </div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Seller / Shop</th><th>Phone / Address</th><th>Identity</th><th>Document</th><th>Joined</th></tr></thead>
            <tbody id="sellerManagementRows"><tr><td colspan="5">Open Seller Management to load data.</td></tr></tbody>
          </table>
        </div>
        <p class="message" id="sellerManagementMessage" role="status"></p>
      </div>`;
    main.appendChild(section);

    let sellerDb = null;
    let profiles = [];

    const $ = id => document.getElementById(id);
    const message = (text, ok = false) => {
      const el = $("sellerManagementMessage");
      if (el) {
        el.textContent = text || "";
        el.style.color = ok ? "#087b5e" : "#c24141";
      }
    };

    function showSellerView() {
      document.querySelectorAll(".view").forEach(v => { v.hidden = v.id !== "view-seller-management"; });
      document.querySelectorAll(".nav-item").forEach(b => b.classList.toggle("active", b === nav));
      const title = $("pageTitle");
      if (title) title.textContent = "Seller Management";
      loadProfiles();
    }

    function render() {
      const tbody = $("sellerManagementRows");
      if (!tbody) return;
      const q = ($("sellerManagementSearch").value || "").trim().toLowerCase();
      const filtered = profiles.filter(p =>
        [p.full_name, p.shop_name, p.phone, p.user_id, p.identity_type]
          .some(v => String(v || "").toLowerCase().includes(q))
      );
      $("sellerManagementCount").textContent = `${filtered.length} seller(s)`;
      tbody.replaceChildren();

      if (!filtered.length) {
        const tr = document.createElement("tr");
        const td = document.createElement("td");
        td.colSpan = 5;
        td.textContent = "No seller profiles found.";
        tr.appendChild(td);
        tbody.appendChild(tr);
        return;
      }

      filtered.forEach(p => {
        const tr = document.createElement("tr");
        const seller = document.createElement("td");
        const name = document.createElement("strong");
        name.textContent = p.full_name || "Name not provided";
        const shop = document.createElement("span");
        shop.className = "subtext";
        shop.textContent = p.shop_name || "Shop not provided";
        const uid = document.createElement("span");
        uid.className = "subtext";
        uid.textContent = `User ID: ${p.user_id}`;
        seller.append(name, shop, uid);

        const contact = document.createElement("td");
        const phone = document.createElement("span");
        phone.textContent = p.phone || "—";
        const address = document.createElement("span");
        address.className = "subtext";
        address.textContent = p.address || "";
        contact.append(phone, address);

        const identity = document.createElement("td");
        const kind = document.createElement("strong");
        kind.textContent = p.identity_type || "—";
        const number = document.createElement("span");
        number.className = "subtext";
        number.textContent = p.identity_number || "";
        identity.append(kind, number);

        const doc = document.createElement("td");
        if (p.identity_document_path) {
          const btn = document.createElement("button");
          btn.type = "button";
          btn.textContent = "View document";
          btn.addEventListener("click", async () => {
            btn.disabled = true;
            btn.textContent = "Preparing…";
            const { data, error } = await sellerDb.storage
              .from("seller-identity-documents")
              .createSignedUrl(p.identity_document_path, 60);
            btn.disabled = false;
            btn.textContent = "View document";
            if (error) {
              message(`Could not open document: ${error.message}`);
              return;
            }
            window.open(data.signedUrl, "_blank", "noopener,noreferrer");
            message("Private document link created; it expires in 60 seconds.", true);
          });
          doc.appendChild(btn);
        } else {
          doc.textContent = "No document path";
        }

        const joined = document.createElement("td");
        joined.textContent = p.created_at ? new Date(p.created_at).toLocaleDateString() : "—";
        tr.append(seller, contact, identity, doc, joined);
        tbody.appendChild(tr);
      });
    }

    async function loadProfiles() {
      const tbody = $("sellerManagementRows");
      tbody.innerHTML = '<tr><td colspan="5">Loading seller profiles…</td></tr>';
      message("");

      if (!cfg.url || !cfg.publishableKey || !lib || !lib.createClient) {
        tbody.innerHTML = '<tr><td colspan="5">Supabase configuration or SDK is unavailable.</td></tr>';
        message("Check the Supabase SDK and supabase-config.js script order in admin.html.");
        return;
      }

      try {
        if (!sellerDb) {
          sellerDb = lib.createClient(cfg.url, cfg.publishableKey, {
            auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
          });
        }

        const { data: sessionData, error: sessionError } = await sellerDb.auth.getSession();
        if (sessionError) throw sessionError;
        const user = sessionData?.session?.user;
        if (!user) throw new Error("Admin session not found. Please log in again.");

        const { data: admin, error: adminError } = await sellerDb
          .from("admin_users")
          .select("user_id,is_active")
          .eq("user_id", user.id)
          .maybeSingle();
        if (adminError) throw adminError;
        if (!admin || admin.is_active !== true) throw new Error("This account is not an active admin.");

        const { data, error } = await sellerDb
          .from("seller_profiles")
          .select("user_id,full_name,phone,shop_name,address,identity_type,identity_number,identity_document_path,is_active,created_at")
          .order("created_at", { ascending: false })
          .limit(500);
        if (error) throw error;
        profiles = data || [];
        render();
        message("Seller profiles loaded.", true);
      } catch (err) {
        tbody.innerHTML = '<tr><td colspan="5">Seller profiles could not be loaded.</td></tr>';
        message(err.message || "Unknown error");
      }
    }

    nav.addEventListener("click", showSellerView);
    $("sellerManagementRefresh").addEventListener("click", loadProfiles);
    $("sellerManagementSearch").addEventListener("input", render);

    // Existing admin navigation hides the new view and updates its own active state.
    document.querySelectorAll(".nav-item:not(#sellerManagementNav)").forEach(button => {
      button.addEventListener("click", () => {
        section.hidden = true;
        nav.classList.remove("active");
      });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();