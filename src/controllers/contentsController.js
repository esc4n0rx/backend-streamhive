const supabase = require('../config/supabase');
const redisClient = require('../cache/redisClient');

const getAllContentsInBatches = async () => {
  const batchSize = 10000; // Tamanho do lote
  let allData = [];
  let from = 0;
  let finished = false;

  while (!finished) {
    const { data, error } = await supabase
      .from('contents')
      .select('nome, poster, categoria, subcategoria, url, temporadas, episodios')
      .range(from, from + batchSize - 1);

    if (error) {
      throw error;
    }

    allData = allData.concat(data);

    if (data.length < batchSize) {
      finished = true;
    } else {
      from += batchSize;
    }
  }
  return allData;
};

const getContents = async (req, res) => {
  try {
    const cacheKey = 'contents_all';

    // Verifica se os dados já estão em cache
    const cachedData = await redisClient.get(cacheKey);
    if (cachedData) {
      console.log('Retornando dados do cache Redis');
      return res.status(200).json({ contents: JSON.parse(cachedData) });
    }

    // Se não estiver em cache, busca os dados em batch
    const data = await getAllContentsInBatches();

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
