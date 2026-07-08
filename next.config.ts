import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Prisma 6 resolves correctly under Turbopack without externalizing the
     client, which otherwise breaks module resolution in dev. */

  /* Vercel/serverless: force the generated Prisma client AND its native query
     engine binary into every route's function bundle. The client lives at a
     custom path (src/generated/prisma), and Next's file tracer can otherwise
     miss the dynamically-loaded engine for some routes — which shows up as a
     runtime 500 on those pages (e.g. the dashboard) while others (login) work. */
  outputFileTracingIncludes: {
    "/**": ["./src/generated/prisma/**/*"],
  },

  /* Teammates reach this dev server over the LAN (e.g. http://192.168.100.8:3000).
     Next 16 blocks cross-origin dev requests (HMR + server-action responses) by
     default, which makes edits silently fail on other laptops. Allow the LAN
     hosts here. If your machine's IP changes (DHCP), update this list. */
  allowedDevOrigins: ["192.168.100.8", "192.168.100.*"],
};

export default nextConfig;
