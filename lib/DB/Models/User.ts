import mongoose from 'mongoose';
import type { Document, Model } from 'mongoose';


export enum GeoJSONType {
  Point = 'Point',
}

export interface Location {
  type: GeoJSONType,
  coordinates: [number, number] // [Longitude, Latitude]
}
export interface IUser extends Document {
  phoneNumber: string,
  email: string,
  firstName: string,
  lastName: string,
  signedUp: boolean,
  isBlocked: boolean,
  refreshToken: string | null,
  lastLocation: Location,
}

const UserSchema: mongoose.Schema = new mongoose.Schema({
  phoneNumber: {
    type: String,
    required: true,
    match: /^\d{3}-\d{3}-\d{4}$/,
    unique: true,
    index: true,
  },

  email: {
    type: String,
  },
  firstName: {
    type: String,
  },
  lastName: {
    type: String,
  },

  signedUp: {
    type: Boolean,
    default: false
  },

  isBlocked: {
    type: Boolean,
    default: false
  },

  refreshToken: {
    type: String
  },

  lastLocation: {
    type: {
      type: String,
      enum: GeoJSONType,
      default: GeoJSONType.Point
    },
    coordinates: {
      type: [Number, Number], // [Longitude, Latitude]
      default: [0, 0] // Default coordinates
    }
  }
}, {
  collection: 'Users',
  timestamps: true,
  id: true,
});

UserSchema.index({ lastLocation: '2dsphere' });
const UserModel: Model<IUser> = mongoose.model<IUser>('User', UserSchema);

export default UserModel;