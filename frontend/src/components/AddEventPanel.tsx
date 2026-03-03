import React, { useState, useEffect } from "react";
import axios from "axios";
import { PlusCircle, Ticket, Search, Loader2 } from "lucide-react";

export function AddEventPanel({ onAdded }: { onAdded?: () => void }) {
  const [mode, setMode] = useState<"search" | "manual">("search");

  // Manual State
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [interval, setIntervalTime] = useState(30);

  // New states for custom sites
  const [platform, setPlatform] = useState<"ticketmaster" | "custom">("ticketmaster");
  const [searchMode, setSearchMode] = useState<"NEGATIVE" | "POSITIVE">("POSITIVE");
  const [customKeywords, setCustomKeywords] = useState("");

  // Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{name: string, url: string, type: string, info: string, location?: string}[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{type: "success" | "error", text: string} | null>(null);

  // Auto-Search Effect
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchQuery.trim().length > 2 && mode === "search") {
        performSearch();
      } else if (searchQuery.trim().length <= 2) {
          setSearchResults([]);
      }
    }, 600);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, mode]);

  const performSearch = async () => {
    setIsSearching(true);
    // setSearchResults([]); // Don't clear immediately to avoid flicker
    setMessage(null);

    try {
      const res = await axios.get(`${process.env.REACT_APP_API_URL || "http://localhost:3001"}/api/search?q=${encodeURIComponent(searchQuery)}`);
      setSearchResults(res.data);
      if(res.data.length === 0 && searchQuery.length > 3) {
        // Optional: Zeige Hinweis, aber kein Fehler-Popup
      }
    } catch(err) {
      console.error(err);
      setMessage({ type: "error", text: "Fehler bei der Event-Suche." });
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if(!searchQuery.trim()) return;
    performSearch();
  };

  const handleAddEvent = async (eventName: string, eventUrl: string, eventInterval: number = 30, tPlatform: "ticketmaster"|"custom" = "ticketmaster") => {
    setLoading(true);
    setMessage(null);

    try {
      if (tPlatform === "ticketmaster" && !eventUrl.includes("ticketmaster.de")) {
         throw new Error("Für diese Auswahl werden nur Ticketmaster.de Seiten unterstützt!");
      }

      await axios.post(`${process.env.REACT_APP_API_URL || "http://localhost:3001"}/api/events`, {
        name: eventName,
        url: eventUrl,
        interval: eventInterval,
        searchMode: tPlatform === "custom" ? searchMode : "NEGATIVE",
        customKeywords: tPlatform === "custom" ? customKeywords : []
      });

      setName("");
      setUrl("");
      setCustomKeywords("");

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

  return (
    <div className="bg-[#111] border border-[#222] rounded-xl p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-white font-medium flex items-center gap-2">
          <Ticket className="w-5 h-5 text-indigo-500" />
          Neues Event überwachen
        </h3>

        <div className="flex bg-[#0A0A0A] p-1 rounded-lg border border-[#333]">
          <button
            type="button"
            onClick={() => setMode("search")}
            className={`px-4 py-1.5 text-xs font-medium rounded-md transition-colors ${mode === "search" ? "bg-[#333] text-white" : "text-[#888] hover:text-white"}`}
          >
            Suchen
          </button>
          <button
            type="button"
            onClick={() => setMode("manual")}
            className={`px-4 py-1.5 text-xs font-medium rounded-md transition-colors ${mode === "manual" ? "bg-[#333] text-white" : "text-[#888] hover:text-white"}`}
          >
            Manuelle URL
          </button>
        </div>
      </div>

      <div className="bg-[#1a1a1a] p-6 rounded-lg border border-[#333]">
        <p className="text-[#a1a1aa] text-sm mb-6">
          {mode === "search"
            ? "Suche direkt auf Ticketmaster nach einem Event, Künstler oder Ort. Wir finden den Link für dich."
            : "Hier kannst du einen Ticketmaster-Link oder eigene Webseiten (wie Summer-Breeze, Tomorrowland) einfügen."}
        </p>

        {message && (
          <div className={`p-4 rounded-md mb-6 text-sm font-medium ${message.type === "success" ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" : "bg-red-500/10 text-red-500 border border-red-500/20"}`}>
            {message.text}
          </div>
        )}

        {mode === "search" ? (
          <div>
            <form onSubmit={handleSearch} className="flex gap-3 mb-6">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="z.B. Adele München..."
                className="flex-1 bg-[#0A0A0A] border border-[#333] focus:border-indigo-500 rounded-md p-3 text-sm text-white outline-none transition-colors"
              />
              <button
                type="submit"
                disabled={isSearching}
                className="flex items-center justify-center gap-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 py-3 px-6 rounded-md transition-colors disabled:opacity-50"
              >
                {isSearching ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                Suchen
              </button>
            </form>

            {searchResults.length > 0 && (
              <div className="space-y-3">
                <label className="block text-xs font-semibold text-[#a1a1aa] uppercase tracking-wider mb-2">Ergebnisse</label>
                {searchResults.map((res, i) => (
                  <div key={i} className="flex items-center justify-between bg-[#0A0A0A] border border-[#333] p-4 rounded-md group hover:border-[#444] transition-colors">
                    <div className="flex-1 pr-4">
                      
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${res.type === 'ARTIST' ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/20 text-blue-400'}`}>
                           {res.type === 'ARTIST' ? 'KÜNSTLER' : 'EVENT'}
                        </span>
                        {res.location && (
                           <span className="text-[10px] text-amber-500 font-bold bg-amber-500/10 px-1.5 py-0.5 rounded uppercase">
                             {res.location}
                           </span>
                        )}
                        {res.info && (
                           <span className="text-[10px] text-gray-500 font-mono">
                             {res.info}
                           </span>
                        )}
                      </div>

                      <p className="text-white text-sm font-medium mb-1 line-clamp-1">{res.name}</p>
                      
                      <div className="flex items-center gap-2">
                        <a href={res.url} target="_blank" rel="noreferrer" className="text-indigo-400 hover:text-indigo-300 text-xs truncate max-w-[200px] block opacity-70 hover:opacity-100">
                          {res.url}
                        </a>
                        {/* Optional: Add a check button or similar */}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleAddEvent(res.name, res.url, 30, "ticketmaster")}
                      disabled={loading}
                      title="Status prüfen & Überwachung starten"
                      className="shrink-0 flex items-center gap-1.5 text-xs font-medium bg-[#222] hover:bg-emerald-500/10 hover:text-emerald-500 hover:border-emerald-500/30 text-[#a1a1aa] border border-[#333] py-2 px-4 rounded transition-all disabled:opacity-50"
                    >
                      <PlusCircle className="w-4 h-4" />
                      Prüfen & Alarm
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm text-white cursor-pointer">
                <input 
                  type="radio" 
                  name="platform" 
                  checked={platform === "ticketmaster"} 
                  onChange={() => setPlatform("ticketmaster")}
                  className="accent-indigo-500"
                /> Ticketmaster
              </label>
              <label className="flex items-center gap-2 text-sm text-white cursor-pointer">
                <input 
                  type="radio" 
                  name="platform" 
                  checked={platform === "custom"} 
                  onChange={() => setPlatform("custom")}
                  className="accent-indigo-500"
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
                Prüf-Intervall (Sekunden)
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

            <div className="pt-4 flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 py-3 px-6 rounded-md transition-colors disabled:opacity-50"
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
