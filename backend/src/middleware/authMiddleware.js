import axios from 'axios';
import User from '../models/User.js';

export const authMiddleware = async (req, res, next) => {
  const accessToken = req.cookies.accessToken;

  console.log('[authMiddleware] Request to:', req.originalUrl);
  console.log('[authMiddleware] Cookies:', req.cookies);
  console.log('[authMiddleware] Origin:', req.headers.origin);

  if (!accessToken) {
    return res.status(401).json({ error: 'no_token', cookies: req.cookies });
  }

  req.accessToken = accessToken;
  next();
};

export const fetchSpotifyUser = async (accessToken) => {
  try {
    const response = await axios.get('https://api.spotify.com/v1/me', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    return response.data;
  } catch (error) {
    if (error.response && error.response.status === 401) {
      const err = new Error('Unauthorized');
      err.status = 401;
      throw err;
    }
    throw error;
  }
};
