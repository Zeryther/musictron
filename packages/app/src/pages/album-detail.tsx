import React from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Artwork } from '@/components/ui/artwork'
import { SongRow } from '@/components/ui/song-row'
import { Button } from '@/components/ui/button'
import { useAlbumDetail } from '@/hooks/use-albums'
import { useLastfmAlbum } from '@/hooks/use-lastfm'
import { usePlayerStore } from '@/stores/player-store'
import { formatArtworkUrl, formatDuration, formatPlayCount } from '@/lib/utils'
import {
  Play,
  Shuffle,
  Loader2,
  ArrowLeft,
  Users,
  Headphones,
  ExternalLink,
} from 'lucide-react'

export function AlbumDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { playAlbum, playSongs, nowPlaying, isPlaying } = usePlayerStore()

  const { data, isLoading: loading } = useAlbumDetail(id)
  const album = data?.album ?? null
  const tracks = data?.tracks ?? []
  const artists = data?.artists ?? []
  const primaryArtistId = artists[0]?.id

  // Last.fm extended metadata
  const albumAttrs = album?.attributes
  const { data: lastfmAlbum } = useLastfmAlbum(
    albumAttrs?.artistName,
    albumAttrs?.name,
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!album) {
    return (
      <div className="text-center py-24 text-muted-foreground text-[15px]">
        Album not found
      </div>
    )
  }

  const attrs = album.attributes
  const artworkUrl = formatArtworkUrl(attrs?.artwork?.url, 600)
  const totalDuration = tracks.reduce(
    (acc: number, t: MusicKit.Resource) =>
      acc + ((t.attributes?.durationInMillis as number) || 0),
    0,
  )

  return (
    <div className="animate-fade-in">
      {/* Back */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1 text-[13px] text-muted-foreground hover:text-foreground transition-colors duration-100 mb-5"
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
          <p className="text-[11px] text-muted-foreground uppercase tracking-widest font-semibold mb-1.5">
            Album
          </p>
          <h1 className="text-[28px] font-bold tracking-tight mb-1 line-clamp-2 leading-tight">
            {attrs?.name}
          </h1>
          <p className="text-[16px] text-muted-foreground mb-1.5 line-clamp-1">
            {primaryArtistId ? (
              <button
                onClick={() => navigate(`/artist/${primaryArtistId}`)}
                className="hover:underline hover:text-foreground transition-colors"
              >
                {attrs?.artistName}
              </button>
            ) : (
              attrs?.artistName
            )}
          </p>
          <div className="flex items-center gap-2 text-[12px] text-muted-foreground mb-2">
            {attrs?.genreNames?.[0] && <span>{attrs.genreNames[0]}</span>}
            {attrs?.releaseDate && (
              <>
                <span className="w-0.5 h-0.5 rounded-full bg-muted-foreground/70" />
                <span>{new Date(attrs.releaseDate).getFullYear()}</span>
              </>
            )}
            <span className="w-0.5 h-0.5 rounded-full bg-muted-foreground/70" />
            <span>
              {tracks.length} songs, {formatDuration(totalDuration)}
            </span>
          </div>

          {/* Last.fm tags */}
          {(lastfmAlbum?.tags?.length ?? 0) > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {lastfmAlbum?.tags.slice(0, 5).map((tag) => (
                <span
                  key={tag}
                  className="text-[11px] px-2 py-0.5 rounded-full bg-white/[0.06] text-muted-foreground/90"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Last.fm stats */}
          {lastfmAlbum && (
            <div className="flex items-center gap-3 text-[12px] text-muted-foreground mb-5">
              {lastfmAlbum.listeners != null && (
                <span className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  {formatPlayCount(lastfmAlbum.listeners)} listeners
                </span>
              )}
              {lastfmAlbum.playcount != null && (
                <span className="flex items-center gap-1">
                  <Headphones className="w-3 h-3" />
                  {formatPlayCount(lastfmAlbum.playcount)} plays
                </span>
              )}
              <a
                href={lastfmAlbum.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 hover:text-muted-foreground transition-colors"
              >
                Last.fm <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>
          )}

          {/* Gap if no Last.fm data */}
          {!lastfmAlbum && <div className="mb-3" />}

          {attrs?.editorialNotes?.short && (
            <p className="text-[13px] text-muted-foreground line-clamp-2 mb-5 max-w-md leading-relaxed">
              {attrs.editorialNotes.short}
            </p>
          )}

          <div className="flex gap-2.5">
            <Button onClick={() => id && playAlbum(id)} className="gap-2">
              <Play className="w-4 h-4" fill="currentColor" />
              Play
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                if (tracks.length > 0) {
                  const ids = tracks.map((t: MusicKit.Resource) => t.id)
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
        {tracks.map((track: MusicKit.Resource, idx: number) => (
          <SongRow
            key={track.id}
            id={track.id}
            name={track.attributes?.name}
            artistName={track.attributes?.artistName}
            artistId={primaryArtistId}
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
              const ids = tracks.map((t: MusicKit.Resource) => t.id)
              playSongs(ids, idx)
            }}
          />
        ))}
      </div>

      {/* Last.fm wiki (shown if no Apple editorial notes) */}
      {!attrs?.editorialNotes?.short && lastfmAlbum?.wiki && (
        <div className="mt-8 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5">
          <p className="text-[13px] text-muted-foreground leading-relaxed line-clamp-4">
            {lastfmAlbum.wiki.summary}
          </p>
          <a
            href={lastfmAlbum.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-[11px] text-muted-foreground/70 hover:text-muted-foreground mt-3 transition-colors"
          >
            Source: Last.fm
            <ExternalLink className="w-2.5 h-2.5" />
          </a>
        </div>
      )}
    </div>
  )
}
