import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Musictron',
  description: 'Apple Music client',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <meta name="apple-music-developer-token" content="" />
        <meta name="apple-music-app-name" content="Musictron" />
        <meta name="apple-music-app-build" content="1.0.0" />
      </head>
      <body
        style={{
          margin: 0,
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Helvetica Neue", Arial, sans-serif',
          backgroundColor: '#0a0a0a',
          color: '#e5e5e5',
          minHeight: '100vh',
        }}
      >
        {children}
      </body>
    </html>
  )
}
