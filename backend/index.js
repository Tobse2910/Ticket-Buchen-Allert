require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const TelegramBot = require('node-telegram-bot-api');
const { chromium } = require('playwright');
const { spawn } = require('child_process');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Telegram Bot Setup
const fs = require('fs');
const path = require('path');
let token = process.env.TELEGRAM_TOKEN;
let chatId = process.env.TELEGRAM_CHAT_ID;
let bot = null;

function initBot() {
  if (bot) {
    try { bot.stopPolling(); } catch (e) {}
  }
  if (token) {
    try {
      bot = new TelegramBot(token, { polling: true });
      bot.onText(/\/start/, (msg) => {
        bot.sendMessage(msg.chat.id, 'Willkommen beim Ticket Bot! Ich benachrichtige dich bei Updates.');
      });
    } catch(e) {
      console.error("Telegram error:", e);
    }
  }
}
initBot();

function sendTelegramMessage(message) {
  if (bot && chatId) {
    bot.sendMessage(chatId, message).catch(err => {
        console.error('Telegram Error:', err);
        addLog('ERROR', 'TELEGRAM · Senden fehlgeschlagen: ' + err.message);
    });
  } else {
    addLog('WARN', 'TELEGRAM · Nicht konfiguriert, Nachricht ignoriert');
  }
}

// Verbesserter Alert mit Inline-Button "Jetzt kaufen"
function sendTelegramAlert(monitor) {
  if (bot && chatId) {
    const time = new Date().toLocaleTimeString('de-DE');
    const cityInfo = monitor.city ? `\n📍 Stadt-Filter: ${monitor.city}` : '';
    const msg = `🚨 *TICKET ALARM!* 🚨\n\n🎫 *${monitor.name}*${cityInfo}\n\n✅ Tickets könnten JETZT verfügbar sein!\n⏰ Erkannt: ${time}\n\n⚡ Schnell sein – Klick den Button!`;
    bot.sendMessage(chatId, msg, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [[
          { text: '🎫 JETZT KAUFEN →', url: monitor.url }
        ]]
      }
    }).catch(err => {
      console.error('Telegram Alert Error:', err);
      // Fallback ohne Button
      sendTelegramMessage('🚨 ALARM: ' + monitor.name + '\nLink: ' + monitor.url);
    });
  } else {
    addLog('WARN', 'TELEGRAM · Nicht konfiguriert, Alert ignoriert');
  }
}

async function sendN8nWebhook(data) {
    if(settings.n8nWebhookUrl && settings.n8nWebhookUrl.startsWith('http')) {
        try {
            await axios.post(settings.n8nWebhookUrl, data);
            addLog('INFO', 'N8N · Webhook gesendet');
        } catch(err) {
            console.error('N8N Error:', err);
            addLog('ERROR', 'N8N · Webhook fehlgeschlagen: ' + err.message);
        }
    }
}

// In-Memory Daten + Persistenz
const DATA_FILE = path.join(__dirname, 'data', 'monitors.json');

let monitors = [
  { id: 1, name: 'NFL MUNICH — HAUPTSALE',  shortName: 'NFL-MUC-01', url: 'https://www.ticketmaster.de/artist/nfl-tickets/912252', status: 'WAITING',   interval: 15,  ping: 0, checks: 0, triggers: 0,  mode: 'PLAYWRIGHT' }
];

function saveMonitors() {
  try {
    const dir = path.dirname(DATA_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    // _intervalId weglassen (nicht serialisierbar), knownUrls behalten (wichtig für Radar)
    const toSave = monitors.map(({ _intervalId, ...rest }) => rest);
    fs.writeFileSync(DATA_FILE, JSON.stringify(toSave, null, 2), 'utf8');
  } catch(e) {
    console.error('saveMonitors Fehler:', e.message);
  }
}

function loadSavedMonitors() {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      saveMonitors(); // Default-Monitor direkt abspeichern
      return;
    }
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    const saved = JSON.parse(raw);
    if (!Array.isArray(saved) || saved.length === 0) return;
    // Komplett ersetzen mit gespeichertem Stand
    monitors.length = 0;
    saved.forEach(m => monitors.push({
      ...m,
      ping: m.ping || 0,
      checks: m.checks || 0,
      triggers: m.triggers || 0,
      status: m.status || 'WAITING',
    }));
    console.log('✅ ' + monitors.length + ' Monitor(e) aus Datei geladen.');
  } catch(e) {
    console.error('loadSavedMonitors Fehler:', e.message);
  }
}

