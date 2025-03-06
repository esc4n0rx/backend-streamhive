const cron = require('node-cron');
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

const updateCache = async () => {
  try {
    console.log('Iniciando atualização do cache de conteúdos...');
    const contentsData = await getAllContentsInBatches();
    localCache['contents_all'] = {
      data: contentsData,
      expires: Date.now() + 3600000,
    };
    console.log('Cache de conteúdos atualizado com sucesso.');
  } catch (error) {
    console.error('Erro ao atualizar o cache de conteúdos:', error);
  }
};

cron.schedule('0 * * * *', () => {
  console.log('Job do node-cron executado: Atualizando o cache de conteúdos.');
  updateCache();
});

updateCache();

module.exports = updateCache;
