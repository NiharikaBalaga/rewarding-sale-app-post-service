import { body, matchedData, param, validationResult } from 'express-validator';
import type { NextFunction, Request, Response } from 'express';
import { httpCodes } from '../constants/http-status-code';

const newPost = () => {
  return [
    body('productName')
      .trim()
      .notEmpty()
      .escape()
      .isString()
      .withMessage('Product Name is required'),
    body('oldPrice')
      .trim()
      .escape()
      .notEmpty()
      .isNumeric()
      .withMessage('Old price is required'),
    body('newPrice')
      .trim()
      .escape()
      .notEmpty()
      .isNumeric()
      .withMessage('New price is required'),
    body('oldQuantity')
      .trim()
      .escape()
      .isNumeric()
      .notEmpty()
      .withMessage('Old quantity is required'),
    body('newQuantity')
      .trim()
      .escape()
      .isNumeric()
      .notEmpty()
      .withMessage('New quantity is required'),
    body('productDescription')
      .trim()
      .optional()
      .escape()
      .isString()
      .withMessage('Description must be valid'),
    body('storePlaceId')
      .trim()
      .escape()
      .isString()
      .notEmpty()
      .withMessage('Store PlaceId(Google maps Place Id) must be valid')
  ];
};

const deletePost = () => {
  return [
    body('postId')
      .trim()
      .notEmpty()
      .withMessage('Post Id is required')
  ];
};


const postIdPathParam = () => {
  return [
    param('postId')
      .trim()
      .notEmpty()
      .isMongoId()
      .withMessage('Must be a Valid Psot Id')
  ];
};

const validateErrors = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) {
    const data = matchedData(req);
    req.body['matchedData'] = data;
    return next();
  }
  const extractedErrors: any = [];
  errors.array().map((err: any) => extractedErrors.push({ [err.param || err.path]: err.msg }));
  return res.status(httpCodes.unprocessable_entity).json({
    errors: extractedErrors
  });
};

export { newPost, validateErrors, deletePost, postIdPathParam };