const STORAGE_KEY = "car-wars-listings";
const FAVORITES_KEY = "car-wars-favorites";
const CONFIG_KEY = "car-wars-config";
const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1200&q=80";

const $app = document.getElementById("app");

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function normalizeCar(raw, index = 0) {
  const brand = String(raw.brand || "").trim();
  const model = String(raw.model || "").trim();
  const title = String(raw.title || `${brand} ${model}`.trim() || "Auto senza titolo").trim();
  const rawImages = Array.isArray(raw.images)
    ? raw.images
    : typeof raw.images === "string" && raw.images.trim()
      ? raw.images.split("|").map((s) => s.trim()).filter(Boolean)
      : [];
  const primaryImage = String(raw.image || rawImages[0] || FALLBACK_IMAGE).trim() || FALLBACK_IMAGE;
  const images = rawImages.length ? rawImages : [primaryImage];
  if (!images.includes(primaryImage)) images.unshift(primaryImage);

  return {
    id: String(raw.id || `cw-${Date.now()}-${index}`).trim(),
    title,
    brand,
    model,
    year: Number(raw.year) || new Date().getFullYear(),
    price: Number(raw.price) || 0,
    km: Number(raw.km) || 0,
    fuel: String(raw.fuel || "Benzina").trim(),
    transmission: String(raw.transmission || "Manuale").trim(),
    city: String(raw.city || "").trim(),
    image: primaryImage,
    images,
    source: String(raw.source || "Inventario").trim(),
    description: String(raw.description || "").trim()
  };
}

function loadListings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.map(normalizeCar);
    }
  } catch {
    /* ignore broken storage */
  }
  return structuredClone(window.CAR_WARS_SEED || []).map(normalizeCar);
}

function saveListings(listings) {
  const normalized = listings.map(normalizeCar);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  return normalized;
}

function loadFavorites() {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    /* ignore */
  }
  return [];
}

function toggleFavorite(id) {
  const favs = loadFavorites();
  const idx = favs.indexOf(id);
  if (idx >= 0) {
    favs.splice(idx, 1);
  } else {
    favs.push(id);
  }
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(favs));
  return favs.includes(id);
}

function loadConfig() {
  const defaults = window.CAR_WARS_CONFIG || {
    dealerName: "Car Wars",
    subtitle: "Annunci auto sul tuo sito",
    phone: "+39 02 1234567",
    whatsapp: "393331234567",
    email: "info@carwars.local",
    address: "Milano"
  };
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (raw) return { ...defaults, ...JSON.parse(raw) };
  } catch {
    /* ignore */
  }
  return { ...defaults };
}

function saveConfig(cfg) {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(cfg));
  syncHeaderBrand();
}

function syncHeaderBrand() {
  const cfg = loadConfig();
  const nameEl = document.getElementById("dealer-brand-name");
  const subEl = document.getElementById("dealer-brand-sub");
  if (nameEl) nameEl.textContent = cfg.dealerName || "Car Wars";
  if (subEl) subEl.textContent = cfg.subtitle || "Annunci auto sul tuo sito";
}

function euro(value) {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0
  }).format(Number(value) || 0);
}

function updateActiveNav(routeKey) {
  document.querySelectorAll("#main-nav a").forEach((a) => {
    a.classList.toggle("active", a.dataset.route === routeKey);
  });
}

function route() {
  syncHeaderBrand();
  const hash = location.hash || "#/";
  const [, path, id] = hash.split("/");
  if (path === "auto" && id) {
    updateActiveNav("catalog");
    return renderDetail(decodeURIComponent(id));
  }
  if (path === "nuovo") {
    updateActiveNav("nuovo");
    return renderForm();
  }
  if (path === "modifica" && id) {
    updateActiveNav("nuovo");
    return renderForm(decodeURIComponent(id));
  }
  if (path === "importa") {
    updateActiveNav("importa");
    return renderImport();
  }
  updateActiveNav("catalog");
  return renderCatalog();
}

function attachImageFallbacks(container) {
  container.querySelectorAll("img").forEach((img) => {
    img.addEventListener(
      "error",
      () => {
        if (img.src !== FALLBACK_IMAGE) img.src = FALLBACK_IMAGE;
      },
      { once: true }
    );
  });
}


