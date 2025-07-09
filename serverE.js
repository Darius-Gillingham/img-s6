// File: serverE.js

import express from 'express';
import cors from 'cors';
import pkg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pkg;
const app = express();
const port = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

app.get('/api/random-images', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT url FROM image_index
      ORDER BY RANDOM()
      LIMIT 10;
    `);
    const urls = result.rows.map(row => row.url);
    res.json(urls);
  } catch (err) {
    console.error('✗ Error fetching from image_index:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/health', (req, res) => {
  res.send('✓ Backend is alive');
});

app.listen(port, () => {
  console.log(`✓ serverE listening on port ${port}`);
});
