// src/pages/inbox.jsx  — Socket.io em tempo real
import { useState, useEffect, useRef, useCallback } from 'react';
import Layout from '../components/Layout';
import { useSocket } from '../components/useSocket';

function useApi() {
  const base = process.env.NEXT_PUBLIC_API;
  return useCallback(async (path, opts = {}) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
    const res = await fetch(`${base}${path}`, {
      ...opts,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(opts.headers || {}) },
    });
    if (res.status === 401) window.location.href = '/login';
    return res.json();
  }, []);
}

export default function Inbox() {
  const api = useApi();
  const [conversations, setConversations] = useState([]);
  const [selected, setSelected]           = useState(null);
  const [messages, setMessages]           = useState([]);
  const [newMsg, setNewMsg]               = useState('');
  const [filter, setFilter]               = useState('open');
  const [search, setSearch]               = useState('');
  const [loading, setLoading]             = useState(false);
  const bottomRef   = useRef(null);
  const selectedRef = useRef(null);
  useEffect(() => { selectedRef.current = selected; }, [selected]);

  useSocket({
    new_message: ({ conversationId, message }) => {
      if (selectedRef.current?.id === conversationId) {
        setMessages(prev => [...prev, message]);
      }
      setConversations(prev => prev.map(c =>
        c.id === conversationId
          ? { ...c, last_message: message.content, unread_count: c.id === selectedRef.current?.id ? 0 : (parseInt(c.unread_count) || 0) + 1 }
          : c
      ));
    },
  });

  useEffect(() => { loadConversations(); }, [filter, search]);

  async function loadConversations() {
    setLoading(true);
    const params = new URLSearchParams();
    if (filter !== 'all') params.append('status', filter);
    if (search) params.append('search', search);
    const data = await api(`/conversations?${params}`);
    if (data.conversations) setConversations(data.conversations);
    setLoading(false);
  }

  async function loadMessages(id) {
    const data = await api(`/conversations/${id}/messages`);
    if (Array.isArray(data)) setMessages(data);
  }

  async function sendMessage() {
    if (!newMsg.trim() || !selected) return;
    const text = newMsg.trim();
    setNewMsg('');
    const temp = { id: 'tmp-' + Date.now(), sender: 'user', content: text, timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, temp]);
    await api(`/conversations/${selected.id}/messages`, { method: 'POST', body: JSON.stringify({ content: text }) });
  }

  async function assumeConversation(conv, e) {
    e.stopPropagation();
    await api(`/conversations/${conv.id}/assume`, { method: 'PUT' });
    loadConversations();
  }

  async function closeConversation() {
    if (!selected) return;
    await api(`/conversations/${selected.id}/close`, { method: 'PUT' });
    setSelected(null);
    loadConversations();
  }

  const unreadTotal = conversations.reduce((s, c) => s + (parseInt(c.unread_count) || 0), 0);

  return (
    <Layout>
      <div style={{ display: 'flex', height: '100%' }}>

        {/* Sidebar */}
        <div style={{ width: '300px', borderRight: '1px solid #eee', display: 'flex', flexDirection: 'column', background: '#fff' }}>
          <div style={{ padding: '1rem', borderBottom: '1px solid #eee' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <strong style={{ fontSize: '0.95rem' }}>
                Inbox {unreadTotal > 0 && <span style={{ marginLeft: '6px', background: '#6366f1', color: '#fff', fontSize: '0.65rem', padding: '1px 6px', borderRadius: '99px' }}>{unreadTotal}</span>}
              </strong>
            </div>
            <input
              type="text"
              placeholder="Buscar por nome, telefone ou ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: '100%', marginBottom: '0.5rem', padding: '6px 8px', border: '1px solid #ddd', borderRadius: '4px' }}
            />
            <div style={{ display: 'flex', gap: '4px' }}>
              {['open','closed','all'].map(f => (
                <button key={f} onClick={() => setFilter(f)} style={{ flex:1, padding:'4px', fontSize:'0.7rem', border:'1px solid #eee', borderRadius:'6px', background: filter===f?'#6366f1':'#fff', color: filter===f?'#fff':'#666', cursor:'pointer' }}>
                  {f==='open'?'Abertos':f==='closed'?'Fechados':'Todos'}
                </button>
              ))}
            </div>
          </div>

          <div style={{ flex:1, overflowY:'auto' }}>
            {conversations.length === 0 && <div style={{ padding:'2rem', textAlign:'center', color:'#bbb', fontSize:'0.875rem' }}>Nenhuma conversa</div>}
            {conversations.map(conv => {
              const active = selected?.id === conv.id;
              const unread = parseInt(conv.unread_count) > 0;
              return (
                <div key={conv.id} onClick={() => setSelected(conv)} style={{ padding:'0.875rem 1rem', borderBottom:'1px solid #f5f5f5', cursor:'pointer', background: active?'#eef2ff':'transparent', borderLeft: active?'3px solid #6366f1':'3px solid transparent' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                    <div style={{ fontWeight: unread?700:500, fontSize:'0.875rem', flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                      {conv.customer_name || conv.customer_phone || 'Desconhecido'}
                    </div>
                    {unread && <span style={{ background:'#6366f1', color:'#fff', fontSize:'0.6rem', padding:'1px 5px', borderRadius:'99px', marginLeft:'4px' }}>{conv.unread_count}</span>}
                  </div>
                  <div style={{ fontSize:'0.75rem', color:'#999', marginTop:'2px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{conv.last_message || '—'}</div>
                  <div style={{ display:'flex', gap:'6px', marginTop:'5px', alignItems:'center' }}>
                    <span style={{ fontSize:'0.65rem', background: conv.channel==='whatsapp'?'#dcfce7':'#e0e7ff', color: conv.channel==='whatsapp'?'#166534':'#3730a3', padding:'1px 6px', borderRadius:'99px' }}>{conv.channel}</span>
                    {!conv.assigned_to && <button onClick={e => assumeConversation(conv,e)} style={{ fontSize:'0.65rem', background:'#6366f1', color:'#fff', border:'none', padding:'1px 8px', borderRadius:'99px', cursor:'pointer' }}>Assumir</button>}
                    {conv.assigned_name && <span style={{ fontSize:'0.65rem', color:'#aaa' }}>{conv.assigned_name}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Chat */}
        <div style={{ flex:1, display:'flex', flexDirection:'column', background:'#f9f9f9' }}>
          {selected ? (
            <>
              <div style={{ padding:'0.875rem 1.25rem', background:'#fff', borderBottom:'1px solid #eee', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div>
                  <div style={{ fontWeight:600, fontSize:'0.95rem' }}>{selected.customer_name || selected.customer_phone || 'Desconhecido'}</div>
                  <div style={{ fontSize:'0.75rem', color:'#888' }}>{selected.channel} · {selected.assigned_name ? `→ ${selected.assigned_name}` : 'sem responsável'}</div>
                </div>
                {selected.status === 'open' && (
                  <button onClick={closeConversation} style={{ padding:'4px 12px', background:'#fff', border:'1px solid #ddd', borderRadius:'8px', cursor:'pointer', fontSize:'0.8rem' }}>Fechar</button>
                )}
              </div>

              <div style={{ flex:1, overflowY:'auto', padding:'1.25rem', display:'flex', flexDirection:'column', gap:'8px' }}>
                {messages.map(msg => {
                  const right = msg.sender !== 'client';
                  return (
                    <div key={msg.id} style={{ display:'flex', justifyContent: right?'flex-end':'flex-start' }}>
                      <div style={{ background: right?'#6366f1':'#fff', color: right?'#fff':'#333', padding:'0.6rem 0.875rem', borderRadius: right?'16px 16px 4px 16px':'16px 16px 16px 4px', maxWidth:'70%', fontSize:'0.875rem', boxShadow:'0 1px 3px rgba(0,0,0,0.06)' }}>
                        {msg.content}
                        <div style={{ fontSize:'0.65rem', opacity:0.6, marginTop:'3px', textAlign:'right' }}>
                          {new Date(msg.timestamp).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>

              <div style={{ padding:'1rem 1.25rem', background:'#fff', borderTop:'1px solid #eee', display:'flex', gap:'8px' }}>
                <input value={newMsg} onChange={e => setNewMsg(e.target.value)} onKeyDown={e => e.key==='Enter' && !e.shiftKey && sendMessage()}
                  placeholder={selected.status==='closed'?'Conversa encerrada':'Digite uma mensagem...'}
                  disabled={selected.status==='closed'}
                  style={{ flex:1, padding:'0.65rem 1rem', border:'1px solid #e0e0e0', borderRadius:'24px', fontSize:'0.875rem', outline:'none', background: selected.status==='closed'?'#f5f5f5':'#fff' }} />
                <button onClick={sendMessage} disabled={selected.status==='closed'||!newMsg.trim()}
                  style={{ padding:'0.65rem 1.25rem', background:'#6366f1', color:'#fff', border:'none', borderRadius:'24px', cursor:'pointer', fontWeight:600, fontSize:'0.875rem', opacity: selected.status==='closed'||!newMsg.trim()?0.5:1 }}>
                  Enviar
                </button>
              </div>
            </>
          ) : (
            <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:'8px', color:'#bbb' }}>
              <div style={{ fontSize:'2rem' }}>💬</div>
              <div style={{ fontSize:'0.875rem' }}>Selecione uma conversa</div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
