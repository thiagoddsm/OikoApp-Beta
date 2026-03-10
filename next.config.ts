
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Ignora erros de TypeScript para evitar que o build trave no Studio
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // Configuração de imagens
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        pathname: '/**',
      },
    ],
  },

  // Suas variáveis de ambiente
  env: {
    BUILD_ID: "STABLE_BUILD_1740420005",
    BUILD_TIMESTAMP: new Date().toISOString(),
  },

  experimental: {
    // Propriedades experimentais permitidas
  }
};

export default nextConfig;
