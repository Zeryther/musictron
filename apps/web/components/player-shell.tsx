'use client'

import React from 'react'
import { BrowserRouter } from 'react-router-dom'
import {
  App,
  setPlatformAdapter,
  setAppConfig,
  type PlatformAdapter,
} from '@musictron/app'
import '@musictron/app/styles.css'

// ---------------------------------------------------------------------------
// Browser platform adapter
// ---------------------------------------------------------------------------

const browserAdapter: PlatformAdapter = {
  type: 'web',
  getPlatform: async () => 'web',
  setTitle: (title) => {
    document.title = title
  },
  // Window controls and media keys are not available on the web.
}

setPlatformAdapter(browserAdapter)

setAppConfig({
  // On the web, the API server is the same origin by default.
  serverUrl: typeof window !== 'undefined' ? window.location.origin : '',
  developerToken: '',
})

// ---------------------------------------------------------------------------
// Shell
// ---------------------------------------------------------------------------

export default function PlayerShell() {
  return (
    <React.StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </React.StrictMode>
  )
}
