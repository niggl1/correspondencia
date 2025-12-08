/** @type {import('next').NextConfig} */

// Detecta se é build de App ou Web
const isAppBuild = process.env.BUILD_TARGET === 'app';

const nextConfig = {
  // Modo App = Exportação Estática | Modo Web = Padrão (Servidor)
  output: isAppBuild ? 'export' : undefined,
  reactStrictMode: false,
  swcMinify: true,
  compress: true,
  trailingSlash: false,
  images: {
    // App precisa de unoptimized. Web pode usar otimização.
    unoptimized: isAppBuild,
    domains: [
      'firebasestorage.googleapis.com',
      'correspondencia-9a73a.firebasestorage.app',
    ],
    formats: ['image/avif', 'image/webp'],
  },
};

module.exports = nextConfig;
