import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import {
  App,
  setPlatformAdapter,
  setAppConfig,
  type PlatformAdapter,
} from '@musictron/app'
import '@musictron/app/styles.css'

// ---------------------------------------------------------------------------
// Electron platform adapter
// ---------------------------------------------------------------------------

const electronAdapter: PlatformAdapter = {
  type: 'electron',
  getPlatform: () => window.electronAPI.getPlatform(),
  setTitle: (title) => window.electronAPI.setTitle(title),
  windowMinimize: () => window.electronAPI.windowMinimize(),
  windowMaximize: () => window.electronAPI.windowMaximize(),
  windowIsMaximized: () => window.electronAPI.windowIsMaximized(),
  windowClose: () => window.electronAPI.windowClose(),
  onWindowMaximizedChange: (cb) => window.electronAPI.onWindowMaximizedChange(cb),
  onMediaKey: (cb) => window.electronAPI.onMediaKey(cb),
}

setPlatformAdapter(electronAdapter)

setAppConfig({
  serverUrl:
    (import.meta as any).env?.VITE_MUSICTRON_SERVER_URL || 'http://localhost:3000',
  developerToken:
    (import.meta as any).env?.VITE_MUSICKIT_DEVELOPER_TOKEN || '',
})

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)
