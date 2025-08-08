const express = require('express');
const router = express.Router();
const pool = require('../db');

// POST /auth/validar - Valida a senha
router.post('/validar', (req, res) => {
  try {
    const { senha } = req.body;

    if (!senha) {
      return res.status(400).json({
        success: false,
        message: 'Senha é obrigatória'
      });
    }

    if (senha === 'Vladiatp') {
      res.json({
        success: true,
        message: 'Senha válida',
        data: {
          permissao: 'Usuario'
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