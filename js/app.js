const STORAGE_KEY = "car-wars-listings";

const $app = document.getElementById("app");

function loadListings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignore broken storage */
  }
  return structuredClone(window.CAR_WARS_SEED);
}

function saveListings(listings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(listings));
}

function euro(value) {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0
  }).format(value);
}

function route() {
  const hash = location.hash || "#/";
  const [, path, id] = hash.split("/");
  if (path === "auto" && id) return renderDetail(id);
  if (path === "importa") return renderImport();
  return renderCatalog();
}

function renderCatalog() {
  const listings = loadListings();
  $app.innerHTML = `
    <section class="hero">
      <h1>La tua vetrina auto.</h1>
      <p>Importa gli annunci di cui hai i diritti e pubblicarli qui, con filtri e schede pronte per i visitatori.</p>
    </section>
    <div class="filters">
      <input id="q" placeholder="Cerca marca, modello, città..." />
      <select id="fuel">
        <option value="">Carburante</option>
        <option>Benzina</option>
        <option>Diesel</option>
        <option>Ibrida</option>
        <option>Elettrica</option>
      </select>
      <select id="maxPrice">
        <option value="">Prezzo max</option>
        <option value="15000">15.000 €</option>
        <option value="20000">20.000 €</option>
        <option value="25000">25.000 €</option>
        <option value="40000">40.000 €</option>
      </select>
      <select id="maxKm">
        <option value="">Km max</option>
        <option value="30000">30.000</option>
        <option value="60000">60.000</option>
        <option value="100000">100.000</option>
      </select>
      <select id="year">
        <option value="">Anno da</option>
        <option>2018</option>
        <option>2020</option>
        <option>2022</option>
      </select>
    </div>
    <div id="results" class="grid"></div>
  `;

  const draw = () => {
    const q = document.getElementById("q").value.toLowerCase();
    const fuel = document.getElementById("fuel").value;
    const maxPrice = Number(document.getElementById("maxPrice").value) || Infinity;
    const maxKm = Number(document.getElementById("maxKm").value) || Infinity;
    const year = Number(document.getElementById("year").value) || 0;
    const filtered = listings.filter((car) => {
      const blob = `${car.title} ${car.brand} ${car.model} ${car.city}`.toLowerCase();
      return (
        blob.includes(q) &&
        (!fuel || car.fuel === fuel) &&
        car.price <= maxPrice &&
        car.km <= maxKm &&
        car.year >= year
      );
    });
    const box = document.getElementById("results");
    if (!filtered.length) {
      box.innerHTML = `<div class="empty">Nessun annuncio con questi filtri.</div>`;
      return;
    }
    box.innerHTML = filtered
      .map(
        (car) => `
      <article class="card" data-id="${car.id}">
        <img src="${car.image}" alt="${car.title}" />
        <div class="card-body">
          <div class="price">${euro(car.price)}</div>
          <h3>${car.title}</h3>
          <div class="meta">${car.year} · ${car.km.toLocaleString("it-IT")} km · ${car.fuel} · ${car.city}</div>
          <span class="badge">${car.source || "Importato"}</span>
        </div>
      </article>`
      )
      .join("");
    box.querySelectorAll(".card").forEach((el) => {
      el.addEventListener("click", () => {
        location.hash = `#/auto/${el.dataset.id}`;
      });
    });
  };

  $app.querySelectorAll("input, select").forEach((el) => el.addEventListener("input", draw));
  draw();
}

function renderDetail(id) {
  const car = loadListings().find((item) => item.id === id);
  if (!car) {
    $app.innerHTML = `<div class="empty">Annuncio non trovato. <a href="#/">Torna alla vetrina</a></div>`;
    return;
  }
  $app.innerHTML = `
    <p class="meta"><a href="#/">← Tutti gli annunci</a></p>
    <section class="detail">
      <img src="${car.image}" alt="${car.title}" />
      <div class="panel">
        <div class="price">${euro(car.price)}</div>
        <h1>${car.title}</h1>
        <p class="meta">${car.brand} ${car.model} · ${car.year} · ${car.km.toLocaleString("it-IT")} km</p>
        <p>${car.description || ""}</p>
        <p class="meta">${car.fuel} · ${car.transmission} · ${car.city}</p>
        <span class="badge">${car.source || "Importato"}</span>
      </div>
    </section>
  `;
}

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/);
  const headers = lines.shift().split(",").map((h) => h.trim());
  return lines.map((line, index) => {
    const cols = line.split(",").map((c) => c.trim());
    const row = Object.fromEntries(headers.map((h, i) => [h, cols[i]]));
    return {
      id: row.id || `imp-${Date.now()}-${index}`,
      title: row.title || `${row.brand} ${row.model}`,
      brand: row.brand || "",
      model: row.model || "",
      year: Number(row.year) || 0,
      price: Number(row.price) || 0,
      km: Number(row.km) || 0,
      fuel: row.fuel || "",
      transmission: row.transmission || "",
      city: row.city || "",
      image: row.image || "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1200&q=80",
      source: row.source || "Import CSV",
      description: row.description || ""
    };
  });
}

function renderImport() {
  $app.innerHTML = `
    <section class="hero">
      <h1>Importa annunci</h1>
      <p>Carica un JSON o un CSV con le auto che puoi pubblicare. I dati restano in questo browser (localStorage).</p>
    </section>
    <div id="flash"></div>
    <div class="panel">
      <p class="notice">
        Colonne CSV: id,title,brand,model,year,price,km,fuel,transmission,city,image,source,description
      </p>
      <input id="file" type="file" accept=".json,.csv,text/csv,application/json" />
      <textarea id="paste" rows="10" placeholder='Incolla JSON, es. [{"title":"Panda","brand":"Fiat","price":8900,"year":2018,"km":70000,"fuel":"Benzina","city":"Napoli"}]'></textarea>
      <div class="actions">
        <button id="importBtn">Importa</button>
        <button id="resetBtn" class="secondary">Ripristina demo</button>
        <a class="btn" href="esempi/annunci.csv" download>Scarica CSV esempio</a>
      </div>
    </div>
  `;

  const flash = (msg, kind) => {
    document.getElementById("flash").innerHTML = `<div class="notice ${kind}">${msg}</div>`;
  };

  const ingest = (incoming) => {
    if (!Array.isArray(incoming) || !incoming.length) {
      flash("Nessun annuncio valido trovato.", "err");
      return;
    }
    const current = loadListings();
    const merged = [...incoming, ...current].filter(
      (car, index, all) => all.findIndex((item) => item.id === car.id) === index
    );
    saveListings(merged);
    flash(`Importati ${incoming.length} annunci. Totale in vetrina: ${merged.length}.`, "ok");
  };

  document.getElementById("importBtn").addEventListener("click", async () => {
    const file = document.getElementById("file").files[0];
    const paste = document.getElementById("paste").value.trim();
    try {
      let payload = [];
      if (file) {
        const text = await file.text();
        payload = file.name.endsWith(".csv") ? parseCsv(text) : JSON.parse(text);
      } else if (paste) {
        payload = paste.includes("title,") || paste.startsWith("id,") ? parseCsv(paste) : JSON.parse(paste);
      }
      if (!Array.isArray(payload) && payload.listings) payload = payload.listings;
      ingest(payload);
    } catch (error) {
      flash(`Import fallito: ${error.message}`, "err");
    }
  });

  document.getElementById("resetBtn").addEventListener("click", () => {
    localStorage.removeItem(STORAGE_KEY);
    flash("Demo ripristinata.", "ok");
  });
}

window.addEventListener("hashchange", route);
route();
