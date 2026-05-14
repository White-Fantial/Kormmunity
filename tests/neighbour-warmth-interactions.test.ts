import test from 'node:test';
import assert from 'node:assert/strict';

import {
  NEIGHBOUR_WARMTH_BASE_GAINS,
  NEIGHBOUR_WARMTH_BASE_DEDUCTIONS,
  NEIGHBOUR_WARMTH_DEFAULT,
  adjustNeighbourWarmth,
} from '../lib/neighbour-warmth.ts';

type UserState = {
  id: string;
  warmth: number;
};

type PostState = {
  id: string;
  authorId: string;
  bestCommentId: string | null;
};

type CommentState = {
  id: string;
  postId: string;
  authorId: string;
};

class InMemoryNeighbourInteractions {
  private readonly users = new Map<string, UserState>();
  private readonly posts = new Map<string, PostState>();
  private readonly comments = new Map<string, CommentState>();
  private readonly postLikes = new Set<string>();
  private readonly commentLikes = new Set<string>();

  addUser(id: string, warmth = NEIGHBOUR_WARMTH_DEFAULT) {
    this.users.set(id, { id, warmth });
  }

  addPost(id: string, authorId: string) {
    this.posts.set(id, { id, authorId, bestCommentId: null });
  }

  addComment(id: string, postId: string, authorId: string) {
    this.comments.set(id, { id, postId, authorId });
  }

  getWarmth(userId: string) {
    const user = this.users.get(userId);
    if (!user) throw new Error('user not found');
    return user.warmth;
  }

  getBestCommentId(postId: string) {
    return this.posts.get(postId)?.bestCommentId ?? null;
  }

  togglePostLike(userId: string, postId: string) {
    const post = this.posts.get(postId);
    if (!post) throw new Error('post not found');

    const key = `${postId}:${userId}`;
    if (this.postLikes.has(key)) {
      this.postLikes.delete(key);
      return { liked: false };
    }

    this.postLikes.add(key);
    if (post.authorId !== userId) {
      const postAuthor = this.users.get(post.authorId);
      if (!postAuthor) throw new Error('post author not found');
      postAuthor.warmth = adjustNeighbourWarmth(
        postAuthor.warmth,
        NEIGHBOUR_WARMTH_BASE_GAINS.POST_LIKE_RECEIVED,
      );
    }

    return { liked: true };
  }

  forcePostLike(userId: string, postId: string) {
    const key = `${postId}:${userId}`;
    if (this.postLikes.has(key)) return false;
    this.postLikes.add(key);
    return true;
  }

  toggleCommentLike(userId: string, commentId: string) {
    const comment = this.comments.get(commentId);
    if (!comment) throw new Error('comment not found');

    const key = `${commentId}:${userId}`;
    if (this.commentLikes.has(key)) {
      this.commentLikes.delete(key);
      return { liked: false };
    }

    this.commentLikes.add(key);
    if (comment.authorId !== userId) {
      const commentAuthor = this.users.get(comment.authorId);
      if (!commentAuthor) throw new Error('comment author not found');
      commentAuthor.warmth = adjustNeighbourWarmth(
        commentAuthor.warmth,
        NEIGHBOUR_WARMTH_BASE_GAINS.COMMENT_LIKE_RECEIVED,
      );
    }

    return { liked: true };
  }

  forceCommentLike(userId: string, commentId: string) {
    const key = `${commentId}:${userId}`;
    if (this.commentLikes.has(key)) return false;
    this.commentLikes.add(key);
    return true;
  }

  setBestComment(actorId: string, postId: string, commentId: string) {
    const post = this.posts.get(postId);
    const comment = this.comments.get(commentId);
    if (!post || !comment) throw new Error('missing post or comment');
    if (post.authorId !== actorId) throw new Error('forbidden');
    if (comment.postId !== postId) throw new Error('invalid-comment-post');

    const isChanged = post.bestCommentId !== comment.id;
    post.bestCommentId = comment.id;
    if (isChanged && comment.authorId !== actorId) {
      const commentAuthor = this.users.get(comment.authorId);
      if (!commentAuthor) throw new Error('comment author not found');
      commentAuthor.warmth = adjustNeighbourWarmth(
        commentAuthor.warmth,
        NEIGHBOUR_WARMTH_BASE_GAINS.BEST_COMMENT_SELECTED,
      );
    }
  }
}

function createFixture() {
  const fixture = new InMemoryNeighbourInteractions();
  fixture.addUser('post-author');
  fixture.addUser('comment-author');
  fixture.addUser('other-user');
  fixture.addPost('post-1', 'post-author');
  fixture.addPost('post-2', 'other-user');
  fixture.addComment('comment-1', 'post-1', 'comment-author');
  fixture.addComment('comment-2', 'post-2', 'other-user');
  return fixture;
}

