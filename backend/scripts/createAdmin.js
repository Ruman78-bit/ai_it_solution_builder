/**
 * Creates an administrator, or resets the password of an existing one.
 *
 *   npm run create-admin -- --email admin@example.com --name "Site Admin" --password "a-long-password"
 *
 * Or set ADMIN_EMAIL / ADMIN_NAME / ADMIN_PASSWORD in the environment.
 */
const { config } = require('../src/config/env');
const { connectDB, disconnectDB } = require('../src/config/db');
const Admin = require('../src/models/Admin');

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
}

async function main() {
  const email = (arg('email') || process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const name = (arg('name') || process.env.ADMIN_NAME || 'Administrator').trim();
  const password = arg('password') || process.env.ADMIN_PASSWORD || '';

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Provide a valid --email');
  if (password.length < 10) throw new Error('Password must be at least 10 characters');

  await connectDB(config.mongoUri);
  const passwordHash = await Admin.hashPassword(password);
  const existing = await Admin.findOne({ email });
  if (existing) {
    existing.passwordHash = passwordHash;
    existing.name = name;
    await existing.save();
    console.log(`Updated password for existing admin ${email}`);
  } else {
    await Admin.create({ email, name, passwordHash });
    console.log(`Created admin ${email}`);
  }
}

main()
  .catch((err) => {
    console.error(`Error: ${err.message}`);
    process.exitCode = 1;
  })
  .finally(() => disconnectDB().catch(() => {}));
