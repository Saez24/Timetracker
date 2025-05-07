
const showHistoryBtn = document.getElementById('showHistoryBtn');
const historyContainer = document.createElement('div');

showHistoryBtn.addEventListener('click', toggleHistory);
historyContainer.className = 'history-container';
timeLog.appendChild(historyContainer);

function toggleHistory() {
    historyContainer.classList.toggle('visible');
    showHistoryBtn.textContent = historyContainer.classList.contains('visible')
        ? 'Historische Daten ausblenden'
        : 'Historische Daten anzeigen';
}

// 1. Berechnung der Zeit-Zusammenfassung für historische Einträge
function calculateHistoryTimeSummary(entries) {
    let totalWork = 0;
    let totalPause = 0;
    const pauseCount = entries.filter(e => e.type === 'pause').length;

    entries.forEach(entry => {
        if (entry.type === 'work') totalWork += entry.duration;
        if (entry.type === 'pause') totalPause += entry.duration;
    });

    return {
        totalWork,
        totalPause,
        netWorkTime: Math.max(0, totalWork),
        pauseCount,
        selectedDate: entries.length > 0 ? new Date(entries[0].start).toLocaleDateString() : ''
    };
}

// 2. Erstellung der historischen Zusammenfassungsansicht
function createHistorySummaryView({ selectedDate, netWorkTime, totalPause, pauseCount }) {
    const summaryElement = document.createElement('div');
    summaryElement.className = 'log-summary';
    summaryElement.innerHTML = `
        <h2>Zusammenfassung für ${selectedDate}</h2>
        <div class="summary-container">
            <div class="summary-box">
                <div>Netto-Arbeitszeit</div>
                <div class="summary-value">${formatTime(netWorkTime)}</div>
            </div>
            <div class="summary-box">
                <div>Pausenzeit</div>
                <div class="summary-value">${formatTime(totalPause)}</div>
            </div>
            <div class="summary-box">
                <div>Anzahl Pausen</div>
                <div class="summary-value">${pauseCount}</div>
            </div>
        </div>
    `;
    return summaryElement;
}

// 3. Filterung und Sortierung der Einträge nach Typ
function filterAndSortEntries(entries) {
    const workEntries = entries.filter(entry => entry.type === 'work')
        .sort((a, b) => a.start - b.start);
    const pauseEntries = entries.filter(entry => entry.type === 'pause')
        .sort((a, b) => a.start - b.start);

    return {
        workEntries,
        pauseEntries,
        totalWorkDuration: workEntries.reduce((sum, entry) => sum + entry.duration, 0),
        totalPauseDuration: pauseEntries.reduce((sum, entry) => sum + entry.duration, 0)
    };
}

function createHistoryDetailsView({ workEntries, pauseEntries, totalWorkDuration, totalPauseDuration }) {
    const fragment = document.createDocumentFragment();

    const detailsTitle = document.createElement('h4');
    detailsTitle.textContent = 'Detaillierte Aufzeichnungen:';
    fragment.appendChild(detailsTitle);

    // Neue Container-Div für die Activity-Groups
    const activitiesContainer = document.createElement('div');
    activitiesContainer.className = 'history-log-summary'; // Für spätere CSS-Stilisierung

    if (workEntries.length > 0) {
        const workGroup = createActivityGroup(
            'work',
            workEntries,
            `Arbeit (${workEntries.length} ×, Gesamt: ${formatTime(totalWorkDuration)})`
        );
        activitiesContainer.appendChild(workGroup);
    }

    if (pauseEntries.length > 0) {
        const pauseGroup = createActivityGroup(
            'pause',
            pauseEntries,
            `Pause (${pauseEntries.length} ×, Gesamt: ${formatTime(totalPauseDuration)})`
        );
        activitiesContainer.appendChild(pauseGroup);
    }

    // Container zum Fragment hinzufügen
    fragment.appendChild(activitiesContainer);

    return fragment;
}

// 5. Hauptfunktion (aktualisiert)
function displayHistoryEntries(entries) {
    historyContainer.innerHTML = '';

    if (entries.length === 0) {
        historyContainer.innerHTML = '<div class="log-entry">Keine Einträge für dieses Datum</div>';
        return;
    }

    // Berechne Zeitzusammenfassung
    const timeSummary = calculateHistoryTimeSummary(entries);

    // Erstelle Zusammenfassungsansicht
    historyContainer.appendChild(createHistorySummaryView(timeSummary));

    // Filtere und sortiere Einträge
    const filteredEntries = filterAndSortEntries(entries);

    // Erstelle detaillierte Ansicht
    historyContainer.appendChild(createHistoryDetailsView(filteredEntries));
}

async function archiveEntries() {
    try {
        const entries = await loadEntries();
        const transaction = db.transaction([STORE_NAME], "readwrite");
        const store = transaction.objectStore(STORE_NAME);

        // Hier könnten Sie die Einträge in einen Archiv-Store verschieben
        // oder einfach als archiviert markieren
        console.log("Einträge könnten jetzt archiviert werden");

    } catch (error) {
        console.error("Archivierungsfehler:", error);
    }
}