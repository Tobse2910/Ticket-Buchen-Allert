import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { API_URL } from "./api";
import { Activity, Server, Clock, AlertCircle, PlayCircle, CheckCircle2, XCircle, LayoutDashboard, Bell, Settings, Activity as HeartPulse, PlusCircle, Trash2, Menu, X, Info } from "lucide-react";
import { AlertsPanel } from "./components/AlertsPanel";
import { SetupPanel } from "./components/SetupPanel";
import { HealthPanel } from "./components/HealthPanel";
import { AddEventPanel } from "./components/AddEventPanel";
import { InfoPanel } from "./components/InfoPanel";

const API_BASE_URL = API_URL;

// ngrok-Warnseite im Browser überspringen (gilt für alle axios-Calls global)
axios.defaults.headers.common["ngrok-skip-browser-warning"] = "1";

const STATUS_CONFIG: Record<string, any> = {
  AVAILABLE:  { label: "Verfügbar",     bg: "bg-emerald-500/10", text: "text-emerald-500", border: "border-emerald-500/20", icon: CheckCircle2 },
  WAITING:    { label: "Warten",        bg: "bg-amber-500/10", text: "text-amber-500", border: "border-amber-500/20", icon: Clock },
  QUEUE:      { label: "Warteschlange", bg: "bg-orange-500/10", text: "text-orange-500", border: "border-orange-500/20", icon: Activity },
  OFFLINE:    { label: "Offline",       bg: "bg-gray-500/10", text: "text-gray-400", border: "border-gray-500/20", icon: XCircle },
  ERROR:      { label: "Fehler",        bg: "bg-rose-500/10", text: "text-rose-500", border: "border-rose-500/20", icon: AlertCircle },
};

