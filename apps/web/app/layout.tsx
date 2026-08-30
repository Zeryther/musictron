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
  var z = s.state && s.state.uiScale;
  if (typeof z === 'number' && isFinite(z) && z !== 1) {
    document.documentElement.style.fontSize = (z * 100) + '%';
  }
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
