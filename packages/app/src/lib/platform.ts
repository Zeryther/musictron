/**
 * Platform adapter interface.
 *
 * Each host (Electron, web browser) provides its own implementation so that
 * the shared React app never imports Electron or other host-specific APIs
 * directly.
 */

export interface PlatformAdapter {
  /** Identifier for the runtime: 'electron' or 'web' */
  readonly type: 'electron' | 'web'

  /**
   * Returns the OS platform string.
   * Electron returns `process.platform` (e.g. 'darwin', 'win32', 'linux').
   * Web returns 'web'.
   */
  getPlatform: () => Promise<string>

  /** Sets the window/document title. */
  setTitle: (title: string) => void

  /** Window controls — only meaningful in Electron. */
  windowMinimize?: () => Promise<void>
  windowMaximize?: () => Promise<void>
  windowIsMaximized?: () => Promise<boolean>
  windowClose?: () => Promise<void>
  onWindowMaximizedChange?: (
    callback: (isMaximized: boolean) => void,
  ) => () => void

  /** Media key events — only meaningful in Electron. */
  onMediaKey?: (callback: (key: string) => void) => () => void
}

/**
 * App-level configuration provided by the host at mount time.
 *
 * This replaces the Vite-specific `import.meta.env` references that were
 * previously hard-coded in the app.
 */
export interface AppConfig {
  /** URL of the Musictron API server (token provider) */
  serverUrl: string
  /** Pre-configured MusicKit developer token, if any */
  developerToken: string
}

// ---------------------------------------------------------------------------
// Singleton – set once by the host before rendering <App />
// ---------------------------------------------------------------------------

let _platform: PlatformAdapter | null = null
let _config: AppConfig | null = null

export function setPlatformAdapter(adapter: PlatformAdapter) {
  _platform = adapter
}

export function getPlatformAdapter(): PlatformAdapter {
  if (!_platform) {
    throw new Error(
      'PlatformAdapter not initialised. Call setPlatformAdapter() before rendering <App />.',
    )
  }
  return _platform
}

export function setAppConfig(config: AppConfig) {
  _config = config
}

export function getAppConfig(): AppConfig {
  if (!_config) {
    throw new Error(
      'AppConfig not initialised. Call setAppConfig() before rendering <App />.',
    )
  }
  return _config
}
