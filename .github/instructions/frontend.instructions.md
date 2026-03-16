---
applyTo: "frontend/src/**/*.{ts,tsx,js,jsx,css}"
description: "Use when editing the React frontend, dashboard panels, Tailwind styling, responsive UI, alerts, setup or health views in frontend/src."
---

# Frontend Instructions

- Behalte das bestehende Dashboard-Muster mit Panels, Karten, Toasts und dunkler Oberfläche konsistent bei.
- Nutze vorhandene Tailwind-Klassen und bestehende Farblogik für Status wie `AVAILABLE`, `WAITING`, `QUEUE`, `OFFLINE` und `ERROR`.
- Passe Texte, Labels und Hinweise im UI in sauberem Deutsch an, außer technische Begriffe sind im Projekt bewusst englisch.
- Vermeide generische Standard-Layouts; füge dich in die vorhandene visuelle Sprache mit klaren Karten, Borders und Statusfarben ein.
- Respektiere mobile Nutzung: Buttons müssen touch-tauglich bleiben, Inhalte auf kleinen Screens umbrechen und keine wichtigen Controls verdecken.
- Nutze bestehende Datenflüsse über `axios` und die API-Konstanten aus `frontend/src/api.ts`.
- Wenn du neue UI-Zustände einführst, denke an Loading, Error und Empty State.
- Wenn du neue Tabs, Panels oder Aktionen ergänzt, halte die Navigation in `App.tsx` synchron.
- Bearbeite generierte Dateien unter `frontend/build/` nicht als primäre Quelle.