import type mongoose from 'mongoose';
import PostDLLModel from '../DB/Models/Post-DLL';
import { SNSService } from './SNS';

class PostDLLService {
  static async initPostDLL(postId: mongoose.Types.ObjectId) {
    const node = new PostDLLModel({
      prev: null,
      next: null,
      val: postId,
      isHead: true,
      isTail: true
    });

    if (node) {
      // SNS Event
      await SNSService.postDLLNewNode(node);
    }

    return node.save();
  }

  static async deletePost(postId: mongoose.Types.ObjectId) {
    const node = await PostDLLModel.findOne({
      val: postId
    });

    let shouldMakeNewPostLive = false;
    let newLivePostId = null;

    if (node) {
      if (node.isHead && node.isTail) {
        console.log('Deleting only one post');
        // one node
        const deletedNode = await PostDLLModel.findByIdAndDelete(node.id);

        if (deletedNode) {
          // SNS Event
          await SNSService.postDLLDelete(deletedNode);
        }
      } else if (node.isHead) {
        // Head Node
        const tailNode = await PostDLLModel.findOne({
          isTail: true
        });
        if (tailNode) {
          console.log('Active Post Deleting.. New Live Post:', tailNode.val);
          const nextNode = await PostDLLModel.findById(node.next);
          if (node.next && node.next.equals(tailNode.id)) {
            // edge case only two nodes
            const [updatedNode] = await Promise.all([
              PostDLLModel.findByIdAndUpdate(tailNode.id,  {
                next: null,
                prev: null,
                isHead: true,
                isTail: true
              }),
            ]);

            if (updatedNode) {
              // SNS Event
              await SNSService.postDLLUpdate(updatedNode);
            }
          } else {
            const [newTailNode, updatedTailNode, updatedNextNode]
              = await Promise.all([
                PostDLLModel.findByIdAndUpdate(tailNode.prev, {
                  next: null,
                  isTail: true
                }),
                PostDLLModel.findByIdAndUpdate(tailNode.id, {
                  next: node.next,
                  prev: null,
                  isTail: false,
                  isHead: true,
                }),
                PostDLLModel.findByIdAndUpdate(nextNode?.id, {
                  prev: tailNode.id
                })
              ]);
            if (newTailNode && updatedTailNode && updatedNextNode) {
              // SNS Event
              await Promise.all([SNSService.postDLLUpdate(newTailNode),
                SNSService.postDLLUpdate(updatedTailNode),
                SNSService.postDLLUpdate(updatedNextNode)]);
            }
          }
          const deletedNode = await PostDLLModel.findByIdAndDelete(node.id);
          if (deletedNode) {
            // SNS Event
            await SNSService.postDLLDelete(deletedNode);
          }
          shouldMakeNewPostLive = true;
          newLivePostId = tailNode.val;
        }
      } else if (node.isTail) {
        console.log('Deleting Tail Node post');
        // Tail Node
        const [newTailNode, deletedNode] = await Promise.all([
          PostDLLModel.findByIdAndUpdate(node.prev, {
            next: null,
            isTail: true,
          }),
          PostDLLModel.findByIdAndDelete(node.id)
        ]);
        if (newTailNode && deletedNode) {
          // SNS Event
          await Promise.all([SNSService.postDLLUpdate(newTailNode),
            SNSService.postDLLDelete(deletedNode)]);
        }
      } else {
        console.log('Deleting Middle Node Post');
        const nextNode = await PostDLLModel.findById(node.next);
        if (nextNode) {
          const [updatedNode1, updatedNode2, deletedNode]
            = await Promise.all([
              PostDLLModel.findByIdAndUpdate(nextNode.id, {
                prev: node.prev
              }),
              PostDLLModel.findByIdAndUpdate(node.prev, {
                next: node.next
              }),
              PostDLLModel.findByIdAndDelete(node.id)
            ]);
          if (updatedNode1 && updatedNode2 && deletedNode) {
            // SNS Event
            await Promise.all([
              SNSService.postDLLUpdate(updatedNode1),
              SNSService.postDLLUpdate(updatedNode2),
              SNSService.postDLLDelete(deletedNode)
            ]);
          }
        }
      }
    }

    return {
      shouldMakeNewPostLive,
      newLivePostId
    };
  }
  static async addDuplicatePost(postId: mongoose.Types.ObjectId) {
    // step - 1 find the tail node
    const tailNode = await PostDLLModel.findOne({
      isTail: true
    });

    if (tailNode) {
      // step - 2 create new node
      const newNode = new PostDLLModel({
        val: postId,
        prev: tailNode.id,
        next: null,
        isTail: true,
      });

      const [updatedTailNode, newSavedNode] = await Promise.all([
        PostDLLModel.findByIdAndUpdate(tailNode.id, {
          isTail: false,
          next: newNode.id
        }),
        newNode.save()
      ]);

      if (updatedTailNode && newNode) {
        // SNS Event
        await Promise.all([SNSService.postDLLUpdate(updatedTailNode), SNSService.postDLLNewNode(newSavedNode)]);
      }
    }
  }
}

export {
  PostDLLService
};