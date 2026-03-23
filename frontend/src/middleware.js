// src/middleware.js  — Next.js 13+ edge middleware
// Protege rotas autenticadas e redireciona por role
import { NextResponse } from 'next/server';

// Rotas que exigem login
const PROTECTED = ['/inbox', '/funil', '/estoque', '/dashboard'];
// Rotas só para admin
const ADMIN_ONLY = ['/estoque', '/dashboard'];

export function middleware(request) {
  const { pathname } = request.nextUrl;

  // Pega token do cookie (veja nota abaixo sobre persistência)
  const token = request.cookies.get('token')?.value;
  const role  = request.cookies.get('role')?.value;

  const isProtected = PROTECTED.some(p => pathname.startsWith(p));
  const isAdminOnly = ADMIN_ONLY.some(p => pathname.startsWith(p));

  // Sem token → login
  if (isProtected && !token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Funcionário tentando acessar rota de admin
  if (isAdminOnly && role !== 'admin') {
    return NextResponse.redirect(new URL('/inbox', request.url));
  }

  // Já logado tentando acessar /login
  if (pathname === '/login' && token) {
    const dest = role === 'admin' ? '/dashboard' : '/inbox';
    return NextResponse.redirect(new URL(dest, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/login', '/inbox/:path*', '/funil/:path*', '/estoque/:path*', '/dashboard/:path*'],
};

/*
  NOTA: O middleware do Next.js roda no Edge — não tem acesso ao localStorage.
  Para funcionar, salve o token e role em cookies ao fazer login.
  Atualize o login.jsx para fazer isso:

    import Cookies from 'js-cookie'; // npm install js-cookie

    // Após login bem-sucedido:
    Cookies.set('token', data.token, { expires: 7, sameSite: 'strict' });
    Cookies.set('role', data.user.role, { expires: 7, sameSite: 'strict' });
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
*/
