import { getTweet } from "react-tweet/api";

/**
 * Fetches an X/Twitter post for link embeds (used by react-tweet in the
 * browser), so visitors' browsers never talk to X directly.
 */
export async function GET(
  _request: Request,
  ctx: RouteContext<"/api/tweet/[id]">,
) {
  const { id } = await ctx.params;
  if (!/^\d{1,25}$/.test(id)) {
    return Response.json({ error: "Invalid post id." }, { status: 400 });
  }
  try {
    const tweet = await getTweet(id);
    if (!tweet) {
      return Response.json(
        { error: "Post not found." },
        { status: 404, headers: cacheFor(300) },
      );
    }
    return Response.json({ data: tweet }, { headers: cacheFor(3600) });
  } catch {
    return Response.json({ error: "Couldn't load the post." }, { status: 502 });
  }
}

/** Let Vercel's CDN reuse the answer for a while. */
const cacheFor = (seconds: number) => ({
  "Cache-Control": `public, s-maxage=${seconds}, stale-while-revalidate=${seconds * 24}`,
});
