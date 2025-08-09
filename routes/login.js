const express = require('express');
const router = express.Router();
const pool = require('../db');

// POST /auth/validar - Valida a senha
router.post('/validar', async (req, res) => {
  try {
    const { senha } = req.body;

    if (!senha) {
      return res.status(400).json({
        success: false,
        message: 'Senha é obrigatória'
      });
    }

    // Buscar senha no banco de dados
    const query = 'SELECT * FROM senhas WHERE senha = $1';
    const result = await pool.query(query, [senha]);

    if (result.rows.length > 0) {
      const usuario = result.rows[0];
      
      res.json({
        success: true,
        message: 'Senha válida',
        data: {
          permissao: usuario.permissao,
          senha_id: usuario.senha_id
        }
      });
    } else {
      res.status(401).json({
        success: false,
        message: 'Senha incorreta'
      });
    }

  } catch (error) {
    console.error('Erro ao validar senha:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

module.exports = router;