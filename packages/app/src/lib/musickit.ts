// MusicKit JS loader and helper utilities

const MUSICKIT_JS_URL = 'https://js-cdn.music.apple.com/musickit/v3/musickit.js'

let musicKitLoadPromise: Promise<void> | null = null

export function loadMusicKit(): Promise<void> {
  if (musicKitLoadPromise) return musicKitLoadPromise

  musicKitLoadPromise = new Promise((resolve, reject) => {
    // Check if already loaded
    if (window.MusicKit) {
      resolve()
      return
    }

    const script = document.createElement('script')
    script.src = MUSICKIT_JS_URL
    script.async = true
    script.onload = () => {
      // MusicKit dispatches a 'musickitloaded' event
      if (window.MusicKit) {
        resolve()
      } else {
        document.addEventListener('musickitloaded', () => resolve(), {
          once: true,
        })
      }
    }
    script.onerror = () => reject(new Error('Failed to load MusicKit JS'))
    document.head.appendChild(script)
  })

  return musicKitLoadPromise
}

export async function configureMusicKit(
  developerToken: string,
): Promise<MusicKit.MusicKitInstance> {
  await loadMusicKit()

  const instance = await window.MusicKit.configure({
    developerToken,
    app: {
      name: 'Musictron',
      build: '1.0.0',
    },
  })

  return instance
}

export function getMusicKitInstance(): MusicKit.MusicKitInstance | null {
  try {
    return window.MusicKit?.getInstance() ?? null
  } catch {
    return null
  }
}

// Apple Music API helper
export async function musicAPI(
  path: string,
  params?: Record<string, any>,
): Promise<any> {
  const instance = getMusicKitInstance()
  if (!instance) throw new Error('MusicKit not configured')

  // Replace storefront placeholder with actual storefront
  const storefront = instance.storefrontCountryCode || instance.storefrontId || 'us'
  const resolvedPath = path.replace('{{storefrontId}}', storefront)

  const response = await instance.api.music(resolvedPath, params)
  return response.data
}
