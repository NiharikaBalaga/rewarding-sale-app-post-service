import type {
  DeleteMessageBatchRequestEntry,
  Message } from '@aws-sdk/client-sqs';
import { SendMessageCommand
} from '@aws-sdk/client-sqs';
import { SQSClient
} from '@aws-sdk/client-sqs';
import {
  DeleteMessageBatchCommand,
  ReceiveMessageCommand
} from '@aws-sdk/client-sqs';
import { SQSProcessorService } from './SQSProcessor';
import type mongoose from 'mongoose';
import { Events } from './events.enum';
import { de_GetPlatformApplicationAttributesCommand } from '@aws-sdk/client-sns/dist-types/protocols/Aws_query';
import { PostService } from './Post';

class SQSService{
  private static readonly SQS = new SQSClient({
    apiVersion: 'version',
    region: process.env.aws_region,
    credentials: {
      accessKeyId: process.env.aws_sqs_access_key_id || '',
      secretAccessKey: process.env.aws_sqs_secret_access_key || '',
    },
  });

  static async initPoling(){
    this._startPolling();
  }

  private static async _startPolling() {
    try {
      await this._pollMessages();
    } catch (error) {
      console.error('_startPolling-error', error);
    }
  }

  private static async _pollMessages() {
    console.log('Poll-started');

    const pollFunction = async () => {
      try {
        // @ts-ignore
        const messages = await this._receiveMessages(process.env.aws_sqs_queue_url);
        if (messages.length > 0) {
          // I have some messages to process

          await SQSProcessorService.ProcessSqsMessage(messages);

          // once processed

          // delete the messages
          // @ts-ignore
          await this._deleteMessages(messages, process.env.aws_sqs_queue_url);
        }
      } catch (error) {
        console.error('_pollMessages-error', error);
      }
    };

    pollFunction();
    setInterval(pollFunction, 10000); // every 10 seconds

  }


  private static  async _receiveMessages(queueUrl: string, maxMessages: number = 10) {
    try {
      const sqsConsumeCommand = new ReceiveMessageCommand({
        QueueUrl: queueUrl,
        MaxNumberOfMessages: maxMessages,
        // this parameter specifies the duration (in seconds) for which the call waits for a message to arrive in the queue before returning. 20 seconds, which means if there are no messages available in the queue, the call will wait up to 20 seconds for messages to arrive before returning an empty response. This helps reduce the number of empty responses and can improve efficiency.
        WaitTimeSeconds: 20,
        // This parameter specifies the duration (in seconds) that the received messages are hidden from subsequent retrieval requests. 5 seconds, which means once a message is received, it will be hidden from other consumers for 5 seconds. This prevents other consumers from processing the same message simultaneously, ensuring that each message is processed by only one consumer.
        VisibilityTimeout: 60,
        MessageAttributeNames: ['All'],
      });
      const { Messages } = await this.SQS.send(sqsConsumeCommand);
      return Messages ? Messages : [];
    } catch (receiveMessagesError) {
      console.error('receiveMessagesError', receiveMessagesError);
      throw receiveMessagesError;
    }
  }

  private static async _deleteMessages(messages: Message[], queueUrl: string) {
    try {
      const deleteCommands: DeleteMessageBatchRequestEntry[] = messages.map(
        ({ ReceiptHandle }, index) => ({
          Id: `Message${index + 1}`,
          ReceiptHandle,
        }),
      );

      const deleteRequest = {
        QueueUrl: queueUrl,
        Entries: deleteCommands,
      };

      await this.SQS.send(new DeleteMessageBatchCommand(deleteRequest));
    } catch (error) {
      console.error('Error deleting messages from SQS:', error);
      throw error;
    }
  }
  private static async _sendMessageToQueue(message: string) {
    try {
      const params = {
        QueueUrl: process.env.aws_sqs_queue_url,
        MessageBody: message
      };

      await this.SQS.send(new SendMessageCommand(params));
      console.log('Message sent to SQS queue - success');
    } catch (error) {
      console.error('_sendMessageToQueue-error', error);
      throw error;
    }
  }

  static async newPostEvent(postId: mongoose.Types.ObjectId) {
    try {
      await this._sendMessageToQueue(JSON.stringify({
        postId,
        EVENT_TYPE: Events.newPost
      }));
      return;
    } catch (error) {
      await PostService.postFailed(postId);
      throw error;
    }
  }

}


export {
  SQSService
};