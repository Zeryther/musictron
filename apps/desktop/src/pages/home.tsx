import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MediaCard } from '@/components/ui/media-card'
import { SongRow } from '@/components/ui/song-row'
import { Artwork } from '@/components/ui/artwork'
import { useAuthStore } from '@/stores/auth-store'
import { usePlayerStore } from '@/stores/player-store'
import { musicAPI } from '@/lib/musickit'
import { getGreeting, formatArtworkUrl } from '@/lib/utils'
import { Play, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function HomePage() {
  const navigate = useNavigate()
  const { isAuthorized } = useAuthStore()
  const { playAlbum, playPlaylist, playSongs } = usePlayerStore()
  const [recommendations, setRecommendations] = useState<any[]>([])
  const [recentlyPlayed, setRecentlyPlayed] = useState<any[]>([])
  const [topCharts, setTopCharts] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchHomeData() {
      setLoading(true)
      try {
        const promises: Promise<any>[] = []

        // Fetch personalized data if authorized
        if (isAuthorized) {
          promises.push(
            musicAPI('/v1/me/recommendations', { limit: 10 }).catch(() => null),
            musicAPI('/v1/me/recent/played', { limit: 10 }).catch(() => null),
          )
        } else {
          promises.push(Promise.resolve(null), Promise.resolve(null))
        }

        // Always fetch charts
        promises.push(
          musicAPI('/v1/catalog/us/charts', {
            types: 'songs,albums,playlists',
            limit: 15,
          }).catch(() => null),
        )

        const [recs, recent, charts] = await Promise.all(promises)

        if (recs?.data) setRecommendations(recs.data)
        if (recent?.data) setRecentlyPlayed(recent.data)
        if (charts) setTopCharts(charts)
      } catch (error) {
        console.error('Failed to load home:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchHomeData()
  }, [isAuthorized])

  const topSongs = topCharts?.results?.songs?.[0]?.data || []
  const topAlbums = topCharts?.results?.albums?.[0]?.data || []
  const topPlaylists = topCharts?.results?.playlists?.[0]?.data || []

  if (loading) {
    return (
      <div className="space-y-8 animate-fade-in">
        <div>
          <div className="h-8 w-48 bg-muted rounded animate-pulse mb-6" />
          <div className="flex gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="w-[180px] h-[180px] bg-muted rounded-lg animate-pulse" />
                <div className="h-4 w-32 bg-muted rounded animate-pulse" />
                <div className="h-3 w-24 bg-muted rounded animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-10 animate-fade-in">
      {/* Greeting */}
      <div className="pt-2">
        <h1 className="text-3xl font-bold">{getGreeting()}</h1>
      </div>

      {/* Recently Played */}
      {recentlyPlayed.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Recently Played</h2>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-2">
            {recentlyPlayed.map((item: any) => (
              <MediaCard
                key={item.id}
                id={item.id}
                type={item.type === 'albums' ? 'album' : 'playlist'}
                name={item.attributes?.name}
                subtitle={item.attributes?.artistName || item.attributes?.curatorName}
                artworkUrl={item.attributes?.artwork?.url}
                onClick={() =>
                  navigate(
                    item.type === 'albums'
                      ? `/album/${item.id}`
                      : `/playlist/${item.id}`,
                  )
                }
              />
            ))}
          </div>
        </section>
      )}

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <>
          {recommendations.map((rec: any, idx: number) => {
            const items = rec.relationships?.contents?.data || []
            if (items.length === 0) return null

            return (
              <section key={rec.id || idx}>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-xl font-semibold">
                      {rec.attributes?.title?.stringForDisplay || 'For You'}
                    </h2>
                    {rec.attributes?.reason?.stringForDisplay && (
                      <p className="text-sm text-muted-foreground">
                        {rec.attributes.reason.stringForDisplay}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex gap-4 overflow-x-auto pb-2">
                  {items.slice(0, 8).map((item: any) => (
                    <MediaCard
                      key={item.id}
                      id={item.id}
                      type={item.type === 'albums' ? 'album' : 'playlist'}
                      name={item.attributes?.name}
                      subtitle={
                        item.attributes?.artistName ||
                        item.attributes?.curatorName
                      }
                      artworkUrl={item.attributes?.artwork?.url}
                      onClick={() =>
                        navigate(
                          item.type === 'albums'
                            ? `/album/${item.id}`
                            : `/playlist/${item.id}`,
                        )
                      }
                    />
                  ))}
                </div>
              </section>
            )
          })}
        </>
      )}

      {/* Top Songs */}
      {topSongs.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Top Songs</h2>
            <Button
              variant="ghost"
              size="sm"
              className="text-primary"
              onClick={() => navigate('/browse')}
            >
              See All <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
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

      {/* Top Albums */}
      {topAlbums.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Top Albums</h2>
            <Button
              variant="ghost"
              size="sm"
              className="text-primary"
              onClick={() => navigate('/browse')}
            >
              See All <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-2">
            {topAlbums.slice(0, 8).map((album: any) => (
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

      {/* Featured Playlists */}
      {topPlaylists.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Featured Playlists</h2>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-2">
            {topPlaylists.slice(0, 8).map((playlist: any) => (
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

      {/* Not authorized prompt */}
      {!isAuthorized && !loading && (
        <div className="mt-4 p-8 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 text-center">
          <h3 className="text-lg font-semibold mb-2">
            Sign in to Apple Music
          </h3>
          <p className="text-muted-foreground mb-4">
            Get personalized recommendations and access your library.
          </p>
          <Button onClick={() => navigate('/settings')}>
            Set Up Apple Music
          </Button>
        </div>
      )}
    </div>
  )
}
