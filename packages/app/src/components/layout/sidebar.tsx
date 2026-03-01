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
  Heart,
  Clock,
  Plus,
  Music2,
  Settings,
  User,
  ChevronDown,
} from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'
import { useLibraryStore } from '@/stores/library-store'
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
  const { playlists, createPlaylist } = useLibraryStore()

  const handleCreatePlaylist = async () => {
    const name = `New Playlist ${playlists.length + 1}`
    await createPlaylist(name)
  }

  return (
    <div className="w-[240px] h-full flex flex-col border-r border-border/50 bg-background/50 backdrop-blur-xl">
      {/* Drag region / title area — macOS only (Windows/Linux has a top-level title bar) */}
      {platform === 'darwin' ? (
        <div className="h-12 drag-region flex items-center px-4">
          <div className="no-drag flex items-center gap-2 ml-16">
            <Music2 className="w-5 h-5 text-primary" />
            <span className="font-semibold text-sm">Musictron</span>
          </div>
        </div>
      ) : (
        <div className="h-10 flex items-center px-4">
          <div className="flex items-center gap-2">
            <Music2 className="w-5 h-5 text-primary" />
            <span className="font-semibold text-sm">Musictron</span>
          </div>
        </div>
      )}

      {/* Main navigation */}
      <nav className="px-3 py-2 space-y-0.5">
        {mainNavItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors no-drag',
                isActive
                  ? 'bg-accent text-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent/50',
              )
            }
          >
            <item.icon className="w-4 h-4" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* Library section */}
      {isAuthorized && (
        <>
          <div className="px-6 pt-4 pb-2">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Library
            </h3>
          </div>
          <nav className="px-3 space-y-0.5">
            {libraryNavItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors no-drag',
                    isActive
                      ? 'bg-accent text-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent/50',
                  )
                }
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </NavLink>
            ))}
          </nav>

          {/* Playlists */}
          <div className="px-3 pt-4 pb-2 flex items-center justify-between">
            <h3 className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Playlists
            </h3>
            <Button
              variant="ghost"
              size="icon-sm"
              className="no-drag"
              onClick={handleCreatePlaylist}
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          <ScrollArea className="flex-1 px-3">
            <div className="space-y-0.5 pb-4">
              {playlists.map((playlist) => (
                <button
                  key={playlist.id}
                  onClick={() => navigate(`/playlist/${playlist.id}`)}
                  className="w-full flex items-center gap-3 px-3 py-1.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors text-left no-drag"
                >
                  <ListMusic className="w-4 h-4 flex-shrink-0" />
                  <span className="line-clamp-1">{playlist.name}</span>
                </button>
              ))}
            </div>
          </ScrollArea>
        </>
      )}

      {/* Bottom section */}
      <div className="p-3 border-t border-border/50">
        {isAuthorized ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors no-drag">
                <User className="w-4 h-4" />
                <span className="flex-1 text-left">Account</span>
                <ChevronDown className="w-3 h-3" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" side="top" className="w-48">
              <DropdownMenuItem onClick={() => navigate('/settings')}>
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={signOut}>
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start no-drag"
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
