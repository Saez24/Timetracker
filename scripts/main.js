const workBtn = document.getElementById('workBtn');
const pauseBtn = document.getElementById('pauseBtn');
const contrastBtn = document.getElementById('contrastBtn');
const timeLog = document.getElementById('timeLog');
const body = document.body;
const dateSelector = document.getElementById('dateSelector');
let currentActivity = null;
let startTime = null;
let db;

workBtn.addEventListener('click', toggleWork);
pauseBtn.addEventListener('click', togglePause);
contrastBtn.addEventListener('click', toggleContrast);
window.addEventListener('DOMContentLoaded', () => {
    const today = new Date().toISOString().split('T')[0];
    dateSelector.value = today;
});

dateSelector.addEventListener('change', async () => {
    await updateLogDisplay();
});

const initApp = async () => {
    try {
        await initDB();
        updateLogDisplay();
    } catch (error) {
        console.error("Initialisierungsfehler:", error);
        timeLog.innerHTML = "<div class='log-entry'>Fehler beim Laden der Daten</div>";
    }

};

const saveEntry = (entry) => {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], "readwrite");
        const store = transaction.objectStore(STORE_NAME);

        const request = store.add({
            type: entry.type,
            start: entry.start.getTime(),
            end: entry.end.getTime(),
            duration: entry.duration
        });

        request.onsuccess = () => resolve();
        request.onerror = (event) => reject(event.target.error);
    });
};

// Alle Einträge laden
const loadEntries = () => {
    return new Promise((resolve) => {
        const transaction = db.transaction([STORE_NAME], "readonly");
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();

        request.onsuccess = (event) => {
            const entries = event.target.result.map(entry => ({
                type: entry.type,
                start: new Date(entry.start),
                end: new Date(entry.end),
                duration: entry.duration
            }));
            resolve(entries);
        };

        request.onerror = (event) => {
            console.error("Fehler beim Laden:", event.target.error);
            resolve([]);
        };
    });
};


// Funktionen mit IndexedDB-Anpassungen
async function toggleWork() {
    if (currentActivity === 'work') {
        await endActivity('work');
        currentActivity = null;
        workBtn.textContent = 'Arbeit starten';
        workBtn.classList.remove('active');
        pauseBtn.disabled = true;
        addLogEntry('Arbeit beendet', new Date());
    } else {
        if (currentActivity === 'pause') {
            await endActivity('pause');
            addLogEntry('Pause beendet', new Date());
        }

        currentActivity = 'work';
        startTime = new Date();
        workBtn.textContent = 'Arbeit beenden';
        workBtn.classList.add('active');
        pauseBtn.disabled = false;
        pauseBtn.textContent = 'Pause starten';

        const entries = await loadEntries();
        if (entries.length > 0 && entries[entries.length - 1].type === 'work') {
            addLogEntry('Arbeit fortgesetzt', startTime);
        } else {
            addLogEntry('Arbeit gestartet', startTime);
        }
    }
}

async function togglePause() {
    if (currentActivity === 'pause') {
        await endActivity('pause');
        currentActivity = 'work';
        startTime = new Date();
        pauseBtn.textContent = 'Pause starten';
        pauseBtn.classList.remove('active');
        workBtn.textContent = 'Arbeit beenden';
        addLogEntry('Pause beendet', new Date());
        addLogEntry('Arbeit fortgesetzt', startTime);
    } else if (currentActivity === 'work') {
        await endActivity('work');
        currentActivity = 'pause';
        startTime = new Date();
        pauseBtn.textContent = 'Pause beenden';
        pauseBtn.classList.add('active');
        workBtn.textContent = 'Arbeit fortsetzen';
        addLogEntry('Pause gestartet', startTime);
    }
}

async function endActivity(activityType) {
    const endTime = new Date();
    const duration = Math.round((endTime - startTime) / 1000);

    await saveEntry({
        type: activityType,
        start: startTime,
        end: endTime,
        duration: duration
    });

    updateLogDisplay();
}

