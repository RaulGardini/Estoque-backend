const express = require('express');
const router = express.Router();
const pool = require('../db');

router.get('/estoque', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        p.nome as produto,
        t.nome as tamanho,
        e.quantidade
      FROM estoque e
      LEFT JOIN produtos p ON p.produto_id = e.produto_id
      LEFT JOIN tamanhos t ON t.tamanho_id = e.tamanho_id
      ORDER BY p.produto_id, t.tamanho_id
    `);

    // Organiza os dados por produto
    const produtos = {};
    result.rows.forEach(item => {
      if (!produtos[item.produto]) {
        produtos[item.produto] = { P: 0, M: 0, G: 0, GG: 0, total: 0 };
      }
      
      if (item.tamanho) {
        produtos[item.produto][item.tamanho] = item.quantidade || 0;
        produtos[item.produto].total += item.quantidade || 0;
      } else {
        // Produto sem tamanho
        produtos[item.produto].total = item.quantidade || 0;
      }
    });

    res.json({
      success: true,
      data: produtos
    });
  } catch (error) {
    console.error('Erro ao buscar estoque:', error);
    res.status(500).json({ 
      success: false,
      error: 'Erro ao buscar estoque',
      message: error.message
    });
  }
});

module.exports = router;