import type { Request, Response } from 'express';
import { httpCodes } from '../constants/http-status-code';
import type { IUser } from '../DB/Models/User';
import { PostService } from '../services/Post';
import { IPost } from 'lib/DB/Models/Post';
import mongoose from 'mongoose';
import { PostStatus } from '../DB/Models/post-status.enum';

interface RequestValidatedByPassport extends Request {
  user: {
    userId: string;
    accessToken: string;
    phoneNumber: string,
    iat: number,
    exp: number,

  }
}

interface RequestInterferedByIsBlocked extends RequestValidatedByPassport {
  currentUser: IUser
}

interface MulterRequest extends RequestInterferedByIsBlocked {
  files: {
    priceTagImage: Express.Multer.File[];

    productImage: Express.Multer.File[],
  }
}
class PostServiceController {


  public static newPost(req: MulterRequest, res: Response) {
    const { files } = req;
    if (!files || !files.priceTagImage || !files.productImage)
      return res.status(httpCodes.badRequest).send('Both priceTage and ProductImage are required');


    const { id }  = req.currentUser;
    const { matchedData: { productName, oldPrice, newPrice, oldQuantity, newQuantity, productDescription }  } = req.body;
    return PostService.createNewPost({
      productName,
      oldPrice,
      newPrice,
      oldQuantity,
      newQuantity,
      productDescription,
      userId: id

    }, res, files.priceTagImage[0].buffer, files.productImage[0].buffer);
  }

  public static async updatePost(req: Request, res: Response) {
    try {     
        const { postId, productName, newPrice, newQuantity,status } = req.body;
        // Check if required fields are provided
        if (!postId || !productName || !newPrice || !newQuantity) {
            return res.status(httpCodes.badRequest).send('All fields including postId are required');
        }

        // Call updatePost function from PostService
        await PostService.updatePost(
            postId,{
            productName,
            newPrice,
            newQuantity,
            status: PostStatus.updated
        },res);
    } catch (error) {
        console.error('updatePost-error', error);
        return res.status(httpCodes.serverError).send('Server Error, Please try again later');
    }
}

  

  
}

export  {
  PostServiceController
};