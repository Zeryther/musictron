import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Musictron',
  description: 'Apple Music client',
}

const themeScript = `
try {
  var s = JSON.parse(localStorage.getItem('musictron-theme') || '{}');
  var t = (s.state && s.state.theme) || 'system';
  var d = t === 'system'
    ? window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    : t;
  document.documentElement.classList.add(d);
} catch(e) { document.documentElement.classList.add('dark'); }
`

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="apple-music-developer-token" content="" />
        <meta name="apple-music-app-name" content="Musictron" />
        <meta name="apple-music-app-build" content="1.0.0" />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body
        style={{
          margin: 0,
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Helvetica Neue", Arial, sans-serif',
          minHeight: '100vh',
        }}
      >
        {children}
      </body>
    </html>
  )
}
