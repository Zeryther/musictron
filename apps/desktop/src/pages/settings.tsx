import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuthStore } from '@/stores/auth-store'
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

  const [tokenInput, setTokenInput] = useState(
    tokenSource === 'manual' ? developerToken : '',
  )
  const [serverInput, setServerInput] = useState(serverUrl)
  const [tokenSaved, setTokenSaved] = useState(false)
  const [serverChecking, setServerChecking] = useState(false)
  const [serverSaved, setServerSaved] = useState(false)

  // Check server on mount
  useEffect(() => {
    checkServer()
  }, [])

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
      // Try fetching from server first
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
      <div className="pt-2 mb-8">
        <h1 className="text-3xl font-bold">Settings</h1>
      </div>

      <div className="space-y-6">
        {/* Server Connection */}
        <div className="rounded-xl border border-border p-6 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
              <Server className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Musictron Server</h2>
              <p className="text-sm text-muted-foreground">
                Connects to a server that provides MusicKit tokens
              </p>
            </div>
            {serverConfigured === true && (
              <div className="ml-auto flex items-center gap-1.5 text-green-500 text-sm">
                <CheckCircle2 className="w-4 h-4" />
                Ready
              </div>
            )}
            {serverConfigured === false && (
              <div className="ml-auto flex items-center gap-1.5 text-yellow-500 text-sm">
                <AlertCircle className="w-4 h-4" />
                Unavailable
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-muted-foreground" />
              <label className="text-sm font-medium">Server URL</label>
            </div>
            <p className="text-xs text-muted-foreground">
              The official Musictron server is used by default. Self-hosters can
              point this to their own instance.
            </p>
            <div className="flex gap-2">
              <Input
                value={serverInput}
                onChange={(e) => setServerInput(e.target.value)}
                placeholder="https://musictron.example.com"
                className="font-mono text-xs"
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

          {/* Fetch token from server */}
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

        {/* Apple Music Connection */}
        <div className="rounded-xl border border-border p-6 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#fc3c44] to-[#d32f3a] flex items-center justify-center">
              <Music2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Apple Music</h2>
              <p className="text-sm text-muted-foreground">
                {tokenSource === 'server'
                  ? 'Token provided by server'
                  : 'Connect your Apple Music account'}
              </p>
            </div>
            {isAuthorized && (
              <div className="ml-auto flex items-center gap-1.5 text-green-500 text-sm">
                <CheckCircle2 className="w-4 h-4" />
                Connected
              </div>
            )}
          </div>

          {/* Manual Developer Token (fallback) */}
          {!serverConfigured && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4 text-muted-foreground" />
                <label className="text-sm font-medium">
                  Developer Token (JWT)
                </label>
              </div>
              <p className="text-xs text-muted-foreground">
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
                  type="password"
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  placeholder="eyJhbGciOiJFUzI1NiIs..."
                  className="font-mono text-xs"
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

          {/* Status info when using server token */}
          {serverConfigured && tokenSource === 'server' && developerToken && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
              <Server className="w-4 h-4 flex-shrink-0" />
              Developer token is managed by the Musictron server. It will be
              refreshed automatically.
            </div>
          )}

          {/* Error display */}
          {error && (
            <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 rounded-lg p-3">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Auth actions */}
          <div className="flex gap-3">
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

        {/* About */}
        <div className="rounded-xl border border-border p-6 space-y-3">
          <h2 className="text-lg font-semibold">About</h2>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>
              <span className="font-medium text-foreground">Musictron</span>{' '}
              v1.0.0
            </p>
            <p>
              A beautiful Apple Music client built with Electron, React, and
              MusicKit JS.
            </p>
          </div>
        </div>

        {/* Keyboard Shortcuts */}
        <div className="rounded-xl border border-border p-6 space-y-3">
          <h2 className="text-lg font-semibold">Keyboard Shortcuts</h2>
          <div className="grid grid-cols-2 gap-y-2 text-sm">
            <span className="text-muted-foreground">Play/Pause</span>
            <span className="text-right font-mono text-xs bg-muted px-2 py-0.5 rounded w-fit ml-auto">
              Space
            </span>
            <span className="text-muted-foreground">Next Track</span>
            <span className="text-right font-mono text-xs bg-muted px-2 py-0.5 rounded w-fit ml-auto">
              Ctrl+Right
            </span>
            <span className="text-muted-foreground">Previous Track</span>
            <span className="text-right font-mono text-xs bg-muted px-2 py-0.5 rounded w-fit ml-auto">
              Ctrl+Left
            </span>
            <span className="text-muted-foreground">Volume Up/Down</span>
            <span className="text-right font-mono text-xs bg-muted px-2 py-0.5 rounded w-fit ml-auto">
              Ctrl+Up/Down
            </span>
            <span className="text-muted-foreground">Mute</span>
            <span className="text-right font-mono text-xs bg-muted px-2 py-0.5 rounded w-fit ml-auto">
              Ctrl+M
            </span>
            <span className="text-muted-foreground">Toggle Queue</span>
            <span className="text-right font-mono text-xs bg-muted px-2 py-0.5 rounded w-fit ml-auto">
              Ctrl+Q
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
