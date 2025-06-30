// File: cleanerB.js
// Commit: fix path resolution to use __dirname logic for ESM modular compatibility

import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

console.log('=== Running cleanerB.js ===');

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE
);

// Read from shared prompt folder in s2
const DIR = path.join(__dirname, '../s2/data/prompts');

async function uploadWordsets(file) {
  const fullPath = path.join(DIR, file);
  const data = await fs.readFile(fullPath, 'utf-8');
  const parsed = JSON.parse(data);
  const wordsets = parsed.wordsets;

  for (const ws of wordsets) {
    const [noun1, noun2, verb, adjective1, adjective2, style, setting, era, mood] = ws;
    await supabase.from('wordsets').insert({
      noun1, noun2, verb, adjective1, adjective2, style, setting, era, mood
    });
  }

  await fs.unlink(fullPath);
  await fs.unlink(fullPath + '.done');

  console.log(`✓ Uploaded and deleted ${file}`);
}

async function run() {
  const files = await fs.readdir(DIR);
  for (const file of files) {
    if (!file.endsWith('.json') || !file.startsWith('wordsets-')) continue;

    const donePath = path.join(DIR, file + '.done');
    try {
      await fs.access(donePath);
      await uploadWordsets(file);
    } catch {
      continue;
    }
  }
}

run().catch((err) => console.error('✗ cleanerB failed:', err));
