---
name: "Monitor-Feature umsetzen"
description: "Implement or refine a monitor-related feature across backend and frontend with minimal invasive changes."
agent: "agent"
model: "GPT-5 (copilot)"
tools: [read, search, edit, execute, todo]
argument-hint: "Welche Monitor-Funktion soll umgesetzt werden? Beispiel: neuer Status, neues Feld, neuer Alert-Ablauf"
---

Setze die gewünschte Monitor-Funktion in diesem Repository um.

Arbeite nach diesen Regeln:
- Ändere nur notwendige Dateien.
- Halte API-Pfade und Payload-Strukturen stabil, sofern nicht explizit anders gewünscht.
- Halte Frontend- und Backend-Datenmodell kompatibel.
- Ergänze kurze Verifikation (z. B. gezielter Build- oder Laufzeitcheck) für betroffene Teile.
- Fasse zum Schluss prägnant zusammen, was geändert wurde und was ggf. noch manuell zu prüfen ist.