# CLAUDE.md

## Ziel
Dieses Repository hat bereits ein bestehendes UI/UX-Muster. Änderungen müssen dieses Muster respektieren.

## Harte Regeln (immer)
1. Keine generischen Neu-Designs. Keine "from scratch"-Frontends.
2. Nur minimal-invasive Änderungen an bestehenden Dateien und Komponenten.
3. Bestehende Struktur und Patterns beibehalten (Panels, Karten, Statusfarben, deutsche UI-Texte).
4. Keine neuen Libraries für einfache UI-Aufgaben einführen.
5. `frontend/build/` nicht als primäre Quelle bearbeiten.
6. API-Pfade, Payload-Strukturen und Monitor-Felder kompatibel halten.

## Frontend-Regeln
- Vor jeder UI-Änderung zuerst vorhandene Komponenten lesen (`App.tsx`, `frontend/src/components/*`).
- Keine neuen Farbpaletten, Themes, Icons oder Design-Systeme erfinden.
- Vorhandene Tailwind-Klassen und Statuslogik wiederverwenden (`AVAILABLE`, `WAITING`, `QUEUE`, `OFFLINE`, `ERROR`).
- Mobile Nutzbarkeit erhalten (Buttons touch-tauglich, kein Layout-Bruch auf kleinen Screens).
- Deutsche Nutzertexte konsistent halten.

## Backend-Regeln
- Bestehendes Express-Setup respektieren (`backend/index.js`), außer explizit anders gewünscht.
- Defensive Fehlerbehandlung bei Netzwerk, Playwright, Dateizugriffen, Telegram/Webhooks.
- Persistenz in `backend/data/monitors.json` nicht brechen.

## Arbeitsweise
- Root-cause fix statt Workaround.
- Bei unklaren Anforderungen: kurze Rückfrage statt Annahmen.
- Nur das umsetzen, was angefragt ist (kein Scope-Creep).
- Nach Änderungen gezielt verifizieren (mind. betroffene Build-/Runtime-Pfade prüfen).

## Antwortstil
- Kurz, konkret, umsetzungsorientiert.
- Bei größeren Änderungen: kurz nennen, was geändert wurde, wo, und wie geprüft wurde.
