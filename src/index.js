const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');
const socketIo = require('socket.io');

dotenv.config();

const app = express();

const corsOptions = {
  origin: 'https://streamhivex.vercel.app', 
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); 

app.use(express.json());

const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: 'https://streamhivex.vercel.app',
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  }
});
global.io = io;


let latestPlayerStates = {}; 

io.on('connection', (socket) => {
  console.log('Novo cliente conectado:', socket.id);

  socket.on('join-room', (roomId) => {
    socket.join(roomId);
    console.log(`Socket ${socket.id} entrou na sala ${roomId}`);
    
    if (latestPlayerStates[roomId]) {
      socket.emit('player:update', { event: 'player:update', data: latestPlayerStates[roomId] });
    }
    
    socket.to(roomId).emit('user:joined', { event: 'user:joined', data: { username: 'Novo usuário' } });
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

  socket.on('disconnect', () => {
    console.log('Cliente desconectado:', socket.id);
  });
});


const authRoutes = require('./routes/auth.routes');
const streamsRoutes = require('./routes/streams.routes');
const messagesRoutes = require('./routes/messages.routes');
const reactionsRoutes = require('./routes/reactions.routes');
const proxyRoutes = require('./routes/proxy.routes');

app.use('/api/auth', authRoutes);
app.use('/api/streams', streamsRoutes);
app.use('/api/streams', messagesRoutes);
app.use('/api/streams', reactionsRoutes);
app.use('/api/proxy', proxyRoutes);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
