/**
 * Migration: Add tracking_code and admin_notes columns to orders table
 * Run once: node src/migrations/addShippingFields.js
 */
require('dotenv').config();
const sequelize = require('../config/database');

async function migrate() {
  try {
    await sequelize.authenticate();
    console.log('✅ Connected to DB');

    await sequelize.query(`
      ALTER TABLE orders
        ADD COLUMN IF NOT EXISTS tracking_code VARCHAR(255),
        ADD COLUMN IF NOT EXISTS admin_notes TEXT;
    `);

    console.log('✅ Migration complete: tracking_code and admin_notes added to orders');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

migrate();
