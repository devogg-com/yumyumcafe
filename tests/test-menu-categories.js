const assert = require('assert');
const Database = require('better-sqlite3');
const { initSchema } = require('../src/shared/schema');
const MenuService = require('../src/main/services/menuService').constructor;

function runTest() {
  console.log('--- TEST 3: Menu Categories & Products CRUD & Reordering ---');

  const db = new Database(':memory:');
  initSchema(db);
  const dbGetter = () => db;
  const menu = new MenuService(dbGetter);

  const accountId = 'test-account-123';
  // Create account placeholder in DB
  db.prepare(`
    INSERT INTO accounts (id, cafe_name, owner_name, email, username, password_hash, security_question, security_answer_hash, created_at, updated_at)
    VALUES (?, 'Test Cafe', 'Tester', 'test@test.com', 'tester', 'hash', 'q', 'a', datetime('now'), datetime('now'))
  `).run(accountId);

  // 1. Create categories
  const cat1 = menu.createCategory(accountId, 'Beverages', 1);
  const cat2 = menu.createCategory(accountId, 'Burgers', 2);
  const cat3 = menu.createCategory(accountId, 'Desserts', 3);

  let cats = menu.getCategories(accountId);
  assert.strictEqual(cats.length, 3);
  assert.strictEqual(cats[0].name, 'Beverages');

  // 2. Rename category
  menu.updateCategory(accountId, cat2.id, 'Artisan Burgers', 2);
  cats = menu.getCategories(accountId);
  assert.strictEqual(cats[1].name, 'Artisan Burgers');

  // 3. Reorder categories
  menu.reorderCategories(accountId, [
    { id: cat3.id, display_order: 1 },
    { id: cat1.id, display_order: 2 },
    { id: cat2.id, display_order: 3 }
  ]);
  cats = menu.getCategories(accountId);
  assert.strictEqual(cats[0].name, 'Desserts');
  assert.strictEqual(cats[1].name, 'Beverages');
  assert.strictEqual(cats[2].name, 'Artisan Burgers');

  // 4. Products CRUD
  const prod1 = menu.createProduct(accountId, {
    category_id: cat1.id,
    name: 'Iced Caramel Macchiato',
    price: 180,
    is_available: true
  });
  const prod2 = menu.createProduct(accountId, {
    category_id: cat1.id,
    name: 'Cold Brew',
    price: 140,
    is_available: true
  });
  const prod3 = menu.createProduct(accountId, {
    category_id: cat2.id,
    name: 'Crispy Veg Burger',
    price: 120,
    is_available: false
  });

  // Query all
  let prods = menu.getProducts(accountId);
  assert.strictEqual(prods.length, 3);

  // Filter by category
  let cat1Prods = menu.getProducts(accountId, { category_id: cat1.id });
  assert.strictEqual(cat1Prods.length, 2);

  // Filter available only
  let availProds = menu.getProducts(accountId, { available_only: true });
  assert.strictEqual(availProds.length, 2);
  assert(!availProds.some(p => p.name === 'Crispy Veg Burger'));

  // Search by text
  let searchProds = menu.getProducts(accountId, { search: 'brew' });
  assert.strictEqual(searchProds.length, 1);
  assert.strictEqual(searchProds[0].name, 'Cold Brew');

  // Update product price
  menu.updateProduct(accountId, prod1.id, { price: 195 });
  const updatedProd = menu.getProducts(accountId, { search: 'macchiato' })[0];
  assert.strictEqual(updatedProd.price, 195);

  // Soft delete product
  menu.deleteProduct(accountId, prod2.id);
  prods = menu.getProducts(accountId);
  assert.strictEqual(prods.length, 2);
  assert(!prods.some(p => p.id === prod2.id));

  // Soft delete category
  menu.deleteCategory(accountId, cat3.id);
  cats = menu.getCategories(accountId);
  assert.strictEqual(cats.length, 2);
  assert(!cats.some(c => c.id === cat3.id));

  console.log('✓ Category creation, renaming, reordering, and soft deletion verified');
  console.log('✓ Product creation, pricing, search, category filter, and availability verified');

  db.close();
}

module.exports = runTest;

if (require.main === module) {
  runTest();
  console.log('Menu tests passed!');
}
