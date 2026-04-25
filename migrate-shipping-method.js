const sequelize = require('./src/config/database');

async function runMigration() {
  try {
    await sequelize.query("ALTER TABLE orders ADD COLUMN shipping_method VARCHAR(20) DEFAULT 'shipping'");
    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error.message);
  } finally {
    await sequelize.close();
  }
}

runMigration();