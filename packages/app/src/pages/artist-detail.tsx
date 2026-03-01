import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Artwork } from '@/components/ui/artwork'
import { SongRow } from '@/components/ui/song-row'
import { MediaCard } from '@/components/ui/media-card'
import { Button } from '@/components/ui/button'
import { musicAPI } from '@/lib/musickit'
import { usePlayerStore } from '@/stores/player-store'
import { formatArtworkUrl } from '@/lib/utils'
import { Play, Shuffle, Loader2, ArrowLeft } from 'lucide-react'

export function ArtistDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { playSongs } = usePlayerStore()
  const [artist, setArtist] = useState<any>(null)
  const [topSongs, setTopSongs] = useState<any[]>([])
  const [albums, setAlbums] = useState<any[]>([])
  const [playlists, setPlaylists] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return

    async function fetchArtist() {
      setLoading(true)
      try {
        const [artistData, songsData] = await Promise.all([
          musicAPI(`/v1/catalog/us/artists/${id}`, {
            include: 'albums',
          }),
          musicAPI(`/v1/catalog/us/artists/${id}/view/top-songs`, {
            limit: 20,
          }).catch(() => null),
        ])

        const a = artistData.data?.[0]
        setArtist(a)
        setAlbums(a?.relationships?.albums?.data || [])
        setTopSongs(songsData?.data || [])

        const playlistData = await musicAPI(
          `/v1/catalog/us/artists/${id}/view/featured-playlists`,
          { limit: 10 },
        ).catch(() => null)
        setPlaylists(playlistData?.data || [])
      } catch (error) {
        console.error('Failed to fetch artist:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchArtist()
  }, [id])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground/40" />
      </div>
    )
  }

  if (!artist) {
    return (
      <div className="text-center py-24 text-muted-foreground/50 text-[15px]">
        Artist not found
      </div>
    )
  }

  const attrs = artist.attributes
  const artworkUrl = formatArtworkUrl(attrs?.artwork?.url, 600)

  return (
    <div className="animate-fade-in">
      {/* Back */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1 text-[13px] text-muted-foreground/50 hover:text-foreground transition-colors duration-100 mb-5"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      {/* Artist header with gradient */}
      <div className="relative mb-10 -mx-8 -mt-6 px-8 pt-6">
        <div
          className="absolute inset-0 bg-gradient-to-b from-primary/[0.08] to-transparent"
          style={{ height: '280px' }}
        />

        <div className="relative flex items-end gap-7 pb-6" style={{ minHeight: '220px' }}>
          <Artwork
            src={artworkUrl}
            alt={attrs?.name}
            size={172}
            rounded="full"
            shadow
          />
          <div className="min-w-0 pb-1">
            <p className="text-[11px] text-muted-foreground/40 uppercase tracking-widest font-semibold mb-1.5">
              Artist
            </p>
            <h1 className="text-[36px] font-bold tracking-tight leading-tight mb-2">
              {attrs?.name}
            </h1>
            {attrs?.genreNames?.length > 0 && (
              <p className="text-[13px] text-muted-foreground/50 mb-5">
                {attrs.genreNames.join(', ')}
              </p>
            )}
            <div className="flex gap-2.5">
              <Button
                onClick={() => {
                  if (topSongs.length > 0) {
                    playSongs(topSongs.map((s: any) => s.id))
                  }
                }}
                className="gap-2"
              >
                <Play className="w-4 h-4" fill="currentColor" />
                Play
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  if (topSongs.length > 0) {
                    const ids = topSongs.map((s: any) => s.id)
                    const shuffled = [...ids].sort(() => Math.random() - 0.5)
                    playSongs(shuffled)
                  }
                }}
                className="gap-2"
              >
                <Shuffle className="w-4 h-4" />
                Shuffle
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Top Songs */}
      {topSongs.length > 0 && (
        <section className="mb-10 animate-fade-in-up stagger-1">
          <h2 className="text-[20px] font-semibold tracking-tight mb-4">Top Songs</h2>
          <div className="space-y-px">
            {topSongs.slice(0, 10).map((song: any, idx: number) => (
              <SongRow
                key={song.id}
                id={song.id}
                name={song.attributes?.name}
                artistName={song.attributes?.artistName}
                albumName={song.attributes?.albumName}
                artworkUrl={song.attributes?.artwork?.url}
                duration={song.attributes?.durationInMillis || 0}
                onClick={() => {
                  const ids = topSongs.map((s: any) => s.id)
                  playSongs(ids, idx)
                }}
              />
            ))}
          </div>
        </section>
      )}

      {/* Albums */}
      {albums.length > 0 && (
        <section className="mb-10 animate-fade-in-up stagger-2">
          <h2 className="text-[20px] font-semibold tracking-tight mb-4">Albums</h2>
          <div className="flex flex-wrap gap-5">
            {albums.map((album: any) => (
              <MediaCard
                key={album.id}
                id={album.id}
                type="album"
                name={album.attributes?.name}
                subtitle={new Date(album.attributes?.releaseDate).getFullYear().toString()}
                artworkUrl={album.attributes?.artwork?.url}
                onClick={() => navigate(`/album/${album.id}`)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Featured Playlists */}
      {playlists.length > 0 && (
        <section className="mb-10 animate-fade-in-up stagger-3">
          <h2 className="text-[20px] font-semibold tracking-tight mb-4">Featured Playlists</h2>
          <div className="flex flex-wrap gap-5">
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
  )
}
