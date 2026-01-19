interface NetworkConnection {
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
  saveData?: boolean;
  addEventListener?: (type: string, listener: () => void) => void;
  removeEventListener?: (type: string, listener: () => void) => void;
}

type ConnectionStatus = 'online' | 'offline' | 'slow';
type ConnectionType = '4g' | '3g' | '2g' | 'slow-2g' | 'unknown';

interface NetworkInfo {
  status: ConnectionStatus;
  effectiveType: ConnectionType;
  downlink: number;
  rtt: number;
  saveData: boolean;
}

type NetworkChangeCallback = (info: NetworkInfo) => void;

const listeners: Set<NetworkChangeCallback> = new Set();

function getInitialNetworkInfo(): NetworkInfo {
  if (typeof navigator === 'undefined') {
    return {
      status: 'online',
      effectiveType: 'unknown',
      downlink: 10,
      rtt: 50,
      saveData: false,
    };
  }

  const isCurrentlyOnline = navigator.onLine !== false;
  
  return {
    status: isCurrentlyOnline ? 'online' : 'offline',
    effectiveType: 'unknown',
    downlink: 10,
    rtt: 50,
    saveData: false,
  };
}

let currentNetworkInfo: NetworkInfo = getInitialNetworkInfo();

function getNavigatorConnection(): NetworkConnection | null {
  const nav = navigator as Navigator & { 
    connection?: NetworkConnection;
    mozConnection?: NetworkConnection;
    webkitConnection?: NetworkConnection;
  };
  return nav.connection || nav.mozConnection || nav.webkitConnection || null;
}

function updateNetworkInfo(): void {
  const connection = getNavigatorConnection();
  const isOnline = navigator.onLine;

  if (!isOnline) {
    currentNetworkInfo = {
      status: 'offline',
      effectiveType: 'unknown',
      downlink: 0,
      rtt: Infinity,
      saveData: false,
    };
  } else if (connection) {
    const effectiveType = connection.effectiveType || 'unknown';
    const downlink = connection.downlink || 10;
    const rtt = connection.rtt || 50;
    const saveData = connection.saveData || false;

    const isSlow = effectiveType === '2g' || 
                   effectiveType === 'slow-2g' || 
                   downlink < 1 || 
                   rtt > 500;

    currentNetworkInfo = {
      status: isSlow ? 'slow' : 'online',
      effectiveType,
      downlink,
      rtt,
      saveData,
    };
  } else {
    currentNetworkInfo = {
      status: isOnline ? 'online' : 'offline',
      effectiveType: 'unknown',
      downlink: 10,
      rtt: 50,
      saveData: false,
    };
  }

  listeners.forEach((callback) => callback(currentNetworkInfo));
}

export function initNetworkMonitor(): () => void {
  updateNetworkInfo();

  window.addEventListener('online', updateNetworkInfo);
  window.addEventListener('offline', updateNetworkInfo);

  const connection = getNavigatorConnection();
  if (connection && connection.addEventListener) {
    connection.addEventListener('change', updateNetworkInfo);
  }

  return () => {
    window.removeEventListener('online', updateNetworkInfo);
    window.removeEventListener('offline', updateNetworkInfo);
    if (connection && connection.removeEventListener) {
      connection.removeEventListener('change', updateNetworkInfo);
    }
  };
}

export function getNetworkInfo(): NetworkInfo {
  return currentNetworkInfo;
}

export function isOnline(): boolean {
  return currentNetworkInfo.status !== 'offline';
}

export function isSlowConnection(): boolean {
  return currentNetworkInfo.status === 'slow' || currentNetworkInfo.saveData;
}

export function shouldReduceRequests(): boolean {
  return !isOnline() || isSlowConnection();
}

export function onNetworkChange(callback: NetworkChangeCallback): () => void {
  listeners.add(callback);
  callback(currentNetworkInfo);
  return () => listeners.delete(callback);
}

export function getOptimalFetchConfig(): {
  staleTime: number;
  cacheTime: number;
  refetchInterval: number | false;
  refetchOnWindowFocus: boolean;
} {
  const { status, saveData } = currentNetworkInfo;

  if (status === 'offline') {
    return {
      staleTime: Infinity,
      cacheTime: Infinity,
      refetchInterval: false,
      refetchOnWindowFocus: false,
    };
  }

  if (status === 'slow' || saveData) {
    return {
      staleTime: 10 * 60 * 1000,
      cacheTime: 30 * 60 * 1000,
      refetchInterval: false,
      refetchOnWindowFocus: false,
    };
  }

  return {
    staleTime: 2 * 60 * 1000,
    cacheTime: 10 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
  };
}
