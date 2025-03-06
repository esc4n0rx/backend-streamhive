const cron = require('node-cron');
const supabase = require('../config/supabase');
const localCache = require('../cache/localCache');

/**
 * Consulta o total de registros na tabela usando a opção head e count
 */
const getTotalRecords = async () => {
  const { count, error } = await supabase
    .from('streamhive_conteudos')
    .select('id', { count: 'exact', head: true });
  if (error) {
    throw error;
  }
  return count;
};

/**
 * Define um batch size compatível com base no total de registros.
 * Neste exemplo, tentamos dividir os registros em aproximadamente 25 batches.
 */
const getCompatibleBatchSize = (totalRecords) => {
  return Math.ceil(totalRecords / 25);
};

/**
 * Busca todos os registros em batches da tabela streamhive_conteudos
 */
const getAllContentsInBatches = async () => {
  const total = await getTotalRecords();
  const batchSize = getCompatibleBatchSize(total);
  console.log(`Total de registros na tabela: ${total} | Batch size: ${batchSize}`);
  
  let allData = [];
  let from = 0;

  while (from < total) {
    const { data, error } = await supabase
      .from('streamhive_conteudos')
      .select('nome, poster, categoria, subcategoria, url, temporadas, episodios')
      .range(from, from + batchSize - 1);

    if (error) {
      throw error;
    }

    allData = allData.concat(data);
    from += batchSize;
  }
  return allData;
};

/**
 * Agrupa os conteúdos:
 * - Agrupa por categoria.
 * - Para itens com subcategoria "Serie": agrupa por base do nome (removendo o sufixo " SxxExx")
 *   e coleta os episódios; a URL do grupo é a do primeiro episódio encontrado.
 * - Para filmes, adiciona o registro individualmente.
 */
const groupContents = (data) => {
  const grouped = {};

  for (const item of data) {
    const categoria = item.categoria || 'Sem Categoria';
    if (!grouped[categoria]) {
      grouped[categoria] = { series: {}, filmes: [] };
    }

    if (item.subcategoria === 'Serie') {
      // Remove o sufixo " SxxExx" para definir o nome base da série
      const baseName = item.nome.replace(/\s+S\d+E\d+$/i, '').trim();
      if (!grouped[categoria].series[baseName]) {
        grouped[categoria].series[baseName] = {
          nome: baseName,
          url: item.url, // URL do primeiro episódio encontrado
          temporadas: item.temporadas,
          episodios: []
        };
      }

      // Tenta extrair season e episode do nome, se possível
      const match = item.nome.match(/S(\d+)E(\d+)$/i);
      if (match) {
        const season = parseInt(match[1], 10);
        const episode = parseInt(match[2], 10);
        grouped[categoria].series[baseName].episodios.push({
          season,
          episode,
          url: item.url
        });
      } else {
        // Se não conseguir extrair pelo nome, usa os campos disponíveis
        grouped[categoria].series[baseName].episodios.push({
          season: item.temporadas || null,
          episode: item.episodios || null,
          url: item.url
        });
      }
    } else {
      // Para filmes, adiciona diretamente na lista
      grouped[categoria].filmes.push(item);
    }
  }

  // Converte o objeto de séries em array para cada categoria
  for (const categoria in grouped) {
    grouped[categoria].series = Object.values(grouped[categoria].series);
  }
  return grouped;
};

/**
 * Atualiza o cache local com os dados agrupados e informações adicionais:
 * - totalRegistros: total de registros na tabela.
 * - totalGerado: total de itens após o agrupamento.
 * - contents: dados agrupados por categoria.
 */
const updateCache = async () => {
  try {
    console.log('Iniciando atualização do cache de conteúdos...');
    const allData = await getAllContentsInBatches();
    const totalRegistros = await getTotalRecords();
    const groupedContents = groupContents(allData);

    let totalGerado = 0;
    for (const categoria in groupedContents) {
      totalGerado += groupedContents[categoria].filmes.length;
      totalGerado += groupedContents[categoria].series.length;
    }

    localCache['contents_all'] = {
      data: {
        totalRegistros,
        totalGerado,
        contents: groupedContents
      },
      expires: Date.now() + 3600000, // Expira em 1 hora
    };

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

// Atualiza o cache imediatamente ao iniciar o serviço
updateCache();

module.exports = updateCache;
