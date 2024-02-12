import type { Request, Response } from 'express';
import { httpCodes } from '../constants/http-status-code';
import type { IUser } from '../DB/Models/User';
import { PostService } from '../services/Post';
import mongoose from 'mongoose';

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

  public static deletePost(req: Request, res: Response) {
    const { postId } = req.body;
    const objectId = new mongoose.Types.ObjectId(postId);
    return PostService.deletePost(objectId, res);
  }
}

export  {
  PostServiceController
};