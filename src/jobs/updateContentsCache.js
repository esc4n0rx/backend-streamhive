const cron = require('node-cron');
const supabase = require('../config/supabase');
const redisClient = require('../cache/redisClient');

// Função para buscar todos os conteúdos em batches
const getAllContentsInBatches = async () => {
  const batchSize = 10000; // Ajuste conforme necessário
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
    // Se o número de registros retornados for menor que o batchSize, chegamos ao final.
    if (data.length < batchSize) {
      finished = true;
    } else {
      from += batchSize;
    }
  }
  return allData;
};

// Função para atualizar o cache no Redis
const updateCache = async () => {
  try {
    console.log('Iniciando atualização do cache de conteúdos...');
    const contentsData = await getAllContentsInBatches();
    // Armazena no Redis com expiração de 1 hora (3600 segundos)
    await redisClient.setEx('contents_all', 3600, JSON.stringify(contentsData));
    console.log('Cache de conteúdos atualizado com sucesso.');
  } catch (error) {
    console.error('Erro ao atualizar o cache de conteúdos:', error);
  }
};

// Agenda o job para executar a cada hora (no minuto 0 de cada hora)
cron.schedule('0 * * * *', () => {
  console.log('Job do node-cron executado: Atualizando o cache de conteúdos.');
  updateCache();
});

// Opcional: atualiza o cache imediatamente ao iniciar o serviço
updateCache();

module.exports = updateCache;
