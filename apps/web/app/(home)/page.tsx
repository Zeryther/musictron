import { isConfigured } from '@/lib/musickit-token'

export default function HomePage() {
  const configured = isConfigured()

  return (
    <main
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: '2rem',
        textAlign: 'center',
      }}
    >
      <div style={{ marginBottom: '2rem' }}>
        <svg
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#e23650"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M9 18V5l12-2v13" />
          <circle cx="6" cy="18" r="3" />
          <circle cx="18" cy="16" r="3" />
        </svg>
      </div>

      <h1
        style={{
          fontSize: '2.5rem',
          fontWeight: 700,
          margin: '0 0 0.5rem',
          letterSpacing: '-0.02em',
        }}
      >
        Musictron
      </h1>

      <p
        style={{
          fontSize: '1.1rem',
          color: '#888',
          margin: '0 0 2rem',
          maxWidth: '420px',
        }}
      >
        API server for the Musictron Apple Music client.
      </p>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.625rem 1.25rem',
          borderRadius: '0.75rem',
          backgroundColor: configured
            ? 'rgba(34, 197, 94, 0.1)'
            : 'rgba(234, 179, 8, 0.1)',
          border: `1px solid ${configured ? 'rgba(34, 197, 94, 0.2)' : 'rgba(234, 179, 8, 0.2)'}`,
          fontSize: '0.875rem',
        }}
      >
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            backgroundColor: configured ? '#22c55e' : '#eab308',
          }}
        />
        {configured
          ? 'Server is configured and ready'
          : 'MusicKit credentials not configured'}
      </div>

      <div
        style={{
          marginTop: '3rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
          fontSize: '0.8rem',
          color: '#666',
        }}
      >
        <p>API endpoints:</p>
        <code
          style={{
            backgroundColor: '#1a1a1a',
            padding: '0.75rem 1.25rem',
            borderRadius: '0.5rem',
            display: 'block',
            textAlign: 'left',
            lineHeight: 1.8,
          }}
        >
          GET /api/health &nbsp;&mdash;&nbsp; health check
          <br />
          GET /api/config &nbsp;&mdash;&nbsp; server configuration
          <br />
          GET /api/token &nbsp;&nbsp;&mdash;&nbsp; get MusicKit developer token
        </code>
      </div>
    </main>
  )
}
