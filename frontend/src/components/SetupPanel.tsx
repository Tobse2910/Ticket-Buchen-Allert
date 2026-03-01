import React, { useState, useEffect } from "react";
import axios from "axios";
import { Copy, Save, Loader2, Link2, Key, MessageCircle, Settings as SettingsIcon, CheckCircle2, XCircle } from "lucide-react";

interface Settings {
  n8nWebhookUrl: string;
  telegramToken: string;
  telegramChatId: string;
  checkIntervals: string;
  userAgent: string;
}

export function SetupPanel() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const [formToken, setFormToken] = useState("");
  const [formChatId, setFormChatId] = useState("");

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await axios.get(`${process.env.REACT_APP_API_URL || "http://localhost:3001"}/api/settings`);
        setSettings(res.data);
        setFormToken(res.data.telegramToken || "");
        setFormChatId(res.data.telegramChatId || "");
      } catch (err) {
        console.error("Fehler beim Laden der Einstellungen", err);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
        const res = await axios.post(`${process.env.REACT_APP_API_URL || "http://localhost:3001"}/api/settings`, {
            telegramToken: formToken,
            telegramChatId: formChatId
        });
        if(res.data.success) {
            setSettings(res.data.settings);
            setToast({ message: "Erfolgreich gespeichert und Bot neugestartet!", type: "success" });
            setTimeout(() => setToast(null), 3500);
        }
    } catch(err) {
        console.error(err);
        setToast({ message: "Fehler beim Speichern der Einstellungen", type: "error" });
        setTimeout(() => setToast(null), 3500);
    } finally {
        setSaving(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) return <div className="text-[#a1a1aa] flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  if (!settings) return <div className="text-red-500 flex justify-center">Fehler beim Laden</div>;

  return (
    <div className="bg-[#111] border border-[#222] rounded-xl p-6">
      <h3 className="text-white font-medium mb-6 flex items-center gap-2">
        <SettingsIcon className="w-5 h-5 text-indigo-500" />
        Backend Konfiguration
      </h3>
      
      <div className="space-y-6">
        
        {/* n8n Webhook */}
        <div className="bg-[#1a1a1a] p-4 rounded-lg border border-[#333]">
          <label className="text-xs font-semibold text-[#a1a1aa] uppercase tracking-wider mb-2 flex items-center gap-2">
            <Link2 className="w-4 h-4"/> N8N Webhook URL
          </label>
          <div className="flex bg-[#0A0A0A] p-3 rounded-md border border-[#222] relative group">
            <code className="text-sm font-mono text-emerald-400 break-all">{settings.n8nWebhookUrl}</code>
            <button 
              onClick={() => copyToClipboard(settings.n8nWebhookUrl)}
              className="absolute right-2 top-2 p-1.5 bg-[#222] hover:bg-[#333] rounded text-[#a1a1aa] transition-colors opacity-0 group-hover:opacity-100"
              title="Kopieren"
            >
              <Copy className="w-4 h-4"/>
            </button>
          </div>
          <p className="text-xs text-[#a1a1aa] mt-2">Diese URL wird aufgerufen, wenn ein Ticket im Status "AVAILABLE" ist.</p>
        </div>

        {/* Telegram Config */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-[#1a1a1a] p-4 rounded-lg border border-[#333]">    
             <label className="text-xs font-semibold text-[#a1a1aa] uppercase tracking-wider mb-2 flex items-center gap-2">
                <Key className="w-4 h-4"/> Telegram Bot Token
            </label>
            <input 
              type="text" 
              value={formToken} 
              onChange={e => setFormToken(e.target.value)} 
              placeholder="799525...:AA..."
              className="w-full bg-[#0A0A0A] border border-[#222] rounded-md p-3 text-sm font-mono text-amber-500 focus:outline-none focus:border-indigo-500" 
            />
          </div>
          <div className="bg-[#1a1a1a] p-4 rounded-lg border border-[#333]">    
             <label className="text-xs font-semibold text-[#a1a1aa] uppercase tracking-wider mb-2 flex items-center gap-2">
                <MessageCircle className="w-4 h-4"/> Telegram Chat ID
            </label>
            <input 
              type="text" 
              value={formChatId} 
              onChange={e => setFormChatId(e.target.value)} 
              placeholder="123456789"
              className="w-full bg-[#0A0A0A] border border-[#222] rounded-md p-3 text-sm font-mono text-amber-500 focus:outline-none focus:border-indigo-500" 
            />
          </div>
        </div>

        {/* Buttons */}
        <div className="flex justify-end mt-4 mb-8">
           <button 
             onClick={handleSave} 
             disabled={saving}
             className="flex items-center gap-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 py-2.5 px-6 rounded-md shadow-lg transition-colors disabled:opacity-50"
           >
             {saving ? <Loader2 className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4"/>} Speichern
           </button>
        </div>

        {/* General Config */}
        <div className="bg-[#1a1a1a] p-4 rounded-lg border border-[#333]">
          <h4 className="text-sm font-medium text-white mb-3">Allgemeine Scraping-Parameter</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="block text-xs text-[#a1a1aa] mb-1">User-Agent</span>
              <input type="text" disabled value={settings.userAgent} className="w-full bg-[#0A0A0A] border border-[#222] rounded-md p-2 text-xs text-white" />
            </div>
             <div>
              <span className="block text-xs text-[#a1a1aa] mb-1">Intervalle</span>
              <input type="text" disabled value={settings.checkIntervals} className="w-full bg-[#0A0A0A] border border-[#222] rounded-md p-2 text-xs text-white" />
            </div>
          </div>
          <div className="mt-4 flex justify-end">
             <button disabled className="flex items-center gap-2 text-xs font-medium text-[#a1a1aa] bg-[#222] py-2 px-4 rounded-md border border-[#333] cursor-not-allowed">
               <Save className="w-4 h-4"/> Änderungen speichern (Schreibgeschützt)
             </button>
          </div>
        </div>

      </div>

      {toast && (
        <div className="fixed top-6 right-6 z-[1000] bg-[#111111] border border-[#2A2A2A] rounded-xl p-4 shadow-2xl flex items-start gap-4 max-w-sm animate-fade-in">
          <div className={`${toast.type === "success" ? "bg-emerald-500/20" : "bg-red-500/20"} p-2 rounded-full mt-0.5`}>
            {toast.type === "success" ? (
              <CheckCircle2 className="text-emerald-500 w-5 h-5" />
            ) : (
              <XCircle className="text-red-500 w-5 h-5" />
            )}
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white">
              {toast.type === "success" ? "Erfolg" : "Fehler"}
            </h4>
            <p className="text-xs text-gray-400 mt-1">{toast.message}</p>
          </div>
        </div>
      )}

      {copied && (
        <div className="fixed bottom-4 right-4 bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-lg animate-fade-in">
          In Zwischenablage kopiert!
        </div>
      )}
    </div>
  );
}