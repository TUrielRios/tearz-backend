const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Coupon = sequelize.define('Coupon', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  code: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  type: {
    type: DataTypes.ENUM('percentage', 'fixed'),
    allowNull: false,
  },
  value: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  minPurchase: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
  },
  maxUses: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  usedCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
}, {
  tableName: 'coupons',
  hooks: {
    beforeCreate: (coupon) => {
      if (coupon.code) {
        coupon.code = coupon.code.toUpperCase().trim();
      }
    },
  },
});

module.exports = Coupon;
