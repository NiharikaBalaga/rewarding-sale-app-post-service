import mongoose from 'mongoose';
import type { Document, Model } from 'mongoose';
import { PostStatus } from './post-status.enum';
import UserModel from './User';
import he from 'he';

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
  postDeclinedReason: string,
  postBlockedReason: string,
  postNotActiveReason: string,
  duplicatePostOf: mongoose.Types.ObjectId
}

const PostSchema: mongoose.Schema = new mongoose.Schema({
  userId: {
    type: mongoose.Types.ObjectId,
    ref: UserModel, // Connection user collection - useful during popular operations
    required: true,
    index: true,
  },

  status: {
    type: String,
    enum: PostStatus,
    default: PostStatus.created,
    index: true
  },

  postDeclinedReason: {
    type: String
  },
  postBlockedReason: {
    type: String
  },

  postNotActiveReason: {
    type: String
  },

  isActive: {
    index: true,
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
    uppercase: true,
    type: String,
    required: true // TODO Make is false if we use image processing
  },

  // TODO also make post inactive after 24 hours
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

  duplicatePostOf: {
    type: mongoose.Types.ObjectId,
    ref: 'Posts',
    index: true,
  }

  // TODO add location fields
}, {
  collection: 'Posts',
  timestamps: true,
  id: true,
});

PostSchema.post('find', async function(docs, next) {
  try {
    for (const doc of docs) {
      if (doc && doc.productName)
        doc.productName = he.decode(doc.productName);

    }
    next();
  } catch (err) {
    next(err);
  }
});

PostSchema.post('findOne',  function(doc, next) {
  if (doc && doc.productName)
    doc.productName = he.decode(doc.productName);

  next();
});

const PostModel: Model<IPost> = mongoose.model<IPost>('Post', PostSchema);

export default PostModel;