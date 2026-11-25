import { createBuilder } from "./builder";
import { addBookmarkTypes } from "./types/bookmark";
import { addMessageTypes } from "./types/message";
import { addNotificationTypes } from "./types/notification";
import { addTweetTypes } from "./types/tweet";
import { addUserTypes } from "./types/user";

function buildSchema() {
  const builder = createBuilder();
  const Tweet = addTweetTypes(builder);
  addUserTypes(builder, { Tweet });
  addMessageTypes(builder);
  addNotificationTypes(builder);
  addBookmarkTypes(builder);
  return builder.toSchema();
}

export const schema = buildSchema();
