#!/usr/bin/env node
"use strict";

/**
 * Car Wars — server statico + API di persistenza condivisa (zero dipendenze).
 *
 * Avvio:
 *   node server.js
 *   PORT=8080 CAR_WARS_TOKEN=lasciami node server.js
 *
 * Endpoint API:
 *   GET  /api/health          -> stato del servizio
 *   GET  /api/listings        -> elenco annunci
 *   PUT  /api/listings        -> sostituisce l'elenco (richiede token se configurato)
 *   POST /api/listings        -> inserisce/aggiorna un annuncio (richiede token)
 *   DELETE /api/listings/:id  -> elimina un annuncio (richiede token)
 *   GET  /api/config          -> dati concessionaria
 *   PUT  /api/config          -> salva dati concessionaria (richiede token)
 *
 * I dati sono salvati in ./data/annunci.json e ./data/config.json
 */

const http = require("http");
const fs = require("fs");
const fsp = require("fs/promises");
const path = require("path");
const vm = require("vm");
const crypto = require("crypto");

const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, "data");
const LISTINGS_FILE = path.join(DATA_DIR, "annunci.json");
const CONFIG_FILE = path.join(DATA_DIR, "config.json");
const PORT = Number(process.env.PORT || 8080);
const HOST = process.env.HOST || "0.0.0.0";
const ADMIN_TOKEN = process.env.CAR_WARS_TOKEN || "";
const MAX_BODY = 8 * 1024 * 1024;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".csv": "text/csv; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
  ".woff2": "font/woff2"
};

/* ----------------------------- utilità ----------------------------- */

function readSeed() {
  try {
    const src = fs.readFileSync(path.join(ROOT, "js", "data.js"), "utf8");
    const sandbox = { window: {} };
    vm.createContext(sandbox);
    vm.runInContext(src, sandbox);
    return {
      listings: Array.isArray(sandbox.window.CAR_WARS_SEED) ? sandbox.window.CAR_WARS_SEED : [],
      config: sandbox.window.CAR_WARS_CONFIG || {}
    };
  } catch (error) {
    console.warn("[car-wars] Impossibile leggere js/data.js:", error.message);
    return { listings: [], config: {} };
  }
}

let writeQueue = Promise.resolve();
function enqueue(task) {
  const result = writeQueue.then(task, task);
  writeQueue = result.catch(() => {});
  return result;
}

