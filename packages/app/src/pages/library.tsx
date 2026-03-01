import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { SongRow } from '@/components/ui/song-row'
import { MediaCard } from '@/components/ui/media-card'
import { Artwork } from '@/components/ui/artwork'
import { Button } from '@/components/ui/button'
import { musicAPI } from '@/lib/musickit'
import { usePlayerStore } from '@/stores/player-store'
import { useLibraryStore } from '@/stores/library-store'
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
  const { section = 'recently-added' } = useParams<{ section: LibrarySection }>()
  const { isAuthorized } = useAuthStore()
  const { playSongs, nowPlaying, isPlaying } = usePlayerStore()
  const { playlists, fetchPlaylists, createPlaylist } = useLibraryStore()
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isAuthorized) return

    async function fetchLibrary() {
      setLoading(true)
      try {
        let path = ''
        const params: Record<string, any> = {
          limit: 100,
        }

        switch (section) {
          case 'recently-added':
            path = '/v1/me/library/recently-added'
            params.limit = 30
            break
          case 'songs':
            path = '/v1/me/library/songs'
            params.sort = '-dateAdded'
            break
          case 'albums':
            path = '/v1/me/library/albums'
            params.sort = '-dateAdded'
            break
          case 'artists':
            path = '/v1/me/library/artists'
            break
          case 'playlists':
            await fetchPlaylists()
            setLoading(false)
            return
        }

        const data = await musicAPI(path, params)
        setItems(data.data || [])
      } catch (error) {
        console.error('Failed to fetch library:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchLibrary()
  }, [section, isAuthorized])

  if (!isAuthorized) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-muted-foreground/40">
        <Music className="w-12 h-12 mb-3" />
        <h2 className="text-[17px] font-semibold text-foreground mb-1">
          Sign in to Apple Music
        </h2>
        <p className="text-[13px] text-muted-foreground/60 mb-5">
          Access your library by signing in with your Apple Music account.
        </p>
        <Button onClick={() => navigate('/settings')}>Set Up</Button>
      </div>
    )
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
                  playSongs(items.map((s: any) => s.id))
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
                  const ids = items.map((s: any) => s.id)
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
              onClick={() => createPlaylist(`New Playlist ${playlists.length + 1}`)}
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
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground/40" />
        </div>
      ) : (
        <>
          {/* Songs */}
          {section === 'songs' && (
            <div className="space-y-px">
              {items.map((song: any, idx: number) => (
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
                    const ids = items.map((s: any) => s.id)
                    playSongs(ids, idx)
                  }}
                />
              ))}
            </div>
          )}

          {/* Albums / Recently Added */}
          {(section === 'albums' || section === 'recently-added') && (
            <div className="flex flex-wrap gap-5">
              {items.map((item: any) => (
                <MediaCard
                  key={item.id}
                  id={item.id}
                  type={item.type?.includes('album') ? 'album' : 'playlist'}
                  name={item.attributes?.name}
                  subtitle={
                    item.attributes?.artistName ||
                    item.attributes?.curatorName
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
            <div className="flex flex-wrap gap-6">
              {items.map((artist: any) => (
                <div
                  key={artist.id}
                  className="flex flex-col items-center gap-2 cursor-pointer"
                  onClick={() => navigate(`/artist/${artist.id}`)}
                >
                  <Artwork
                    src={formatArtworkUrl(
                      artist.attributes?.artwork?.url,
                      200,
                    )}
                    alt={artist.attributes?.name}
                    size={148}
                    rounded="full"
                  />
                  <p className="text-[13px] font-medium text-center w-[148px] line-clamp-1">
                    {artist.attributes?.name}
                  </p>
                </div>
              ))}
            </div>
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

          {items.length === 0 && section !== 'playlists' && (
            <div className="flex flex-col items-center justify-center py-24 text-muted-foreground/30">
              <Music className="w-10 h-10 mb-3" />
              <p className="text-[15px] text-muted-foreground/50">No items in your library</p>
            </div>
          )}

          {section === 'playlists' && playlists.length === 0 && (
            <div className="flex flex-col items-center justify-center py-24 text-muted-foreground/30">
              <Music className="w-10 h-10 mb-3" />
              <p className="text-[15px] text-muted-foreground/50">No playlists yet</p>
              <p className="text-[13px] mt-0.5">Create one to get started</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
