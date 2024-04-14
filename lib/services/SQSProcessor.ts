import { Events } from './events.enum';
import { UserService } from './User';
import type mongoose from 'mongoose';
import { RekognitionService } from './Rekognition';
import { PostService } from './Post';
import { IPost } from '../DB/Models/Post';

class SQSProcessorService {
  static async ProcessSqsMessage(messages: any[]) {
    // [
    //   {
    //       Body: '{\n' +
    //         '  "Type" : "Notification",\n' +
    //         '  "MessageId" : "13a3c739-1abf-54f3-a96e-9901490913a1",\n' +
    //         '  "TopicArn" : "arn:aws:sns:ca-central-1:730335472150:AUTH_TOPIC",\n' +
    //         '  "Message" : "{\\"user\\":{\\"lastLocation\\":{\\"type\\":\\"Point\\",\\"coordinates\\":[0,0]},\\"_id\\":\\"65be4f7972a1a77c4cf6aee7\\",\\"phoneNumber\\":\\"437-556-2948\\",\\"signedUp\\":true,\\"isBlocked\\":false,\\"createdAt\\":\\"2024-02-03T14:36:41.186Z\\",\\"updatedAt\\":\\"2024-02-03T14:45:09.665Z\\",\\"__v\\":0,\\"refreshToken\\":\\"$argon2id$v=19$m=65536,t=3,p=4$M6eQLYulfZm5efUqwDhGqg$YpBZjZc9Pl7w0Hz+KDMA3qZzDKHp4KzqCVaJOdT/XKM\\",\\"email\\":\\"sgelz@gmail.com\\",\\"firstName\\":\\"Niha\\",\\"lastName\\":\\"Gel\\"},\\"EVENT_TYPE\\":\\"AUTH_USER_UPDATED\\",\\"userId\\":\\"65be4f7972a1a77c4cf6aee7\\"}",\n' +
    //         '  "Timestamp" : "2024-02-03T14:45:10.469Z",\n' +
    //         '  "SignatureVersion" : "1",\n' +
    //         '  "Signature" : "I7I8q3km0Xel6eVZd3H+YehaYcw/qo6AHSLtyEu1NlKiPXiXeaLoLb2azPH/wX+s3T8din01wHjxNP8fxAC4OMLD044+Z+STNh/HkiyGEhwWOvcGIoFk1cwRWmL75SGmen+1djE7aW/nms6J5Gok6+co3Y1Sg0D+x5XrlPGkvMymxwrbGUT3GJ4YrAwP+UY64vzvQtxTHEvMvFJfbs9KvEUkpX7ac0gwaiQC/dufiLQwXEXsMy+4nrCKxP1WAyPEvJHugFJCoYhjKqb7WQiQ/LBnbhLmPjn77snEgA0ZOF/yqSxKLWu5C+Iezu+yMIEgbtqlmrIFlJePE2amAELrSw==",\n' +
    //         '  "SigningCertURL" : "https://sns.ca-central-1.amazonaws.com/SimpleNotificationService-60eadc530605d63b8e62a523676ef735.pem",\n' +
    //         '  "UnsubscribeURL" : "https://sns.ca-central-1.amazonaws.com/?Action=Unsubscribe&SubscriptionArn=arn:aws:sns:ca-central-1:730335472150:AUTH_TOPIC:b4b0e43a-0532-4b4b-9bc1-1c47b57217c6"\n' +
    //         '}',
    //       MD5OfBody: '7aa1e14a3acf36477a61114a0d15fd18',
    //       MessageId: 'b8f12fc2-db6c-46eb-b556-77e2e458f8d2',
    //       ReceiptHandle: 'AQEBiLe9nR+NclzyZT3SgckzxTBSu1PId3K8awkJhBfQn7azBXKsc9B55mzDZrOV8A2AY1JLpstPcuQO8XfcvzMiFTM9H7X0AiIGJ0gBqCcHizP4D6cjcf3aZXkT3Ti0wJR6oUBxTnrhZDNkBmMRC50BIc3yjufdg5O9jWUTvAwSJvNzbA2ANR9vG6MIEFRVvn0hLr5c/NRZVt4Zv30bOEYFbRrF/4adRE6AEnY3tFtsI7s113irzL8DPEpdJdOueQWRNSJKLwk8BPeFsgymKzaUs8UdE6qENoIpLOowvr4R0eb4HO3d64eeRQUoGBuho5HaqQP/Il1KJTA10F/7AtNnLN/lhi8U/aJhJTjVpaC3sZ9/lzYemKDTKsHH10/+YgP6ZFNlBdTKQAeS0VDcnwwU3A=='
    //     }
    //  ]

    try {
      await Promise.all(
        messages.map(({ Body }) => {
          try {
            const parsedBody = JSON.parse(Body);
            if (parsedBody.Message) {
              // Message sent by SNS
              const parsedMessage = JSON.parse(parsedBody.Message);
              if (parsedMessage['EVENT_TYPE'])
                return this._handleMessageEventsSentBySNS(parsedMessage);
            } else {
              // Message sent by Queue itself
              if (parsedBody['EVENT_TYPE'])
                return this._handleMessageEventsSentBySqs(parsedBody);
            }
          } catch (error) {
            console.error('Error processing SQS message:', error);
            throw error;
          }
        }),
      );
    } catch (error) {
      console.error('Error processing SQS messages:', error);
      throw error;
    }
  }

