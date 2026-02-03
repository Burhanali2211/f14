/**
 * IndexedDB storage for Teleprompter Studio offline drafts.
 * Stores draft data when offline; syncs when back online.
 */

const DB_NAME = 'teleprompter-studio-db';
const DB_VERSION = 1;
const STORE_NAME = 'drafts';

export interface StudioDraftRecord {
  id: string;
  pieceId: string | null;
  title: string;
  imageBlobs: string[]; // base64 data URLs
  pdfBlob: string | null; // base64 data URL
  audioBlob: string | null; // base64 data URL
  imageUrls: string[]; // cloud URLs (when synced)
  pdfUrl: string | null;
  audioUrl: string | null; // R2 key
  regions?: unknown[];
  segments?: unknown[];
  savedAt: string;
  synced: boolean;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
}

export async function saveDraft(draft: Omit<StudioDraftRecord, 'savedAt' | 'synced'>): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const record: StudioDraftRecord = {
        ...draft,
        savedAt: new Date().toISOString(),
        synced: false,
      };
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.put(record);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
      tx.oncomplete = () => db.close();
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'QuotaExceededError') {
      throw new Error('Storage full. Please free up space or remove old drafts.');
    }
    throw err;
  }
}

export async function getDraft(id: string): Promise<StudioDraftRecord | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(id);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      resolve(request.result ?? null);
    };
    tx.oncomplete = () => db.close();
  });
}

export async function getAllDrafts(): Promise<StudioDraftRecord[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result ?? []);
    tx.oncomplete = () => db.close();
  });
}

export async function deleteDraft(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.delete(id);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
    tx.oncomplete = () => db.close();
  });
}

export async function markDraftSynced(id: string): Promise<void> {
  const draft = await getDraft(id);
  if (!draft) return;
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const updated = { ...draft, synced: true };
    const request = store.put(updated);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
    tx.oncomplete = () => db.close();
  });
}