let logs = [];

function addLog(level, msg) {
  logs.unshift({
    id: logs.length + 1,
    ts: new Date().toLocaleTimeString('de-DE'),
    level,
    msg
  });
  if (logs.length > 50) logs.pop();
}

let settings = {
  n8nWebhookUrl: process.env.N8N_WEBHOOK_URL || '',
  telegramToken: token || '',
  telegramChatId: chatId || '',
  checkIntervals: 'Persönliches Intervall pro Monitor',
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0'
};

// Start playwright browser instances persistent
let activeBrowser = null;
async function initBrowser() {
    if(!activeBrowser) {
        activeBrowser = await chromium.launch({ 
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox'] 
        });
    }
    return activeBrowser;
}

// Playwright Scraper Loop pro Monitor
async function checkTicketmaster(monitor) {
  if(monitor.mode !== 'PLAYWRIGHT') return;

  const startTime = Date.now();
  let page = null;
  
  try {
    monitor.checks += 1;
    const browser = await initBrowser();
    page = await browser.newPage();
    
    // Set a realistic user agent
    await page.setExtraHTTPHeaders({ 'Accept-Language': 'de-DE,de;q=0.9' });
    
    // Timeout set to 30s
    await page.goto(monitor.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    
    const pageTitle = await page.title();
    const content = await page.content();
    
    monitor.ping = Date.now() - startTime;
    
    // Allgemeine Überprüfung, was gesucht werden soll
    let isAvailable = false;

    if (monitor.searchMode === 'POSITIVE' && monitor.customKeywords && monitor.customKeywords.length > 0) {
      // POSITIV-SUCHE: Wenn EINES der Wörter AUFTAUCHT -> Verfügbar
      for (const keyword of monitor.customKeywords) {
        if (content.includes(keyword)) {
          isAvailable = true;
          break;
        }
      }
    } else {
      // NEGATIV-SUCHE (Standard): Wenn KEINES der Wörter auftaucht -> Verfügbar
      // Plattform-spezifische Keywords automatisch erkennen
      let platformKeywords = [];
      if (monitor.url.includes('ticketmaster')) {
        platformKeywords = ['Leider keine', 'Keine bevorstehenden Veranstaltungen', 'No upcoming events', 'No Tickets', 'In Kürze', 'Derzeit keine Tickets', 'Aktuell keine Tickets'];
      } else if (monitor.url.includes('eventticket')) {
        platformKeywords = ['Ausverkauft', 'nicht verfügbar', 'keine Tickets', 'Sold Out', 'sold out'];
      } else if (monitor.url.includes('eventim')) {
        platformKeywords = ['ausverkauft', 'Ausgebucht', 'leider ausverkauft', 'nicht mehr verfügbar', 'Sold Out'];
      } else if (monitor.url.includes('reservix')) {
        platformKeywords = ['ausverkauft', 'Sold Out', 'nicht verfügbar'];
      } else if (monitor.url.includes('dice.fm')) {
        platformKeywords = ['Sold Out', 'sold-out', 'SOLD OUT'];
      } else if (monitor.url.includes('viagogo') || monitor.url.includes('stubhub')) {
        platformKeywords = ['Keine Tickets verfügbar', 'No tickets available'];
      } else {
        // Allgemeine Keywords für unbekannte Plattformen
        platformKeywords = ['ausverkauft', 'Ausverkauft', 'Sold Out', 'sold out', 'nicht verfügbar', 'keine Tickets', 'Leider keine'];
      }
      const noEventsKeywords = (monitor.customKeywords && monitor.customKeywords.length > 0)
        ? monitor.customKeywords
        : platformKeywords;
      
      isAvailable = true; // Wir gehen erstmal davon aus, dass verfügbar ist
      for (const keyword of noEventsKeywords) {
        if (content.includes(keyword)) {
          isAvailable = false; // "Ausverkauft" Wort gefunden -> nicht verfügbar
          break;
        }
      }
    }
    
    // Stadt-Filter: Wenn verfügbar, aber keine passende Stadt auf der Seite → trotzdem warten
    if (isAvailable && monitor.city && monitor.city.trim() !== '') {
      const cityLower = monitor.city.toLowerCase();
      const contentLower = content.toLowerCase();
      if (!contentLower.includes(cityLower)) {
        isAvailable = false;
        addLog('INFO', 'CHK #' + monitor.checks + ' · ' + monitor.shortName + ' · Tickets, aber nicht in ' + monitor.city);
      }
    }

    // Check if wir blockiert wurden von Queue-it/Datadome/Cloudflare (Warteraum)
    if (pageTitle.includes('Queue') || pageTitle.includes('Warteraum') || content.includes('queue-it') || content.includes('datadome') || pageTitle.includes('You are in line')) {
        if(monitor.status !== 'QUEUE') {
            monitor.status = 'QUEUE';
            addLog('WARN', 'CHK #' + monitor.checks + ' · ' + monitor.shortName + ' · Warteraum/Captcha erkannt!');
            sendTelegramMessage('⚠️ Warteraum/Bot-Schutz erkannt!\nEvent: ' + monitor.name + '\nLink: ' + monitor.url);
        }
    } else if (isAvailable) {
        // Tickets might be there!
        if (monitor.status !== 'AVAILABLE') {
            monitor.status = 'AVAILABLE';
            monitor.triggers += 1;
            addLog('INFO', 'TRIGGER · ' + monitor.shortName + ' · TICKET EVENT GEFUNDEN!');
            sendTelegramAlert(monitor); // Mit Inline-Button "Jetzt kaufen"
            
            // Send to N8N as well if configured
            sendN8nWebhook({
                monitor: monitor.name,
                url: monitor.url,
                keywords_found: monitor.customKeywords,
                timestamp: new Date().toISOString()
            });
        }
        addLog('INFO', 'CHK #' + monitor.checks + ' · ' + monitor.shortName + ' · Events gefunden! · ' + monitor.ping + 'ms');
    } else {
        monitor.status = 'WAITING';
        addLog('INFO', 'CHK #' + monitor.checks + ' · ' + monitor.shortName + ' · Keine Events · ' + monitor.ping + 'ms');
    }
  } catch (error) {
    monitor.ping = Date.now() - startTime;
    addLog('ERROR', 'CHK #' + monitor.checks + ' · ' + monitor.shortName + ' · Fehler: ' + error.message.substring(0, 30));
  } finally {
    if (page) {
      await page.close();
    }
  }
}

// ── SEARCH WATCH: Erkennt NEUE Events auf Ticketmaster ──────────────────────
async function checkSearchWatch(monitor) {
  const startTime = Date.now();
  monitor.checks += 1;

  try {
    const TM_API_KEY = process.env.TM_API_KEY;
    const params = {
      apikey: TM_API_KEY,
      keyword: monitor.searchQuery,
      size: 50,
      sort: 'date,asc',
      locale: '*',
    };
    if (monitor.city) params.city = monitor.city;

    const response = await axios.get('https://app.ticketmaster.com/discovery/v2/events.json', { params });
    const events = response.data?._embedded?.events || [];

    monitor.ping = Date.now() - startTime;

    const foundIds = events.map(e => e.id);
    const foundMap = Object.fromEntries(events.map(e => [e.id, e]));

    // Erster Lauf: Baseline speichern, kein Alarm
    if (monitor.knownUrls === null) {
      monitor.knownUrls = foundIds;
      monitor.status = 'WAITING';
      addLog('INFO', 'WATCH #' + monitor.checks + ' · ' + monitor.shortName + ' · Baseline: ' + foundIds.length + ' Events (TM API)');
      return;
    }

    // Neue Events finden
    const newIds = foundIds.filter(id => !monitor.knownUrls.includes(id));

    if (newIds.length > 0) {
      monitor.status = 'AVAILABLE';
      monitor.triggers += newIds.length;
      monitor.knownUrls = [...monitor.knownUrls, ...newIds];

      addLog('INFO', 'WATCH-TRIGGER · ' + monitor.shortName + ' · ' + newIds.length + ' neue Events via TM API!');

      for (const id of newIds) {
        const ev = foundMap[id];
        const evName = ev.name;
        const evUrl = ev.url;
        const evDate = ev.dates?.start?.localDate || '';
        const evVenue = ev._embedded?.venues?.[0]?.name || '';
        const evCity = ev._embedded?.venues?.[0]?.city?.name || '';
        const time = new Date().toLocaleTimeString('de-DE');
        const dateInfo = evDate ? `\n📅 ${evDate}` : '';
        const cityInfo = evCity ? `\n📍 ${evVenue}${evVenue ? ', ' : ''}${evCity}` : '';
        const msg = `🆕 *NEUES EVENT ENTDECKT!* 🆕\n\n🎫 *${evName}*${dateInfo}${cityInfo}\n\n📡 Suche: "${monitor.searchQuery}"\n⏰ Entdeckt: ${time}\n\n⚡ Direkt anschauen:`;
        if (bot && chatId) {
          bot.sendMessage(chatId, msg, {
            parse_mode: 'Markdown',
            reply_markup: { inline_keyboard: [[{ text: '🎫 EVENT ANSEHEN →', url: evUrl }]] }
          }).catch(err => sendTelegramMessage('🆕 Neues Event: ' + evName + '\n' + evUrl));
        }
      }

      sendN8nWebhook({ monitor: monitor.name, newIds, timestamp: new Date().toISOString() });
      saveMonitors();
    } else {
      if (monitor.status === 'AVAILABLE' && events.length === 0) monitor.status = 'WAITING';
      addLog('INFO', 'WATCH #' + monitor.checks + ' · ' + monitor.shortName + ' · ' + events.length + ' Events, nichts Neues · ' + monitor.ping + 'ms');
    }
  } catch (error) {
    monitor.ping = Date.now() - startTime;
    addLog('ERROR', 'WATCH #' + monitor.checks + ' · ' + monitor.shortName + ' · API-Fehler: ' + error.message.substring(0, 60));
  }
}

// Initialisiere Loop für alle Monitore
loadSavedMonitors();

function startLoops() {
   monitors.forEach(monitor => {
      const runner = monitor.mode === 'SEARCH_WATCH'
        ? () => checkSearchWatch(monitor)
        : () => checkTicketmaster(monitor);

      const intervalId = setInterval(runner, monitor.interval * 1000);
      monitor._intervalId = intervalId;
      setTimeout(runner, 2000);
   });
}
startLoops();


// API Endpunkte
app.get('/api/events', (req, res) => {
    // _intervalId und knownUrls entfernen (zirkulär / zu groß)
    const safeMonitors = monitors.map(m => {
        const { _intervalId, knownUrls, ...rest } = m;
        return rest;
    });
    res.json(safeMonitors);
});
app.get('/api/history', (req, res) => res.json(logs));
app.get('/api/settings', (req, res) => res.json(settings));

app.post('/api/settings', (req, res) => {
  const { telegramToken, telegramChatId, n8nWebhookUrl } = req.body;
  
  // Update mem
  token = telegramToken;
  chatId = telegramChatId;
  settings.telegramToken = token;
  settings.telegramChatId = chatId;
  settings.n8nWebhookUrl = n8nWebhookUrl || '';
  
  // Reboot bot
  initBot();
  
  // Save to .env
  const envPath = path.join(__dirname, '.env');
  const envContent = `PORT=3001
TELEGRAM_TOKEN=${token || ''}
TELEGRAM_CHAT_ID=${chatId || ''}
N8N_WEBHOOK_URL=${settings.n8nWebhookUrl || ''}
`;
  try {
    fs.writeFileSync(envPath, envContent, 'utf8');
    addLog('INFO', 'SYSTEM · Settings updated and saved');
  } catch(e) {
    console.error('Save env error:', e);
    addLog('ERROR', 'SYSTEM · Failed to save settings to .env');
  }
  
  res.json({ success: true, settings });
});

// Cloudflare Tunnel: startet cloudflared im Hintergrund, extrahiert URL
let tunnelUrl = null;
function startCloudflared() {
  const proc = spawn('cloudflared', ['tunnel', '--url', 'http://localhost:3001', '--no-autoupdate'], {
    stdio: ['ignore', 'pipe', 'pipe']
  });
  const handleOutput = (data) => {
    const text = data.toString();
    const match = text.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
    if (match && match[0] !== tunnelUrl) {
      tunnelUrl = match[0];
      console.log('\u2705 Cloudflare Tunnel aktiv:', tunnelUrl);
    }
  };
  proc.stdout.on('data', handleOutput);
  proc.stderr.on('data', handleOutput);
  proc.on('close', (code) => {
    console.log('cloudflared beendet (Code ' + code + ') – Neustart in 5s...');
    tunnelUrl = null;
    setTimeout(startCloudflared, 5000);
  });
}
if (process.env.DISABLE_TUNNEL !== 'true') startCloudflared();

app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    uptime: process.uptime(),
    memoryUsage: process.memoryUsage(),
    timestamp: new Date().toISOString(),
    version: '2.0.0-MultiMonitor',
    botConnected: !!bot,
    tunnelUrl
  });
});

