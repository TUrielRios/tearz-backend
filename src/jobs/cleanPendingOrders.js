/**
 * Job: Clean up pending orders older than 24 hours.
 * 
 * Orders that remain "pending" for more than 24h are assumed abandoned
 * and are cancelled to free up potential stock reservations.
 *
 * Can be run as a cron job: node src/jobs/cleanPendingOrders.js
 * Or imported and called from a scheduler.
 */

require('dotenv').config();
const { Op } = require('sequelize');
const { Order } = require('../models');

const HOURS_THRESHOLD = 24;

const cleanPendingOrders = async () => {
  const cutoff = new Date(Date.now() - HOURS_THRESHOLD * 60 * 60 * 1000);

  try {
    const [affectedCount] = await Order.update(
      { status: 'cancelled' },
      {
        where: {
          status: 'pending',
          createdAt: { [Op.lt]: cutoff },
        },
      }
    );

    if (affectedCount > 0) {
      console.log(`🧹 ${affectedCount} órdenes pendientes canceladas (más de ${HOURS_THRESHOLD}h)`);
    } else {
      console.log('✅ No hay órdenes pendientes para limpiar');
    }

    return affectedCount;
  } catch (error) {
    console.error('❌ Error limpiando órdenes pendientes:', error);
    throw error;
  }
};

// Run directly if called as script
if (require.main === module) {
  const sequelize = require('../config/database');
  
  sequelize.authenticate()
    .then(() => cleanPendingOrders())
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = cleanPendingOrders;
