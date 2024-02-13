export enum PostStatus {
  created = 'POST_CREATED', //  By default - when user publish a post
  published = 'POST_PUBLISHED', // After our logic to approve the post
  declined = 'POST_DECLINED', // If post doesn't meet our guidelines
  failed = 'POST_FAILED', // If any errors like server errors....
  deleted = 'POST_DELETED' // If post is deleted
}