function renderCardHtml(car, favs) {
  const isFav = favs.includes(car.id);
  return `
    <article class="card" data-id="${escapeHtml(car.id)}">
      <div class="card-media">
        <img src="${escapeHtml(car.image)}" alt="${escapeHtml(car.title)}" loading="lazy" />
        <button
          type="button"
          class="fav-btn ${isFav ? "active" : ""}"
          data-fav-id="${escapeHtml(car.id)}"
          title="${isFav ? "Rimuovi dai preferiti" : "Salva nei preferiti"}"
          aria-label="Preferito"
        >${isFav ? "♥" : "♡"}</button>
        <span class="year-pill">${escapeHtml(car.year)}</span>
      </div>
      <div class="card-body">
        <div class="price">${euro(car.price)}</div>
        <h3>${escapeHtml(car.title)}</h3>
        <div class="meta">${Number(car.km).toLocaleString("it-IT")} km · ${escapeHtml(car.fuel)} · ${escapeHtml(car.transmission || "Manuale")}</div>
        <div class="card-footer">
          <span class="meta">📍 ${escapeHtml(car.city || "Italia")}</span>
          <span class="badge">${escapeHtml(car.source || "Inventario")}</span>
        </div>
      </div>
    </article>`;
}

function renderCatalog() {
  const listings = loadListings();
  const brands = [...new Set(listings.map((c) => c.brand).filter(Boolean))].sort();
  const defaultFuels = ["Benzina", "Diesel", "Ibrida", "Elettrica", "GPL", "Metano"];
  const fuels = [...new Set([...defaultFuels, ...listings.map((c) => c.fuel).filter(Boolean)])];
  const transmissions = [
    ...new Set(["Manuale", "Automatico", ...listings.map((c) => c.transmission).filter(Boolean)])
  ];

  $app.innerHTML = `
    <section class="hero">
      <div class="hero-top">
        <div>
          <h1>La tua vetrina auto.</h1>
          <p>Esplora il parco auto disponibile, filtra per caratteristiche o gestisci il tuo inventario in tempo reale.</p>
        </div>
        <div class="hero-stats" id="heroStats"></div>
      </div>
    </section>

    <div class="filters-panel panel">
      <div class="filters">
        <input id="q" placeholder="Cerca marca, modello, città, descrizione..." />
        <select id="brand">
          <option value="">Tutte le marche</option>
          ${brands.map((b) => `<option value="${escapeHtml(b)}">${escapeHtml(b)}</option>`).join("")}
        </select>
        <select id="fuel">
          <option value="">Carburante</option>
          ${fuels.map((f) => `<option value="${escapeHtml(f)}">${escapeHtml(f)}</option>`).join("")}
        </select>
        <select id="transmission">
          <option value="">Cambio</option>
          ${transmissions.map((t) => `<option value="${escapeHtml(t)}">${escapeHtml(t)}</option>`).join("")}
        </select>
        <select id="maxPrice">
          <option value="">Prezzo max</option>
          <option value="10000">10.000 €</option>
          <option value="15000">15.000 €</option>
          <option value="20000">20.000 €</option>
          <option value="25000">25.000 €</option>
          <option value="35000">35.000 €</option>
          <option value="50000">50.000 €</option>
        </select>
        <select id="maxKm">
          <option value="">Km max</option>
          <option value="25000">25.000 km</option>
          <option value="50000">50.000 km</option>
          <option value="80000">80.000 km</option>
          <option value="120000">120.000 km</option>
          <option value="180000">180.000 km</option>
        </select>
        <select id="year">
          <option value="">Anno da</option>
          <option value="2016">Dal 2016</option>
          <option value="2018">Dal 2018</option>
          <option value="2020">Dal 2020</option>
          <option value="2022">Dal 2022</option>
          <option value="2024">Dal 2024</option>
        </select>
        <select id="sortBy">
          <option value="default">Ordina: In evidenza</option>
          <option value="price-asc">Prezzo: dal più basso</option>
          <option value="price-desc">Prezzo: dal più alto</option>
          <option value="year-desc">Anno: più recenti</option>
          <option value="km-asc">Km: dal più basso</option>
          <option value="title-asc">Nome: A → Z</option>
        </select>
      </div>
      <div class="filters-bar">
        <div id="resultsCount" class="meta"></div>
        <div class="filters-actions">
          <button type="button" id="favFilterBtn" class="secondary small-btn">♥ Solo preferiti</button>
          <button type="button" id="resetFiltersBtn" class="secondary small-btn">Azzera filtri</button>
        </div>
      </div>
    </div>

    <div id="results" class="grid"></div>
  `;

  let onlyFavorites = false;
  bindCatalogEvents(() => onlyFavorites, (val) => { onlyFavorites = val; });
}

