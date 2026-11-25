import { createBuilder } from "./builder";
import { addTweetTypes } from "./types/tweet";
import { addUserTypes } from "./types/user";

function buildSchema() {
  const builder = createBuilder();
  addUserTypes(builder);
  addTweetTypes(builder);
  return builder.toSchema();
}

export const schema = buildSchema();
