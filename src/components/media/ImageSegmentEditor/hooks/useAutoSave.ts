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

function getLocalData(pieceId: string): StoredData | null {
  try {
    const stored = localStorage.getItem(getLocalStorageKey(pieceId));
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

function saveLocalData(pieceId: string, data: StoredData): void {
  try {
    localStorage.setItem(getLocalStorageKey(pieceId), JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save to localStorage:', e);
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
        .single();

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
        .single();

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
