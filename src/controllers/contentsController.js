const supabase = require('../config/supabase');
const redisClient = require('../cache/redisClient');

const getContents = async (req, res) => {
  try {
    const cacheKey = 'contents_all';

    // Verifica se os dados já estão em cache
    const cachedData = await redisClient.get(cacheKey);
    if (cachedData) {
      console.log('Retornando dados do cache Redis');
      return res.status(200).json({ contents: JSON.parse(cachedData) });
    }

    // Consulta otimizada no Supabase para buscar somente os campos necessários
    const { data, error } = await supabase
      .from('contents')
      .select('nome, poster, categoria, subcategoria, url, temporadas, episodios');

    if (error) {
      console.error('Erro ao consultar conteúdos no Supabase:', error);
      return res.status(500).json({ error: 'Erro ao buscar conteúdos.' });
    }

    // Armazena os dados no Redis com expiração de 1 hora (3600 segundos)
    await redisClient.setEx(cacheKey, 3600, JSON.stringify(data));

    return res.status(200).json({ contents: data });
  } catch (err) {
    console.error('Erro interno do servidor:', err);
    return res.status(500).json({ error: 'Erro interno do servidor.' });
  }
};

module.exports = {
  getContents,
};