function StatusBadge({ status }: { status: string }) {
  const c = STATUS_CONFIG[status] || STATUS_CONFIG.OFFLINE;
  const Icon = c.icon;
  return (
    <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border ${c.bg} ${c.text} ${c.border} text-xs font-medium`}>
      <Icon size={14} />
      <span>{c.label}</span>
    </div>
  );
}

function PingBar({ ms }: { ms: number }) {
  const w = Math.min(100, (ms / 1200) * 100);
  const col = ms < 400 ? "bg-emerald-500" : ms < 800 ? "bg-amber-500" : "bg-rose-500";
  return (
    <div className="flex items-center gap-3 w-full">
      <div className="flex-1 h-1.5 bg-[#2A2A2A] rounded-full overflow-hidden">
        <div className={`h-full transition-all duration-500 rounded-full ${col}`} style={{ width: `${w}%` }} />
      </div>
      <span className="text-xs text-gray-400 w-10 text-right">{ms}ms</span>
    </div>
  );
}

const CARD_BORDER: Record<string, string> = {
  AVAILABLE: "border-emerald-500/60 shadow-emerald-500/10 shadow-lg",
  WAITING:   "border-rose-500/30",
  QUEUE:     "border-amber-500/40",
  OFFLINE:   "border-[#2A2A2A]",
  ERROR:     "border-rose-500/40",
};

const STATUS_DOT: Record<string, string> = {
  AVAILABLE: "bg-emerald-500 animate-pulse",
  WAITING:   "bg-rose-500",
  QUEUE:     "bg-amber-500 animate-pulse",
  OFFLINE:   "bg-gray-500",
  ERROR:     "bg-rose-500",
};

function MonitorPanel({ m, onTrigger, onDelete }: { m: any, onTrigger: any, onDelete: any }) {
  const borderClass = CARD_BORDER[m.status] || CARD_BORDER.OFFLINE;
  const dotClass    = STATUS_DOT[m.status]   || STATUS_DOT.OFFLINE;
  const isWatch = m.mode === 'SEARCH_WATCH';
  return (
    <div className={`bg-[#111111] border rounded-2xl p-4 md:p-6 transition-all duration-300 group flex flex-col justify-between hidden-card-shadow ${borderClass}`}>
      <div>
        <div className="flex justify-between items-start mb-4">
          <div className="space-y-1.5 flex-1 pr-4">
            <div className="flex items-center gap-2 flex-wrap">
              {/* Status-Punkt */}
              <span className={`w-4 h-4 rounded-full shrink-0 ${dotClass}`} title={m.status} />
              <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${isWatch ? 'bg-amber-500/10 text-amber-400 ring-amber-500/20' : 'bg-[#222] text-gray-400 ring-gray-600/20'}`}>
                {isWatch ? '📡 RADAR' : m.shortName}
              </span>
              {(m.city) && (
                <span className="inline-flex items-center rounded-md bg-indigo-500/10 px-2 py-1 text-xs font-medium text-indigo-400 ring-1 ring-inset ring-indigo-500/20">
                  📍 {m.city}
                </span>
              )}
              <button 
                onClick={() => onDelete(m.id)}
                className="text-gray-500 hover:text-red-500 transition-colors p-1.5 touch-manipulation ml-auto"
                title="Monitor löschen"
              >
                <Trash2 size={14} />
              </button>
            </div>
            <h3 className="text-base md:text-xl font-semibold text-white tracking-tight break-words cursor-pointer hover:text-indigo-400 transition-colors line-clamp-2" onClick={() => window.open(m.url, '_blank')} title="Link öffnen">{m.name}</h3>
            {isWatch && m.searchQuery && (
              <p className="text-xs text-amber-400/70 font-mono mt-1">🔍 Suche: „{m.searchQuery}{m.city ? ` ${m.city}` : ''}"</p>
            )}
          </div>
          <StatusBadge status={m.status} />
        </div>

        {!isWatch && (
          <div className="mt-6 mb-6">
            <div className="text-sm font-medium text-gray-400 mb-2">Ping Latenz</div>
            <PingBar ms={m.ping} />
          </div>
        )}
        {isWatch && (
          <div className="mt-4 mb-6 p-3 bg-amber-500/5 border border-amber-500/15 rounded-xl text-xs text-amber-400/80">
            Beobachtet Ticketmaster auf neue Events. Alarm bei jedem Neu-Listing.
          </div>
        )}

        <div className="grid grid-cols-3 gap-4 border-t border-[#2A2A2A] pt-4">
          <div>
            <div className="text-xs text-gray-500 mb-1">Checks</div>
            <div className="text-sm font-semibold text-gray-200">{m.checks.toLocaleString("de-DE")}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500 mb-1">Intervall</div>
            <div className="text-sm font-semibold text-gray-200">{m.interval}s</div>
          </div>
          <div>
            <div className="text-xs text-gray-500 mb-1">{isWatch ? 'Neue Events' : 'Trigger'}</div>
            <div className={`text-sm font-semibold ${m.triggers > 0 ? "text-emerald-500" : "text-gray-200"}`}>{m.triggers}</div>
          </div>
        </div>
      </div>

      {!isWatch && (
        <button
          onClick={() => onTrigger(m.id)}
          className="mt-6 w-full flex items-center justify-center gap-2 bg-[#1A1A1A] hover:bg-[#222222] text-white border border-[#333] py-2.5 rounded-xl text-sm font-medium transition-all group-hover:border-[#444]"
        >
          <PlayCircle size={16} className="text-gray-400 group-hover:text-white transition-colors"/>
          Simulieren
        </button>
      )}
    </div>
  );
}

export default function App() {
  const [tab, setTab] = useState("dashboard");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [monitors, setMonitors] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [toast, setToast] = useState<any>(null);
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);
  const [tunnelUrl, setTunnelUrl] = useState<string | null>(null);
  const [reconnectIn, setReconnectIn] = useState<number>(0);
  
  const fetchMonitors = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/events`);
      setMonitors(res.data);
    } catch (err) {
      // transient network errors ignored during polling
    }
  }, []);

  const fetchLogs = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/history`);
      setLogs(res.data);
    } catch (err) {
      // transient network errors ignored during polling
    }
  }, []);

  const checkHealth = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/health`, { timeout: 4000 });
      setBackendOnline(true);
      setReconnectIn(0);
      if (res.data?.tunnelUrl) setTunnelUrl(res.data.tunnelUrl);
    } catch {
      setBackendOnline(false);
    }
  }, []);

  // Countdown-Anzeige wenn offline
  useEffect(() => {
    if (!backendOnline && backendOnline !== null) {
      setReconnectIn(10);
      const t = setInterval(() => setReconnectIn(v => Math.max(0, v - 1)), 1000);
      return () => clearInterval(t);
    }
  }, [backendOnline]);

  useEffect(() => {
    fetchMonitors();
    fetchLogs();
    checkHealth();
    const interval = setInterval(() => {
        fetchMonitors();
        fetchLogs();
        checkHealth();
    }, 3000);
    return () => clearInterval(interval);
  }, [fetchMonitors, fetchLogs, checkHealth]);

  const handleTrigger = async (id: number) => {
    const mon = monitors.find(m => m.id === id);
    if (!mon) return;
    try {
        await axios.post(`${API_BASE_URL}/trigger`, { monitorId: id, status: "AVAILABLE" });
        setToast(mon);
        setTimeout(() => setToast(null), 5000);
        setTimeout(async () => {
            await axios.post(`${API_BASE_URL}/trigger`, { monitorId: id, status: "WAITING" });
        }, 9000);
    } catch (err) {}
  };

  const handleDelete = async (id: number) => {
    try {
      await axios.delete(`${API_BASE_URL}/events/${id}`);
      fetchMonitors();
    } catch (err) {
      console.error("Delete failed", err);
    }
  };

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "alerts", label: "Alerts", icon: Bell },
    { id: "add", label: "Neues Event", icon: PlusCircle },
    { id: "setup", label: "Setup", icon: Settings },
    { id: "health", label: "Health", icon: HeartPulse },
    { id: "info", label: "Info & Hilfe", icon: Info },
  ];

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-gray-200 font-sans selection:bg-[#333]">
      {toast && (
        <div className="fixed top-4 right-4 left-4 sm:left-auto sm:right-6 sm:top-6 z-[1000] bg-[#111111] border border-[#2A2A2A] rounded-xl p-4 shadow-2xl flex items-start gap-4 sm:max-w-sm animate-fade-in">
           <div className="bg-emerald-500/20 p-2 rounded-full mt-0.5">
             <CheckCircle2 className="text-emerald-500 w-5 h-5" />
           </div>
           <div>
             <h4 className="text-sm font-semibold text-white">Trigger erkannt</h4>
             <p className="text-xs text-gray-400 mt-1">{toast.name} hat den Status VERFÜGBAR erreicht. Benachrichtigung versendet.</p>
           </div>
        </div>
      )}

      <nav className="sticky top-0 z-[100] bg-[#0A0A0A]/80 backdrop-blur-md border-b border-[#2A2A2A]">
        <div className="max-w-[1400px] mx-auto px-4 md:px-6 h-14 md:h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
              <Server className="text-white w-4 h-4" />
            </div>
            <span className="font-semibold text-lg text-white tracking-tight">Ticket Buchen</span>
          </div>

          <div className="hidden md:flex items-center gap-1 bg-[#111] p-1 rounded-xl border border-[#222]">
            {navItems.map(item => {
              const Icon = item.icon;
              return (
                <button 
                  key={item.id} 
                  onClick={() => setTab(item.id)}
                  className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${tab === item.id ? "bg-[#222] text-white shadow-sm" : "text-gray-400 hover:text-gray-200 hover:bg-[#1A1A1A]"}`}
                >
                  <Icon size={16} />
                  {item.label}
                </button>
              )
            })}
          </div>

          <div className="flex items-center gap-4">
             <div className={`flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-full border cursor-pointer ${
               backendOnline === null ? 'text-gray-400 bg-[#111] border-[#2A2A2A]' :
               backendOnline ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' :
               'text-rose-400 bg-rose-500/10 border-rose-500/20'
             }`} onClick={() => !backendOnline && checkHealth()} title={tunnelUrl || ''}>
               <span className={`w-2 h-2 rounded-full ${
                 backendOnline === null ? 'bg-gray-500 animate-pulse' :
                 backendOnline ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
               }`} />
               <span className="hidden md:inline">
                 {backendOnline === null ? 'Verbinde...' :
                  backendOnline ? 'System Online' :
                  reconnectIn > 0 ? `Offline – Retry in ${reconnectIn}s` : 'Reconnecting...'}
               </span>
             </div>
               
               <button 
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="md:hidden p-2 bg-[#111] border border-[#222] rounded-lg text-gray-400 hover:text-white"
                >
                  {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
                </button>
            </div>
          </div>

          {/* Mobile Menu Dropdown */}
          {mobileMenuOpen && (
            <div className="md:hidden border-t border-[#2A2A2A] bg-[#0A0A0A] px-4 py-3 absolute w-full left-0 shadow-xl z-50">
               <div className="flex flex-col gap-2 bg-[#111] p-2 rounded-xl border border-[#222]">
                {navItems.map(item => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setTab(item.id);
                        setMobileMenuOpen(false);
                      }}
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${tab === item.id ? "bg-[#222] text-white shadow-sm" : "text-gray-400 hover:text-gray-200 hover:bg-[#1A1A1A]"}`}
                    >
                      <Icon size={18} />
                      {item.label}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
      </nav>

      <main className="max-w-[1400px] mx-auto p-4 md:p-8">

        <div style={{ display: tab === "dashboard" ? "block" : "none" }}>
          <div className="space-y-8 animate-fade-in">
            
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight mb-1 md:mb-2">Übersicht</h1>
                <p className="text-gray-400 text-sm">Verwalte deine Ticket-Monitore in Echtzeit.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {monitors.map(m => (
                <MonitorPanel key={m.id} m={m} onTrigger={handleTrigger} onDelete={handleDelete} />
              ))}
            </div>

            <div className="mt-8 bg-[#111111] border border-[#2A2A2A] rounded-2xl overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b border-[#2A2A2A] flex justify-between items-center bg-[#151515]">
                 <h3 className="font-semibold text-white">System Logs</h3>
                 <span className="text-xs bg-[#222] border border-[#333] px-2 py-1 rounded-md text-gray-400">Live</span>
              </div>
              <div className="max-h-[350px] overflow-y-auto w-full">
                {logs.map((l, idx) => (
                  <div key={idx} className="flex flex-col sm:flex-row gap-1 sm:gap-4 px-3 md:px-6 py-3 border-b border-[#1A1A1A] hover:bg-[#151515] transition-colors text-sm">
                    <span className="text-gray-500 font-mono text-xs w-24 shrink-0">{l.ts}</span>
                    <span className={`text-xs font-medium uppercase w-16 shrink-0 ${l.level === "WARN" ? "text-amber-500" : l.level === "ERR" ? "text-rose-500" : "text-blue-400"}`}>{l.level}</span>
                    <span className="text-gray-300 truncate">{l.msg}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
        
        <div style={{ display: tab === "alerts" ? "block" : "none" }}>
            <div className="animate-fade-in"><AlertsPanel /></div>
        </div>
        
        <div style={{ display: tab === "add" ? "block" : "none" }}>
            <div className="animate-fade-in"><AddEventPanel onAdded={() => { setTab("dashboard"); fetchMonitors(); }} /></div>
        </div>
        
        <div style={{ display: tab === "setup" ? "block" : "none" }}>
            <div className="animate-fade-in"><SetupPanel /></div>
        </div>
        
        <div style={{ display: tab === "health" ? "block" : "none" }}>
            <div className="animate-fade-in"><HealthPanel /></div>
        </div>

        <div style={{ display: tab === "info" ? "block" : "none" }}>
            <div className="animate-fade-in"><InfoPanel /></div>
        </div>
      </main>
    </div>
  );
}