function addLogEntry(action, time) {
    const timeString = time.toLocaleTimeString();
    const dateString = time.toLocaleDateString();

    const logEntry = document.createElement('div');
    logEntry.className = 'log-entry';
    logEntry.textContent = `${dateString} ${timeString}: ${action}`;

    timeLog.appendChild(logEntry);
}


function formatTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// 1. Datenfilterung
function filterEntriesByDate(entries, dateString, isToday = false) {
    return entries.filter(entry =>
        isToday
            ? entry.start.toLocaleDateString() === dateString
            : entry.start.toISOString().split('T')[0] === dateString
    );
}

// 2. Berechnung der Zeiten
function calculateTimeSummary(entries) {
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
        pauseCount
    };
}

// 3. Erstellung der Zusammenfassungsansicht
function createSummaryView(todayString, { netWorkTime, totalPause, pauseCount }) {
    return `
        <div class="log-summary">
            <h2>Heute</h2>
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
            <button class="download-btn large-text" id="downloadBtn">Daten als CSV herunterladen</button>
        </div>
        <div><h4>Letzte Aktivitäten:</h4><div class="detailed-log" id="detailedLog"></div></div>
    `;
}

// 4. Erstellung der Aktivitätsgruppen
function createActivityGroup(type, entries) {
    const group = document.createElement('div');
    group.className = 'activity-group';
    const totalDuration = entries.reduce((sum, entry) => sum + entry.duration, 0);

    group.innerHTML = `<strong>${type === 'work' ? 'Arbeit' : 'Pause'} (${entries.length} ×, Gesamt: ${formatTime(totalDuration)})</strong>`;

    const detailsList = document.createElement('div');
    detailsList.className = 'activity-details';

    entries.forEach(entry => {
        const entryElement = document.createElement('div');
        entryElement.className = 'log-entry';
        entryElement.textContent = `
            ${entry.start.toLocaleTimeString()} - ${entry.end.toLocaleTimeString()} 
            (Dauer: ${formatTime(entry.duration)})
        `;
        detailsList.appendChild(entryElement);
    });

    group.appendChild(detailsList);
    return group;
}

// 5. Anzeige der letzten Aktivitäten
function displayRecentActivities(todayEntries, detailedLog) {
    const recentEntries = todayEntries.slice().reverse();

    if (recentEntries.length === 0) {
        detailedLog.innerHTML = '<div class="log-entry">Keine Einträge für heute</div>';
        return;
    }

    detailedLog.innerHTML = '';

    const recentWorkEntries = recentEntries.filter(entry => entry.type === 'work');
    const recentPauseEntries = recentEntries.filter(entry => entry.type === 'pause');

    if (recentWorkEntries.length > 0) {
        detailedLog.appendChild(createActivityGroup('work', recentWorkEntries));
    }

    if (recentPauseEntries.length > 0) {
        detailedLog.appendChild(createActivityGroup('pause', recentPauseEntries));
    }
}

// 6. Hauptfunktion (aktualisiert)
async function updateLogDisplay() {
    try {
        const selectedDate = dateSelector.value;
        const entries = await loadEntries();
        const today = new Date();
        const todayString = today.toLocaleDateString();
        const todayEntries = filterEntriesByDate(entries, todayString, true);
        const selectedEntries = filterEntriesByDate(entries, selectedDate);
        const timeSummary = calculateTimeSummary(todayEntries);

        timeLog.innerHTML = createSummaryView(todayString, timeSummary);
        const downloadBtn = document.getElementById('downloadBtn');
        downloadBtn.addEventListener('click', downloadCSV);
        const detailedLog = document.getElementById('detailedLog');
        timeLog.appendChild(historyContainer);

        displayRecentActivities(todayEntries, detailedLog);
        displayHistoryEntries(selectedEntries);

    } catch (error) {
        console.error("Aktualisierungsfehler:", error);
    }
}