function bindCatalogEvents(getOnlyFavs, setOnlyFavs) {
  const updateStats = () => {
    const currentListings = loadListings();
    const favs = loadFavorites();
    const avgPrice = currentListings.length
      ? Math.round(currentListings.reduce((acc, c) => acc + (Number(c.price) || 0), 0) / currentListings.length)
      : 0;
    const statsBox = document.getElementById("heroStats");
    if (statsBox) {
      statsBox.innerHTML = `
        <div class="stat-chip"><strong>${currentListings.length}</strong><span>Auto in vetrina</span></div>
        <div class="stat-chip"><strong>${avgPrice ? euro(avgPrice) : "—"}</strong><span>Prezzo medio</span></div>
        <div class="stat-chip"><strong>${favs.length}</strong><span>Preferiti ♥</span></div>
      `;
    }
  };

  const resetFilters = () => {
    ["q", "brand", "fuel", "transmission", "maxPrice", "maxKm", "year"].forEach((id) => {
      document.getElementById(id).value = "";
    });
    document.getElementById("sortBy").value = "default";
    setOnlyFavs(false);
    document.getElementById("favFilterBtn").classList.remove("active");
    draw();
  };

  const draw = () => {
    const currentListings = loadListings();
    const favs = loadFavorites();
    updateStats();

    const q = document.getElementById("q").value.trim().toLowerCase();
    const brand = document.getElementById("brand").value;
    const fuel = document.getElementById("fuel").value;
    const transmission = document.getElementById("transmission").value;
    const maxPrice = Number(document.getElementById("maxPrice").value) || Infinity;
    const maxKm = Number(document.getElementById("maxKm").value) || Infinity;
    const year = Number(document.getElementById("year").value) || 0;
    const sortBy = document.getElementById("sortBy").value;
    const onlyFavorites = getOnlyFavs();

    const filtered = currentListings.filter((car) => {
      const blob = `${car.title} ${car.brand} ${car.model} ${car.city} ${car.description}`.toLowerCase();
      return (
        blob.includes(q) &&
        (!brand || car.brand === brand) &&
        (!fuel || car.fuel === fuel) &&
        (!transmission || car.transmission === transmission) &&
        car.price <= maxPrice &&
        car.km <= maxKm &&
        car.year >= year &&
        (!onlyFavorites || favs.includes(car.id))
      );
    });

    filtered.sort((a, b) => {
      if (sortBy === "price-asc") return a.price - b.price;
      if (sortBy === "price-desc") return b.price - a.price;
      if (sortBy === "year-desc") return b.year - a.year;
      if (sortBy === "km-asc") return a.km - b.km;
      if (sortBy === "title-asc") return a.title.localeCompare(b.title, "it");
      return 0;
    });

    const countEl = document.getElementById("resultsCount");
    if (countEl) {
      countEl.textContent = `${filtered.length} di ${currentListings.length} annunci visualizzati`;
    }

    const box = document.getElementById("results");
    if (!filtered.length) {
      box.innerHTML = `
        <div class="empty">
          <p>Nessun annuncio trovato con questi filtri.</p>
          <button type="button" id="emptyResetBtn" class="secondary small-btn">Mostra tutte le auto</button>
        </div>`;
      const emptyBtn = document.getElementById("emptyResetBtn");
      if (emptyBtn) emptyBtn.addEventListener("click", resetFilters);
      return;
    }

    box.innerHTML = filtered.map((car) => renderCardHtml(car, favs)).join("");
    attachImageFallbacks(box);

    box.querySelectorAll(".fav-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        toggleFavorite(btn.dataset.favId);
        draw();
      });
    });

    box.querySelectorAll(".card").forEach((el) => {
      el.addEventListener("click", () => {
        location.hash = `#/auto/${encodeURIComponent(el.dataset.id)}`;
      });
    });
  };

  document.getElementById("favFilterBtn").addEventListener("click", (e) => {
    const next = !getOnlyFavs();
    setOnlyFavs(next);
    e.currentTarget.classList.toggle("active", next);
    draw();
  });

  document.getElementById("resetFiltersBtn").addEventListener("click", resetFilters);

  $app.querySelectorAll(".filters input, .filters select").forEach((el) => {
    el.addEventListener("input", draw);
    el.addEventListener("change", draw);
  });

  draw();
}

function renderDetail(id) {
  const listings = loadListings();
  const car = listings.find((item) => item.id === id);
  if (!car) {
    $app.innerHTML = `<div class="empty">Annuncio non trovato. <a href="#/" class="link-accent">Torna alla vetrina</a></div>`;
    return;
  }
  const cfg = loadConfig();
  const favs = loadFavorites();
  const similar = listings
    .filter((item) => item.id !== car.id && (item.brand === car.brand || item.fuel === car.fuel))
    .slice(0, 3);
  $app.innerHTML = `
    ${detailTopbarHtml(car, favs)}
    <div id="detailFlash"></div>
    <section class="detail">
      <div class="detail-left">
        ${detailMediaHtml(car)}
      </div>
      <aside class="detail-right">
        ${detailAsideHtml(car, cfg)}
      </aside>
    </section>
    ${
      similar.length
        ? `<section class="similar-section"><h2>Annunci simili</h2><div class="grid">${similar.map((sim) => renderCardHtml(sim, favs)).join("")}</div></section>`
        : ""
    }
  `;
  bindDetailEvents(car, cfg);
}