// Schnelle Verfügbarkeitsprüfung ohne Browser (Axios + JSON-LD)
async function quickCheckFast(url) {
  try {
    const response = await axios.get(url, {
      timeout: 8000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'de-DE,de;q=0.9',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      }
    });
    const html = response.data;

    // 1. JSON-LD: Ticketmaster bettet schema.org/Event mit offers.availability ein
    const jsonLdMatches = html.match(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi) || [];
    for (const block of jsonLdMatches) {
      try {
        const json = JSON.parse(block.replace(/<script[^>]*>/i, '').replace(/<\/script>/i, ''));
        const objects = Array.isArray(json) ? json : [json];
        for (const obj of objects) {
          const offers = obj.offers || (obj['@graph'] || []).flatMap(o => o.offers || []);
          const offerList = Array.isArray(offers) ? offers : [offers];
          for (const offer of offerList) {
            if (!offer || !offer.availability) continue;
            const avail = offer.availability;
            if (avail.includes('InStock') || avail.includes('PreOrder') || avail.includes('PreSale')) return 'AVAILABLE';
            if (avail.includes('SoldOut') || avail.includes('OutOfStock') || avail.includes('Discontinued')) return 'WAITING';
          }
        }
      } catch(e) {}
    }

    // 2. Eingebettetes JSON in __NEXT_DATA__ / window.__data__
    const nextDataMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
    if (nextDataMatch) {
      const nextStr = nextDataMatch[1];
      if (nextStr.includes('"InStock"') || nextStr.includes('"inStock"') || nextStr.includes('"available"')) return 'AVAILABLE';
      if (nextStr.includes('"SoldOut"') || nextStr.includes('"soldOut"') || nextStr.includes('"unavailable"')) return 'WAITING';
    }

    // 3. Schnell-Text-Scan auf gesichertem HTML
    if (html.includes('queue-it') || html.includes('datadome')) return 'QUEUE';
    const soldOutSignals = ['Leider keine Tickets', 'Keine bevorstehenden Veranstaltungen', 'No upcoming events', 'Derzeit keine Tickets', 'Aktuell keine Tickets', 'Sold out', 'sold-out', '"soldOut"', 'OutOfStock', 'Auf Warteliste', 'Benachrichtigen lassen', 'Warteliste beitreten', 'AUSVERKAUFT'];
    const availableSignals = ['In den Warenkorb', 'Jetzt buchen', 'Tickets kaufen', 'Add to Cart', 'Zum Warenkorb', '"InStock"', 'instock', 'Angebote freigegeben', 'Ticket hinzufügen', 'Ticket auswählen'];
    if (availableSignals.some(s => html.includes(s))) return 'AVAILABLE';
    if (soldOutSignals.some(s => html.includes(s))) return 'WAITING';

    return null; // Kein klares Ergebnis → Playwright-Fallback nötig
  } catch(e) {
    return null;
  }
}

