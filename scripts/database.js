const DB_NAME = "TimeTrackingDB";
const STORE_NAME = "timeEntries";
const DB_VERSION = 1;
const ARCHIV_STORE_NAME = "archivedEntries";
const ARCHIV_DB_NAME = "ArchivedTimeTrackingDB";

const initDB = () => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = (event) => {
            console.error("IndexedDB Fehler:", event.target.error);
            reject("Datenbank konnte nicht geöffnet werden");
        };

        request.onsuccess = (event) => {
            db = event.target.result;
            resolve(db);
        };

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                const store = db.createObjectStore(STORE_NAME, { keyPath: "id", autoIncrement: true });
                store.createIndex("type", "type", { unique: false });
                store.createIndex("start", "start", { unique: false });
            }
        };
    });
};

