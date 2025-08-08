const express = require('express');
const router = express.Router();
const pool = require('../db');

// Listar movimentações
router.get('/', async (req, res) => {
  try {
    const query = `
      SELECT m.*, p.nome AS produto, t.nome AS tamanho
      FROM movimentacoes_estoque m
      LEFT JOIN produtos p ON p.produto_id = m.produto_id
      LEFT JOIN tamanhos t ON t.tamanho_id = m.tamanho_id
      ORDER BY m.data_movimentacao DESC;
    `;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao buscar movimentações', error);
    res.status(500).json({ erro: 'Erro ao buscar movimentações' });
  }
});

// Criar movimentação
router.post('/', async (req, res) => {
  try {
    const { produto_id, tamanho_id, quantidade, tipo } = req.body;

    // Registrar movimentação
    const mov = await pool.query(
      `INSERT INTO movimentacoes_estoque 
      (produto_id, tamanho_id, quantidade, tipo) 
      VALUES ($1, $2, $3, $4) RETURNING *`,
      [produto_id, tamanho_id || null, quantidade, tipo]
    );

    // Atualizar estoque
    await pool.query(
      `UPDATE estoque SET quantidade = quantidade + $1
       WHERE produto_id = $2 AND (tamanho_id = $3 OR (tamanho_id IS NULL AND $3 IS NULL))`,
      [quantidade, produto_id, tamanho_id || null]
    );

    res.status(201).json(mov.rows[0]);
  } catch (error) {
    console.error('Erro ao criar movimentação', error);
    res.status(500).json({ erro: 'Erro ao criar movimentação' });
  }
});

module.exports = router;