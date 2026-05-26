import test from 'node:test';
import assert from 'node:assert/strict';

import {
  shouldSkipCommentNotification,
  shouldSkipOwnSearchAlertNotification,
} from '../lib/notifications/self-notification.ts';

test('comment notification is skipped when the commenter is the post author', () => {
  assert.equal(
    shouldSkipCommentNotification({
      postAuthorId: 'author-1',
      postCreatedByUserId: 'author-1',
      commenterAuthorId: 'author-1',
      commenterUserId: 'author-1',
    }),
    true,
  );
});

test('comment notification is skipped when the same user comments via another author account', () => {
  assert.equal(
    shouldSkipCommentNotification({
      postAuthorId: 'managed-author',
      postCreatedByUserId: 'user-1',
      commenterAuthorId: 'user-1',
      commenterUserId: 'user-1',
    }),
    true,
  );
});

test('comment notification is kept for another user', () => {
  assert.equal(
    shouldSkipCommentNotification({
      postAuthorId: 'author-1',
      postCreatedByUserId: 'author-1',
      commenterAuthorId: 'user-2',
      commenterUserId: 'user-2',
    }),
    false,
  );
});

test('search alert kakao is skipped for the post creator', () => {
  assert.equal(
    shouldSkipOwnSearchAlertNotification({
      postAuthorId: 'managed-author',
      postCreatedByUserId: 'user-1',
      recipientUserId: 'user-1',
    }),
    true,
  );
});

test('search alert kakao is kept for another user', () => {
  assert.equal(
    shouldSkipOwnSearchAlertNotification({
      postAuthorId: 'author-1',
      postCreatedByUserId: 'user-1',
      recipientUserId: 'user-2',
    }),
    false,
  );
});
