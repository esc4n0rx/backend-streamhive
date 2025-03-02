// src/controllers/reactions.controller.js
const supabase = require('../config/supabase');

const sendReaction = async (req, res) => {
  const { id } = req.params;
  const { emoji } = req.body;
  if (!emoji) {
    return res.status(400).json({ message: 'O campo emoji é obrigatório.' });
  }

  try {
    const { data, error } = await supabase
      .from('streamhive_reactions')
      .insert([{ stream_id: id, user_id: req.user.id, emoji }])
      .select()
      .single();

    if (error || !data) {
      return res.status(500).json({ message: 'Erro ao enviar reação.', error });
    }

    // Busca o nome do usuário para incluir no evento
    const { data: userData, error: userError } = await supabase
      .from('streamhive_users')
      .select('name')
      .eq('id', req.user.id)
      .single();

    // Emite o evento via WebSocket para notificar todos os usuários na sala
    if (global.io && userData) {
      global.io.emit('reaction:sent', {
        event: 'reaction:sent',
        data: {
          emoji,
          user: userData.name
        }
      });
    }

    return res.status(201).json({ message: 'Reação enviada!' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Erro interno.' });
  }
};

module.exports = { sendReaction };
