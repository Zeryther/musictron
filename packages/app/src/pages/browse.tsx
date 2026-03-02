import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MediaCard } from '@/components/ui/media-card'
import { SongRow } from '@/components/ui/song-row'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { useCharts, useGenreCharts, getChartData } from '@/hooks/use-charts'
import { usePlayerStore } from '@/stores/player-store'
import { extractAlbumIdFromUrl } from '@/lib/utils'
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
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null)

  const { data: charts, isLoading: loading } = useCharts(30)
  const { data: genreData, isLoading: loadingGenre } =
    useGenreCharts(selectedGenre)

  const topSongs = getChartData(charts?.results?.songs)
  const topAlbums = getChartData(charts?.results?.albums)
  const topPlaylists = getChartData(charts?.results?.playlists)

  return (
    <div className="animate-fade-in">
      <h1 className="text-[28px] font-bold tracking-tight mb-6">Browse</h1>

      <Tabs defaultValue="charts" className="space-y-6">
        <TabsList>
          <TabsTrigger value="charts">Charts</TabsTrigger>
          <TabsTrigger value="genres">Genres</TabsTrigger>
        </TabsList>

        <TabsContent value="charts">
          {loading ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-10">
              {topSongs.length > 0 && (
                <section className="animate-fade-in-up stagger-1">
                  <h2 className="text-[20px] font-semibold tracking-tight mb-4">
                    Top Songs
                  </h2>
                  <div className="space-y-px">
                    {topSongs.map((song: MusicKit.Resource, idx: number) => (
                      <SongRow
                        key={song.id}
                        id={song.id}
                        name={song.attributes?.name}
                        artistName={song.attributes?.artistName}
                        albumName={song.attributes?.albumName}
                        albumId={extractAlbumIdFromUrl(
                          song.attributes?.url as string | undefined,
                        )}
                        artworkUrl={song.attributes?.artwork?.url}
                        duration={song.attributes?.durationInMillis || 0}
                        onClick={() => {
                          const ids = topSongs.map(
                            (s: MusicKit.Resource) => s.id,
                          )
                          playSongs(ids, idx)
                        }}
                      />
                    ))}
                  </div>
                </section>
              )}

              {topAlbums.length > 0 && (
                <section className="animate-fade-in-up stagger-2">
                  <h2 className="text-[20px] font-semibold tracking-tight mb-4">
                    Top Albums
                  </h2>
                  <div className="flex flex-wrap gap-5">
                    {topAlbums.map((album: MusicKit.Resource) => (
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

              {topPlaylists.length > 0 && (
                <section className="animate-fade-in-up stagger-3">
                  <h2 className="text-[20px] font-semibold tracking-tight mb-4">
                    Top Playlists
                  </h2>
                  <div className="flex flex-wrap gap-5">
                    {topPlaylists.map((playlist: MusicKit.Resource) => (
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
          )}
        </TabsContent>

        <TabsContent value="genres">
          <div className="space-y-6">
            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5">
              {genres.map((genre) => (
                <button
                  key={genre.id + genre.name}
                  onClick={() =>
                    setSelectedGenre(
                      selectedGenre === genre.id ? null : genre.id,
                    )
                  }
                  className={`relative px-4 py-3 rounded-xl text-white font-semibold text-[13px] text-left overflow-hidden transition-all duration-150 hover:brightness-110 active:scale-[0.98] ${
                    selectedGenre === genre.id
                      ? 'ring-2 ring-white/80 ring-offset-2 ring-offset-background scale-[0.98]'
                      : ''
                  }`}
                  style={{ backgroundColor: genre.color }}
                >
                  {genre.name}
                </button>
              ))}
            </div>

            {selectedGenre && (
              <div className="space-y-8 animate-fade-in-up">
                {loadingGenre ? (
                  <div className="flex items-center justify-center py-16">
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <>
                    {(() => {
                      const genreSongs = getChartData(genreData?.results?.songs)
                      if (!genreSongs.length) return null
                      return (
                        <section>
                          <h3 className="text-[17px] font-semibold tracking-tight mb-3">
                            Top Songs
                          </h3>
                          <div className="space-y-px">
                            {genreSongs
                              .slice(0, 15)
                              .map((song: MusicKit.Resource, idx: number) => (
                                <SongRow
                                  key={song.id}
                                  id={song.id}
                                  name={song.attributes?.name}
                                  artistName={song.attributes?.artistName}
                                  albumName={song.attributes?.albumName}
                                  albumId={extractAlbumIdFromUrl(
                                    song.attributes?.url as string | undefined,
                                  )}
                                  artworkUrl={song.attributes?.artwork?.url}
                                  duration={
                                    song.attributes?.durationInMillis || 0
                                  }
                                  onClick={() => {
                                    const ids = genreSongs.map(
                                      (s: MusicKit.Resource) => s.id,
                                    )
                                    playSongs(ids, idx)
                                  }}
                                />
                              ))}
                          </div>
                        </section>
                      )
                    })()}
                    {(() => {
                      const genreAlbums = getChartData(
                        genreData?.results?.albums,
                      )
                      if (!genreAlbums.length) return null
                      return (
                        <section>
                          <h3 className="text-[17px] font-semibold tracking-tight mb-3">
                            Top Albums
                          </h3>
                          <div className="flex flex-wrap gap-5">
                            {genreAlbums
                              .slice(0, 10)
                              .map((album: MusicKit.Resource) => (
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
                      )
                    })()}
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