function detailTopbarHtml(car, favs) {
  const isFav = favs.includes(car.id);
  return `
    <div class="detail-topbar">
      <a href="#/" class="back-link">← Torna a tutti gli annunci</a>
      <div class="detail-top-actions">
        <button type="button" id="detailFavBtn" class="secondary small-btn ${isFav ? "active" : ""}">${isFav ? "♥ Salvato" : "♡ Salva"}</button>
        <button type="button" id="shareBtn" class="secondary small-btn">🔗 Condividi</button>
        <button type="button" id="editCarBtn" class="secondary small-btn">✏️ Modifica</button>
        <button type="button" id="deleteCarBtn" class="danger-btn small-btn">🗑️ Elimina</button>
      </div>
    </div>`;
}

function detailMediaHtml(car) {
  const gallery = Array.isArray(car.images) && car.images.length ? car.images : [car.image];
  return `
    <div class="gallery-main">
      <img id="mainGalleryImg" src="${escapeHtml(gallery[0])}" alt="${escapeHtml(car.title)}" />
    </div>
    ${
      gallery.length > 1
        ? `<div class="gallery-thumbs">${gallery
            .map(
              (url, idx) =>
                `<img src="${escapeHtml(url)}" alt="Foto ${idx + 1}" class="thumb ${idx === 0 ? "active" : ""}" data-src="${escapeHtml(url)}" />`
            )
            .join("")}</div>`
        : ""
    }
    <div class="panel detail-section">
      <h2>Caratteristiche tecniche</h2>
      <div class="specs-grid">
        <div class="spec-item"><span class="meta">Marca</span><strong>${escapeHtml(car.brand || "—")}</strong></div>
        <div class="spec-item"><span class="meta">Modello</span><strong>${escapeHtml(car.model || "—")}</strong></div>
        <div class="spec-item"><span class="meta">Anno</span><strong>${escapeHtml(car.year)}</strong></div>
        <div class="spec-item"><span class="meta">Chilometraggio</span><strong>${Number(car.km).toLocaleString("it-IT")} km</strong></div>
        <div class="spec-item"><span class="meta">Alimentazione</span><strong>${escapeHtml(car.fuel)}</strong></div>
        <div class="spec-item"><span class="meta">Cambio</span><strong>${escapeHtml(car.transmission || "Manuale")}</strong></div>
        <div class="spec-item"><span class="meta">Località</span><strong>📍 ${escapeHtml(car.city || "Italia")}</strong></div>
        <div class="spec-item"><span class="meta">Codice annuncio</span><strong>#${escapeHtml(car.id)}</strong></div>
      </div>
    </div>
    <div class="panel detail-section">
      <h2>Descrizione del veicolo</h2>
      <p class="car-description">${escapeHtml(car.description || "Nessuna descrizione aggiuntiva specificata per questo veicolo.")}</p>
    </div>`;
}

function detailAsideHtml(car, cfg) {
  const waClean = String(cfg.whatsapp || "").replace(/\D+/g, "");
  const waText = encodeURIComponent(
    `Ciao! Sono interessato all'annuncio "${car.title}" (${euro(car.price)}, rif. ${car.id}). È ancora disponibile?`
  );
  const waHref = waClean ? `https://wa.me/${waClean}?text=${waText}` : `https://wa.me/?text=${waText}`;
  const mailSubject = encodeURIComponent(`Richiesta info: ${car.title} (Rif. ${car.id})`);
  const mailBody = encodeURIComponent(
    `Buongiorno,\n\nvorrei ricevere maggiori informazioni sull'auto:\n- Modello: ${car.title}\n- Prezzo: ${euro(car.price)}\n- Anno: ${car.year} | Km: ${Number(car.km).toLocaleString("it-IT")}\n\nGrazie.`
  );
  const mailHref = `mailto:${encodeURIComponent(cfg.email || "")}?subject=${mailSubject}&body=${mailBody}`;
  const telHref = `tel:${String(cfg.phone || "").replace(/\s+/g, "")}`;
  return `
    <div class="panel sticky-panel">
      <span class="badge">${escapeHtml(car.source || "Inventario")}</span>
      <h1 class="detail-title">${escapeHtml(car.title)}</h1>
      <div class="price detail-price">${euro(car.price)}</div>
      <p class="meta">${escapeHtml(car.brand)} ${escapeHtml(car.model)} · ${escapeHtml(car.year)} · ${Number(car.km).toLocaleString("it-IT")} km</p>
      <div class="contact-cta">
        <a class="btn whatsapp-btn" href="${waHref}" target="_blank" rel="noopener">💬 Scrivici su WhatsApp</a>
        <div class="contact-row">
          <a class="btn secondary-btn" href="${telHref}">📞 Chiama ora</a>
          <a class="btn secondary-btn" href="${mailHref}">✉️ Invia Email</a>
        </div>
      </div>
      <hr class="divider" />
      <h3>Richiedi informazioni o Test Drive</h3>
      <form id="leadForm" class="stack-form">
        <input type="text" id="leadName" required placeholder="Il tuo nome e cognome *" />
        <input type="tel" id="leadPhone" required placeholder="Telefono / cellulare *" />
        <input type="email" id="leadEmail" placeholder="La tua email (opzionale)" />
        <textarea id="leadMsg" rows="3" required>Salve, sono interessato a ${escapeHtml(car.title)} (${euro(car.price)}). Vorrei sapere se è disponibile per una visione.</textarea>
        <button type="submit">Invia richiesta</button>
      </form>
      <div id="leadResult"></div>
      <div class="dealer-box meta">
        <strong>${escapeHtml(cfg.dealerName || "Car Wars")}</strong><br />
        📍 ${escapeHtml(cfg.address || "Italia")} · 📞 ${escapeHtml(cfg.phone || "")}
      </div>
    </div>`;
}

