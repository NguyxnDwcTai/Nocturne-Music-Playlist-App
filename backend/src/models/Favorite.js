import mongoose from 'mongoose';

const FavoriteSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  spotifyTrackId: {
    type: String,
    required: true,
  },
  trackName: {
    type: String,
    required: true,
  },
  artistName: {
    type: String,
    required: true,
  },
  albumCoverUrl: {
    type: String,
    default: '',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Compound index to ensure uniqueness per user and track
FavoriteSchema.index({ userId: 1, spotifyTrackId: 1 }, { unique: true });

const Favorite = mongoose.model('Favorite', FavoriteSchema);
export default Favorite;
