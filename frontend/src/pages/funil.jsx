// src/pages/funil.jsx  — Next.js + react-beautiful-dnd
import { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';

const STAGES = [
  { id: 'novo',      label: 'Novo',     color: '#e0e7ff' },
  { id: 'contato',   label: 'Contato',  color: '#dbeafe' },
  { id: 'proposta',  label: 'Proposta', color: '#fef9c3' },
  { id: 'fechado',   label: 'Fechado',  color: '#dcfce7' },
  { id: 'perdido',   label: 'Perdido',  color: '#fee2e2' },
];

function useApi() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
  const base  = process.env.NEXT_PUBLIC_API;
  return async (path, opts = {}) => {
    const res = await fetch(`${base}${path}`, {
      ...opts,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(opts.headers || {}) },
    });
    return res.json();
  };
}

export default function Funil() {
  const api   = useApi();
  const [leads, setLeads] = useState([]);

  useEffect(() => { loadLeads(); }, []);

  async function loadLeads() {
    const data = await api('/leads');
    if (Array.isArray(data)) setLeads(data);
  }

  async function onDragEnd(result) {
    if (!result.destination) return;
    const { draggableId, destination } = result;
    const newStage = destination.droppableId;

    // Atualiza localmente (optimistic update)
    setLeads(prev => prev.map(l => l.id === draggableId ? { ...l, stage: newStage } : l));

    // Persiste no backend
    await api(`/leads/${draggableId}/stage`, {
      method: 'PUT',
      body: JSON.stringify({ stage: newStage }),
    });
  }

  const byStage = (stage) => leads.filter(l => l.stage === stage);

  function formatValue(v) {
    if (!v) return '';
    return `R$ ${parseFloat(v).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`;
  }

  return (
    <div style={{ padding: '1.5rem', fontFamily: 'sans-serif' }}>
      <h1 style={{ marginBottom: '1.5rem', fontSize: '1.25rem', fontWeight: 600 }}>Funil de vendas</h1>

      <DragDropContext onDragEnd={onDragEnd}>
        <div style={{ display: 'flex', gap: '16px', overflowX: 'auto', paddingBottom: '1rem' }}>
          {STAGES.map(stage => (
            <div key={stage.id} style={{ minWidth: '220px', flex: '1' }}>
              {/* Header da coluna */}
              <div style={{ background: stage.color, borderRadius: '8px 8px 0 0', padding: '0.625rem 0.875rem', fontWeight: 600, fontSize: '0.875rem', display: 'flex', justifyContent: 'space-between' }}>
                <span>{stage.label}</span>
                <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>{byStage(stage.id).length}</span>
              </div>

              {/* Coluna droppable */}
              <Droppable droppableId={stage.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    style={{
                      minHeight: '400px',
                      background: snapshot.isDraggingOver ? '#f0f0ff' : '#f7f7f7',
                      borderRadius: '0 0 8px 8px',
                      padding: '8px',
                      border: `1px solid ${stage.color}`,
                      borderTop: 'none',
                      transition: 'background 0.2s',
                    }}
                  >
                    {byStage(stage.id).map((lead, index) => (
                      <Draggable key={lead.id} draggableId={lead.id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            style={{
                              background: '#fff',
                              borderRadius: '8px',
                              padding: '0.75rem',
                              marginBottom: '8px',
                              boxShadow: snapshot.isDragging ? '0 4px 16px rgba(0,0,0,0.15)' : '0 1px 4px rgba(0,0,0,0.08)',
                              cursor: 'grab',
                              ...provided.draggableProps.style,
                            }}
                          >
                            <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{lead.customer_name}</div>
                            {lead.value && (
                              <div style={{ fontSize: '0.8rem', color: '#059669', marginTop: '2px' }}>{formatValue(lead.value)}</div>
                            )}
                            {lead.assigned_name && (
                              <div style={{ fontSize: '0.7rem', color: '#888', marginTop: '4px' }}>
                                → {lead.assigned_name}
                              </div>
                            )}
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          ))}
        </div>
      </DragDropContext>
    </div>
  );
}