app.post('/api/quick-check', async (req, res) => {
  const { url, tmId } = req.body;
  if (!url) return res.status(400).json({ error: 'url required' });

  const TM_API_KEY = process.env.TM_API_KEY;
  const isTM = url.includes('ticketmaster.');

  // ── TM Event mit API-ID: Status direkt per Discovery-API (schnell + 100%) ──
  if (tmId && TM_API_KEY) {
    try {
      const r = await axios.get(`https://app.ticketmaster.com/discovery/v2/events/${tmId}.json`, {
        params: { apikey: TM_API_KEY }, timeout: 5000
      });
      const statusCode = r.data?.dates?.status?.code; // 'onsale','offsale','cancelled','postponed','rescheduled'
      const saleStart = r.data?.sales?.public?.startDateTime;
      const saleEnd = r.data?.sales?.public?.endDateTime;
      const now = new Date();
      let status;
      if (statusCode === 'onsale') {
        const started = !saleStart || new Date(saleStart) <= now;
        const notEnded = !saleEnd || new Date(saleEnd) >= now;
        status = (started && notEnded) ? 'AVAILABLE' : 'WAITING';
      } else if (statusCode === 'cancelled' || statusCode === 'offsale') {
        status = 'WAITING';
      } else {
        status = 'WAITING';
      }
      return res.json({ status, method: 'tm-api', statusCode });
    } catch(e) {
      // API-Fehler → Playwright-Fallback
    }
  }

  // ── Nicht-TM: schneller Axios-Check ──────────────────────────────────────
  if (!isTM) {
    const fastResult = await quickCheckFast(url);
    if (fastResult) return res.json({ status: fastResult, method: 'fast' });
  }

  // Playwright-Check
  let page = null;
  try {
    const browser = await initBrowser();
    page = await browser.newPage();
    await page.setExtraHTTPHeaders({ 'Accept-Language': 'de-DE,de;q=0.9' });
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
    // 2s warten damit Ticketmaster-React-Komponenten rendern (war 800ms → zu kurz)
    await page.waitForTimeout(2000);

    const result = await page.evaluate(() => {
      const bodyText = (document.body && document.body.innerText) || '';
      const bodyHTML = (document.body && document.body.innerHTML) || '';

      // Bot/Queue-Schutz
      if (document.title.toLowerCase().includes('queue') || bodyText.includes('queue-it')) return 'QUEUE';
      // 404 / Seite nicht gefunden
      if (bodyText.includes('existiert nicht') || bodyText.includes('nicht gefunden') || bodyText.includes('Page not found')) return 'ERROR';

      // ── VERFÜGBAR-Signale (gefunden auf echten TM-Seiten) ──────────────────
      const available = [
        'Angebote freigegeben',     // TM zeigt das wenn Tickets buchbar sind ✓
        'In den Warenkorb',         // direkter Kauf-Button
        'Zum Warenkorb',
        'Jetzt kaufen',
        'Tickets kaufen',
        'Ticket kaufen',
        'Add to Cart',
        'Ticket hinzufügen',
        'Ticket auswählen',
        'Souvenir Ticket',          // TM-Sonderticket wenn Haupttickets weg ✓
        'jetzt buchen',
        'Jetzt buchen',
      ];

      // ── AUSVERKAUFT/NICHT VERFÜGBAR Signale ───────────────────────────────
      const blocked = [
        'Leider keine Tickets',
        'Keine Tickets verfügbar',
        'keine Tickets verfügbar',
        'Keine bevorstehenden',
        'Derzeit keine Tickets',
        'Aktuell keine Tickets',
        'No upcoming events',
        'Sold Out',
        'sold out',
        'Sold out',
        'ausverkauft',
        'Ausverkauft',
        'AUSVERKAUFT',
        'nicht verfügbar',
        'Nicht verfügbar',
        'nicht mehr verfügbar',
        'Auf Warteliste',           // TM zeigt das wenn ausverkauft
        'Benachrichtigen lassen',   // TM zeigt das wenn ausverkauft
        'Warteliste beitreten',
      ];

      if (available.some(t => bodyText.includes(t))) return 'AVAILABLE';
      if (blocked.some(t => bodyText.includes(t))) return 'WAITING';

      // Buttons auslesen: wenn reiner "Tickets"-Button sichtbar → verfügbar
      const buttons = Array.from(document.querySelectorAll('button, a[role="button"]'))
        .map(b => b.innerText && b.innerText.trim())
        .filter(Boolean);
      if (buttons.some(b => b === 'Tickets' || b === 'Ticket' || b === 'Kaufen')) return 'AVAILABLE';

      return 'WAITING';
    });
    return res.json({ status: result, method: 'playwright' });
  } catch(err) {
    return res.json({ status: 'ERROR' });
  } finally {
    if (page) await page.close();
  }
});

