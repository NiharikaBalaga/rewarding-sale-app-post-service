import mongoose from 'mongoose';
import type { IPost } from '../DB/Models/Post';
import PostModel from '../DB/Models/Post';
import type { Response } from 'express';
import { httpCodes } from '../constants/http-status-code';
import { S3Servive } from './S3';
import { SQSService } from './SQS';
import { PostStatus } from '../DB/Models/post-status.enum';
import { PostDLLService } from './PostDLL';


class PostService {
  private static async _newPostWithGivenId(postId: mongoose.Types.ObjectId, postDetails: Partial<IPost>) {
    const post = new PostModel({
      _id: postId,
      ...postDetails,
    });
    return post.save();
  }

  static async deletePost(postId: mongoose.Types.ObjectId, userId: string, res: Response) {
    // step - 1 find the post to delete
    const post = await PostModel.findOne({
      _id: postId,
      userId
    });

    if (!post) return res.status(httpCodes.badRequest).send('Post does not exist');

    // step - 2 Check and update Post DLL list
    const { shouldMakeNewPostLive, newLivePostId } = await PostDLLService.deletePost(post.id);

    if (shouldMakeNewPostLive && newLivePostId) {
      await this._update(newLivePostId, {
        isActive: true,
        status: PostStatus.published
      });
    }

    await PostModel.findByIdAndDelete(postId);

    return res.status(httpCodes.ok).send({});

  }


  static async getPost(postId: mongoose.Types.ObjectId) {
    return PostModel.findById(postId);
  }


  static async postFailed(postId: mongoose.Types.ObjectId, declinedReason: string) {
    return this._update(postId, {
      status: PostStatus.failed,
      postDeclinedReason: declinedReason,
      isActive: false
    });
  }

  static async postDeclined(postId: mongoose.Types.ObjectId, declinedReason: string, validProductName: string) {
    return this._update(postId, {
      status: PostStatus.failed,
      postDeclinedReason: declinedReason,
      isActive: false,
      productName: validProductName
    });
  }

  static async publishPost(postId: mongoose.Types.ObjectId, validProductName: string) {
    const publishPost = await this._update(postId, {
      status: PostStatus.published,
      productName: validProductName,
      isActive: true
    });

    // init the post DLL
    await PostDLLService.initPostDLL(publishPost?.id);

    return publishPost;
  }

  static async duplicatePost(postId: mongoose.Types.ObjectId, validProductName: string) {
    const duplicatePost = await this._update(postId, {
      status: PostStatus.duplicate,
      isActive: false,
      productName: validProductName
    });

    // Add duplicate post into the Post DLL
    await PostDLLService.addDuplicatePost(duplicatePost?.id);
    return duplicatePost;
  }

  static async findDuplicatePost(productName: string) {
    return PostModel.findOne({
      productName,
      isActive: true,
      // TODO include location as well
    }).exec();
  }


  private static async _update(id: mongoose.Types.ObjectId, updatePostObject: Partial<IPost>) {
    return PostModel.findByIdAndUpdate(id, updatePostObject, { new: true }).exec();
  }

  static async createNewPost(newPostData: Partial<IPost>, res: Response, priceTagImage: Buffer, productImage: Buffer) {
    try {
      // Step - 1 = create PostId
      const postId = new mongoose.Types.ObjectId();

      // step - 2 = Upload two Images into S3
      const [priceTagResponse, productImageResponse] = await Promise.all([S3Servive.uploadPriceTag(priceTagImage, postId), S3Servive.uploadProductImage(productImage, postId)]);

      // step - 3 = Create post in post collection
      await this._newPostWithGivenId(postId, {
        userId: newPostData.userId,
        priceTagImageS3Uri: priceTagResponse?.s3URI,
        priceTagImageObjectUrl: priceTagResponse?.imageUrl,
        productImageS3Uri: productImageResponse?.s3URI,
        productImageObjectUrl: productImageResponse?.imageUrl,
        productName: newPostData.productName,
        productDescription: newPostData.productDescription,
        oldPrice: newPostData.oldPrice,
        newPrice: newPostData.newPrice,
        oldQuantity: newPostData.oldQuantity,
        newQuantity: newPostData.newQuantity
      });

      // step - 4 = send newPost Event to post service SQS
      await SQSService.newPostEvent(postId);

      return res.send({
        message: 'Post Created Successfully',
        status: PostStatus.created
      });
    } catch (error) {
      // TODO handle any failure
      console.error('createNewPost-error', error);
      return res.status(httpCodes.serverError).send('Server Error, Please try again later');
    }
  }
}

export {
  PostService
};