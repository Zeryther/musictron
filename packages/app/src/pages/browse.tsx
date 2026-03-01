import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MediaCard } from '@/components/ui/media-card'
import { SongRow } from '@/components/ui/song-row'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { musicAPI } from '@/lib/musickit'
import { usePlayerStore } from '@/stores/player-store'
import { Loader2 } from 'lucide-react'

const genres = [
  { id: '34', name: 'Music', color: '#fc3c44' },
  { id: '20', name: 'Alternative', color: '#5856D6' },
  { id: '2', name: 'Blues', color: '#007AFF' },
  { id: '21', name: 'Chinese', color: '#FF9500' },
  { id: '1122', name: 'Classical', color: '#34C759' },
  { id: '3', name: 'Comedy', color: '#FF2D55' },
  { id: '6', name: 'Country', color: '#AF52DE' },
  { id: '17', name: 'Dance', color: '#FF9F0A' },
  { id: '7', name: 'Electronic', color: '#30D158' },
  { id: '14', name: 'Hip-Hop/Rap', color: '#FF375F' },
  { id: '11', name: 'Jazz', color: '#5856D6' },
  { id: '51', name: 'K-Pop', color: '#FF6482' },
  { id: '12', name: 'Latin', color: '#FF9500' },
  { id: '15', name: 'Pop', color: '#fc3c44' },
  { id: '9', name: 'R&B/Soul', color: '#AF52DE' },
  { id: '24', name: 'Reggae', color: '#34C759' },
  { id: '21', name: 'Rock', color: '#FF2D55' },
  { id: '29', name: 'Singer/Songwriter', color: '#007AFF' },
]

export function BrowsePage() {
  const navigate = useNavigate()
  const { playSongs } = usePlayerStore()
  const [charts, setCharts] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null)
  const [genreData, setGenreData] = useState<any>(null)
  const [loadingGenre, setLoadingGenre] = useState(false)

  useEffect(() => {
    async function fetchCharts() {
      setLoading(true)
      try {
        const data = await musicAPI('/v1/catalog/us/charts', {
          types: 'songs,albums,playlists',
          limit: 30,
        })
        setCharts(data)
      } catch (error) {
        console.error('Failed to fetch charts:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchCharts()
  }, [])

  useEffect(() => {
    if (!selectedGenre) return

    async function fetchGenre() {
      setLoadingGenre(true)
      try {
        const data = await musicAPI('/v1/catalog/us/charts', {
          types: 'songs,albums,playlists',
          genre: selectedGenre,
          limit: 20,
        })
        setGenreData(data)
      } catch (error) {
        console.error('Failed to fetch genre charts:', error)
      } finally {
        setLoadingGenre(false)
      }
    }
    fetchGenre()
  }, [selectedGenre])

  const topSongs = charts?.results?.songs?.[0]?.data || []
  const topAlbums = charts?.results?.albums?.[0]?.data || []
  const topPlaylists = charts?.results?.playlists?.[0]?.data || []

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="pt-2">
        <h1 className="text-3xl font-bold">Browse</h1>
      </div>

      <Tabs defaultValue="charts" className="space-y-6">
        <TabsList>
          <TabsTrigger value="charts">Charts</TabsTrigger>
          <TabsTrigger value="genres">Genres</TabsTrigger>
        </TabsList>

        <TabsContent value="charts">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-10">
              {/* Top Songs */}
              <section>
                <h2 className="text-xl font-semibold mb-4">Top Songs</h2>
                <div className="space-y-0.5">
                  {topSongs.map((song: any, idx: number) => (
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

              {/* Top Albums */}
              <section>
                <h2 className="text-xl font-semibold mb-4">Top Albums</h2>
                <div className="flex flex-wrap gap-4">
                  {topAlbums.map((album: any) => (
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

              {/* Top Playlists */}
              <section>
                <h2 className="text-xl font-semibold mb-4">Top Playlists</h2>
                <div className="flex flex-wrap gap-4">
                  {topPlaylists.map((playlist: any) => (
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
            </div>
          )}
        </TabsContent>

        <TabsContent value="genres">
          <div className="space-y-6">
            {/* Genre grid */}
            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {genres.map((genre) => (
                <button
                  key={genre.id}
                  onClick={() =>
                    setSelectedGenre(
                      selectedGenre === genre.id ? null : genre.id,
                    )
                  }
                  className={`relative p-4 rounded-xl text-white font-semibold text-sm text-left overflow-hidden transition-all hover:scale-[1.02] ${
                    selectedGenre === genre.id
                      ? 'ring-2 ring-white ring-offset-2 ring-offset-background'
                      : ''
                  }`}
                  style={{ backgroundColor: genre.color }}
                >
                  {genre.name}
                </button>
              ))}
            </div>

            {/* Genre charts */}
            {selectedGenre && (
              <div className="space-y-8">
                {loadingGenre ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <>
                    {genreData?.results?.songs?.[0]?.data?.length > 0 && (
                      <section>
                        <h3 className="text-lg font-semibold mb-3">
                          Top Songs
                        </h3>
                        <div className="space-y-0.5">
                          {genreData.results.songs[0].data
                            .slice(0, 15)
                            .map((song: any, idx: number) => (
                              <SongRow
                                key={song.id}
                                id={song.id}
                                name={song.attributes?.name}
                                artistName={song.attributes?.artistName}
                                albumName={song.attributes?.albumName}
                                artworkUrl={song.attributes?.artwork?.url}
                                duration={
                                  song.attributes?.durationInMillis || 0
                                }
                                onClick={() => {
                                  const ids =
                                    genreData.results.songs[0].data.map(
                                      (s: any) => s.id,
                                    )
                                  playSongs(ids, idx)
                                }}
                              />
                            ))}
                        </div>
                      </section>
                    )}
                    {genreData?.results?.albums?.[0]?.data?.length > 0 && (
                      <section>
                        <h3 className="text-lg font-semibold mb-3">
                          Top Albums
                        </h3>
                        <div className="flex flex-wrap gap-4">
                          {genreData.results.albums[0].data
                            .slice(0, 10)
                            .map((album: any) => (
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
                  </>
                )}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
