// src/pages/dashboard.jsx  — Next.js (admin only)
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';

function useApi() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
  const base  = process.env.NEXT_PUBLIC_API;
  return async (path, opts = {}) => {
    const res = await fetch(`${base}${path}`, {
      ...opts,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(opts.headers || {}) },
    });
    if (res.status === 401) window.location.href = '/login';
    return res.json();
  };
}

function Card({ label, value, sub, color = '#6366f1' }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #eee', borderRadius: '12px', padding: '1.25rem', flex: 1, minWidth: '140px' }}>
      <div style={{ fontSize: '0.75rem', color: '#888', marginBottom: '0.5rem' }}>{label}</div>
      <div style={{ fontSize: '1.75rem', fontWeight: 700, color }}>{value}</div>
      {sub && <div style={{ fontSize: '0.75rem', color: '#aaa', marginTop: '4px' }}>{sub}</div>}
    </div>
  );
}

export default function Dashboard() {
  const router = useRouter();
  const api    = useApi();

  const [data, setData]   = useState(null);
  const [users, setUsers] = useState([]);
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'employee' });
  const [saving, setSaving]   = useState(false);
  const [tab, setTab]         = useState('overview');

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (user.role !== 'admin') { router.push('/inbox'); return; }
    loadData();
  }, []);

  async function loadData() {
    const [leadsData, ordersData, productsData, usersData] = await Promise.all([
      api('/leads'),
      api('/orders'),
      api('/products'),
      api('/users'),
    ]);

    const leads    = Array.isArray(leadsData)    ? leadsData    : [];
    const orders   = Array.isArray(ordersData)   ? ordersData   : [];
    const products = Array.isArray(productsData) ? productsData : [];

    const totalRevenue = orders
      .filter(o => o.status === 'paid')
      .reduce((sum, o) => sum + parseFloat(o.total), 0);

    const lowStock = products.filter(p => p.stock <= 10).length;

    setData({
      leadsTotal:    leads.length,
      leadsFechados: leads.filter(l => l.stage === 'fechado').length,
      ordersTotal:   orders.length,
      revenue:       totalRevenue,
      products:      products.length,
      lowStock,
      leads,
      orders: orders.slice(0, 8),
    });

    setUsers(Array.isArray(usersData) ? usersData : []);
  }

  async function createUser(e) {
    e.preventDefault();
    setSaving(true);
    await api('/users', { method: 'POST', body: JSON.stringify(newUser) });
    setSaving(false);
    setNewUser({ name: '', email: '', password: '', role: 'employee' });
    await loadData();
  }

  async function toggleUser(userId, active) {
    await api(`/users/${userId}/active`, { method: 'PATCH', body: JSON.stringify({ active }) });
    await loadData();
  }

  if (!data) return <div style={{ padding: '2rem', color: '#888' }}>Carregando...</div>;

  const convRate = data.leadsTotal
    ? ((data.leadsFechados / data.leadsTotal) * 100).toFixed(0)
    : 0;

  return (
    <div style={{ padding: '1.5rem', fontFamily: 'sans-serif', maxWidth: '1100px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600 }}>Dashboard</h1>
        <div style={{ display: 'flex', gap: '8px' }}>
          {['overview', 'equipe'].map(t => (
            <button key={t} onClick={() => setTab(t)}
              style={{ padding: '0.4rem 1rem', borderRadius: '8px', border: '1px solid #ddd', cursor: 'pointer', fontWeight: tab === t ? 600 : 400, background: tab === t ? '#6366f1' : '#fff', color: tab === t ? '#fff' : '#333' }}>
              {t === 'overview' ? 'Visão geral' : 'Equipe'}
            </button>
          ))}
        </div>
      </div>

      {tab === 'overview' && (
        <>
          {/* Cards de métricas */}
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
            <Card label="Receita (pago)" value={`R$ ${data.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`} sub="pedidos pagos" color="#059669" />
            <Card label="Leads" value={data.leadsTotal} sub={`${data.leadsFechados} fechados`} />
            <Card label="Taxa conversão" value={`${convRate}%`} sub="leads → fechado" color="#f59e0b" />
            <Card label="Pedidos" value={data.ordersTotal} />
            <Card label="Estoque baixo" value={data.lowStock} sub="produtos ≤ 10 un." color={data.lowStock > 0 ? '#ef4444' : '#10b981'} />
          </div>

          {/* Últimos pedidos */}
          <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #eee', overflow: 'hidden', marginBottom: '1.5rem' }}>
            <div style={{ padding: '1rem', borderBottom: '1px solid #eee', fontWeight: 600, fontSize: '0.875rem' }}>Últimos pedidos</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ background: '#f9f9f9', color: '#888', fontSize: '0.75rem' }}>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>Cliente</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>Total</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>Status</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>Data</th>
                </tr>
              </thead>
              <tbody>
                {data.orders.map((o, i) => (
                  <tr key={o.id} style={{ borderTop: i ? '1px solid #f0f0f0' : 'none' }}>
                    <td style={{ padding: '0.75rem 1rem' }}>{o.customer_name || '—'}</td>
                    <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>R$ {parseFloat(o.total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '99px', background: o.status === 'paid' ? '#dcfce7' : o.status === 'cancelled' ? '#fee2e2' : '#fef9c3', color: o.status === 'paid' ? '#166534' : o.status === 'cancelled' ? '#991b1b' : '#92400e' }}>
                        {o.status}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: '#888' }}>{new Date(o.created_at).toLocaleDateString('pt-BR')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === 'equipe' && (
        <>
          {/* Criar usuário */}
          <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #eee', padding: '1.25rem', marginBottom: '1.5rem' }}>
            <h3 style={{ margin: '0 0 1rem', fontSize: '0.875rem', fontWeight: 600 }}>Adicionar membro</h3>
            <form onSubmit={createUser} style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
              {[['name','Nome','text'], ['email','Email','email'], ['password','Senha','password']].map(([f, label, type]) => (
                <div key={f} style={{ flex: 1, minWidth: '140px' }}>
                  <label style={{ fontSize: '0.75rem', display: 'block', marginBottom: '2px', color: '#888' }}>{label}</label>
                  <input type={type} required value={newUser[f]} onChange={e => setNewUser(u => ({ ...u, [f]: e.target.value }))}
                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '8px', boxSizing: 'border-box' }} />
                </div>
              ))}
              <div>
                <label style={{ fontSize: '0.75rem', display: 'block', marginBottom: '2px', color: '#888' }}>Papel</label>
                <select value={newUser.role} onChange={e => setNewUser(u => ({ ...u, role: e.target.value }))}
                  style={{ padding: '0.5rem', border: '1px solid #ddd', borderRadius: '8px' }}>
                  <option value="employee">Funcionário</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <button type="submit" disabled={saving} style={{ padding: '0.5rem 1.2rem', background: '#6366f1', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
                {saving ? '...' : 'Criar'}
              </button>
            </form>
          </div>

          {/* Lista de usuários */}
          <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #eee', overflow: 'hidden' }}>
            {users.map((u, i) => (
              <div key={u.id} style={{ display: 'flex', alignItems: 'center', padding: '0.875rem 1rem', borderTop: i ? '1px solid #f0f0f0' : 'none' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{u.name}</div>
                  <div style={{ fontSize: '0.75rem', color: '#888' }}>{u.email}</div>
                </div>
                <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '99px', background: u.role === 'admin' ? '#ede9fe' : '#e0f2fe', color: u.role === 'admin' ? '#4c1d95' : '#0369a1', marginRight: '12px' }}>
                  {u.role === 'admin' ? 'Admin' : 'Funcionário'}
                </span>
                <button onClick={() => toggleUser(u.id, !u.active)}
                  style={{ padding: '4px 10px', border: '1px solid #ddd', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', background: u.active ? '#fff' : '#f5f5f5', color: u.active ? '#ef4444' : '#10b981' }}>
                  {u.active ? 'Desativar' : 'Ativar'}
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
