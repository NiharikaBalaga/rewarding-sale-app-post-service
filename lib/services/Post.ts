import mongoose from 'mongoose';
import type { IPost } from '../DB/Models/Post';
import PostModel from '../DB/Models/Post';
import type { Response } from 'express';
import { httpCodes } from '../constants/http-status-code';
import { S3Servive } from './S3';
import { SQSService } from './SQS';
import { PostStatus } from '../DB/Models/post-status.enum';
import { PostDLLService } from './PostDLL';
import { SNSService } from './SNS';
import { LocationService } from './Location';


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
    const { shouldMakeNewPostLive, newLivePostId } = await PostDLLService.deletePost(post.id, post.productName);

    if (shouldMakeNewPostLive && newLivePostId) {
      const newLivePost = await this._update(newLivePostId, {
        isActive: true,
        status: PostStatus.published
      });
      if (newLivePost) {
        // SNS Event
        await SNSService.userPostUpdate(newLivePost);
      }
    }

    const deletedPost = await PostModel.findByIdAndDelete(postId);


    if (deletedPost) {
      // SNS Event
      await SNSService.userPostDelete(deletedPost);
    }


    return res.status(httpCodes.ok).send({});

  }

  static async getAllPost(res: Response) {
    try {
        // Fetch all posts from the database
        const posts = await PostModel.find({ status: 'POST_PUBLISHED' });

        if (!posts || posts.length === 0) {
            return res.status(httpCodes.notFound).send({ message: 'No published posts found' });
        }
        
        return res.status(httpCodes.ok).send({
            data: posts,
            status: httpCodes.ok
        });
    } catch (error) {
        console.error('Error fetching posts:', error);
        return res.status(httpCodes.serverError).send({ message: 'An error occurred while fetching posts' });
    }
}


// public static async getAllPost() {
//   try {
//       // Fetch all posts from the database using PostService
//       const posts = await PostService.getAllPost();

//       // Check if any posts were found
//       if (!posts || posts.length === 0) {
//           return { status: httpCodes.notFound, message: 'No posts found' };
//       }

//       // Return the retrieved posts
//       return { status: httpCodes.ok, data: posts };
//   } catch (error) {
//       console.error('Error fetching posts:', error);
//       return { status: httpCodes.serverError, message: 'An error occurred while fetching posts' };
//   }
// }


  static async getPost(postId: mongoose.Types.ObjectId) {
    return PostModel.findById(postId);
  }


  static async postFailed(postId: mongoose.Types.ObjectId, declinedReason: string) {
    const failedPost = await  this._update(postId, {
      status: PostStatus.failed,
      postDeclinedReason: declinedReason,
      isActive: false
    });

    if (failedPost) {
      // SNS Event
      await SNSService.userPostUpdate(failedPost);
    }
    return failedPost;
  }

  static async postDeclined(postId: mongoose.Types.ObjectId, declinedReason: string, validProductName: string, postCategory: string, postStorePlaceId: string) {
    const { address, url, name, postalCode, countryShortName, countryLongName, provinceShortName, provinceLongName } = await LocationService.getPlaceDetails(postStorePlaceId);
    const declinedPost = await  this._update(postId, {
      status: PostStatus.failed,
      postDeclinedReason: declinedReason,
      isActive: false,
      productName: validProductName,
      postCategory,
      storeAddress: address,
      storeUrl: url,
      storeName: name,
      storePostalCode: postalCode || '',
      storeCountryShortName: countryShortName || '',
      storeCountryLongName: countryLongName || '',
      storeProvinceShortName: provinceShortName || '',
      storeProvinceLongName: provinceLongName || '',
    });

    if (declinedPost) {
      // SNS Event
      await SNSService.userPostUpdate(declinedPost);
    }
    return declinedPost;
  }

  static async publishPost(postId: mongoose.Types.ObjectId, validProductName: string, postCategory: string, postStorePlaceId: string) {
    const { address, url, name, postalCode, countryShortName, countryLongName, provinceShortName, provinceLongName } = await LocationService.getPlaceDetails(postStorePlaceId);
    const publishPost = await this._update(postId, {
      status: PostStatus.published,
      productName: validProductName,
      isActive: true,
      postCategory,
      storeAddress: address,
      storeUrl: url,
      storeName: name,
      storePostalCode: postalCode || '',
      storeCountryShortName: countryShortName || '',
      storeCountryLongName: countryLongName || '',
      storeProvinceShortName: provinceShortName || '',
      storeProvinceLongName: provinceLongName || '',
    });

    if (publishPost) {
      // SNS Event
      await SNSService.userPostUpdate(publishPost);

      // init the post DLL
      await PostDLLService.initPostDLL(publishPost.id, publishPost.productName);

    }

    return publishPost;
  }

  static async duplicatePost(postId: mongoose.Types.ObjectId, validProductName: string, postCategory: string, postStorePlaceId: string) {
    const { address, url, name, postalCode, countryShortName, countryLongName, provinceShortName, provinceLongName } = await LocationService.getPlaceDetails(postStorePlaceId);
    const duplicatePost = await this._update(postId, {
      status: PostStatus.duplicate,
      isActive: false,
      productName: validProductName,
      postCategory,
      storeAddress: address,
      storeUrl: url,
      storeName: name,
      storePostalCode: postalCode || '',
      storeCountryShortName: countryShortName || '',
      storeCountryLongName: countryLongName || '',
      storeProvinceShortName: provinceShortName || '',
      storeProvinceLongName: provinceLongName || '',
    });

    if (duplicatePost) {
      // SNS event
      await SNSService.userPostUpdate(duplicatePost);

      // Add duplicate post into the Post DLL
      await PostDLLService.addDuplicatePost(duplicatePost?.id, duplicatePost.productName);
    }

    return duplicatePost;
  }

  static async findDuplicatePost(productName: string, storePlaceId: string) {
    const duplicatePostQuery = {
      productName,
      storePlaceId,
      $or: [
        { status: PostStatus.created },
        { status: PostStatus.published },
        { status: PostStatus.blocked },
        { status: PostStatus.duplicate }
      ]
    };

    return PostModel.findOne(duplicatePostQuery).exec();
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
      const newPost = await this._newPostWithGivenId(postId, {
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
        newQuantity: newPostData.newQuantity,
        storePlaceId: newPostData.storePlaceId
      });

      // SNS Event
      // step - 4 = Publish to post topic SNS for new Post
      await SNSService.newUserPost(newPost);

      // step - 5 = send newPost Event to post service SQS
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