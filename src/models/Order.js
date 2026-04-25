const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Order = sequelize.define('Order', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('pending', 'paid', 'cancelled', 'shipped', 'delivered'),
    defaultValue: 'pending',
  },
  totalPrice: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  shippingAddress: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  shippingCost: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
  },
  shippingMethod: {
    type: DataTypes.ENUM('shipping', 'pickup'),
    defaultValue: 'shipping',
  },
  couponId: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  discount: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
  },
  trackingCode: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  adminNotes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  tableName: 'orders',
  indexes: [
    { fields: ['user_id'] },
    { fields: ['status'] },
  ],
});

module.exports = Order;