function bindDetailEvents(car, cfg) {
  attachImageFallbacks($app);

  $app.querySelectorAll(".thumb").forEach((thumb) => {
    thumb.addEventListener("click", () => {
      document.getElementById("mainGalleryImg").src = thumb.dataset.src;
      $app.querySelectorAll(".thumb").forEach((t) => t.classList.remove("active"));
      thumb.classList.add("active");
    });
  });

  document.getElementById("detailFavBtn").addEventListener("click", () => {
    const nowFav = toggleFavorite(car.id);
    const btn = document.getElementById("detailFavBtn");
    btn.classList.toggle("active", nowFav);
    btn.textContent = nowFav ? "♥ Salvato" : "♡ Salva";
  });

  document.getElementById("shareBtn").addEventListener("click", async () => {
    const shareUrl = window.location.href;
    const flash = document.getElementById("detailFlash");
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareUrl);
        flash.innerHTML = `<div class="notice ok">Link dell'annuncio copiato negli appunti!</div>`;
      } else {
        flash.innerHTML = `<div class="notice ok">Link annuncio: ${escapeHtml(shareUrl)}</div>`;
      }
    } catch {
      flash.innerHTML = `<div class="notice ok">Link annuncio: ${escapeHtml(shareUrl)}</div>`;
    }
  });

  document.getElementById("editCarBtn").addEventListener("click", () => {
    location.hash = `#/modifica/${encodeURIComponent(car.id)}`;
  });

  document.getElementById("deleteCarBtn").addEventListener("click", () => {
    if (confirm(`Vuoi davvero eliminare l'annuncio "${car.title}"?`)) {
      saveListings(loadListings().filter((item) => item.id !== car.id));
      location.hash = "#/";
    }
  });

  document.getElementById("leadForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const name = document.getElementById("leadName").value.trim();
    const phone = document.getElementById("leadPhone").value.trim();
    const email = document.getElementById("leadEmail").value.trim();
    const msg = document.getElementById("leadMsg").value.trim();
    const text = encodeURIComponent(
      `Richiesta per ${car.title} (${euro(car.price)} - ID ${car.id})\nNome: ${name}\nTel: ${phone}${email ? `\nEmail: ${email}` : ""}\nMessaggio: ${msg}`
    );
    const waClean = String(cfg.whatsapp || "").replace(/\D+/g, "");
    const leadWa = waClean ? `https://wa.me/${waClean}?text=${text}` : `https://wa.me/?text=${text}`;
    document.getElementById("leadResult").innerHTML = `
      <div class="notice ok" style="margin-top:12px;">
        Richiesta pronta per <strong>${escapeHtml(name)}</strong>!
        <div style="margin-top:8px; display:flex; gap:8px; flex-wrap:wrap;">
          <a class="btn small-btn" href="${leadWa}" target="_blank" rel="noopener">Invia su WhatsApp</a>
          <a class="btn secondary-btn small-btn" href="mailto:${encodeURIComponent(cfg.email || "")}?subject=${encodeURIComponent("Richiesta da " + name + " - " + car.title)}&body=${text}">Invia via Email</a>
        </div>
      </div>`;
  });

  $app.querySelectorAll(".similar-section .card").forEach((el) => {
    el.addEventListener("click", () => {
      location.hash = `#/auto/${encodeURIComponent(el.dataset.id)}`;
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  });
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  const src = String(text).replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n") {
      row.push(field);
      field = "";
      if (row.some((c) => c.trim() !== "")) rows.push(row);
      row = [];
    } else {
      field += ch;
    }
  }
  row.push(field);
  if (row.some((c) => c.trim() !== "")) rows.push(row);
  if (!rows.length) return [];
  const headers = rows.shift().map((h) => h.trim().toLowerCase());
  return rows.map((cols) => {
    const obj = {};
    headers.forEach((h, i) => {
      obj[h] = (cols[i] || "").trim();
    });
    return obj;
  });
}

