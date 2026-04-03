declare namespace NodeJS {
  interface ProcessEnv {
    /** Project root (parent of dist-electron/) */
    APP_ROOT: string;
    VITE_PUBLIC: string;
  }
}

interface Window {
  ipcRenderer: import('electron').IpcRenderer;
}
