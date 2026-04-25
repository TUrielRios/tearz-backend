const { Sequelize } = require('sequelize');
const sequelize = require('../config/database');

module.exports = {
  async up() {
    await sequelize.getQueryInterface().addColumn('orders', 'shipping_method', {
      type: Sequelize.ENUM('shipping', 'pickup'),
      defaultValue: 'shipping',
    });
  },

  async down() {
    await sequelize.getQueryInterface().removeColumn('orders', 'shipping_method');
  },
};