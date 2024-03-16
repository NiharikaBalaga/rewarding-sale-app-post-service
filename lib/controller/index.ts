import type { Request, Response } from 'express';
import { httpCodes } from '../constants/http-status-code';
import type { IUser } from '../DB/Models/User';
import { PostService } from '../services/Post';

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

  public static deletePost(req: RequestInterferedByIsBlocked, res: Response) {
    const { matchedData: { postId } } = req.body;
    return PostService.deletePost(postId, req.user.userId, res);
  }

  public static getAllPost(req: RequestInterferedByIsBlocked, res: Response) {
    return PostService.getAllPost( res);
}


  public static newPost(req: MulterRequest, res: Response) {
    console.log('newPost');
    const { files } = req;
    if (!files || !files.priceTagImage || !files.productImage)
      return res.status(httpCodes.badRequest).send('Both priceTage and ProductImage are required');


    const { id }  = req.currentUser;
    // eslint-disable-next-line prefer-const
    let { matchedData: { productName, oldPrice, newPrice, oldQuantity = 1, newQuantity = 1, productDescription, storePlaceId }  } = req.body;

    oldPrice = parseFloat(oldPrice);
    newPrice = parseFloat(newPrice);
    oldQuantity = parseFloat(oldQuantity);
    newQuantity = parseFloat(newQuantity);

    // both old price - new price and old quantity and new quantity can't be same
    if (newPrice === oldPrice && newQuantity === oldQuantity) {
      // this is invalid request
      return  res.status(httpCodes.badRequest).send('Invalid Request, both newPrice, oldPrice and newQuantity and oldQuantity cannot be equal');
    }

    if (newPrice >= oldPrice && newQuantity <= oldQuantity)
      return res.status(httpCodes.badRequest).send('Invalid Request, Both new Quantity and new price cannot be lower than or equal to old');


    return PostService.createNewPost({
      productName,
      oldPrice,
      newPrice,
      oldQuantity,
      newQuantity,
      productDescription,
      userId: id,
      storePlaceId
    }, res, files.priceTagImage[0].buffer, files.productImage[0].buffer);
  }
}

export  {
  PostServiceController
};