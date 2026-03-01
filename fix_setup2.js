const fs = require('fs');
let contents = fs.readFileSync('frontend/src/components/SetupPanel.tsx', 'utf8');
const start = contents.indexOf('TELEGRAM_CONFIG_START');
const end = contents.indexOf('{/* General Config */}');
if (start > -1 && end > -1) {
    const replacement = `{/* Telegram Config */}
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

        `;
    contents = contents.substring(0, start) + replacement + contents.substring(end);
    fs.writeFileSync('frontend/src/components/SetupPanel.tsx', contents);
    console.log('Fixed');
}
