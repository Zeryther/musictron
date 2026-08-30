import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useAuthStore } from '@/stores/auth-store'
import { useLastfmStore } from '@/stores/lastfm-store'
import {
  useThemeStore,
  UI_SCALE_OPTIONS,
  type Theme,
} from '@/stores/theme-store'

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
  Radio,
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

  const { theme, setTheme, uiScale, setUiScale } = useThemeStore()

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
      <h1 className="text-3xl font-bold tracking-tight mb-8">Settings</h1>

      <div className="space-y-5">
        {/* Server Connection */}
        <Card className="space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Server className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold">Musictron Server</h2>
              <p className="text-xs text-muted-foreground">
                Connects to a server that provides MusicKit tokens
              </p>
            </div>
            {serverConfigured === true && (
              <div className="flex items-center gap-1.5 text-green-500 text-xs">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Ready
              </div>
            )}
            {serverConfigured === false && (
              <div className="flex items-center gap-1.5 text-yellow-500 text-xs">
                <AlertCircle className="w-3.5 h-3.5" />
                Unavailable
              </div>
            )}
          </div>

          <div className="space-y-2.5">
            <div className="flex items-center gap-2">
              <Globe className="w-3.5 h-3.5 text-muted-foreground" />
              <label htmlFor="server-url" className="text-sm font-medium">
                Server URL
              </label>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              The official Musictron server is used by default. Self-hosters can
              point this to their own instance.
            </p>
            <div className="flex gap-2">
              <Input
                id="server-url"
                value={serverInput}
                onChange={(e) => setServerInput(e.target.value)}
                placeholder="https://musictron.example.com"
                className="font-mono text-xs bg-foreground/[0.04] border-foreground/[0.06]"
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
        </Card>

        {/* Apple Music */}
        <Card className="space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#fc3c44] to-[#d32f3a] flex items-center justify-center shadow-lg shadow-red-500/20">
              <Music2 className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold">Apple Music</h2>
              <p className="text-xs text-muted-foreground">
                {tokenSource === 'server'
                  ? 'Token provided by server'
                  : 'Connect your Apple Music account'}
              </p>
            </div>
            {isAuthorized && (
              <div className="flex items-center gap-1.5 text-green-500 text-xs">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Connected
              </div>
            )}
          </div>

          {/* Manual token fallback */}
          {!serverConfigured && (
            <div className="space-y-2.5">
              <div className="flex items-center gap-2">
                <Key className="w-3.5 h-3.5 text-muted-foreground" />
                <label
                  htmlFor="developer-token"
                  className="text-sm font-medium"
                >
                  Developer Token (JWT)
                </label>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
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
                  className="font-mono text-xs bg-foreground/[0.04] border-foreground/[0.06]"
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
            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-foreground/[0.03] rounded-lg p-3">
              <Server className="w-3.5 h-3.5 flex-shrink-0" />
              Developer token is managed by the Musictron server. It will be
              refreshed automatically.
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/10 rounded-lg p-3">
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
        </Card>

        {/* Last.fm */}
        <LastfmSettings />

        {/* Appearance */}
        <Card className="space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
              <Palette className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Appearance</h2>
              <p className="text-xs text-muted-foreground">
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
                <span className="text-sm font-medium">{label}</span>
              </button>
            ))}
          </div>

          <div className="space-y-2.5">
            <div>
              <h3 className="text-sm font-medium">UI Scale</h3>
              <p className="text-xs text-muted-foreground">
                Adjust the size of the entire interface
              </p>
            </div>
            <div className="grid grid-cols-4 gap-2.5">
              {UI_SCALE_OPTIONS.map((scale) => (
                <button
                  key={scale}
                  onClick={() => setUiScale(scale)}
                  className={`p-3 rounded-xl border text-sm font-medium transition-all duration-150 ${
                    uiScale === scale
                      ? 'border-primary bg-primary/[0.08] text-foreground'
                      : 'border-border text-muted-foreground hover:bg-accent/40 hover:text-foreground'
                  }`}
                >
                  {Math.round(scale * 100)}%
                </button>
              ))}
            </div>
          </div>
        </Card>

        {/* About */}
        <Card className="space-y-2.5">
          <h2 className="text-lg font-semibold">About</h2>
          <div className="space-y-1.5 text-sm text-muted-foreground">
            <p>
              <span className="font-medium text-foreground">Musictron</span>{' '}
              v1.0.0
            </p>
            <p>
              A beautiful Apple Music client built with React and MusicKit JS.
            </p>
          </div>
        </Card>

        {/* Keyboard Shortcuts */}
        <Card className="space-y-3">
          <h2 className="text-lg font-semibold">Keyboard Shortcuts</h2>
          <div className="grid grid-cols-2 gap-y-2.5 text-sm">
            {[
              ['Play/Pause', 'Space'],
              ['Next Track', 'Ctrl+Right'],
              ['Previous Track', 'Ctrl+Left'],
              ['Volume Up/Down', 'Ctrl+Up/Down'],
              ['Mute', 'Ctrl+M'],
              ['Toggle Queue', 'Ctrl+Q'],
            ].map(([action, key]) => (
              <React.Fragment key={action}>
                <span className="text-muted-foreground">{action}</span>
                <span className="text-right">
                  <kbd className="font-mono text-2xs bg-foreground/[0.06] text-muted-foreground px-2 py-0.5 rounded">
                    {key}
                  </kbd>
                </span>
              </React.Fragment>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}

// ─── Last.fm Settings ────────────────────────────────────────────────────────

function LastfmSettings() {
  const {
    isConnected,
    username,
    serverConfigured,
    scrobblingEnabled,
    nowPlayingEnabled,
    checkServer,
    startAuth,
    pollForSession,
    disconnect,
    setScrobblingEnabled,
    setNowPlayingEnabled,
  } = useLastfmStore()

  const [isLoading, setIsLoading] = useState(false)
  const [isPolling, setIsPolling] = useState(false)

  useEffect(() => {
    checkServer()
  }, [checkServer])

  const handleConnect = async () => {
    setIsLoading(true)
    try {
      const result = await startAuth()
      if (!result) {
        setIsLoading(false)
        return
      }

      // Open Last.fm auth page in a centered popup (web) or new window
      const width = 800
      const height = 600
      const left = Math.round(window.screenX + (window.outerWidth - width) / 2)
      const top = Math.round(window.screenY + (window.outerHeight - height) / 2)
      const popup = window.open(
        result.url,
        'lastfm-auth',
        `width=${width},height=${height},left=${left},top=${top},popup=yes`,
      )

      // Start polling for the user to approve
      setIsPolling(true)
      setIsLoading(false)

      const success = await pollForSession(result.token)
      setIsPolling(false)

      // Close the popup if it's still open after auth succeeds
      if (success && popup && !popup.closed) {
        popup.close()
      }
    } catch {
      setIsLoading(false)
      setIsPolling(false)
    }
  }

  // Don't render if the server doesn't have Last.fm configured
  if (serverConfigured === false) return null

  return (
    <Card className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#d51007] to-[#b90a00] flex items-center justify-center shadow-lg shadow-red-800/20">
          <Radio className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-semibold">Last.fm</h2>
          <p className="text-xs text-muted-foreground">
            {isConnected
              ? `Scrobbling as ${username}`
              : 'Scrobble your listening history'}
          </p>
        </div>
        {isConnected && (
          <div className="flex items-center gap-1.5 text-green-500 text-xs">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Connected
          </div>
        )}
      </div>

      {isConnected ? (
        <>
          {/* Scrobbling toggle */}
          <div className="space-y-3">
            <SettingsToggle
              label="Enable scrobbling"
              description="Automatically scrobble tracks you listen to"
              enabled={scrobblingEnabled}
              onChange={setScrobblingEnabled}
            />
            <SettingsToggle
              label="Update Now Playing"
              description="Show what you're listening to on your Last.fm profile"
              enabled={nowPlayingEnabled}
              onChange={setNowPlayingEnabled}
            />
          </div>

          {/* Profile link + disconnect */}
          <div className="flex items-center gap-2.5">
            <a
              href={`https://www.last.fm/user/${username}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              View profile
              <ExternalLink className="w-3 h-3" />
            </a>
            <span className="w-0.5 h-0.5 rounded-full bg-muted-foreground/60" />
            <Button
              onClick={disconnect}
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground hover:text-destructive h-auto p-0"
            >
              Disconnect
            </Button>
          </div>
        </>
      ) : (
        <div className="space-y-3">
          <div className="flex gap-2.5">
            <Button
              onClick={handleConnect}
              disabled={isLoading || isPolling || serverConfigured === null}
              className="gap-2"
            >
              {isLoading || isPolling ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <LogIn className="w-4 h-4" />
              )}
              {isPolling ? 'Waiting for approval...' : 'Connect to Last.fm'}
            </Button>
          </div>
          {isPolling && (
            <p className="text-xs text-muted-foreground">
              Approve access in the Last.fm tab, then return here.
            </p>
          )}
        </div>
      )}
    </Card>
  )
}

// ─── Toggle Component ────────────────────────────────────────────────────────

interface SettingsToggleProps {
  label: string
  description: string
  enabled: boolean
  onChange: (enabled: boolean) => void
}

function SettingsToggle({
  label,
  description,
  enabled,
  onChange,
}: SettingsToggleProps) {
  return (
    <button
      onClick={() => onChange(!enabled)}
      className="flex items-center gap-3 w-full text-left group"
    >
      <div
        className={`relative w-9 h-5 rounded-full transition-colors duration-200 shrink-0 ${
          enabled ? 'bg-primary' : 'bg-foreground/[0.1]'
        }`}
      >
        <div
          className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${
            enabled ? 'translate-x-[1.125rem]' : 'translate-x-0.5'
          }`}
        />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-2xs text-muted-foreground">{description}</p>
      </div>
    </button>
  )
}
