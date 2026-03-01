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

        // Also fetch playlists featuring this artist
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
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!artist) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        Artist not found
      </div>
    )
  }

  const attrs = artist.attributes
  const artworkUrl = formatArtworkUrl(attrs?.artwork?.url, 600)
  const heroUrl = attrs?.editorialArtwork?.superHeroWide?.url
    ? formatArtworkUrl(attrs.editorialArtwork.superHeroWide.url, 1200)
    : artworkUrl

  return (
    <div className="animate-fade-in">
      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      {/* Artist header */}
      <div className="relative mb-8 -mx-6 -mt-6 px-6 pt-6">
        {/* Background gradient */}
        <div
          className="absolute inset-0 bg-gradient-to-b from-primary/20 to-transparent rounded-b-3xl"
          style={{ height: '300px' }}
        />

        <div className="relative flex items-end gap-6 pb-6" style={{ minHeight: '240px' }}>
          <Artwork
            src={artworkUrl}
            alt={attrs?.name}
            size={180}
            rounded="full"
            shadow
          />
          <div className="min-w-0 pb-2">
            <p className="text-sm text-muted-foreground uppercase tracking-wider font-medium mb-1">
              Artist
            </p>
            <h1 className="text-4xl font-bold mb-3">{attrs?.name}</h1>
            {attrs?.genreNames?.length > 0 && (
              <p className="text-sm text-muted-foreground mb-4">
                {attrs.genreNames.join(', ')}
              </p>
            )}
            <div className="flex gap-3">
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
        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-4">Top Songs</h2>
          <div className="space-y-0.5">
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
        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-4">Albums</h2>
          <div className="flex flex-wrap gap-4">
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
        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-4">Featured Playlists</h2>
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
  )
}
