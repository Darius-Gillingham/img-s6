// File: s5/serverE.js
// Commit: remove hallucinated SUPABASE_DB_URL and use SUPABASE_URL for pg connection

import express from 'express';
import cors from 'cors';
import pg from 'pg';

const { Pool } = pg;
const app = express();
const port = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

const SUPABASE_URL = process.env.SUPABASE_URL;

if (!SUPABASE_URL) {
  console.error('❌ SUPABASE_URL is not defined in environment');
  process.exit(1);
}

const pool = new Pool({
  connectionString: SUPABASE_URL,
  ssl: { rejectUnauthorized: false },
});

app.get('/api/random-images', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT path FROM image_index
      ORDER BY RANDOM()
      LIMIT 10
    `);
    const urls = rows.map(row =>
      `https://${new URL(SUPABASE_URL).host}/storage/v1/object/public/generated-images/${row.path}`
    );
    res.json(urls);
  } catch (err) {
    console.error('✗ Error fetching images:', err);
    res.status(500).json({ error: 'Failed to fetch image URLs' });
  }
});

app.get('/health', (_, res) => {
  res.send('✓ Backend is alive');
});

app.listen(port, () => {
  console.log(`✓ serverE listening on port ${port}`);
});
