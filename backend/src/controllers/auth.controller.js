const bcrypt = require('bcryptjs');
const Admin = require('../models/Admin');
const { signToken } = require('../middleware/auth');
const { ApiError } = require('../utils/errors');

// Compared against when the email doesn't exist, so response time doesn't reveal which emails are admins.
let dummyHash;
const getDummyHash = async () => {
  if (!dummyHash) dummyHash = await bcrypt.hash('not-a-real-password', 12);
  return dummyHash;
};

async function login(req, res) {
  const { email, password } = req.valid.body;
  const admin = await Admin.findOne({ email }).select('+passwordHash');

  const ok = admin ? await admin.verifyPassword(password) : await bcrypt.compare(password, await getDummyHash()).then(() => false);
  if (!admin || !ok) throw ApiError.unauthorized('Incorrect email or password');

  admin.lastLoginAt = new Date();
  await admin.save();

  res.json({ success: true, data: { token: signToken(admin), admin: admin.toJSON() } });
}

function me(req, res) {
  res.json({ success: true, data: { admin: req.admin.toJSON() } });
}

module.exports = { login, me };
