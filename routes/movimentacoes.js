const express = require('express');
const router = express.Router();
const pool = require('../db');

// Listar movimentações com filtros
router.get('/', async (req, res) => {
  try {
    const { produto_id, tipo, limite, offset } = req.query;

    let query = `
      SELECT m.*, p.nome AS produto, t.nome AS tamanho
      FROM movimentacoes_estoque m
      LEFT JOIN produtos p ON p.produto_id = m.produto_id
      LEFT JOIN tamanhos t ON t.tamanho_id = m.tamanho_id
    `;

    const params = [];
    const conditions = [];
    let paramIndex = 1;

    // Filtro por produto_id
    if (produto_id) {
      conditions.push(`m.produto_id = $${paramIndex}`);
      params.push(parseInt(produto_id));
      paramIndex++;
    }

    // Filtro por tipo de movimentação
    if (tipo) {
      conditions.push(`m.tipo = $${paramIndex}`);
      params.push(tipo);
      paramIndex++;
    }

    // Adiciona WHERE se houver condições
    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    // Ordena por data mais recente
    query += ' ORDER BY m.data_movimentacao DESC';

    // Paginação
    if (limite) {
      query += ` LIMIT $${paramIndex}`;
      params.push(parseInt(limite));
      paramIndex++;
    }

    if (offset) {
      query += ` OFFSET $${paramIndex}`;
      params.push(parseInt(offset));
    }

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao buscar movimentações', error);
    res.status(500).json({ erro: 'Erro ao buscar movimentações' });
  }
});

// GET /movimentacoes/vendas-valor - Retorna o valor total de vendas por produto
router.get('/vendas-valor', async (req, res) => {
  try {
    const precosProdutos = {
      'Collant Básico Adulto': 80.00,
      'Collant Básico Infantil': 60.00,
      'Collant Preliminar Adulto': 80.00,
      'Collant Preliminar Infantil': 60.00,
      'Redinha': 25.00,
      'Adereço': 15.00,
      'Sapatilha Preta': 90.00,
      'Sapatilha Rosa': 45.00,
      'Meia Adulto': 15.00,
      'Meia Infantil': 15.00,
    };

    const query = `
      SELECT 
        p.produto_id,
        p.nome AS produto,
        SUM(m.quantidade) as total_vendido
      FROM movimentacoes_estoque m
      JOIN produtos p ON p.produto_id = m.produto_id
      WHERE m.tipo = 'saida'
      GROUP BY p.produto_id, p.nome
      ORDER BY p.nome
    `;

    const result = await pool.query(query);
    
    // Adicionar preços e calcular valor total
    const dadosComPreco = result.rows.map(produto => {
      const preco = precosProdutos[produto.produto] || 0.00;
      const valorTotal = preco * parseInt(produto.total_vendido);
      
      return {
        produto_id: produto.produto_id,
        produto: produto.produto,
        preco: preco,
        total_vendido: parseInt(produto.total_vendido),
        valor_total: valorTotal
      };
    });

    // Ordenar por valor total decrescente
    dadosComPreco.sort((a, b) => b.valor_total - a.valor_total);
    
    // Calcular total geral
    const totalGeral = dadosComPreco.reduce((total, produto) => {
      return total + produto.valor_total;
    }, 0);

    res.json({
      success: true,
      data: dadosComPreco,
      total_geral: totalGeral
    });

  } catch (error) {
    console.error('Erro ao calcular valor das vendas:', error);
    res.status(500).json({ 
      success: false,
      erro: 'Erro ao calcular valor das vendas' 
    });
  }
});

module.exports = router;