function csvEscape(value) {
  const s = String(value ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function toCsv(listings) {
  const cols = [
    "id", "title", "brand", "model", "year", "price", "km",
    "fuel", "transmission", "city", "image", "source", "description"
  ];
  const lines = listings.map((car) => cols.map((c) => csvEscape(car[c])).join(","));
  return [cols.join(","), ...lines].join("\n");
}

function downloadFile(filename, content, mime) {
  const blob = new Blob([content], { type: mime || "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function toDataJs(listings) {
  return `window.CAR_WARS_SEED = ${JSON.stringify(listings, null, 2)};\n`;
}

function ingestListings(incoming, mode) {
  const normalized = (Array.isArray(incoming) ? incoming : []).map(normalizeCar);
  if (!normalized.length) return { count: 0, total: loadListings().length };
  const current = loadListings();
  let merged;
  if (mode === "replace") {
    merged = normalized;
  } else {
    const byId = new Map(current.map((c) => [c.id, c]));
    normalized.forEach((c) => byId.set(c.id, c));
    merged = [...byId.values()];
  }
  saveListings(merged);
  return { count: normalized.length, total: merged.length };
}

function renderImport() {
  const cfg = loadConfig();
  const count = loadListings().length;
  $app.innerHTML = `
    <section class="hero">
      <h1>Gestione &amp; Import annunci</h1>
      <p>Importa, esporta, modifica e configura la tua vetrina. I dati restano in questo browser (localStorage).</p>
    </section>
    <div id="flash"></div>

    <div class="admin-grid">
      <div class="panel">
        <h2>Importa annunci</h2>
        <p class="notice">Colonne CSV: id,title,brand,model,year,price,km,fuel,transmission,city,image,source,description</p>
        <input id="file" type="file" accept=".json,.csv,text/csv,application/json" />
        <textarea id="paste" rows="6" placeholder='Oppure incolla qui JSON o CSV...'></textarea>
        <label class="inline-field">
          <span class="meta">Modalità import:</span>
          <select id="importMode">
            <option value="merge">Unisci / aggiorna esistenti</option>
            <option value="replace">Sostituisci intero catalogo</option>
          </select>
        </label>
        <div class="actions">
          <button id="importBtn">Importa</button>
          <button id="resetBtn" class="secondary">Ripristina demo</button>
          <a class="btn secondary-btn" href="esempi/annunci.csv" download>Scarica CSV esempio</a>
        </div>
      </div>

      <div class="panel">
        <h2>Esporta &amp; pubblica</h2>
        <p class="meta">Scarica l'inventario aggiornato per pubblicarlo sul sito e renderlo visibile a tutti i visitatori.</p>
        <div class="actions">
          <button id="exportJsonBtn">⬇️ Scarica JSON</button>
          <button id="exportCsvBtn" class="secondary">⬇️ Scarica CSV</button>
          <button id="exportDataJsBtn" class="secondary">⬇️ Scarica data.js</button>
        </div>
        <p class="notice">Suggerimento: scarica <strong>data.js</strong> e sostituisci il file <code>js/data.js</code> del sito per rendere permanente il tuo catalogo.</p>
      </div>

      <div class="panel">
        <h2>Dati concessionaria</h2>
        <form id="configForm" class="stack-form">
          <input id="cfgDealerName" value="${escapeHtml(cfg.dealerName || "")}" placeholder="Nome concessionaria" />
          <input id="cfgSubtitle" value="${escapeHtml(cfg.subtitle || "")}" placeholder="Sottotitolo" />
          <input id="cfgPhone" value="${escapeHtml(cfg.phone || "")}" placeholder="Telefono" />
          <input id="cfgWhatsapp" value="${escapeHtml(cfg.whatsapp || "")}" placeholder="Numero WhatsApp (es. 39333...)" />
          <input id="cfgEmail" value="${escapeHtml(cfg.email || "")}" placeholder="Email" />
          <input id="cfgAddress" value="${escapeHtml(cfg.address || "")}" placeholder="Indirizzo / città" />
          <button type="submit">Salva dati contatto</button>
        </form>
      </div>
    </div>

    <div class="panel">
      <div class="admin-table-head">
        <h2>Inventario (${count})</h2>
        <a class="btn" href="#/nuovo">+ Aggiungi annuncio</a>
      </div>
      <div id="inventoryTable"></div>
    </div>
  `;

  bindImportEvents();
}

function bindImportEvents() {
  const flash = (msg, kind) => {
    const el = document.getElementById("flash");
    if (el) el.innerHTML = `<div class="notice ${kind}">${msg}</div>`;
  };

  document.getElementById("importBtn").addEventListener("click", async () => {
    const file = document.getElementById("file").files[0];
    const paste = document.getElementById("paste").value.trim();
    const mode = document.getElementById("importMode").value;
    try {
      let payload = [];
      if (file) {
        const text = await file.text();
        payload = file.name.endsWith(".csv") ? parseCsv(text) : JSON.parse(text);
      } else if (paste) {
        const looksCsv = paste.split("\n")[0].includes(",") && !paste.trim().startsWith("[");
        payload = looksCsv ? parseCsv(paste) : JSON.parse(paste);
      }
      if (!Array.isArray(payload) && payload.listings) payload = payload.listings;
      const result = ingestListings(payload, mode);
      if (!result.count) {
        flash("Nessun annuncio valido trovato.", "err");
        return;
      }
      flash(`Importati ${result.count} annunci. Totale in vetrina: ${result.total}.`, "ok");
      renderImport();
    } catch (error) {
      flash(`Import fallito: ${error.message}`, "err");
    }
  });

  document.getElementById("resetBtn").addEventListener("click", () => {
    localStorage.removeItem(STORAGE_KEY);
    flash("Demo ripristinata.", "ok");
    renderImport();
  });

  document.getElementById("exportJsonBtn").addEventListener("click", () => {
    downloadFile("annunci.json", JSON.stringify(loadListings(), null, 2), "application/json");
  });
  document.getElementById("exportCsvBtn").addEventListener("click", () => {
    downloadFile("annunci.csv", toCsv(loadListings()), "text/csv;charset=utf-8");
  });
  document.getElementById("exportDataJsBtn").addEventListener("click", () => {
    downloadFile("data.js", toDataJs(loadListings()), "text/javascript;charset=utf-8");
  });

  document.getElementById("configForm").addEventListener("submit", (e) => {
    e.preventDefault();
    saveConfig({
      dealerName: document.getElementById("cfgDealerName").value.trim(),
      subtitle: document.getElementById("cfgSubtitle").value.trim(),
      phone: document.getElementById("cfgPhone").value.trim(),
      whatsapp: document.getElementById("cfgWhatsapp").value.trim(),
      email: document.getElementById("cfgEmail").value.trim(),
      address: document.getElementById("cfgAddress").value.trim()
    });
    flash("Dati concessionaria salvati.", "ok");
  });

  renderInventoryTable();
}

function renderInventoryTable() {
  const box = document.getElementById("inventoryTable");
  if (!box) return;
  const listings = loadListings();
  if (!listings.length) {
    box.innerHTML = `<div class="empty">Nessun annuncio in inventario. <a href="#/nuovo" class="link-accent">Aggiungi il primo</a></div>`;
    return;
  }
  box.innerHTML = `
    <div class="table-wrap">
      <table class="admin-table">
        <thead>
          <tr><th>Foto</th><th>Titolo</th><th>Anno</th><th>Prezzo</th><th>Km</th><th>Azioni</th></tr>
        </thead>
        <tbody>
          ${listings
            .map(
              (car) => `
            <tr>
              <td><img class="mini-thumb" src="${escapeHtml(car.image)}" alt="" /></td>
              <td><strong>${escapeHtml(car.title)}</strong><br /><span class="meta">${escapeHtml(car.fuel)} · ${escapeHtml(car.city)}</span></td>
              <td>${escapeHtml(car.year)}</td>
              <td>${euro(car.price)}</td>
              <td>${Number(car.km).toLocaleString("it-IT")}</td>
              <td class="row-actions">
                <a class="btn small-btn" href="#/auto/${encodeURIComponent(car.id)}">Vedi</a>
                <a class="btn secondary-btn small-btn" href="#/modifica/${encodeURIComponent(car.id)}">Modifica</a>
                <button type="button" class="danger-btn small-btn" data-del="${escapeHtml(car.id)}">Elimina</button>
              </td>
            </tr>`
            )
            .join("")}
        </tbody>
      </table>
    </div>`;

  attachImageFallbacks(box);
  box.querySelectorAll("[data-del]").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (confirm("Eliminare questo annuncio?")) {
        saveListings(loadListings().filter((item) => item.id !== btn.dataset.del));
        renderImport();
      }
    });
  });
}

