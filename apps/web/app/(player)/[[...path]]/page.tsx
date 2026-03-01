'use client'

import dynamic from 'next/dynamic'

/**
 * Dynamically import the player shell with SSR disabled.
 *
 * MusicKit JS, react-router-dom, and the Zustand stores all require browser
 * APIs, so the entire shared app must be rendered client-side only.
 */
const PlayerShell = dynamic(() => import('@web/components/player-shell'), {
  ssr: false,
  loading: () => (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        backgroundColor: '#0a0a0a',
        color: '#888',
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Helvetica Neue", Arial, sans-serif',
      }}
    >
      Loading Musictron...
    </div>
  ),
})

export default function PlayerPage() {
  return <PlayerShell />
}
