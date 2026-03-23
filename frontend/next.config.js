// frontend/next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Variável de ambiente server-side para getServerSideProps
  env: {
    API_URL: process.env.API_URL || 'http://localhost:3001',
  },

  // Permite imagens de qualquer domínio (logos das empresas)
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
    ],
  },
};

module.exports = nextConfig;
