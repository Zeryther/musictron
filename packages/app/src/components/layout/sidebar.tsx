import React from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import {
  Home,
  Search,
  Library,
  ListMusic,
  Radio,
  Clock,
  Plus,
  Music2,
  Settings,
  User,
  ChevronDown,
} from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'
import { useLibraryPlaylists, useCreatePlaylist } from '@/hooks/use-playlists'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'

const mainNavItems = [
  { to: '/', icon: Home, label: 'Home' },
  { to: '/browse', icon: Music2, label: 'Browse' },
  { to: '/radio', icon: Radio, label: 'Radio' },
  { to: '/search', icon: Search, label: 'Search' },
]

const libraryNavItems = [
  { to: '/library/recently-added', icon: Clock, label: 'Recently Added' },
  { to: '/library/songs', icon: Music2, label: 'Songs' },
  { to: '/library/albums', icon: Library, label: 'Albums' },
  { to: '/library/artists', icon: User, label: 'Artists' },
  { to: '/library/playlists', icon: ListMusic, label: 'Playlists' },
]

export function Sidebar({ platform }: { platform: string }) {
  const navigate = useNavigate()
  const { isAuthorized, signOut } = useAuthStore()
  const { data: playlists = [] } = useLibraryPlaylists(isAuthorized)
  const createPlaylistMutation = useCreatePlaylist()

  const handleCreatePlaylist = () => {
    createPlaylistMutation.mutate({
      name: `New Playlist ${playlists.length + 1}`,
    })
  }

  return (
    <div className="w-60 h-full flex flex-col border-r border-foreground/[0.06] surface-glass-heavy">
      {/* Drag region / title area. Height and offset stay in px — they must
          align with Electron's trafficLightPosition (OS pixels, unaffected by
          root font-size / UI scale). */}
      {platform === 'darwin' ? (
        <div className="h-[52px] drag-region flex items-center px-5 shrink-0">
          <div className="no-drag flex items-center gap-2 ml-[64px]">
            <Music2 className="w-[1.125rem] h-[1.125rem] text-primary" />
            <span className="font-semibold text-sm tracking-tight">
              Musictron
            </span>
          </div>
        </div>
      ) : (
        <div className="h-11 flex items-center px-5 shrink-0">
          <div className="flex items-center gap-2">
            <Music2 className="w-[1.125rem] h-[1.125rem] text-primary" />
            <span className="font-semibold text-sm tracking-tight">
              Musictron
            </span>
          </div>
        </div>
      )}

      {/* Main navigation */}
      <nav className="px-3 py-1 space-y-px">
        {mainNavItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-[7px] rounded-lg text-sm font-medium transition-colors duration-100 no-drag',
                isActive
                  ? 'bg-foreground/[0.08] text-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-foreground/[0.06]',
              )
            }
          >
            <item.icon className="w-[1.125rem] h-[1.125rem]" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* Library section */}
      {isAuthorized && (
        <>
          <div className="px-6 pt-5 pb-1.5">
            <h3 className="eyebrow">Library</h3>
          </div>
          <nav className="px-3 space-y-px">
            {libraryNavItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 px-3 py-[7px] rounded-lg text-sm font-medium transition-colors duration-100 no-drag',
                    isActive
                      ? 'bg-foreground/[0.08] text-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-foreground/[0.06]',
                  )
                }
              >
                <item.icon className="w-[1.125rem] h-[1.125rem]" />
                {item.label}
              </NavLink>
            ))}
          </nav>

          {/* Playlists */}
          <div className="px-3 pt-5 pb-1.5 flex items-center justify-between">
            <h3 className="eyebrow px-3">Playlists</h3>
            <Button
              variant="ghost"
              size="icon-sm"
              className="no-drag text-muted-foreground hover:text-foreground"
              onClick={handleCreatePlaylist}
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          <ScrollArea className="flex-1 px-3">
            <div className="space-y-px pb-4">
              {playlists.map((playlist) => (
                <button
                  key={playlist.id}
                  onClick={() => navigate(`/playlist/${playlist.id}`)}
                  className="w-full flex items-center gap-3 px-3 py-[6px] rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-foreground/[0.06] transition-colors duration-100 text-left no-drag"
                >
                  <ListMusic className="w-[1rem] h-[1rem] flex-shrink-0 opacity-50" />
                  <span className="line-clamp-1">{playlist.name}</span>
                </button>
              ))}
            </div>
          </ScrollArea>
        </>
      )}

      {/* Spacer when not authorized */}
      {!isAuthorized && <div className="flex-1" />}

      {/* Bottom section */}
      <div className="p-3 border-t border-foreground/[0.06]">
        {isAuthorized ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-full flex items-center gap-2 px-3 py-[7px] rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-foreground/[0.06] transition-colors duration-100 no-drag">
                <div className="w-6 h-6 rounded-full bg-accent flex items-center justify-center">
                  <User className="w-3.5 h-3.5" />
                </div>
                <span className="flex-1 text-left font-medium">Account</span>
                <ChevronDown className="w-3 h-3 opacity-40" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" side="top" className="w-48">
              <DropdownMenuItem onClick={() => navigate('/settings')}>
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={signOut}>Sign Out</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start no-drag text-muted-foreground hover:text-foreground"
            onClick={() => navigate('/settings')}
          >
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </Button>
        )}
      </div>
    </div>
  )
}
