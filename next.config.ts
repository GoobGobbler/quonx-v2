
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
      // '@genkit-ai/openrouter', // Removed as package@1.8.0 not found
      // '@genkit-ai/huggingface', // Removed as package@1.8.0 not found
      '@genkit-ai/googleai' // Ensure this is present and correct
    ],
  },
};

export default nextConfig;
