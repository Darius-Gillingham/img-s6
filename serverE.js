// File: serverE.js
// Commit: add CORS support for Vercel frontend

import express from 'express';
import cors from 'cors';
import pkg from 'pg';

const { Pool } = pkg;

const app = express();
const port = 8080;

// Allow requests from the deployed Vercel frontend
app.use(cors({
  origin: 'https://img-front-1gesgreh8-darius-gillinghams-projects.vercel.app',
}));

// PostgreSQL connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

// Endpoint to return 15 random image paths
app.get('/api/random-images', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT path FROM image_index
      ORDER BY RANDOM()
      LIMIT 15
    `);
    const urls = result.rows.map(row =>
      `https://${process.env.SUPABASE_BUCKET}.supabase.co/storage/v1/object/public/${row.path}`
    );
    res.json(urls);
  } catch (err) {
    console.error('✗ Failed to fetch image paths:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.listen(port, () => {
  console.log(`✓ serverE listening on port ${port}`);
});
