import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MediaCard } from '@/components/ui/media-card'
import { SongRow } from '@/components/ui/song-row'
import { useAuthStore } from '@/stores/auth-store'
import { usePlayerStore } from '@/stores/player-store'
import { musicAPI, getChartData } from '@/lib/musickit'
import { getGreeting } from '@/lib/utils'
import { ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function HomePage() {
  const navigate = useNavigate()
  const { isAuthorized } = useAuthStore()
  const { playSongs } = usePlayerStore()
  const [recommendations, setRecommendations] = useState<MusicKit.Resource[]>(
    [],
  )
  const [recentlyPlayed, setRecentlyPlayed] = useState<MusicKit.Resource[]>([])
  const [topCharts, setTopCharts] = useState<MusicKit.APIResponseData | null>(
    null,
  )
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchHomeData() {
      setLoading(true)
      try {
        const promises: Promise<MusicKit.APIResponseData | null>[] = []

        if (isAuthorized) {
          promises.push(
            musicAPI('/v1/me/recommendations', { limit: 10 }).catch(() => null),
            musicAPI('/v1/me/recent/played', { limit: 10 }).catch(() => null),
          )
        } else {
          promises.push(Promise.resolve(null), Promise.resolve(null))
        }

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

  const topSongs = getChartData(topCharts?.results?.songs)
  const topAlbums = getChartData(topCharts?.results?.albums)
  const topPlaylists = getChartData(topCharts?.results?.playlists)

  if (loading) {
    return (
      <div className="animate-fade-in">
        <div className="h-9 w-56 bg-muted/50 rounded-lg animate-pulse mb-8" />
        <div className="flex gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-2.5">
              <div className="w-[180px] h-[180px] bg-muted/50 rounded-xl animate-pulse" />
              <div className="h-3.5 w-32 bg-muted/50 rounded animate-pulse" />
              <div className="h-3 w-24 bg-muted/40 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="animate-fade-in">
      {/* Greeting */}
      <h1 className="text-[28px] font-bold tracking-tight mb-8">
        {getGreeting()}
      </h1>

      <div className="space-y-10">
        {/* Recently Played */}
        {recentlyPlayed.length > 0 && (
          <section className="animate-fade-in-up stagger-1">
            <h2 className="text-[20px] font-semibold tracking-tight mb-4">
              Recently Played
            </h2>
            <div className="flex gap-5 overflow-x-auto pb-2 scrollbar-none">
              {recentlyPlayed.map((item: MusicKit.Resource) => (
                <MediaCard
                  key={item.id}
                  id={item.id}
                  type={item.type === 'albums' ? 'album' : 'playlist'}
                  name={item.attributes?.name}
                  subtitle={
                    item.attributes?.artistName || item.attributes?.curatorName
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
        )}

        {/* Recommendations */}
        {recommendations.map((rec: MusicKit.Resource, idx: number) => {
          const items = rec.relationships?.contents?.data || []
          if (items.length === 0) return null

          return (
            <section
              key={rec.id || idx}
              className="animate-fade-in-up stagger-2"
            >
              <div className="mb-4">
                <h2 className="text-[20px] font-semibold tracking-tight">
                  {rec.attributes?.title?.stringForDisplay || 'For You'}
                </h2>
                {rec.attributes?.reason?.stringForDisplay && (
                  <p className="text-[13px] text-muted-foreground mt-0.5">
                    {rec.attributes.reason.stringForDisplay}
                  </p>
                )}
              </div>
              <div className="flex gap-5 overflow-x-auto pb-2 scrollbar-none">
                {items.slice(0, 8).map((item: MusicKit.Resource) => (
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

        {/* Top Songs */}
        {topSongs.length > 0 && (
          <section className="animate-fade-in-up stagger-3">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[20px] font-semibold tracking-tight">
                Top Songs
              </h2>
              <Button
                variant="ghost"
                size="sm"
                className="text-primary text-[13px] gap-0.5"
                onClick={() => navigate('/browse')}
              >
                See All <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
            <div className="space-y-px">
              {topSongs
                .slice(0, 10)
                .map((song: MusicKit.Resource, idx: number) => (
                  <SongRow
                    key={song.id}
                    id={song.id}
                    name={song.attributes?.name}
                    artistName={song.attributes?.artistName}
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

        {/* Top Albums */}
        {topAlbums.length > 0 && (
          <section className="animate-fade-in-up stagger-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[20px] font-semibold tracking-tight">
                Top Albums
              </h2>
              <Button
                variant="ghost"
                size="sm"
                className="text-primary text-[13px] gap-0.5"
                onClick={() => navigate('/browse')}
              >
                See All <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
            <div className="flex gap-5 overflow-x-auto pb-2 scrollbar-none">
              {topAlbums.slice(0, 8).map((album: MusicKit.Resource) => (
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
          <section className="animate-fade-in-up stagger-5">
            <h2 className="text-[20px] font-semibold tracking-tight mb-4">
              Featured Playlists
            </h2>
            <div className="flex gap-5 overflow-x-auto pb-2 scrollbar-none">
              {topPlaylists.slice(0, 8).map((playlist: MusicKit.Resource) => (
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

        {/* Not authorized */}
        {!isAuthorized && !loading && (
          <section className="animate-fade-in-up stagger-2">
            <div className="p-8 rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/10">
              <h3 className="text-[17px] font-semibold mb-1.5">
                Sign in to Apple Music
              </h3>
              <p className="text-[13px] text-muted-foreground mb-5 max-w-sm">
                Get personalized recommendations, access your library, and more.
              </p>
              <Button onClick={() => navigate('/settings')}>
                Set Up Apple Music
              </Button>
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
