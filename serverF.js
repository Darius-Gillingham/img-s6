// File: s6/serverF.js
// Commit: implement color-based clustering of Supabase images and forward similar sets to serverG test

import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import Jimp from 'jimp';
import axios from 'axios';

const app = express();
app.use(cors());
app.use(express.json());

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE;
const SERVER_E_ENDPOINT = process.env.SERVER_E_ENDPOINT; // e.g., http://serverE:8080/api/random-images
const SERVER_G_ENDPOINT = process.env.SERVER_G_ENDPOINT; // e.g., http://serverG:8082/api/transition-batch

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE || !SERVER_E_ENDPOINT || !SERVER_G_ENDPOINT) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const RADIUS = 30;
const CLUSTERS_REQUIRED = 5;
const NEIGHBOR_BATCH_SIZE = 12;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);

function euclideanDistance(a, b) {
  return Math.sqrt((a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2);
}

async function sampleImageColor(url, regions = 4) {
  const image = await Jimp.read(url);
  const { width, height } = image.bitmap;
  const samples = [];

  for (let i = 0; i < regions; i++) {
    const x = Math.floor(Math.random() * width);
    const y = Math.floor(Math.random() * height);
    let r = 0, g = 0, b = 0, count = 0;

    for (let dx = -RADIUS; dx <= RADIUS; dx++) {
      for (let dy = -RADIUS; dy <= RADIUS; dy++) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && ny >= 0 && nx < width && ny < height && dx*dx + dy*dy <= RADIUS*RADIUS) {
          const color = Jimp.intToRGBA(image.getPixelColor(nx, ny));
          r += color.r; g += color.g; b += color.b;
          count++;
        }
      }
    }

    samples.push({ r: r / count, g: g / count, b: b / count });
  }

  const avg = samples.reduce((acc, c) => ({
    r: acc.r + c.r / samples.length,
    g: acc.g + c.g / samples.length,
    b: acc.b + c.b / samples.length,
  }), { r: 0, g: 0, b: 0 });

  return avg;
}

app.get('/api/scan-and-cluster', async (req, res) => {
  try {
    const { data: imageUrls } = await axios.get(`${SERVER_E_ENDPOINT}`);

    const imageProfiles = [];
    for (const url of imageUrls) {
      try {
        const color = await sampleImageColor(url);
        imageProfiles.push({ url, color });
      } catch (err) {
        console.warn(`⚠️ Failed to process ${url}:`, err.message);
      }
    }

    const clusters = [];

    for (let i = 0; i < imageProfiles.length; i++) {
      const current = imageProfiles[i];
      const cluster = imageProfiles.filter(p =>
        euclideanDistance(p.color, current.color) < 40 // Adjust for tighter/looser match
      );

      if (cluster.length >= CLUSTERS_REQUIRED) {
        const selected = cluster.slice(0, NEIGHBOR_BATCH_SIZE);
        clusters.push(selected.map(c => c.url));
      }
    }

    if (clusters.length === 0) {
      return res.json({ message: 'No viable clusters found.' });
    }

    for (const batch of clusters) {
      await axios.post(`${SERVER_G_ENDPOINT}`, { images: batch });
    }

    res.json({ message: '✓ Clustered and forwarded batches', total: clusters.length });
  } catch (err) {
    console.error('✗ Error during clustering:', err.message);
    res.status(500).json({ error: 'Clustering failed' });
  }
});

app.get('/health', (_, res) => {
  res.send('✓ serverF is alive');
});

const port = process.env.PORT || 8081;
app.listen(port, () => {
  console.log(`✓ serverF listening on port ${port}`);
});
