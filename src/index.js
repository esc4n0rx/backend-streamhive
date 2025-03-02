// src/index.js
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');
const socketIo = require('socket.io');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Criação do servidor HTTP e instância do Socket.IO
const server = http.createServer(app);
const io = socketIo(server);
global.io = io; // Disponibiliza globalmente para os controllers que precisam emitir eventos

// Eventos do Socket.IO
io.on('connection', (socket) => {
  console.log('Novo cliente conectado:', socket.id);

  // Evento: player:update
  socket.on('player:update', (payload) => {
    // Broadcast para todos exceto o remetente (caso queira incluir o remetente, use io.emit)
    socket.broadcast.emit('player:update', payload);
    
  });

  // Evento: user:joined
  socket.on('user:joined', (payload) => {
    socket.broadcast.emit('user:joined', payload);
  });

  socket.on('disconnect', () => {
    console.log('Cliente desconectado:', socket.id);
  });
});

// Rotas de autenticação e streams (já configuradas anteriormente)
const authRoutes = require('./routes/auth.routes');
const streamsRoutes = require('./routes/streams.routes');
const messagesRoutes = require('./routes/messages.routes');
const reactionsRoutes = require('./routes/reactions.routes');

app.use('/api/auth', authRoutes);
app.use('/api/streams', streamsRoutes);
app.use('/api/streams', messagesRoutes);
app.use('/api/streams', reactionsRoutes);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
