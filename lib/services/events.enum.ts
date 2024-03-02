export enum Events {
  userCreatedByPhone = 'AUTH_USER_CREATED_BY_PHONE',
  userUpdate = 'AUTH_USER_UPDATED',
  tokenBlackList = 'AUTH_TOKEN_BLACKLIST',
  newPost = 'POST_NEW_POST', // Only used in SQS for post service
  userNewPost = 'USER_NEW_POST',
  userPostUpdate = 'USER_POST_UPDATE',
  userPostDelete = 'USER_POST_DELETE',
  postDLLNewNode = 'POST_DLL_NEW_NODE',
  postDLLUpdate = 'POST_DLL_UPDATE',
  postDLLDelete = 'POST_DLL_DELETE'
}