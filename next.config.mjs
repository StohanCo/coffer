/** @type {import('next').NextConfig} */
const nextConfig = {
  // Only use standalone in Docker (Linux); pnpm symlinks break it on Windows
  ...(process.env.DOCKER_BUILD === "1" && { output: "standalone" }),
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
        port: "3000",
        pathname: "/uploads/**",
      },
    ],
  },
};

export default nextConfig;
