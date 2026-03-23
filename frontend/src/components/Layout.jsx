// src/components/Layout.jsx
import { useRouter } from 'next/router';

const navItems = [
  { href: '/inbox',     label: 'Inbox',    icon: '💬', roles: ['admin', 'employee'] },
  { href: '/funil',     label: 'Funil',    icon: '📊', roles: ['admin', 'employee'] },
  { href: '/estoque',   label: 'Estoque',  icon: '📦', roles: ['admin'] },
  { href: '/dashboard', label: 'Dashboard',icon: '⚡', roles: ['admin'] },
];

export default function Layout({ children }) {
  const router = useRouter();
  const user = typeof window !== 'undefined'
    ? JSON.parse(localStorage.getItem('user') || '{}')
    : {};

  const visible = navItems.filter(n => n.roles.includes(user.role));

  function logout() {
    localStorage.clear();
    router.push('/login');
  }

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'sans-serif' }}>
      {/* Sidebar */}
      <nav style={{ width: '200px', background: '#1e1e2e', color: '#ccc', display: 'flex', flexDirection: 'column', padding: '1rem 0' }}>
        {/* Logo / empresa */}
        <div style={{ padding: '0.5rem 1.25rem 1.25rem', borderBottom: '1px solid #333' }}>
          <div style={{ fontWeight: 700, color: '#fff', fontSize: '0.9rem' }}>{user.companyName || 'CRM'}</div>
          <div style={{ fontSize: '0.7rem', color: '#888', marginTop: '2px' }}>{user.name}</div>
        </div>

        {/* Links */}
        <div style={{ flex: 1, padding: '0.75rem 0' }}>
          {visible.map(item => (
            <a
              key={item.href}
              href={item.href}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '0.6rem 1.25rem',
                color: router.pathname === item.href ? '#fff' : '#aaa',
                background: router.pathname === item.href ? 'rgba(99,102,241,0.2)' : 'transparent',
                textDecoration: 'none',
                fontSize: '0.875rem',
                borderLeft: router.pathname === item.href ? '3px solid #6366f1' : '3px solid transparent',
                transition: 'all 0.15s',
              }}
            >
              <span style={{ fontSize: '16px' }}>{item.icon}</span>
              {item.label}
            </a>
          ))}
        </div>

        {/* Logout */}
        <button onClick={logout}
          style={{ margin: '0 1rem 1rem', padding: '0.5rem', background: 'transparent', color: '#888', border: '1px solid #333', borderRadius: '8px', cursor: 'pointer', fontSize: '0.8rem' }}>
          Sair
        </button>
      </nav>

      {/* Conteúdo */}
      <main style={{ flex: 1, overflowY: 'auto', background: '#f9f9f9' }}>
        {children}
      </main>
    </div>
  );
}
