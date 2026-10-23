/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  skipTrailingSlashRedirect: true,
  serverExternalPackages: ['ioredis', 'archiver'],
  httpAgentOptions: {
    keepAlive: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: '/admin/projects',
        destination: '/projects',
      },
      {
        source: '/admin/projects/new',
        destination: '/projects/new',
      },
      {
        source: '/admin/projects/:id/pages',
        destination: '/projects/:id/pages',
      },
      {
        source: '/admin/projects/:id/assignments',
        destination: '/projects/:id/assignments',
      },
      {
        source: '/admin/projects/:id/settings',
        destination: '/projects/:id/settings',
      },
      {
        source: '/admin/projects/:id/tasks',
        destination: '/projects/:id/tasks',
      },
      {
        source: '/admin/projects/:id',
        destination: '/projects/:id',
      },
      {
        source: '/admin/team',
        destination: '/team',
      },
      {
        source: '/admin/audit',
        destination: '/audit',
      },
      {
        source: '/admin/profile',
        destination: '/profile',
      },
    ];
  },
};

export default nextConfig;
