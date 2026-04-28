const sequelize = require('../config/database');
const User = require('./User');
const Product = require('./Product');
const Category = require('./Category');
const Order = require('./Order');
const OrderItem = require('./OrderItem');
const Payment = require('./Payment');
const Coupon = require('./Coupon');
const SiteContent = require('./SiteContent');
const JournalPost = require('./JournalPost');

// ─── Associations ────────────────────────────────────────

// User ↔ Orders
User.hasMany(Order, { foreignKey: 'userId', as: 'orders' });
Order.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// Order ↔ OrderItems
Order.hasMany(OrderItem, { foreignKey: 'orderId', as: 'items' });
OrderItem.belongsTo(Order, { foreignKey: 'orderId', as: 'order' });

// OrderItem ↔ Product
OrderItem.belongsTo(Product, { foreignKey: 'productId', as: 'product' });
Product.hasMany(OrderItem, { foreignKey: 'productId', as: 'orderItems' });

// Product ↔ Category
Category.hasMany(Product, { foreignKey: 'categoryId', as: 'products' });
Product.belongsTo(Category, { foreignKey: 'categoryId', as: 'category' });

// Order ↔ Payment (1:1)
Order.hasOne(Payment, { foreignKey: 'orderId', as: 'payment' });
Payment.belongsTo(Order, { foreignKey: 'orderId', as: 'order' });

// Order ↔ Coupon
Order.belongsTo(Coupon, { foreignKey: 'couponId', as: 'coupon' });
Coupon.hasMany(Order, { foreignKey: 'couponId', as: 'orders' });

module.exports = {
  sequelize,
  User,
  Product,
  Category,
  Order,
  OrderItem,
  Payment,
  Coupon,
  SiteContent,
  JournalPost,
};
