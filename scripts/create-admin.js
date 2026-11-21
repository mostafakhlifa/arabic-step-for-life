// Create (or promote) an admin user — for client handover.
//
// Usage (env vars — preferred):
//   ADMIN_EMAIL=admin@example.org ADMIN_PASSWORD='strong-password' ADMIN_ROLE=SUPER_ADMIN npm run create-admin
// Usage (flags):
//   node scripts/create-admin.js --email admin@example.org --role ADMIN
//   (password is prompted interactively when not provided via env/flag)
// SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD are also accepted as fallbacks.
// If the user already exists, their role is updated and (when a new password
// is given) their password is reset. Never prints the password.
require('dotenv').config();
const readline = require('readline');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();
const VALID_ROLES = ['USER', 'ADMIN', 'SUPER_ADMIN'];

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith('--')) {
        out[key] = next;
        i += 1;
      } else {
        out[key] = true;
      }
    }
  }
  return out;
}

function prompt(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(question, (answer) => {
    rl.close();
    resolve(answer.trim());
  }));
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  let email = args.email || process.env.ADMIN_EMAIL || process.env.SEED_ADMIN_EMAIL || '';
  let password = args.password || process.env.ADMIN_PASSWORD || process.env.SEED_ADMIN_PASSWORD || '';
  const role = (args.role || process.env.ADMIN_ROLE || 'SUPER_ADMIN').toUpperCase();

  if (!VALID_ROLES.includes(role)) {
    throw new Error(`Invalid role "${role}". Must be one of: ${VALID_ROLES.join(', ')}`);
  }

  if (!email) {
    if (!process.stdin.isTTY) throw new Error('No email provided. Set ADMIN_EMAIL or pass --email.');
    email = await prompt('Admin email: ');
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Please provide a valid email address.');
  email = email.toLowerCase();

  const existing = await prisma.user.findUnique({ where: { email } });

  if (!password) {
    if (existing) {
      // Promoting an existing user needs no password change.
      const updated = await prisma.user.update({
        where: { id: existing.id },
        data: { role, isActive: true },
      });
      console.log(`Updated ${updated.email}: role=${updated.role}, isActive=${updated.isActive} (password unchanged).`);
      return;
    }
    if (!process.stdin.isTTY) {
      throw new Error('No password provided. Set ADMIN_PASSWORD or pass --password.');
    }
    password = await prompt('Admin password (min 8 chars, typed input is visible): ');
  }
  if (password.length < 8) throw new Error('Password must be at least 8 characters.');

  const passwordHash = await bcrypt.hash(password, 12);
  if (existing) {
    const updated = await prisma.user.update({
      where: { id: existing.id },
      data: { passwordHash, role, isActive: true, emailVerified: true },
    });
    console.log(`Updated ${updated.email}: role=${updated.role}, isActive=${updated.isActive}, password reset.`);
  } else {
    const created = await prisma.user.create({
      data: {
        email,
        passwordHash,
        firstName: args.firstName || 'Admin',
        lastName: args.lastName || 'Arabic Step for Life',
        role,
        isActive: true,
        emailVerified: true,
      },
    });
    console.log(`Created ${created.role} account: ${created.email} (id: ${created.id})`);
  }
}

main()
  .catch((err) => {
    console.error('create-admin failed:', err.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
