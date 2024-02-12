import mongoose from 'mongoose';
import type { IPost } from '../DB/Models/Post';
import PostModel from '../DB/Models/Post';
import type { Response } from 'express';
import { httpCodes } from '../constants/http-status-code';
import { S3Servive } from './S3';
import { SQSService } from './SQS';
import { PostStatus } from '../DB/Models/post-status.enum';

class PostService {
  static async newPostWithGivenId(postId: mongoose.Types.ObjectId, postDetails: Partial<IPost>) {
    const post =  new PostModel({
      _id: postId,
      ...postDetails,
    });
    return post.save();
  }

  static async newPost(postDetails: Partial<IPost>) {
    const post =  new PostModel({
      ...postDetails,
    });
    return post.save();
  }

  static async getPost(postId: string) {
    return PostModel.findById(postId);
  }

  static async postFailed(postId: mongoose.Types.ObjectId) {
    return this._update(postId, {
      status: PostStatus.failed
    });
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
      const newPost = new PostModel({
        _id: postId,
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
      await newPost.save();

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

  public static async deletePost(postId: mongoose.Types.ObjectId, res: Response) {
    try {
      // Delete post
      await PostModel.deleteOne({ _id: postId }).exec();

      // send updated serialised user in response
      return res.send({
        message: 'Post Deleted Successfully',
        status: PostStatus.created
      });
    } catch (error){
      console.error('deletePost-error', error);
      return  res.sendStatus(httpCodes.serverError).send('Server Error, Please try again later');
    }
  }
}

export  {
  PostService
};