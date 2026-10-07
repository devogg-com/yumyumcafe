const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { getLocalDb } = require('../database/db');
const configService = require('./configService');

class AuthService {
  constructor(dbGetter = getLocalDb) {
    this.getDb = dbGetter;
    this.currentUser = null;
  }

  async register(data) {
    const {
      cafe_name,
      owner_name,
      email,
      username,
      password,
      confirm_password,
      security_question,
      security_answer
    } = data;

    if (!cafe_name || !owner_name || !email || !username || !password) {
      throw new Error('Please fill in all required registration fields.');
    }

    if (password !== confirm_password) {
      throw new Error('Passwords do not match.');
    }

    if (password.length < 6) {
      throw new Error('Password must be at least 6 characters long.');
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanUsername = username.trim().toLowerCase();
    const db = this.getDb();

    // Check duplicate
    const existing = db.prepare('SELECT email, username FROM accounts WHERE email = ? OR username = ?').get(cleanEmail, cleanUsername);
    if (existing) {
      if (existing.email === cleanEmail) throw new Error('An account with this email already exists.');
      throw new Error('This username is already taken.');
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const secQuestion = security_question || 'What is your favorite food?';
    const answerHash = await bcrypt.hash((security_answer || 'pizza').trim().toLowerCase(), 10);
    const accountId = crypto.randomUUID();
    const now = new Date().toISOString();

    db.transaction(() => {
      db.prepare(`
        INSERT INTO accounts (id, cafe_name, owner_name, email, username, password_hash, security_question, security_answer_hash, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(accountId, cafe_name.trim(), owner_name.trim(), cleanEmail, cleanUsername, passwordHash, secQuestion, answerHash, now, now);

      db.prepare(`
        INSERT INTO settings (account_id, cafe_name, owner_name, address, phone, logo_path, upi_id, upi_qr_data, server_url, receipt_paper_width, created_at, updated_at)
        VALUES (?, ?, ?, '', '', '', '', '', '', '80mm', ?, ?)
      `).run(accountId, cafe_name.trim(), owner_name.trim(), now, now);

      // Also record in sync_queue to push if server is connected
      db.prepare(`
        INSERT INTO sync_queue (id, account_id, entity_type, entity_id, operation, created_at)
        VALUES (?, ?, 'account', ?, 'upsert', ?)
      `).run(crypto.randomUUID(), accountId, accountId, now);
    })();

    const account = {
      id: accountId,
      cafe_name: cafe_name.trim(),
      owner_name: owner_name.trim(),
      email: cleanEmail,
      username: cleanUsername
    };

    this.currentUser = account;
    return account;
  }

  async login(username, password) {
    if (!username || !password) {
      throw new Error('Username/Email and password are required.');
    }

    const db = this.getDb();
    const cleanIdentifier = username.trim().toLowerCase();

    const account = db.prepare(`
      SELECT id, cafe_name, owner_name, email, username, password_hash
      FROM accounts
      WHERE LOWER(username) = ? OR LOWER(email) = ?
    `).get(cleanIdentifier, cleanIdentifier);

    if (!account) {
      throw new Error('Invalid username/email or password.');
    }

    const match = await bcrypt.compare(password, account.password_hash);
    if (!match) {
      throw new Error('Invalid username/email or password.');
    }

    const user = {
      id: account.id,
      cafe_name: account.cafe_name,
      owner_name: account.owner_name,
      email: account.email,
      username: account.username
    };

    this.currentUser = user;
    return user;
  }

  async loginWithRememberMe(username, password, rememberMe = false) {
    const user = await this.login(username, password);
    if (rememberMe) {
      configService.set('remembered_user_id', user.id);
    } else {
      configService.set('remembered_user_id', '');
    }
    return user;
  }

  getCurrentUser() {
    if (this.currentUser) return this.currentUser;

    // Check persisted session (Remember Me)
    try {
      const savedUserId = configService.get('remembered_user_id', '');
      if (savedUserId) {
        const db = this.getDb();
        const account = db.prepare(
          'SELECT id, cafe_name, owner_name, email, username FROM accounts WHERE id = ?'
        ).get(savedUserId);
        if (account) {
          this.currentUser = {
            id: account.id,
            cafe_name: account.cafe_name,
            owner_name: account.owner_name,
            email: account.email,
            username: account.username
          };
          return this.currentUser;
        }
      }
    } catch (e) {
      // silently ignore if config not yet initialized
    }
    return null;
  }

  setCurrentUser(user) {
    this.currentUser = user;
  }

  logout() {
    this.currentUser = null;
    try { configService.set('remembered_user_id', ''); } catch (e) {}
    return true;
  }

  getSecurityQuestion(usernameOrEmail) {
    if (!usernameOrEmail) throw new Error('Username or email is required.');
    const db = this.getDb();
    const clean = usernameOrEmail.trim().toLowerCase();
    const account = db.prepare('SELECT security_question FROM accounts WHERE LOWER(username) = ? OR LOWER(email) = ?').get(clean, clean);
    if (!account) throw new Error('No account found with this username or email.');
    return account.security_question;
  }

  async resetPassword(usernameOrEmail, securityAnswer, newPassword, confirmPassword) {
    if (!usernameOrEmail || !securityAnswer || !newPassword) {
      throw new Error('All fields are required.');
    }
    if (newPassword.length < 6) {
      throw new Error('New password must be at least 6 characters long.');
    }
    if (confirmPassword && newPassword !== confirmPassword) {
      throw new Error('Passwords do not match.');
    }

    const db = this.getDb();
    const clean = usernameOrEmail.trim().toLowerCase();
    const account = db.prepare('SELECT id, security_answer_hash FROM accounts WHERE LOWER(username) = ? OR LOWER(email) = ?').get(clean, clean);
    if (!account) throw new Error('Account not found.');

    const match = await bcrypt.compare(securityAnswer.trim().toLowerCase(), account.security_answer_hash);
    if (!match) throw new Error('Security answer is incorrect.');

    const newHash = await bcrypt.hash(newPassword, 10);
    const now = new Date().toISOString();

    db.prepare('UPDATE accounts SET password_hash = ?, updated_at = ? WHERE id = ?').run(newHash, now, account.id);
    return true;
  }
}

module.exports = new AuthService();
