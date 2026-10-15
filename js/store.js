/**
 * Car Wars — livello di persistenza condivisa.
 *
 * Rileva automaticamente se il backend (server.js) è attivo:
 *  - se sì, legge/scrive gli annunci e la configurazione sul server (visibili a tutti);
 *  - se no, usa localStorage (solo questo browser), così index.html funziona anche da solo.
 */
window.CarWarsStore = (function () {
  "use strict";

  const LISTINGS_KEY = "car-wars-listings";
  const CONFIG_KEY = "car-wars-config";
  const TOKEN_KEY = "car-wars-admin-token";
  const API_BASE = "api";

  const state = {
    online: false,
    mode: "local",
    listings: null,
    config: null,
    lastError: null,
    token: null
  };

  const listeners = [];

  function notify() {
    listeners.forEach((cb) => {
      try {
        cb(state);
      } catch {
        /* ignora errori dei listener */
      }
    });
  }

  function readLocal(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function writeLocal(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* ignora quota superata */
    }
  }

  function getToken() {
    if (state.token !== null) return state.token;
    try {
      state.token = localStorage.getItem(TOKEN_KEY) || "";
    } catch {
      state.token = "";
    }
    return state.token;
  }

  function setToken(token) {
    state.token = String(token || "");
    try {
      if (state.token) localStorage.setItem(TOKEN_KEY, state.token);
      else localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* ignora */
    }
    notify();
  }

  function apiFetch(pathname, options) {
    const opts = options || {};
    const headers = Object.assign({}, opts.headers || {});
    if (opts.body) headers["Content-Type"] = "application/json";
    const token = getToken();
    if (token) headers["x-admin-token"] = token;
    return fetch(API_BASE + pathname, Object.assign({}, opts, { headers }));
  }

  function handleWriteError(res) {
    if (res.status === 401) {
      return { type: "auth", message: "Serve la password amministratore per salvare sul server." };
    }
    if (!res.ok) {
      return { type: "server", message: `Salvataggio sul server fallito (${res.status}).` };
    }
    return null;
  }

  async function init() {
    const before = JSON.stringify(state.listings);
    state.listings = readLocal(LISTINGS_KEY);
    state.config = readLocal(CONFIG_KEY);
    try {
      const health = await apiFetch("/health");
      if (!health.ok) throw new Error("health " + health.status);
      const info = await health.json();
      state.online = true;
      state.mode = "server";
      const [listingsRes, configRes] = await Promise.all([apiFetch("/listings"), apiFetch("/config")]);
      if (listingsRes.ok) {
        const data = await listingsRes.json();
        if (Array.isArray(data)) state.listings = data;
      }
      if (configRes.ok) {
        const cfg = await configRes.json();
        if (cfg && typeof cfg === "object") state.config = cfg;
      }
      state.lastError = null;
      state.authRequired = Boolean(info && info.authRequired);
    } catch {
      state.online = false;
      state.mode = "local";
    }
    notify();
    return {
      online: state.online,
      mode: state.mode,
      listings: state.listings,
      config: state.config,
      changed: before !== JSON.stringify(state.listings)
    };
  }

  function getListings() {
    return state.listings;
  }

  function getConfig() {
    return state.config;
  }

  async function saveListings(listings) {
    state.listings = listings;
    writeLocal(LISTINGS_KEY, listings);
    notify();
    if (state.mode !== "server") return null;
    try {
      const res = await apiFetch("/listings", { method: "PUT", body: JSON.stringify(listings) });
      state.lastError = handleWriteError(res);
    } catch (error) {
      state.lastError = { type: "network", message: "Server non raggiungibile: " + error.message };
    }
    notify();
    return state.lastError;
  }

  async function saveConfig(config) {
    state.config = config;
    writeLocal(CONFIG_KEY, config);
    notify();
    if (state.mode === "server") {
      try {
        await apiFetch("/config", { method: "PUT", body: JSON.stringify(config) });
      } catch {
        /* ignora: la copia locale resta valida */
      }
    }
    return config;
  }

  function resetListings(seed) {
    return saveListings(Array.isArray(seed) ? seed : []);
  }

  return {
    init,
    getListings,
    getConfig,
    saveListings,
    saveConfig,
    resetListings,
    getToken,
    setToken,
    onChange(cb) {
      listeners.push(cb);
      return () => {
        const i = listeners.indexOf(cb);
        if (i >= 0) listeners.splice(i, 1);
      };
    },
    get state() {
      return state;
    }
  };
})();
