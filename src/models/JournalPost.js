const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const JournalPost = sequelize.define('JournalPost', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  slug: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  excerpt: {
    type: DataTypes.TEXT,
    allowNull: false,
    defaultValue: '',
  },
  body: {
    type: DataTypes.TEXT('long'),
    allowNull: false,
    defaultValue: '',
  },
  coverImage: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  published: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  publishedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  tableName: 'journal_posts',
});

module.exports = JournalPost;
