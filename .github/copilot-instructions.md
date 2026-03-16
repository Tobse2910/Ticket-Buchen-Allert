# Copilot Instructions

Dieses Repository besteht aus einem React-Frontend in `frontend/` und einem Express-Backend in `backend/`.

## Arbeitsweise

- Arbeite minimal-invasiv und passe bestehenden Stil an, statt Dateien unnötig umzubauen.
- Erfinde keine generischen KI-Standard-Frontends oder vollständigen Redesigns; erweitere bestehende UI-Struktur gezielt.
- Bevorzuge root-cause fixes statt visueller oder temporärer Workarounds.
- Ändere keine Build-Artefakte in `frontend/build/`, außer der Task verlangt es explizit.
- Behalte deutsche Nutzertexte und Statusbezeichnungen konsistent bei.
- Erhalte bestehende API-Pfade und Payload-Strukturen, wenn nicht ausdrücklich eine API-Änderung gewünscht ist.

## Projektkontext

- Das Frontend ist ein Dashboard für Ticket-Monitoring, Alerts, Setup und Health.
- Das Backend verwaltet Monitore, Polling, Ticket-Prüfungen, Telegram-Alerts und optionale n8n-Webhooks.
- Monitore werden in `backend/data/monitors.json` persistiert.
- Viele UI-Texte sind deutsch, technische Bezeichner und Libraries sind englisch.

## Änderungsregeln

- Halte Frontend-Änderungen responsiv und mobil nutzbar.
- Verwende vorhandene Bibliotheken wie `axios`, `lucide-react` und bestehende Tailwind-Klassen, bevor neue Abhängigkeiten eingeführt werden.
- Achte bei Backend-Änderungen auf robuste Fehlerbehandlung, weil Netzwerkzugriffe, Browser-Automation und Telegram fehleranfällig sind.
- Relevante Doku kurz mitpflegen, wenn sich Bedienung, Konfiguration oder Setup ändern.

## Verifikation

- Prüfe nach Frontend-Änderungen nach Möglichkeit Build- oder TypeScript-Fehler.
- Prüfe nach Backend-Änderungen zumindest Syntax und naheliegende Laufzeitfehler im betroffenen Pfad.
- Wenn etwas nicht verifiziert werden kann, benenne die Lücke klar.