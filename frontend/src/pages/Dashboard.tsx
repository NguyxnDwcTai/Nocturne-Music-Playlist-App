import { useEffect, useState } from 'react';
import { useMusicStore } from '../store/useMusicStore';
import { useSpotifyPlayer } from '../hooks/useSpotifyPlayer';
import axiosInstance from '../lib/axios';
import { Play, Music, Radio, Disc } from 'lucide-react';

interface FeaturedPlaylist {
  id: string;
  name: string;
  description: string;
  image: string;
  tracksUrl: string;
}

export default function Dashboard() {
  const { userProfile } = useMusicStore();
  const { playTrack } = useSpotifyPlayer();
  const [greeting, setGreeting] = useState('Welcome');
  const [featuredPlaylists, setFeaturedPlaylists] = useState<FeaturedPlaylist[]>([]);
  const [recentTracks, setRecentTracks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Sync greeting depending on current time of day
  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good morning');
    else if (hour < 18) setGreeting('Good afternoon');
    else setGreeting('Good evening');
  }, []);

  // Fetch Dashboard items from Spotify
  useEffect(() => {
    async function fetchDashboardData() {
      try {
        setLoading(true);
        // Fetch recently played tracks
        const recentsResponse = await axiosInstance.get('/api/spotify/me/player/recently-played?limit=6');
        const tracks = recentsResponse.data.items?.map((item: any) => item.track) || [];
        setRecentTracks(tracks);
      } catch (err) {
        console.warn('Could not fetch recently played tracks from Spotify, using fallback mock.', err);
        // Fallback mock recently played tracks if Spotify endpoint is unavailable
        setRecentTracks([
          {
            id: '4PTG3Z6ehGkBF3zI7Y1JRh',
            name: 'Stardust Drive',
            artists: [{ name: 'Vapor Dreamer' }],
            album: {
              name: 'Nocturne Valley',
              images: [{ url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=60' }]
            },
            duration_ms: 180000,
            uri: 'spotify:track:4PTG3Z6ehGkBF3zI7Y1JRh',
            preview_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3'
          },
          {
            id: '6U4Vsk1wLg8160QW1Y523R',
            name: 'Nebula Drifter',
            artists: [{ name: 'Modular Ghost' }],
            album: {
              name: 'Event Horizon',
              images: [{ url: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=150&auto=format&fit=crop&q=60' }]
            },
            duration_ms: 200000,
            uri: 'spotify:track:6U4Vsk1wLg8160QW1Y523R',
            preview_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3'
          },
          {
            id: '1XjF5J7oVb348uW1Y3923E',
            name: 'Coffee & Syntax',
            artists: [{ name: 'Lo-Fi Compiler' }],
            album: {
              name: 'Warm Keyboards',
              images: [{ url: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=150&auto=format&fit=crop&q=60' }]
            },
            duration_ms: 150000,
            uri: 'spotify:track:1XjF5J7oVb348uW1Y3923E',
            preview_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3'
          }
        ]);
      }

      try {
        // Fetch user's own playlists instead of featured-playlists (which Spotify deprecated for new apps in Nov 2024)
        const playlistsRes = await axiosInstance.get('/api/spotify/me/playlists?limit=5');
        const playlists = playlistsRes.data.items?.map((item: any) => ({
          id: item.id,
          name: item.name,
          description: item.description || 'Your Playlist',
          image: item.images?.[0]?.url,
          tracksUrl: item.tracks?.href,
        })) || [];
        setFeaturedPlaylists(playlists);
      } catch (err) {
        console.warn('Could not fetch user playlists, using fallback mock.', err);
        setFeaturedPlaylists([
          {
            id: 'chill-vibe',
            name: 'Late Night Coding',
            description: 'Ambient lofi and soft beats to keep you focused during night runs.',
            image: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=300&auto=format&fit=crop&q=60',
            tracksUrl: ''
          },
          {
            id: 'synthwave-vibe',
            name: 'Retro Synth Wave',
            description: 'Neon synthesizers and heavy bass rhythms for retro space drives.',
            image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=300&auto=format&fit=crop&q=60',
            tracksUrl: ''
          },
          {
            id: 'ambient-vibe',
            name: 'Deep Cyber Ambient',
            description: 'Spanning event horizons with modular synthesizer soundscapes.',
            image: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=300&auto=format&fit=crop&q=60',
            tracksUrl: ''
          }
        ]);
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="h-8 w-64 bg-paper-2 rounded" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="h-20 bg-paper-2 rounded" />
          <div className="h-20 bg-paper-2 rounded" />
          <div className="h-20 bg-paper-2 rounded" />
        </div>
        <div className="h-6 w-32 bg-paper-2 rounded mt-8" />
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
          <div className="h-48 bg-paper-2 rounded" />
          <div className="h-48 bg-paper-2 rounded" />
          <div className="h-48 bg-paper-2 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10 pb-12 select-none animate-in fade-in duration-300">
      {/* Greeting & Subtitle */}
      <div>
        <h1 className="font-display font-bold text-3xl tracking-tight text-ink flex items-center gap-2">
          {greeting}, {userProfile?.displayName || 'Listener'}
        </h1>
        <p className="text-[13px] text-neutral mt-1">
          Welcome to your nocturnal command center. Ready to curate?
        </p>
      </div>

      {/* Grid: Recently Played (Quick list) */}
      {recentTracks.length > 0 && (
        <section className="space-y-4">
          <h2 className="font-display font-semibold text-lg text-ink">Recently Cured Tracks</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentTracks.map((track) => (
              <div
                key={track.id}
                onClick={() => playTrack(track)}
                className="bg-paper-2/40 hover:bg-paper-3/70 border border-rule/50 rounded-lg p-3 flex items-center gap-4 cursor-pointer transition-all duration-300 group hover:shadow-md hover:border-accent/20"
              >
                <div className="relative w-12 h-12 shrink-0">
                  <img
                    src={track.album.images[0]?.url}
                    alt={track.name}
                    className="w-full h-full object-cover rounded-md border border-rule group-hover:opacity-75 transition-opacity"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-md opacity-0 group-hover:opacity-100 transition-opacity">
                    <Play size={16} fill="white" className="text-white" />
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-[13px] font-semibold text-ink truncate group-hover:text-accent transition-colors">
                    {track.name}
                  </h3>
                  <p className="text-[11px] text-neutral truncate mt-0.5">
                    {track.artists.map((a: any) => a.name).join(', ')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Grid: Featured Categories / Playlists */}
      {featuredPlaylists.length > 0 && (
        <section className="space-y-4">
          <h2 className="font-display font-semibold text-lg text-ink">Your Midnight Playlists</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {featuredPlaylists.map((playlist) => (
              <div
                key={playlist.id}
                className="bg-paper-2/20 hover:bg-paper-3/40 border border-rule/50 rounded-xl p-4 flex flex-col gap-4 cursor-pointer transition-all duration-300 hover:shadow-xl group hover:border-accent/15"
              >
                <div className="relative aspect-square w-full">
                  {playlist.image ? (
                    <img
                      src={playlist.image}
                      alt={playlist.name}
                      className="w-full h-full object-cover rounded-lg border border-rule shadow"
                    />
                  ) : (
                    <div className="w-full h-full bg-paper-3 rounded-lg border border-rule flex items-center justify-center">
                      <Music size={32} className="text-neutral" />
                    </div>
                  )}
                  <button className="absolute bottom-3 right-3 w-10 h-10 rounded-full bg-accent text-paper flex items-center justify-center shadow-lg opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
                    <Play size={18} fill="currentColor" className="ml-0.5" />
                  </button>
                </div>
                <div className="space-y-1">
                  <h3 className="text-[13px] font-semibold text-ink truncate group-hover:text-accent transition-colors">
                    {playlist.name}
                  </h3>
                  <p className="text-[11px] text-neutral line-clamp-2 leading-relaxed h-8">
                    {playlist.description || 'Spotify Featured Playlist'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Core Vibe Utilities */}
      <section className="space-y-4">
        <h2 className="font-display font-semibold text-lg text-ink font-semibold">Curation Stations</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="p-5 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-rule rounded-xl flex items-start gap-4">
            <Radio className="text-indigo-400 mt-1 shrink-0" size={20} />
            <div>
              <h3 className="text-[13.5px] font-semibold text-ink">Personal Curation</h3>
              <p className="text-[11.5px] text-neutral leading-relaxed mt-1">
                Synchronize your liked songs and playlists instantly. We curate files via Spotify metadata to give you full visual workbench color styling.
              </p>
            </div>
          </div>
          <div className="p-5 bg-gradient-to-br from-purple-500/10 to-rose-500/10 border border-rule rounded-xl flex items-start gap-4">
            <Disc className="text-purple-400 mt-1 shrink-0" size={20} />
            <div>
              <h3 className="text-[13.5px] font-semibold text-ink">Vibe Controller</h3>
              <p className="text-[11.5px] text-neutral leading-relaxed mt-1">
                Customize playlists and toggle track features on the fly. Full 30s previews are enabled for Free accounts.
              </p>
            </div>
          </div>
          <div className="p-5 bg-gradient-to-br from-rose-500/10 to-amber-500/10 border border-rule rounded-xl flex items-start gap-4">
            <Music className="text-rose-400 mt-1 shrink-0" size={20} />
            <div>
              <h3 className="text-[13.5px] font-semibold text-ink">Nocturne SDK Device</h3>
              <p className="text-[11.5px] text-neutral leading-relaxed mt-1">
                Your browser is initialized as a web device. Select this device in Spotify settings to play full hifi audio stream dynamically.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
