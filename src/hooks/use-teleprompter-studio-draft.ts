import { useState, useEffect, useCallback } from 'react';
import {
  saveDraft,
  getDraft,
  getAllDrafts,
  deleteDraft,
  markDraftSynced,
  type StudioDraftRecord,
} from '@/lib/teleprompter-studio-storage';

const DRAFT_ID_KEY = 'teleprompter-studio-current-draft-id';

function generateDraftId(): string {
  return `draft-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function useTeleprompterStudioDraft() {
  const [draftId, setDraftId] = useState<string | null>(() => {
    try {
      return sessionStorage.getItem(DRAFT_ID_KEY);
    } catch {
      return null;
    }
  });
  const [draft, setDraft] = useState<StudioDraftRecord | null>(null);
  const [pendingDrafts, setPendingDrafts] = useState<StudioDraftRecord[]>([]);

  useEffect(() => {
    if (draftId) {
      try {
        sessionStorage.setItem(DRAFT_ID_KEY, draftId);
      } catch {
        // Ignore quota errors
      }
    } else {
      try {
        sessionStorage.removeItem(DRAFT_ID_KEY);
      } catch {
        // Ignore
      }
    }
  }, [draftId]);

  const loadDraft = useCallback(async (id: string) => {
    const d = await getDraft(id);
    setDraft(d);
    return d;
  }, []);

  const loadPendingDrafts = useCallback(async () => {
    const all = await getAllDrafts();
    const pending = all.filter((d) => !d.synced);
    setPendingDrafts(pending);
    return pending;
  }, []);

  useEffect(() => {
    if (draftId) {
      loadDraft(draftId);
    } else {
      setDraft(null);
    }
  }, [draftId, loadDraft]);

  const createDraft = useCallback(() => {
    const id = generateDraftId();
    setDraftId(id);
    setDraft(null);
    return id;
  }, []);

  const saveDraftData = useCallback(
    async (data: Omit<StudioDraftRecord, 'id' | 'savedAt' | 'synced'>) => {
      const id = draftId ?? createDraft();
      await saveDraft({ ...data, id });
      await loadDraft(id);
    },
    [draftId, createDraft, loadDraft]
  );

  const clearDraft = useCallback(() => {
    setDraftId(null);
    setDraft(null);
  }, []);

  const removeDraft = useCallback(async (id: string) => {
    await deleteDraft(id);
    if (draftId === id) {
      clearDraft();
    }
    await loadPendingDrafts();
  }, [draftId, clearDraft, loadPendingDrafts]);

  const markSynced = useCallback(
    async (id: string) => {
      await markDraftSynced(id);
      if (draftId === id) {
        clearDraft();
      }
      await loadPendingDrafts();
    },
    [draftId, clearDraft, loadPendingDrafts]
  );

  return {
    draftId,
    draft,
    pendingDrafts,
    createDraft,
    loadDraft,
    loadPendingDrafts,
    saveDraftData,
    clearDraft,
    removeDraft,
    markSynced,
  };
}
