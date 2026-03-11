# 🎟️ Ticket-Buchen-Alert

Ein selbst gehostetes Ticket-Monitoring-System mit Telegram-Benachrichtigungen.  
Überwacht **Ticketmaster** und benachrichtigt dich sofort, wenn Tickets verfügbar werden.

---

## ✨ Features

- **Event-Radar** – Überwacht Ticketmaster-Suchanfragen auf neue Events
- **Monitor-Modus** – Prüft einzelne Event-URLs auf Ticket-Verfügbarkeit
- **Telegram-Benachrichtigungen** – Sofortiger Alarm bei Änderungen
- **Ticketmaster API** – Schnelle Status-Checks (~300ms)
- **Cloudflare Tunnel** – Kein Port-Forwarding nötig, läuft hinter NAT/Firewall
- **Web-Dashboard** – React-Frontend mit Live-Logs, Health-Monitor, Einstellungen
- **Docker** – Läuft auf jedem System, keine Installation außer Docker nötig

---

## 📋 Voraussetzungen

- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- [PowerShell 7+](https://github.com/PowerShell/PowerShell/releases) (für Deploy-Skripte, nur Windows)
- Einen **Telegram-Bot** (kostenlos, 5 Minuten Setup)
- Einen **Ticketmaster Developer API-Key** (kostenlos)

---

## 🚀 Setup

### 1. Repository klonen

```bash
git clone https://github.com/Tobse2910/Ticket-Buchen-Allert.git
cd Ticket-Buchen-Allert
```

### 2. Telegram Bot erstellen

1. Öffne Telegram und schreibe [@BotFather](https://t.me/BotFather)
2. Sende `/newbot` und folge den Anweisungen
3. Kopiere den **Bot-Token** (Format: `1234567890:AAFxxx...`)
4. Starte deinen Bot – schreibe ihm einmal `/start`
5. Schreibe [@userinfobot](https://t.me/userinfobot) → er antwortet mit deiner **Chat-ID**

### 3. Ticketmaster API-Key holen

1. Gehe zu [developer.ticketmaster.com](https://developer.ticketmaster.com/)
2. Registriere dich kostenlos → neue App erstellen
3. Kopiere den **Consumer Key** (= API Key)

### 4. Umgebungsvariablen einrichten

```bash
cp backend/.env.example backend/.env
```

Öffne `backend/.env` und trage deine Werte ein:

```env
PORT=3001
TELEGRAM_TOKEN=1234567890:AAFdein_bot_token
TELEGRAM_CHAT_ID=123456789
TM_API_KEY=dein_ticketmaster_api_key
```

### 5. Frontend-Config einrichten

```bash
cp frontend/public/config.js.example frontend/public/config.js
```

> Diese Datei wird später automatisch mit der Tunnel-URL befüllt.

### 6. Docker starten

```bash
docker compose up -d
```

Erster Start dauert ~2-3 Minuten (Images werden heruntergeladen + Chromium installiert).  
Das Backend startet automatisch einen **Cloudflare Tunnel** – kein Account, kein Port-Forwarding nötig.

### 7. Tunnel-URL in config.js eintragen

```bash
docker logs ticket-buchen-allert-backend-1 | grep "Cloudflare Tunnel"
# Ausgabe: ✅ Cloudflare Tunnel aktiv: https://beispiel-name.trycloudflare.com
```

Trage die URL in `frontend/public/config.js` ein:

```js
window.API_URL = "https://beispiel-name.trycloudflare.com/api";
```

### 8. Dashboard öffnen

```
http://localhost:8080
```

---

## 🌐 Frontend auf eigenem Webserver deployen (optional)

Das Frontend ist eine statische React-App und kann auf jedem Apache/Nginx-Server gehostet werden.

### FTP-Deploy einrichten

```powershell
cp deploy_ftp.ps1.example deploy_ftp.ps1
```

Trage deine FTP-Zugangsdaten und den Serverpfad in `deploy_ftp.ps1` ein, dann:

```powershell
# Frontend bauen + deployen
mkdir deploy_tmp
docker run --rm -v "${PWD}\deploy_tmp:/out" ticket-buchen-allert-frontend sh -c "cp -r /usr/share/nginx/html/. /out/"
.\deploy_ftp.ps1
Remove-Item -Recurse -Force deploy_tmp
```

### Nach jedem Docker-Neustart (Tunnel-URL ändert sich!)

```powershell
cp update-tunnel-url.ps1.example update-tunnel-url.ps1
# Skript einmalig anpassen (FTP-Daten eintragen), dann bei jedem Neustart:
.\update-tunnel-url.ps1
```

Das Skript liest die neue URL automatisch, aktualisiert `config.js` und deployt.

---

## 📁 Projektstruktur

```
Ticket-Buchen-Allert/
├── backend/
│   ├── index.js              # Express API + Playwright + Telegram + Cloudflare Tunnel
│   ├── .env.example          # ← Vorlage: cp nach .env und ausfüllen
│   ├── Dockerfile
│   └── data/                 # Gespeicherte Monitore (lokal, nicht committed)
├── frontend/
│   ├── src/
│   │   ├── App.tsx           # Haupt-Dashboard
│   │   └── components/       # AlertsPanel, HealthPanel, SetupPanel, ...
│   ├── public/
│   │   ├── config.js.example # ← Vorlage: cp nach config.js und URL eintragen
│   │   └── index.html
│   └── Dockerfile
├── docker-compose.yml
├── deploy_ftp.ps1.example    # ← Vorlage für FTP-Deploy
├── update-tunnel-url.ps1.example  # ← Vorlage für Auto-Update nach Neustart
└── .gitignore
```

---

## ⚙️ Konfiguration (.env)

| Variable | Beschreibung |
|---|---|
| `TELEGRAM_TOKEN` | Bot-Token von @BotFather |
| `TELEGRAM_CHAT_ID` | Deine Chat-ID (von @userinfobot) |
| `TM_API_KEY` | Ticketmaster Discovery API Key |
| `DISABLE_TUNNEL` | `true` = Cloudflare Tunnel deaktivieren (lokaler Test) |

---

## 🔄 Täglicher Betrieb

```powershell
# System starten
docker compose up -d

# System stoppen
docker compose down

# Backend-Logs live anzeigen
docker logs ticket-buchen-allert-backend-1 -f

# Nach Neustart: neue Tunnel-URL deployen
.\update-tunnel-url.ps1
```

---

## ❓ Häufige Probleme

**"Backend Offline" / Network Error**
1. Docker läuft? → `docker ps`
2. Neue Tunnel-URL holen: `docker logs ticket-buchen-allert-backend-1 | grep Tunnel`
3. `config.js` aktualisieren → Frontend neu bauen + deployen

**Telegram-Nachrichten kommen nicht an**
- Hast du dem Bot `/start` geschickt?
- Chat-ID korrekt? → [@userinfobot](https://t.me/userinfobot) fragen

**Ticketmaster-Suche liefert keine Ergebnisse**
- API-Key gültig? Prüfen unter [developer.ticketmaster.com](https://developer.ticketmaster.com/)
- Free-Tier: 5.000 API-Calls pro Tag

---

## 🛡️ Sicherheit

Die folgenden Dateien enthalten persönliche Daten und werden vom `.gitignore` ausgeschlossen:

| Datei | Inhalt |
|---|---|
| `backend/.env` | Telegram-Token, API-Keys |
| `frontend/public/config.js` | Aktuelle Tunnel-URL |
| `deploy_ftp.ps1` | FTP-Zugangsdaten |
| `update-tunnel-url.ps1` | FTP-Zugangsdaten |
| `backend/data/` | Deine gespeicherten Monitore |

> **Niemals** diese Dateien committen oder öffentlich teilen!

---

## 📄 Lizenz

MIT License – freie Nutzung, Anpassung und Weitergabe erlaubt.