import type { DetectTextRequest, TextDetection } from '@aws-sdk/client-rekognition';
import { DetectTextCommand } from '@aws-sdk/client-rekognition';
import { RekognitionClient } from '@aws-sdk/client-rekognition';
import process from 'process';
import type mongoose from 'mongoose';
import { PostService } from './Post';
import { S3Servive } from './S3';
import type { IPost } from '../DB/Models/Post';
import { OpenAIService } from './OpenAI';

class RekognitionService {
  private static readonly rekognitionUsEast1 = new RekognitionClient({
    apiVersion: 'version',
    region: process.env.aws_region_us_east_1,
    credentials: {
      accessKeyId: process.env.aws_rekognition_access_key_id || '',
      secretAccessKey: process.env.aws_rekognition_secret_key || '',
    }
  });

  static async newPost(postId: mongoose.Types.ObjectId) {
    try {
      console.log('Processing New Post');
      let validPost = false;
      let postDeclinedReason: string = 'Post Not Found';
      const post = await PostService.getPost(postId);
      console.log(`Successfully Fetched the Post from Database - PostID: ${postId}`);
      if (post) {
        validPost = true;
        // step-1 classify image and check
        const priceTagImageDetails = this._parseS3URI(post.priceTagImageS3Uri);
        const productImageDetails = this._parseS3URI(post.productImageS3Uri);

        console.log('Downloading Images...');
        // download images
        const priceTagImage = await S3Servive.downloadFile(priceTagImageDetails.bucketName, priceTagImageDetails.objectKey);
        const productImage = await S3Servive.downloadFile(productImageDetails.bucketName, productImageDetails.objectKey);

        if (priceTagImage && productImage) {
          console.log('Images Downloaded Successfully, started text detection');
          const [priceTagTextDetection, productTextDetection] = await Promise.all([this._detectText(priceTagImage), this._detectText(productImage)]);
          if (priceTagTextDetection && productTextDetection) {
            console.log('Text Detection Successful, Entering into Validation Pipeline');
            // process into pipeline
            const { validated, reason, validProductName, duplicatedPost } =
              await this._postValidationPipeline(post, priceTagTextDetection, productTextDetection);
            validPost = validated;
            if (reason)
              postDeclinedReason = reason;

            if (validated && validProductName) {
              // it's a valid post
              if (!duplicatedPost) {
                // it's not a duplicate post - Updated validatedProductName
                await PostService.publishPost(postId, validProductName);
                console.log(`Post Validation Success - not a duplicate post, Post is Live now, Valid PostName Updated`);
              } else {
                // it's a duplicate post
                // TODO Implement POST UPDATES COLLECTION
                console.log(`Post Validation Success - But it's duplicate post`);
              }
            }
          } else {
            validPost = false;
            postDeclinedReason = 'Not Valid Images';
          }
        } else {
          validPost = false;
          postDeclinedReason = 'Images Not Found';
        }
      }


      if (!validPost) {
        console.log(`Validation Status:${validPost}, reason:${postDeclinedReason}`);
        return PostService.postDeclined(postId, postDeclinedReason);
      }
    } catch (error) {
      // if any error - make post status as failed
      await PostService.postDeclined(postId, 'Server Error');
      console.error('newPost-rekognition-error', error);
      throw error;
    }
  }

  // This function returns  a post is valid or not after multiple validation in this pipeline
  private static async _postValidationPipeline(post: IPost, priceTagTextDetection: TextDetection[], productTextDetection: TextDetection[]) {
    try {
      let validOldPrice = false;
      let validNewPrice = false;
      let validOldQuantity = false;
      let validNewQuantity = false;
      console.log('Validation Pipeline, Comparing Old and New Prices and quantities');
      // step-1 Validate new and Old prices

      const openAiPriceResponse = await OpenAIService.getPrices(post.priceTagImageObjectUrl);

      console.log('openAiPriceResponse', openAiPriceResponse);

      if (!openAiPriceResponse) return { validated: false, reason: 'Image Does not contains valid Price details' };

      const validPrices = openAiPriceResponse.map(price => parseFloat(price).toFixed(2));

      console.log('validPrices', validPrices);

      const [oldPrice, oldQuantity, newPrice, newQuantity] = validPrices;

      if (oldPrice === post.oldPrice.toFixed(2)) validOldPrice = true;
      if (oldQuantity === post.oldQuantity.toFixed(2)) validOldQuantity = true;
      if (newPrice === post.newPrice.toFixed(2)) validNewPrice = true;
      if (newQuantity === post.newQuantity.toFixed(2)) validNewQuantity = true;


      if (!validOldPrice) {
        console.log('Validation Pipeline, Failed - Not a valid old price');
        return { validated: false, reason: 'Image Does not contains valid old Price details' };
      }
      if (!validOldQuantity) {
        console.log('Validation Pipeline, Failed - Not a valid old Quantity');
        return { validated: false, reason: 'Image Does not contains valid old Quantity' };
      }
      if (!validNewPrice) {
        console.log('Validation Pipeline, Failed - Not a valid new price');
        return { validated: false, reason: 'Image Does not contains valid New Price details' };
      }
      if (!validNewQuantity) {
        console.log('Validation Pipeline, Failed - Not a valid new Quantity');
        return { validated: false, reason: 'Image Does not contains valid New Quantity' };
      }


      console.log('Validation Pipeline, Valid Old and New Prices, Checking Product Name');

      // TODO add location validation

      // Step - 2 Validate Product Name in product Image

      const validProductName = await this._isValidProductName(post) ;
      if (!validProductName) {
        console.log('Validation Pipeline,  Failed - Not a valid Product Name');
        return { validated: false, reason: 'Invalid Product Name' };
      }


      // Step-3 Check Duplicate Post
      const duplicatedPost = await PostService.findDuplicatePost(validProductName);// TODO add location fields as well

      return  {
        validated: true,
        validProductName,
        duplicatedPost
      };

    } catch (error) {
      console.error('_postValidationPipeline-error');
      throw error;
    }
  }

  private static async _isValidProductName(post: IPost): Promise<string>{
    return new Promise(async (resolve, reject) => {
      try {
        // Get Product Names from Image
        const detectedProductNamesInPriceTag = await OpenAIService.getProductNames(post.priceTagImageObjectUrl, post.productImageObjectUrl);
        if (!detectedProductNamesInPriceTag || !detectedProductNamesInPriceTag.length) {
          resolve('');
          return;
        }
        // Match Product Names with post name
        const productName = await OpenAIService.getValidProductName(detectedProductNamesInPriceTag, post.productName);
        console.log('ValidProductNameFound', productName);
        if (!productName) {
          resolve('');
          return;
        }
        resolve(productName);

      } catch (error) {
        reject(error);
      }
    });
  }


  private static async _detectText(image: Uint8Array) {
    try {
      const detectTextRequest: DetectTextRequest = {
        Image: {
          Bytes: image
        },
      };
      const textResponse = await  this.rekognitionUsEast1.send(new DetectTextCommand(detectTextRequest));
      return textResponse.TextDetections;
    } catch (error) {
      console.error('_detectText-error', error);
      throw error;
    }
  }

  private static _parseS3URI(s3URI: string) {
    const [,, bucketName, ...rest] = s3URI.split('/');
    const objectKey = rest.join('/');
    return {
      bucketName,
      objectKey
    };
  }
}
export  {
  RekognitionService
};