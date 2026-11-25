// Temporary sample data for building the UI. Shapes mirror the GraphQL
// schema so swapping in real queries later is a small change.

export type MockUser = {
  id: string;
  username: string;
  displayName: string;
  bio?: string;
  avatarUrl?: string;
  bannerUrl?: string;
  createdAt: string;
  followerCount: number;
  followingCount: number;
  viewerIsFollowing: boolean;
};

export type MockTweet = {
  id: string;
  content: string;
  createdAt: string;
  author: MockUser;
  likeCount: number;
  retweetCount: number;
  replyCount: number;
  viewerHasLiked: boolean;
  viewerHasRetweeted: boolean;
  /** Set when this tweet is a reply. Mirrors `parent { id author }` in GraphQL. */
  parent?: { id: string; author: MockUser };
};

const minutesAgo = (m: number) =>
  new Date(Date.now() - m * 60_000).toISOString();
const daysAgo = (d: number) => minutesAgo(d * 24 * 60);

export const currentUser: MockUser = {
  id: "u0",
  username: "you",
  createdAt: daysAgo(120),
  displayName: "You",
  bio: "Building Chirp.",
  followerCount: 128,
  followingCount: 96,
  viewerIsFollowing: false,
};

export const users: Record<string, MockUser> = {
  ada: {
    id: "u1",
    username: "ada_codes",
    createdAt: daysAgo(800),
    displayName: "Ada Park",
    bio: "Frontend engineer. Coffee, CSS, and cats.",
    followerCount: 4210,
    followingCount: 312,
    viewerIsFollowing: true,
  },
  sam: {
    id: "u2",
    username: "samrivera",
    createdAt: daysAgo(1500),
    displayName: "Sam Rivera",
    bio: "Product designer. Opinions on typography.",
    followerCount: 18300,
    followingCount: 540,
    viewerIsFollowing: true,
  },
  lin: {
    id: "u3",
    username: "lin_dev",
    createdAt: daysAgo(400),
    displayName: "Lin Zhou",
    bio: "Postgres enjoyer.",
    followerCount: 920,
    followingCount: 201,
    viewerIsFollowing: false,
  },
  maya: {
    id: "u4",
    username: "mayabuilds",
    createdAt: daysAgo(2100),
    displayName: "Maya Okafor",
    bio: "Indie hacker shipping in public.",
    followerCount: 56100,
    followingCount: 88,
    viewerIsFollowing: false,
  },
  theo: {
    id: "u5",
    username: "theo_k",
    createdAt: daysAgo(30),
    displayName: "Theo Kim",
    followerCount: 310,
    followingCount: 410,
    viewerIsFollowing: false,
  },
};

export const tweets: MockTweet[] = [
  {
    id: "t1",
    author: users.sam,
    content:
      "Hot take: most UI problems are spacing problems. Fix your spacing scale and half your design debt disappears.",
    createdAt: minutesAgo(4),
    likeCount: 342,
    retweetCount: 51,
    replyCount: 27,
    viewerHasLiked: false,
    viewerHasRetweeted: false,
  },
  {
    id: "t2",
    author: users.ada,
    content:
      "Finally moved our app to Tailwind v4. The CSS-first config is so much nicer than the old JS file.",
    createdAt: minutesAgo(38),
    likeCount: 88,
    retweetCount: 9,
    replyCount: 12,
    viewerHasLiked: true,
    viewerHasRetweeted: false,
  },
  {
    id: "t3",
    author: users.maya,
    content:
      "Day 41 of building in public.\n\nRevenue: $1,240 MRR\nUsers: 860\nBugs fixed today: 7\nBugs created today: 9\n\nProgress is progress.",
    createdAt: minutesAgo(95),
    likeCount: 2400,
    retweetCount: 310,
    replyCount: 145,
    viewerHasLiked: false,
    viewerHasRetweeted: true,
  },
  {
    id: "t4",
    author: users.lin,
    content:
      "PSA: add an index on your foreign keys. Postgres doesn't do it for you, and your joins will thank you.",
    createdAt: minutesAgo(60 * 5),
    likeCount: 610,
    retweetCount: 132,
    replyCount: 40,
    viewerHasLiked: false,
    viewerHasRetweeted: false,
  },
  {
    id: "t5",
    author: users.theo,
    content: "Just set up my first GraphQL API. Why did nobody tell me about GraphiQL sooner?",
    createdAt: minutesAgo(60 * 26),
    likeCount: 14,
    retweetCount: 1,
    replyCount: 3,
    viewerHasLiked: false,
    viewerHasRetweeted: false,
  },
];

