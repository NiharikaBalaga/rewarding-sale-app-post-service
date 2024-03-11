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
  postCategory: string,
  storePlaceId: string,
  storeAddress: string,
  storeUrl: string,
  storeName: string,
  storePostalCode: string,
  storeCountryShortName: string,
  storeCountryLongName: string,
  storeProvinceShortName: string,
  storeProvinceLongName: string,
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
    required: true
  },

  // TODO also make post inactive after 24 hours
  productDescription: {
    type: String,
    required: false
  },

  oldPrice: {
    type: Number,
    required: true
  },

  newPrice: {
    type: Number,
    required: true
  },

  oldQuantity: {
    type: Number,
    required: false
  },

  newQuantity: {
    type: Number,
    required: false
  },

  postCategory: {
    type: String,
    required: false,
    index: true,
    uppercase: true,
  },

  storePlaceId: {
    type: String,
    required: true,
  },

  storeAddress: {
    type: String,
    required: false,
  },

  storeUrl: {
    type: String,
    required: false,
  },

  storeName: {
    type: String,
    required: false,
  },

  storePostalCode: {
    type: String,
    required: false,
  },

  storeCountryShortName: {
    type: String,
    required: false,
  },

  storeCountryLongName: {
    type: String,
    required: false,
  },

  storeProvinceShortName: {
    type: String,
    required: false,
  },

  storeProvinceLongName: {
    type: String,
    required: false,
  }
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