import React, { useState, useCallback, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Input } from '@/components/ui/input'
import { MediaCard } from '@/components/ui/media-card'
import { SongRow } from '@/components/ui/song-row'
import { Artwork } from '@/components/ui/artwork'
import { musicAPI } from '@/lib/musickit'
import { usePlayerStore } from '@/stores/player-store'
import { formatArtworkUrl } from '@/lib/utils'
import { Search as SearchIcon, Loader2, X, TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function SearchPage() {
  const navigate = useNavigate()
  const { playSongs } = usePlayerStore()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [hints, setHints] = useState<string[]>([])
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const search = useCallback(async (term: string) => {
    if (!term.trim()) {
      setResults(null)
      setHints([])
      return
    }

    setLoading(true)
    try {
      // Fetch search hints and results in parallel
      const [searchResults, searchHints] = await Promise.all([
        musicAPI('/v1/catalog/us/search', {
          term,
          types: 'songs,albums,artists,playlists',
          limit: 10,
        }).catch(() => null),
        musicAPI('/v1/catalog/us/search/hints', {
          term,
          limit: 5,
        }).catch(() => null),
      ])

      setResults(searchResults?.results || null)
      setHints(searchHints?.results?.terms || [])
    } catch (error) {
      console.error('Search failed:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setQuery(value)

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => search(value), 300)
  }

  const handleClear = () => {
    setQuery('')
    setResults(null)
    setHints([])
    inputRef.current?.focus()
  }

  const songs = results?.songs?.data || []
  const albums = results?.albums?.data || []
  const artists = results?.artists?.data || []
  const playlists = results?.playlists?.data || []
  const hasResults = songs.length > 0 || albums.length > 0 || artists.length > 0 || playlists.length > 0

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="pt-2">
        <h1 className="text-3xl font-bold mb-4">Search</h1>

        {/* Search input */}
        <div className="relative max-w-lg">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            ref={inputRef}
            value={query}
            onChange={handleInputChange}
            placeholder="Artists, songs, albums, playlists..."
            className="pl-9 pr-9 h-10 bg-secondary border-none"
          />
          {query && (
            <button
              onClick={handleClear}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              <X className="w-4 h-4 text-muted-foreground hover:text-foreground" />
            </button>
          )}
        </div>

        {/* Search hints */}
        {hints.length > 0 && (
          <div className="flex gap-2 mt-3">
            {hints.map((hint) => (
              <button
                key={hint}
                onClick={() => {
                  setQuery(hint)
                  search(hint)
                }}
                className="px-3 py-1 rounded-full text-xs bg-secondary hover:bg-secondary/80 text-muted-foreground transition-colors"
              >
                {hint}
              </button>
            ))}
          </div>
        )}
      </div>

      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {!loading && !hasResults && query && (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <SearchIcon className="w-12 h-12 mb-4 opacity-30" />
          <p className="text-lg font-medium">No results found</p>
          <p className="text-sm">Try a different search term</p>
        </div>
      )}

      {!loading && !query && (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <SearchIcon className="w-12 h-12 mb-4 opacity-20" />
          <p className="text-lg">Search Apple Music</p>
          <p className="text-sm mt-1">Find your favorite music</p>
        </div>
      )}

      {!loading && hasResults && (
        <div className="space-y-8">
          {/* Top Result + Songs side by side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Result */}
            {(artists.length > 0 || albums.length > 0) && (
              <section>
                <h2 className="text-xl font-semibold mb-3">Top Result</h2>
                {artists.length > 0 ? (
                  <div
                    className="p-5 rounded-xl bg-secondary/50 hover:bg-secondary/70 transition-colors cursor-pointer"
                    onClick={() => navigate(`/artist/${artists[0].id}`)}
                  >
                    <Artwork
                      src={formatArtworkUrl(
                        artists[0].attributes?.artwork?.url,
                        200,
                      )}
                      alt={artists[0].attributes?.name}
                      size={100}
                      rounded="full"
                      className="mb-3"
                    />
                    <h3 className="text-2xl font-bold">
                      {artists[0].attributes?.name}
                    </h3>
                    <p className="text-sm text-muted-foreground">Artist</p>
                  </div>
                ) : (
                  <div
                    className="p-5 rounded-xl bg-secondary/50 hover:bg-secondary/70 transition-colors cursor-pointer"
                    onClick={() => navigate(`/album/${albums[0].id}`)}
                  >
                    <Artwork
                      src={formatArtworkUrl(
                        albums[0].attributes?.artwork?.url,
                        200,
                      )}
                      alt={albums[0].attributes?.name}
                      size={100}
                      rounded="md"
                      className="mb-3"
                    />
                    <h3 className="text-2xl font-bold">
                      {albums[0].attributes?.name}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {albums[0].attributes?.artistName}
                    </p>
                  </div>
                )}
              </section>
            )}

            {/* Songs */}
            {songs.length > 0 && (
              <section>
                <h2 className="text-xl font-semibold mb-3">Songs</h2>
                <div className="space-y-0.5">
                  {songs.slice(0, 5).map((song: any, idx: number) => (
                    <SongRow
                      key={song.id}
                      id={song.id}
                      name={song.attributes?.name}
                      artistName={song.attributes?.artistName}
                      artworkUrl={song.attributes?.artwork?.url}
                      duration={song.attributes?.durationInMillis || 0}
                      showAlbum={false}
                      onClick={() => {
                        const ids = songs.map((s: any) => s.id)
                        playSongs(ids, idx)
                      }}
                    />
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Artists */}
          {artists.length > 1 && (
            <section>
              <h2 className="text-xl font-semibold mb-3">Artists</h2>
              <div className="flex gap-4 overflow-x-auto pb-2">
                {artists.slice(0, 8).map((artist: any) => (
                  <div
                    key={artist.id}
                    className="flex flex-col items-center gap-2 cursor-pointer group"
                    onClick={() => navigate(`/artist/${artist.id}`)}
                  >
                    <Artwork
                      src={formatArtworkUrl(
                        artist.attributes?.artwork?.url,
                        200,
                      )}
                      alt={artist.attributes?.name}
                      size={140}
                      rounded="full"
                    />
                    <p className="text-sm font-medium text-center line-clamp-1 w-[140px]">
                      {artist.attributes?.name}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Albums */}
          {albums.length > 0 && (
            <section>
              <h2 className="text-xl font-semibold mb-3">Albums</h2>
              <div className="flex flex-wrap gap-4">
                {albums.map((album: any) => (
                  <MediaCard
                    key={album.id}
                    id={album.id}
                    type="album"
                    name={album.attributes?.name}
                    subtitle={album.attributes?.artistName}
                    artworkUrl={album.attributes?.artwork?.url}
                    onClick={() => navigate(`/album/${album.id}`)}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Playlists */}
          {playlists.length > 0 && (
            <section>
              <h2 className="text-xl font-semibold mb-3">Playlists</h2>
              <div className="flex flex-wrap gap-4">
                {playlists.map((playlist: any) => (
                  <MediaCard
                    key={playlist.id}
                    id={playlist.id}
                    type="playlist"
                    name={playlist.attributes?.name}
                    subtitle={playlist.attributes?.curatorName}
                    artworkUrl={playlist.attributes?.artwork?.url}
                    onClick={() => navigate(`/playlist/${playlist.id}`)}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  )
}
