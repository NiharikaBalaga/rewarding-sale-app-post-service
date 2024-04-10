import { PublishCommand, SNSClient } from '@aws-sdk/client-sns';
import type { IPost } from '../DB/Models/Post';
import { Events } from './events.enum';
import type { IPostDLL } from '../DB/Models/Post-DLL';
import mongoose from 'mongoose';


class SNSService {
  private static readonly SNS: SNSClient = new SNSClient({
    apiVersion: 'version',
    region: process.env.aws_region,
    credentials: {
      accessKeyId: process.env.aws_sns_access_key_id || '',
      secretAccessKey: process.env.aws_sns_secret_access_key || '',
    },
  });

  private static async _publishToPostTopicARN(Message: string) {
    try {
      const messageParams = {
        Message,
        TopicArn: process.env.POST_TOPIC_SNS_ARN,
      };

      const { MessageId } = await this.SNS.send(
        new PublishCommand(messageParams),
      );
      console.log('_publishToPostTopicARN-success', MessageId);
    } catch (_publishToPostTopicARNError) {
      console.error(
        'publishToAuthTopicSNSError',
        _publishToPostTopicARNError,
      );
    }
  }

  static async newUserPost(post: IPost) {
    const EVENT_TYPE = Events.userNewPost;
    const snsMessage = Object.assign({ post }, { EVENT_TYPE, postId: post.id });
    console.log(`Publishing ${EVENT_TYPE} to Post Topic`);
    return this._publishToPostTopicARN(JSON.stringify(snsMessage));
  }

  static async userPostUpdate(updatedPost: IPost) {
    const EVENT_TYPE = Events.userPostUpdate;
    const snsMessage = Object.assign({ updatedPost }, { EVENT_TYPE, postId: updatedPost.id });
    console.log(`Publishing ${EVENT_TYPE} to Post Topic`);
    return this._publishToPostTopicARN(JSON.stringify(snsMessage));
  }

  static async userPostDelete(deletedPost: IPost) {
    const EVENT_TYPE = Events.userPostDelete;
    const snsMessage = Object.assign({ deletedPost }, { EVENT_TYPE, postId: deletedPost.id });
    console.log(`Publishing ${EVENT_TYPE} to Post Topic`);
    return this._publishToPostTopicARN(JSON.stringify(snsMessage));
  }

  static async postDLLNewNode(postDLL: IPostDLL) {
    const EVENT_TYPE = Events.postDLLNewNode;
    const snsMessage = Object.assign({ postDLL }, { EVENT_TYPE, postDLLId: postDLL.id });
    console.log(`Publishing ${EVENT_TYPE} to Post Topic`);
    return this._publishToPostTopicARN(JSON.stringify(snsMessage));
  }

  static async postDLLUpdate(updatedPostDLL: IPostDLL) {
    const EVENT_TYPE = Events.postDLLUpdate;
    const snsMessage = Object.assign({ updatedPostDLL }, { EVENT_TYPE, postDLLId: updatedPostDLL.id });
    console.log(`Publishing ${EVENT_TYPE} to Post Topic`);
    return this._publishToPostTopicARN(JSON.stringify(snsMessage));
  }

  static async postDLLDelete(deletedPostDLL: IPostDLL) {
    const EVENT_TYPE = Events.postDLLDelete;
    const snsMessage = Object.assign({ deletedPostDLL }, { EVENT_TYPE, postDLLId: deletedPostDLL.id });
    console.log(`Publishing ${EVENT_TYPE} to Post Topic`);
    return this._publishToPostTopicARN(JSON.stringify(snsMessage));
  }

  static async postView(post: IPost, userId: mongoose.Types.ObjectId | string) {
    const EVENT_TYPE = Events.postView;
    const snsMessage = Object.assign({ post }, { EVENT_TYPE, postId: post.id, viewedBy: userId });
    console.log(`Publishing ${EVENT_TYPE} to Post Topic`);
    return this._publishToPostTopicARN(JSON.stringify(snsMessage));
  }
}

export  {
  SNSService
};