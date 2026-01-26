const IS_DEV = import.meta.env.DEV;
const DEBUG_ENABLED = 
  IS_DEV &&
  (import.meta.env.VITE_DEBUG === 'true' ||
  (typeof localStorage !== 'undefined' && localStorage.getItem('debug') === 'true'));

export const logger = {
  debug: (...args: any[]) => {
    if (DEBUG_ENABLED) {
      console.log(...args);
    }
  },
  
  error: (...args: any[]) => {
    if (IS_DEV) {
      console.error(...args);
    }
  },
  
  warn: (...args: any[]) => {
    if (IS_DEV) {
      console.warn(...args);
    }
  },
  
  info: (...args: any[]) => {
    if (DEBUG_ENABLED) {
      console.info(...args);
    }
  },
};

