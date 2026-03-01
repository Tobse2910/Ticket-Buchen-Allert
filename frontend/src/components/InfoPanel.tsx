import React from "react";
import { Info, HelpCircle, Bot, Link as LinkIcon, ShieldCheck, Box } from "lucide-react";

export function InfoPanel() {
  return (
    <div className="bg-[#111] border border-[#222] rounded-xl p-6 lg:p-8 animate-fade-in shadow-xl">
      <div className="flex items-center gap-3 mb-8 pb-4 border-b border-[#2A2A2A]">
        <div className="p-3 bg-indigo-500/10 rounded-lg">
          <Info className="w-6 h-6 text-indigo-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Info & Einrichtung</h2>
          <p className="text-sm text-gray-400">So richtest du den Ticket Buchen Bot richtig ein.</p>
        </div>
      </div>

      <div className="space-y-10">
        
        {/* Step 0: Docker Setup */}
        <section className="space-y-4">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Box className="w-5 h-5 text-blue-500" />
            1. So installierst und startest du dieses System
          </h3>
          <div className="bg-[#1A1A1A] p-5 rounded-xl border border-[#333] space-y-3 text-sm text-gray-300 leading-relaxed indent-0">
            <p>Das gesamte Ticket Buchen System läuft innerhalb von "Containern". Das macht es super stabil und du musst nicht zig verschiedene Programme installieren. Du brauchst nur Docker!</p>
            <ol className="list-decimal list-inside space-y-3 pl-2 mt-2">
              <li>Lade dir <strong>Docker Desktop</strong> herunter: <a href="https://www.docker.com/products/docker-desktop/" target="_blank" rel="noreferrer" className="text-indigo-400 hover:underline">Hier klicken zum Downloaden</a>. Installiere es und starte das Programm (wichtig: Lass es danach im Hintergrund offen).</li>
              <li>Entpacke diesen ganzen Tool-Ordner an einen Ort, wo du ihn leicht findest (z. B. auf dem Desktop).</li>
              <li>Öffne <strong>PowerShell</strong> oder <strong>Terminal</strong> auf deinem PC.</li>
              <li>Navigiere in den Ordner, mit dem Kommando: <code className="bg-[#222] px-2 py-1 rounded text-emerald-400 border border-[#333]">cd "\Pfad\zum\Ordner\Ticket_Buchen"</code>.</li>
              <li>Führe folgenden Befehl aus, um alles zu bauen und im Hintergrund zu starten: <code className="bg-[#222] px-2 py-1 rounded text-emerald-400 border border-[#333]">docker-compose up -d --build</code>.</li>
              <li>Warte kurz, bis er fertig ist. Wenn du in Zukunft den PC neustartest, musst du nur Docker öffnen, und das System fährt automatisch wieder hoch!</li>
            </ol>
            <p className="mt-2 text-yellow-400/90 font-medium">Das Dashboard (Frontend) ist nun unter http://localhost:8080 erreichbar. Das System ist startklar!</p>
          </div>
        </section>

        {/* Step 1: Telegram Bot */}
        <section className="space-y-4">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Bot className="w-5 h-5 text-indigo-500" />
            2. Telegram Bot erstellen (für Benachrichtigungen)
          </h3>
          <div className="bg-[#1A1A1A] p-5 rounded-xl border border-[#333] space-y-3 text-sm text-gray-300 leading-relaxed indent-0">
            <p>Damit du benachrichtigt wirst, wenn Tickets verfügbar sind, musst du einen eigenen Telegram-Bot erstellen. Keine Sorge, das dauert nur eine Minute:</p>
            <ol className="list-decimal list-inside space-y-3 pl-2 mt-2">
              <li>Öffne <strong>Telegram</strong> auf deinem Handy oder PC und suche nach <strong className="text-indigo-400">@BotFather</strong>.</li>
              <li>Sende dem BotFather die Nachricht <code className="bg-[#222] px-2 py-1 rounded text-red-400 border border-[#333]">/newbot</code>.</li>
              <li>Er fragt dich nach einem <strong>Namen</strong> (z.B. "Mein Ticket Bot") und danach nach einem <strong>Username</strong> (Endung muss "bot" sein, z.B. "MarkusTicket_bot").</li>
              <li>Sobald fertig, erhältst du eine Nachricht mit einer langen Zeichenkette. Das ist dein <strong className="text-indigo-400">HTTP API Token</strong>!</li>
              <li>Gehe hier im Dashboard auf den Reiter <strong>"Setup"</strong> und trage diesen Token samt deiner Chat-ID in die Settings ein.</li>
            </ol>
            <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-md flex items-start gap-2">
              <HelpCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <p className="text-xs"><strong>Tipp:</strong> Deine Telegram Chat-ID bekommst du, wenn du in Telegram nach <strong>@userinfobot</strong> suchst und dort /start klickst.</p>
            </div>
          </div>
        </section>

        {/* Step 2: Events hinzufügen */}
        <section className="space-y-4">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <LinkIcon className="w-5 h-5 text-emerald-500" />
            3. Events & Fremde Webseiten überwachen
          </h3>
          <div className="bg-[#1A1A1A] p-5 rounded-xl border border-[#333] space-y-3 text-sm text-gray-300 leading-relaxed indent-0">
            <p>Unter dem Reiter <strong>Neues Event</strong> kannst du auf zwei Arten Events hinzufügen:</p>
            <ul className="space-y-3 list-disc list-inside mt-2 pl-2">
              <li><strong>Suchen:</strong> Suche direkt nach Ticketmaster-Künstlern und klicke auf "Add".</li>
              <li><strong>Manuelle URL:</strong> Hier kannst du direkt einen Ticketmaster-Link einfügen.</li>
              <li><strong>Andere Website (Universal):</strong> Klicke auf "Andere Website", um <strong>JEDE BEILIEBIGE SEITE</strong> (z.B. Tomorrowland) zu überwachen! Dort kannst du auch deine eigenen Such-Wörter definieren (z.B. Alarm senden sobald das Wort "Ausverkauft" verschwindet).</li>
            </ul>
            <p className="mt-2 text-yellow-400/90 font-medium">Der Bot durchsucht dann automatisch den Quellcode der angegebenen Seite im gewählten Zeitintervall.</p>
          </div>
        </section>

        {/* Step 3: Tipps */}
        <section className="space-y-4">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-purple-500" />
            4. Wichtige Tipps & Antiban-Schutz
          </h3>
          <div className="bg-[#1A1A1A] p-5 rounded-xl border border-[#333] space-y-3 text-sm text-gray-300 leading-relaxed indent-0">
            <p>Das Tool greift im Hintergrund einen echten Google Chrome Browser ab und liest die Webseite mit einem echten Benutzer-Modell aus, weshalb keine API Keys für Ticketmaster benötigt werden.</p>
            <ul className="space-y-2 list-disc list-inside mt-2 pl-2">
              <li>Stelle das Intervall <strong>nicht zu schnell</strong> (unter 15 Sekunden) ein, sonst könnte Ticketmaster deine IP Adresse für ein paar Stunden blockieren (Warteraum).</li>
              <li>Lies die <strong>System Logs</strong> im Dashboard, um zu sehen, ob das Tool "Captcha / Queue erkannt" meldet. Falls ja, pausiere kurz.</li>
              <li>Die Datenstruktur (welche Monitore laufen) geht beim Schließen des Systems aktuell noch verloren (In-Memory). Schließe also den Browser-Tab gerne, aber beende nicht den Docker / PowerShell Container im Hintergrund!</li>
            </ul>
          </div>
        </section>

      </div>
    </div>
  );
}

