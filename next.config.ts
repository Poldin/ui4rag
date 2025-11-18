import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb', // Aumentato da 1mb a 10mb
    },
  },
  async rewrites() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    
    // If Supabase URL is not configured, return empty rewrites
    if (!supabaseUrl) {
      console.warn('⚠️  NEXT_PUBLIC_SUPABASE_URL is not set. Supabase auth proxy disabled.');
      return [];
    }

    return [
      {
        source: '/auth/v1/:path*',
        destination: `${supabaseUrl}/auth/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
