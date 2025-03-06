const supabase = require('../config/supabase');
const localCache = require('../cache/localCache');

// Busca todos os registros em batches da tabela streamhive_conteudos
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

// Função para agrupar os conteúdos
// - Agrupa por categoria
// - Para subcategoria "Serie": agrupa por base do nome (removendo o sufixo " SxxExx")
// - Para filmes, mantém como está
const groupContents = (data) => {
  const grouped = {};

  for (const item of data) {
    const categoria = item.categoria || 'Sem Categoria';
    if (!grouped[categoria]) {
      grouped[categoria] = { series: {}, filmes: [] };
    }

    if (item.subcategoria === 'Serie') {
      // Remove o sufixo " SxxExx" para definir o nome base
      const baseName = item.nome.replace(/\s+S\d+E\d+$/i, '').trim();
      if (!grouped[categoria].series[baseName]) {
        grouped[categoria].series[baseName] = {
          nome: baseName,
          url: item.url, // URL do primeiro episódio encontrado
          temporadas: item.temporadas,
          episodios: []
        };
      }

      // Extrai season e episode do nome, se possível
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
        // Caso não consiga extrair via nome, usa os campos disponibilizados
        grouped[categoria].series[baseName].episodios.push({
          season: item.temporadas || null,
          episode: item.episodios || null,
          url: item.url
        });
      }
    } else {
      // Para filmes, apenas adiciona à lista
      grouped[categoria].filmes.push(item);
    }
  }

  // Converte o objeto de séries em array para cada categoria
  for (const categoria in grouped) {
    const seriesObj = grouped[categoria].series;
    grouped[categoria].series = Object.values(seriesObj);
  }
  return grouped;
};

// Endpoint para obter os conteúdos
const getContents = async (req, res) => {
  try {
    const cacheKey = 'contents_all';
    const now = Date.now();
    let data;

    // Usa o cache local se existir e não tiver expirado (1 hora)
    if (localCache[cacheKey] && localCache[cacheKey].expires > now) {
      console.log('Retornando dados do cache local');
      data = localCache[cacheKey].data;
    } else {
      data = await getAllContentsInBatches();
      localCache[cacheKey] = {
        data: data,
        expires: now + 3600000,
      };
    }

    const totalRegistros = data.length;

    // Agrupa os dados conforme regras para séries e filmes
    const groupedContents = groupContents(data);

    // Calcula o total gerado: soma do número de itens agrupados (filmes + grupos de séries)
    let totalGerado = 0;
    for (const categoria in groupedContents) {
      totalGerado += groupedContents[categoria].filmes.length;
      totalGerado += groupedContents[categoria].series.length;
    }

    return res.status(200).json({
      totalRegistros,
      totalGerado,
      contents: groupedContents
    });
  } catch (err) {
    console.error('Erro interno do servidor:', err);
    return res.status(500).json({ error: 'Erro interno do servidor.' });
  }
};

module.exports = {
  getContents,
};
