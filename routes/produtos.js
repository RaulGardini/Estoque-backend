const express = require('express');
const router = express.Router();
const pool = require('../db');

router.get('/estoque', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                produto,
                tamanho,
                quantidade
            FROM estoque
        `);

        // Organiza os dados por produto
        const produtos = {};
        result.rows.forEach(item => {
            if (!produtos[item.produto]) {
                produtos[item.produto] = { P: 0, M: 0, G: 0, GG: 0, total: 0 };
            }
            produtos[item.produto][item.tamanho] = item.quantidade;
            produtos[item.produto].total += item.quantidade;
        });

        res.json(produtos);
    } catch (error) {
        console.error('Erro ao buscar estoque:', error);
        res.status(500).json({ error: 'Erro ao buscar estoque' });
    }
});

module.exports = router;