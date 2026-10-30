# Auto Assistent

Gerüst für ein KI System im Auto: Du planst unterwegs per Stimme mit Claude in CarPlay, und dein PC arbeitet die Aufgaben ab.

## Ablauf

1. Im Auto den Plan per Sprachgespräch entwickeln und als Markdown festhalten (Vorlage: `PLAN.md`).
2. Aufträge für den PC als kleine Dateien in die `warteschlange` legen (Vorlage: `warteschlange/AUFTRAG_VORLAGE.md`), oder per Telegram an Claude Code schicken.
3. Claude Code auf dem PC arbeitet nach den Regeln in `CLAUDE.md`.
4. Ergebnisse und Rückfragen kommen als Nachricht auf das Handy. Freigaben erteilst du erst nach dem Parken.

## Inhalt

* `PLAN.md`: Vorlage für den Vibe Coding Plan
* `CLAUDE.md`: Sicherheitsregeln für die Arbeit auf dem PC
* `warteschlange/`: offene Aufträge, erledigte Aufträge liegen in `warteschlange/erledigt/`

## Wichtig

Claude Code nur in diesem Ordner starten, damit die Regeln aus `CLAUDE.md` gelten und der Arbeitsbereich begrenzt bleibt.
