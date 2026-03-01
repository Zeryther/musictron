import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  getPlatform: () => ipcRenderer.invoke('get-platform'),
  getTheme: () => ipcRenderer.invoke('get-theme'),
  setTitle: (title: string) => ipcRenderer.send('set-title', title),
  windowMinimize: () => ipcRenderer.invoke('window-minimize'),
  windowMaximize: () => ipcRenderer.invoke('window-maximize'),
  windowClose: () => ipcRenderer.invoke('window-close'),
  onMediaKey: (callback: (key: string) => void) => {
    ipcRenderer.on('media-key', (_event, key) => callback(key))
    return () => {
      ipcRenderer.removeAllListeners('media-key')
    }
  },
})
