// File: s5/serverE.js
// Commit: fix Postgres connection by using real environment variable `SUPABASE_SERVICE_ROLE` and `SUPABASE_URL`

import express from 'express';
import cors from 'cors';
import pkg from 'pg';
import fetch from 'node-fetch';

const { Pool } = pkg;

const app = express();
const port = process.env.PORT || 8080;
app.use(cors());

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
  console.error('❌ SUPABASE_URL or SUPABASE_SERVICE_ROLE is not defined');
  process.exit(1);
}

const pool = new Pool({
  connectionString: `${SUPABASE_URL.replace('https', 'postgres')}?sslmode=require`,
  password: SUPABASE_SERVICE_ROLE
});

app.get('/api/random-images', async (req, res) => {
  try {
    const result = await pool.query('SELECT url FROM image_index ORDER BY RANDOM() LIMIT 10');
    const urls = result.rows.map(row => row.url);
    res.json(urls);
  } catch (error) {
    console.error('Error fetching images:', error);
    res.status(500).json({ error: 'Error fetching image URLs' });
  }
});

app.listen(port, () => {
  console.log(`✓ serverE listening on port ${port}`);
});
