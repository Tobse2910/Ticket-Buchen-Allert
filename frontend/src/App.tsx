import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { Activity, Server, Clock, AlertCircle, PlayCircle, CheckCircle2, XCircle, LayoutDashboard, Bell, Settings, Activity as HeartPulse, PlusCircle, Trash2, Menu, X, Info } from "lucide-react";
import { AlertsPanel } from "./components/AlertsPanel";
import { SetupPanel } from "./components/SetupPanel";
import { HealthPanel } from "./components/HealthPanel";
import { AddEventPanel } from "./components/AddEventPanel";
import { InfoPanel } from "./components/InfoPanel";

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:3001/api";

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

function MonitorPanel({ m, onTrigger, onDelete }: { m: any, onTrigger: any, onDelete: any }) {
  return (
    <div className="bg-[#111111] border border-[#2A2A2A] rounded-2xl p-6 transition-all duration-300 hover:border-[#3A3A3A] group flex flex-col justify-between hidden-card-shadow">
      <div>
        <div className="flex justify-between items-start mb-4">
          <div className="space-y-1.5 flex-1 pr-4">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center rounded-md bg-[#222] px-2 py-1 text-xs font-medium text-gray-400 ring-1 ring-inset ring-gray-600/20">
                {m.shortName}
              </span>
              <button 
                onClick={() => onDelete(m.id)}
                className="text-gray-500 hover:text-red-500 transition-colors p-1"
                title="Monitor löschen"
              >
                <Trash2 size={14} />
              </button>
            </div>
            <h3 className="text-xl font-semibold text-white tracking-tight break-all cursor-pointer hover:text-indigo-400 transition-colors" onClick={() => window.open(m.url, '_blank')} title="Ticketmaster Link öffnen">{m.name}</h3>
          </div>
          <StatusBadge status={m.status} />
        </div>

        <div className="mt-6 mb-6">
          <div className="text-sm font-medium text-gray-400 mb-2">Ping Latenz</div>
          <PingBar ms={m.ping} />
        </div>

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
            <div className="text-xs text-gray-500 mb-1">Trigger</div>
            <div className={`text-sm font-semibold ${m.triggers > 0 ? "text-emerald-500" : "text-gray-200"}`}>{m.triggers}</div>
          </div>
        </div>
      </div>

      <button
        onClick={() => onTrigger(m.id)}
        className="mt-6 w-full flex items-center justify-center gap-2 bg-[#1A1A1A] hover:bg-[#222222] text-white border border-[#333] py-2.5 rounded-xl text-sm font-medium transition-all group-hover:border-[#444]"
      >
        <PlayCircle size={16} className="text-gray-400 group-hover:text-white transition-colors"/>
        Simulieren
      </button>
    </div>
  );
}

export default function App() {
  const [tab, setTab] = useState("dashboard");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [monitors, setMonitors] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [toast, setToast] = useState<any>(null);
  
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

  useEffect(() => {
    fetchMonitors();
    fetchLogs();
    const interval = setInterval(() => {
        fetchMonitors();
        fetchLogs();
    }, 3000);
    return () => clearInterval(interval);
  }, [fetchMonitors, fetchLogs]);

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
        <div className="fixed top-6 right-6 z-[1000] bg-[#111111] border border-[#2A2A2A] rounded-xl p-4 shadow-2xl flex items-start gap-4 max-w-sm animate-fade-in">
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
        <div className="max-w-[1400px] mx-auto px-6 h-16 flex items-center justify-between">
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
             <div className="flex items-center gap-2 text-xs font-medium text-gray-400 bg-[#111] px-3 py-1.5 rounded-full border border-[#2A2A2A]">
               <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                 <span className="hidden md:inline">System Online</span>
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
            <div className="md:hidden border-t border-[#2A2A2A] bg-[#0A0A0A] p-4 absolute w-full left-0 shadow-xl">
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

      <main className="max-w-[1400px] mx-auto p-6 md:p-8">

        <div style={{ display: tab === "dashboard" ? "block" : "none" }}>
          <div className="space-y-8 animate-fade-in">
            
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-white tracking-tight mb-2">Übersicht</h1>
                <p className="text-gray-400">Verwalte deine Termin- und Ticket-Monitore in Echtzeit.</p>
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
                  <div key={idx} className="flex flex-col sm:flex-row gap-2 sm:gap-4 px-6 py-3 border-b border-[#1A1A1A] hover:bg-[#151515] transition-colors text-sm">
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
