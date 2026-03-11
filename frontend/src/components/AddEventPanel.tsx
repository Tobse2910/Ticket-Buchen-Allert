import React, { useState, useEffect } from "react";
import axios from "axios";
import { PlusCircle, Ticket, Search, Loader2, Radar } from "lucide-react";
import { API_BASE } from "../api";

export function AddEventPanel({ onAdded }: { onAdded?: () => void }) {
  const [mode, setMode] = useState<"search" | "manual" | "watch">("search");

  // Manual State
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [interval, setIntervalTime] = useState(30);

  // New states for custom sites
  const [platform, setPlatform] = useState<"ticketmaster" | "custom">("ticketmaster");
  const [searchMode, setSearchMode] = useState<"NEGATIVE" | "POSITIVE">("POSITIVE");
  const [customKeywords, setCustomKeywords] = useState("");
  const [city, setCity] = useState("");

  // Watch State
  const [watchName, setWatchName] = useState("");
  const [watchQuery, setWatchQuery] = useState("");
  const [watchCity, setWatchCity] = useState("");
  const [watchInterval, setWatchInterval] = useState(120);

  // Search State
  const [searchQuery, setSearchQuery] = useState("");
const [searchResults, setSearchResults] = useState<{name: string, url: string, type: string, info: string, location?: string, tmId?: string}[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [resultStatuses, setResultStatuses] = useState<Record<string, {loading: boolean, status: string | null}>>({}); 

  const checkResultStatus = async (url: string, tmId?: string) => {
    setResultStatuses(prev => ({ ...prev, [url]: { loading: true, status: null } }));
    try {
      const res = await axios.post(`${API_BASE}/api/quick-check`, { url, tmId });
      setResultStatuses(prev => ({ ...prev, [url]: { loading: false, status: res.data.status } }));
    } catch {
      setResultStatuses(prev => ({ ...prev, [url]: { loading: false, status: 'ERROR' } }));
    }
  };

  const autoCheckEvents = (results: {name: string, url: string, type: string, info: string, location?: string, tmId?: string}[]) => {
    const events = results.filter(r => r.type === 'EVENT');
    const initial: Record<string, {loading: boolean, status: string | null}> = {};
    events.forEach(e => { initial[e.url] = { loading: true, status: null }; });
    setResultStatuses(initial);

    // Parallel in Batches von 4
    const BATCH = 4;
    const checkInBatches = async () => {
      for (let i = 0; i < events.length; i += BATCH) {
        const batch = events.slice(i, i + BATCH);
        await Promise.all(batch.map(async (event) => {
          try {
            const res = await axios.post(`${API_BASE}/api/quick-check`, { url: event.url, tmId: event.tmId });
            setResultStatuses(prev => ({ ...prev, [event.url]: { loading: false, status: res.data.status } }));
          } catch {
            setResultStatuses(prev => ({ ...prev, [event.url]: { loading: false, status: 'ERROR' } }));
          }
        }));
      }
    };
    checkInBatches();
  };

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{type: "success" | "error", text: string} | null>(null);

  // Auto-Search Effect
  useEffect(() => {
    const combined = [searchQuery.trim(), city.trim()].filter(Boolean).join(' ');
    const delayDebounceFn = setTimeout(() => {
      if (combined.length > 2 && mode === "search") {
        performSearch();
      } else if (combined.length <= 2) {
        setSearchResults([]);
      }
    }, 600);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, city, mode]);

  const sortResults = (data: any[]) => {
    const parseDate = (info: string): number => {
      const m = info ? info.match(/(\d{2})\.(\d{2})\.(\d{2,4})/) : null;
      if (!m) return Infinity;
      const year = m[3].length === 2 ? 2000 + parseInt(m[3]) : parseInt(m[3]);
      return new Date(year, parseInt(m[2]) - 1, parseInt(m[1])).getTime();
    };
    return [...data].sort((a, b) => {
      if (a.type === 'ARTIST' && b.type !== 'ARTIST') return 1;
      if (a.type !== 'ARTIST' && b.type === 'ARTIST') return -1;
      if (a.type === 'ARTIST' && b.type === 'ARTIST') return 0;
      return parseDate(a.info) - parseDate(b.info);
    });
  };

  const performSearch = async () => {
    setIsSearching(true);
    setMessage(null);

    try {
      const combinedQuery = [searchQuery.trim(), city.trim()].filter(Boolean).join(' ');
      const res = await axios.get(`${API_BASE}/api/search?q=${encodeURIComponent(combinedQuery)}`);
      const sorted = sortResults(res.data);
      setSearchResults(sorted);
      autoCheckEvents(sorted);
    } catch(err) {
      console.error(err);
      setMessage({ type: "error", text: "Fehler bei der Event-Suche." });
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const combined = [searchQuery.trim(), city.trim()].filter(Boolean).join(' ');
    if (!combined) return;
    performSearch();
  };

  const handleAddEvent = async (eventName: string, eventUrl: string, eventInterval: number = 30, tPlatform: "ticketmaster"|"custom" = "ticketmaster") => {
    setLoading(true);
    setMessage(null);

    try {
      await axios.post(`${API_BASE}/api/events`, {
        name: eventName,
        url: eventUrl,
        interval: eventInterval,
        searchMode: tPlatform === "custom" ? searchMode : "NEGATIVE",
        customKeywords: tPlatform === "custom" ? customKeywords : [],
        city: city.trim()
      });

      setName("");
      setUrl("");
      setCustomKeywords("");
      setCity("");

      if(onAdded) {
        onAdded();
      } else {
        setMessage({ type: "success", text: `"${eventName}" wurde zur Live-Überwachung hinzugefügt! Sieh im Dashboard nach.` });
      }

    } catch (err: any) {
      console.error(err);
      setMessage({ type: "error", text: err?.response?.data?.error || err?.message || "Es gab ein Problem beim Hinzufügen." });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    handleAddEvent(name, url, interval, platform);
  };

  const handleWatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!watchName.trim() || !watchQuery.trim()) return;
    setLoading(true);
    setMessage(null);
    try {
      await axios.post(`${API_BASE}/api/events`, {
        name: watchName.trim(),
        mode: 'SEARCH_WATCH',
        searchQuery: watchQuery.trim(),
        city: watchCity.trim(),
        interval: watchInterval
      });
      setWatchName("");
      setWatchQuery("");
      setWatchCity("");
      if (onAdded) {
        onAdded();
      } else {
        setMessage({ type: "success", text: `Radar "${watchName}" läuft! Du wirst sofort benachrichtigt wenn ein neues Event erscheint.` });
      }
    } catch (err: any) {
      setMessage({ type: "error", text: err?.response?.data?.error || "Fehler beim Starten des Radars." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#111] border border-[#222] rounded-xl p-4 md:p-6">
      <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
        <h3 className="text-white font-medium flex items-center gap-2">
          <Ticket className="w-5 h-5 text-indigo-500" />
          Neues Event überwachen
        </h3>

        <div className="flex bg-[#0A0A0A] p-1 rounded-lg border border-[#333]">
          <button
            type="button"
            onClick={() => setMode("search")}
            className={`px-3 md:px-4 py-1.5 text-xs font-medium rounded-md transition-colors touch-manipulation ${mode === "search" ? "bg-[#333] text-white" : "text-[#888] hover:text-white"}`}
          >
            Suchen
          </button>
          <button
            type="button"
            onClick={() => setMode("manual")}
            className={`px-3 md:px-4 py-1.5 text-xs font-medium rounded-md transition-colors touch-manipulation ${mode === "manual" ? "bg-[#333] text-white" : "text-[#888] hover:text-white"}`}
          >
            Manuelle URL
          </button>
          <button
            type="button"
            onClick={() => setMode("watch")}
            className={`px-3 md:px-4 py-1.5 text-xs font-medium rounded-md transition-colors touch-manipulation flex items-center gap-1.5 ${mode === "watch" ? "bg-amber-500/20 text-amber-400" : "text-[#888] hover:text-white"}`}
          >
            <Radar className="w-3 h-3" />
            Event-Radar
          </button>
        </div>
      </div>

      <div className="bg-[#1a1a1a] p-6 rounded-lg border border-[#333]">
        <p className="text-[#a1a1aa] text-sm mb-6">
          {mode === "search"
            ? "Suche direkt auf Ticketmaster nach einem Event, Künstler oder Ort. Wir finden den Link für dich."
            : mode === "watch"
            ? "📡 Event-Radar: Wir beobachten Ticketmaster und schlagen sofort Alarm wenn ein NEUES Event auftaucht – z.B. NFL München 2026."
            : "Füge einen Link von jeder Plattform ein: Ticketmaster, Eventim, Eventticket, Reservix, DICE, Viagogo, Summer-Breeze, Tomorrowland etc."}
        </p>

        {message && (
          <div className={`p-4 rounded-md mb-6 text-sm font-medium ${message.type === "success" ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" : "bg-red-500/10 text-red-500 border border-red-500/20"}`}>
            {message.text}
          </div>
        )}

        {mode === "watch" ? (
          <form onSubmit={handleWatchSubmit} className="space-y-4">
            <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20 text-xs text-amber-400">
              <strong>📡 Wie es funktioniert:</strong> Der Radar durchsucht Ticketmaster alle paar Minuten nach deinem Suchbegriff. Wenn ein NEUES Event auftaucht das vorher nicht da war – Telegram-Alarm mit direktem Link!
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#a1a1aa] uppercase tracking-wider mb-2">Radar-Name</label>
              <input
                type="text"
                required
                value={watchName}
                onChange={(e) => setWatchName(e.target.value)}
                placeholder="z.B. NFL München Radar"
                className="w-full bg-[#0A0A0A] border border-[#333] focus:border-amber-500 rounded-md p-3 text-sm text-white outline-none transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#a1a1aa] uppercase tracking-wider mb-2">
                Suchbegriff auf Ticketmaster
              </label>
              <input
                type="text"
                required
                value={watchQuery}
                onChange={(e) => setWatchQuery(e.target.value)}
                placeholder="z.B. NFL, Coldplay, Rammstein ..."
                className="w-full bg-[#0A0A0A] border border-[#333] focus:border-amber-500 rounded-md p-3 text-sm text-white outline-none transition-colors"
              />
              <p className="text-gray-600 text-xs mt-1">Genau wie du es in der Ticketmaster-Suche eingeben würdest.</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#a1a1aa] uppercase tracking-wider mb-2">
                Stadt <span className="text-gray-600 font-normal normal-case">(optional – filtert Ergebnisse)</span>
              </label>
              <input
                type="text"
                value={watchCity}
                onChange={(e) => setWatchCity(e.target.value)}
                placeholder="z.B. München"
                className="w-full bg-[#0A0A0A] border border-[#333] focus:border-amber-500 rounded-md p-3 text-sm text-white outline-none transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#a1a1aa] uppercase tracking-wider mb-2">Such-Intervall</label>
              <select
                value={watchInterval}
                onChange={(e) => setWatchInterval(Number(e.target.value))}
                className="w-full bg-[#0A0A0A] border border-[#333] focus:border-amber-500 rounded-md p-3 text-sm text-white outline-none transition-colors"
              >
                <option value={60}>Jede Minute</option>
                <option value={120}>Alle 2 Minuten</option>
                <option value={300}>Alle 5 Minuten</option>
                <option value={600}>Alle 10 Minuten</option>
              </select>
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={loading}
                className="w-full sm:w-auto flex items-center justify-center gap-2 text-sm font-medium text-white bg-amber-600 hover:bg-amber-500 py-3 px-6 rounded-md transition-colors disabled:opacity-50 touch-manipulation"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Radar className="w-5 h-5" />}
                Radar starten
              </button>
            </div>
          </form>
        ) : mode === "search" ? (
          <div>
            {/* Stadt-Filter (Search-Mode) */}
            <div className="mb-4">
              <label className="block text-xs font-semibold text-[#a1a1aa] uppercase tracking-wider mb-2">
                Stadt-Filter <span className="text-gray-600 font-normal normal-case">(optional)</span>
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="z.B. München, Berlin ..."
                className="w-full bg-[#0A0A0A] border border-[#333] focus:border-indigo-500 rounded-md p-3 text-sm text-white outline-none transition-colors"
              />
              <p className="text-gray-600 text-xs mt-1">Alarm nur wenn Tickets für diese Stadt gefunden werden.</p>
            </div>
            <form onSubmit={handleSearch} className="flex gap-2 md:gap-3 mb-6">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="z.B. Adele München..."
                className="flex-1 min-w-0 bg-[#0A0A0A] border border-[#333] focus:border-indigo-500 rounded-md p-3 text-sm text-white outline-none transition-colors"
              />
              <button
                type="submit"
                disabled={isSearching}
                className="shrink-0 flex items-center justify-center gap-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 py-3 px-4 md:px-6 rounded-md transition-colors disabled:opacity-50 touch-manipulation"
              >
                {isSearching ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                <span className="hidden sm:inline">Suchen</span>
              </button>
            </form>

            {searchResults.length > 0 && (
              <div className="space-y-3">
                <label className="block text-xs font-semibold text-[#a1a1aa] uppercase tracking-wider mb-2">Ergebnisse</label>
                {searchResults.map((res, i) => {
                  const rs = resultStatuses[res.url];
                  const statusDot: Record<string, string> = {
                    AVAILABLE: 'bg-emerald-500 animate-pulse',
                    WAITING:   'bg-rose-500',
                    QUEUE:     'bg-amber-500 animate-pulse',
                    ERROR:     'bg-gray-500',
                  };
                  const statusLabel: Record<string, string> = {
                    AVAILABLE: 'Verfügbar ✅',
                    WAITING:   'Keine Tickets',
                    QUEUE:     'Warteschlange',
                    ERROR:     'Fehler',
                  };
                  const statusTextColor: Record<string, string> = {
                    AVAILABLE: 'text-emerald-400',
                    WAITING:   'text-rose-400',
                    QUEUE:     'text-amber-400',
                    ERROR:     'text-gray-400',
                  };
                  return (
                  <div key={i} className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0A0A0A] border p-4 rounded-md group transition-colors ${
                    rs?.status === 'AVAILABLE' ? 'border-emerald-500/50 shadow-emerald-500/10 shadow-md' :
                    rs?.status === 'WAITING'   ? 'border-rose-500/30' :
                    rs?.status === 'QUEUE'     ? 'border-amber-500/30' :
                    'border-[#333] hover:border-[#444]'
                  }`}>
                    <div className="flex-1 pr-4">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        {/* Live-Status-Dot */}
                        {rs?.loading ? (
                          <Loader2 className="w-3 h-3 animate-spin text-gray-400 shrink-0" />
                        ) : rs?.status ? (
                          <span className={`w-3 h-3 rounded-full shrink-0 ${statusDot[rs.status] || 'bg-gray-500'}`} />
                        ) : (
                          <span className={`w-3 h-3 rounded-full shrink-0 ${res.type === 'ARTIST' ? 'bg-purple-400/60' : 'bg-gray-500'}`} title="Noch nicht geprüft" />
                        )}

                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${res.type === 'ARTIST' ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/20 text-blue-400'}`}>
                           {res.type === 'ARTIST' ? 'KÜNSTLER' : 'EVENT'}
                        </span>
                        {rs?.status && !rs.loading && (
                          <span className={`text-[10px] font-semibold ${statusTextColor[rs.status] || 'text-gray-400'}`}>
                            {statusLabel[rs.status]}
                          </span>
                        )}
                        {res.info && !rs?.status && (
                           <span className="text-[10px] text-gray-500 font-mono">{res.info}</span>
                        )}
                        {res.location && (
                           <span className="text-[10px] text-amber-500 font-bold bg-amber-500/10 px-1.5 py-0.5 rounded uppercase">{res.location}</span>
                        )}
                      </div>

                      <p className="text-white text-sm font-medium mb-1 line-clamp-1">{res.name}</p>
                      <a href={res.url} target="_blank" rel="noreferrer" className="text-indigo-400 hover:text-indigo-300 text-xs truncate max-w-[200px] block opacity-70 hover:opacity-100">
                        {res.url}
                      </a>
                    </div>

                    <div className="shrink-0 flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                      {/* Live-Status-Prüf-Button (nur für Events) */}
                      {res.type === 'EVENT' && (
                        <button
                          type="button"
                          onClick={() => checkResultStatus(res.url, res.tmId)}
                          disabled={rs?.loading}
                          title="Ticket-Status jetzt live prüfen"
                          className={`flex items-center justify-center gap-1.5 text-xs font-medium border py-2.5 px-3 rounded transition-all touch-manipulation ${
                            rs?.status === 'AVAILABLE' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' :
                            rs?.status === 'WAITING'   ? 'bg-rose-500/10 text-rose-400 border-rose-500/30' :
                            rs?.status === 'QUEUE'     ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' :
                            'bg-[#1a1a1a] text-gray-400 border-[#333] hover:border-amber-500/40 hover:text-amber-400'
                          }`}>
                          {rs?.loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : '🔍'}
                          {rs?.loading ? 'Prüft...' : rs?.status ? 'Neu prüfen' : 'Status prüfen'}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleAddEvent(res.name, res.url, 30, "ticketmaster")}
                        disabled={loading}
                        title="Dauerüberwachung starten – Alarm wenn Status sich ändert"
                        className="flex items-center justify-center gap-1.5 text-xs font-medium bg-[#222] hover:bg-indigo-500/10 hover:text-indigo-400 hover:border-indigo-500/30 text-[#a1a1aa] border border-[#333] py-2.5 px-4 rounded transition-all disabled:opacity-50 touch-manipulation"
                      >
                        <PlusCircle className="w-4 h-4" />
                        Alarm starten
                      </button>
                    </div>
                  </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            
            <div className="flex flex-wrap gap-x-6 gap-y-3">
              <label className="flex items-center gap-2 text-sm text-white cursor-pointer touch-manipulation">
                <input 
                  type="radio" 
                  name="platform" 
                  checked={platform === "ticketmaster"} 
                  onChange={() => setPlatform("ticketmaster")}
                  className="accent-indigo-500 w-4 h-4"
                /> Ticketmaster
              </label>
              <label className="flex items-center gap-2 text-sm text-white cursor-pointer touch-manipulation">
                <input 
                  type="radio" 
                  name="platform" 
                  checked={platform === "custom"} 
                  onChange={() => setPlatform("custom")}
                  className="accent-indigo-500 w-4 h-4"
                /> Andere Website (z.B. Tomorrowland)
              </label>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#a1a1aa] uppercase tracking-wider mb-2">
                Name des Events
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={platform === "ticketmaster" ? "z.B. Adele Konzert München Block A" : "z.B. Tomorrowland 2026"}
                className="w-full bg-[#0A0A0A] border border-[#333] focus:border-indigo-500 rounded-md p-3 text-sm text-white outline-none transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#a1a1aa] uppercase tracking-wider mb-2">
                Ziel URL <span className="text-amber-500">*</span>
              </label>
              <input
                type="url"
                required
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder={platform === "ticketmaster" ? "https://www.ticketmaster.de/artist/..." : "https://www.summer-breeze.de/de/"}
                className="w-full bg-[#0A0A0A] border border-[#333] focus:border-indigo-500 rounded-md p-3 text-sm text-white outline-none transition-colors"
              />
              <p className="text-gray-600 text-xs mt-1">
                Kopiere einfach den Link der Event-Seite hier rein.
              </p>
            </div>

            {platform === "custom" && (
              <div className="p-4 bg-[#0d0d0d] border border-amber-500/20 rounded-md space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-amber-500 uppercase tracking-wider mb-2">
                    Wann schlagen wir Alarm?
                  </label>
                  <select
                    value={searchMode}
                    onChange={(e) => setSearchMode(e.target.value as "POSITIVE" | "NEGATIVE")}
                    className="w-full bg-[#111] border border-[#333] focus:border-amber-500 rounded-md p-3 text-sm text-white outline-none transition-colors"
                  >
                    <option value="POSITIVE">Alarm, wenn ein bestimmtes WORT AUFTAUCHT (z.B. &quot;Tickets kaufen&quot;)</option>
                    <option value="NEGATIVE">Alarm, wenn ein bestimmtes Wort VERSCHWINDET (wie bei Ticketmaster &quot;Ausverkauft&quot;)</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-xs font-semibold text-amber-500 uppercase tracking-wider mb-2">
                    {searchMode === "POSITIVE" ? "Erfolgs-Wörter (Komma-getrennt)" : "Ausverkauft-Wörter (Komma-getrennt)"}
                  </label>
                  <input
                    type="text"
                    required
                    value={customKeywords}
                    onChange={(e) => setCustomKeywords(e.target.value)}
                    placeholder={searchMode === "POSITIVE" ? "z.B. In den Warenkorb, Tickets jetzt verfügbar" : "z.B. Sold out, Zurzeit nicht verfügbar, Ausverkauft"}
                    className="w-full bg-[#111] border border-[#333] focus:border-amber-500 rounded-md p-3 text-sm text-white outline-none transition-colors"
                  />
                  <p className="text-gray-600 text-xs mt-1">
                    {searchMode === "POSITIVE" 
                      ? "Trag hier Wörter ein, die auf der Seite stehen, sobald man buchen kann. (z.B. In den Warenkorb)"
                      : "Trag hier Wörter ein, die jetzt dort stehen solange es blockiert ist (z.B. Sold Out). Sobald die weg sind, gibt es Alarm!"}
                  </p>
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-[#a1a1aa] uppercase tracking-wider mb-2">
                Stadt-Filter <span className="text-gray-600 font-normal normal-case">(optional)</span>
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="z.B. München, Berlin ..."
                className="w-full bg-[#0A0A0A] border border-[#333] focus:border-indigo-500 rounded-md p-3 text-sm text-white outline-none transition-colors"
              />
              <p className="text-gray-600 text-xs mt-1">Alarm nur wenn Tickets für diese Stadt gefunden werden.</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#a1a1aa] uppercase tracking-wider mb-2">
                Pr&uuml;f-Intervall (Sekunden)
              </label>
              <select
                value={interval}
                onChange={(e) => setIntervalTime(Number(e.target.value))}
                className="w-full bg-[#0A0A0A] border border-[#333] focus:border-indigo-500 rounded-md p-3 text-sm text-white outline-none transition-colors"
              >
                <option value={15}>Sehr schnell (15 Sekunden)</option>
                <option value={30}>Normal (30 Sekunden)</option>
                <option value={60}>Langsam (60 Sekunden)</option>
                <option value={120}>Sehr Langsam (2 Minuten)</option>
                <option value={300}>Entspannt (5 Minuten)</option>
              </select>
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={loading}
                className="w-full sm:w-auto flex items-center justify-center gap-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 py-3 px-6 rounded-md transition-colors disabled:opacity-50 touch-manipulation"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <PlusCircle className="w-5 h-5"/>}
                Event-Überwachung starten
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
