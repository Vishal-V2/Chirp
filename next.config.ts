import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  turbopack: {
    rules: {
      "*.css": {
        // Tailwind only processes our own stylesheets. Packages' CSS (e.g.
        // react-tweet's CSS modules) must be left alone, or "as: *.css" turns
        // their scoped class names into plain global CSS and breaks them.
        condition: {
          all: [{ not: "foreign" }, { not: { path: /\.module\.css$/ } }],
        },
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
