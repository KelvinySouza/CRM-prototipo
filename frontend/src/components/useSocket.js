// src/components/useSocket.js  — hook para Socket.io no frontend
import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

let socketInstance = null;

export function useSocket(handlers = {}) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    if (!socketInstance) {
      socketInstance = io(process.env.NEXT_PUBLIC_API, {
        auth: { token },
        transports: ['websocket'],
      });
    }

    const socket = socketInstance;

    // Registra handlers
    Object.entries(handlersRef.current).forEach(([event, fn]) => {
      socket.on(event, fn);
    });

    return () => {
      Object.keys(handlersRef.current).forEach(event => {
        socket.off(event);
      });
    };
  }, []);
}

// Uso no inbox.jsx:
// useSocket({
//   new_message: ({ conversationId, message }) => {
//     if (conversationId === selected?.id) {
//       setMessages(prev => [...prev, message]);
//     }
//     loadConversations(); // atualiza badge de não lidas
//   },
// });
