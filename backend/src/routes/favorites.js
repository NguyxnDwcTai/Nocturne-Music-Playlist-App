import express from 'express';
import Favorite from '../models/Favorite.js';
import User from '../models/User.js';
import { authMiddleware, fetchSpotifyUser } from '../middleware/authMiddleware.js';

const router = express.Router();

// Apply authMiddleware to all favorite routes
router.use(authMiddleware);

// Helper to get MongoDB User ID from Spotify Access Token
const getMongoUser = async (accessToken) => {
  const spotifyUser = await fetchSpotifyUser(accessToken);
  const user = await User.findOne({ spotifyId: spotifyUser.id });
  if (!user) {
    const err = new Error('User not found');
    err.status = 404;
    throw err;
  }
  return user;
};

// GET /api/favorites
router.get('/', async (req, res) => {
  try {
    const user = await getMongoUser(req.accessToken);
    const favorites = await Favorite.find({ userId: user._id }).sort({ createdAt: -1 });
    return res.json(favorites);
  } catch (error) {
    console.error('Error fetching favorites:', error.message);
    if (error.status) {
      return res.status(error.status).json({ error: error.message });
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/favorites/toggle
router.post('/toggle', async (req, res) => {
  const { spotifyTrackId, trackName, artistName, albumCoverUrl } = req.body;

  if (!spotifyTrackId || !trackName || !artistName) {
    return res.status(400).json({ error: 'Missing spotifyTrackId, trackName, or artistName' });
  }

  try {
    const user = await getMongoUser(req.accessToken);

    // Check if favorite already exists
    const existingFavorite = await Favorite.findOne({ userId: user._id, spotifyTrackId });
    
    if (existingFavorite) {
      // If yes, remove it
      await Favorite.deleteOne({ _id: existingFavorite._id });
      return res.json({ success: true, liked: false, message: 'Track removed from favorites' });
    } else {
      // If no, save it
      const favorite = new Favorite({
        userId: user._id,
        spotifyTrackId,
        trackName,
        artistName,
        albumCoverUrl,
      });
      await favorite.save();
      return res.status(201).json({ success: true, liked: true, favorite, message: 'Track added to favorites' });
    }
  } catch (error) {
    console.error('Error toggling favorite:', error.message);
    if (error.status) {
      return res.status(error.status).json({ error: error.message });
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/favorites/:spotifyTrackId (for compatibility)
router.delete('/:spotifyTrackId', async (req, res) => {
  const { spotifyTrackId } = req.params;

  try {
    const user = await getMongoUser(req.accessToken);
    const result = await Favorite.findOneAndDelete({ userId: user._id, spotifyTrackId });

    if (!result) {
      return res.status(404).json({ error: 'Favorite not found' });
    }

    return res.json({ success: true, message: 'Track removed from favorites' });
  } catch (error) {
    console.error('Error deleting favorite:', error.message);
    if (error.status) {
      return res.status(error.status).json({ error: error.message });
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
