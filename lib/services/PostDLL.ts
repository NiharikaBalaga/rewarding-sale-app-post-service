import type mongoose from 'mongoose';
import PostDLLModel from '../DB/Models/Post-DLL';

class PostDLLService {
  static async initPostDLL(postId: mongoose.Types.ObjectId) {
    const node = new PostDLLModel({
      prev: null,
      next: null,
      val: postId,
      isHead: true,
      isTail: true
    });

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
        await PostDLLModel.findByIdAndDelete(node.id);
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
            await Promise.all([
              PostDLLModel.findByIdAndUpdate(tailNode.id,  {
                next: null,
                prev: null,
                isHead: true,
                isTail: true
              }),
            ]);
          } else {
            await Promise.all([
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
          }
          await PostDLLModel.findByIdAndDelete(node.id);
          shouldMakeNewPostLive = true;
          newLivePostId = tailNode.val;
        }
      } else if (node.isTail) {
        console.log('Deleting Tail Node post');
        // Tail Node
        await Promise.all([
          PostDLLModel.findByIdAndUpdate(node.prev, {
            next: null,
            isTail: true,
          }),
          PostDLLModel.findByIdAndDelete(node.id)
        ]);
      } else {
        console.log('Deleting Post');
        const nextNode = await PostDLLModel.findById(node.next);
        if (nextNode) {
          await Promise.all([
            PostDLLModel.findByIdAndUpdate(nextNode.id, {
              prev: node.prev
            }),
            PostDLLModel.findByIdAndUpdate(node.prev, {
              next: node.next
            }),
            PostDLLModel.findByIdAndDelete(node.id)
          ]);
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

      await Promise.all([
        PostDLLModel.findByIdAndUpdate(tailNode.id, {
          isTail: false,
          next: newNode.id
        }),
        newNode.save()
      ]);
    }
  }
}

export {
  PostDLLService
};