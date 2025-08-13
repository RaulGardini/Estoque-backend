const { Pool } = require('pg');

const pool = new Pool({
  user: 'metabase_user',
  host: 'postgresdatabase.c1yc2eo2crc4.us-east-2.rds.amazonaws.com',
  database: 'metabase',
  password: '1324657981010Raul',
  port: 5432,
  ssl: {
    rejectUnauthorized: false // ignora verificação de certificado
  }
});

module.exports = pool;