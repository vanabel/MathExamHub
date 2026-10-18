#!/usr/bin/env node
/**
 * CLI password reset (username only). No HTTP route.
 *
 *   node backend/scripts/reset-password.js <username>
 *
 * New password from RESET_PASSWORD env or stdin (hidden on TTY). Never logged or echoed to stdout.
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const bcrypt = require('bcryptjs');
const connectDB = require('../config/database');
const User = require('../models/User');
const mongoose = require('mongoose');
const { readNewPassword } = require('./lib/readSecret');

async function main() {
  const username = process.argv[2];
  if (!username || username.startsWith('-')) {
    process.stderr.write(
      'Usage: node backend/scripts/reset-password.js <username>\n'
      + '  Password: RESET_PASSWORD env or stdin (hidden prompt on TTY).\n',
    );
    process.exit(1);
  }

  const newPassword = await readNewPassword({ envVar: 'RESET_PASSWORD' });
  if (!newPassword || newPassword.length < 1) {
    process.stderr.write('Error: empty password\n');
    process.exit(1);
  }

  await connectDB();
  const user = await User.findOne({ username });
  if (!user) {
    process.stderr.write(`Error: user not found: ${username}\n`);
    await mongoose.disconnect();
    process.exit(1);
  }

  user.password = await bcrypt.hash(newPassword, 10);
  user.updatedTime = new Date();
  await user.save();

  process.stdout.write(`OK password reset for user: ${user.username}\n`);
  await mongoose.disconnect();
}

if (require.main === module) {
  main().catch((err) => {
    process.stderr.write(`Error: ${err.message}\n`);
    process.exit(1);
  });
}

module.exports = { readNewPassword };
