const supabase = require('../config/supabase');
const localCache = require('../cache/localCache');

const getAllContentsInBatches = async () => {
  const batchSize = 10000; 
  let allData = [];
  let from = 0;
  let finished = false;

  while (!finished) {
    const { data, error } = await supabase
      .from('streamhive_conteudos')
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
    const now = Date.now();

    if (localCache[cacheKey] && localCache[cacheKey].expires > now) {
      console.log('Retornando dados do cache local');
      return res.status(200).json({ contents: localCache[cacheKey].data });
    }

    const data = await getAllContentsInBatches();
    localCache[cacheKey] = {
      data: data,
      expires: now + 3600000,
    };

    return res.status(200).json({ contents: data });
  } catch (err) {
    console.error('Erro interno do servidor:', err);
    return res.status(500).json({ error: 'Erro interno do servidor.' });
  }
};

module.exports = {
  getContents,
};
