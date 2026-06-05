import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  spotifyId: {
    type: String,
    unique: true,
    required: true,
  },
  displayName: {
    type: String,
    default: '',
  },
  email: {
    type: String,
    default: '',
  },
  profileImage: {
    type: String,
    default: '',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const User = mongoose.model('User', UserSchema);
export default User;
