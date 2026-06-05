#!/usr/bin/env node
'use strict';
// scripts/fetch-photos.js
// Downloads Pexels stock photos for the Jethro Kimathi website.
// Usage: PEXELS_API_KEY=your_key node scripts/fetch-photos.js
//
// Get a free Pexels API key at: https://www.pexels.com/api/

const https  = require('https');
const fs     = require('fs');
const path   = require('path');
const { URL } = require('url');

const API_KEY = process.env.PEXELS_API_KEY;
if (!API_KEY) {
  console.error('Error: PEXELS_API_KEY not set.');
  console.error('Get a free key at https://www.pexels.com/api/ then run:');
  console.error('  PEXELS_API_KEY=your_key node scripts/fetch-photos.js');
  process.exit(1);
}

const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'assets', 'photos');
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

// Photo sets to fetch — key maps to manifest.json entry + filename
const PHOTO_SETS = [
  { key: 'ministry-1',  query: 'church sermon preacher worship', orientation: 'landscape' },
  { key: 'ministry-2',  query: 'bible reading prayer hands faith', orientation: 'landscape' },
  { key: 'agri-1',      query: 'african farmer crops harvest field', orientation: 'landscape' },
  { key: 'agri-2',      query: 'sustainable farming green field', orientation: 'landscape' },
  { key: 'agri-3',      query: 'agriculture training community', orientation: 'landscape' },
  { key: 'blog-default',query: 'open book journal writing pen', orientation: 'landscape' },
];

function pexelsSearch(query, orientation) {
  return new Promise((resolve, reject) => {
    const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&orientation=${orientation}&per_page=5&size=medium`;
    https.get(url, { headers: { Authorization: API_KEY } }, res => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch(e) { reject(e); }
      });
    }).on('error', reject);
  });
}

function download(imageUrl, dest) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(imageUrl);
    https.get({ hostname: parsed.hostname, path: parsed.pathname + parsed.search, headers: { 'User-Agent': 'JethroKimathi/1.0' } }, res => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return download(res.headers.location, dest).then(resolve).catch(reject);
      }
      const file = fs.createWriteStream(dest);
      res.pipe(file);
      file.on('finish', () => { file.close(); resolve(); });
      file.on('error', reject);
    }).on('error', reject);
  });
}

async function run() {
  const manifest = {};

  // Keep existing portrait photos in manifest
  if (fs.existsSync(path.join(OUTPUT_DIR, 'jethro-portrait-web.jpg'))) {
    manifest.about = '/assets/photos/jethro-portrait-web.jpg';
    console.log('✓ about  → jethro-portrait-web.jpg (existing)');
  }
  if (fs.existsSync(path.join(OUTPUT_DIR, 'jethro-2-web.jpg'))) {
    manifest.hero = '/assets/photos/jethro-2-web.jpg';
    console.log('✓ hero   → jethro-2-web.jpg (existing)');
  }

  for (const set of PHOTO_SETS) {
    try {
      console.log(`Searching Pexels: "${set.query}"…`);
      const results = await pexelsSearch(set.query, set.orientation);
      const photos = results.photos || [];
      if (!photos.length) { console.warn(`  No results for "${set.query}"`); continue; }

      const photo = photos[0];
      const imgUrl = photo.src.large2x || photo.src.large || photo.src.original;
      const filename = `${set.key}.jpg`;
      const dest = path.join(OUTPUT_DIR, filename);

      console.log(`  Downloading ${filename} (${photo.photographer})…`);
      await download(imgUrl, dest);

      // Compress with sips if on macOS
      try {
        const { execSync } = require('child_process');
        execSync(`sips -Z 1920 --setProperty formatOptions 82 "${dest}" --out "${dest}" 2>/dev/null`, { stdio: 'ignore' });
      } catch(_) {}

      manifest[set.key] = `/assets/photos/${filename}`;
      manifest[`${set.key}_credit`] = `Photo by ${photo.photographer} on Pexels`;
      console.log(`  ✓ ${set.key} → ${filename}`);

      // Be polite to the API
      await new Promise(r => setTimeout(r, 800));
    } catch(e) {
      console.warn(`  ✗ Failed to fetch "${set.key}": ${e.message}`);
    }
  }

  fs.writeFileSync(path.join(OUTPUT_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2));
  console.log('\n✓ Done. manifest.json written to public/assets/photos/');
  console.log('  Credits:', Object.entries(manifest).filter(([k])=>k.endsWith('_credit')).map(([,v])=>v).join('; '));
}

run().catch(e => { console.error(e); process.exit(1); });
