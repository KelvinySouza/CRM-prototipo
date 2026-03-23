// ============================================================
// server.js — Entry point com Express + Socket.io
// ============================================================
const express    = require('express');
const cors       = require('cors');
const http       = require('http');
const { Server } = require('socket.io');
const jwt        = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET || 'troque-em-producao';
const app    = express();
const server = http.createServer(app);
const io     = new Server(server, {
  cors: { origin: process.env.FRONTEND_URL || 'http://localhost:3000' }
});

app.use(cors());
app.use(express.json());

// Injeta io nas requests para controllers emitirem eventos
app.use((req, _res, next) => { req.io = io; next(); });

// Rotas HTTP
app.use('/auth',          require('./routes/auth'));
app.use('/companies',     require('./routes/companies'));
app.use('/users',         require('./routes/users'));
app.use('/customers',     require('./routes/customers'));
app.use('/conversations', require('./routes/conversations'));
app.use('/leads',         require('./routes/leads'));
app.use('/products',      require('./routes/products'));
app.use('/orders',        require('./routes/orders'));
app.use('/webhook',       require('./routes/webhook'));
app.get('/:domain',       require('./controllers/storeController').renderStore);

// ---- Socket.io: autenticação + salas por empresa ----
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('Token ausente'));
  try {
    socket.user = jwt.verify(token, SECRET);
    next();
  } catch {
    next(new Error('Token inválido'));
  }
});

io.on('connection', (socket) => {
  const { companyId, role } = socket.user;
  socket.join(`company:${companyId}`);
  if (role === 'admin') socket.join(`admin:${companyId}`);
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
