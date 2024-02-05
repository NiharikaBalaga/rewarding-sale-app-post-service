import type mongoose from 'mongoose';
import type { IPost } from '../DB/Models/Post';
import PostModel from '../DB/Models/Post';

class PostService {
  static async newPostWithGivenId(postId: mongoose.Types.ObjectId, postDetails: Partial<IPost>) {
    const post =  new PostModel({
      _id: postId,
      ...postDetails,
    });
    return post.save();
  }

  static async newPostWith(postDetails: Partial<IPost>) {
    const post =  new PostModel({
      ...postDetails,
    });
    return post.save();
  }

  static async getPost(postId: string) {
    return PostModel.findById(postId);
  }


  private static async _update(id: string, updatePostObject: Partial<IPost>) {
    return PostModel.findByIdAndUpdate(id, updatePostObject, { new: true }).exec();
  }
}

export  {
  PostService
};