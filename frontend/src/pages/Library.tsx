import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMusicStore, TrackObject } from '../store/useMusicStore';
import { useSpotifyPlayer } from '../hooks/useSpotifyPlayer';
import axiosInstance from '../lib/axios';
import { Play, Heart, Music, ListMusic, Trash2 } from 'lucide-react';

interface MongoFavorite {
  _id: string;
  spotifyTrackId: string;
  trackName: string;
  artistName: string;
  albumCoverUrl: string;
  createdAt: string;
}

export default function Library() {
  const navigate = useNavigate();
  const { playTrack } = useSpotifyPlayer();
  const { removeLikedTrackId } = useMusicStore();
  const [activeTab, setActiveTab] = useState<'playlists' | 'liked'>('liked');
  const [favorites, setFavorites] = useState<MongoFavorite[]>([]);
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch MongoDB favorites and Spotify playlists
  const fetchLibraryData = async () => {
    setLoading(true);
    try {
      // 1. Fetch MongoDB Favorites
      const favResponse = await axiosInstance.get('/api/favorites');
      setFavorites(favResponse.data);

      // 2. Fetch Spotify Playlists
      const playlistsResponse = await axiosInstance.get('/api/spotify/playlists?limit=20');
      setPlaylists(playlistsResponse.data.items || []);
    } catch (err) {
      console.warn('Could not fetch all library items from Spotify, using fallback mock.', err);
      // Fallback playlists
      setPlaylists([
        {
          id: 'mock-p1',
          name: 'My After Hours Curation',
          description: 'Custom mood playlist created inside Nocturne.',
          images: [{ url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=60' }],
          tracks: { total: 12 }
        },
        {
          id: 'mock-p2',
          name: 'Midnight Compilation',
          description: 'A dark melodic techno set.',
          images: [{ url: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=150&auto=format&fit=crop&q=60' }],
          tracks: { total: 24 }
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLibraryData();
  }, []);

  // Remove Favorite Song
  const handleDeleteFavorite = async (e: React.MouseEvent, spotifyTrackId: string) => {
    e.stopPropagation();
    removeLikedTrackId(spotifyTrackId);
    setFavorites(prev => prev.filter(f => f.spotifyTrackId !== spotifyTrackId));
    try {
      await axiosInstance.post('/api/favorites/toggle', { spotifyTrackId });
    } catch (err) {
      console.error('Failed to remove favorite:', err);
      fetchLibraryData(); // Re-fetch on fail to restore state
    }
  };

  // Convert MongoDB Favorite to TrackObject shape for playing
  const handlePlayFavorite = (fav: MongoFavorite) => {
    const track: TrackObject = {
      id: fav.spotifyTrackId,
      name: fav.trackName,
      artists: [{ name: fav.artistName }],
      album: {
        name: 'Liked Songs',
        images: [{ url: fav.albumCoverUrl }]
      },
      duration_ms: 30000, // Default duration, will fetch preview url on play if needed
      uri: `spotify:track:${fav.spotifyTrackId}`,
    };
    playTrack(track);
  };

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="flex gap-4 border-b border-rule pb-2">
          <div className="h-6 w-24 bg-paper-2 rounded" />
          <div className="h-6 w-24 bg-paper-2 rounded" />
        </div>
        <div className="space-y-3 pt-4">
          <div className="h-12 bg-paper-2 rounded w-full" />
          <div className="h-12 bg-paper-2 rounded w-full" />
          <div className="h-12 bg-paper-2 rounded w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 select-none animate-in fade-in duration-300">
      {/* Title */}
      <div>
        <h1 className="font-display font-bold text-2xl tracking-tight text-ink">Your Library</h1>
        <p className="text-[12.5px] text-neutral mt-0.5">Manage your playlists and saved tracks.</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-rule/50">
        <button
          onClick={() => setActiveTab('liked')}
          className={`px-5 py-2.5 text-[13px] font-semibold tracking-wide border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'liked'
              ? 'border-accent text-accent'
              : 'border-transparent text-neutral hover:text-ink'
          }`}
        >
          <Heart size={14} fill={activeTab === 'liked' ? 'currentColor' : 'none'} />
          <span>Liked Songs ({favorites.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('playlists')}
          className={`px-5 py-2.5 text-[13px] font-semibold tracking-wide border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'playlists'
              ? 'border-accent text-accent'
              : 'border-transparent text-neutral hover:text-ink'
          }`}
        >
          <ListMusic size={14} />
          <span>Playlists ({playlists.length})</span>
        </button>
      </div>

      {/* Tab Content: Liked Songs */}
      {activeTab === 'liked' && (
        <div className="space-y-2">
          {favorites.length > 0 ? (
            <div className="border border-rule/30 rounded-lg overflow-hidden bg-paper-2/15">
              <div className="grid grid-cols-[auto_1fr_auto] gap-4 px-5 py-2.5 border-b border-rule/30 text-[10.5px] font-mono text-neutral uppercase">
                <div className="w-8 text-center">#</div>
                <div>Title</div>
                <div className="pr-4">Actions</div>
              </div>

              <div className="divide-y divide-rule/20">
                {favorites.map((fav, idx) => (
                  <div
                    key={fav._id}
                    onClick={() => handlePlayFavorite(fav)}
                    className="grid grid-cols-[auto_1fr_auto] gap-4 px-5 py-3 items-center text-[13px] hover:bg-paper-3/50 group cursor-pointer transition-colors"
                  >
                    {/* Index / Play */}
                    <div className="w-8 flex items-center justify-center font-mono text-[11px] text-neutral">
                      <span className="group-hover:hidden">{idx + 1}</span>
                      <span className="hidden group-hover:block text-accent">
                        <Play size={12} fill="currentColor" />
                      </span>
                    </div>

                    {/* Meta */}
                    <div className="flex items-center gap-3 min-w-0">
                      {fav.albumCoverUrl ? (
                        <img
                          src={fav.albumCoverUrl}
                          alt={fav.trackName}
                          className="w-9 h-9 object-cover rounded-md border border-rule"
                        />
                      ) : (
                        <div className="w-9 h-9 bg-paper-3 rounded-md border border-rule flex items-center justify-center text-neutral">
                          <Music size={14} />
                        </div>
                      )}
                      <div className="min-w-0">
                        <h4 className="font-semibold text-ink truncate group-hover:text-accent transition-colors">
                          {fav.trackName}
                        </h4>
                        <p className="text-[11px] text-neutral truncate mt-0.5">
                          {fav.artistName}
                        </p>
                      </div>
                    </div>

                    {/* Delete Action */}
                    <div className="pr-2 flex items-center">
                      <button
                        onClick={(e) => handleDeleteFavorite(e, fav.spotifyTrackId)}
                        className="p-1.5 text-neutral hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-all cursor-pointer rounded-full hover:bg-rose-500/10"
                        title="Remove from favorites"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-16 space-y-3 border border-dashed border-rule/50 rounded-xl">
              <Heart size={28} className="text-neutral mx-auto opacity-45" />
              <div>
                <p className="text-[14px] text-ink font-semibold">Songs you like will appear here</p>
                <p className="text-[12px] text-neutral mt-0.5">Go to Search to find and save your favorite vibes.</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab Content: Playlists */}
      {activeTab === 'playlists' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
          {playlists.length > 0 ? (
            playlists.map((playlist) => (
              <div
                key={playlist.id}
                onClick={() => navigate(`/playlist/${playlist.id}`)}
                className="bg-paper-2/20 border border-rule/50 rounded-xl p-4 flex flex-col gap-3 group transition-all duration-300 hover:shadow-lg hover:border-accent/15 cursor-pointer"
              >
                <div className="relative aspect-square w-full rounded-lg overflow-hidden border border-rule shadow">
                  {playlist.images && playlist.images[0] ? (
                    <img
                      src={playlist.images[0].url}
                      alt={playlist.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full bg-paper-3 flex items-center justify-center text-neutral">
                      <ListMusic size={32} />
                    </div>
                  )}
                  <button className="absolute bottom-3 right-3 w-10 h-10 rounded-full bg-accent text-paper flex items-center justify-center shadow-lg opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
                    <Play size={18} fill="currentColor" className="ml-0.5" />
                  </button>
                </div>
                <div>
                  <h4 className="text-[13px] font-semibold text-ink truncate group-hover:text-accent transition-colors">
                    {playlist.name}
                  </h4>
                  <p className="text-[11px] text-neutral truncate mt-0.5">
                    {playlist.tracks?.total || 0} tracks
                  </p>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full text-center py-16 space-y-2 border border-dashed border-rule/50 rounded-xl">
              <ListMusic size={28} className="text-neutral mx-auto opacity-45" />
              <p className="text-[14px] text-ink font-semibold">No playlists found</p>
              <p className="text-[12px] text-neutral">Log in to Spotify to retrieve your playlists.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
