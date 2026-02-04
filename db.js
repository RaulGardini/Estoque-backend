require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

pool.on('connect', () => {
  console.log('✅ Conectado ao Supabase com sucesso!');
});

pool.on('error', (err) => {
  console.error('❌ Erro inesperado no pool de conexão:', err);
});

module.exports = pool;