const assert = require('assert');
const Database = require('better-sqlite3');
const { initSchema } = require('../src/shared/schema');
const AuthService = require('../src/main/services/authService').constructor;
const MenuService = require('../src/main/services/menuService').constructor;

async function runTest() {
  console.log('--- TEST 2: Auth, Password Hashing & Strict Account Isolation ---');

  const db = new Database(':memory:');
  initSchema(db);
  const dbGetter = () => db;

  const auth = new AuthService(dbGetter);
  const menu = new MenuService(dbGetter);

  // 1. Register Account A
  const accA = await auth.register({
    cafe_name: 'Yum Yum Cafe Main',
    owner_name: 'Owner Alice',
    email: 'alice@yumyum.com',
    username: 'alice',
    password: 'password123',
    confirm_password: 'password123',
    security_question: 'What is your favorite beverage?',
    security_answer: 'Espresso'
  });

  assert(accA.id, 'Account A should have a valid UUID');
  assert.strictEqual(accA.username, 'alice');

  // Verify password in DB is hashed and not plaintext
  const rawA = db.prepare('SELECT password_hash FROM accounts WHERE id = ?').get(accA.id);
  assert(rawA.password_hash !== 'password123', 'Password must NOT be plaintext');
  assert(rawA.password_hash.startsWith('$2'), 'Password must be bcrypt hash');

  // 2. Login Account A
  const loginA = await auth.login('alice', 'password123');
  assert.strictEqual(loginA.id, accA.id, 'Login should succeed for Account A');

  // Login with wrong password should fail
  await assert.rejects(async () => {
    await auth.login('alice', 'wrongpass');
  }, /Invalid username\/email or password/);

  // 3. Register Account B
  const accB = await auth.register({
    cafe_name: 'Yum Yum Cafe Express',
    owner_name: 'Owner Bob',
    email: 'bob@yumyum.com',
    username: 'bob',
    password: 'password456',
    confirm_password: 'password456',
    security_question: 'What is your favorite beverage?',
    security_answer: 'Mocha'
  });

  assert(accB.id, 'Account B should have a valid UUID');
  assert(accB.id !== accA.id, 'Account IDs must be distinct');

  // 4. Test Account Isolation:
  // Account A creates 2 categories and 1 product
  const catA1 = menu.createCategory(accA.id, 'Hot Coffee', 1);
  const catA2 = menu.createCategory(accA.id, 'Cakes', 2);
  const prodA = menu.createProduct(accA.id, {
    category_id: catA1.id,
    name: 'Alice Special Latte',
    price: 150
  });

  // Account B creates 1 category
  const catB1 = menu.createCategory(accB.id, 'Coolers', 1);

  // Query categories for Account A
  const catsForA = menu.getCategories(accA.id);
  assert.strictEqual(catsForA.length, 2, 'Account A must see only its 2 categories');
  assert(catsForA.some(c => c.name === 'Hot Coffee'));
  assert(!catsForA.some(c => c.name === 'Coolers'), 'Account A must NOT see Account B category');

  // Query categories for Account B
  const catsForB = menu.getCategories(accB.id);
  assert.strictEqual(catsForB.length, 1, 'Account B must see only its 1 category');
  assert.strictEqual(catsForB[0].name, 'Coolers');
  assert(!catsForB.some(c => c.name === 'Hot Coffee'), 'Account B must NOT see Account A category');

  // Query products for Account B
  const prodsForB = menu.getProducts(accB.id);
  assert.strictEqual(prodsForB.length, 0, 'Account B must have 0 products');

  // 5. Test Password Reset flow
  const q = auth.getSecurityQuestion('alice');
  assert.strictEqual(q, 'What is your favorite beverage?');

  await auth.resetPassword('alice', 'Espresso', 'newsecret789', 'newsecret789');
  // New login with updated password
  const newLogin = await auth.login('alice', 'newsecret789');
  assert.strictEqual(newLogin.id, accA.id, 'Login with new reset password must succeed');

  console.log('✓ Account registration and bcrypt password hashing verified');
  console.log('✓ Strict account data isolation verified (Account A and B data isolated)');
  console.log('✓ Password reset flow with security question verified');

  db.close();
}

module.exports = runTest;

if (require.main === module) {
  runTest().then(() => console.log('Auth isolation tests passed!'));
}
