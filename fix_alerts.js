const fs = require('fs');
let contents = fs.readFileSync('frontend/src/components/AlertsPanel.tsx', 'utf8');

contents = contents.replace('const [loading, setLoading] = useState(true);', 'const [loading, setLoading] = useState(true);\n  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);');

contents = contents.replace('alert("Test-Alarm gesendet!");', 'setToast({ message: "Test-Alarm erfolgreich an Telegram gesendet!", type: "success" }); setTimeout(() => setToast(null), 3500);');

contents = contents.replace('alert("Fehler beim Senden!");', 'setToast({ message: "Fehler beim Senden des Test-Alarms!", type: "error" }); setTimeout(() => setToast(null), 3500);');

const jsxEnd = contents.lastIndexOf('</div>');
if(jsxEnd > -1) {
   let addition = 
      {toast && (
        <div className="fixed top-6 right-6 z-[1000] bg-[#111111] border border-[#2A2A2A] rounded-xl p-4 shadow-2xl flex items-start gap-4 max-w-sm animate-fade-in">
          <div className={\\ p-2 rounded-full mt-0.5\}>
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
    </div>
  );
}
;
   contents = contents.substring(0, contents.lastIndexOf('</div>\n    </div>\n  );\n}')) + addition;
   fs.writeFileSync('frontend/src/components/AlertsPanel.tsx', contents);
}
console.log('Fixed AlertsPanel');
