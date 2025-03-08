const supabase = require('../config/supabase');

const searchContents = async (req, res) => {
  const termo = req.query.termo;
  if (!termo) {
    return res.status(400).json({ error: 'Termo de busca é obrigatório.' });
  }
  
  try {
    // Realiza a busca utilizando a cláusula "or" para pesquisar em "nome", "categoria" e "subcategoria"
    const { data: results, error } = await supabase
      .from('streamhivex_conteudos')
      .select('nome, poster, categoria, subcategoria, url, temporadas, episodios')
      .or(`nome.ilike.%${termo}%,categoria.ilike.%${termo}%,subcategoria.ilike.%${termo}%`)
      .limit(50);
      
    if (error) {
      throw error;
    }
    
    // Separa conteúdos por tipo (Filme ou Serie)
    let filmes = [];
    let seriesGroup = {};

    results.forEach(item => {
      if (item.subcategoria === 'Filme') {
        filmes.push({
          nome: item.nome,
          poster: item.poster,
          categoria: item.categoria,
          url: item.url,
          subcategoria: 'Filme'
        });
      } else if (item.subcategoria === 'Serie') {
        // Remove o sufixo "SxxExx" para obter o nome base da série
        const baseName = item.nome.replace(/\s+S\d+E\d+$/i, '').trim();
        if (!seriesGroup[baseName]) {
          seriesGroup[baseName] = {
            nome: baseName,
            poster: item.poster, // poster do primeiro episódio encontrado
            categoria: item.categoria,
            subcategoria: 'Serie',
            temporadas: {}
          };
        }
        // Tenta extrair o número da temporada e do episódio a partir do nome
        let season, episode;
        const match = item.nome.match(/S(\d+)E(\d+)$/i);
        if (match) {
          season = parseInt(match[1], 10);
          episode = parseInt(match[2], 10);
        } else {
          season = item.temporadas || 1;
          episode = item.episodios || 1;
        }
        // Agrupa os episódios por temporada
        if (!seriesGroup[baseName].temporadas[season]) {
          seriesGroup[baseName].temporadas[season] = [];
        }
        seriesGroup[baseName].temporadas[season].push({
          episodio: episode,
          url: item.url
        });
      }
    });

    // Limita a quantidade de sugestões a 5 para cada grupo
    filmes = filmes.slice(0, 5);
    const series = Object.values(seriesGroup).slice(0, 5);

    // Retorna os resultados organizados conforme o esperado
    return res.status(200).json({ filmes, series });
  } catch (error) {
    console.error('Erro ao buscar conteúdos:', error);
    return res.status(500).json({ error: 'Erro ao realizar a busca.' });
  }
};

module.exports = {
  searchContents,
};
