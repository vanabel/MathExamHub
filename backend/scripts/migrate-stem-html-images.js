#!/usr/bin/env node
/**
 * Move legacy <img> / <image> / media <a href> markup from questionText into question.images.
 *
 * Usage:
 *   node scripts/migrate-stem-html-images.js            # dry-run (default)
 *   node scripts/migrate-stem-html-images.js --apply    # write changes
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const mongoose = require('mongoose');
const connectDB = require('../config/database');
const Question = require('../models/Question');
const { extractImagesFromStem } = require('../utils/questionImages');

async function migrateStemHtmlImages({ apply }) {
  const cursor = Question.find({}).cursor();
  let scanned = 0;
  let wouldChange = 0;
  let changed = 0;

  for await (const doc of cursor) {
    scanned += 1;
    const beforeStem = doc.questionText || '';
    const extracted = extractImagesFromStem(beforeStem, doc.images || []);
    const stemChanged = extracted.stem !== beforeStem.trim();
    const imagesChanged = JSON.stringify(extracted.images) !== JSON.stringify(doc.images || []);
    if (!stemChanged && !imagesChanged) continue;
    wouldChange += 1;
    if (apply) {
      await Question.updateOne(
        { _id: doc._id },
        { $set: { questionText: extracted.stem, images: extracted.images, updatedAt: new Date() } },
      );
      changed += 1;
    }
  }

  return { scanned, wouldChange, changed, apply };
}

async function main() {
  const apply = process.argv.includes('--apply');
  if (process.argv.includes('--dry-run')) {
    // explicit dry-run
  }
  await connectDB();
  const result = await migrateStemHtmlImages({ apply });
  console.log(JSON.stringify({ ...result, mode: apply ? 'apply' : 'dry-run' }, null, 2));
  await mongoose.disconnect();
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = { migrateStemHtmlImages };
