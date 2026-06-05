import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useSpotifyPlayer } from '../hooks/useSpotifyPlayer';
import { useMusicStore, TrackObject } from '../store/useMusicStore';
import axiosInstance from '../lib/axios';
import { Play, Clock, Music, Users, Disc, Heart } from 'lucide-react';
import { OutletContextType } from '../layouts/MainLayout';

interface SearchResults {
  tracks: TrackObject[];
  artists: any[];
  albums: any[];
}

export default function Search() {
  const { searchQuery } = useOutletContext<OutletContextType>();
  const { playTrack } = useSpotifyPlayer();
  const { likedTrackIds, addLikedTrackId, removeLikedTrackId } = useMusicStore();
  
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'tracks' | 'artists' | 'albums'>('tracks');

  // Hardcoded categories for default view
  const categories = [
    { name: 'Late Night Coding', gradient: 'from-blue-600 to-indigo-900', q: 'lofi coding focus' },
    { name: 'Synthwave Drive', gradient: 'from-fuchsia-600 to-indigo-900', q: 'synthwave nightdrive' },
    { name: 'Ambient Sleep', gradient: 'from-indigo-900 to-purple-950', q: 'ambient dark space sleep' },
    { name: 'Chill Lofi Beats', gradient: 'from-rose-500 to-purple-900', q: 'lofi hip hop chill' },
    { name: 'Dark Techno', gradient: 'from-zinc-900 to-zinc-950 border border-zinc-800', q: 'industrial dark techno' },
    { name: 'Jazz Nocturnal', gradient: 'from-amber-600 to-amber-950', q: 'midnight jazz chill' },
    { name: 'Melodic Progressive', gradient: 'from-cyan-600 to-blue-900', q: 'melodic progressive house' },
    { name: 'Indie Ambient', gradient: 'from-emerald-600 to-teal-950', q: 'indie folk ambient' },
  ];

  // Debounce query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 500);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Fetch search results
  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setResults(null);
      return;
    }

    async function fetchSearch() {
      setLoading(true);
      try {
        const response = await axiosInstance.get(`/api/spotify/search`, {
          params: { q: debouncedQuery, limit: 20 },
        });

        const tracksData = response.data.tracks?.items || [];
        const artistsData = response.data.artists?.items || [];
        const albumsData = response.data.albums?.items || [];

        // Format tracks
        const formattedTracks = tracksData.map((t: any) => ({
          id: t.id,
          name: t.name,
          artists: t.artists,
          album: {
            name: t.album?.name || '',
            images: t.album?.images || [],
          },
          duration_ms: t.duration_ms,
          uri: t.uri,
          preview_url: t.preview_url,
        }));

        setResults({
          tracks: formattedTracks,
          artists: artistsData,
          albums: albumsData,
        });
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchSearch();
  }, [debouncedQuery]);

  const handleCategoryClick = (q: string) => {
    // We update the query state, which is owned by MainLayout
    // To do this, we need to extract setSearchQuery from context
    const context = useOutletContext<OutletContextType>();
    if (context && context.setSearchQuery) {
      context.setSearchQuery(q);
    }
  };

  const formatDuration = (ms: number) => {
    const min = Math.floor(ms / 60000);
    const sec = Math.floor((ms % 60000) / 1000);
    return `${min}:${sec < 10 ? '0' : ''}${sec}`;
  };

  const handleLikeToggle = async (e: React.MouseEvent, track: TrackObject) => {
    e.stopPropagation();
    const trackId = track.id;
    const wasLiked = likedTrackIds.includes(trackId);
    
    if (wasLiked) {
      removeLikedTrackId(trackId);
    } else {
      addLikedTrackId(trackId);
    }

    try {
      const response = await axiosInstance.post('/api/favorites/toggle', {
        spotifyTrackId: trackId,
        trackName: track.name,
        artistName: track.artists.map(a => a.name).join(', '),
        albumCoverUrl: track.album.images[0]?.url || '',
      });
      
      if (response.data.liked) {
        addLikedTrackId(trackId);
      } else {
        removeLikedTrackId(trackId);
      }
    } catch (err) {
      console.error('Failed to toggle favorite:', err);
      if (wasLiked) {
        addLikedTrackId(trackId);
      } else {
        removeLikedTrackId(trackId);
      }
    }
  };

  return (
    <div className="space-y-6 pb-12 select-none animate-in fade-in duration-300">
      {/* Category Grid (Default View when query is empty) */}
      {!searchQuery && !results && !loading && (
        <section className="space-y-6">
          <div>
            <h2 className="font-display font-bold text-xl text-ink">Browse Nocturnal Categories</h2>
            <p className="text-[12.5px] text-neutral mt-0.5">Select a vibe card to start search seeding.</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 pt-2">
            {categories.map((cat) => (
              <button
                key={cat.name}
                onClick={() => handleCategoryClick(cat.q)}
                className={`h-32 bg-gradient-to-br ${cat.gradient} p-4 rounded-xl text-left cursor-pointer transition-all duration-300 hover:scale-[1.03] active:scale-[0.98] shadow-lg relative overflow-hidden group border border-white/5 hover:border-white/10`}
              >
                <span className="font-display font-semibold text-[15px] text-paper inline-block max-w-[12ch] relative z-10 leading-tight">
                  {cat.name}
                </span>
                <span className="absolute -bottom-4 -right-4 text-paper/10 group-hover:text-paper/20 group-hover:scale-110 transition-all duration-300">
                  <Music size={80} />
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Loading Skeleton */}
      {loading && (
        <div className="space-y-4 animate-pulse">
          <div className="flex gap-4 border-b border-rule pb-2">
            <div className="h-6 w-16 bg-paper-2 rounded" />
            <div className="h-6 w-16 bg-paper-2 rounded" />
            <div className="h-6 w-16 bg-paper-2 rounded" />
          </div>
          <div className="space-y-2 pt-4">
            <div className="h-10 bg-paper-2 rounded w-full" />
            <div className="h-10 bg-paper-2 rounded w-full" />
            <div className="h-10 bg-paper-2 rounded w-full" />
          </div>
        </div>
      )}

      {/* Results View */}
      {results && !loading && (
        <div className="space-y-6">
          {/* Tabs Navigation */}
          <div className="flex border-b border-rule/50">
            {(['tracks', 'artists', 'albums'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-5 py-2.5 text-[13px] font-semibold tracking-wide border-b-2 capitalize transition-all cursor-pointer ${
                  activeTab === tab
                    ? 'border-accent text-accent'
                    : 'border-transparent text-neutral hover:text-ink'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Tab Content: Tracks */}
          {activeTab === 'tracks' && (
            <div className="space-y-2">
              {results.tracks.length > 0 ? (
                <div className="border border-rule/30 rounded-lg overflow-hidden bg-paper-2/15">
                  {/* Table Header */}
                  <div className="grid grid-cols-[auto_1fr_1fr_auto] gap-4 px-5 py-2.5 border-b border-rule/30 text-[10.5px] font-mono text-neutral uppercase">
                    <div className="w-8 text-center">#</div>
                    <div>Title</div>
                    <div className="hidden sm:block">Album</div>
                    <div className="pr-4"><Clock size={14} className="mx-auto" /></div>
                  </div>

                  {/* Tracks List */}
                  <div className="divide-y divide-rule/20">
                    {results.tracks.map((track, idx) => {
                      const liked = likedTrackIds.includes(track.id);
                      return (
                        <div
                          key={track.id}
                          onClick={() => playTrack(track)}
                          className="grid grid-cols-[auto_1fr_1fr_auto] gap-4 px-5 py-3 items-center text-[13px] hover:bg-paper-3/50 group cursor-pointer transition-colors"
                        >
                          {/* Play/Index Button */}
                          <div className="w-8 flex items-center justify-center font-mono text-[11px] text-neutral">
                            <span className="group-hover:hidden">{idx + 1}</span>
                            <span className="hidden group-hover:block text-accent">
                              <Play size={12} fill="currentColor" />
                            </span>
                          </div>

                          {/* Cover & Meta */}
                          <div className="flex items-center gap-3 min-w-0">
                            <img
                              src={track.album.images[2]?.url || track.album.images[0]?.url}
                              alt={track.name}
                              className="w-9 h-9 object-cover rounded-md border border-rule"
                            />
                            <div className="min-w-0">
                              <h4 className="font-semibold text-ink truncate group-hover:text-accent transition-colors">
                                {track.name}
                              </h4>
                              <p className="text-[11px] text-neutral truncate mt-0.5">
                                {track.artists.map((a: any) => a.name).join(', ')}
                              </p>
                            </div>
                          </div>

                          {/* Album name */}
                          <div className="hidden sm:block text-neutral truncate pr-2">
                            {track.album.name}
                          </div>

                          {/* Time & Heart */}
                          <div className="flex items-center gap-4 pr-2 text-[11px] font-mono text-neutral">
                            <button
                              onClick={(e) => handleLikeToggle(e, track)}
                              className={`cursor-pointer transition-colors ${
                                liked ? 'text-accent' : 'text-neutral hover:text-ink opacity-0 group-hover:opacity-100'
                              }`}
                            >
                              <Heart size={14} fill={liked ? 'currentColor' : 'none'} />
                            </button>
                            <span>{formatDuration(track.duration_ms)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <EmptyState query={searchQuery} />
              )}
            </div>
          )}

          {/* Tab Content: Artists */}
          {activeTab === 'artists' && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
              {results.artists.length > 0 ? (
                results.artists.map((artist) => (
                  <div
                    key={artist.id}
                    className="bg-paper-2/20 border border-rule/50 rounded-xl p-4 flex flex-col items-center text-center gap-3 group transition-all duration-300 hover:shadow-lg hover:border-accent/15"
                  >
                    <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden border border-rule shadow">
                      {artist.images && artist.images[0] ? (
                        <img
                          src={artist.images[0].url}
                          alt={artist.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full bg-paper-3 flex items-center justify-center text-neutral">
                          <Users size={32} />
                        </div>
                      )}
                    </div>
                    <div>
                      <h4 className="text-[13px] font-semibold text-ink truncate max-w-[14ch] group-hover:text-accent transition-colors">
                        {artist.name}
                      </h4>
                      <p className="text-[10px] text-neutral mt-0.5 capitalize">
                        {artist.genres?.[0] || 'Artist'}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <EmptyState query={searchQuery} />
              )}
            </div>
          )}

          {/* Tab Content: Albums */}
          {activeTab === 'albums' && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
              {results.albums.length > 0 ? (
                results.albums.map((album) => (
                  <div
                    key={album.id}
                    className="bg-paper-2/20 border border-rule/50 rounded-xl p-4 flex flex-col gap-3 group transition-all duration-300 hover:shadow-lg hover:border-accent/15"
                  >
                    <div className="relative aspect-square w-full rounded-lg overflow-hidden border border-rule shadow">
                      {album.images && album.images[0] ? (
                        <img
                          src={album.images[0].url}
                          alt={album.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full bg-paper-3 flex items-center justify-center text-neutral">
                          <Disc size={32} />
                        </div>
                      )}
                    </div>
                    <div>
                      <h4 className="text-[13px] font-semibold text-ink truncate group-hover:text-accent transition-colors">
                        {album.name}
                      </h4>
                      <p className="text-[11px] text-neutral truncate mt-0.5">
                        {album.artists?.[0]?.name || 'Album'}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <EmptyState query={searchQuery} />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function EmptyState({ query }: { query: string }) {
  return (
    <div className="text-center py-16 space-y-2 border border-dashed border-rule/50 rounded-xl">
      <p className="text-[14px] text-accent font-semibold">No results found for "{query}"</p>
      <p className="text-[12px] text-neutral">Try checking for typos or searching a different term.</p>
    </div>
  );
}
