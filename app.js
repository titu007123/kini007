(() => {
  "use strict";

  const config = window.KINIOO7_SUPABASE || {};
  const SUPABASE_URL = String(config.url || "").replace(/\/$/, "");
  const SUPABASE_KEY = String(config.publishableKey || "");
  const grid = document.querySelector("#grid");
  const search = document.querySelector("#search");
  const status = document.querySelector("#dataStatus");
  const resultCount = document.querySelector("#resultCount");
  const searchBtn = document.querySelector("#searchBtn");
  let products = [];
  let ebayProducts = [];
  let category = "all";
  let language = "en";

  const copy = {
    bn: {
      loading: "পণ্য লোড হচ্ছে…",
      ready: "ডেটাবেস থেকে পণ্য দেখানো হচ্ছে।",
      missingConfig: "Supabase কনফিগারেশন পাওয়া যায়নি। supabase-config.js পরীক্ষা করুন।",
      error: "পণ্য লোড করা যায়নি। Supabase URL, API key, Data API এবং RLS policy পরীক্ষা করুন।",
      empty: "এখনো কোনো পণ্য যোগ করা হয়নি। Admin Dashboard তৈরি হলে সেখান থেকে পণ্য যোগ করতে পারবেন।",
      noResults: "কোনো পণ্য পাওয়া যায়নি। অন্য শব্দ দিয়ে খুঁজুন।",
      details: "Buy Now ↗",
      noLink: "Buy link unavailable",
      results: "টি পণ্য",
      retry: "আবার চেষ্টা করুন",
      ebayLoading: "eBay থেকে পণ্য খোঁজা হচ্ছে…",
      ebayReady: "eBay থেকে পাওয়া পণ্য",
      ebayError: "eBay থেকে পণ্য আনা যায়নি। Function settings ও Logs পরীক্ষা করুন।",
      ebayEmpty: "এই শব্দে eBay-তে কোনো পণ্য পাওয়া যায়নি।"
    },
    en: {
      loading: "Loading products…",
      ready: "Showing products from the database.",
      missingConfig: "Supabase configuration was not found. Check supabase-config.js.",
      error: "Could not load products. Check the Supabase URL, API key, Data API and RLS policy.",
      empty: "No products have been added yet. You will be able to add products from the Admin Dashboard when it is built.",
      noResults: "No products found. Try another search term.",
      details: "Buy Now ↗",
      noLink: "Buy link unavailable",
      results: "products",
      retry: "Try again",
      ebayLoading: "Searching eBay…",
      ebayReady: "Products found on eBay",
      ebayError: "Could not load eBay products. Check Function settings and Logs.",
      ebayEmpty: "No eBay products found for this search."
    }
  };

  function text(key) { return copy[language][key]; }
  function normalize(value) {
    return String(value ?? "").toLocaleLowerCase().replace(/[০-৯]/g, d => "০১২৩৪৫৬৭৮৯".indexOf(d)).trim();
  }
  function safeUrl(value) {
    try {
      const url = new URL(String(value || ""));
      return url.protocol === "https:" || url.protocol === "http:" ? url.href : "";
    } catch (_) { return ""; }
  }

  // Record affiliate clicks without delaying or blocking the destination link.
  function trackAffiliateClick({ productId = null, productName = "", platform = "", destinationUrl = "" }) {
    if (!SUPABASE_URL || !SUPABASE_KEY || !destinationUrl) return;

    const payload = {
      product_id: productId == null ? null : String(productId),
      product_name: String(productName || "").slice(0, 500),
      platform: String(platform || "").slice(0, 100),
      destination_url: String(destinationUrl).slice(0, 2000)
    };

    fetch(`${SUPABASE_URL}/rest/v1/affiliate_clicks`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_KEY,
        "Content-Type": "application/json",
        Prefer: "return=minimal"
      },
      body: JSON.stringify(payload),
      keepalive: true
    }).catch(error => {
      console.warn("Kini007 affiliate click tracking failed:", error);
    });
  }
  function categoryMatches(product, selected) {
    if (selected === "all") return true;

    const categoryValue = normalize(product.category);
    const regionValue = normalize(product.region);
    const groups = {
      bd: ["bd", "bangladesh", "বাংলাদেশ"],
      global: ["global", "international", "আন্তর্জাতিক"],
      fashion: ["fashion", "ফ্যাশন", "clothing", "beauty"],
      tech: ["tech", "technology", "electronics", "প্রযুক্তি", "ইলেকট্রনিক্স"],
      stories: ["stories", "story", "গল্প"],
      islamic: ["islamic", "ইসলামিক", "ইসলাম"],
      home: ["home", "living", "kitchen", "furniture", "decor"],
      health: ["health", "fitness", "gym", "wellness", "medical"],
      books: ["book", "study", "education", "stationery"],
      mobile: ["mobile", "phone", "smartphone"],
      accessories: ["accessory", "accessories", "headphone", "earbud", "watch"]
    };
    const terms = groups[selected] || [selected];

    // Bangladesh/Global are regions in the database schema, not product categories.
    const source = (selected === "bd" || selected === "global")
      ? `${regionValue} ${categoryValue}`
      : `${categoryValue} ${normalize(product.name)} ${normalize(product.description)}`;
    if (selected === "diamond") {
      // Match complete words only. Using includes("ring") also matched
      // unrelated words such as "featuring", causing phones/electronics
      // to appear in the Diamond category.
      const diamondCategory = /\bdiamond\b/i.test(categoryValue);
      const jewelryPattern = /\b(diamond|jewelry|jewellery|ring|necklace|earring|bracelet|pendant)\b/i;
      return diamondCategory || jewelryPattern.test(
        `${normalize(product.name)} ${normalize(product.description)}`
      );
    }
    return terms.some(term => source.includes(normalize(term)));
  }
  function formatPrice(price, currency) {
    if (price === null || price === undefined || price === "") return "";
    const amount = Number(price);
    if (!Number.isFinite(amount)) return `${price} ${currency || ""}`.trim();
    const code = String(currency || "BDT").toUpperCase();
    try {
      return new Intl.NumberFormat("en-US", {
        style: "currency", currency: code, maximumFractionDigits: 2
      }).format(amount);
    } catch (_) {
      return `${amount.toLocaleString("en-US")} ${code}`;
    }
  }
  function make(tag, className, value) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (value !== undefined && value !== null) node.textContent = String(value);
    return node;
  }
  function render() {
    const query = normalize(search.value);
    const visible = products.filter(product => {
      const searchable = normalize([
        product.name, product.description, product.category,
        product.brand, product.platform, product.region
      ].join(" "));
      return categoryMatches(product, category) && (!query || searchable.includes(query));
    });

    grid.replaceChildren();
    if (resultCount) resultCount.textContent = `${visible.length} ${text("results")}`;

    if (!visible.length) {
      const empty = make("div", "empty", products.length ? text("noResults") : text("empty"));
      grid.appendChild(empty);
      return;
    }

    const fragment = document.createDocumentFragment();
    visible.forEach(product => {
      const card = make("article", "card");
      const imageUrl = safeUrl(product.image_url);
      if (imageUrl) {
        const imageWrap = make("div", "art image-art");
        const image = make("img", "product-image");
        image.src = imageUrl;
        image.alt = product.name || "Product image";
        image.loading = "lazy";
        image.referrerPolicy = "no-referrer";
        image.addEventListener("error", () => {
          imageWrap.replaceChildren(make("span", "image-fallback", "🛍️"));
        }, { once: true });
        imageWrap.appendChild(image);
        card.appendChild(imageWrap);
      } else {
        card.appendChild(make("div", "art", "🛍️"));
      }

      const body = make("div", "card-body");
      const label = [product.platform, product.category].filter(Boolean).join(" • ") || product.region || "Kini007";
      body.appendChild(make("span", "badge", label));
      body.appendChild(make("h3", "", product.name || "Unnamed product"));
      if (product.description) body.appendChild(make("p", "", product.description));
      const price = formatPrice(product.price, product.currency);
      if (price) body.appendChild(make("div", "product-price", price));
      const link = safeUrl(product.product_url);
      const action = make(link ? "a" : "span", link ? "product-link" : "product-link disabled", link ? text("details") : text("noLink"));
      if (link) {
        action.href = link;
        action.target = "_blank";
        action.rel = "noopener noreferrer sponsored";
        action.addEventListener("click", () => {
          trackAffiliateClick({
            productId: product.id,
            productName: product.name,
            platform: product.platform,
            destinationUrl: link
          });
        });
      }
      body.appendChild(action);
      card.appendChild(body);
      fragment.appendChild(card);
    });
    grid.appendChild(fragment);
  }

  function renderEbayProducts() {
    const ebayGrid = document.querySelector("#ebayGrid");
    if (!ebayGrid) return;
    ebayGrid.replaceChildren();
    if (!ebayProducts.length) {
      ebayGrid.appendChild(make("div", "empty", text("ebayEmpty")));
      return;
    }
    const fragment = document.createDocumentFragment();
    ebayProducts.forEach(item => {
      const card = make("article", "card");
      const imageUrl = safeUrl(item.image?.imageUrl || item.thumbnailImages?.[0]?.imageUrl);
      if (imageUrl) {
        const imageWrap = make("div", "art image-art");
        const image = make("img", "product-image");
        image.src = imageUrl;
        image.alt = item.title || "eBay product";
        image.loading = "lazy";
        image.referrerPolicy = "no-referrer";
        image.addEventListener("error", () => imageWrap.replaceChildren(make("span", "image-fallback", "🛍️")), { once: true });
        imageWrap.appendChild(image);
        card.appendChild(imageWrap);
      } else {
        card.appendChild(make("div", "art", "🛍️"));
      }
      const body = make("div", "card-body");
      const categoryName = item.categories?.[0]?.categoryName || "Global";
      body.appendChild(make("span", "badge", `eBay Global • ${categoryName}`));
      body.appendChild(make("h3", "", item.title || "eBay product"));
      const details = [item.condition, item.shortDescription].filter(Boolean).join(" • ");
      if (details) body.appendChild(make("p", "", details));
      const priceValue = item.price?.value;
      const currency = item.price?.currency || "USD";
      const price = formatPrice(priceValue, currency);
      if (price) body.appendChild(make("div", "product-price", price));
      const link = safeUrl(item.itemWebUrl);
      const action = make(link ? "a" : "span", link ? "product-link" : "product-link disabled", link ? text("details") : text("noLink"));
      if (link) {
        action.href = link;
        action.target = "_blank";
        action.rel = "noopener noreferrer sponsored";
        action.addEventListener("click", () => {
          trackAffiliateClick({
            productId: item.itemId || item.legacyItemId || null,
            productName: item.title || "eBay product",
            platform: "eBay",
            destinationUrl: link
          });
        });
      }
      body.appendChild(action);
      card.appendChild(body);
      fragment.appendChild(card);
    });
    ebayGrid.appendChild(fragment);
  }

  async function searchEbay() {
    const query = String(search.value || "").trim();
    const section = document.querySelector("#ebaySection");
    const ebayStatus = document.querySelector("#ebayStatus");
    if (!section || !ebayStatus) return;
    if (!query) {
      section.hidden = true;
      ebayProducts = [];
      return;
    }
    section.hidden = false;
    ebayStatus.textContent = text("ebayLoading");
    document.querySelector("#ebayGrid").replaceChildren(make("div", "empty", text("ebayLoading")));
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/dynamic-worker`, {
        method: "POST",
        headers: {
          apikey: SUPABASE_KEY,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ query }),
        cache: "no-store"
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload.success === false) {
        throw new Error(payload.error || `Function returned ${response.status}`);
      }
      ebayProducts = Array.isArray(payload.products) ? payload.products : [];
      ebayStatus.textContent = `${text("ebayReady")} (${payload.total ?? ebayProducts.length})`;
      renderEbayProducts();
    } catch (error) {
      console.error("Kini007 eBay search error:", error);
      ebayProducts = [];
      ebayStatus.textContent = `${text("ebayError")} ${error.message || ""}`;
      document.querySelector("#ebayGrid").replaceChildren(make("div", "empty", text("ebayError")));
    }
  }

  async function loadProducts() {
    if (!SUPABASE_URL || !SUPABASE_KEY) {
      status.textContent = text("missingConfig");
      grid.replaceChildren(make("div", "empty", text("missingConfig")));
      return;
    }
    status.textContent = text("loading");
    grid.replaceChildren(make("div", "empty", text("loading")));

    const endpoint = `${SUPABASE_URL}/rest/v1/products?select=id,name,description,category,brand,price,currency,image_url,product_url,platform,region,is_active,created_at&is_active=eq.true&order=created_at.desc&limit=10000`;
    try {
      const response = await fetch(endpoint, {
        method: "GET",
        headers: {
          // Supabase sb_publishable_* keys are API keys, not JWTs.
          // Send them in apikey only; do not use them as Bearer tokens.
          apikey: SUPABASE_KEY,
          Accept: "application/json"
        },
        cache: "no-store"
      });
      if (!response.ok) {
        const detail = await response.text().catch(() => "");
        throw new Error(`Supabase returned ${response.status}: ${detail.slice(0, 240)}`);
      }
      const data = await response.json();
      products = Array.isArray(data) ? data : [];
      status.textContent = text("ready");
      render();
    } catch (error) {
      console.error("Kini007 product loading error:", error);
      status.textContent = text("error");
      grid.replaceChildren(make("div", "empty", text("error")));
      const retry = make("button", "retry-button", text("retry"));
      retry.type = "button";
      retry.addEventListener("click", loadProducts);
      grid.appendChild(retry);
    }
  }

  document.querySelectorAll(".tab").forEach(button => {
    button.addEventListener("click", () => {
      document.querySelector(".tab.active")?.classList.remove("active");
      button.classList.add("active");
      category = button.dataset.cat || "all";
      render();
    });
  });
  search.addEventListener("input", render);
  function handleSearch() { render(); searchEbay(); }
  searchBtn.addEventListener("click", handleSearch);
  search.addEventListener("keydown", event => { if (event.key === "Enter") handleSearch(); });

  document.querySelector("#year").textContent = new Date().getFullYear();
  let installPrompt;
  window.addEventListener("beforeinstallprompt", event => {
    event.preventDefault();
    installPrompt = event;
    document.querySelector("#installBtn").hidden = false;
  });
  document.querySelector("#installBtn").addEventListener("click", async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    await installPrompt.userChoice;
    installPrompt = null;
    document.querySelector("#installBtn").hidden = true;
  });
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js").catch(console.error));
  }

  loadProducts();
})();
