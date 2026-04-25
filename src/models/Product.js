const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Product = sequelize.define('Product', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  oldPrice: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
  },
  stock: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    validate: {
      min: 0,
    },
  },
  images: {
    type: DataTypes.JSON,
    defaultValue: [],
  },
  colors: {
    type: DataTypes.JSON,
    defaultValue: [],
  },
  sizes: {
    type: DataTypes.JSON,
    defaultValue: [],
  },
  badge: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  categoryId: {
    type: DataTypes.UUID,
    allowNull: true,
  },
}, {
  tableName: 'products',
  indexes: [
    { fields: ['name'] },
    { fields: ['active'] },
    { fields: ['category_id'] },
  ],
});

module.exports = Product;
