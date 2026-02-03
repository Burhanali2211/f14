import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { ImageRegion } from '../types';

const STORAGE_KEY = 'image-regions';
const LOCAL_SAVE_DEBOUNCE = 500;
const CLOUD_SYNC_INTERVAL = 30000;

interface UseAutoSaveOptions {
  pieceId: string;
  regions: ImageRegion[];
  enabled?: boolean;
}

interface SaveStatus {
  isAutoSaving: boolean;
  isSyncingToCloud: boolean;
  lastLocalSave: Date | null;
  lastCloudSync: Date | null;
  hasUnsavedChanges: boolean;
  syncError: string | null;
}

interface StoredData {
  regions: ImageRegion[];
  version: number;
  savedAt: string;
  syncedToCloud: boolean;
}

function getLocalStorageKey(pieceId: string): string {
  return `${STORAGE_KEY}-${pieceId}`;
}

function estimateStorageSize(data: unknown): number {
  try {
    return new Blob([JSON.stringify(data)]).size;
  } catch {
    return JSON.stringify(data).length * 2;
  }
}

function getLocalStorageUsage(): { used: number; available: number } {
  let totalSize = 0;
  try {
    for (const key in localStorage) {
      if (Object.prototype.hasOwnProperty.call(localStorage, key)) {
        totalSize += localStorage.getItem(key)?.length ?? 0;
      }
    }
  } catch {
  }
  const maxSize = 5 * 1024 * 1024;
  return { used: totalSize * 2, available: maxSize - totalSize * 2 };
}

function cleanupOldStorage(currentPieceId: string, requiredSpace: number): boolean {
  try {
    const storageKeys: { key: string; savedAt: Date; size: number }[] = [];
    
    for (const key in localStorage) {
      if (key.startsWith(STORAGE_KEY) && key !== getLocalStorageKey(currentPieceId)) {
        try {
          const data = JSON.parse(localStorage.getItem(key) || '{}');
          storageKeys.push({
            key,
            savedAt: new Date(data.savedAt || 0),
            size: (localStorage.getItem(key)?.length ?? 0) * 2,
          });
        } catch {
        }
      }
    }
    
    storageKeys.sort((a, b) => a.savedAt.getTime() - b.savedAt.getTime());
    
    let freedSpace = 0;
    for (const item of storageKeys) {
      if (freedSpace >= requiredSpace) break;
      localStorage.removeItem(item.key);
      freedSpace += item.size;
    }
    
    return freedSpace >= requiredSpace;
  } catch {
    return false;
  }
}

