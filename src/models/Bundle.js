const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Bundle = sequelize.define('Bundle', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  productIds: {
    type: DataTypes.JSON, // Array of product IDs that trigger the discount
    allowNull: false,
    defaultValue: [],
  },
  categoryIds: {
    type: DataTypes.JSON, // Array of category IDs that trigger the discount
    allowNull: false,
    defaultValue: [],
  },
  discountPercentage: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 1,
      max: 100,
    },
  },
  active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
}, {
  tableName: 'bundles',
  timestamps: true,
  underscored: true,
});

module.exports = Bundle;