  private static async _handleMessageEventsSentBySqs(parsedBody: any) {
    const { EVENT_TYPE, postId } = parsedBody;
    console.log('_handleMessageEventsSentBySqs', EVENT_TYPE, postId);
    switch (EVENT_TYPE) {
      case Events.newPost:
        return this._handleNewPost(postId);
      default:
        console.warn(`Unhandled event type: ${EVENT_TYPE}`);
        break;
    }
  }

  private static async _handleMessageEventsSentBySNS(parsedMessage: any) {
    const { EVENT_TYPE, user, userId, token, updatedUser, postId, post } =
      parsedMessage;
    console.log(EVENT_TYPE, user, userId, token, updatedUser, postId, post);
    switch (EVENT_TYPE) {
      case Events.userCreatedByPhone:
        return this._handleUserCreationByPhone(user, userId);
      case Events.tokenBlackList:
        return this._handleTokenBlackListEvent(token);
      case Events.userUpdate:
        return this._handleUserUpdatedEvent(updatedUser, userId);
      case Events.blockPost:
        return this._handleBlockPostByDecision(postId);
      case Events.postUpdated:
        return this._handlePostUpdate(post, postId);
      default:
        console.warn(`Unhandled event type: ${EVENT_TYPE}`);
        break;
    }
  }

  private static async _handlePostUpdate(post: IPost, postId: string) {
    try {
      await PostService.updatePostAdminSNS(post, postId);
    } catch (error) {
      console.error('_handleUserCreationByPhone-error', error);
      throw error;
    }
  }

  private static async _handleUserCreationByPhone(user: any, userId: string) {
    try {
      await UserService.createUserByPhone(user, userId);
      return true;
    } catch (error) {
      console.error('_handleUserCreationByPhone-error', error);
      throw error;
    }
  }

  private static async _handleTokenBlackListEvent(token: string) {
    try {
      await UserService.addTokenInBlackList(token);
      return true;
    } catch (error){
      console.error('_handleTokenBlackListEvent_error', error);
      throw error;
    }
  }

  private static async _handleUserUpdatedEvent(user: any, userId: string) {
    try {
      await UserService.updateUser(userId, user);
      return true;
    } catch (error){
      console.error('_handleUserUpdatedEvent', error);
      throw error;
    }
  }

  private static async _handleNewPost(postId: mongoose.Types.ObjectId) {
    try {
      await RekognitionService.newPost(postId);
      return true;
    } catch (error) {
      console.error('_handleNewPost-error', error);
    }
  }

  private static async _handleBlockPostByDecision(postId: mongoose.Types.ObjectId) {
    try {
      await PostService.blockPost(postId);
      return true;
    } catch (error) {
      console.error('_handleBlockPostByDecision-error', error);
    }
  }
}

export {
  SQSProcessorService
};