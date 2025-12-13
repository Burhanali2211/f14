// Simple logger utility
// Set DEBUG=true in environment or localStorage to enable debug logs
const DEBUG_ENABLED = 
  import.meta.env.DEV || 
  import.meta.env.VITE_DEBUG === 'true' ||
  (typeof localStorage !== 'undefined' && localStorage.getItem('debug') === 'true');

export const logger = {
  debug: (...args: any[]) => {
    if (DEBUG_ENABLED) {
      console.log(...args);
    }
  },
  
  error: (...args: any[]) => {
    console.error(...args);
  },
  
  warn: (...args: any[]) => {
    console.warn(...args);
  },
  
  info: (...args: any[]) => {
    if (DEBUG_ENABLED) {
      console.info(...args);
    }
  },
};

