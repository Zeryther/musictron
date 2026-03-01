// Re-export the App component and setup utilities so hosts can import them.
export { default as App } from './App'

export {
  setPlatformAdapter,
  getPlatformAdapter,
  setAppConfig,
  getAppConfig,
  type PlatformAdapter,
  type AppConfig,
} from './lib/platform'
