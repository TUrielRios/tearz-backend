const app = require('./src/app');
const config = require('./src/config');
const { sequelize } = require('./src/models');

const start = async () => {
  try {
    // Test DB connection
    await sequelize.authenticate();
    console.log('✅ Conexión a PostgreSQL establecida correctamente');

    // Manual migration for sizeStock column in Products table
    try {
      await sequelize.query('ALTER TABLE products ADD COLUMN IF NOT EXISTS size_stock JSON DEFAULT \'{}\';');
      console.log('✅ Columna size_stock verificada/agregada');
    } catch (err) {
      console.error('⚠️ Error agregando columna size_stock:', err.message);
    }

    // Manual migration for category_ids column in Bundles table
    try {
      await sequelize.query('ALTER TABLE bundles ADD COLUMN IF NOT EXISTS category_ids JSON DEFAULT \'[]\';');
      console.log('✅ Columna category_ids verificada/agregada');
    } catch (err) {
      console.error('⚠️ Error agregando columna category_ids:', err.message);
    }

    // Manual migration for is_accessory column in Categories table
    try {
      await sequelize.query('ALTER TABLE categories ADD COLUMN IF NOT EXISTS is_accessory BOOLEAN DEFAULT false;');
      console.log('✅ Columna is_accessory verificada/agregada');
    } catch (err) {
      console.error('⚠️ Error agregando columna is_accessory:', err.message);
    }

    // Sync models (dev only — en producción usar migraciones)
    if (config.env === 'development') {
      await sequelize.sync({ alter: false });
      console.log('✅ Modelos sincronizados con la base de datos');
    }

    // Start server
    app.listen(config.port, () => {
      console.log(`\n🔥 Tearz 1874! API corriendo en http://localhost:${config.port}`);
      console.log(`📍 Entorno: ${config.env}`);
      console.log(`🏥 Health check: http://localhost:${config.port}/api/health\n`);
    });
  } catch (error) {
    console.error('❌ Error al iniciar el servidor:', error);
    process.exit(1);
  }
};

start();
