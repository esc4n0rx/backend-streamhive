const redis = require('redis');

const client = redis.createClient({
  // Configurações opcionais: host, port, password, etc.
  // host: 'localhost',
  // port: 6379,
});

client.on('error', (err) => {
  console.error('Redis error:', err);
});

client.connect();

module.exports = client;
