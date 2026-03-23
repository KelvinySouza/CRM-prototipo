// src/pages/loja/[domain].jsx  — loja pública de cada empresa
import { useState } from 'react';

export async function getServerSideProps({ params }) {
  try {
    const res = await fetch(`${process.env.API_URL}/${params.domain}`);
    if (!res.ok) return { notFound: true };
    const data = await res.json();
    return { props: data };
  } catch {
    return { notFound: true };
  }
}

export default function Loja({ company, products = [] }) {
  const [cart, setCart]     = useState([]); // [{ product, qty }]
  const [checkout, setCheckout] = useState(false);
  const [form, setForm]     = useState({ name: '', phone: '', email: '' });
  const [success, setSuccess] = useState(false);

  function addToCart(product) {
    setCart(prev => {
      const existing = prev.find(i => i.product.id === product.id);
      if (existing) return prev.map(i => i.product.id === product.id ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { product, qty: 1 }];
    });
  }

  function removeFromCart(productId) {
    setCart(prev => prev.filter(i => i.product.id !== productId));
  }

  const total = cart.reduce((sum, i) => sum + parseFloat(i.product.price) * i.qty, 0);
  const primary = company.primaryColor || '#6366f1';

  async function submitOrder(e) {
    e.preventDefault();
    // Em produção: criar customer + order via API
    // Por ora simula sucesso
    setSuccess(true);
  }

  if (success) {
    return (
      <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'sans-serif', background:'#f9f9f9' }}>
        <div style={{ background:'#fff', padding:'2.5rem', borderRadius:'16px', textAlign:'center', boxShadow:'0 4px 24px rgba(0,0,0,0.07)' }}>
          <div style={{ fontSize:'3rem', marginBottom:'1rem' }}>✅</div>
          <h2 style={{ margin:'0 0 0.5rem' }}>Pedido recebido!</h2>
          <p style={{ color:'#888', margin:0 }}>Entraremos em contato em breve.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ fontFamily:'sans-serif', background:'#f9f9f9', minHeight:'100vh' }}>

      {/* Header */}
      <header style={{ background: primary, color:'#fff', padding:'1rem 2rem', display:'flex', alignItems:'center', gap:'1rem' }}>
        {company.logoUrl && <img src={company.logoUrl} alt="logo" style={{ height:'36px', borderRadius:'6px' }} />}
        <h1 style={{ margin:0, fontSize:'1.2rem', fontWeight:700 }}>{company.name}</h1>
      </header>

      <div style={{ maxWidth:'1100px', margin:'0 auto', padding:'2rem', display:'flex', gap:'2rem', alignItems:'flex-start' }}>

        {/* Produtos */}
        <div style={{ flex:1 }}>
          <h2 style={{ fontSize:'1rem', fontWeight:600, marginBottom:'1.25rem', color:'#444' }}>Produtos</h2>
          {products.length === 0 && <p style={{ color:'#aaa' }}>Nenhum produto disponível no momento.</p>}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))', gap:'16px' }}>
            {products.map(p => {
              const inCart = cart.find(i => i.product.id === p.id);
              return (
                <div key={p.id} style={{ background:'#fff', borderRadius:'12px', overflow:'hidden', boxShadow:'0 2px 8px rgba(0,0,0,0.06)', display:'flex', flexDirection:'column' }}>
                  <div style={{ height:'140px', background:'#f0f0f0', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'2.5rem' }}>📦</div>
                  <div style={{ padding:'1rem', flex:1, display:'flex', flexDirection:'column' }}>
                    <div style={{ fontWeight:600, fontSize:'0.9rem', marginBottom:'4px' }}>{p.name}</div>
                    {p.description && <div style={{ fontSize:'0.75rem', color:'#888', marginBottom:'8px', flex:1 }}>{p.description}</div>}
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:'auto' }}>
                      <div style={{ fontWeight:700, color: primary }}>
                        R$ {parseFloat(p.price).toLocaleString('pt-BR',{minimumFractionDigits:2})}
                      </div>
                      <button onClick={() => addToCart(p)} style={{ background: inCart?'#d1fae5':primary, color: inCart?'#166534':'#fff', border:'none', padding:'5px 12px', borderRadius:'8px', cursor:'pointer', fontSize:'0.8rem', fontWeight:600 }}>
                        {inCart ? `+1 (${inCart.qty})` : 'Adicionar'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Carrinho */}
        {cart.length > 0 && (
          <div style={{ width:'300px', background:'#fff', borderRadius:'12px', padding:'1.25rem', boxShadow:'0 2px 8px rgba(0,0,0,0.06)', position:'sticky', top:'1rem' }}>
            <h3 style={{ margin:'0 0 1rem', fontSize:'0.95rem', fontWeight:600 }}>Carrinho ({cart.length})</h3>

            {cart.map(({ product, qty }) => (
              <div key={product.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 0', borderBottom:'1px solid #f0f0f0' }}>
                <div>
                  <div style={{ fontSize:'0.85rem', fontWeight:500 }}>{product.name}</div>
                  <div style={{ fontSize:'0.75rem', color:'#888' }}>{qty}x R$ {parseFloat(product.price).toLocaleString('pt-BR',{minimumFractionDigits:2})}</div>
                </div>
                <button onClick={() => removeFromCart(product.id)} style={{ background:'none', border:'none', color:'#ccc', cursor:'pointer', fontSize:'1rem' }}>✕</button>
              </div>
            ))}

            <div style={{ display:'flex', justifyContent:'space-between', fontWeight:700, padding:'12px 0 0' }}>
              <span>Total</span>
              <span>R$ {total.toLocaleString('pt-BR',{minimumFractionDigits:2})}</span>
            </div>

            {!checkout ? (
              <button onClick={() => setCheckout(true)} style={{ width:'100%', marginTop:'1rem', padding:'0.75rem', background:primary, color:'#fff', border:'none', borderRadius:'8px', fontWeight:600, cursor:'pointer' }}>
                Finalizar pedido
              </button>
            ) : (
              <form onSubmit={submitOrder} style={{ marginTop:'1rem' }}>
                {[['name','Nome'], ['phone','WhatsApp'], ['email','Email (opcional)']].map(([f, label]) => (
                  <div key={f} style={{ marginBottom:'8px' }}>
                    <label style={{ fontSize:'0.75rem', display:'block', marginBottom:'2px', color:'#666' }}>{label}</label>
                    <input required={f !== 'email'} type={f==='email'?'email':'text'} value={form[f]}
                      onChange={e => setForm(v => ({ ...v, [f]: e.target.value }))}
                      style={{ width:'100%', padding:'0.5rem', border:'1px solid #eee', borderRadius:'8px', boxSizing:'border-box', fontSize:'0.85rem' }} />
                  </div>
                ))}
                <button type="submit" style={{ width:'100%', marginTop:'8px', padding:'0.7rem', background:primary, color:'#fff', border:'none', borderRadius:'8px', fontWeight:600, cursor:'pointer' }}>
                  Confirmar
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
