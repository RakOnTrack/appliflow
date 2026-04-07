import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  name:               { type: String, required: true },
  email:              { type: String, required: true, unique: true, lowercase: true },
  password:           { type: String, required: true },
  googleId:           { type: String },
  appliFlowFolderId:  { type: String },
  createdAt:          { type: Date, default: Date.now },
  googleAccessToken:  { type: String },
  googleRefreshToken: { type: String },
});

export default mongoose.models.User || mongoose.model('User', UserSchema);
