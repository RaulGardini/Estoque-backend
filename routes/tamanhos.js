const express = require('express');
const router = express.Router();
const pool = require('../db');

// Listar tamanhos
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM tamanhos ORDER BY tamanho_id');
    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao buscar tamanhos', error);
    res.status(500).json({ erro: 'Erro ao buscar tamanhos' });
  }
});

module.exports = router;