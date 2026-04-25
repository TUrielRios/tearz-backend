const app = require('./src/app');
const config = require('./src/config');
const { sequelize } = require('./src/models');

const start = async () => {
  try {
    // Test DB connection
    await sequelize.authenticate();
    console.log('✅ Conexión a PostgreSQL establecida correctamente');

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
