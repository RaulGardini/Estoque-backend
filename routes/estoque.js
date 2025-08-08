const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET /estoque - Retorna estoque de todos os produtos
router.get('/', async (req, res) => {
  try {
    const query = `
      SELECT 
        p.produto_id,
        p.nome as produto_nome,
        p.tem_tamanhos,
        p.status,
        CASE 
          WHEN p.tem_tamanhos = TRUE THEN
            JSON_AGG(
              JSON_BUILD_OBJECT(
                'tamanho', t.nome,
                'quantidade', e.quantidade
              ) ORDER BY t.tamanho_id
            )
          ELSE
            JSON_AGG(
              JSON_BUILD_OBJECT(
                'quantidade', e.quantidade
              )
            )
        END as estoque
      FROM produtos p
      LEFT JOIN estoque e ON p.produto_id = e.produto_id
      LEFT JOIN tamanhos t ON e.tamanho_id = t.tamanho_id
      WHERE p.status = TRUE
      GROUP BY p.produto_id, p.nome, p.tem_tamanhos, p.status
      ORDER BY p.produto_id;
    `;

    const result = await pool.query(query);
    
    // Formatar dados para facilitar uso no frontend
    const estoque = result.rows.reduce((acc, produto) => {
      const key = produto.produto_nome.toLowerCase()
        .replace(/\s+/g, '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, ''); // Remove acentos
      
      if (produto.tem_tamanhos) {
        const tamanhos = {};
        produto.estoque.forEach(item => {
          if (item.tamanho) {
            tamanhos[item.tamanho] = item.quantidade;
          }
        });
        acc[key] = tamanhos;
      } else {
        acc[key] = produto.estoque[0]?.quantidade || 0;
      }
      
      return acc;
    }, {});

    res.json({
      success: true,
      data: estoque
    });

  } catch (error) {
    console.error('Erro ao consultar estoque:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

router.put('/atualizar', async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const { produto_nome, tamanho, nova_quantidade, tipo_operacao } = req.body;

    // Buscar produto_id pelo nome (case insensitive)
    const produtoResult = await client.query(
      'SELECT produto_id FROM produtos WHERE nome ILIKE $1',
      [produto_nome]
    );

    if (produtoResult.rows.length === 0) {
      throw new Error('Produto não encontrado');
    }

    const produto_id = produtoResult.rows[0].produto_id;

    // Buscar tamanho_id pelo nome, se tamanho informado
    let tamanho_id = null;
    if (tamanho) {
      const tamanhoResult = await client.query(
        'SELECT tamanho_id FROM tamanhos WHERE nome = $1',
        [tamanho]
      );

      if (tamanhoResult.rows.length === 0) {
        throw new Error('Tamanho não encontrado');
      }

      tamanho_id = tamanhoResult.rows[0].tamanho_id;
    }

    // Atualizar quantidade no estoque
    const updateResult = await client.query(
      `UPDATE estoque 
       SET quantidade = $1
       WHERE produto_id = $2 AND 
             ($3::int IS NULL OR tamanho_id = $3)`,
      [nova_quantidade, produto_id, tamanho_id]
    );

    if (updateResult.rowCount === 0) {
      // Se não atualizou nenhum registro, pode ser que não exista, então insere um novo
      await client.query(
        `INSERT INTO estoque (produto_id, tamanho_id, quantidade)
         VALUES ($1, $2, $3)`,
        [produto_id, tamanho_id, nova_quantidade]
      );
    }

    // Registrar movimentação (opcional)
    if (tipo_operacao) {
      const quantidade_movimentacao = tipo_operacao === 'adicionar' ? nova_quantidade : -nova_quantidade;

      await client.query(
        `INSERT INTO movimentacoes_estoque (produto_id, tamanho_id, quantidade, tipo)
         VALUES ($1, $2, $3, $4)`,
        [produto_id, tamanho_id, 1, tipo_operacao === 'adicionar' ? 'entrada' : 'saida']
      );
    }

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Estoque atualizado com sucesso',
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erro ao atualizar estoque:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erro interno do servidor',
    });
  } finally {
    client.release();
  }
});

// GET /estoque/resumo - resumo do estoque por produto (compatível com seu schema)
router.get('/resumo', async (req, res) => {
  try {
    const query = `
      SELECT
        p.produto_id,
        p.nome AS produto_nome,
        p.tem_tamanhos,
        e.quantidade,
        t.nome AS tamanho,
        t.tamanho_id
      FROM produtos p
      LEFT JOIN estoque e ON p.produto_id = e.produto_id
      LEFT JOIN tamanhos t ON e.tamanho_id = t.tamanho_id
      WHERE p.status = TRUE
      ORDER BY p.produto_id, t.tamanho_id;
    `;

    const result = await pool.query(query);
    const rows = result.rows;

    // Agrupa por produto_id (garante um objeto por produto, mesmo sem linhas de estoque)
    const produtos = {}; // produto_id -> { nome, tem_tamanhos, sizes: {}, total }

    rows.forEach(row => {
      const id = row.produto_id;
      if (!produtos[id]) {
        produtos[id] = {
          nome: row.produto_nome,
          tem_tamanhos: !!row.tem_tamanhos,
          sizes: {}, // P,M,G,GG quando aplicável
          total: 0
        };
      }

      const p = produtos[id];
      const quantidade = row.quantidade === null ? 0 : Number(row.quantidade);

      if (p.tem_tamanhos) {
        // se tem tamanhos, atribuimos à chave do tamanho (se houver)
        if (row.tamanho) {
          p.sizes[row.tamanho] = quantidade;
          p.total += quantidade;
        } else {
          // linha sem tamanho (possível se não existe estoque) -> nada a somar
        }
      } else {
        // sem tamanhos: somamos todas as quantidades (se houverem várias linhas, somam)
        p.total += quantidade;
      }
    });

    // Agora montamos as respostas nos dois formatos: byName (nome original) e byKey (chave normalizada)
    const byName = {}; // "Collant Básico Adulto" -> { P:.., M:.., G:.., GG:.., total } ou { total }
    const byKey = {};  // "collantbasicoadulto" -> sizes object OR numeric total (compat com seu frontend antigo)

    for (const id in produtos) {
      const p = produtos[id];
      const nome = p.nome;

      // normaliza chave sem espaços e sem acentos (igual ao que você já usa)
      const key = nome.toLowerCase()
        .replace(/\s+/g, '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');

      if (p.tem_tamanhos) {
        // garante as chaves P M G GG mesmo que não existam no DB
        const sizesObj = {
          P: p.sizes['P'] || 0,
          M: p.sizes['M'] || 0,
          G: p.sizes['G'] || 0,
          GG: p.sizes['GG'] || 0
        };
        const total = Object.values(sizesObj).reduce((a, b) => a + b, 0);
        byName[nome] = { ...sizesObj, total };
        byKey[key] = sizesObj; // compatibilidade com seu endpoint anterior
      } else {
        byName[nome] = { total: p.total };
        byKey[key] = p.total; // compat com formato antigo (valor numérico)
      }
    }

    return res.json({
      success: true,
      data: byKey,   // compat com quem já usa data.collantbasicoadulto
      byName         // útil para telas como Home: byName['Redinha'].total
    });
  } catch (error) {
    console.error('Erro ao gerar resumo do estoque:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});


module.exports = router;