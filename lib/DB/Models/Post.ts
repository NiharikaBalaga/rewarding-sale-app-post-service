import mongoose from 'mongoose';
import type { Document, Model } from 'mongoose';
import { PostStatus } from './post-status.enum';

export interface IPost extends Document {
  userId: mongoose.Types.ObjectId,
  status: string,
  isActive: boolean,
  priceTagImageS3Uri: string,
  priceTagImageObjectUrl: string,
  productImageS3Uri: string,
  productImageObjectUrl: string,
  productName: string,
  productDescription: string,
  oldPrice: number,
  newPrice: number,
  oldQuantity: number,
  newQuantity: number,
}

const PostSchema: mongoose.Schema = new mongoose.Schema({
  userId: {
    type: mongoose.Types.ObjectId,
    required: true,
    index: true,
  },

  status: {
    type: String,
    enum: PostStatus,
    default: PostStatus.created,
    index: true
  },

  isActive: {
    type: Boolean,
    default: false, // Only active when we approve , can be made false by decision service
  },

  priceTagImageS3Uri: {
    type: String,
    required: false
  },

  priceTagImageObjectUrl: {
    type: String,
    required: false
  },

  productImageS3Uri: {
    type: String,
    required: false
  },

  productImageObjectUrl: {
    type: String,
    required: false
  },

  productName: {
    type: String,
    required: true // TODO Make is false if we use image processing
  },

  productDescription: {
    type: String,
    required: false // TODO Make is false if we use image processing
  },

  oldPrice: {
    type: Number,
    required: true // TODO Make is false if we use image processing
  },

  newPrice: {
    type: Number,
    required: true // TODO Make is false if we use image processing
  },

  oldQuantity: {
    type: Number,
    required: false // TODO Make is false if we use image processing
  },

  newQuantity: {
    type: Number,
    required: false // TODO Make is false if we use image processing
  },

  // TODO add location fields
}, {
  collection: 'Posts',
  timestamps: true,
  id: true,
});

const PostModel: Model<IPost> = mongoose.model<IPost>('Post', PostSchema);

export default PostModel;