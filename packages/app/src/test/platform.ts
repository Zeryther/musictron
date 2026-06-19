import {
  setAppConfig,
  setPlatformAdapter,
  type AppConfig,
  type PlatformAdapter,
} from '@/lib/platform'

/** Install a test AppConfig so `getAppConfig()` doesn't throw. */
export function installTestConfig(
  overrides: Partial<AppConfig> = {},
): AppConfig {
  const config: AppConfig = {
    serverUrl: 'http://localhost:3000',
    developerToken: '',
    ...overrides,
  }
  setAppConfig(config)
  return config
}

/** Install a minimal web PlatformAdapter so `getPlatformAdapter()` works. */
export function installTestPlatform(
  overrides: Partial<PlatformAdapter> = {},
): PlatformAdapter {
  const adapter: PlatformAdapter = {
    type: 'web',
    getPlatform: async () => 'web',
    setTitle: () => {},
    ...overrides,
  }
  setPlatformAdapter(adapter)
  return adapter
}
