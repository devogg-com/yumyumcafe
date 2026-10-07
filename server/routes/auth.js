const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { getDb } = require('../database/db');
const { generateToken, authenticateToken } = require('../middleware/auth');

// Register a new Cafe Account
router.post('/register', async (req, res) => {
  try {
    const {
      cafe_name,
      owner_name,
      email,
      username,
      password,
      confirm_password,
      security_question,
      security_answer
    } = req.body;

    // Validation
    if (!cafe_name || !owner_name || !email || !username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please fill in all required registration fields.'
      });
    }

    if (password !== confirm_password) {
      return res.status(400).json({
        success: false,
        message: 'Passwords do not match.'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long.'
      });
    }

    const secQuestion = security_question || 'What is your favorite food?';
    const secAnswer = security_answer || 'pizza';

    const db = getDb();
    const cleanEmail = email.trim().toLowerCase();
    const cleanUsername = username.trim().toLowerCase();

    // Check if email or username already exists
    const existing = db.prepare('SELECT id, email, username FROM accounts WHERE email = ? OR username = ?').get(cleanEmail, cleanUsername);
    if (existing) {
      if (existing.email === cleanEmail) {
        return res.status(409).json({ success: false, message: 'An account with this email already exists.' });
      }
      return res.status(409).json({ success: false, message: 'This username is already taken.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const answerHash = await bcrypt.hash(secAnswer.trim().toLowerCase(), 10);
    const accountId = crypto.randomUUID();
    const now = new Date().toISOString();

    const insertAccount = db.prepare(`
      INSERT INTO accounts (id, cafe_name, owner_name, email, username, password_hash, security_question, security_answer_hash, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertSettings = db.prepare(`
      INSERT INTO settings (account_id, cafe_name, owner_name, address, phone, logo_path, upi_id, upi_qr_data, server_url, receipt_paper_width, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // Insert account and default settings in a transaction
    db.transaction(() => {
      insertAccount.run(
        accountId,
        cafe_name.trim(),
        owner_name.trim(),
        cleanEmail,
        cleanUsername,
        passwordHash,
        secQuestion,
        answerHash,
        now,
        now
      );

      insertSettings.run(
        accountId,
        cafe_name.trim(),
        owner_name.trim(),
        '', // address
        '', // phone
        '', // logo_path
        '', // upi_id
        '', // upi_qr_data
        '', // server_url
        '80mm',
        now,
        now
      );
    })();

    const account = {
      id: accountId,
      cafe_name: cafe_name.trim(),
      owner_name: owner_name.trim(),
      email: cleanEmail,
      username: cleanUsername
    };

    const token = generateToken(account);

    res.status(201).json({
      success: true,
      message: 'Account registered successfully.',
      token,
      account
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to create account. Please try again.'
    });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username/Email and password are required.'
      });
    }

    const db = getDb();
    const identifier = username.trim().toLowerCase();

    const account = db.prepare(`
      SELECT id, cafe_name, owner_name, email, username, password_hash, created_at
      FROM accounts
      WHERE LOWER(username) = ? OR LOWER(email) = ?
    `).get(identifier, identifier);

    if (!account) {
      return res.status(401).json({
        success: false,
        message: 'Invalid username/email or password.'
      });
    }

    const passwordMatch = await bcrypt.compare(password, account.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid username/email or password.'
      });
    }

    const token = generateToken(account);

    // Fetch settings for this account
    const settings = db.prepare('SELECT * FROM settings WHERE account_id = ?').get(account.id);

    res.json({
      success: true,
      message: 'Login successful.',
      token,
      account: {
        id: account.id,
        cafe_name: account.cafe_name,
        owner_name: account.owner_name,
        email: account.email,
        username: account.username
      },
      settings
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({
      success: false,
      message: 'An error occurred during login. Please try again.'
    });
  }
});

// Get current account profile
router.get('/me', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const account = db.prepare(`
      SELECT id, cafe_name, owner_name, email, username, created_at
      FROM accounts
      WHERE id = ?
    `).get(req.account.id);

    if (!account) {
      return res.status(404).json({ success: false, message: 'Account not found.' });
    }

    const settings = db.prepare('SELECT * FROM settings WHERE account_id = ?').get(account.id);

    res.json({
      success: true,
      account,
      settings
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to retrieve profile.' });
  }
});

// Retrieve security question for password reset
router.get('/security-question', (req, res) => {
  try {
    const { username_or_email } = req.query;
    if (!username_or_email) {
      return res.status(400).json({ success: false, message: 'Username or email is required.' });
    }

    const db = getDb();
    const identifier = username_or_email.trim().toLowerCase();
    const account = db.prepare(`
      SELECT security_question
      FROM accounts
      WHERE LOWER(username) = ? OR LOWER(email) = ?
    `).get(identifier, identifier);

    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'No account found with this username or email.'
      });
    }

    res.json({
      success: true,
      security_question: account.security_question
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error retrieving security question.' });
  }
});

// Reset Password
router.post('/reset-password', async (req, res) => {
  try {
    const { username_or_email, security_answer, new_password, confirm_password } = req.body;

    if (!username_or_email || !security_answer || !new_password) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required.'
      });
    }

    if (new_password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long.'
      });
    }

    if (confirm_password && new_password !== confirm_password) {
      return res.status(400).json({
        success: false,
        message: 'Passwords do not match.'
      });
    }

    const db = getDb();
    const identifier = username_or_email.trim().toLowerCase();
    const account = db.prepare(`
      SELECT id, security_answer_hash
      FROM accounts
      WHERE LOWER(username) = ? OR LOWER(email) = ?
    `).get(identifier, identifier);

    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Account not found.'
      });
    }

    const answerMatch = await bcrypt.compare(security_answer.trim().toLowerCase(), account.security_answer_hash);
    if (!answerMatch) {
      return res.status(401).json({
        success: false,
        message: 'Security answer is incorrect.'
      });
    }

    const newHash = await bcrypt.hash(new_password, 10);
    const now = new Date().toISOString();

    db.prepare('UPDATE accounts SET password_hash = ?, updated_at = ? WHERE id = ?').run(newHash, now, account.id);

    res.json({
      success: true,
      message: 'Password reset successfully! You can now log in with your new password.'
    });
  } catch (err) {
    console.error('Password reset error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to reset password. Please try again.'
    });
  }
});

module.exports = router;
