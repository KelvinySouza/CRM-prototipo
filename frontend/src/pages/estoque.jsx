// src/pages/estoque.jsx  — Next.js
import { useState, useEffect } from 'react';

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

const STOCK_DANGER = 5;
const STOCK_WARN   = 10;

function stockColor(stock) {
  if (stock <= STOCK_DANGER) return '#ef4444';
  if (stock <= STOCK_WARN)   return '#f59e0b';
  return '#10b981';
}

export default function Estoque() {
  const api = useApi();
  const [products, setProducts] = useState([]);
  const [modal, setModal]       = useState(null); // { mode: 'create'|'edit'|'adjust', product? }
  const [form, setForm]         = useState({ name: '', description: '', price: '', stock: '' });
  const [delta, setDelta]       = useState('');
  const [saving, setSaving]     = useState(false);

  useEffect(() => { loadProducts(); }, []);

  async function loadProducts() {
    const data = await api('/products');
    if (Array.isArray(data)) setProducts(data);
  }

  function openCreate() {
    setForm({ name: '', description: '', price: '', stock: '' });
    setModal({ mode: 'create' });
  }

  function openEdit(p) {
    setForm({ name: p.name, description: p.description || '', price: p.price, stock: p.stock });
    setModal({ mode: 'edit', product: p });
  }

  function openAdjust(p) {
    setDelta('');
    setModal({ mode: 'adjust', product: p });
  }

  async function saveProduct() {
    setSaving(true);
    if (modal.mode === 'create') {
      await api('/products', {
        method: 'POST',
        body: JSON.stringify({ ...form, price: parseFloat(form.price), stock: parseInt(form.stock) || 0 }),
      });
    } else {
      await api(`/products/${modal.product.id}`, {
        method: 'PUT',
        body: JSON.stringify({ ...form, price: parseFloat(form.price), stock: parseInt(form.stock) }),
      });
    }
    setSaving(false);
    setModal(null);
    await loadProducts();
  }

  async function adjustStock() {
    if (!delta) return;
    setSaving(true);
    await api(`/products/${modal.product.id}/stock`, {
      method: 'PATCH',
      body: JSON.stringify({ delta: parseInt(delta) }),
    });
    setSaving(false);
    setModal(null);
    await loadProducts();
  }

  const totalValue = products.reduce((sum, p) => sum + parseFloat(p.price) * p.stock, 0);

  return (
    <div style={{ padding: '1.5rem', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600 }}>Estoque</h1>
          <span style={{ fontSize: '0.8rem', color: '#888' }}>
            Valor total em estoque: R$ {totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </span>
        </div>
        <button onClick={openCreate} style={{ background: '#6366f1', color: '#fff', border: 'none', padding: '0.6rem 1.2rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>
          + Produto
        </button>
      </div>

      {/* Tabela */}
      <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #eee', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f9f9f9', textAlign: 'left', fontSize: '0.8rem', color: '#888' }}>
              <th style={{ padding: '0.75rem 1rem' }}>Produto</th>
              <th style={{ padding: '0.75rem 1rem' }}>Preço</th>
              <th style={{ padding: '0.75rem 1rem' }}>Estoque</th>
              <th style={{ padding: '0.75rem 1rem' }}>Valor total</th>
              <th style={{ padding: '0.75rem 1rem' }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p, i) => (
              <tr key={p.id} style={{ borderTop: i ? '1px solid #f0f0f0' : 'none' }}>
                <td style={{ padding: '0.75rem 1rem' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{p.name}</div>
                  {p.description && <div style={{ fontSize: '0.75rem', color: '#888' }}>{p.description}</div>}
                </td>
                <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem' }}>
                  R$ {parseFloat(p.price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </td>
                <td style={{ padding: '0.75rem 1rem' }}>
                  <span style={{ fontWeight: 700, color: stockColor(p.stock), fontSize: '0.875rem' }}>
                    {p.stock}
                  </span>
                  {p.stock <= STOCK_WARN && (
                    <span style={{ marginLeft: '6px', fontSize: '0.7rem', background: p.stock <= STOCK_DANGER ? '#fee2e2' : '#fef9c3', color: p.stock <= STOCK_DANGER ? '#991b1b' : '#92400e', padding: '1px 6px', borderRadius: '99px' }}>
                      {p.stock <= STOCK_DANGER ? 'crítico' : 'baixo'}
                    </span>
                  )}
                </td>
                <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#555' }}>
                  R$ {(parseFloat(p.price) * p.stock).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </td>
                <td style={{ padding: '0.75rem 1rem', display: 'flex', gap: '6px' }}>
                  <button onClick={() => openAdjust(p)} style={{ background: '#e0e7ff', color: '#3730a3', border: 'none', padding: '4px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem' }}>
                    Ajustar
                  </button>
                  <button onClick={() => openEdit(p)} style={{ background: '#f0fdf4', color: '#166534', border: 'none', padding: '4px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem' }}>
                    Editar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: '#fff', borderRadius: '12px', padding: '1.5rem', width: '400px' }}>
            <h2 style={{ margin: '0 0 1rem', fontSize: '1rem', fontWeight: 600 }}>
              {modal.mode === 'create' ? 'Novo produto' : modal.mode === 'edit' ? 'Editar produto' : `Ajustar estoque — ${modal.product.name}`}
            </h2>

            {modal.mode === 'adjust' ? (
              <>
                <p style={{ fontSize: '0.875rem', color: '#555' }}>Estoque atual: <strong>{modal.product.stock}</strong></p>
                <label style={{ fontSize: '0.875rem' }}>Delta (+ entrada / - saída)</label>
                <input type="number" value={delta} onChange={e => setDelta(e.target.value)}
                  placeholder="ex: 10 ou -3"
                  style={{ width: '100%', padding: '0.6rem', border: '1px solid #ddd', borderRadius: '8px', marginTop: '4px', marginBottom: '1rem', boxSizing: 'border-box' }} />
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                  <button onClick={() => setModal(null)} style={{ padding: '0.5rem 1rem', border: '1px solid #ddd', borderRadius: '8px', cursor: 'pointer', background: '#fff' }}>Cancelar</button>
                  <button onClick={adjustStock} disabled={saving} style={{ padding: '0.5rem 1.2rem', background: '#6366f1', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
                    {saving ? 'Salvando...' : 'Confirmar'}
                  </button>
                </div>
              </>
            ) : (
              <>
                {['name', 'description', 'price', 'stock'].map(field => (
                  <div key={field} style={{ marginBottom: '0.75rem' }}>
                    <label style={{ fontSize: '0.8rem', display: 'block', marginBottom: '2px' }}>
                      {field === 'name' ? 'Nome' : field === 'description' ? 'Descrição' : field === 'price' ? 'Preço (R$)' : 'Estoque'}
                    </label>
                    <input
                      type={field === 'price' || field === 'stock' ? 'number' : 'text'}
                      value={form[field]}
                      onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
                      style={{ width: '100%', padding: '0.6rem', border: '1px solid #ddd', borderRadius: '8px', boxSizing: 'border-box' }}
                    />
                  </div>
                ))}
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '1rem' }}>
                  <button onClick={() => setModal(null)} style={{ padding: '0.5rem 1rem', border: '1px solid #ddd', borderRadius: '8px', cursor: 'pointer', background: '#fff' }}>Cancelar</button>
                  <button onClick={saveProduct} disabled={saving} style={{ padding: '0.5rem 1.2rem', background: '#6366f1', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
                    {saving ? 'Salvando...' : 'Salvar'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