function renderForm(id) {
  const listings = loadListings();
  const editing = id ? listings.find((item) => item.id === id) : null;
  if (id && !editing) {
    $app.innerHTML = `<div class="empty">Annuncio non trovato. <a href="#/" class="link-accent">Torna alla vetrina</a></div>`;
    return;
  }
  const car = editing || {
    id: "",
    title: "",
    brand: "",
    model: "",
    year: new Date().getFullYear(),
    price: "",
    km: "",
    fuel: "Benzina",
    transmission: "Manuale",
    city: "",
    image: "",
    images: [],
    source: "Inventario",
    description: ""
  };
  const galleryText = (Array.isArray(car.images) ? car.images : []).join("\n");

  $app.innerHTML = `
    <div class="detail-topbar">
      <a href="#/importa" class="back-link">← Torna alla gestione</a>
    </div>
    <section class="hero">
      <h1>${editing ? "Modifica annuncio" : "Nuovo annuncio"}</h1>
      <p>${editing ? "Aggiorna i dati del veicolo e salva le modifiche." : "Compila i campi per pubblicare un nuovo veicolo in vetrina."}</p>
    </section>
    <div id="formFlash"></div>
    <div class="panel">
      <form id="carForm" class="form-grid">
        <label>ID annuncio <input id="fId" value="${escapeHtml(car.id)}" placeholder="auto-generato se vuoto" /></label>
        <label>Titolo * <input id="fTitle" value="${escapeHtml(car.title)}" required /></label>
        <label>Marca * <input id="fBrand" value="${escapeHtml(car.brand)}" required /></label>
        <label>Modello <input id="fModel" value="${escapeHtml(car.model)}" /></label>
        <label>Anno <input id="fYear" type="number" value="${escapeHtml(car.year)}" /></label>
        <label>Prezzo € * <input id="fPrice" type="number" value="${escapeHtml(car.price)}" required /></label>
        <label>Km <input id="fKm" type="number" value="${escapeHtml(car.km)}" /></label>
        <label>Carburante
          <select id="fFuel">
            ${["Benzina", "Diesel", "Ibrida", "Elettrica", "GPL", "Metano"].map((f) => `<option ${car.fuel === f ? "selected" : ""}>${f}</option>`).join("")}
          </select>
        </label>
        <label>Cambio
          <select id="fTransmission">
            ${["Manuale", "Automatico"].map((t) => `<option ${car.transmission === t ? "selected" : ""}>${t}</option>`).join("")}
          </select>
        </label>
        <label>Città <input id="fCity" value="${escapeHtml(car.city)}" /></label>
        <label>Immagine principale (URL) <input id="fImage" value="${escapeHtml(car.image)}" /></label>
        <label>Fonte <input id="fSource" value="${escapeHtml(car.source)}" /></label>
        <label class="full">Galleria (un URL per riga)
          <textarea id="fImages" rows="3" placeholder="https://...">${escapeHtml(galleryText)}</textarea>
        </label>
        <label class="full">Descrizione
          <textarea id="fDescription" rows="5">${escapeHtml(car.description)}</textarea>
        </label>
        <div class="full actions">
          <button type="submit">${editing ? "Salva modifiche" : "Pubblica annuncio"}</button>
          <a class="btn secondary-btn" href="#/importa">Annulla</a>
        </div>
      </form>
    </div>
  `;

  document.getElementById("carForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const gallery = document
      .getElementById("fImages")
      .value.split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    const payload = normalizeCar({
      id: document.getElementById("fId").value.trim() || car.id || `cw-${Date.now()}`,
      title: document.getElementById("fTitle").value.trim(),
      brand: document.getElementById("fBrand").value.trim(),
      model: document.getElementById("fModel").value.trim(),
      year: Number(document.getElementById("fYear").value) || new Date().getFullYear(),
      price: Number(document.getElementById("fPrice").value) || 0,
      km: Number(document.getElementById("fKm").value) || 0,
      fuel: document.getElementById("fFuel").value,
      transmission: document.getElementById("fTransmission").value,
      city: document.getElementById("fCity").value.trim(),
      image: document.getElementById("fImage").value.trim() || gallery[0] || "",
      images: gallery,
      source: document.getElementById("fSource").value.trim(),
      description: document.getElementById("fDescription").value.trim()
    });
    const current = loadListings();
    const idx = current.findIndex((item) => item.id === payload.id);
    if (idx >= 0) current[idx] = payload;
    else current.push(payload);
    saveListings(current);
    location.hash = `#/auto/${encodeURIComponent(payload.id)}`;
  });
}

window.addEventListener("hashchange", route);
route();
