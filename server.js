require('dotenv').config();
const express = require('express');
const cors = require('cors');
const pool = require('./db');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logger simples
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// ============================================
// ROTAS DE TESTE
// ============================================

// Rota principal
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'API de Estoque de Ballet - Online! 🩰',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'API funcionando!',
    timestamp: new Date().toISOString()
  });
});

// Teste de conexão com banco
app.get('/api/test/connection', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW() as now, current_database() as database, version() as version');
    res.json({
      success: true,
      message: 'Conexão com Supabase estabelecida!',
      data: {
        timestamp: result.rows[0].now,
        database: result.rows[0].database,
        version: result.rows[0].version
      }
    });
  } catch (error) {
    console.error('Erro ao testar conexão:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao conectar com Supabase',
      error: error.message
    });
  }
});

// Teste para listar produtos
app.get('/api/test/produtos', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM produtos ORDER BY produto_id');
    res.json({
      success: true,
      total: result.rows.length,
      produtos: result.rows
    });
  } catch (error) {
    console.error('Erro ao buscar produtos:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Teste para listar tamanhos
app.get('/api/test/tamanhos', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM tamanhos ORDER BY tamanho_id');
    res.json({
      success: true,
      total: result.rows.length,
      tamanhos: result.rows
    });
  } catch (error) {
    console.error('Erro ao buscar tamanhos:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Teste para listar estoque
app.get('/api/test/estoque', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        e.*, 
        p.nome as produto_nome, 
        t.nome as tamanho_nome
      FROM estoque e
      LEFT JOIN produtos p ON p.produto_id = e.produto_id
      LEFT JOIN tamanhos t ON t.tamanho_id = e.tamanho_id
      ORDER BY e.produto_id, e.tamanho_id
    `);
    res.json({
      success: true,
      total: result.rows.length,
      estoque: result.rows
    });
  } catch (error) {
    console.error('Erro ao buscar estoque:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================
// ROTAS PRINCIPAIS
// ============================================

// Importar rotas
const produtosRoutes = require('./routes/produtos');
const estoqueRoutes = require('./routes/estoque');
const movimentacoesRoutes = require('./routes/movimentacoes');
const loginRoutes = require('./routes/login');

// Usar rotas
app.use('/produtos', produtosRoutes);
app.use('/estoque', estoqueRoutes);
app.use('/movimentacoes', movimentacoesRoutes);
app.use('/login', loginRoutes);

// ============================================
// TRATAMENTO DE ERROS
// ============================================

// Rota não encontrada
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Rota não encontrada',
    path: req.path
  });
});

// Error handler global
app.use((error, req, res, next) => {
  console.error('Erro não tratado:', error);
  res.status(500).json({
    success: false,
    message: 'Erro interno do servidor',
    error: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
});

// ============================================
// INICIAR SERVIDOR
// ============================================

const PORT = process.env.PORT || 3001;

app.listen(PORT, async () => {
  console.log('');
  console.log('🚀 ========================================');
  console.log(`🩰 Servidor rodando na porta ${PORT}`);
  console.log(`📍 http://localhost:${PORT}`);
  console.log('🔧 Ambiente:', process.env.NODE_ENV || 'development');
  console.log('========================================');
  console.log('');
  
  // Testar conexão com banco ao iniciar
  try {
    const result = await pool.query('SELECT NOW() as now, current_database() as db');
    console.log('✅ Banco de dados conectado!');
    console.log('   Database:', result.rows[0].db);
    console.log('   Timestamp:', result.rows[0].now);
  } catch (error) {
    console.error('❌ Erro ao conectar com banco de dados:', error.message);
    console.error('💡 Verifique suas credenciais no arquivo .env');
    console.error('');
    console.error('📝 DATABASE_URL atual:', process.env.DATABASE_URL ? 'Configurado' : 'NÃO CONFIGURADO');
  }
  
  console.log('');
  console.log('📝 Rotas disponíveis:');
  console.log('   GET  /');
  console.log('   GET  /api/health');
  console.log('   GET  /api/test/connection');
  console.log('   GET  /api/test/produtos');
  console.log('   GET  /api/test/tamanhos');
  console.log('   GET  /api/test/estoque');
  console.log('   ');
  console.log('   GET  /produtos/estoque');
  console.log('   GET  /estoque');
  console.log('   GET  /estoque/resumo');
  console.log('   PUT  /estoque/atualizar');
  console.log('   PUT  /estoque/atualizar-simples');
  console.log('   GET  /movimentacoes');
  console.log('   GET  /movimentacoes/vendas-valor');
  console.log('   DELETE /movimentacoes/limpar');
  console.log('   POST /login/validar');
  console.log('');
});

// Tratamento de encerramento gracioso
process.on('SIGTERM', () => {
  console.log('SIGTERM recebido. Encerrando servidor...');
  pool.end(() => {
    console.log('Pool de conexão encerrado.');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\nSIGINT recebido. Encerrando servidor...');
  pool.end(() => {
    console.log('Pool de conexão encerrado.');
    process.exit(0);
  });
});

module.exports = app;