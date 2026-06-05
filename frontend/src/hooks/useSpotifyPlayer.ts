import { useEffect, useRef } from 'react';
import { useMusicStore, TrackObject } from '../store/useMusicStore';
import axiosInstance from '../lib/axios';

// Declare global Spotify type for TS compile
declare global {
  interface Window {
    onSpotifyWebPlaybackSDKReady: () => void;
    Spotify: any;
  }
}

// Singleton HTMLAudioElement for free accounts
const audioFallback = new Audio();

export function useSpotifyPlayer() {
  const {
    accessToken,
    deviceId,
    isPlaying,
    isPremium,
    currentTrack,
    playbackState,
    setDeviceId,
    setCurrentTrack,
    setIsPlaying,
    setPlaybackState,
    setIsPremium,
    setVolume,
  } = useMusicStore();

  const playerRef = useRef<any>(null);
  const progressIntervalRef = useRef<any>(null);

  // Sync volume of the fallback audio element
  useEffect(() => {
    audioFallback.volume = playbackState.volume;
  }, [playbackState.volume]);

  // Inject SDK script
  useEffect(() => {
    if (!accessToken) return;

    // Only inject once
    if (document.getElementById('spotify-player-sdk')) {
      if (window.Spotify && !playerRef.current) {
        initializePlayer();
      }
      return;
    }

    const script = document.createElement('script');
    script.id = 'spotify-player-sdk';
    script.src = 'https://sdk.scdn.co/spotify-player.js';
    script.async = true;
    document.body.appendChild(script);

    window.onSpotifyWebPlaybackSDKReady = () => {
      initializePlayer();
    };

    return () => {
      // Clean up intervals on unmount
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, [accessToken]);

  const initializePlayer = () => {
    if (!accessToken) return;

    const player = new window.Spotify.Player({
      name: 'Nocturne Web Player',
      getOAuthToken: (cb: (token: string) => void) => cb(accessToken),
      volume: playbackState.volume,
    });

    playerRef.current = player;

    // Error handling
    player.addListener('initialization_error', ({ message }: { message: string }) => {
      console.error('Initialization error:', message);
    });

    player.addListener('authentication_error', ({ message }: { message: string }) => {
      console.error('Authentication error:', message);
    });

    player.addListener('account_error', ({ message }: { message: string }) => {
      console.error('Account error:', message);
    });

    player.addListener('playback_error', ({ message }: { message: string }) => {
      console.error('Playback error:', message);
    });

    // Premium Check - handles PREMIUM_REQUIRED
    player.addListener('account_error', (error: any) => {
      if (error.message && error.message.includes('PREMIUM_REQUIRED')) {
        console.warn('Spotify Premium is required for Web Playback SDK. Falling back.');
        setIsPremium(false);
      }
    });

    // Ready
    player.addListener('ready', async ({ device_id }: { device_id: string }) => {
      console.log('Spotify Player Ready with Device ID:', device_id);
      setDeviceId(device_id);
      setIsPremium(true);

      // Transfer playback to Nocturne player
      try {
        await axiosInstance.put('/api/spotify/me/player', {
          device_ids: [device_id],
          play: false, // Don't auto play
        });
      } catch (err) {
        console.error('Failed to transfer playback to device:', err);
      }
    });

    // Not Ready
    player.addListener('not_ready', ({ device_id }: { device_id: string }) => {
      console.warn('Device ID has gone offline:', device_id);
      setDeviceId(null);
    });

    // Player State Changed
    player.addListener('player_state_changed', (state: any) => {
      if (!state) return;

      const track = state.track_window.current_track;
      if (track) {
        const formattedTrack: TrackObject = {
          id: track.id,
          name: track.name,
          artists: track.artists,
          album: {
            name: track.album.name,
            images: track.album.images,
          },
          duration_ms: state.duration,
          uri: track.uri,
        };
        setCurrentTrack(formattedTrack);
      }

      setIsPlaying(!state.paused);
      setPlaybackState({
        progressMs: state.position,
        shuffle: state.shuffle,
        repeat: state.repeat_mode === 0 ? 'off' : state.repeat_mode === 1 ? 'context' : 'track',
      });
    });

    // Connect player
    player.connect().then((success: boolean) => {
      if (success) {
        console.log('Successfully connected to Spotify Web Playback SDK');
      }
    });
  };

  // Track progress updating for either SDK or preview audio
  useEffect(() => {
    if (isPlaying) {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);

      progressIntervalRef.current = setInterval(() => {
        if (!isPremium) {
          // Sync with HTML5 audio
          const progressMs = Math.floor(audioFallback.currentTime * 1000);
          setPlaybackState({ progressMs });
        } else if (playerRef.current) {
          // Increment progress locally (Spotify SDK only updates state occasionally)
          setPlaybackState({ progressMs: playbackState.progressMs + 500 });
        }
      }, 500);
    } else {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    }

    return () => {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, [isPlaying, isPremium, playbackState.progressMs]);

  // Audio Fallback end event listener
  useEffect(() => {
    const handleEnded = () => {
      setIsPlaying(false);
      setPlaybackState({ progressMs: 0 });
    };

    audioFallback.addEventListener('ended', handleEnded);
    return () => audioFallback.removeEventListener('ended', handleEnded);
  }, []);

  // Controls Actions
  const playTrack = async (track: TrackObject) => {
    if (!isPremium) {
      // Free Account Fallback
      if (track.preview_url) {
        if (currentTrack?.id === track.id) {
          togglePlayPause();
          return;
        }

        audioFallback.src = track.preview_url;
        audioFallback.play().then(() => {
          setCurrentTrack(track);
          setIsPlaying(true);
          setPlaybackState({ progressMs: 0 });
        }).catch(err => {
          console.error('Audio preview play failed:', err);
        });
      } else {
        alert('Spotify Premium is required to play this track. No preview is available.');
      }
      return;
    }

    // Premium Account
    if (!deviceId) {
      console.warn('No active player device found.');
      return;
    }

    try {
      await axiosInstance.put(`/api/spotify/me/player/play?device_id=${deviceId}`, {
        uris: [track.uri],
      });
      setCurrentTrack(track);
      setIsPlaying(true);
    } catch (err) {
      console.error('Failed to play track via Spotify SDK:', err);
    }
  };

  const togglePlayPause = async () => {
    if (!isPremium) {
      // Free Account Fallback
      if (!audioFallback.src) return;
      if (isPlaying) {
        audioFallback.pause();
        setIsPlaying(false);
      } else {
        audioFallback.play().then(() => {
          setIsPlaying(true);
        });
      }
      return;
    }

    // Premium Account
    if (!playerRef.current) return;
    try {
      await playerRef.current.togglePlay();
    } catch (err) {
      console.error('Failed to toggle play/pause:', err);
    }
  };

  const nextTrack = async () => {
    if (!isPremium) {
      alert('Skip next is limited on free preview accounts.');
      return;
    }

    if (playerRef.current) {
      try {
        await playerRef.current.nextTrack();
      } catch (err) {
        console.error('Failed to skip to next via SDK:', err);
      }
    } else {
      try {
        await axiosInstance.post('/api/spotify/me/player/next');
      } catch (err) {
        console.error('Failed to skip to next:', err);
      }
    }
  };

  const prevTrack = async () => {
    if (!isPremium) {
      alert('Skip previous is limited on free preview accounts.');
      return;
    }

    if (playerRef.current) {
      try {
        await playerRef.current.previousTrack();
      } catch (err) {
        console.error('Failed to skip to previous via SDK:', err);
      }
    } else {
      try {
        await axiosInstance.post('/api/spotify/me/player/previous');
      } catch (err) {
        console.error('Failed to skip to previous:', err);
      }
    }
  };

  const seek = async (positionMs: number) => {
    if (!isPremium) {
      // Free Account Fallback
      audioFallback.currentTime = positionMs / 1000;
      setPlaybackState({ progressMs: positionMs });
      return;
    }

    if (playerRef.current) {
      try {
        await playerRef.current.seek(positionMs);
        setPlaybackState({ progressMs: positionMs });
      } catch (err) {
        console.error('Failed to seek via SDK:', err);
      }
    } else {
      try {
        await axiosInstance.put(`/api/spotify/me/player/seek?position_ms=${positionMs}`);
        setPlaybackState({ progressMs: positionMs });
      } catch (err) {
        console.error('Failed to seek player:', err);
      }
    }
  };

  const adjustVolume = async (volume: number) => {
    // Volume is a 0-1 scale
    setVolume(volume);

    if (!isPremium) {
      audioFallback.volume = volume;
      return;
    }

    if (playerRef.current) {
      try {
        await playerRef.current.setVolume(volume);
      } catch (err) {
        console.error('Failed to set SDK volume:', err);
      }
    }
  };

  return {
    playTrack,
    togglePlayPause,
    nextTrack,
    prevTrack,
    seek,
    adjustVolume,
  };
}
