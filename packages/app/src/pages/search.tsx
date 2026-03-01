import React, { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Input } from '@/components/ui/input'
import { MediaCard } from '@/components/ui/media-card'
import { SongRow } from '@/components/ui/song-row'
import { Artwork } from '@/components/ui/artwork'
import { useSearch, useSearchHints } from '@/hooks/use-search'
import { usePlayerStore } from '@/stores/player-store'
import { formatArtworkUrl } from '@/lib/utils'
import { Search as SearchIcon, Loader2, X } from 'lucide-react'

export function SearchPage() {
  const navigate = useNavigate()
  const { playSongs } = usePlayerStore()
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const { data: searchData, isLoading: loading } = useSearch(debouncedQuery)
  const { data: hintsData } = useSearchHints(debouncedQuery)

  const results = (searchData?.results as
    | Record<string, MusicKit.SearchResultList>
    | undefined) ?? null
  const hints = (hintsData?.results?.terms as string[] | undefined) ?? []

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setQuery(value)

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => setDebouncedQuery(value), 300)
  }

  const handleClear = () => {
    setQuery('')
    setDebouncedQuery('')
    inputRef.current?.focus()
  }

  const handleHintClick = (hint: string) => {
    setQuery(hint)
    setDebouncedQuery(hint)
  }

  const songs = results?.songs?.data || []
  const albums = results?.albums?.data || []
  const artists = results?.artists?.data || []
  const playlists = results?.playlists?.data || []
  const hasResults =
    songs.length > 0 ||
    albums.length > 0 ||
    artists.length > 0 ||
    playlists.length > 0

  return (
    <div className="animate-fade-in">
      <h1 className="text-[28px] font-bold tracking-tight mb-5">Search</h1>

      {/* Search input */}
      <div className="relative max-w-lg mb-2">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
        <Input
          ref={inputRef}
          value={query}
          onChange={handleInputChange}
          placeholder="Artists, songs, albums, playlists..."
          className="pl-9 pr-9 h-10 bg-white/[0.06] border-white/[0.06] rounded-xl text-[13px] placeholder:text-muted-foreground/40 focus-visible:ring-primary/30"
        />
        {query && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/40 hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Search hints */}
      {hints.length > 0 && (
        <div className="flex gap-1.5 mb-6">
          {hints.map((hint) => (
            <button
              key={hint}
              onClick={() => handleHintClick(hint)}
              className="px-3 py-1 rounded-full text-[12px] bg-white/[0.06] hover:bg-white/[0.1] text-muted-foreground transition-colors duration-100"
            >
              {hint}
            </button>
          ))}
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground/40" />
        </div>
      )}

      {!loading && !hasResults && debouncedQuery && (
        <div className="flex flex-col items-center justify-center py-24 text-muted-foreground/40">
          <SearchIcon className="w-10 h-10 mb-3" />
          <p className="text-[15px] font-medium text-muted-foreground">
            No results found
          </p>
          <p className="text-[13px] mt-0.5">Try a different search term</p>
        </div>
      )}

      {!loading && !debouncedQuery && (
        <div className="flex flex-col items-center justify-center py-24 text-muted-foreground/30">
          <SearchIcon className="w-10 h-10 mb-3" />
          <p className="text-[15px] text-muted-foreground/50">
            Search Apple Music
          </p>
        </div>
      )}

      {!loading && hasResults && (
        <div className="space-y-8 mt-6">
          {/* Top Result + Songs */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {(artists.length > 0 || albums.length > 0) && (
              <section className="animate-fade-in-up">
                <h2 className="text-[17px] font-semibold tracking-tight mb-3">
                  Top Result
                </h2>
                {artists.length > 0 ? (
                  <div
                    className="p-5 rounded-2xl bg-white/[0.04] hover:bg-white/[0.06] transition-colors duration-150 cursor-pointer"
                    onClick={() => navigate(`/artist/${artists[0].id}`)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e: React.KeyboardEvent) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        navigate(`/artist/${artists[0].id}`)
                      }
                    }}
                  >
                    <Artwork
                      src={formatArtworkUrl(
                        artists[0].attributes?.artwork?.url,
                        200,
                      )}
                      alt={artists[0].attributes?.name}
                      size={88}
                      rounded="full"
                      className="mb-3"
                    />
                    <h3 className="text-[22px] font-bold leading-tight">
                      {artists[0].attributes?.name}
                    </h3>
                    <p className="text-[13px] text-muted-foreground/60 mt-0.5">
                      Artist
                    </p>
                  </div>
                ) : (
                  <div
                    className="p-5 rounded-2xl bg-white/[0.04] hover:bg-white/[0.06] transition-colors duration-150 cursor-pointer"
                    onClick={() => navigate(`/album/${albums[0].id}`)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e: React.KeyboardEvent) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        navigate(`/album/${albums[0].id}`)
                      }
                    }}
                  >
                    <Artwork
                      src={formatArtworkUrl(
                        albums[0].attributes?.artwork?.url,
                        200,
                      )}
                      alt={albums[0].attributes?.name}
                      size={88}
                      rounded="md"
                      className="mb-3"
                    />
                    <h3 className="text-[22px] font-bold leading-tight">
                      {albums[0].attributes?.name}
                    </h3>
                    <p className="text-[13px] text-muted-foreground/60 mt-0.5">
                      {albums[0].attributes?.artistName}
                    </p>
                  </div>
                )}
              </section>
            )}

            {songs.length > 0 && (
              <section className="animate-fade-in-up stagger-1">
                <h2 className="text-[17px] font-semibold tracking-tight mb-3">
                  Songs
                </h2>
                <div className="space-y-px">
                  {songs
                    .slice(0, 5)
                    .map((song: MusicKit.Resource, idx: number) => (
                      <SongRow
                        key={song.id}
                        id={song.id}
                        name={song.attributes?.name}
                        artistName={song.attributes?.artistName}
                        artworkUrl={song.attributes?.artwork?.url}
                        duration={song.attributes?.durationInMillis || 0}
                        showAlbum={false}
                        onClick={() => {
                          const ids = songs.map((s: MusicKit.Resource) => s.id)
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
            <section className="animate-fade-in-up stagger-2">
              <h2 className="text-[17px] font-semibold tracking-tight mb-3">
                Artists
              </h2>
              <div className="flex gap-5 overflow-x-auto pb-2 scrollbar-none">
                {artists.slice(0, 8).map((artist: MusicKit.Resource) => (
                  <div
                    key={artist.id}
                    className="flex flex-col items-center gap-2 cursor-pointer shrink-0"
                    onClick={() => navigate(`/artist/${artist.id}`)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e: React.KeyboardEvent) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        navigate(`/artist/${artist.id}`)
                      }
                    }}
                  >
                    <Artwork
                      src={formatArtworkUrl(
                        artist.attributes?.artwork?.url,
                        200,
                      )}
                      alt={artist.attributes?.name}
                      size={128}
                      rounded="full"
                    />
                    <p className="text-[13px] font-medium text-center line-clamp-1 w-[128px]">
                      {artist.attributes?.name}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Albums */}
          {albums.length > 0 && (
            <section className="animate-fade-in-up stagger-3">
              <h2 className="text-[17px] font-semibold tracking-tight mb-3">
                Albums
              </h2>
              <div className="flex flex-wrap gap-5">
                {albums.map((album: MusicKit.Resource) => (
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
            <section className="animate-fade-in-up stagger-4">
              <h2 className="text-[17px] font-semibold tracking-tight mb-3">
                Playlists
              </h2>
              <div className="flex flex-wrap gap-5">
                {playlists.map((playlist: MusicKit.Resource) => (
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
