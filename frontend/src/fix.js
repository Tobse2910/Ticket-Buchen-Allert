const fs = require('fs');
let contents = fs.readFileSync('App.tsx', 'utf8');
const idx = contents.indexOf('<div style={{ display: tab === "health"');
if (idx !== -1) {
    contents = contents.substring(0, idx) + `<div style={{ display: tab === "health" ? "block" : "none" }}>
            <div className="animate-fade-in"><HealthPanel /></div>
        </div>

        <div style={{ display: tab === "info" ? "block" : "none" }}>
            <div className="animate-fade-in"><InfoPanel /></div>
        </div>
      </main>
    </div>
  );
}
`;
    fs.writeFileSync('App.tsx', contents);
    console.log('Fixed');
}