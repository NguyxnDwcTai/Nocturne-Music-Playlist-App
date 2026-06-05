import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Import routers
import authRouter from './src/routes/auth.js';
import spotifyRouter from './src/routes/spotify.js';
import favoritesRouter from './src/routes/favorites.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/spotify-app';

// MongoDB Connection (graceful — server continues even without Mongo)
mongoose.connect(MONGODB_URI)
  .then(() => console.log('✅ Successfully connected to MongoDB.'))
  .catch((err) => {
    console.warn('⚠️  MongoDB connection failed:', err.message);
    console.warn('⚠️  Server will continue without database. Auth/favorites features will not work.');
    console.warn('⚠️  To fix: Install MongoDB or update MONGODB_URI in .env');
  });

// CORS Configuration
const allowedOrigins = ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:3000'];
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true,
}));

app.use(express.json());
app.use(cookieParser());

// Mount API routers
app.use('/api/auth', authRouter);
app.use('/api/spotify', spotifyRouter);
app.use('/api/favorites', favoritesRouter);

// ==========================================
// PRESERVE LEGACY NOCTURNE MOCK ROUTES
// ==========================================

const playlists = [
  {
    id: 'after-hours',
    name: 'After Hours',
    description: 'Neon-drenched synthwave and electronic beats for late-night drives.',
    vibe: 'Nocturnal / Energetic',
    accentColor: '#FF5E00', // Neon Orange
    glowColor: 'rgba(255, 94, 0, 0.15)',
    artwork: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=60',
    tracks: [
      {
        id: 'ah-1',
        title: 'Midnight Horizon',
        artist: 'Glitch Horizon',
        album: 'Neon Drive',
        duration: '6:12',
        url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3'
      },
      {
        id: 'ah-2',
        title: 'Stardust Highway',
        artist: 'Vapor Dreamer',
        album: 'Nocturne Valley',
        duration: '7:05',
        url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3'
      },
      {
        id: 'ah-3',
        title: 'Retro Refraction',
        artist: 'Pulse Weaver',
        album: 'Chroma Phase',
        duration: '5:44',
        url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3'
      }
    ]
  },
  {
    id: 'deep-focus',
    name: 'Deep Focus',
    description: 'Muted lo-fi hip hop and chillhop beats to guide your midnight coding sessions.',
    vibe: 'Calm / Productive',
    accentColor: '#8B5CF6', // Purple Accent
    glowColor: 'rgba(139, 92, 246, 0.15)',
    artwork: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=600&auto=format&fit=crop&q=60',
    tracks: [
      {
        id: 'df-1',
        title: 'Coded Silence',
        artist: 'Lo-Fi Compiler',
        album: 'Coffee & Syntax',
        duration: '5:02',
        url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3'
      },
      {
        id: 'df-2',
        title: 'Late Night Coffee',
        artist: 'Binaural Drift',
        album: 'Nocturnal Sessions',
        duration: '6:03',
        url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3'
      },
      {
        id: 'df-3',
        title: 'Warm Keyboards',
        artist: 'Subtle Keystrokes',
        album: 'Static Waves',
        duration: '5:38',
        url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3'
      }
    ]
  },
  {
    id: 'cyber-ambient',
    name: 'Cyber Ambient',
    description: 'Drifting atmospheric textures and sci-fi modular synth soundscapes.',
    vibe: 'Aereal / Immersive',
    accentColor: '#06B6D4', // Cyan Accent
    glowColor: 'rgba(6, 182, 212, 0.15)',
    artwork: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=600&auto=format&fit=crop&q=60',
    tracks: [
      {
        id: 'ca-1',
        title: 'Nebula Drifter',
        artist: 'Modular Ghost',
        album: 'Event Horizon',
        duration: '7:35',
        url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3'
      },
      {
        id: 'ca-2',
        title: 'Digital Rain',
        artist: 'Aether Pilot',
        album: 'Grid City',
        duration: '6:14',
        url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3'
      },
      {
        id: 'ca-3',
        title: 'Void Frequency',
        artist: 'Oscillator Obscura',
        album: 'Dark Matter',
        duration: '8:02',
        url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-9.mp3'
      }
    ]
  }
];

const stats = {
  activeCurators: 1204,
  totalPlaytimeHours: 45281,
  tracksSynchronized: 89204
};

app.get('/api/playlists', (req, res) => {
  res.json(playlists);
});

app.get('/api/stats', (req, res) => {
  res.json(stats);
});

app.post('/api/subscribe', (req, res) => {
  const { email } = req.body;

  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Please enter a valid email address.' });
  }

  // Simulate network delay of 1 second to showcase loading states on frontend
  setTimeout(() => {
    // Random error simulation (1 in 10 chance) to test error UI
    if (Math.random() < 0.1) {
      return res.status(500).json({ error: 'Database timeout. Please try again.' });
    }

    res.json({ success: true, message: 'Welcome to the inner circle. Your invite is queuing.' });
  }, 1000);
});

// Start listening
app.listen(PORT, () => {
  console.log(`Nocturne API Server running on port ${PORT}`);
});

