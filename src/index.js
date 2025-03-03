const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');
const socketIo = require('socket.io');

dotenv.config();

const app = express();

// Configure o CORS para permitir o domínio do seu frontend
const corsOptions = {
  origin: 'https://streamhivex.vercel.app', // Ou '*' para liberar todas as origens (apenas para teste)
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // Habilita o preflight para todas as rotas

app.use(express.json());

// Resto da configuração do servidor, rotas, Socket.IO, etc.
const server = http.createServer(app);
const io = socketIo(server);
global.io = io;

io.on('connection', (socket) => {
  console.log('Novo cliente conectado:', socket.id);

  socket.on('player:update', (payload) => {
    socket.broadcast.emit('player:update', payload);
  });

  socket.on('user:joined', (payload) => {
    socket.broadcast.emit('user:joined', payload);
  });

  socket.on('disconnect', () => {
    console.log('Cliente desconectado:', socket.id);
  });
});

// Rotas de autenticação e streams
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
