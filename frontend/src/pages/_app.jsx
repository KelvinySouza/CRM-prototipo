// src/pages/_app.jsx
import '../styles/globals.css';

// Páginas que NÃO usam o Layout lateral
const NO_LAYOUT = ['/login', '/loja/[domain]'];

export default function App({ Component, pageProps, router }) {
  const noLayout = NO_LAYOUT.some(p => router.pathname === p || router.pathname.startsWith('/loja/'));

  // Páginas com layout usam o componente Layout internamente
  // (cada página importa e usa <Layout> diretamente)
  return <Component {...pageProps} />;
}
