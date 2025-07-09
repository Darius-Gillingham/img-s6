// File: s5/serverE.js
// Commit: remove unused `node-fetch` import and correct to use only actual env vars `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE`

import express from 'express';
import cors from 'cors';
import pkg from 'pg';

const { Pool } = pkg;
const app = express();
const port = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE in environment variables');
  process.exit(1);
}

// Use hardcoded supabase postgres url format only if absolutely valid
const pool = new Pool({
  connectionString: process.env.SUPABASE_DB_URL,
  ssl: { rejectUnauthorized: false },
});

app.get('/api/random-images', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT path FROM image_index
      ORDER BY RANDOM()
      LIMIT 10
    `);
    const urls = rows.map(r =>
      `https://${new URL(SUPABASE_URL).host}/storage/v1/object/public/generated-images/${r.path}`
    );
    res.json(urls);
  } catch (err) {
    console.error('✗ Error fetching images:', err);
    res.status(500).json({ error: 'Failed to fetch image URLs' });
  }
});

app.get('/health', (req, res) => {
  res.send('✓ Backend is alive');
});

app.listen(port, () => {
  console.log(`✓ serverE listening on port ${port}`);
});
