'use client'

import React from 'react'

/**
 * Layout for the Musictron web player routes.
 * This is a client component because the entire player UI relies on
 * browser-only APIs (MusicKit JS, localStorage, etc.).
 */
export default function PlayerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