tweets.push(
  {
    id: "t6",
    author: currentUser,
    content: "Hello world! First post on Chirp.",
    createdAt: minutesAgo(60 * 3),
    likeCount: 5,
    retweetCount: 0,
    replyCount: 1,
    viewerHasLiked: false,
    viewerHasRetweeted: false,
  },
  {
    id: "t7",
    author: currentUser,
    content: "Building a Twitter-style app with Next.js, GraphQL and Prisma. One step at a time.",
    createdAt: daysAgo(2),
    likeCount: 21,
    retweetCount: 3,
    replyCount: 4,
    viewerHasLiked: false,
    viewerHasRetweeted: false,
  },
);

// Replies. `r3` replies to `r1`, so it shows a two-level thread.
const replies: [id: string, author: MockUser, parentId: string, content: string, minsAgo: number][] = [
  ["r1", users.ada, "t1", "Spacing and a type scale. Get those two right and you're 80% of the way there.", 3],
  ["r2", users.lin, "t1", "Counterpoint: most UI problems are naming problems.", 2],
  ["r3", users.sam, "r1", "Exactly. A type scale is just spacing for letters.", 1],
  ["r4", currentUser, "t3", "Congrats on the progress! What's your stack?", 80],
  ["r5", users.maya, "r4", "Next.js + Postgres. Boring tech, ships fast.", 70],
  ["r6", users.ada, "t5", "Wait until you try codegen with it. Typed queries are a game changer.", 60 * 25],
];

for (const [id, author, parentId, content, mins] of replies) {
  tweets.push({
    id,
    author,
    content,
    createdAt: minutesAgo(mins),
    likeCount: Math.floor(mins % 7) * 3,
    retweetCount: 0,
    replyCount: 0,
    viewerHasLiked: false,
    viewerHasRetweeted: false,
    parent: { id: parentId, author: tweets.find((t) => t.id === parentId)!.author },
  });
}

// Keep reply counts consistent with the replies that actually exist.
for (const tweet of tweets) {
  tweet.replyCount = tweets.filter((t) => t.parent?.id === tweet.id).length;
}

const newestFirst = (a: MockTweet, b: MockTweet) => b.createdAt.localeCompare(a.createdAt);
const oldestFirst = (a: MockTweet, b: MockTweet) => a.createdAt.localeCompare(b.createdAt);

/** Top-level tweets for the home feed (replies are excluded, like the GraphQL feeds). */
export function getHomeFeed(): MockTweet[] {
  return tweets.filter((t) => !t.parent).sort(newestFirst);
}

export function getTweetById(id: string): MockTweet | undefined {
  return tweets.find((t) => t.id === id);
}

/** Direct replies to a tweet, oldest first. */
export function getReplies(tweetId: string): MockTweet[] {
  return tweets.filter((t) => t.parent?.id === tweetId).sort(oldestFirst);
}

/** The chain of tweets this one is replying to, root first. */
export function getAncestors(tweet: MockTweet): MockTweet[] {
  const chain: MockTweet[] = [];
  let parentId = tweet.parent?.id;
  while (parentId) {
    const parent = getTweetById(parentId);
    if (!parent) break;
    chain.unshift(parent);
    parentId = parent.parent?.id;
  }
  return chain;
}

export function getRepliesByAuthor(username: string): MockTweet[] {
  return tweets
    .filter((t) => t.parent && t.author.username === username)
    .sort(newestFirst);
}

const allUsers = [currentUser, ...Object.values(users)];

export function getUserByUsername(username: string): MockUser | undefined {
  const name = username.toLowerCase();
  return allUsers.find((u) => u.username.toLowerCase() === name);
}

/** A user's top-level posts (not replies), newest first. */
export function getTweetsByAuthor(username: string): MockTweet[] {
  return tweets
    .filter((t) => !t.parent && t.author.username === username)
    .sort(newestFirst);
}

/** Tweets the signed-in user has liked. */
export function getLikedTweets(): MockTweet[] {
  return tweets.filter((t) => t.viewerHasLiked).sort(newestFirst);
}

export const whoToFollow: MockUser[] = [users.maya, users.lin, users.theo];

export const trends = [
  { category: "Technology · Trending", topic: "Next.js 16", posts: 12400 },
  { category: "Design · Trending", topic: "#DesignSystems", posts: 5310 },
  { category: "Trending", topic: "Postgres", posts: 8820 },
  { category: "Programming · Trending", topic: "TypeScript", posts: 30100 },
];
