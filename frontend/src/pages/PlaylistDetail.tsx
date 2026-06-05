import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useSpotifyPlayer } from '../hooks/useSpotifyPlayer';
import { useMusicStore, TrackObject } from '../store/useMusicStore';
import axiosInstance from '../lib/axios';
import { Play, Clock, Music, ArrowLeft, Heart } from 'lucide-react';

interface PlaylistInfo {
  id: string;
  name: string;
  description: string;
  images: { url: string }[];
  tracks: {
    total: number;
  };
}

export default function PlaylistDetail() {
  const { id } = useParams<{ id: string }>();
  const { playTrack } = useSpotifyPlayer();
  const { likedTrackIds, addLikedTrackId, removeLikedTrackId } = useMusicStore();
  const [playlist, setPlaylist] = useState<PlaylistInfo | null>(null);
  const [tracks, setTracks] = useState<TrackObject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    async function fetchPlaylistData() {
      setLoading(true);
      setError(null);
      try {
        // Fetch playlist metadata and tracks concurrently
        const [playlistRes, tracksRes] = await Promise.all([
          axiosInstance.get(`/api/spotify/playlists/${id}`),
          axiosInstance.get(`/api/spotify/playlists/${id}/tracks`),
        ]);

        setPlaylist(playlistRes.data);

        // Format the Spotify tracks list to the TrackObject interface
        const rawTracks = tracksRes.data.items || [];
        const formattedTracks = rawTracks
          .filter((item: any) => item.track !== null) // filter out removed/empty tracks
          .map((item: any) => {
            const t = item.track;
            return {
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
            };
          });

        setTracks(formattedTracks);
      } catch (err: any) {
        console.error('Failed to fetch playlist details:', err);
        setError('Could not load playlist. Please verify your Spotify connection.');
      } finally {
        setLoading(false);
      }
    }

    fetchPlaylistData();
  }, [id]);

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

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse pb-12">
        <div className="flex flex-col sm:flex-row gap-6 items-end">
          <div className="w-40 h-40 bg-paper-2 rounded-lg" />
          <div className="space-y-3 flex-1">
            <div className="h-4 w-24 bg-paper-2 rounded" />
            <div className="h-8 w-48 bg-paper-2 rounded" />
            <div className="h-4 w-32 bg-paper-2 rounded" />
          </div>
        </div>
        <div className="space-y-2 pt-6">
          <div className="h-10 bg-paper-2 rounded w-full" />
          <div className="h-10 bg-paper-2 rounded w-full" />
          <div className="h-10 bg-paper-2 rounded w-full" />
        </div>
      </div>
    );
  }

  if (error || !playlist) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
        <p className="text-[14px] text-accent font-semibold">{error || 'Playlist not found'}</p>
        <button
          onClick={() => window.history.back()}
          className="flex items-center gap-2 px-4 py-2 border border-rule hover:bg-paper-2 rounded-lg text-[13px] font-semibold text-ink cursor-pointer transition-colors"
        >
          <ArrowLeft size={14} />
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 select-none animate-in fade-in duration-300">
      {/* Header Info */}
      <div className="flex flex-col md:flex-row gap-6 items-end border-b border-rule/20 pb-6">
        {playlist.images && playlist.images[0] ? (
          <img
            src={playlist.images[0].url}
            alt={playlist.name}
            className="w-40 h-40 sm:w-48 sm:h-48 object-cover rounded-xl border border-rule shadow-xl"
          />
        ) : (
          <div className="w-40 h-40 sm:w-48 sm:h-48 bg-paper-2 rounded-xl border border-rule flex items-center justify-center text-neutral shadow-xl">
            <Music size={48} />
          </div>
        )}
        <div className="flex-1 space-y-2 text-left">
          <span className="text-[10px] font-bold uppercase tracking-widest text-accent">Playlist</span>
          <h1 className="font-display font-bold text-2xl sm:text-4xl text-ink leading-tight">
            {playlist.name}
          </h1>
          {playlist.description && (
            <p className="text-[12.5px] text-neutral max-w-2xl" dangerouslySetInnerHTML={{ __html: playlist.description }} />
          )}
          <div className="flex items-center gap-2 text-[11px] text-neutral font-mono mt-1">
            <span>Nocturne Curator</span>
            <span>•</span>
            <span>{playlist.tracks.total} tracks</span>
          </div>
        </div>
      </div>

      {/* Tracks Table */}
      <div className="space-y-2">
        {tracks.length > 0 ? (
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
              {tracks.map((track, idx) => {
                const liked = likedTrackIds.includes(track.id);
                return (
                  <div
                    key={`${track.id}-${idx}`}
                    onClick={() => playTrack(track)}
                    className="grid grid-cols-[auto_1fr_1fr_auto] gap-4 px-5 py-3 items-center text-[13px] hover:bg-paper-3/50 group cursor-pointer transition-colors"
                  >
                    {/* Index / Play overlay */}
                    <div className="w-8 flex items-center justify-center font-mono text-[11px] text-neutral">
                      <span className="group-hover:hidden">{idx + 1}</span>
                      <span className="hidden group-hover:block text-accent">
                        <Play size={12} fill="currentColor" />
                      </span>
                    </div>

                    {/* Metadata (Cover & Title/Artist) */}
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={track.album.images[2]?.url || track.album.images[0]?.url || ''}
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

                    {/* Album Name */}
                    <div className="hidden sm:block text-neutral truncate pr-2">
                      {track.album.name}
                    </div>

                    {/* Like & Duration */}
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
          <div className="text-center py-16 space-y-2 border border-dashed border-rule/50 rounded-xl">
            <Music size={28} className="text-neutral mx-auto opacity-45" />
            <p className="text-[14px] text-ink font-semibold">No tracks in this playlist</p>
            <p className="text-[12px] text-neutral">Add some songs to Spotify to display them here.</p>
          </div>
        )}
      </div>
    </div>
  );
}
