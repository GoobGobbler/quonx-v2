
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
    ],
  },
  experimental: {
    // Add required external packages here
    serverComponentsExternalPackages: [
      'react-syntax-highlighter',
      'genkitx-ollama', // Ensure this is present and correct
      '@genkit-ai/openrouter',
      '@genkit-ai/huggingface',
      '@genkit-ai/googleai'
    ],
  },
};

export default nextConfig;
