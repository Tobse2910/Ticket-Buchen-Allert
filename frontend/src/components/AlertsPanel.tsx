import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Bell, Loader2, Play, CheckCircle2, XCircle } from 'lucide-react';

export function AlertsPanel() {
  const [monitors, setMonitors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    const fetchMonitors = async () => {
      try {
        const res = await axios.get(`${process.env.REACT_APP_API_URL || 'http://localhost:3001'}/api/monitors`);
        setMonitors(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchMonitors();
  }, []);

  const triggerTestAlert = async (id: number) => {
    try {
      await axios.post(`${process.env.REACT_APP_API_URL || 'http://localhost:3001'}/api/trigger`, {
        monitorId: id,
        status: 'AVAILABLE'
      });
      setToast({ message: 'Test-Alarm erfolgreich an Telegram gesendet!', type: 'success' });
      setTimeout(() => setToast(null), 3500);
    } catch (err) {
      console.error(err);
      setToast({ message: 'Fehler beim Senden des Test-Alarms!', type: 'error' });
      setTimeout(() => setToast(null), 3500);
    }
  };

  if (loading) return <div className="text-[#a1a1aa] flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin" /></div>;

  return (
    <div className="bg-[#111] border border-[#222] rounded-xl p-6">
      <h3 className="text-white font-medium mb-6 flex items-center gap-2">
        <Bell className="w-5 h-5 text-amber-500" />
        Überwachungs-Alerts
      </h3>
      <div className="space-y-4">
        {monitors.map(m => (
          <div key={m.id} className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-[#1a1a1a] rounded-lg border border-[#333]">
            <div>
              <h4 className="text-white font-medium">{m.name}</h4>
              <p className="text-xs text-gray-400 mt-1">{m.triggers} Triggers bisher</p>
            </div>
            <button
              onClick={() => triggerTestAlert(m.id)}
              className="flex items-center justify-center gap-2 text-xs font-medium text-white bg-[#222] hover:bg-[#333] transition-colors py-2 px-4 rounded-md border border-[#444]"
            >
              <Play className="w-4 h-4 text-emerald-500"/> Test-Alarm
            </button>
          </div>
        ))}
        {monitors.length === 0 && (
          <p className="text-gray-500 text-sm">Keine Monitore vorhanden.</p>
        )}
      </div>

      {toast && (
        <div className="fixed top-6 right-6 z-[1000] bg-[#111111] border border-[#2A2A2A] rounded-xl p-4 shadow-2xl flex items-start gap-4 max-w-sm animate-fade-in">
          <div className={`${toast.type === 'success' ? 'bg-emerald-500/20' : 'bg-red-500/20'} p-2 rounded-full mt-0.5`}>
            {toast.type === 'success' ? (
              <CheckCircle2 className="text-emerald-500 w-5 h-5" />
            ) : (
              <XCircle className="text-red-500 w-5 h-5" />
            )}
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white">
              {toast.type === 'success' ? 'Erfolg' : 'Fehler'}
            </h4>
            <p className="text-xs text-gray-400 mt-1">{toast.message}</p>
          </div>
        </div>
      )}
    </div>
  );
}
