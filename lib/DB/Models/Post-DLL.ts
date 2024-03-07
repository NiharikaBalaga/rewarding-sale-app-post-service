import mongoose from 'mongoose';
import type { Document, Model } from 'mongoose';
import PostModel from './Post';

export interface IPostDLL extends Document {
  val: mongoose.Types.ObjectId,
  prev?: mongoose.Types.ObjectId,
  next?: mongoose.Types.ObjectId
  isHead?: Boolean,
  isTail?: Boolean,
  productName: string,
}

const PostDLLSchema: mongoose.Schema = new mongoose.Schema({
  val: {
    type: mongoose.Types.ObjectId,
    ref: PostModel,
    index: true,
    required: true
  },
  prev: {
    type: mongoose.Types.ObjectId,
    index: true,
    default: null,
  },

  next: {
    type: mongoose.Types.ObjectId,
    index: true,
    default: null,
  },

  isHead: {
    index: true,
    type: Boolean,
    default: false
  },

  isTail: {
    index: true,
    type: Boolean,
    default: false
  },

  productName: {
    index: true,
    type: String,
    required: true,
  }
});

const PostDLLModel: Model<IPostDLL> = mongoose.model<IPostDLL>('PostDLL', PostDLLSchema);


export default PostDLLModel;