import React from 'react'
import { useNavigate } from 'react-router-dom'
import { MediaCard } from '@/components/ui/media-card'
import { Artwork } from '@/components/ui/artwork'
import { useStations, useFeaturedPlaylists } from '@/hooks/use-radio'
import { formatArtworkUrl } from '@/lib/utils'
import { Loader2, Radio as RadioIcon } from 'lucide-react'

export function RadioPage() {
  const navigate = useNavigate()

  const { data: stations = [], isLoading: loadingStations } = useStations()
  const { data: featuredPlaylists = [], isLoading: loadingFeatured } =
    useFeaturedPlaylists()

  const loading = loadingStations || loadingFeatured

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground/40" />
      </div>
    )
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h1 className="text-[28px] font-bold tracking-tight">Radio</h1>
        <p className="text-[13px] text-muted-foreground/60 mt-1">
          Live and on-demand radio stations
        </p>
      </div>

      {/* Stations */}
      {stations.length > 0 && (
        <section className="mb-10 animate-fade-in-up stagger-1">
          <h2 className="text-[20px] font-semibold tracking-tight mb-4">
            Stations
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {stations.map((station: MusicKit.Resource) => (
              <div
                key={station.id}
                className="group relative rounded-xl overflow-hidden cursor-pointer hover:scale-[1.02] active:scale-[0.99] transition-transform duration-150"
              >
                <Artwork
                  src={formatArtworkUrl(station.attributes?.artwork?.url, 400)}
                  alt={station.attributes?.name}
                  size={300}
                  rounded="none"
                  className="w-full !h-auto aspect-square"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                <div className="absolute bottom-0 left-0 p-4">
                  <p className="text-white font-semibold text-[13px] leading-tight">
                    {station.attributes?.name}
                  </p>
                  <p className="text-white/50 text-[12px] mt-0.5 line-clamp-1">
                    {station.attributes?.editorialNotes?.short ||
                      'Radio Station'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Featured Mixes fallback */}
      {stations.length === 0 && featuredPlaylists.length > 0 && (
        <section className="animate-fade-in-up stagger-1">
          <h2 className="text-[20px] font-semibold tracking-tight mb-4">
            Featured Mixes
          </h2>
          <div className="flex flex-wrap gap-5">
            {featuredPlaylists.map((playlist: MusicKit.Resource) => (
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
        <div className="flex flex-col items-center justify-center py-24 text-muted-foreground/30">
          <RadioIcon className="w-12 h-12 mb-3" />
          <p className="text-[15px] text-muted-foreground/50">
            No radio stations available
          </p>
          <p className="text-[13px] mt-0.5">Browse for music instead</p>
        </div>
      )}
    </div>
  )
}
