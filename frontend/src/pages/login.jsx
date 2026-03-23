// src/pages/login.jsx  — versão com cookies para middleware
import { useState } from 'react';
import { useRouter } from 'next/router';

function setCookie(name, value, days) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Strict`;
}

export default function Login() {
  const router = useRouter();
  const [form, setForm]       = useState({ email: '', password: '' });
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res  = await fetch(`${process.env.NEXT_PUBLIC_API}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Erro ao fazer login'); return; }

      setCookie('token', data.token, 7);
      setCookie('role',  data.user.role, 7);
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      router.push(data.user.role === 'admin' ? '/dashboard' : '/inbox');
    } catch {
      setError('Erro de conexão com o servidor');
    } finally {
      setLoading(false);
    }
  }

  const inp = { width:'100%', padding:'0.65rem 0.875rem', border:'1px solid #e0e0e0', borderRadius:'8px', fontSize:'0.9rem', boxSizing:'border-box' };
  const lbl = { display:'block', fontSize:'0.8rem', fontWeight:500, marginBottom:'4px', color:'#555' };

  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#f4f4f8' }}>
      <div style={{ background:'#fff', padding:'2.5rem', borderRadius:'16px', width:'380px', boxShadow:'0 4px 24px rgba(0,0,0,0.07)' }}>
        <div style={{ marginBottom:'2rem' }}>
          <div style={{ width:'36px', height:'36px', background:'#6366f1', borderRadius:'10px', marginBottom:'1rem' }} />
          <h1 style={{ margin:0, fontSize:'1.4rem', fontWeight:700 }}>Entrar</h1>
          <p style={{ margin:'4px 0 0', fontSize:'0.875rem', color:'#888' }}>Acesse sua conta</p>
        </div>
        {error && (
          <div style={{ background:'#fff1f1', color:'#c0392b', padding:'0.75rem 1rem', borderRadius:'8px', marginBottom:'1rem', fontSize:'0.85rem', borderLeft:'3px solid #e74c3c' }}>
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom:'1rem' }}>
            <label style={lbl}>Email</label>
            <input type="email" required value={form.email} onChange={e => setForm(f=>({...f,email:e.target.value}))} placeholder="seu@email.com" style={inp} />
          </div>
          <div style={{ marginBottom:'1.5rem' }}>
            <label style={lbl}>Senha</label>
            <input type="password" required value={form.password} onChange={e => setForm(f=>({...f,password:e.target.value}))} placeholder="••••••••" style={inp} />
          </div>
          <button type="submit" disabled={loading} style={{ width:'100%', padding:'0.75rem', background:loading?'#a5a6f6':'#6366f1', color:'#fff', border:'none', borderRadius:'8px', fontWeight:600, fontSize:'0.9rem', cursor:loading?'not-allowed':'pointer' }}>
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}
