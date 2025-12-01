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
    unoptimized: isAppBuild ? true : false,
    domains: [
      'firebasestorage.googleapis.com',
      'app-correspondencia-1a054.firebasestorage.app',
    ],
    formats: ['image/avif', 'image/webp'],
  },

  // 👇 SALVA-VIDAS DA VERCEL:
  // Transforma links antigos /ver/123 em /ver?id=123 automaticamente no servidor
  async rewrites() {
    if (isAppBuild) return []; // Não usa em modo App
    return [
      {
        source: '/ver/:id',
        destination: '/ver?id=:id',
      },
    ];
  },
};

module.exports = nextConfig;