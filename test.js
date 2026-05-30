const { Pool } = require('@neondatabase/serverless');
const p = new Pool({ connectionString: "postgresql://neondb_owner:npg_Ot2Hh4GFaVQS@ep-shy-band-aqfbltvm-pooler.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require" });
console.log(p.options);
