// File: serverE.js
// Commit: enable CORS for Vercel frontend to fix blocked fetch requests

import express from 'express';
import cors from 'cors';
import pkg from 'pg';

const { Pool } = pkg;
const app = express();
const port = process.env.PORT || 8080;

// Allow requests from your Vercel frontend
app.use(cors({
  origin: 'https://img-front-de8fz5o3b-darius-gillinghams-projects.vercel.app'
}));

// Parse JSON requests
app.use(express.json());

// PostgreSQL connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Route to get 10 random image URLs from image_index table
app.get('/api/random-images', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT path FROM image_index ORDER BY RANDOM() LIMIT 10'
    );
    const urls = rows.map(r => r.path);
    res.json(urls);
  } catch (err) {
    console.error('Error fetching images:', err);
    res.status(500).json({ error: 'Failed to fetch images' });
  }
});

// Start server
app.listen(port, () => {
  console.log(`✓ serverE listening on port ${port}`);
});
