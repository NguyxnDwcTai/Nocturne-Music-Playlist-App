import express from 'express';
import axios from 'axios';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

// Apply authMiddleware to all proxy routes
router.use(authMiddleware);

// GET /api/spotify/me (Custom merged endpoint as required)
router.get('/me', async (req, res) => {
  try {
    // Fetch Spotify profile
    const profilePromise = axios.get('https://api.spotify.com/v1/me', {
      headers: { Authorization: `Bearer ${req.accessToken}` },
    });

    // Fetch Spotify player state
    const playerPromise = axios.get('https://api.spotify.com/v1/me/player', {
      headers: { Authorization: `Bearer ${req.accessToken}` },
    });

    // Execute concurrently
    const [profileRes, playerRes] = await Promise.all([
      profilePromise,
      playerPromise.catch((err) => {
        console.log('Player endpoint error/no active device:', err.message);
        return { status: 204, data: null };
      }),
    ]);

    const playback = playerRes.status === 204 ? null : playerRes.data;

    return res.json({
      user: profileRes.data,
      playback,
    });
  } catch (error) {
    console.error('Error in /api/spotify/me proxy:', error.response?.data || error.message);
    if (error.response) {
      if (error.response.status === 401) {
        return res.status(401).json({ error: 'session_expired' });
      }
      return res.status(error.response.status).json(error.response.data);
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/spotify/search (Proxy search endpoint)
router.get('/search', async (req, res) => {
  try {
    const response = await axios.get('https://api.spotify.com/v1/search', {
      params: {
        q: req.query.q,
        type: req.query.type || 'track',
        limit: req.query.limit || 20,
      },
      headers: {
        Authorization: `Bearer ${req.accessToken}`,
      },
    });
    return res.status(response.status).json(response.data);
  } catch (error) {
    console.error('Error in /api/spotify/search proxy:', error.response?.data || error.message);
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/spotify/playlists (Proxy current user playlists)
router.get('/playlists', async (req, res) => {
  try {
    const response = await axios.get('https://api.spotify.com/v1/me/playlists', {
      params: req.query,
      headers: {
        Authorization: `Bearer ${req.accessToken}`,
      },
    });
    return res.status(response.status).json(response.data);
  } catch (error) {
    console.error('Error in /api/spotify/playlists proxy:', error.response?.data || error.message);
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/spotify/playlists/:id/tracks (Proxy playlist tracks)
router.get('/playlists/:id/tracks', async (req, res) => {
  try {
    const response = await axios.get(`https://api.spotify.com/v1/playlists/${req.params.id}/tracks`, {
      params: req.query,
      headers: {
        Authorization: `Bearer ${req.accessToken}`,
      },
    });
    return res.status(response.status).json(response.data);
  } catch (error) {
    console.error('Error in /api/spotify/playlists/:id/tracks proxy:', error.response?.data || error.message);
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Wildcard Proxy Route to forward any other Spotify API request
router.all('*', async (req, res) => {
  const spotifyPath = req.path;
  const method = req.method;

  try {
    const response = await axios({
      url: `https://api.spotify.com/v1${spotifyPath}`,
      method: method,
      data: method === 'GET' ? undefined : req.body,
      params: req.query,
      headers: {
        Authorization: `Bearer ${req.accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    return res.status(response.status).json(response.data);
  } catch (error) {
    console.error(`Error proxying ${method} ${spotifyPath}:`, error.response?.data || error.message);
    if (error.response) {
      if (error.response.status === 429) {
        const retryAfter = error.response.headers['retry-after'] || 1;
        res.setHeader('Retry-After', retryAfter);
        return res.status(429).json({ error: 'rate_limited', retryAfter });
      }
      return res.status(error.response.status).json(error.response.data);
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
