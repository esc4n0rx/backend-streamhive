const supabase = require('../config/supabase');

// Cache local em memória
let localCache = {};

/**
 * Função que busca todos os conteúdos em batches para evitar consultas pesadas.
 */
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

/**
 * Função que retorna os conteúdos, utilizando cache local para evitar buscas pesadas.
 */
const getContents = async (req, res) => {
  try {
    const cacheKey = 'contents_all';
    const now = Date.now();

    // Verifica se os dados já estão em cache e se o cache ainda é válido
    if (localCache[cacheKey] && localCache[cacheKey].expires > now) {
      console.log('Retornando dados do cache local');
      return res.status(200).json({ contents: localCache[cacheKey].data });
    }

    // Se não estiver em cache ou o cache expirou, busca os dados em batches
    const data = await getAllContentsInBatches();

    // Armazena os dados no cache local com expiração de 1 hora (3600000 ms)
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
