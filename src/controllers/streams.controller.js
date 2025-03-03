const supabase = require('../config/supabase');

const listPublicStreams = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('streamhive_streams')
      .select('*, streamhive_users(name)')
      .eq('is_public', true);

    if (error) {
      return res.status(500).json({ message: 'Erro ao buscar transmissões públicas.', error });
    }

    const { count, error: countError } = await supabase
      .from('streamhive_stream_participants')
      .select('*', { count: 'exact', head: true })
      .eq('stream_id', id);

    if (countError) {
      return res.status(500).json({ message: 'Erro ao contar espectadores.' });
    }

    const formattedStreams = data.map((stream) => ({
      id: stream.id,
      title: stream.title,
      description: stream.description,
      host: stream.streamhive_users ? stream.streamhive_users.name : 'Desconhecido',
      isPublic: stream.is_public,
      videoUrl: stream.video_url,
      viewers: count
    }));

    return res.status(200).json(formattedStreams);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Erro interno.' });
  }
};

const createStream = async (req, res) => {
    const { title, description, isPublic, videoUrl } = req.body;
    if (!title || !videoUrl) {
      return res.status(400).json({ message: 'Title e videoUrl são obrigatórios.' });
    }
  
    try {
      const { data, error } = await supabase
        .from('streamhive_streams')
        .insert([{
          title,
          description,
          is_public: isPublic,
          video_url: videoUrl,
          host_id: req.user.id
        }])
        .select()
        .single();
  
      if (error || !data) {
        return res.status(500).json({ message: 'Erro ao criar sala.', error });
      }
  
      const streamId = data.id;
      const link = `https://streamhivex.vercel.app/stream/${streamId}`;
      return res.status(201).json({ message: 'Sala criada com sucesso!', streamId, link });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: 'Erro interno.' });
    }
  };

const getStreamDetails = async (req, res) => {
  const { id } = req.params;
  try {
    const { data: stream, error } = await supabase
      .from('streamhive_streams')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !stream) {
      return res.status(404).json({ message: 'Sala não encontrada.' });
    }

    const { data: host, error: hostError } = await supabase
      .from('streamhive_users')
      .select('name')
      .eq('id', stream.host_id)
      .single();

    if (hostError || !host) {
      return res.status(404).json({ message: 'Host não encontrado.' });
    }

    const { count, error: countError } = await supabase
      .from('streamhive_stream_participants')
      .select('*', { count: 'exact', head: true })
      .eq('stream_id', id);

    if (countError) {
      return res.status(500).json({ message: 'Erro ao contar espectadores.' });
    }

    return res.status(200).json({
      id: stream.id,
      title: stream.title,
      description: stream.description,
      host: host.name,
      isPublic: stream.is_public,
      videoUrl: stream.video_url,
      viewers: count
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Erro interno.' });
  }
};

const joinStream = async (req, res) => {
  const { id } = req.params;
  try {
    const { data, error } = await supabase
      .from('streamhive_stream_participants')
      .insert([{ stream_id: id, user_id: req.user.id }]);

    if (error) {
      return res.status(500).json({ message: 'Erro ao entrar na sala.', error });
    }

    const { count, error: countError } = await supabase
      .from('streamhive_stream_participants')
      .select('*', { count: 'exact', head: true })
      .eq('stream_id', id);

    if (countError) {
      return res.status(500).json({ message: 'Erro ao contar espectadores.' });
    }

    return res.status(200).json({ message: 'Usuário entrou na sala', viewers: count });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Erro interno.' });
  }
};

const leaveStream = async (req, res) => {
  const { id } = req.params;
  try {
    const { data, error } = await supabase
      .from('streamhive_stream_participants')
      .delete()
      .eq('stream_id', id)
      .eq('user_id', req.user.id);

    if (error) {
      return res.status(500).json({ message: 'Erro ao sair da sala.', error });
    }

    const { count, error: countError } = await supabase
      .from('streamhive_stream_participants')
      .select('*', { count: 'exact', head: true })
      .eq('stream_id', id);

    if (countError) {
      return res.status(500).json({ message: 'Erro ao contar espectadores.' });
    }

    return res.status(200).json({ message: 'Usuário saiu da sala', viewers: count });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Erro interno.' });
  }
};

const deleteStream = async (req, res) => {
  const { id } = req.params;
  try {
    const { data: stream, error: fetchError } = await supabase
      .from('streamhive_streams')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !stream) {
      return res.status(404).json({ message: 'Sala não encontrada.' });
    }

    if (stream.host_id !== req.user.id) {
      return res.status(403).json({ message: 'Apenas o host pode encerrar a transmissão.' });
    }

    const { data, error } = await supabase
      .from('streamhive_streams')
      .delete()
      .eq('id', id);

    if (error) {
      return res.status(500).json({ message: 'Erro ao encerrar a transmissão.', error });
    }

    return res.status(200).json({ message: 'Transmissão encerrada.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Erro interno.' });
  }
};

module.exports = {
  createStream,
  listPublicStreams,
  getStreamDetails,
  joinStream,
  leaveStream,
  deleteStream
};
