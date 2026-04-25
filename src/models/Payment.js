const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Payment = sequelize.define('Payment', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  orderId: {
    type: DataTypes.UUID,
    allowNull: false,
    unique: true,
  },
  provider: {
    type: DataTypes.STRING,
    defaultValue: 'mercadopago',
  },
  status: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected'),
    defaultValue: 'pending',
  },
  externalId: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  paymentUrl: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  rawData: {
    type: DataTypes.JSON,
    allowNull: true,
  },
}, {
  tableName: 'payments',
});

module.exports = Payment;