function getLocalData(pieceId: string): StoredData | null {
  try {
    const stored = localStorage.getItem(getLocalStorageKey(pieceId));
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

function saveLocalData(pieceId: string, data: StoredData): { success: boolean; error?: string } {
  try {
    const jsonData = JSON.stringify(data);
    const requiredSize = jsonData.length * 2;
    const { available } = getLocalStorageUsage();
    
    if (requiredSize > available) {
      const cleaned = cleanupOldStorage(pieceId, requiredSize - available + 100000);
      if (!cleaned) {
        console.warn('localStorage quota exceeded, unable to free enough space');
        return { success: false, error: 'Storage quota exceeded' };
      }
    }
    
    localStorage.setItem(getLocalStorageKey(pieceId), jsonData);
    return { success: true };
  } catch (e: any) {
    if (e.name === 'QuotaExceededError' || e.code === 22) {
      const cleaned = cleanupOldStorage(pieceId, 500000);
      if (cleaned) {
        try {
          localStorage.setItem(getLocalStorageKey(pieceId), JSON.stringify(data));
          return { success: true };
        } catch {
        }
      }
      console.error('localStorage quota exceeded:', e);
      return { success: false, error: 'Storage quota exceeded' };
    }
    console.error('Failed to save to localStorage:', e);
    return { success: false, error: e.message };
  }
}

export function useAutoSave({ pieceId, regions, enabled = true }: UseAutoSaveOptions) {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>({
    isAutoSaving: false,
    isSyncingToCloud: false,
    lastLocalSave: null,
    lastCloudSync: null,
    hasUnsavedChanges: false,
    syncError: null,
  });

  const localVersionRef = useRef<number>(0);
  const cloudVersionRef = useRef<number>(0);
  const lastSyncedRegionsRef = useRef<string>('');
  const syncIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const syncToCloud = useCallback(async (force = false) => {
    if (!pieceId || !enabled) return;

    const currentRegionsJson = JSON.stringify(regions);
    
    if (!force && currentRegionsJson === lastSyncedRegionsRef.current) {
      return;
    }

    setSaveStatus(prev => ({ ...prev, isSyncingToCloud: true, syncError: null }));

    try {
      const { data: existing } = await supabase
        .from('piece_image_segments')
        .select('id, version')
        .eq('piece_id', pieceId)
        .maybeSingle();

      const newVersion = (existing?.version || 0) + 1;

      if (existing) {
        const { error } = await supabase
          .from('piece_image_segments')
          .update({
            regions: regions as unknown as Record<string, unknown>[],
            version: newVersion,
            updated_at: new Date().toISOString(),
          })
          .eq('piece_id', pieceId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('piece_image_segments')
          .insert({
            piece_id: pieceId,
            regions: regions as unknown as Record<string, unknown>[],
            version: 1,
          });

        if (error) throw error;
      }

      cloudVersionRef.current = newVersion;
      lastSyncedRegionsRef.current = currentRegionsJson;

      const localData = getLocalData(pieceId);
      if (localData) {
        saveLocalData(pieceId, {
          ...localData,
          syncedToCloud: true,
        });
      }

      setSaveStatus(prev => ({
        ...prev,
        isSyncingToCloud: false,
        lastCloudSync: new Date(),
        syncError: null,
      }));
    } catch (error: any) {
      console.error('Cloud sync failed:', error);
      setSaveStatus(prev => ({
        ...prev,
        isSyncingToCloud: false,
        syncError: error.message || 'Failed to sync to cloud',
      }));
    }
  }, [pieceId, regions, enabled]);

  useEffect(() => {
    if (!pieceId || !enabled) return;

    const timer = setTimeout(() => {
      setSaveStatus(prev => ({ ...prev, isAutoSaving: true }));

      localVersionRef.current += 1;
      const data: StoredData = {
        regions,
        version: localVersionRef.current,
        savedAt: new Date().toISOString(),
        syncedToCloud: false,
      };

      saveLocalData(pieceId, data);

      setSaveStatus(prev => ({
        ...prev,
        isAutoSaving: false,
        lastLocalSave: new Date(),
        hasUnsavedChanges: JSON.stringify(regions) !== lastSyncedRegionsRef.current,
      }));
    }, LOCAL_SAVE_DEBOUNCE);

    return () => clearTimeout(timer);
  }, [pieceId, regions, enabled]);

  useEffect(() => {
    if (!pieceId || !enabled) return;

    syncIntervalRef.current = setInterval(() => {
      const currentRegionsJson = JSON.stringify(regions);
      if (currentRegionsJson !== lastSyncedRegionsRef.current) {
        syncToCloud();
      }
    }, CLOUD_SYNC_INTERVAL);

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, [pieceId, regions, enabled, syncToCloud]);

  const manualSave = useCallback(async () => {
    if (!pieceId) return;

    localVersionRef.current += 1;
    const data: StoredData = {
      regions,
      version: localVersionRef.current,
      savedAt: new Date().toISOString(),
      syncedToCloud: false,
    };

    saveLocalData(pieceId, data);
    
    setSaveStatus(prev => ({
      ...prev,
      lastLocalSave: new Date(),
    }));

    await syncToCloud(true);
  }, [pieceId, regions, syncToCloud]);

  const loadFromStorage = useCallback(async (): Promise<{
    regions: ImageRegion[];
    source: 'local' | 'cloud' | 'none';
    hasRecoveryData: boolean;
    localData: StoredData | null;
    cloudData: { regions: ImageRegion[]; version: number } | null;
  }> => {
    if (!pieceId) {
      return { regions: [], source: 'none', hasRecoveryData: false, localData: null, cloudData: null };
    }

    const localData = getLocalData(pieceId);
    
    let cloudData: { regions: ImageRegion[]; version: number } | null = null;
    try {
      const { data } = await supabase
        .from('piece_image_segments')
        .select('regions, version')
        .eq('piece_id', pieceId)
        .maybeSingle();

      if (data) {
        cloudData = {
          regions: data.regions as unknown as ImageRegion[],
          version: data.version || 0,
        };
        cloudVersionRef.current = data.version || 0;
      }
    } catch (error) {
      console.log('No cloud data found or error fetching:', error);
    }

    if (localData && !localData.syncedToCloud) {
      const cloudVersion = cloudData?.version || 0;
      if (localData.version > cloudVersion) {
        return {
          regions: localData.regions,
          source: 'local',
          hasRecoveryData: true,
          localData,
          cloudData,
        };
      }
    }

    if (cloudData && cloudData.regions.length > 0) {
      lastSyncedRegionsRef.current = JSON.stringify(cloudData.regions);
      return {
        regions: cloudData.regions,
        source: 'cloud',
        hasRecoveryData: false,
        localData,
        cloudData,
      };
    }

    if (localData && localData.regions.length > 0) {
      return {
        regions: localData.regions,
        source: 'local',
        hasRecoveryData: false,
        localData,
        cloudData,
      };
    }

    return { regions: [], source: 'none', hasRecoveryData: false, localData: null, cloudData: null };
  }, [pieceId]);

  const discardLocalChanges = useCallback(() => {
    if (!pieceId) return;
    localStorage.removeItem(getLocalStorageKey(pieceId));
  }, [pieceId]);

  return {
    saveStatus,
    syncToCloud,
    manualSave,
    loadFromStorage,
    discardLocalChanges,
  };
}