// Debug-Endpunkt: zeigt was Playwright auf der Seite wirklich sieht
app.post('/api/quick-check-debug', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'url required' });
  let page = null;
  try {
    const browser = await initBrowser();
    page = await browser.newPage();
    await page.setExtraHTTPHeaders({ 'Accept-Language': 'de-DE,de;q=0.9' });
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(2000);
    const info = await page.evaluate(() => {
      const bodyText = (document.body && document.body.innerText) || '';
      // Erste 2000 Zeichen des sichtbaren Textes
      const snippet = bodyText.replace(/\s+/g, ' ').trim().substring(0, 2000);
      // Alle Buttons auflisten
      const buttons = Array.from(document.querySelectorAll('button')).map(b => b.innerText.trim()).filter(t => t.length > 0);
      // Meta tags
      const metas = Array.from(document.querySelectorAll('meta[name], meta[property]')).map(m => ({ n: m.getAttribute('name') || m.getAttribute('property'), v: m.getAttribute('content') })).slice(0, 20);
      return { snippet, buttons: buttons.slice(0, 30), metas };
    });
    res.json(info);
  } catch(err) {
    res.json({ error: err.message });
  } finally {
    if (page) await page.close();
  }
});

app.get('/api/search', async (req, res) => {
  const query = req.query.q;
  if (!query) return res.json([]);

  try {
    const TM_API_KEY = process.env.TM_API_KEY;
    if (!TM_API_KEY) return res.status(500).json({ error: 'TM_API_KEY fehlt in .env' });

    // Events und Artists parallel abfragen (viel schneller als Playwright)
    const [eventsRes, attractionsRes] = await Promise.allSettled([
      axios.get('https://app.ticketmaster.com/discovery/v2/events.json', {
        params: { apikey: TM_API_KEY, keyword: query, size: 20, sort: 'date,asc', locale: '*' }
      }),
      axios.get('https://app.ticketmaster.com/discovery/v2/attractions.json', {
        params: { apikey: TM_API_KEY, keyword: query, size: 5, locale: '*' }
      })
    ]);

    const results = [];

    // Events verarbeiten
    if (eventsRes.status === 'fulfilled') {
      const events = eventsRes.value.data?._embedded?.events || [];
      for (const ev of events) {
        const localDate = ev.dates?.start?.localDate || '';
        const localTime = ev.dates?.start?.localTime || '';
        let info = '';
        if (localDate) {
          const [y, m, d] = localDate.split('-');
          info = `${d}.${m}.${y.slice(2)}`;
          if (localTime) info += ` ${localTime.slice(0, 5)}`;
        }
        const venue = ev._embedded?.venues?.[0];
        const location = venue?.city?.name || venue?.name || '';
        // tmId = Discovery-API-ID (z.B. "Z698xZC2Z16v7F8k-E"), wird für Status-Check genutzt
        results.push({ name: ev.name, url: ev.url, type: 'EVENT', info, location, tmId: ev.id });
      }
    }

    // Attractions (Künstler) anhängen
    if (attractionsRes.status === 'fulfilled') {
      const attractions = attractionsRes.value.data?._embedded?.attractions || [];
      for (const att of attractions) {
        if (att.url) results.push({ name: att.name, url: att.url, type: 'ARTIST', info: 'Künstler-Seite', location: '' });
      }
    }

    res.json(results);
  } catch (err) {
    console.error('Search Error:', err.message);
    res.status(500).json({ error: 'Search failed: ' + err.message });
  }
});

