async function downloadCSV() {
    try {
        // Einträge aus IndexedDB laden
        const entries = await loadEntries();

        if (entries.length === 0) {
            alert('Keine Daten zum Herunterladen vorhanden.');
            return;
        }

        let csv = 'Typ,Start,Ende,Dauer (Sekunden),Dauer (HH:MM:SS)\n';

        entries
            .sort((a, b) => a.start - b.start)
            .forEach(entry => {
                csv += `"${entry.type === 'work' ? 'Arbeit' : 'Pause'}","${entry.start.toLocaleString()
                    }","${entry.end.toLocaleString()
                    }",${entry.duration
                    },"${formatTime(entry.duration)
                    }"\n`;
            });

        // CSV-Datei erstellen und herunterladen
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `zeiterfassung_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Optional: Archivierung (falls gewünscht)
        await archiveEntries();
        alert('CSV-Datei wurde erfolgreich erstellt!');

    } catch (error) {
        console.error("Exportfehler:", error);
        alert('Fehler beim Erstellen der CSV-Datei: ' + error);
    }
}