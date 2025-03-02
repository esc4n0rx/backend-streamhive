// src/controllers/messages.controller.js
const supabase = require('../config/supabase');

const getMessages = async (req, res) => {
  const { id } = req.params;
  try {
    // Realiza a consulta e junta com a tabela de usuários para obter o nome do remetente
    const { data, error } = await supabase
      .from('streamhive_messages')
      .select('text, created_at, streamhive_users(name)')
      .eq('stream_id', id)
      .order('created_at', { ascending: true });

    if (error) {
      return res.status(500).json({ message: 'Erro ao obter mensagens.', error });
    }

    // Mapeia o resultado para o formato esperado
    const messages = data.map(message => ({
      user: message.streamhive_users ? message.streamhive_users.name : 'Desconhecido',
      text: message.text,
      timestamp: message.created_at
    }));

    return res.status(200).json(messages);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Erro interno.' });
  }
};

const sendMessage = async (req, res) => {
  const { id } = req.params;
  const { text } = req.body;
  if (!text) {
    return res.status(400).json({ message: 'O campo text é obrigatório.' });
  }

  try {
    const { data, error } = await supabase
      .from('streamhive_messages')
      .insert([{ stream_id: id, user_id: req.user.id, text }])
      .select()
      .single();

    if (error || !data) {
      return res.status(500).json({ message: 'Erro ao enviar mensagem.', error });
    }

    // Opcional: Emitir um evento via WebSocket para atualizar o chat em tempo real
    if (global.io) {
      global.io.emit('chat:new-message', {
        text,
        user: req.user.email, // ou, se desejar, busque o nome do usuário
        timestamp: data.created_at
      });
    }

    return res.status(201).json({ message: 'Mensagem enviada!' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Erro interno.' });
  }
};

module.exports = { getMessages, sendMessage };
