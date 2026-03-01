import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuthStore } from '@/stores/auth-store'
import { useThemeStore, type Theme } from '@/stores/theme-store'
import {
  Music2,
  Key,
  LogIn,
  LogOut,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ExternalLink,
  Server,
  Globe,
  RefreshCw,
  Sun,
  Moon,
  Monitor,
  Palette,
} from 'lucide-react'

export function SettingsPage() {
  const {
    isAuthorized,
    isLoading,
    developerToken,
    error,
    serverUrl,
    serverConfigured,
    tokenSource,
    setDeveloperToken,
    setServerUrl,
    initialize,
    authorize,
    signOut,
    checkServer,
    fetchTokenFromServer,
  } = useAuthStore()

  const { theme, setTheme } = useThemeStore()

  const [tokenInput, setTokenInput] = useState(
    tokenSource === 'manual' ? developerToken : '',
  )
  const [serverInput, setServerInput] = useState(serverUrl)
  const [tokenSaved, setTokenSaved] = useState(false)
  const [serverChecking, setServerChecking] = useState(false)
  const [serverSaved, setServerSaved] = useState(false)

  useEffect(() => {
    checkServer()
  }, [checkServer])

  const handleSaveToken = async () => {
    setDeveloperToken(tokenInput)
    setTokenSaved(true)
    await initialize()
    setTimeout(() => setTokenSaved(false), 3000)
  }

  const handleSaveServer = async () => {
    setServerUrl(serverInput)
    setServerSaved(true)
    setServerChecking(true)
    await checkServer()
    setServerChecking(false)
    setTimeout(() => setServerSaved(false), 3000)
  }

  const handleFetchFromServer = async () => {
    setServerChecking(true)
    const token = await fetchTokenFromServer()
    setServerChecking(false)
    if (token) {
      await initialize()
    }
  }

  const handleSignIn = async () => {
    if (!developerToken) {
      const token = await fetchTokenFromServer()
      if (!token) return
      await initialize()
    } else {
      await initialize()
    }
    await authorize()
  }

  return (
    <div className="max-w-2xl animate-fade-in">
      <h1 className="text-[28px] font-bold tracking-tight mb-8">Settings</h1>

      <div className="space-y-5">
        {/* Server Connection */}
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Server className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="text-[16px] font-semibold">Musictron Server</h2>
              <p className="text-[12px] text-muted-foreground/60">
                Connects to a server that provides MusicKit tokens
              </p>
            </div>
            {serverConfigured === true && (
              <div className="flex items-center gap-1.5 text-green-500 text-[12px]">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Ready
              </div>
            )}
            {serverConfigured === false && (
              <div className="flex items-center gap-1.5 text-yellow-500 text-[12px]">
                <AlertCircle className="w-3.5 h-3.5" />
                Unavailable
              </div>
            )}
          </div>

          <div className="space-y-2.5">
            <div className="flex items-center gap-2">
              <Globe className="w-3.5 h-3.5 text-muted-foreground/40" />
              <label htmlFor="server-url" className="text-[13px] font-medium">
                Server URL
              </label>
            </div>
            <p className="text-[12px] text-muted-foreground/50 leading-relaxed">
              The official Musictron server is used by default. Self-hosters can
              point this to their own instance.
            </p>
            <div className="flex gap-2">
              <Input
                id="server-url"
                value={serverInput}
                onChange={(e) => setServerInput(e.target.value)}
                placeholder="https://musictron.example.com"
                className="font-mono text-[12px] bg-white/[0.04] border-white/[0.06]"
              />
              <Button
                onClick={handleSaveServer}
                variant="outline"
                disabled={serverChecking}
              >
                {serverChecking ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : serverSaved ? (
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                ) : (
                  'Save'
                )}
              </Button>
            </div>
          </div>

          {serverConfigured && !isAuthorized && (
            <Button
              onClick={handleFetchFromServer}
              variant="outline"
              disabled={serverChecking || isLoading}
              className="gap-2"
            >
              {serverChecking ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              Fetch Token from Server
            </Button>
          )}
        </div>

        {/* Apple Music */}
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#fc3c44] to-[#d32f3a] flex items-center justify-center shadow-lg shadow-red-500/20">
              <Music2 className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="text-[16px] font-semibold">Apple Music</h2>
              <p className="text-[12px] text-muted-foreground/60">
                {tokenSource === 'server'
                  ? 'Token provided by server'
                  : 'Connect your Apple Music account'}
              </p>
            </div>
            {isAuthorized && (
              <div className="flex items-center gap-1.5 text-green-500 text-[12px]">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Connected
              </div>
            )}
          </div>

          {/* Manual token fallback */}
          {!serverConfigured && (
            <div className="space-y-2.5">
              <div className="flex items-center gap-2">
                <Key className="w-3.5 h-3.5 text-muted-foreground/40" />
                <label
                  htmlFor="developer-token"
                  className="text-[13px] font-medium"
                >
                  Developer Token (JWT)
                </label>
              </div>
              <p className="text-[12px] text-muted-foreground/50 leading-relaxed">
                If no server is available, you can provide your own MusicKit
                developer token. Requires an{' '}
                <a
                  href="https://developer.apple.com/documentation/applemusicapi/generating-developer-tokens"
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary hover:underline inline-flex items-center gap-0.5"
                >
                  Apple Developer account
                  <ExternalLink className="w-3 h-3" />
                </a>
                .
              </p>
              <div className="flex gap-2">
                <Input
                  id="developer-token"
                  type="password"
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  placeholder="eyJhbGciOiJFUzI1NiIs..."
                  className="font-mono text-[12px] bg-white/[0.04] border-white/[0.06]"
                />
                <Button
                  onClick={handleSaveToken}
                  variant="outline"
                  disabled={!tokenInput || isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : tokenSaved ? (
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                  ) : (
                    'Save'
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Server token info */}
          {serverConfigured && tokenSource === 'server' && developerToken && (
            <div className="flex items-center gap-2 text-[12px] text-muted-foreground/50 bg-white/[0.03] rounded-lg p-3">
              <Server className="w-3.5 h-3.5 flex-shrink-0" />
              Developer token is managed by the Musictron server. It will be
              refreshed automatically.
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 text-[12px] text-destructive bg-destructive/10 rounded-lg p-3">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Auth actions */}
          <div className="flex gap-2.5">
            {!isAuthorized ? (
              <Button
                onClick={handleSignIn}
                disabled={(!developerToken && !serverConfigured) || isLoading}
                className="gap-2"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <LogIn className="w-4 h-4" />
                )}
                Sign in with Apple Music
              </Button>
            ) : (
              <Button onClick={signOut} variant="outline" className="gap-2">
                <LogOut className="w-4 h-4" />
                Sign Out
              </Button>
            )}
          </div>
        </div>

        {/* Appearance */}
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
              <Palette className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-[16px] font-semibold">Appearance</h2>
              <p className="text-[12px] text-muted-foreground/60">
                Choose how Musictron looks
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            {(
              [
                { value: 'light', label: 'Light', icon: Sun },
                { value: 'dark', label: 'Dark', icon: Moon },
                { value: 'system', label: 'System', icon: Monitor },
              ] as const
            ).map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                onClick={() => setTheme(value as Theme)}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all duration-150 ${
                  theme === value
                    ? 'border-primary bg-primary/[0.08] text-foreground'
                    : 'border-border text-muted-foreground hover:bg-accent/40 hover:text-foreground'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[13px] font-medium">{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* About */}
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 space-y-2.5">
          <h2 className="text-[16px] font-semibold">About</h2>
          <div className="space-y-1.5 text-[13px] text-muted-foreground/60">
            <p>
              <span className="font-medium text-foreground">Musictron</span>{' '}
              v1.0.0
            </p>
            <p>
              A beautiful Apple Music client built with React and MusicKit JS.
            </p>
          </div>
        </div>

        {/* Keyboard Shortcuts */}
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 space-y-3">
          <h2 className="text-[16px] font-semibold">Keyboard Shortcuts</h2>
          <div className="grid grid-cols-2 gap-y-2.5 text-[13px]">
            {[
              ['Play/Pause', 'Space'],
              ['Next Track', 'Ctrl+Right'],
              ['Previous Track', 'Ctrl+Left'],
              ['Volume Up/Down', 'Ctrl+Up/Down'],
              ['Mute', 'Ctrl+M'],
              ['Toggle Queue', 'Ctrl+Q'],
            ].map(([action, key]) => (
              <React.Fragment key={action}>
                <span className="text-muted-foreground/60">{action}</span>
                <span className="text-right">
                  <kbd className="font-mono text-[11px] bg-white/[0.06] text-muted-foreground px-2 py-0.5 rounded">
                    {key}
                  </kbd>
                </span>
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
