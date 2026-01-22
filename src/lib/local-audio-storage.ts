const DB_NAME = 'airsend-audio-db';
const STORE_NAME = 'audio-files';
const DB_VERSION = 1;

interface AudioFile {
  id: string; // pieceId
  blob: Blob;
  fileName: string;
  mimeType: string;
  updatedAt: number;
}

function getDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
}

export async function saveLocalAudio(pieceId: string, blob: Blob, fileName: string): Promise<string> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const audioFile: AudioFile = {
      id: pieceId,
      blob,
      fileName,
      mimeType: blob.type,
      updatedAt: Date.now(),
    };
    const request = store.put(audioFile);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(URL.createObjectURL(blob));
  });
}

export async function getLocalAudio(pieceId: string): Promise<{ blob: Blob, fileName: string, url: string } | null> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(pieceId);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const file = request.result as AudioFile | undefined;
      if (!file) {
        resolve(null);
        return;
      }
      resolve({
        blob: file.blob,
        fileName: file.fileName,
        url: URL.createObjectURL(file.blob),
      });
    };
  });
}

export async function deleteLocalAudio(pieceId: string): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(pieceId);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

export async function hasLocalAudio(pieceId: string): Promise<boolean> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.count(pieceId);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result > 0);
  });
}
