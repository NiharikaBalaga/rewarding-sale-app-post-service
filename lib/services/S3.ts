import type { GetObjectRequest } from '@aws-sdk/client-s3';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import * as process from 'process';
import type mongoose from 'mongoose';

class S3Servive{
  private static readonly S3 = new S3Client({
    apiVersion: 'version',
    region: process.env.aws_region,
    credentials: {
      accessKeyId: process.env.aws_s3_access_key_id || '',
      secretAccessKey: process.env.aws_s3_secret_access_key || '',
    },
  });
  private static async _uploadFile(key: string, fileContent: Buffer) {
    try {
      const uploadCommand = new PutObjectCommand({
        Body: fileContent,
        Key: key,
        Bucket: process.env.aws_post_s3_bucket || 'aws_post_s3_bucket'
      });
      await this.S3.send(uploadCommand);
      // file is uploaded
      const s3URI = `s3://${process.env.aws_post_s3_bucket}/${key}`;
      const objectURL = `https://${process.env.aws_post_s3_bucket}.s3.${process.env.aws_region}.amazonaws.com/${key}`;

      console.log('Image Uploaded to S3', objectURL);

      return {
        s3URI,
        imageUrl: objectURL
      };
    } catch (error) {
      console.error('_uploadFile-error', error);
    }
  }

  static async uploadPriceTag(
    priceTagImage: Buffer,
    postId: mongoose.Types.ObjectId,
  ) {
    const priceTagKey = `posts/${postId}/images/priceTag.jpg`;
    return this._uploadFile(priceTagKey, priceTagImage);
  }

  static async uploadProductImage(
    productImage: Buffer,
    postId: mongoose.Types.ObjectId,
  ) {
    const productImageKey = `posts/${postId}/images/productImage.jpg`;
    return this._uploadFile(productImageKey, productImage);
  }

  static async downloadFile(bucketName: string, objectKey: string) {
    try {
      const getObjectRequest: GetObjectRequest = {
        Bucket: bucketName,
        Key: objectKey,
      };
      const response = await this.S3.send(
        new GetObjectCommand(getObjectRequest),
      );

      return response.Body?.transformToByteArray();
    } catch (error) {
      console.error(`Error download file from S3`, error);
      throw error;
    }
  }
}

export {
  S3Servive
};