app.post('/api/trigger', async (req, res) => {
  const { monitorId, status } = req.body;
  const monitor = monitors.find(m => m.id === monitorId);
  if (monitor) {
    monitor.status = status;
    monitor.triggers += 1;
    sendTelegramMessage('🚨 TEST ALARM!\n\nMonitor: ' + monitor.name + '\nStatus: ' + status + '\nURL: ' + monitor.url);
    addLog('WARN', 'MANUAL TRIGGER · ' + monitor.shortName + ' · Status zu ' + status);
    
    // Zirkuläre Referenz entfernen
    const { _intervalId: _, ...safeMonitor } = monitor;
    res.json({ success: true, monitor: safeMonitor });
  } else {
    res.status(404).json({ error: 'Monitor not found' });
  }
});

// Neuer Endpunkt um Monitore live im Code via Postman oder im Frontend hinzuzufuegen
app.post('/api/events', (req, res) => {
    const { name, url, interval, searchMode, customKeywords, city, mode, searchQuery } = req.body;

    // SEARCH_WATCH braucht keinen url, aber name + searchQuery
    if (mode === 'SEARCH_WATCH') {
      if (!name || !searchQuery) return res.status(400).json({ error: 'Name und Suchbegriff benötigt' });

      const newId = monitors.length > 0 ? Math.max(...monitors.map(m => m.id)) + 1 : 1;
      const newMonitor = {
        id: newId,
        name,
        shortName: 'WATCH-' + String(newId).padStart(2, '0'),
        url: `https://www.ticketmaster.de/search?q=${encodeURIComponent([searchQuery, city].filter(Boolean).join(' '))}`,
        searchQuery,
        city: city || '',
        status: 'WAITING',
        interval: interval || 60,
        mode: 'SEARCH_WATCH',
        knownUrls: null, // null = erster Lauf noch ausstehend
        ping: 0, checks: 0, triggers: 0
      };
      monitors.push(newMonitor);
      saveMonitors();

      const intervalId = setInterval(() => checkSearchWatch(newMonitor), newMonitor.interval * 1000);
      newMonitor._intervalId = intervalId;
      setTimeout(() => checkSearchWatch(newMonitor), 1000);

      addLog('INFO', 'NEW SEARCH WATCH: ' + name + ' (Query: ' + searchQuery + ')');
      const { _intervalId: _, knownUrls: __, ...safeMonitor } = newMonitor;
      return res.json({ success: true, monitor: safeMonitor });
    }

    if(!name || !url) return res.status(400).json({ error: 'Name und URL benoetigt' });
    
    // Parse customKeywords if it is a comma separated string
    let parsedKeywords = [];
    if (Array.isArray(customKeywords)) {
      parsedKeywords = customKeywords;
    } else if (typeof customKeywords === 'string' && customKeywords.trim() !== '') {
      parsedKeywords = customKeywords.split(',').map(k => k.trim()).filter(k => k.length > 0);
    }

    const newId = monitors.length > 0 ? Math.max(...monitors.map(m => m.id)) + 1 : 1;
    const newMonitor = {
        id: newId,
        name: name,
        shortName: 'TICKET-' + String(newId).padStart(2, '0'),
        url: url,
        status: 'WAITING',
        interval: interval || 30,
        searchMode: searchMode || 'NEGATIVE',
        customKeywords: parsedKeywords,
        city: city || '',
        ping: 0,
        checks: 0,
        triggers: 0,
        mode: 'PLAYWRIGHT'
    };
    
    monitors.push(newMonitor);
    saveMonitors();
    
    // Start den check loop fuer diesen neuen Monitor
    const intervalId = setInterval(() => checkTicketmaster(newMonitor), newMonitor.interval * 1000);
    newMonitor._intervalId = intervalId; // Save interval to be able to clear it
    
    setTimeout(() => checkTicketmaster(newMonitor), 1000);
    
    addLog('INFO', 'NEW MONITOR ADDED: ' + name);
    
    // Zirkuläre Referenz entfernen, bevor wir es an Frontend senden
    const { _intervalId: _, ...safeMonitor } = newMonitor;
    res.json({ success: true, monitor: safeMonitor });
});

// Endpunkt um Monitore zu loeschen
app.delete('/api/events/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const monitorIndex = monitors.findIndex(m => m.id === id);
    if(monitorIndex === -1) return res.status(404).json({ error: 'Monitor nicht gefunden' });
    
    const monitor = monitors[monitorIndex];
    if(monitor._intervalId) {
        clearInterval(monitor._intervalId);
    }
    
    monitors.splice(monitorIndex, 1);
    saveMonitors();
    addLog('WARN', 'MONITOR GELÖSCHT: ' + monitor.name);
    res.json({ success: true });
});

app.listen(PORT, "0.0.0.0", () => console.log('Backend running on port ' + PORT));

