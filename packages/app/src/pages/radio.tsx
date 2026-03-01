import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MediaCard } from '@/components/ui/media-card'
import { Artwork } from '@/components/ui/artwork'
import { musicAPI } from '@/lib/musickit'
import { formatArtworkUrl } from '@/lib/utils'
import { Loader2, Radio as RadioIcon } from 'lucide-react'

export function RadioPage() {
  const navigate = useNavigate()
  const [stations, setStations] = useState<any[]>([])
  const [featuredPlaylists, setFeaturedPlaylists] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchRadio() {
      setLoading(true)
      try {
        // Fetch Apple Music 1 and featured radio content
        const [stationsData, chartsData] = await Promise.all([
          musicAPI('/v1/catalog/us/stations', {
            limit: 20,
            'filter[featured]': 'apple-music-live-radio',
          }).catch(() => null),
          musicAPI('/v1/catalog/us/charts', {
            types: 'playlists',
            limit: 20,
          }).catch(() => null),
        ])

        setStations(stationsData?.data || [])
        setFeaturedPlaylists(
          chartsData?.results?.playlists?.[0]?.data || [],
        )
      } catch (error) {
        console.error('Failed to fetch radio:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchRadio()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-10 animate-fade-in">
      <div className="pt-2">
        <h1 className="text-3xl font-bold">Radio</h1>
        <p className="text-muted-foreground mt-1">
          Live and on-demand radio stations
        </p>
      </div>

      {/* Featured Stations */}
      {stations.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold mb-4">Stations</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {stations.map((station: any) => (
              <div
                key={station.id}
                className="group relative rounded-xl overflow-hidden cursor-pointer hover:scale-[1.02] transition-transform"
              >
                <Artwork
                  src={formatArtworkUrl(
                    station.attributes?.artwork?.url,
                    400,
                  )}
                  alt={station.attributes?.name}
                  size={300}
                  rounded="none"
                  className="w-full !h-auto aspect-square"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-0 left-0 p-4">
                  <p className="text-white font-semibold text-sm">
                    {station.attributes?.name}
                  </p>
                  <p className="text-white/70 text-xs">
                    {station.attributes?.editorialNotes?.short || 'Radio Station'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* If no stations, show featured playlists as radio-like content */}
      {stations.length === 0 && featuredPlaylists.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold mb-4">Featured Mixes</h2>
          <div className="flex flex-wrap gap-4">
            {featuredPlaylists.map((playlist: any) => (
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

      {/* Empty state */}
      {stations.length === 0 && featuredPlaylists.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <RadioIcon className="w-16 h-16 mb-4 opacity-20" />
          <p className="text-lg">No radio stations available</p>
          <p className="text-sm mt-1">Browse for music instead</p>
        </div>
      )}
    </div>
  )
}
