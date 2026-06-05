import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/player/Sidebar';
import Header from '../components/player/Header';
import BottomPlayer from '../components/player/BottomPlayer';
import { useMusicStore } from '../store/useMusicStore';
import { useSpotifyPlayer } from '../hooks/useSpotifyPlayer';
import { AlertCircle, X } from 'lucide-react';
import axiosInstance from '../lib/axios';

export default function MainLayout() {
  const [searchQuery, setSearchQuery] = useState('');
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const { isPremium, setLikedTrackIds } = useMusicStore();
  
  // Initialize Spotify Web Playback SDK
  useSpotifyPlayer();

  // Fetch liked track ids from MongoDB on mount to sync heart icons
  useEffect(() => {
    async function fetchLikes() {
      try {
        const response = await axiosInstance.get('/api/favorites');
        const ids = response.data.map((fav: any) => fav.spotifyTrackId);
        setLikedTrackIds(ids);
      } catch (err) {
        console.error('Failed to pre-fetch favorites:', err);
      }
    }
    fetchLikes();
  }, [setLikedTrackIds]);

  return (
    <div className="h-screen w-screen overflow-hidden bg-paper text-ink flex flex-col font-body">
      {/* Main Grid View */}
      <div className="flex-1 flex overflow-hidden">
        {/* Navigation Sidebar */}
        <Sidebar />

        {/* Content Container */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <Header searchQuery={searchQuery} setSearchQuery={setSearchQuery} />

          {/* Premium Fallback Banner */}
          {!isPremium && !bannerDismissed && (
            <div className="bg-amber-500/15 border-b border-amber-500/20 px-8 py-3 flex items-center justify-between text-amber-400 text-[12.5px] select-none animate-in fade-in duration-200">
              <div className="flex items-center gap-2.5">
                <AlertCircle size={16} className="shrink-0" />
                <span>
                  <strong>Spotify Premium is required for full playback.</strong> Falling back to 30-second audio previews.
                </span>
              </div>
              <button 
                onClick={() => setBannerDismissed(true)}
                className="text-amber-400/70 hover:text-amber-400 cursor-pointer p-0.5 rounded-full hover:bg-amber-500/10 transition-all"
              >
                <X size={14} />
              </button>
            </div>
          )}

          {/* Main Outlet (scrollable area) */}
          <main className="flex-1 overflow-y-auto px-8 py-6 relative">
            <Outlet context={{ searchQuery, setSearchQuery }} />
          </main>
        </div>
      </div>

      {/* Persistent Bottom Audio Player */}
      <BottomPlayer />
    </div>
  );
}
export type OutletContextType = {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
};
