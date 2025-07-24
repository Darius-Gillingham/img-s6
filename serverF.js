// File: s6/serverF.js
// Commit: add cluster index API and static JSON output for frontend viewer integration

import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { createClient } from '@supabase/supabase-js';

const require = createRequire(import.meta.url);
const Jimp = require('jimp');

const app = express();
app.use(cors());
app.use(express.json());

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);
const RADIUS = 30;
const REGIONS = 4;
const COLOR_BUCKET_SIZE = 20;
const OUTPUT_DIR = './output';

function getBucketColor({ r, g, b }) {
  const bucket = (val) => Math.round(val / COLOR_BUCKET_SIZE) * COLOR_BUCKET_SIZE;
  return {
    r: bucket(r),
    g: bucket(g),
    b: bucket(b),
  };
}

function colorToFilename({ r, g, b }) {
  return `r_${r}_g_${g}_b_${b}.json`;
}

function ensureDirExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

async function sampleImageColor(url) {
  const image = await Jimp.read(url);
  const { width, height } = image.bitmap;
  const samples = [];

  for (let i = 0; i < REGIONS; i++) {
    const x = Math.floor(Math.random() * width);
    const y = Math.floor(Math.random() * height);
    let r = 0, g = 0, b = 0, count = 0;

    for (let dx = -RADIUS; dx <= RADIUS; dx++) {
      for (let dy = -RADIUS; dy <= RADIUS; dy++) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && ny >= 0 && nx < width && ny < height && dx * dx + dy * dy <= RADIUS * RADIUS) {
          const color = Jimp.intToRGBA(image.getPixelColor(nx, ny));
          r += color.r;
          g += color.g;
          b += color.b;
          count++;
        }
      }
    }

    samples.push({ r: r / count, g: g / count, b: b / count });
  }

  return samples.reduce(
    (acc, c) => ({
      r: acc.r + c.r / samples.length,
      g: acc.g + c.g / samples.length,
      b: acc.b + c.b / samples.length,
    }),
    { r: 0, g: 0, b: 0 }
  );
}

app.get('/api/scan-and-group', async (req, res) => {
  try {
    ensureDirExists(OUTPUT_DIR);

    const { data, error } = await supabase
      .from('image_index')
      .select('path')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;

    const imageUrls = data.map((row) => `${SUPABASE_URL}/storage/v1/object/public/generated-images/${row.path}`);
    const grouped = {};

    for (const url of imageUrls) {
      try {
        const avgColor = await sampleImageColor(url);
        const bucket = getBucketColor(avgColor);
        const key = colorToFilename(bucket);

        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(url);
      } catch (err) {
        console.warn(`⚠️ Skipped image ${url}: ${err.message}`);
      }
    }

    for (const [filename, urls] of Object.entries(grouped)) {
      const fullPath = path.join(OUTPUT_DIR, filename);
      fs.writeFileSync(fullPath, JSON.stringify(urls, null, 2));
    }

    res.json({ message: '✓ Grouped and written to disk', groups: Object.keys(grouped).length });
  } catch (err) {
    console.error('✗ Error in scan-and-group:', err.message);
    res.status(500).json({ error: 'Failed to group images' });
  }
});

app.get('/api/clusters', (_, res) => {
  try {
    const files = fs.readdirSync(OUTPUT_DIR).filter(f => f.endsWith('.json'));
    const result = files.map(filename => ({
      group: filename.replace('.json', ''),
      imagesUrl: `/output/${filename}`
    }));
    res.json(result);
  } catch (err) {
    console.error('✗ Failed to read output directory:', err.message);
    res.status(500).json({ error: 'Unable to read clusters' });
  }
});

app.use('/output', express.static(path.join(OUTPUT_DIR)));

app.get('/health', (_, res) => {
  res.send('✓ serverF is alive');
});

const port = process.env.PORT || 8081;
app.listen(port, () => {
  console.log(`✓ serverF listening on port ${port}`);
});
