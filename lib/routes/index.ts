import express from 'express';
import { PostServiceController } from '../controller';
import multer from 'multer';
import { ImageFileFilter } from './ImageFileFilter';
import { newPost,verifyUpdatePost, validateErrors } from './RequestValidations';
import passport from '../strategies/passport-strategy';
import { isBlocked, tokenBlacklist } from '../middlewares';


const router = express.Router();


function getRouter() {
  const uploadImage = multer({
    limits: {
      fileSize: 50 * 1024 * 1024 // 50 MB
    },
    fileFilter: new ImageFileFilter().fileFilter.bind(new ImageFileFilter())
  });

  // @ts-ignore
  router.post('', [passport.authenticate('jwt-access', { session: false }), isBlocked, tokenBlacklist, uploadImage.fields([{ name: 'priceTagImage', maxCount: 1 }, { name: 'productImage', maxCount: 1 }]), newPost(), validateErrors, PostServiceController.newPost]);

  router.put('', [passport.authenticate('jwt-access', { session: false }), isBlocked, tokenBlacklist,verifyUpdatePost(),validateErrors, PostServiceController.updatePost]);
  
  return router;
}

export const routes = getRouter();