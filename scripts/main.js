const workBtn = document.getElementById('workBtn');
const pauseBtn = document.getElementById('pauseBtn');
const contrastBtn = document.getElementById('contrastBtn');
const timeLog = document.getElementById('timeLog');
const body = document.body;
const dateSelector = document.getElementById('dateSelector');
let currentActivity = null;
let startTime = null;
let db;
let timerInterval = null;
let totalSeconds = 0;
let isTimerRunning = false;

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

// In initApp():
const initApp = async () => {
    try {
        await initDB();
        await updateLogDisplay();

        const entries = await loadEntries();
        const today = new Date().toLocaleDateString();
        const todayWorkEntries = entries.filter(entry =>
            entry.type === 'work' &&
            new Date(entry.start).toLocaleDateString() === today
        );

        totalSeconds = todayWorkEntries.reduce((sum, entry) => sum + entry.duration, 0);

        // Timer immer anzeigen
        createTimerElement();
        updateTimerDisplay();

        // Wenn Arbeit aktiv war, Timer fortsetzen
        const lastEntry = entries[entries.length - 1];
        if (lastEntry?.type === 'work' && !lastEntry.end) {
            currentActivity = 'work';
            startTime = new Date(lastEntry.start);
            startTimer(totalSeconds + Math.floor((new Date() - startTime) / 1000));
        }
    } catch (error) {
        console.error("Initialisierungsfehler:", error);
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
        pauseTimer();
    } else {
        if (currentActivity === 'pause') {
            await endActivity('pause');
        }

        currentActivity = 'work';
        startTime = new Date();
        startTimer(totalSeconds);
    }
    updateUI();
}

async function togglePause() {
    if (currentActivity === 'pause') {
        await endActivity('pause');
        currentActivity = 'work';
        startTime = new Date();
        startTimer(totalSeconds);
    } else if (currentActivity === 'work') {
        await endActivity('work');
        currentActivity = 'pause';
        startTime = new Date();
        pauseTimer();
    }
    updateUI();
}

function updateUI() {
    // Arbeit-Button Logik
    if (currentActivity === 'work') {
        workBtn.textContent = 'Arbeit beenden';
        workBtn.classList.add('active');
        pauseBtn.disabled = false;
        pauseBtn.textContent = 'Pause starten';
        pauseBtn.classList.remove('active');
    }
    else if (currentActivity === 'pause') {
        workBtn.textContent = 'Arbeit fortsetzen';
        workBtn.classList.remove('active');
        pauseBtn.textContent = 'Pause beenden';
        pauseBtn.classList.add('active');
    }
    else {
        workBtn.textContent = 'Arbeit starten';
        workBtn.classList.remove('active');
        pauseBtn.disabled = true;
        pauseBtn.textContent = 'Pause starten';
        pauseBtn.classList.remove('active');
    }

    updateTimerDisplay();
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

        createTimerElement();
        updateTimerDisplay();
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


// Timer-Element erstellen (wird nur einmal aufgerufen)
function createTimerElement() {
    let timerElement = document.getElementById('activeTimer');
    if (!timerElement) {
        timerElement = document.createElement('div');
        timerElement.id = 'activeTimer';
        timerElement.className = 'active-timer';
        timerElement.innerHTML = `
            <div class="timer-label">Status:</div>
            <div class="timer-display">${formatTime(totalSeconds)}</div>
        `;
        document.querySelector('.log-summary').prepend(timerElement);
    }
}


function startTimer(resumeTime = 0) {
    if (isTimerRunning) return;

    totalSeconds = resumeTime;
    updateTimerDisplay();
    isTimerRunning = true;

    timerInterval = setInterval(() => {
        totalSeconds++;
        updateTimerDisplay();
    }, 1000);
}

// Timer anhalten
function pauseTimer() {
    if (!isTimerRunning) return;

    clearInterval(timerInterval);
    isTimerRunning = false;

    updateTimerDisplay();
}

// Timer aktualisieren
function updateTimerDisplay() {
    const timerElement = document.getElementById('activeTimer');
    const timerDisplay = document.querySelector('.timer-display');

    if (timerElement && timerDisplay) {
        timerElement.style.display = 'flex'; // Immer sichtbar!
        timerDisplay.textContent = formatTime(totalSeconds);

        // Optional: Label anpassen (z. B. "Pause aktiv" / "Arbeit aktiv")
        const timerLabel = document.querySelector('.timer-label');
        if (timerLabel) {
            timerLabel.textContent =
                currentActivity === 'work' ? 'Aktive Arbeitszeit:' :
                    currentActivity === 'pause' ? 'Pause (Zeit pausiert):' :
                        'Gesamte Arbeitszeit heute:';
        }
    }
}

