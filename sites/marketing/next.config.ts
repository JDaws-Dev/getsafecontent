import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

// One-site: the hub fronts every Safe Family app under a path. Each app is a
// separate deployment; the hub proxies /tube/*, /tunes/*, … to it, prefix
// intact (each app is built with that prefix as its base path). Origins come
// from env so local dev, previews and production point at different builds.
//   ONE_SITE_ORIGIN_TUBE=http://localhost:5175   (local)
//   ONE_SITE_ORIGIN_TUBE=https://safetube-xxxx-family-planner.vercel.app (preview/prod)
// An unset origin leaves that path alone, so the hub is unaffected until each
// app is ready.
const ONE_SITE_APPS: Array<[string, string | undefined]> = [
  ["tunes", process.env.ONE_SITE_ORIGIN_TUNES],
  ["tube", process.env.ONE_SITE_ORIGIN_TUBE],
  ["reads", process.env.ONE_SITE_ORIGIN_READS],
  ["study", process.env.ONE_SITE_ORIGIN_STUDY],
  ["spark", process.env.ONE_SITE_ORIGIN_SPARK],
];

const nextConfig: NextConfig = {
  async rewrites() {
    const beforeFiles = ONE_SITE_APPS.flatMap(([path, origin]) => {
      if (!origin) return [];
      const base = origin.replace(/\/$/, "");
      return [
        { source: `/${path}`, destination: `${base}/${path}/` },
        { source: `/${path}/:slug*`, destination: `${base}/${path}/:slug*` },
      ];
    });
    return { beforeFiles, afterFiles: [], fallback: [] };
  },
  // Silence Turbopack warning - we need webpack for Velite
  turbopack: {},
  // Enable Velite content directory watching in dev
  webpack: (config) => {
    config.plugins.push(new VeliteWebpackPlugin());
    return config;
  },
};

class VeliteWebpackPlugin {
  static started = false;
  apply(compiler: any) {
    compiler.hooks.beforeCompile.tapPromise("VeliteWebpackPlugin", async () => {
      if (VeliteWebpackPlugin.started) return;
      VeliteWebpackPlugin.started = true;
      const dev = compiler.options.mode === "development";
      const { build } = await import("velite");
      await build({ watch: dev, clean: !dev });
    });
  }
}

export default withSentryConfig(nextConfig, {
  // Sentry build-time options
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,

  // Suppress source map upload logs during build
  silent: !process.env.CI,

  // Source map configuration
  sourcemaps: {
    // Delete source maps after uploading to Sentry
    deleteSourcemapsAfterUpload: true,
  },

  // Telemetry
  telemetry: false,
});
