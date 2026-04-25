const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const SiteContent = sequelize.define('SiteContent', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  key: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  value: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: {},
  },
}, {
  tableName: 'site_contents',
});

module.exports = SiteContent;
