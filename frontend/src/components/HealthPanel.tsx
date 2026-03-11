import React, { useState, useEffect } from "react";
import axios from "axios";
import { Activity, Cpu, Database, Server, RefreshCw, Layers } from "lucide-react";
import { API_BASE } from "../api";

interface Health {
  status: string;
  uptime: number;
  memoryUsage: {
    rss: number;
    heapTotal: number;
    heapUsed: number;
    external: number;
  };
  timestamp: string;
  version: string;
  botConnected: boolean;
}

export function HealthPanel() {
  const [health, setHealth] = useState<Health | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const res = await axios.get(`${API_BASE}/api/health`);
        setHealth(res.data);
      } catch (err) {
        console.error("Fehler beim Laden der System-Gesundheit", err);
      } finally {
        setLoading(false);
      }
    };
    fetchHealth();
    
    const intervalId = setInterval(fetchHealth, 10000); // 10 sec update
    return () => clearInterval(intervalId);
  }, []);

  const formatUptime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${h}h ${m}m ${s}s`;
  };

  const formatBytes = (bytes: number) => {
    return (bytes / 1024 / 1024).toFixed(2) + " MB";
  };

  if (loading) return <div className="text-[#a1a1aa] flex justify-center py-10"><RefreshCw className="w-6 h-6 animate-spin" /></div>;
  if (!health) return <div className="text-red-500 flex justify-center">System Offline</div>;

  return (
    <div className="bg-[#111] border border-[#222] rounded-xl p-4 md:p-6">
      <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
        <h3 className="text-white font-medium flex items-center gap-2">
          <Activity className="w-5 h-5 text-emerald-500" />
          System Health
        </h3>
        <span className="text-xs text-[#a1a1aa] flex items-center gap-1 bg-[#1a1a1a] px-2 py-1 rounded-md border border-[#333]">
          <Layers className="w-3 h-3"/> Version {health.version}
        </span>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6">
        
        {/* Status Card */}
        <div className="bg-[#1a1a1a] p-3 md:p-4 rounded-lg border border-[#333] flex items-center gap-3">
          <div className={`p-2 md:p-3 rounded-full shrink-0 ${health.status === 'healthy' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
             <Server className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] md:text-xs text-[#a1a1aa] font-medium tracking-wider uppercase">Status</p>
            <p className="text-sm md:text-lg font-semibold text-white mt-0.5 capitalize truncate">{health.status}</p>
          </div>
        </div>

        {/* Uptime Card */}
        <div className="bg-[#1a1a1a] p-3 md:p-4 rounded-lg border border-[#333] flex items-center gap-3">
          <div className="p-2 md:p-3 rounded-full shrink-0 bg-indigo-500/10 text-indigo-500">
             <Activity className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] md:text-xs text-[#a1a1aa] font-medium tracking-wider uppercase">Uptime</p>
            <p className="text-sm md:text-lg font-semibold text-white mt-0.5 truncate">{formatUptime(health.uptime)}</p>
          </div>
        </div>

         {/* Memory Card */}
        <div className="bg-[#1a1a1a] p-3 md:p-4 rounded-lg border border-[#333] flex items-center gap-3">
          <div className="p-2 md:p-3 rounded-full shrink-0 bg-amber-500/10 text-amber-500">
             <Cpu className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] md:text-xs text-[#a1a1aa] font-medium tracking-wider uppercase">Speicher</p>
            <p className="text-sm md:text-lg font-semibold text-white mt-0.5 truncate">{formatBytes(health.memoryUsage.heapUsed)}</p>
          </div>
        </div>

        {/* Telegram Card */}
        <div className="bg-[#1a1a1a] p-3 md:p-4 rounded-lg border border-[#333] flex items-center gap-3">
          <div className={`p-2 md:p-3 rounded-full shrink-0 ${health.botConnected ? 'bg-blue-500/10 text-blue-500' : 'bg-red-500/10 text-red-500'}`}>
             <Database className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] md:text-xs text-[#a1a1aa] font-medium tracking-wider uppercase">Telegram</p>
            <p className="text-sm md:text-lg font-semibold text-white mt-0.5 truncate">{health.botConnected ? 'Verbunden' : 'Offline'}</p>
          </div>
        </div>

      </div>

      {/* Memory Details */}
      <div className="bg-[#1a1a1a] p-4 rounded-lg border border-[#333]">
         <h4 className="text-sm font-medium text-white mb-4 flex items-center gap-2 border-b border-[#222] pb-2">
            Speicherauslastung Details
         </h4>
         <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
             <div className="bg-[#0A0A0A] p-3 rounded-md border border-[#222]">
                <p className="text-xs text-[#a1a1aa] mb-1">RSS</p>
                <p className="text-sm font-mono text-emerald-500">{formatBytes(health.memoryUsage.rss)}</p>
             </div>
             <div className="bg-[#0A0A0A] p-3 rounded-md border border-[#222]">
                <p className="text-xs text-[#a1a1aa] mb-1">Heap Total</p>
                <p className="text-sm font-mono text-amber-500">{formatBytes(health.memoryUsage.heapTotal)}</p>
             </div>
             <div className="bg-[#0A0A0A] p-3 rounded-md border border-[#222]">
                <p className="text-xs text-[#a1a1aa] mb-1">Heap Used</p>
                <p className="text-sm font-mono text-indigo-500">{formatBytes(health.memoryUsage.heapUsed)}</p>
             </div>
             <div className="bg-[#0A0A0A] p-3 rounded-md border border-[#222]">
                <p className="text-xs text-[#a1a1aa] mb-1">External</p>
                <p className="text-sm font-mono text-purple-500">{formatBytes(health.memoryUsage.external)}</p>
             </div>
         </div>
         <p className="text-[10px] text-gray-600 mt-4 text-right">Zuletzt aktualisiert: {new Date(health.timestamp).toLocaleTimeString()}</p>
      </div>

    </div>
  );
}