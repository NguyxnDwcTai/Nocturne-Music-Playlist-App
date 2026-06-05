import { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Search, ChevronDown, User, LogOut, ExternalLink } from 'lucide-react';
import { useMusicStore } from '../../store/useMusicStore';
import axiosInstance from '../../lib/axios';

interface HeaderProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export default function Header({ searchQuery, setSearchQuery }: HeaderProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const { userProfile, clearStore } = useMusicStore();
  const isSearchRoute = location.pathname === '/search';

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      await axiosInstance.post('/api/auth/logout');
      clearStore();
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
      clearStore();
      navigate('/');
    }
  };

  const getInitials = (name: string) => {
    if (!name) return 'U';
    return name.charAt(0).toUpperCase();
  };

  return (
    <header className="h-16 bg-paper/30 backdrop-blur-md border-b border-rule flex items-center justify-between px-8 select-none z-30">
      {/* Search Input (visible only on /search) */}
      <div className="flex-1 max-w-md">
        {isSearchRoute ? (
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral" size={16} />
            <input
              type="text"
              placeholder="What do you want to play?"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-paper-2 border border-rule hover:border-neutral/30 focus:border-accent focus:outline-none rounded-full text-[13px] text-ink placeholder:text-muted/60 transition-colors"
            />
          </div>
        ) : (
          <div className="text-[14px] font-medium text-neutral">
            {location.pathname === '/dashboard' && 'Dashboard'}
            {location.pathname === '/library' && 'Your Library'}
          </div>
        )}
      </div>

      {/* User Actions */}
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="flex items-center gap-2 p-1.5 pr-3 bg-paper-2 hover:bg-paper-3 border border-rule rounded-full transition-all cursor-pointer focus:outline-none"
        >
          {userProfile?.profileImage ? (
            <img
              src={userProfile.profileImage}
              alt={userProfile.displayName}
              className="w-6 h-6 rounded-full object-cover border border-rule"
            />
          ) : (
            <div className="w-6 h-6 rounded-full bg-accent text-paper flex items-center justify-center font-display font-semibold text-[11px]">
              {getInitials(userProfile?.displayName || 'User')}
            </div>
          )}
          <span className="text-[12.5px] font-medium text-ink max-w-[120px] truncate">
            {userProfile?.displayName || 'User Profile'}
          </span>
          <ChevronDown size={14} className={`text-neutral transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* Dropdown Menu */}
        {dropdownOpen && (
          <div className="absolute right-0 mt-2 w-48 bg-paper-2 border border-rule rounded-lg shadow-xl py-1 z-40 animate-in fade-in slide-in-from-top-2 duration-150">
            <a
              href={`https://www.spotify.com/user`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 text-[12.5px] text-neutral hover:text-ink hover:bg-paper/30 transition-colors"
            >
              <User size={14} />
              <span>Spotify Profile</span>
              <ExternalLink size={10} className="ml-auto opacity-60" />
            </a>
            
            <div className="h-[1px] bg-rule my-1" />
            
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2 px-4 py-2 text-[12.5px] text-rose-400 hover:bg-rose-500/10 transition-colors text-left"
            >
              <LogOut size={14} />
              <span>Log out</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
