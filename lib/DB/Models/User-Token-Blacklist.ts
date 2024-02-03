import mongoose from 'mongoose';
import type { Document, Model } from 'mongoose';

export interface IUserTokenBlacklist extends Document {
  token: string
}

const UserTokenBlacklistSchema: mongoose.Schema  = new mongoose.Schema({
  token: {
    type: String,
    required: true,
    unique: true,
    index: true,
  }
},{
  collection: 'UserTokenBlackList',
  timestamps: true,
  id: true,
});

const UserTokenBlacklistModel: Model<IUserTokenBlacklist> = mongoose.model<IUserTokenBlacklist>('UserTokenBlacklist', UserTokenBlacklistSchema);

export default UserTokenBlacklistModel;