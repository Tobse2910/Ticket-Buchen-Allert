---
name: "Review Änderungen"
description: "Review changed code in this repository for bugs, regressions, risks and missing tests."
agent: "Repo Review"
argument-hint: "Was soll geprüft werden? Zum Beispiel: aktuelle Änderungen oder ein bestimmter Bereich"
model: "GPT-5 (copilot)"
---

Prüfe die angeforderten Änderungen in diesem Repository mit Fokus auf Bugs, Verhaltensänderungen, Risiken und fehlende Tests.

Arbeite nach diesen Regeln:
- Funde zuerst, keine lange Einleitung.
- Priorisiere echte Fehler vor Stilfragen.
- Nenne konkrete Auswirkungen.
- Weise auf fehlende Verifikation hin, wenn sie relevant ist.