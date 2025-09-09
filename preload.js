const { contextBridge } = require("electron");

// A tiny safe wrapper to fetch JSON from the Dungeoneer HTTP API.

(() => {
  const configured = process.env.DUNGEONEER_API_BASE;
  let origin = "";
  if (configured) {
    try {
      origin = new URL(configured).origin;
    } catch (err) {
      // ignore invalid values — we'll simply not inject the origin
      origin = "";
    }
  }

  const injectCSP = (orig) => {
    const head = document.head || document.getElementsByTagName("head")[0];
    if (!head) return;
    const meta = document.createElement("meta");
    meta.httpEquiv = "Content-Security-Policy";
    // Keep a safe default and explicitly allow connections (connect-src)
    // to the configured origin.
    const defaultPart = "default-src 'self' 'unsafe-inline'";
    const connectPart = orig
      ? `connect-src 'self' ${orig}`
      : "connect-src 'self'";
    meta.content = `${defaultPart}; ${connectPart};`;
    head.appendChild(meta);
    // Debug output visible in the renderer console to help troubleshoot CSP issues
    try {
      console.debug("Injected CSP meta:", meta.content);
      console.debug("Configured DUNGEONEER_API_BASE (raw):", configured);
      console.debug("Normalized origin injected:", orig);
    } catch (e) {
      // ignore if console is unavailable
    }
  };

  if (document.readyState === "loading") {
    // DOM not ready; insert once parsing reaches head
    document.addEventListener("DOMContentLoaded", () => injectCSP(origin));
  } else {
    // Head is already present
    injectCSP(origin);
  }
})();

contextBridge.exposeInMainWorld("api", {
  fetchJSON: async (path) => {
    const base = process.env.DUNGEONEER_API_BASE;
    if (!base) {
      throw new Error(
        "DUNGEONEER_API_BASE is not set. Set it in your environment before launching the app."
      );
    }
    const url = `${base}${path}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return res.json();
  },
});
