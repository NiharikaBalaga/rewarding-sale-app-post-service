export enum PostStatus {
  created = 'POST_CREATED', //  By default - when user publish a post
  published = 'POST_PUBLISHED', // After our logic to approve the post
  declined = 'POST_DECLINED', // If post doesn't meet our guidelines
  failed = 'POST_FAILED', // If any errors like server errors....
  blocked = 'POST_BLOCKED',
  duplicate = 'POST_DUPLICATE', // If the post is duplicate of another post
  expired = 'POST_EXPIRED',
  // status if decision service flag the post
  // what if admin wants to remove the post
}