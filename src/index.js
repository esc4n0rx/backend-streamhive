const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');
const socketIo = require('socket.io');
require('./jobs/updateContentsCache');

dotenv.config();

const app = express();

// Configure o CORS de forma explícita:
app.use(cors({
  origin: '*', // Permite qualquer origem. Se estiver usando credenciais, substitua por uma lista de origens permitidas.
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Tratamento para requisições OPTIONS
app.options('*', cors());

app.use(express.json());

const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*", 
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: false, 
  }
});
global.io = io;

// Resto do código permanece...
let latestPlayerStates = {};

io.on('connection', (socket) => {
  console.log('Novo cliente conectado:', socket.id);

  socket.on('join-room', (roomId) => {
    socket.join(roomId);
    console.log(`Socket ${socket.id} entrou na sala ${roomId}`);
    
    socket.to(roomId).emit('user:joined', { event: 'user:joined', data: { username: 'Novo usuário' } });
  });

  socket.on('player:play', (payload) => {
    const { roomId, data } = payload;
    latestPlayerStates[roomId] = data;
    console.log(`Socket ${socket.id} acionou player:play na sala ${roomId}`, data);
    io.in(roomId).emit('player:start', data);
  });

  socket.on('request:sync', (payload) => {
    const { roomId } = payload;
    console.log(`Socket ${socket.id} solicitou sincronização na sala ${roomId}`);
    if (latestPlayerStates[roomId]) {
      socket.emit('player:sync', latestPlayerStates[roomId]);
    }
  });

  socket.on('player:update', (payload) => {
    const { roomId, data } = payload;
    latestPlayerStates[roomId] = data;
    socket.to(roomId).emit('player:update', payload);
  });

  socket.on('chat:new-message', (message) => {
    socket.to(message.roomId).emit('chat:new-message', message);
  });

  socket.on('reaction:sent', (data) => {
    socket.to(data.roomId).emit('reaction:sent', data);
  });

  socket.on('stream:ended', (payload) => {
    const { roomId } = payload;
    console.log(`Socket ${socket.id} encerrou a transmissão na sala ${roomId}`);
    io.in(roomId).emit('stream:ended');
  });

  socket.on('disconnect', () => {
    console.log('Cliente desconectado:', socket.id);
  });
});

const authRoutes = require('./routes/auth.routes');
const streamsRoutes = require('./routes/streams.routes');
const messagesRoutes = require('./routes/messages.routes');
const reactionsRoutes = require('./routes/reactions.routes');
const proxyRoutes = require('./routes/proxy.routes');
const contentsRouter = require('./routes/content.route');

app.use('/api/auth', authRoutes);
app.use('/api/streams', streamsRoutes);
app.use('/api/streams', messagesRoutes);
app.use('/api/streams', reactionsRoutes);
app.use('/api/proxy', proxyRoutes);
app.use('/api/contents', contentsRouter);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
