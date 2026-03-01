import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Artwork } from '@/components/ui/artwork'
import { SongRow } from '@/components/ui/song-row'
import { Button } from '@/components/ui/button'
import { musicAPI } from '@/lib/musickit'
import { usePlayerStore } from '@/stores/player-store'
import { formatArtworkUrl, formatDuration } from '@/lib/utils'
import { Play, Shuffle, Loader2, ArrowLeft } from 'lucide-react'

export function AlbumDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { playAlbum, playSongs, nowPlaying, isPlaying } = usePlayerStore()
  const [album, setAlbum] = useState<any>(null)
  const [tracks, setTracks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return

    async function fetchAlbum() {
      setLoading(true)
      try {
        const isLibrary = id!.startsWith('l.')
        const path = isLibrary
          ? `/v1/me/library/albums/${id}`
          : `/v1/catalog/us/albums/${id}`

        const data = await musicAPI(path, { include: 'tracks' })
        const albumData = data.data?.[0]
        setAlbum(albumData)
        setTracks(
          albumData?.relationships?.tracks?.data || [],
        )
      } catch (error) {
        console.error('Failed to fetch album:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchAlbum()
  }, [id])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground/40" />
      </div>
    )
  }

  if (!album) {
    return (
      <div className="text-center py-24 text-muted-foreground/50 text-[15px]">
        Album not found
      </div>
    )
  }

  const attrs = album.attributes
  const artworkUrl = formatArtworkUrl(attrs?.artwork?.url, 600)
  const totalDuration = tracks.reduce(
    (acc: number, t: any) => acc + (t.attributes?.durationInMillis || 0),
    0,
  )

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

      {/* Header */}
      <div className="flex gap-8 mb-8">
        <Artwork
          src={artworkUrl}
          alt={attrs?.name}
          size={232}
          rounded="lg"
          shadow
        />
        <div className="flex flex-col justify-end min-w-0">
          <p className="text-[11px] text-muted-foreground/40 uppercase tracking-widest font-semibold mb-1.5">
            Album
          </p>
          <h1 className="text-[28px] font-bold tracking-tight mb-1 line-clamp-2 leading-tight">
            {attrs?.name}
          </h1>
          <p className="text-[16px] text-muted-foreground mb-1.5">
            {attrs?.artistName}
          </p>
          <div className="flex items-center gap-2 text-[12px] text-muted-foreground/50 mb-5">
            {attrs?.genreNames?.[0] && <span>{attrs.genreNames[0]}</span>}
            {attrs?.releaseDate && (
              <>
                <span className="w-0.5 h-0.5 rounded-full bg-muted-foreground/40" />
                <span>{new Date(attrs.releaseDate).getFullYear()}</span>
              </>
            )}
            <span className="w-0.5 h-0.5 rounded-full bg-muted-foreground/40" />
            <span>
              {tracks.length} songs, {formatDuration(totalDuration)}
            </span>
          </div>

          {attrs?.editorialNotes?.short && (
            <p className="text-[13px] text-muted-foreground/60 line-clamp-2 mb-5 max-w-md leading-relaxed">
              {attrs.editorialNotes.short}
            </p>
          )}

          <div className="flex gap-2.5">
            <Button
              onClick={() => id && playAlbum(id)}
              className="gap-2"
            >
              <Play className="w-4 h-4" fill="currentColor" />
              Play
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                if (tracks.length > 0) {
                  const ids = tracks.map((t: any) => t.id)
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

      {/* Tracks */}
      <div className="space-y-px">
        {tracks.map((track: any, idx: number) => (
          <SongRow
            key={track.id}
            id={track.id}
            name={track.attributes?.name}
            artistName={track.attributes?.artistName}
            albumName={attrs?.name}
            artworkUrl={track.attributes?.artwork?.url}
            duration={track.attributes?.durationInMillis || 0}
            trackNumber={track.attributes?.trackNumber}
            showArtwork={false}
            showAlbum={false}
            showTrackNumber
            isActive={nowPlaying?.id === track.id}
            isPlaying={nowPlaying?.id === track.id && isPlaying}
            onClick={() => {
              const ids = tracks.map((t: any) => t.id)
              playSongs(ids, idx)
            }}
          />
        ))}
      </div>
    </div>
  )
}
