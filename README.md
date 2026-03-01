# 🎟️ Ticket-Bot & Web-Monitor (Universal Scraper)

Ein leistungsstarker, Docker-basierter Ticket-Bot und Web-Monitor! Dieses Projekt hilft dir dabei, begehrte Tickets (z.B. auf Ticketmaster, Tomorrowland, Summer Breeze uvm.) automatisch zu überwachen und dir blitzschnell eine Benachrichtigung via **Telegram** zu schicken, sobald Tickets verfügbar sind.

## ✨ Features

* 🌐 **Universeller Scraper**: Überwacht nicht nur Ticketmaster, sondern *jede beliebige* Website.
* 🔍 **Smart Scanning**: Unterstützt "Positiv"-Suchen (Alarm, wenn Keywörter wie "In den Warenkorb" auftauchen) und "Negativ"-Suchen (Alarm, wenn z.B. "Sold Out" verschwindet).
* 📱 **Telegram-Integration**: Sofortige Push-Benachrichtigungen direkt auf dein Handy.
* 🖥️ **Modernes Dashboard**: Ein schickes React-Frontend zum Verwalten deiner aktiven Überwachungs-Tasks (Monitore).
* 🐳 **Dockerized**: Backend (Node.js + Playwright) und Frontend (React) laufen isoliert und stabil als Docker-Container.

## 🚀 Installation & Start

### Voraussetzungen
* [Docker](https://www.docker.com/) und Docker Compose müssen installiert sein.
* Ein Telegram Bot-Token (kann über den [@BotFather](https://t.me/botfather) in Telegram erstellt werden).
* Deine eigene Telegram Chat-ID.

### 1. Repository klonen
```bash
git clone git@github.com:Tobse2910/Ticket-Buchen-Allert.git
cd Ticket-Buchen-Allert
```

### 2. Geheimnisse und Umgebungsvariablen (.env) hinterlegen
Da sensible Daten wie Telegram-Tokens **nicht** auf GitHub hochgeladen werden (dank `.gitignore`), musst du deine `.env`-Datei lokal anlegen.
Gehe in den Ordner `backend` und erstelle eine Datei mit dem Namen `.env`. Füge dort Folgendes ein:

```env
TELEGRAM_TOKEN=Dein_Telegram_Bot_Token_hier_einfügen
TELEGRAM_CHAT_ID=Deine_Chat_ID_hier_einfügen
PORT=3001
```

### 3. Anwendung mit Docker starten
Öffne ein Terminal im Hauptverzeichnis (dort wo die `docker-compose.yml` Datei liegt) und starte die Container mit:
```bash
docker-compose up -d --build
```

Das war's! Docker lädt nun alle benötigten Systeme herunter und richtet dein lokales Ticket-Bot-Netzwerk ein.

### 4. Das Dashboard öffnen
Sobald das Setup abgeschlossen ist, erreichst du deine Nutzeroberfläche im Browser:
👉 **[http://localhost:3000](http://localhost:3000)**

*(Das Backend läuft im Hintergrund unter [http://localhost:3001](http://localhost:3001))*

## 🛠️ Tech-Stack
* **Frontend:** React, TypeScript, TailwindCSS
* **Backend:** Node.js, Express, Playwright (Headless Browser Scraping für dynamische Seiten)
* **Infrastruktur:** Docker & Docker Compose

---
*Happy Ticket-Hunting! 🎫 Mögen die Serverkapazitäten stets auf deiner Seite sein!*