async function readJson(file, fallback) {
  try {
    const raw = await fsp.readFile(file, "utf8");
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

async function writeJsonAtomic(file, data) {
  await fsp.mkdir(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  await fsp.writeFile(tmp, JSON.stringify(data, null, 2), "utf8");
  await fsp.rename(tmp, file);
}

async function ensureData() {
  await fsp.mkdir(DATA_DIR, { recursive: true });
  const seed = readSeed();
  try {
    await fsp.access(LISTINGS_FILE);
  } catch {
    await writeJsonAtomic(LISTINGS_FILE, seed.listings);
    console.log(`[car-wars] Creato ${path.relative(ROOT, LISTINGS_FILE)} dal seed (${seed.listings.length} annunci).`);
  }
  try {
    await fsp.access(CONFIG_FILE);
  } catch {
    await writeJsonAtomic(CONFIG_FILE, seed.config);
  }
}

function tokenOk(req) {
  if (!ADMIN_TOKEN) return true;
  const provided = req.headers["x-admin-token"] || "";
  const a = Buffer.from(String(provided));
  const b = Buffer.from(ADMIN_TOKEN);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
    "Cache-Control": "no-store"
  });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY) {
        reject(new Error("Payload troppo grande"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

/* ------------------------------ API ------------------------------ */

async function handleApi(req, res, url) {
  const route = url.pathname.replace(/^\/api/, "") || "/";

  if (route === "/health" && req.method === "GET") {
    const listings = await readJson(LISTINGS_FILE, []);
    return sendJson(res, 200, {
      ok: true,
      service: "car-wars",
      authRequired: Boolean(ADMIN_TOKEN),
      listings: Array.isArray(listings) ? listings.length : 0
    });
  }

  if (route === "/listings" && req.method === "GET") {
    const listings = await readJson(LISTINGS_FILE, []);
    return sendJson(res, 200, Array.isArray(listings) ? listings : []);
  }

  if (route === "/config" && req.method === "GET") {
    const config = await readJson(CONFIG_FILE, {});
    return sendJson(res, 200, config && typeof config === "object" ? config : {});
  }

  const isWrite = req.method === "PUT" || req.method === "POST" || req.method === "DELETE";
  if (isWrite && !tokenOk(req)) {
    return sendJson(res, 401, { ok: false, error: "Password amministratore mancante o errata." });
  }

  if (route === "/listings" && req.method === "PUT") {
    let payload;
    try {
      payload = JSON.parse(await readBody(req));
    } catch (error) {
      return sendJson(res, 400, { ok: false, error: "JSON non valido: " + error.message });
    }
    if (!Array.isArray(payload)) {
      return sendJson(res, 400, { ok: false, error: "Atteso un array di annunci." });
    }
    await enqueue(() => writeJsonAtomic(LISTINGS_FILE, payload));
    return sendJson(res, 200, { ok: true, count: payload.length });
  }

  if (route === "/listings" && req.method === "POST") {
    let car;
    try {
      car = JSON.parse(await readBody(req));
    } catch (error) {
      return sendJson(res, 400, { ok: false, error: "JSON non valido: " + error.message });
    }
    if (!car || typeof car !== "object" || !car.id) {
      return sendJson(res, 400, { ok: false, error: "Annuncio senza id." });
    }
    const total = await enqueue(async () => {
      const listings = await readJson(LISTINGS_FILE, []);
      const list = Array.isArray(listings) ? listings : [];
      const idx = list.findIndex((item) => item && item.id === car.id);
      if (idx >= 0) list[idx] = car;
      else list.push(car);
      await writeJsonAtomic(LISTINGS_FILE, list);
      return list.length;
    });
    return sendJson(res, 200, { ok: true, count: total });
  }

  if (route.startsWith("/listings/") && req.method === "DELETE") {
    const id = decodeURIComponent(route.slice("/listings/".length));
    const total = await enqueue(async () => {
      const listings = await readJson(LISTINGS_FILE, []);
      const list = (Array.isArray(listings) ? listings : []).filter((item) => !item || item.id !== id);
      await writeJsonAtomic(LISTINGS_FILE, list);
      return list.length;
    });
    return sendJson(res, 200, { ok: true, count: total });
  }

  if (route === "/config" && req.method === "PUT") {
    let payload;
    try {
      payload = JSON.parse(await readBody(req));
    } catch (error) {
      return sendJson(res, 400, { ok: false, error: "JSON non valido: " + error.message });
    }
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      return sendJson(res, 400, { ok: false, error: "Atteso un oggetto di configurazione." });
    }
    await enqueue(() => writeJsonAtomic(CONFIG_FILE, payload));
    return sendJson(res, 200, { ok: true });
  }

  return sendJson(res, 404, { ok: false, error: "Endpoint non trovato." });
}

/* --------------------------- file statici --------------------------- */

function safePath(urlPath) {
  let decoded;
  try {
    decoded = decodeURIComponent(urlPath);
  } catch {
    return null;
  }
  if (decoded.includes("\0")) return null;
  let rel = decoded.replace(/^\/+/, "");
  if (rel === "") rel = "index.html";
  const full = path.resolve(ROOT, rel);
  if (full !== ROOT && !full.startsWith(ROOT + path.sep)) return null;
  return full;
}

function isBlocked(urlPath) {
  if (/^\/(data|\.git|node_modules)(\/|$)/.test(urlPath)) return true;
  const base = path.basename(urlPath);
  if (urlPath !== "/" && base.startsWith(".")) return true;
  if (urlPath === "/server.js") return true;
  return false;
}

async function serveStatic(req, res, url) {
  if (isBlocked(url.pathname)) {
    res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Accesso negato");
    return;
  }
  const file = safePath(url.pathname);
  if (!file) {
    res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Richiesta non valida");
    return;
  }
  try {
    const stat = await fsp.stat(file);
    if (stat.isDirectory()) throw new Error("directory");
    const ext = path.extname(file).toLowerCase();
    res.writeHead(200, {
      "Content-Type": MIME[ext] || "application/octet-stream",
      "Content-Length": stat.size,
      "Cache-Control": ext === ".html" ? "no-cache" : "public, max-age=300"
    });
    if (req.method === "HEAD") {
      res.end();
      return;
    }
    fs.createReadStream(file).pipe(res);
  } catch {
    res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
    res.end(
      `<!DOCTYPE html><html lang="it"><head><meta charset="utf-8"><title>404</title></head>` +
        `<body style="font-family:system-ui,sans-serif;padding:40px">` +
        `<h1>404 — Pagina non trovata</h1><p><a href="/">Torna alla vetrina</a></p></body></html>`
    );
  }
}

/* ------------------------------ avvio ------------------------------ */

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  try {
    if (url.pathname === "/api" || url.pathname.startsWith("/api/")) {
      await handleApi(req, res, url);
      return;
    }
    if (req.method !== "GET" && req.method !== "HEAD") {
      res.writeHead(405, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Metodo non consentito");
      return;
    }
    await serveStatic(req, res, url);
  } catch (error) {
    console.error("[car-wars] Errore:", error);
    if (!res.headersSent) sendJson(res, 500, { ok: false, error: "Errore interno del server." });
  }
});

if (require.main === module) {
  ensureData()
    .then(() => {
      server.listen(PORT, HOST, () => {
        console.log(`Car Wars in ascolto su http://localhost:${PORT}`);
        console.log(`Dati: ${path.relative(ROOT, LISTINGS_FILE)}`);
        console.log(
          ADMIN_TOKEN
            ? "Scritture protette da password (CAR_WARS_TOKEN)."
            : "ATTENZIONE: scritture aperte (nessun CAR_WARS_TOKEN impostato)."
        );
      });
    })
    .catch((error) => {
      console.error("[car-wars] Avvio fallito:", error);
      process.exit(1);
    });
}

module.exports = { server, safePath, isBlocked, ensureData, handleApi, readSeed };