test('user can like/unlike post', () => {
  const fixture = createFixture();

  const first = fixture.togglePostLike('other-user', 'post-1');
  const second = fixture.togglePostLike('other-user', 'post-1');

  assert.equal(first.liked, true);
  assert.equal(second.liked, false);
});

test('duplicate post likes prevented', () => {
  const fixture = createFixture();

  assert.equal(fixture.forcePostLike('other-user', 'post-1'), true);
  assert.equal(fixture.forcePostLike('other-user', 'post-1'), false);
});

test('user can like/unlike comment', () => {
  const fixture = createFixture();

  const first = fixture.toggleCommentLike('other-user', 'comment-1');
  const second = fixture.toggleCommentLike('other-user', 'comment-1');

  assert.equal(first.liked, true);
  assert.equal(second.liked, false);
});

test('duplicate comment likes prevented', () => {
  const fixture = createFixture();

  assert.equal(fixture.forceCommentLike('other-user', 'comment-1'), true);
  assert.equal(fixture.forceCommentLike('other-user', 'comment-1'), false);
});

test('post author can select best comment', () => {
  const fixture = createFixture();

  fixture.setBestComment('post-author', 'post-1', 'comment-1');

  assert.equal(fixture.getBestCommentId('post-1'), 'comment-1');
});

test('non-author cannot select best comment', () => {
  const fixture = createFixture();

  assert.throws(() => {
    fixture.setBestComment('other-user', 'post-1', 'comment-1');
  }, /forbidden/);
});

test('best comment must belong to same post', () => {
  const fixture = createFixture();

  assert.throws(() => {
    fixture.setBestComment('post-author', 'post-1', 'comment-2');
  }, /invalid-comment-post/);
});

test('warmth increases from post/comment likes', () => {
  const fixture = createFixture();

  const postAuthorBefore = fixture.getWarmth('post-author');
  const commentAuthorBefore = fixture.getWarmth('comment-author');

  fixture.togglePostLike('other-user', 'post-1');
  fixture.toggleCommentLike('other-user', 'comment-1');

  const postAuthorAfter = fixture.getWarmth('post-author');
  const commentAuthorAfter = fixture.getWarmth('comment-author');

  assert.ok(postAuthorAfter > postAuthorBefore);
  assert.ok(commentAuthorAfter > commentAuthorBefore);
});

test('warmth increases more from best comment', () => {
  const fixture = createFixture();

  const likeBefore = fixture.getWarmth('comment-author');
  fixture.toggleCommentLike('other-user', 'comment-1');
  const likeAfter = fixture.getWarmth('comment-author');

  const bestBefore = fixture.getWarmth('comment-author');
  fixture.setBestComment('post-author', 'post-1', 'comment-1');
  const bestAfter = fixture.getWarmth('comment-author');

  const likeGain = likeAfter - likeBefore;
  const bestGain = bestAfter - bestBefore;

  assert.ok(bestGain > likeGain);
});

test('warmth clamped between 0 and 100', () => {
  assert.equal(adjustNeighbourWarmth(-999, 0), 0);
  assert.equal(adjustNeighbourWarmth(999, 0), 100);
  assert.ok(adjustNeighbourWarmth(99.99, 50) <= 100);
  assert.ok(adjustNeighbourWarmth(99.99, 50) > 99.99);
});

test('moderation deduction constants match policy', () => {
  assert.equal(NEIGHBOUR_WARMTH_BASE_DEDUCTIONS.VALID_POST_REPORT, -1.0);
  assert.equal(NEIGHBOUR_WARMTH_BASE_DEDUCTIONS.VALID_COMMENT_REPORT, -1.2);
  assert.equal(NEIGHBOUR_WARMTH_BASE_DEDUCTIONS.COORDINATOR_HOLDS, -3.0);
  assert.equal(NEIGHBOUR_WARMTH_BASE_DEDUCTIONS.ADMIN_DELETES, -6.0);
  assert.equal(NEIGHBOUR_WARMTH_BASE_DEDUCTIONS.FALSE_REPORT, -2.0);
});

test('positive warmth delta scales down near max warmth', () => {
  const gainAtBase = adjustNeighbourWarmth(36.5, 1) - 36.5;
  const gainNearMax = adjustNeighbourWarmth(95, 1) - 95;
  assert.ok(gainNearMax < gainAtBase);
});

test('negative warmth delta scales down near min warmth', () => {
  const dropAtBase = adjustNeighbourWarmth(36.5, -1) - 36.5;
  const dropNearMin = adjustNeighbourWarmth(5, -1) - 5;
  assert.ok(Math.abs(dropNearMin) < Math.abs(dropAtBase));
});
