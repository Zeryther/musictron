import React, { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Artwork } from '@/components/ui/artwork'
import { SongRow } from '@/components/ui/song-row'
import { MediaCard } from '@/components/ui/media-card'
import { Button } from '@/components/ui/button'
import {
  useArtistDetail,
  useArtistTopSongs,
  useArtistPlaylists,
} from '@/hooks/use-artists'
import { useLastfmArtist, useLastfmSimilarArtists } from '@/hooks/use-lastfm'
import { usePlayerStore } from '@/stores/player-store'
import { formatArtworkUrl, formatPlayCount } from '@/lib/utils'
import {
  Play,
  Shuffle,
  Loader2,
  Users,
  Headphones,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'

export function ArtistDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { playSongs } = usePlayerStore()

  const { data: artistData, isLoading: loading } = useArtistDetail(id)
  const { data: topSongs = [] } = useArtistTopSongs(id)
  const { data: playlists = [] } = useArtistPlaylists(id)

  const artist = artistData?.artist ?? null
  const albums = artistData?.albums ?? []
  const catalogArtistId = artistData?.catalogId ?? id

  // Last.fm extended metadata
  const artistName = artist?.attributes?.name
  const { data: lastfmArtist } = useLastfmArtist(artistName)
  const { data: similarArtists = [] } = useLastfmSimilarArtists(artistName, 8)

  const [bioExpanded, setBioExpanded] = useState(false)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!artist) {
    return (
      <div className="text-center py-24 text-muted-foreground text-[15px]">
        Artist not found
      </div>
    )
  }

  const attrs = artist.attributes
  const artworkUrl = formatArtworkUrl(attrs?.artwork?.url, 600)

  return (
    <div className="animate-fade-in">
      {/* Artist header with gradient */}
      <div className="relative mb-10 -mx-8 -mt-6 px-8 pt-6">
        <div
          className="absolute inset-0 bg-gradient-to-b from-primary/[0.08] to-transparent"
          style={{ height: '280px' }}
        />

        <div
          className="relative flex items-end gap-7 pb-6"
          style={{ minHeight: '220px' }}
        >
          <Artwork
            src={artworkUrl}
            alt={attrs?.name}
            size={172}
            rounded="full"
            shadow
          />
          <div className="min-w-0 pb-1">
            <p className="text-[11px] text-muted-foreground uppercase tracking-widest font-semibold mb-1.5">
              Artist
            </p>
            <h1 className="text-[36px] font-bold tracking-tight leading-tight mb-2 line-clamp-2">
              {attrs?.name}
            </h1>
            {/* Genre tags — combine Apple Music genres with Last.fm tags */}
            {((attrs?.genreNames?.length ?? 0) > 0 ||
              (lastfmArtist?.tags?.length ?? 0) > 0) && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {attrs?.genreNames?.map((genre: string) => (
                  <span
                    key={genre}
                    className="text-[11px] px-2 py-0.5 rounded-full bg-white/[0.08] text-muted-foreground"
                  >
                    {genre}
                  </span>
                ))}
                {lastfmArtist?.tags
                  ?.filter(
                    (tag) =>
                      !attrs?.genreNames?.some(
                        (g: string) => g.toLowerCase() === tag.toLowerCase(),
                      ),
                  )
                  .slice(0, 4)
                  .map((tag) => (
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
            {lastfmArtist && (
              <div className="flex items-center gap-3 text-[12px] text-muted-foreground mb-5">
                {lastfmArtist.listeners != null && (
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {formatPlayCount(lastfmArtist.listeners)} listeners
                  </span>
                )}
                {lastfmArtist.playcount != null && (
                  <span className="flex items-center gap-1">
                    <Headphones className="w-3 h-3" />
                    {formatPlayCount(lastfmArtist.playcount)} plays
                  </span>
                )}
              </div>
            )}

            {/* Fallback if no Last.fm data — show genres the old way */}
            {
              !lastfmArtist &&
                (attrs?.genreNames?.length ?? 0) > 0 &&
                false /* already shown above */
            }
            <div className="flex gap-2.5">
              <Button
                onClick={() => {
                  if (topSongs.length > 0) {
                    playSongs(topSongs.map((s: MusicKit.Resource) => s.id))
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
                    const ids = topSongs.map((s: MusicKit.Resource) => s.id)
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
          <h2 className="text-[20px] font-semibold tracking-tight mb-4">
            Top Songs
          </h2>
          <div className="space-y-px">
            {topSongs
              .slice(0, 10)
              .map((song: MusicKit.Resource, idx: number) => (
                <SongRow
                  key={song.id}
                  id={song.id}
                  name={song.attributes?.name}
                  artistName={song.attributes?.artistName}
                  artistId={catalogArtistId}
                  albumName={song.attributes?.albumName}
                  artworkUrl={song.attributes?.artwork?.url}
                  duration={song.attributes?.durationInMillis || 0}
                  onClick={() => {
                    const ids = topSongs.map((s: MusicKit.Resource) => s.id)
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
          <h2 className="text-[20px] font-semibold tracking-tight mb-4">
            Albums
          </h2>
          <div className="flex flex-wrap gap-5">
            {albums.map((album: MusicKit.Resource) => (
              <MediaCard
                key={album.id}
                id={album.id}
                type="album"
                name={album.attributes?.name}
                subtitle={
                  album.attributes?.releaseDate
                    ? new Date(album.attributes.releaseDate)
                        .getFullYear()
                        .toString()
                    : undefined
                }
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
          <h2 className="text-[20px] font-semibold tracking-tight mb-4">
            Featured Playlists
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

      {/* Similar Artists (from Last.fm) */}
      {similarArtists.length > 0 && (
        <section className="mb-10 animate-fade-in-up stagger-4">
          <h2 className="text-[20px] font-semibold tracking-tight mb-4">
            Similar Artists
          </h2>
          <div className="flex flex-wrap gap-4">
            {similarArtists.map((similar) => (
              <a
                key={similar.name}
                href={similar.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.08] border border-white/[0.08] transition-colors group"
              >
                <span className="text-[13px] font-medium group-hover:text-foreground text-muted-foreground truncate max-w-[200px]">
                  {similar.name}
                </span>
                <ExternalLink className="w-3 h-3 text-muted-foreground/60 group-hover:text-muted-foreground" />
              </a>
            ))}
          </div>
        </section>
      )}

      {/* Biography (from Last.fm) */}
      {lastfmArtist?.bio && (
        <section className="mb-10 animate-fade-in-up stagger-5">
          <h2 className="text-[20px] font-semibold tracking-tight mb-4">
            About
          </h2>
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5">
            <p
              className={`text-[13px] text-muted-foreground leading-relaxed whitespace-pre-line ${
                !bioExpanded ? 'line-clamp-4' : ''
              }`}
            >
              {bioExpanded
                ? lastfmArtist.bio.content || lastfmArtist.bio.summary
                : lastfmArtist.bio.summary}
            </p>
            {(lastfmArtist.bio.content?.length ?? 0) >
              (lastfmArtist.bio.summary?.length ?? 0) && (
              <button
                onClick={() => setBioExpanded(!bioExpanded)}
                className="flex items-center gap-1 text-[12px] text-primary hover:text-primary/80 mt-2 transition-colors"
              >
                {bioExpanded ? (
                  <>
                    Show less <ChevronUp className="w-3 h-3" />
                  </>
                ) : (
                  <>
                    Read more <ChevronDown className="w-3 h-3" />
                  </>
                )}
              </button>
            )}
            <a
              href={lastfmArtist.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-[11px] text-muted-foreground/70 hover:text-muted-foreground mt-3 transition-colors"
            >
              Source: Last.fm
              <ExternalLink className="w-2.5 h-2.5" />
            </a>
          </div>
        </section>
      )}
    </div>
  )
}
