import React, { useState, useEffect, useRef, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Artwork } from '@/components/ui/artwork'
import { SongRow } from '@/components/ui/song-row'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  usePlaylistDetail,
  usePlaylistTracks,
  useDeletePlaylist,
  useRenamePlaylist,
} from '@/hooks/use-playlists'
import { usePlayerStore } from '@/stores/player-store'
import { formatArtworkUrl, formatDuration, extractAlbumIdFromUrl } from '@/lib/utils'
import {
  Play,
  Shuffle,
  Loader2,
  ArrowLeft,
  MoreHorizontal,
  Pencil,
  Trash2,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'

export function PlaylistDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { playPlaylist, playSongs, nowPlaying, isPlaying } = usePlayerStore()
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editName, setEditName] = useState('')

  const { data: detailData, isLoading: loadingDetail } = usePlaylistDetail(id)
  const {
    data: tracksData,
    isLoading: loadingTracks,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = usePlaylistTracks(id)
  const deletePlaylistMutation = useDeletePlaylist()
  const renamePlaylistMutation = useRenamePlaylist()

  const playlist = detailData?.playlist ?? null
  const tracks = useMemo(
    () => tracksData?.pages.flatMap((page) => page.tracks) ?? [],
    [tracksData],
  )

  // Infinite scroll sentinel
  const sentinelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage()
        }
      },
      { rootMargin: '200px' },
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  const handleRename = async () => {
    if (!id || !editName.trim()) return
    await renamePlaylistMutation.mutateAsync({
      playlistId: id,
      name: editName.trim(),
    })
    setEditDialogOpen(false)
  }

  const handleDelete = async () => {
    if (!id) return
    await deletePlaylistMutation.mutateAsync(id)
    navigate('/library/playlists')
  }

  const loading = loadingDetail || loadingTracks

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground/40" />
      </div>
    )
  }

  if (!playlist) {
    return (
      <div className="text-center py-24 text-muted-foreground/50 text-[15px]">
        Playlist not found
      </div>
    )
  }

  const attrs = playlist.attributes
  const isLibrary = id?.startsWith('p.')
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
            Playlist
          </p>
          <h1 className="text-[28px] font-bold tracking-tight mb-1 line-clamp-2 leading-tight">
            {attrs?.name}
          </h1>
          {attrs?.curatorName && (
            <p className="text-[16px] text-muted-foreground mb-1.5">
              {attrs.curatorName}
            </p>
          )}
          <div className="flex items-center gap-2 text-[12px] text-muted-foreground/50 mb-5">
            <span>
              {tracks.length}
              {hasNextPage ? '+' : ''} songs
              {totalDuration > 0 && `, ${formatDuration(totalDuration)}`}
            </span>
          </div>

          {attrs?.description?.short && (
            <p className="text-[13px] text-muted-foreground/60 line-clamp-2 mb-5 max-w-md leading-relaxed">
              {attrs.description.short}
            </p>
          )}

          <div className="flex gap-2.5">
            <Button onClick={() => id && playPlaylist(id)} className="gap-2">
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

            {isLibrary && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon">
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem
                    onClick={() => {
                      setEditName(attrs?.name || '')
                      setEditDialogOpen(true)
                    }}
                  >
                    <Pencil className="w-4 h-4 mr-2" />
                    Rename
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleDelete}
                    className="text-destructive"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Playlist
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
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
            albumName={track.attributes?.albumName}
            albumId={extractAlbumIdFromUrl(track.attributes?.url as string | undefined)}
            artworkUrl={track.attributes?.artwork?.url}
            duration={track.attributes?.durationInMillis || 0}
            isActive={nowPlaying?.id === track.id}
            isPlaying={nowPlaying?.id === track.id && isPlaying}
            onClick={() => {
              const ids = tracks.map((t: MusicKit.Resource) => t.id)
              playSongs(ids, idx)
            }}
          />
        ))}
      </div>

      {/* Infinite scroll sentinel */}
      <div ref={sentinelRef} className="h-px" />

      {isFetchingNextPage && (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground/40" />
        </div>
      )}

      {tracks.length === 0 && (
        <div className="text-center py-20 text-muted-foreground/40">
          <p className="text-[15px]">This playlist is empty</p>
          <p className="text-[13px] mt-0.5">Search for songs to add</p>
        </div>
      )}

      {/* Edit dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Playlist</DialogTitle>
            <DialogDescription>
              Enter a new name for your playlist.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            placeholder="Playlist name"
            onKeyDown={(e) => e.key === 'Enter' && handleRename()}
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleRename}>Save</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
