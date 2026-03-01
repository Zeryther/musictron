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
  onWindowMaximizedChange: (cb) =>
    window.electronAPI.onWindowMaximizedChange(cb),
  onMediaKey: (cb) => window.electronAPI.onMediaKey(cb),
}

setPlatformAdapter(electronAdapter)

// Vite injects env variables at build time via import.meta.env
const viteEnv = (
  import.meta as ImportMeta & { env: Record<string, string | undefined> }
).env

setAppConfig({
  serverUrl: viteEnv.VITE_MUSICTRON_SERVER_URL || 'http://localhost:3000',
  developerToken: viteEnv.VITE_MUSICKIT_DEVELOPER_TOKEN || '',
})

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

const rootEl = document.getElementById('root')
if (!rootEl) throw new Error('Root element not found')
ReactDOM.createRoot(rootEl).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)
