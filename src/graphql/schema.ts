import { createBuilder } from "./builder";
import { addBookmarkTypes } from "./types/bookmark";
import { addMessageTypes } from "./types/message";
import { addGroupTypes } from "./types/group";
import { addNotificationTypes } from "./types/notification";
import { addSafetyTypes } from "./types/safety";
import { addTweetTypes } from "./types/tweet";
import { addUserTypes } from "./types/user";

function buildSchema() {
  const builder = createBuilder();
  const Tweet = addTweetTypes(builder);
  addUserTypes(builder, { Tweet });
  addMessageTypes(builder);
  addGroupTypes(builder);
  addNotificationTypes(builder);
  addBookmarkTypes(builder);
  addSafetyTypes(builder);
  return builder.toSchema();
}

export const schema = buildSchema();
