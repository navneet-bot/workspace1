const { Pool } = require('@neondatabase/serverless');
const ws = require('ws');
const { neonConfig } = require('@neondatabase/serverless');
neonConfig.webSocketConstructor = ws;

async function main() {
  const connectionString = "postgresql://neondb_owner:npg_Ot2Hh4GFaVQS@ep-shy-band-aqfbltvm-pooler.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require"
  const pool = new Pool({ connectionString })
  try {
    const res = await pool.query('SELECT 1 as num')
    console.log(res.rows)
  } catch (e) {
    console.error(e)
  }
}
main()
