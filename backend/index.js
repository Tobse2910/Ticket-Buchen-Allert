require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const TelegramBot = require('node-telegram-bot-api');
const { chromium } = require('playwright');

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
    bot.sendMessage(chatId, message).catch(console.error);
  } else {
    console.log('TELEGRAM MSG:', message);
  }
}

// In-Memory Daten - Zukünftig erweiterbar über API / Frontend
let monitors = [
  { id: 1, name: 'NFL MUNICH — HAUPTSALE',  shortName: 'NFL-MUC-01', url: 'https://www.ticketmaster.de/artist/nfl-tickets/912252', status: 'WAITING',   interval: 15,  ping: 0, checks: 0, triggers: 0,  mode: 'PLAYWRIGHT' }
];

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
      const noEventsKeywords = (monitor.customKeywords && monitor.customKeywords.length > 0)
        ? monitor.customKeywords
        : ['Leider keine', 'Keine bevorstehenden Veranstaltungen', 'No upcoming events', 'No Tickets', 'In Kürze', 'Derzeit keine Tickets', 'Aktuell keine Tickets'];
      
      isAvailable = true; // Wir gehen erstmal davon aus, dass verfügbar ist
      for (const keyword of noEventsKeywords) {
        if (content.includes(keyword)) {
          isAvailable = false; // "Ausverkauft" Wort gefunden -> nicht verfügbar
          break;
        }
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
            sendTelegramMessage('🚨 ALARM: TICKET EVENT VERFUEGBAR! 🚨\n\nMonitor: ' + monitor.name + '\nStatus hat sich geaendert!\nKlick hier zum Kaufen: ' + monitor.url);
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

// Initialisiere Loop für alle Monitore
function startLoops() {
   monitors.forEach(monitor => {
      // Loop interval per monitor
      const intervalId = setInterval(() => {
          checkTicketmaster(monitor);
      }, monitor.interval * 1000);
      monitor._intervalId = intervalId;
      
      // Start init sofort
      setTimeout(() => checkTicketmaster(monitor), 2000);
   });
}
startLoops();


// API Endpunkte
app.get('/api/events', (req, res) => {
    // _intervalId entfernen, da es einen zirkulären JSON Fehler verursacht
    const safeMonitors = monitors.map(m => {
        const { _intervalId, ...rest } = m;
        return rest;
    });
    res.json(safeMonitors);
});
app.get('/api/history', (req, res) => res.json(logs));
app.get('/api/settings', (req, res) => res.json(settings));

app.post('/api/settings', (req, res) => {
  const { telegramToken, telegramChatId } = req.body;
  
  // Update mem
  token = telegramToken;
  chatId = telegramChatId;
  settings.telegramToken = token;
  settings.telegramChatId = chatId;
  
  // Reboot bot
  initBot();
  
  // Save to .env
  const envPath = path.join(__dirname, '.env');
  const envContent = `PORT=3001\nTELEGRAM_TOKEN=${token || ''}\nTELEGRAM_CHAT_ID=${chatId || ''}\nN8N_WEBHOOK_URL=\n`;
  try {
    fs.writeFileSync(envPath, envContent, 'utf8');
    addLog('INFO', 'SYSTEM · Settings updated and saved');
  } catch(e) {
    console.error('Save env error:', e);
  }
  
  res.json({ success: true, settings });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    uptime: process.uptime(),
    memoryUsage: process.memoryUsage(),
    timestamp: new Date().toISOString(),
    version: '2.0.0-MultiMonitor',
    botConnected: !!bot
  });
});

app.get('/api/search', async (req, res) => {
  const query = req.query.q;
  if(!query) return res.json([]);
  
  try {
    const browser = await initBrowser();
    const page = await browser.newPage();
    await page.goto(`https://www.ticketmaster.de/search?q=${encodeURIComponent(query)}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    
    // Warten auf Ergebnisse (optional, max 3 sekunden)
    await page.waitForTimeout(3000);
    
    const results = await page.evaluate(() => {
        const resultItems = Array.from(document.querySelectorAll('a'));
        const unique = [];
        const seen = new Set();
        resultItems.forEach(l => {
            const url = l.href;
            const text = l.innerText ? l.innerText.replace(/\n/g, ' ').trim() : '';
            if(text.length > 2 && url && (url.includes('/artist/') || url.includes('/event/')) && !seen.has(url)) {
                // Filtere generische Links heraus, die nicht spezifisch sind
                if(!url.endsWith('/artist/') && !url.endsWith('/event/')) {
                    seen.add(url);
                    unique.push({ name: text, url: url });
                }
            }
        });
        return unique.slice(0, 15); // Max 15 Ergebnisse
    });
    
    await page.close();
    res.json(results);
  } catch(err) {
    console.error("Search Error:", err);
    res.status(500).json({ error: 'Search failed' });
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
    res.json({ success: true, monitor });
  } else {
    res.status(404).json({ error: 'Monitor not found' });
  }
});

// Neuer Endpunkt um Monitore live im Code via Postman oder im Frontend hinzuzufuegen
app.post('/api/events', (req, res) => {
    const { name, url, interval, searchMode, customKeywords } = req.body;
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
        interval: interval || 30, // 30 sekunden standard
        searchMode: searchMode || 'NEGATIVE',
        customKeywords: parsedKeywords,
        ping: 0,
        checks: 0,
        triggers: 0,
        mode: 'PLAYWRIGHT'
    };
    
    monitors.push(newMonitor);
    
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
    addLog('WARN', 'MONITOR GELÖSCHT: ' + monitor.name);
    res.json({ success: true });
});

app.listen(PORT, "0.0.0.0", () => console.log('Backend running on port ' + PORT));

