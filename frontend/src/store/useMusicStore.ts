import { create } from 'zustand';

export interface TrackObject {
  id: string;
  name: string;
  artists: { name: string }[];
  album: {
    name: string;
    images: { url: string }[];
  };
  duration_ms: number;
  uri: string;
  preview_url?: string | null;
}

export interface PlaybackState {
  volume: number;      // 0 to 1
  progressMs: number;
  shuffle: boolean;
  repeat: 'off' | 'context' | 'track'; // Spotify repeat states
}

interface MusicStore {
  // STATE
  accessToken: string | null;
  currentTrack: TrackObject | null;
  isPlaying: boolean;
  deviceId: string | null;
  playbackState: PlaybackState;
  isPremium: boolean;
  userProfile: {
    spotifyId: string;
    displayName: string;
    email: string;
    profileImage: string;
  } | null;
  likedTrackIds: string[];

  // ACTIONS
  setAccessToken: (token: string | null) => void;
  setCurrentTrack: (track: TrackObject | null) => void;
  setIsPlaying: (isPlaying: boolean) => void;
  togglePlayPause: () => void;
  setVolume: (level: number) => void;
  updateProgress: (ms: number) => void;
  setDeviceId: (id: string | null) => void;
  setPlaybackState: (state: Partial<PlaybackState>) => void;
  setIsPremium: (isPremium: boolean) => void;
  setUserProfile: (profile: any) => void;
  setLikedTrackIds: (ids: string[]) => void;
  addLikedTrackId: (id: string) => void;
  removeLikedTrackId: (id: string) => void;
  clearStore: () => void;
}

export const useMusicStore = create<MusicStore>((set) => ({
  // Initial state
  accessToken: null,
  currentTrack: null,
  isPlaying: false,
  deviceId: null,
  isPremium: true,
  userProfile: null,
  likedTrackIds: [],
  playbackState: {
    volume: 0.5,
    progressMs: 0,
    shuffle: false,
    repeat: 'off',
  },

  // Actions
  setAccessToken: (token) => set({ accessToken: token }),
  
  setCurrentTrack: (track) => set({ currentTrack: track }),
  
  setIsPlaying: (isPlaying) => set({ isPlaying }),
  
  togglePlayPause: () => set((state) => ({ isPlaying: !state.isPlaying })),
  
  setVolume: (level) => set((state) => ({
    playbackState: { ...state.playbackState, volume: Math.max(0, Math.min(1, level)) }
  })),
  
  updateProgress: (ms) => set((state) => ({
    playbackState: { ...state.playbackState, progressMs: ms }
  })),
  
  setDeviceId: (id) => set({ deviceId: id }),
  
  setPlaybackState: (state) => set((prev) => ({
    playbackState: { ...prev.playbackState, ...state }
  })),
  
  setIsPremium: (isPremium) => set({ isPremium }),

  setUserProfile: (profile) => set({ userProfile: profile }),

  setLikedTrackIds: (ids) => set({ likedTrackIds: ids }),

  addLikedTrackId: (id) => set((state) => ({ likedTrackIds: [...state.likedTrackIds, id] })),

  removeLikedTrackId: (id) => set((state) => ({ likedTrackIds: state.likedTrackIds.filter(x => x !== id) })),
  
  clearStore: () => set({
    accessToken: null,
    currentTrack: null,
    isPlaying: false,
    deviceId: null,
    isPremium: true,
    userProfile: null,
    likedTrackIds: [],
    playbackState: {
      volume: 0.5,
      progressMs: 0,
      shuffle: false,
      repeat: 'off',
    },
  }),
}));
