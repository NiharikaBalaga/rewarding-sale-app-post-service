import express from 'express';
import { PostServiceController } from '../controller';
import multer from 'multer';
import { ImageFileFilter } from './ImageFileFilter';
import { deletePost, newPost, validateErrors } from './RequestValidations';
import passport from '../strategies/passport-strategy';
import { isBlocked, tokenBlacklist } from '../middlewares';

const router = express.Router();


function getRouter() {
  router.get('/hello', (req, res) => {
    res.send({ message: 'Hello=world' });
  });
  const uploadImage = multer({
    limits: {
      fileSize: 50 * 1024 * 1024 // 50 MB
    },
    fileFilter: new ImageFileFilter().fileFilter.bind(new ImageFileFilter())
  });

  router.get('/allpost',[passport.authenticate('jwt-access', { session: false }), isBlocked, tokenBlacklist, validateErrors, PostServiceController.getAllPost]);
  // @ts-ignore
  router.post('', [passport.authenticate('jwt-access', { session: false }), isBlocked, tokenBlacklist, uploadImage.fields([{ name: 'priceTagImage', maxCount: 1 }, { name: 'productImage', maxCount: 1 }]), newPost(), validateErrors, PostServiceController.newPost]);

  router.delete('', [passport.authenticate('jwt-access', { session: false }), isBlocked, tokenBlacklist, deletePost(), validateErrors, PostServiceController.deletePost]);

  return router;
}

export const routes = getRouter();