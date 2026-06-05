import express from 'express';
import axios from 'axios';
import querystring from 'querystring';
import User from '../models/User.js';
import { authMiddleware, fetchSpotifyUser } from '../middleware/authMiddleware.js';

const router = express.Router();

// Retrieve env vars
const getSpotifyCreds = () => {
  return {
    clientId: process.env.SPOTIFY_CLIENT_ID,
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
    redirectUri: process.env.SPOTIFY_REDIRECT_URI,
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  };
};

// GET /api/auth/login
router.get('/login', (req, res) => {
  const { clientId, redirectUri } = getSpotifyCreds();
  
  const scopes = [
    'user-read-email',
    'user-read-private'
  ];

  // We construct the query parameters manually to ensure spaces are encoded as %20 instead of +
  // as Spotify's authorize endpoint has been known to return server_error on '+' encoded scopes.
  // We also provide a non-empty state parameter as recommended by Spotify to prevent CSRF and session issues.
  const state = Math.random().toString(36).substring(2, 15);
  res.cookie('spotify_auth_state', state, { 
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax'
  });

  const queryParams = [
    `response_type=code`,
    `client_id=${encodeURIComponent(clientId)}`,
    `scope=${encodeURIComponent(scopes.join(' '))}`,
    `redirect_uri=${encodeURIComponent(redirectUri)}`,
    `state=${encodeURIComponent(state)}`,
    `show_dialog=true`
  ].join('&');

  const spotifyAuthUrl = `https://accounts.spotify.com/authorize?${queryParams}`;
  console.log('[auth] Redirecting user to Spotify:', spotifyAuthUrl);

  res.redirect(spotifyAuthUrl);
});

// GET /api/auth/callback
router.get('/callback', async (req, res) => {
  const code = req.query.code || null;
  const { clientId, clientSecret, redirectUri, frontendUrl } = getSpotifyCreds();

  console.log('Spotify Callback Hit! Query params:', req.query);

  if (req.query.error) {
    console.error('Spotify auth error:', req.query.error);
    return res.redirect(`${frontendUrl}/?error=${req.query.error}`);
  }

  if (!code) {
    console.error('Missing code in query parameters. Auth failed.');
    return res.redirect(`${frontendUrl}/?error=auth_missing_code`);
  }

  try {
    // Exchange auth code for access token + refresh token
    const tokenResponse = await axios.post(
      'https://accounts.spotify.com/api/token',
      querystring.stringify({
        code: code,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: 'Basic ' + Buffer.from(clientId + ':' + clientSecret).toString('base64'),
        },
      }
    );

    const { access_token, refresh_token, expires_in } = tokenResponse.data;

    // Fetch user profile from Spotify
    const spotifyUser = await fetchSpotifyUser(access_token);
    const spotifyId = spotifyUser.id;
    const displayName = spotifyUser.display_name || '';
    const email = spotifyUser.email || '';
    const profileImage = spotifyUser.images && spotifyUser.images.length > 0 ? spotifyUser.images[0].url : '';

    // Save or update user in MongoDB
    let user = await User.findOne({ spotifyId });
    if (!user) {
      user = new User({
        spotifyId,
        displayName,
        email,
        profileImage,
      });
      await user.save();
    } else {
      user.displayName = displayName;
      user.email = email;
      user.profileImage = profileImage;
      await user.save();
    }

    // Set HTTP-only cookies
    res.cookie('accessToken', access_token, {
      httpOnly: true,
      maxAge: 60 * 60 * 1000, // 1 hour
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });

    if (refresh_token) {
      res.cookie('refreshToken', refresh_token, {
        httpOnly: true,
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
      });
    }

    // Redirect to frontend dashboard
    res.redirect(`${frontendUrl}/dashboard`);
  } catch (error) {
    console.error('Error during Spotify Auth Callback:', error.response?.data || error.message);
    res.redirect(`${frontendUrl}/?error=auth_error`);
  }
});

// GET /api/auth/refresh
router.get('/refresh', async (req, res) => {
  const refreshToken = req.cookies.refreshToken;
  const { clientId, clientSecret } = getSpotifyCreds();

  if (!refreshToken) {
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');
    return res.status(401).json({ error: 'session_expired' });
  }

  try {
    const tokenResponse = await axios.post(
      'https://accounts.spotify.com/api/token',
      querystring.stringify({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: 'Basic ' + Buffer.from(clientId + ':' + clientSecret).toString('base64'),
        },
      }
    );

    const { access_token, refresh_token } = tokenResponse.data;

    // Issue new accessToken cookie
    res.cookie('accessToken', access_token, {
      httpOnly: true,
      maxAge: 60 * 60 * 1000, // 1 hour
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });

    // If a new refresh token is returned, update the cookie
    if (refresh_token) {
      res.cookie('refreshToken', refresh_token, {
        httpOnly: true,
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
      });
    }

    return res.json({ accessToken: access_token });
  } catch (error) {
    console.error('Error refreshing token:', error.response?.data || error.message);
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');

    // Handle user revoking permission vs standard session expiry
    if (error.response && error.response.data && error.response.data.error === 'invalid_grant') {
      return res.status(401).json({ error: 'access_revoked' });
    }
    return res.status(401).json({ error: 'session_expired' });
  }
});

// GET /api/auth/me
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const spotifyUser = await fetchSpotifyUser(req.accessToken);
    const user = await User.findOne({ spotifyId: spotifyUser.id });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found in database' });
    }

    return res.json({
      user,
      accessToken: req.accessToken
    });
  } catch (error) {
    console.error('Error fetching current user:', error.message);
    if (error.status === 401) {
      res.clearCookie('accessToken');
      res.clearCookie('refreshToken');
      return res.status(401).json({ error: 'session_expired' });
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  res.clearCookie('accessToken');
  res.clearCookie('refreshToken');
  return res.json({ success: true });
});

export default router;
