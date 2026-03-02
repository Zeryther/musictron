import React, { useEffect, useRef, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { SongRow } from '@/components/ui/song-row'
import { MediaCard } from '@/components/ui/media-card'
import { Artwork } from '@/components/ui/artwork'
import { Button } from '@/components/ui/button'
import {
  useLibrarySongs,
  useLibraryAlbums,
  useLibraryArtists,
  useLibraryRecentlyAdded,
} from '@/hooks/use-library'
import type { LibraryArtist } from '@/hooks/use-library'
import { useLibraryPlaylists, useCreatePlaylist } from '@/hooks/use-playlists'
import { usePlayerStore } from '@/stores/player-store'
import { useAuthStore } from '@/stores/auth-store'
import { formatArtworkUrl } from '@/lib/utils'
import { Loader2, Music, Plus, Play, Shuffle } from 'lucide-react'

type LibrarySection =
  | 'recently-added'
  | 'songs'
  | 'albums'
  | 'artists'
  | 'playlists'

export function LibraryPage() {
  const navigate = useNavigate()
  const { section = 'recently-added' } = useParams<{
    section: LibrarySection
  }>()
  const { isAuthorized } = useAuthStore()
  const { playSongs, nowPlaying, isPlaying } = usePlayerStore()

  const createPlaylistMutation = useCreatePlaylist()

  // Each hook is enabled only for the active section (+ auth check)
  const { data: songs = [], isLoading: loadingSongs } = useLibrarySongs(
    0,
    isAuthorized && section === 'songs',
  )
  const { data: albums = [], isLoading: loadingAlbums } = useLibraryAlbums(
    0,
    isAuthorized && section === 'albums',
  )
  const {
    data: artistsData,
    isLoading: loadingArtists,
    hasNextPage: hasMoreArtists,
    fetchNextPage: fetchMoreArtists,
    isFetchingNextPage: fetchingMoreArtists,
  } = useLibraryArtists(isAuthorized && section === 'artists')
  const { data: recentlyAdded = [], isLoading: loadingRecent } =
    useLibraryRecentlyAdded(isAuthorized && section === 'recently-added')
  const { data: playlists = [], isLoading: loadingPlaylists } =
    useLibraryPlaylists(isAuthorized && section === 'playlists')

  const artists = useMemo(
    () => artistsData?.pages.flatMap((page) => page.artists) ?? [],
    [artistsData],
  )

  // Infinite scroll sentinel for artists
  const sentinelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (section !== 'artists') return
    const sentinel = sentinelRef.current
    if (!sentinel) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          hasMoreArtists &&
          !fetchingMoreArtists
        ) {
          fetchMoreArtists()
        }
      },
      { rootMargin: '200px' },
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [section, hasMoreArtists, fetchingMoreArtists, fetchMoreArtists])

  if (!isAuthorized) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
        <Music className="w-12 h-12 mb-3" />
        <h2 className="text-[17px] font-semibold text-foreground mb-1">
          Sign in to Apple Music
        </h2>
        <p className="text-[13px] text-muted-foreground mb-5">
          Access your library by signing in with your Apple Music account.
        </p>
        <Button onClick={() => navigate('/settings')}>Set Up</Button>
      </div>
    )
  }

  // Determine which items to show and whether we're loading
  let items: MusicKit.Resource[] = []
  let loading = false

  switch (section) {
    case 'recently-added':
      items = recentlyAdded
      loading = loadingRecent
      break
    case 'songs':
      items = songs
      loading = loadingSongs
      break
    case 'albums':
      items = albums
      loading = loadingAlbums
      break
    case 'artists':
      loading = loadingArtists
      break
    case 'playlists':
      loading = loadingPlaylists
      break
  }

  const sectionTitles: Record<LibrarySection, string> = {
    'recently-added': 'Recently Added',
    songs: 'Songs',
    albums: 'Albums',
    artists: 'Artists',
    playlists: 'Playlists',
  }

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-[28px] font-bold tracking-tight">
          {sectionTitles[section as LibrarySection]}
        </h1>
        <div className="flex gap-2">
          {section === 'songs' && items.length > 0 && (
            <>
              <Button
                size="sm"
                onClick={() =>
                  playSongs(items.map((s: MusicKit.Resource) => s.id))
                }
                className="gap-1.5"
              >
                <Play className="w-3 h-3" fill="currentColor" />
                Play All
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const ids = items.map((s: MusicKit.Resource) => s.id)
                  const shuffled = [...ids].sort(() => Math.random() - 0.5)
                  playSongs(shuffled)
                }}
                className="gap-1.5"
              >
                <Shuffle className="w-3 h-3" />
                Shuffle
              </Button>
            </>
          )}
          {section === 'playlists' && (
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                createPlaylistMutation.mutate({
                  name: `New Playlist ${playlists.length + 1}`,
                })
              }
              className="gap-1.5"
            >
              <Plus className="w-3 h-3" />
              New Playlist
            </Button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* Songs */}
          {section === 'songs' && (
            <div className="space-y-px">
              {items.map((song: MusicKit.Resource, idx: number) => (
                <SongRow
                  key={song.id}
                  id={song.id}
                  name={song.attributes?.name}
                  artistName={song.attributes?.artistName}
                  albumName={song.attributes?.albumName}
                  artworkUrl={song.attributes?.artwork?.url}
                  duration={song.attributes?.durationInMillis || 0}
                  isActive={nowPlaying?.id === song.id}
                  isPlaying={nowPlaying?.id === song.id && isPlaying}
                  onClick={() => {
                    const ids = items.map((s: MusicKit.Resource) => s.id)
                    playSongs(ids, idx)
                  }}
                />
              ))}
            </div>
          )}

          {/* Albums / Recently Added */}
          {(section === 'albums' || section === 'recently-added') && (
            <div className="flex flex-wrap gap-5">
              {items.map((item: MusicKit.Resource) => (
                <MediaCard
                  key={item.id}
                  id={item.id}
                  type={item.type?.includes('album') ? 'album' : 'playlist'}
                  name={item.attributes?.name}
                  subtitle={
                    item.attributes?.artistName || item.attributes?.curatorName
                  }
                  artworkUrl={item.attributes?.artwork?.url}
                  onClick={() => {
                    const route = item.type?.includes('album')
                      ? `/album/${item.id}`
                      : `/playlist/${item.id}`
                    navigate(route)
                  }}
                />
              ))}
            </div>
          )}

          {/* Artists */}
          {section === 'artists' && (
            <>
              <div className="flex flex-wrap gap-6">
                {artists.map((artist: LibraryArtist) => (
                  <div
                    key={artist.id}
                    className="flex flex-col items-center gap-2 cursor-pointer"
                    onClick={() => {
                      const targetId = artist.catalogId ?? artist.id
                      navigate(`/artist/${targetId}`)
                    }}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e: React.KeyboardEvent) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        const targetId = artist.catalogId ?? artist.id
                        navigate(`/artist/${targetId}`)
                      }
                    }}
                  >
                    <Artwork
                      src={formatArtworkUrl(artist.artworkUrl, 200)}
                      alt={artist.name}
                      size={148}
                      rounded="full"
                    />
                    <p className="text-[13px] font-medium text-center w-[148px] line-clamp-1">
                      {artist.name}
                    </p>
                  </div>
                ))}
              </div>

              {/* Infinite scroll sentinel */}
              <div ref={sentinelRef} className="h-px" />

              {fetchingMoreArtists && (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              )}
            </>
          )}

          {/* Playlists */}
          {section === 'playlists' && (
            <div className="flex flex-wrap gap-5">
              {playlists.map((playlist) => (
                <MediaCard
                  key={playlist.id}
                  id={playlist.id}
                  type="playlist"
                  name={playlist.name}
                  subtitle={`${playlist.trackCount} songs`}
                  artworkUrl={playlist.artworkUrl}
                  onClick={() => navigate(`/playlist/${playlist.id}`)}
                />
              ))}
            </div>
          )}

          {section !== 'artists' &&
            section !== 'playlists' &&
            items.length === 0 && (
              <div className="flex flex-col items-center justify-center py-24 text-muted-foreground/70">
                <Music className="w-10 h-10 mb-3" />
                <p className="text-[15px] text-muted-foreground">
                  No items in your library
                </p>
              </div>
            )}

          {section === 'artists' && artists.length === 0 && (
            <div className="flex flex-col items-center justify-center py-24 text-muted-foreground/70">
              <Music className="w-10 h-10 mb-3" />
              <p className="text-[15px] text-muted-foreground">
                No artists in your library
              </p>
            </div>
          )}

          {section === 'playlists' && playlists.length === 0 && (
            <div className="flex flex-col items-center justify-center py-24 text-muted-foreground/70">
              <Music className="w-10 h-10 mb-3" />
              <p className="text-[15px] text-muted-foreground">
                No playlists yet
              </p>
              <p className="text-[13px] mt-0.5">Create one to get started</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
