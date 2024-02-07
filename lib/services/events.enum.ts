export enum Events {
  userCreatedByPhone = 'AUTH_USER_CREATED_BY_PHONE',
  userUpdate = 'AUTH_USER_UPDATED',
  tokenBlackList = 'AUTH_TOKEN_BLACKLIST',
  newPost = 'POST_NEW_POST' // Only used in SQS for post service
}