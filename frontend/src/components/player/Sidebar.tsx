import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Search, Library, Plus, Heart } from 'lucide-react';
import axiosInstance from '../../lib/axios';

export default function Sidebar() {
  const location = useLocation();
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const navItems = [
    { name: 'Home', path: '/dashboard', icon: Home },
    { name: 'Search', path: '/search', icon: Search },
    { name: 'Your Library', path: '/library', icon: Library },
  ];

  const actionItems = [
    { name: 'Create Playlist', path: '#', icon: Plus, action: () => alert('Create Playlist coming soon!') },
    { name: 'Liked Songs', path: '/library', icon: Heart, iconColor: 'text-accent' },
  ];

  const isActive = (path: string) => location.pathname === path;

  // Fetch playlists on mount
  useEffect(() => {
    async function loadPlaylists() {
      setLoading(true);
      try {
        const res = await axiosInstance.get('/api/spotify/playlists?limit=30');
        setPlaylists(res.data.items || []);
      } catch (err) {
        console.error('Sidebar error fetching playlists:', err);
      } finally {
        setLoading(false);
      }
    }
    loadPlaylists();
  }, []);

  return (
    <aside className="w-64 bg-paper-2 border-r border-rule flex flex-col h-full text-ink select-none">
      {/* App Branding */}
      <div className="p-6">
        <Link to="/dashboard" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center shadow-lg shadow-accent/20">
            <span className="font-display font-bold text-paper text-lg">N</span>
          </div>
          <span className="font-display font-bold text-xl tracking-tight bg-gradient-to-r from-ink to-neutral bg-clip-text text-transparent">
            Nocturne
          </span>
        </Link>
      </div>

      {/* Main Navigation */}
      <nav className="px-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          return (
            <Link
              key={item.name}
              to={item.path}
              className={`flex items-center gap-4 px-4 py-3 rounded-lg text-[13.5px] font-medium transition-all duration-200 group ${
                active
                  ? 'bg-paper-3 text-accent shadow-sm'
                  : 'text-neutral hover:text-ink hover:bg-paper/20'
              }`}
            >
              <Icon
                size={18}
                className={`transition-transform duration-200 group-hover:scale-105 ${
                  active ? 'text-accent' : 'text-neutral group-hover:text-ink'
                }`}
              />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Divider */}
      <div className="px-6 py-4">
        <div className="h-[1px] bg-rule/50" />
      </div>

      {/* Action Items */}
      <div className="px-4 space-y-1">
        {actionItems.map((item) => {
          const Icon = item.icon;
          
          const content = (
            <span className="flex items-center gap-4 px-4 py-3 rounded-lg text-[13.5px] font-medium transition-all duration-200 group cursor-pointer w-full text-left">
              <span className={`p-1 rounded-sm bg-paper-3 group-hover:bg-paper-2 border border-rule transition-colors`}>
                <Icon
                  size={14}
                  className={`transition-transform duration-200 group-hover:scale-105 ${
                    item.iconColor || 'text-neutral group-hover:text-ink'
                  }`}
                />
              </span>
              <span className="text-neutral group-hover:text-ink">{item.name}</span>
            </span>
          );

          if (item.action) {
            return (
              <button
                key={item.name}
                onClick={item.action}
                className="w-full text-left focus:outline-none"
              >
                {content}
              </button>
            );
          }

          return (
            <Link
              key={item.name}
              to={item.path}
              className="block"
            >
              {content}
            </Link>
          );
        })}
      </div>

      {/* Divider */}
      <div className="px-6 py-4">
        <div className="h-[1px] bg-rule/50" />
      </div>

      {/* Playlists Title */}
      <div className="px-6 pb-2">
        <span className="text-[11px] font-bold tracking-wider text-muted uppercase">Playlists</span>
      </div>

      {/* Playlists Scroll Container */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-0.5 custom-scrollbar min-h-0">
        {loading ? (
          <div className="px-4 py-2 text-[12px] text-neutral font-mono animate-pulse">Loading playlists...</div>
        ) : playlists.length > 0 ? (
          playlists.map((playlist) => {
            const active = isActive(`/playlist/${playlist.id}`);
            return (
              <Link
                key={playlist.id}
                to={`/playlist/${playlist.id}`}
                className={`block px-4 py-2 rounded-lg text-[13px] truncate transition-colors ${
                  active 
                    ? 'text-accent font-semibold bg-paper-3' 
                    : 'text-neutral hover:text-ink'
                }`}
                title={playlist.name}
              >
                {playlist.name}
              </Link>
            );
          })
        ) : (
          <div className="px-4 py-2 text-[12.5px] text-neutral/65 italic">No playlists found.</div>
        )}
      </div>

      {/* Footer Info */}
      <div className="mt-auto p-6 text-[10.5px] text-muted font-mono border-t border-rule/35">
        <div>Logged in to Spotify</div>
        <div className="mt-1 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>Device active</span>
        </div>
      </div>
    </aside>
  );
}
