// File: serverE.js
// Commit: launch Express API server with `/api/random-images` route to return signed Supabase image URLs

import express from 'express';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE
);

app.get('/api/random-images', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('image_index')
      .select('path')
      .order('created_at', { ascending: false })
      .limit(1000);

    if (error || !data) {
      console.warn('✗ Failed to fetch image_index:', error?.message);
      return res.status(500).json([]);
    }

    const shuffled = data.sort(() => Math.random() - 0.5).slice(0, 15);

    const signed = await Promise.all(
      shuffled.map(async ({ path }) => {
        const { data: urlData, error: urlError } = await supabase.storage
          .from('generated-images')
          .createSignedUrl(path, 3600);

        if (urlError || !urlData?.signedUrl) {
          console.warn(`✗ Could not sign path ${path}:`, urlError?.message);
          return null;
        }

        return urlData.signedUrl;
      })
    );

    const filtered = signed.filter(Boolean);
    res.json(filtered);
  } catch (err) {
    console.error('✗ Error in /api/random-images:', err instanceof Error ? err.message : err);
    res.status(500).json([]);
  }
});

app.get('/', (_, res) => {
  res.send('✓ Image index server is running');
});

app.listen(port, () => {
  console.log(`✓ serverE listening on port ${port}`);
});
