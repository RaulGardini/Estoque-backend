const express = require('express');
const cors = require('cors');

const produtosRoutes = require('./routes/produtos');
const tamanhosRoutes = require('./routes/tamanhos');
const estoqueRoutes = require('./routes/estoque');
const movimentacoesRoutes = require('./routes/movimentacoes');
const loginRoutes = require('./routes/login');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Rotas
app.use('/produtos', produtosRoutes);
app.use('/tamanhos', tamanhosRoutes);
app.use('/estoque', estoqueRoutes);
app.use('/movimentacoes', movimentacoesRoutes);
app.use('/login', loginRoutes);

// Iniciar servidor
const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});