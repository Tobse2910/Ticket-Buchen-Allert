// Zentrale API-Konfiguration – liest zur Laufzeit aus config.js (window.API_URL)
// window.API_URL endet mit /api  →  z.B. "https://xyz.ngrok-free.dev/api"
// API_BASE endet OHNE /api       →  z.B. "https://xyz.ngrok-free.dev"

export const API_URL: string =
  (window as any).API_URL ||
  process.env.REACT_APP_API_URL ||
  "http://localhost:3001/api";

export const API_BASE: string = API_URL.replace(/\/api$/, "");
