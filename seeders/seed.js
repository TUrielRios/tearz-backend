/**
 * Seed script — loads initial categories, products, and admin user.
 *
 * Run with: npm run seed
 */

require('dotenv').config();
const { sequelize, User, Category, Product } = require('../src/models');

const categories = [
  { name: 'Remeras', slug: 'remeras' },
  { name: 'Chombas', slug: 'chombas' },
  { name: 'Bermudas', slug: 'bermudas' },
  { name: 'Musculosas', slug: 'musculosas' },
  { name: 'Gorras', slug: 'gorras' },
  { name: 'Conjuntos', slug: 'conjuntos' },
];

const getProducts = (categoryMap) => [
  {
    name: 'Chomba "The infamous"',
    description: 'Chomba negra de pique Premium con estampa en dtf en el frente y espalda. Corte regular fit.',
    price: 25000,
    stock: 50,
    images: ['/Pilchas/Pilcha-12.jpg'],
    colors: ['#1a1a1a'],
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    badge: 'NUEVO',
    categoryId: categoryMap['Chombas'],
  },
  {
    name: 'Chomba "Dios bendiga"',
    description: 'Chomba blanca de pique Premium con estampa en dtf en el frente y espalda. Corte regular fit.',
    price: 25000,
    stock: 50,
    images: ['/Pilchas/Pilcha-02.jpg'],
    colors: ['#ffffff'],
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    badge: 'NUEVO',
    categoryId: categoryMap['Chombas'],
  },
  {
    name: 'Remera "Nascar"',
    description: 'Remera blanca de 100% algodón, con estampa en el frente y espalda en dtf. Corte regular fit.',
    price: 20000,
    stock: 50,
    images: ['/Pilchas/Pilcha-03.jpg'],
    colors: ['#ffffff'],
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    badge: 'NUEVO',
    categoryId: categoryMap['Remeras'],
  },
  {
    name: 'Remera "cash rules"',
    description: 'Remera negra 100% algodón con estampa en dtf en frente y espalda. Corte Oversize.',
    price: 22000,
    stock: 50,
    images: ['/Pilchas/Pilcha-04.jpg'],
    colors: ['#1a1a1a'],
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    badge: 'NUEVO',
    categoryId: categoryMap['Remeras'],
  },
  {
    name: 'Conjunto "southside"',
    description: 'Remera "southside outlaws" blanca o negra + bermuda oversize negra.',
    price: 45000,
    stock: 30,
    images: ['/Pilchas/Pilcha-05.jpg'],
    colors: ['#ffffff', '#1a1a1a'],
    sizes: ['Único'],
    categoryId: categoryMap['Conjuntos'],
  },
  {
    name: 'Remera "southside outlaws"',
    description: 'Remera blanca/negra 100% algodón con estampa dtf en frente y espalda. Corte oversize.',
    price: 22000,
    stock: 50,
    images: ['/Pilchas/Pilcha-06.jpg'],
    colors: ['#ffffff', '#1a1a1a'],
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    categoryId: categoryMap['Remeras'],
  },
  {
    name: 'Bermuda negra oversize',
    description: 'Bermuda de algodón negra, con estampas dtf en el frente. Corte oversize.',
    price: 25000,
    stock: 40,
    images: ['/Pilchas/Pilcha-07.jpg'],
    colors: ['#1a1a1a'],
    sizes: ['2', '4', '6'],
    categoryId: categoryMap['Bermudas'],
  },
  {
    name: 'Musculosa "campeón"',
    description: 'Musculosa blanca/negra 100% algodón con estampa dtf en el frente. Corte regular.',
    price: 20000,
    stock: 50,
    images: ['/Pilchas/Pilcha-08.jpg'],
    colors: ['#ffffff', '#1a1a1a'],
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    categoryId: categoryMap['Musculosas'],
  },
  {
    name: 'Remera "portofino"',
    description: 'Remera blanca/negra 100% algodón con estampa en dtf en el frente y espalda. Corte oversize.',
    price: 22000,
    stock: 50,
    images: ['/Pilchas/Pilcha-09.jpg'],
    colors: ['#ffffff', '#1a1a1a'],
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    categoryId: categoryMap['Remeras'],
  },
  {
    name: 'Remera "western"',
    description: 'Remera blanca 100% algodón con estampa en el frente. Corte regular.',
    price: 17000,
    oldPrice: 20000,
    stock: 30,
    images: ['/Pilchas/Pilcha-10.jpg'],
    colors: ['#ffffff'],
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    badge: '15% OFF',
    categoryId: categoryMap['Remeras'],
  },
  {
    name: 'Gorra visera plana negra',
    description: 'Gorra visera plana negra, con bordado en el frente.',
    price: 17500,
    stock: 40,
    images: ['/Pilchas/Pilcha-11.jpg'],
    colors: ['#1a1a1a'],
    sizes: ['Ajustable'],
    categoryId: categoryMap['Gorras'],
  },
];

const seed = async () => {
  try {
    console.log('🌱 Iniciando seed...\n');

    await sequelize.authenticate();
    console.log('✅ Conexión a DB establecida');

    // Sync with force to recreate tables
    await sequelize.sync({ force: true });
    console.log('✅ Tablas recreadas\n');

    // 1. Create categories
    const createdCategories = await Category.bulkCreate(categories, { individualHooks: true });
    const categoryMap = {};
    createdCategories.forEach((cat) => {
      categoryMap[cat.name] = cat.id;
    });
    console.log(`📂 ${createdCategories.length} categorías creadas`);

    // 2. Create products
    const products = getProducts(categoryMap);
    const createdProducts = await Product.bulkCreate(products);
    console.log(`📦 ${createdProducts.length} productos creados`);

    // 3. Create admin user
    const adminUser = await User.create({
      email: 'admin@tearz1874.com',
      password: 'admin123',
      firstName: 'Admin',
      lastName: 'Tearz',
      role: 'admin',
    });
    console.log(`👤 Admin creado: ${adminUser.email}`);

    // 4. Create test customer
    const customer = await User.create({
      email: 'cliente@test.com',
      password: 'cliente123',
      firstName: 'Cliente',
      lastName: 'Test',
      role: 'customer',
    });
    console.log(`👤 Cliente test creado: ${customer.email}`);

    console.log('\n🎉 Seed completado exitosamente!\n');
    console.log('─────────────────────────────────────');
    console.log('  Admin:   admin@tearz1874.com / admin123');
    console.log('  Cliente: cliente@test.com / cliente123');
    console.log('─────────────────────────────────────\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error en seed:', error);
    process.exit(1);
  }
};

seed();
