type PendingRequest<T> = {
  promise: Promise<T>;
  timestamp: number;
};

const pendingRequests = new Map<string, PendingRequest<unknown>>();
const REQUEST_TIMEOUT = 30000;

export async function deduplicatedFetch<T>(
  key: string,
  fetchFn: () => Promise<T>
): Promise<T> {
  const existing = pendingRequests.get(key);
  
  if (existing && Date.now() - existing.timestamp < REQUEST_TIMEOUT) {
    return existing.promise;
  }

  const promise = fetchFn().finally(() => {
    setTimeout(() => {
      const current = pendingRequests.get(key);
      if (current?.promise === promise) {
        pendingRequests.delete(key);
      }
    }, 100);
  });

  pendingRequests.set(key, { promise, timestamp: Date.now() });
  return promise;
}

export function cancelPendingRequest(key: string): void {
  pendingRequests.delete(key);
}

export function clearAllPendingRequests(): void {
  pendingRequests.clear();
}

export function hasPendingRequest(key: string): boolean {
  return pendingRequests.has(key);
}

export function getPendingRequestCount(): number {
  return pendingRequests.size;
}
