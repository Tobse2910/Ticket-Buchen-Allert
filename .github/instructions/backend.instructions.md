---
applyTo: "backend/**/*.{js,cjs,mjs,json}"
description: "Use when editing the Express backend, monitor persistence, Playwright checks, Telegram alerts, webhooks or health endpoints in backend/."
---

# Backend Instructions

- Erhalte das einfache Express-Setup in `backend/index.js`, außer eine strukturelle Aufteilung ist ausdrücklich Teil der Aufgabe.
- Achte auf defensive Fehlerbehandlung rund um `axios`, `playwright`, Dateizugriffe und Telegram-Aufrufe.
- Verändere Monitoring- oder Alert-Logik nur bewusst, weil kleine Änderungen direkt das Laufzeitverhalten und Benachrichtigungen beeinflussen.
- Halte Statuswerte und Monitor-Felder kompatibel mit dem Frontend, insbesondere `status`, `interval`, `checks`, `triggers`, `mode`, `city` und `searchQuery`.
- Berücksichtige, dass Monitore persistent in `backend/data/monitors.json` gespeichert werden und nicht serialisierbare Laufzeitfelder entfernt werden müssen.
- Bevorzuge klare Logs für operative Ereignisse wie Queue, Fehler, Trigger und externe Integrationen.
- Führe keine unnötigen Abhängigkeiten ein, wenn Node-Standardbibliothek oder bestehende Pakete ausreichen.
- Wenn du API-Antworten änderst, prüfe die Auswirkungen auf das Frontend mit.