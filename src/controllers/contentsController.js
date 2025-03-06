const supabase = require('../config/supabase');
const localCache = require('../cache/localCache');

// Função para buscar todos os conteúdos em batches (caso o cache esteja vazio ou expirado)
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
    const now = Date.now();

    // Verifica se os dados estão no cache e se ainda não expiraram
    if (localCache[cacheKey] && localCache[cacheKey].expires > now) {
      console.log('Retornando dados do cache local');
      return res.status(200).json({ contents: localCache[cacheKey].data });
    }

    // Se não estiver em cache (ou se o cache tiver expirado), busca os dados em batch
    const data = await getAllContentsInBatches();
    // Atualiza o cache local
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
