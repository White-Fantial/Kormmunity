type CommentNotificationGuardInput = {
  postAuthorId: string;
  postCreatedByUserId: string | null;
  commenterAuthorId: string;
  commenterUserId: string;
};

type SearchAlertNotificationGuardInput = {
  postAuthorId: string;
  postCreatedByUserId: string | null;
  recipientUserId: string;
};

export function shouldSkipCommentNotification(input: CommentNotificationGuardInput) {
  return (
    input.postAuthorId === input.commenterAuthorId ||
    input.postAuthorId === input.commenterUserId ||
    input.postCreatedByUserId === input.commenterUserId
  );
}

export function shouldSkipOwnSearchAlertNotification(input: SearchAlertNotificationGuardInput) {
  return (
    input.postAuthorId === input.recipientUserId ||
    input.postCreatedByUserId === input.recipientUserId
  );
}
