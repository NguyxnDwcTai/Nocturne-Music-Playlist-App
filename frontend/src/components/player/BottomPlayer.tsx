import { useState } from 'react';
import { 
  Play, Pause, SkipBack, SkipForward, Shuffle, Repeat, Heart, 
  Volume2, VolumeX, ListMusic, Laptop2 
} from 'lucide-react';
import { useMusicStore } from '../../store/useMusicStore';
import { useSpotifyPlayer } from '../../hooks/useSpotifyPlayer';
import axiosInstance from '../../lib/axios';

export default function BottomPlayer() {
  const {
    currentTrack,
    isPlaying,
    isPremium,
    playbackState,
    likedTrackIds,
    addLikedTrackId,
    removeLikedTrackId,
    setPlaybackState,
  } = useMusicStore();

  const {
    togglePlayPause,
    nextTrack,
    prevTrack,
    seek,
    adjustVolume,
  } = useSpotifyPlayer();

  const [isMuted, setIsMuted] = useState(false);
  const [prevVolume, setPrevVolume] = useState(0.5);
  const [isDragging, setIsDragging] = useState(false);
  const [dragProgress, setDragProgress] = useState(0);

  const durationMs = currentTrack?.duration_ms || 30000; // Default to 30s preview duration if not set
  const progressMs = playbackState.progressMs;
  const displayedProgress = isDragging ? dragProgress : progressMs;

  // Sync mute/unmute
  const handleMuteToggle = () => {
    if (isMuted) {
      setIsMuted(false);
      adjustVolume(prevVolume);
    } else {
      setPrevVolume(playbackState.volume);
      setIsMuted(true);
      adjustVolume(0);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const volPercent = parseInt(e.target.value, 10);
    const volFloat = volPercent / 100;
    setIsMuted(volFloat === 0);
    adjustVolume(volFloat);
  };

  const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDragProgress(parseInt(e.target.value, 10));
  };

  const handleProgressStart = () => {
    setIsDragging(true);
    setDragProgress(progressMs);
  };

  const handleProgressEnd = async () => {
    if (isDragging) {
      await seek(dragProgress);
      setIsDragging(false);
    }
  };

  // Sync Favorites (Heart) in MongoDB
  const isLiked = currentTrack ? likedTrackIds.includes(currentTrack.id) : false;

  const handleLikeToggle = async () => {
    if (!currentTrack) return;
    
    const trackId = currentTrack.id;
    const wasLiked = isLiked;
    
    if (wasLiked) {
      removeLikedTrackId(trackId);
    } else {
      addLikedTrackId(trackId);
    }

    try {
      const response = await axiosInstance.post('/api/favorites/toggle', {
        spotifyTrackId: trackId,
        trackName: currentTrack.name,
        artistName: currentTrack.artists.map(a => a.name).join(', '),
        albumCoverUrl: currentTrack.album.images[0]?.url || '',
      });
      
      if (response.data.liked) {
        addLikedTrackId(trackId);
      } else {
        removeLikedTrackId(trackId);
      }
    } catch (err) {
      console.error('Failed to toggle track favorites:', err);
      // Rollback state if api fails
      if (wasLiked) {
        addLikedTrackId(trackId);
      } else {
        removeLikedTrackId(trackId);
      }
    }
  };

  // Toggle Shuffle
  const handleShuffleToggle = async () => {
    if (!isPremium) return;
    const newShuffle = !playbackState.shuffle;
    setPlaybackState({ shuffle: newShuffle });
    try {
      await axiosInstance.put(`/api/spotify/me/player/shuffle?state=${newShuffle}`);
    } catch (err) {
      console.error('Failed to toggle shuffle:', err);
      setPlaybackState({ shuffle: !newShuffle });
    }
  };

  // Toggle Repeat
  const handleRepeatToggle = async () => {
    if (!isPremium) return;
    const states: ('off' | 'context' | 'track')[] = ['off', 'context', 'track'];
    const nextIdx = (states.indexOf(playbackState.repeat) + 1) % states.length;
    const newRepeat = states[nextIdx];
    
    setPlaybackState({ repeat: newRepeat });
    try {
      await axiosInstance.put(`/api/spotify/me/player/repeat?state=${newRepeat}`);
    } catch (err) {
      console.error('Failed to toggle repeat:', err);
      setPlaybackState({ repeat: playbackState.repeat });
    }
  };

  // Formatter helpers
  const formatTime = (ms: number) => {
    const seconds = Math.floor((ms / 1000) % 60);
    const minutes = Math.floor((ms / (1000 * 60)) % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  if (!currentTrack) {
    return (
      <div className="h-20 bg-paper-2 border-t border-rule px-8 flex items-center justify-center text-[13px] text-neutral font-mono">
        Select a track to start listening.
      </div>
    );
  }

  return (
    <div className="h-20 bg-paper-2 border-t border-rule px-8 flex items-center justify-between select-none relative z-20">
      {/* LEFT: Track Details */}
      <div className="flex items-center gap-4 w-1/4 min-w-[180px]">
        {currentTrack.album.images[0]?.url ? (
          <img 
            src={currentTrack.album.images[0].url} 
            alt={currentTrack.name} 
            className="w-10 h-10 object-cover rounded-md border border-rule shadow"
          />
        ) : (
          <div className="w-10 h-10 bg-paper-3 rounded-md border border-rule" />
        )}
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-semibold text-ink truncate hover:underline cursor-pointer">
            {currentTrack.name}
          </div>
          <div className="text-[11px] text-neutral truncate hover:underline cursor-pointer">
            {currentTrack.artists.map(a => a.name).join(', ')}
          </div>
        </div>
        <button 
          onClick={handleLikeToggle}
          className={`cursor-pointer transition-colors ${
            isLiked ? 'text-accent' : 'text-neutral hover:text-ink'
          }`}
        >
          <Heart size={16} fill={isLiked ? 'currentColor' : 'none'} />
        </button>
      </div>

      {/* CENTER: Playback Controls */}
      <div className="flex flex-col items-center gap-1.5 w-2/5 max-w-[600px]">
        {/* Buttons */}
        <div className="flex items-center gap-5">
          <button 
            disabled={!isPremium}
            onClick={handleShuffleToggle}
            className={`cursor-pointer transition-colors disabled:opacity-35 disabled:cursor-not-allowed ${
              playbackState.shuffle ? 'text-accent' : 'text-neutral hover:text-ink'
            }`}
            title={!isPremium ? "Shuffle is premium only" : "Shuffle"}
          >
            <Shuffle size={15} />
          </button>
          
          <button 
            onClick={prevTrack}
            className="cursor-pointer text-neutral hover:text-ink transition-colors"
          >
            <SkipBack size={18} fill="currentColor" />
          </button>
          
          <button 
            onClick={togglePlayPause}
            className="w-8 h-8 rounded-full bg-ink text-paper flex items-center justify-center cursor-pointer transition-transform duration-200 transform hover:scale-105 active:scale-95 shadow"
          >
            {isPlaying ? (
              <Pause size={15} fill="currentColor" className="ml-[0px]" />
            ) : (
              <Play size={15} fill="currentColor" className="ml-[2px]" />
            )}
          </button>
          
          <button 
            onClick={nextTrack}
            className="cursor-pointer text-neutral hover:text-ink transition-colors"
          >
            <SkipForward size={18} fill="currentColor" />
          </button>
          
          <button 
            disabled={!isPremium}
            onClick={handleRepeatToggle}
            className={`cursor-pointer transition-colors disabled:opacity-35 disabled:cursor-not-allowed relative ${
              playbackState.repeat !== 'off' ? 'text-accent' : 'text-neutral hover:text-ink'
            }`}
            title={!isPremium ? "Repeat is premium only" : `Repeat: ${playbackState.repeat}`}
          >
            <Repeat size={15} />
            {playbackState.repeat === 'track' && (
              <span className="absolute -top-1 -right-1 text-[7px] font-bold bg-accent text-paper rounded-full w-2.5 h-2.5 flex items-center justify-center scale-90">1</span>
            )}
          </button>
        </div>

        {/* Progress Bar */}
        <div className="w-full flex items-center gap-2.5 text-[10.5px] font-mono text-neutral">
          <span>{formatTime(displayedProgress)}</span>
          <input 
            type="range" 
            min="0"
            max={durationMs}
            value={displayedProgress}
            onChange={handleProgressChange}
            onMouseDown={handleProgressStart}
            onTouchStart={handleProgressStart}
            onMouseUp={handleProgressEnd}
            onTouchEnd={handleProgressEnd}
            className="w-full h-1 bg-rule rounded-lg appearance-none cursor-pointer accent-accent"
          />
          <span>{formatTime(durationMs)}</span>
        </div>
      </div>

      {/* RIGHT: Volume & Info */}
      <div className="flex items-center justify-end gap-3 w-1/4 min-w-[150px]">
        <button className="text-neutral hover:text-ink transition-colors cursor-pointer">
          <ListMusic size={16} />
        </button>
        <button className="text-neutral hover:text-ink transition-colors cursor-pointer">
          <Laptop2 size={16} />
        </button>
        
        {/* Volume controls */}
        <div className="flex items-center gap-1.5 ml-2 border-l border-rule pl-3">
          <button 
            onClick={handleMuteToggle}
            className="text-neutral hover:text-ink transition-colors cursor-pointer"
          >
            {isMuted || playbackState.volume === 0 ? (
              <VolumeX size={16} />
            ) : (
              <Volume2 size={16} />
            )}
          </button>
          <input 
            type="range"
            min="0"
            max="100"
            step="1"
            value={isMuted ? 0 : Math.round(playbackState.volume * 100)}
            onChange={handleVolumeChange}
            className="w-16 sm:w-20 h-1 bg-rule rounded-lg appearance-none cursor-pointer accent-accent"
          />
        </div>
      </div>
    </div>
  );
}
