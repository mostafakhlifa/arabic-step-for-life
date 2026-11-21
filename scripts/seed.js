// Database seed — Arabic Step for Life Organization, Inc.
//
// Creates:
//   - ImpactStat rows (peopleSupported / volunteers / statesReached = 0 —
//     honest starting values, updated later by admins from real data)
//   - 6 sample programs (2 burn support, 2 newcomer, 1 Arabic, 1 community)
//   - ONE super admin, ONLY from SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD env
//     vars. Fails with a clear message if they are unset. NEVER hardcodes
//     credentials.
//
// Usage: npm run db:seed   (requires DATABASE_URL + migrations applied)
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

const IMPACT_STATS = [
  { key: 'peopleSupported', value: 0, label: 'People Supported' },
  { key: 'volunteers', value: 0, label: 'Volunteers' },
  { key: 'statesReached', value: 0, label: 'States Reached' },
];

const IMG = (path) => path;

const PROGRAMS = [
  {
    slug: 'burn-survivor-support-network',
    title: 'Burn Survivor Support Network',
    category: 'BURN_SUPPORT',
    shortDescription: 'Peer support and guidance for burn survivors and their families as they heal.',
    description:
      'Our Burn Survivor Support Network connects burn survivors and their families with trained peer supporters who understand the recovery journey. Through one-on-one conversations, group gatherings, and practical guidance, we help survivors rebuild confidence, find community, and navigate life after a burn injury — at their own pace, in a language and culture that feels like home.',
    imageUrl: IMG('/assets/images/burn-care.svg'),
  },
  {
    slug: 'burn-recovery-peer-mentorship',
    title: 'Burn Recovery Peer Mentorship',
    category: 'BURN_SUPPORT',
    shortDescription: 'One-on-one mentorship pairing survivors with mentors further along in recovery.',
    description:
      'Recovery is easier when someone who has walked the same road walks beside you. Our peer mentorship program pairs burn survivors with carefully matched mentors who have lived experience of burn recovery. Mentors offer encouragement, share coping strategies, and help mentees set goals for healing, work, and daily life.',
    imageUrl: IMG('/assets/images/burn-care.svg'),
  },
  {
    slug: 'newcomer-welcome-settlement',
    title: 'Newcomer Welcome & Settlement',
    category: 'NEWCOMER',
    shortDescription: 'Orientation, guidance, and a warm welcome for newcomers starting a new life in the US.',
    description:
      'Starting over in a new country takes courage — and a helping hand. Our newcomer welcome program offers orientation sessions, help understanding local systems and services, and friendly guidance in Arabic and English so new arrivals can settle in with dignity and confidence.',
    imageUrl: IMG('/assets/images/newcomer-family.svg'),
  },
  {
    slug: 'newcomer-family-support',
    title: 'Newcomer Family Support',
    category: 'NEWCOMER',
    shortDescription: 'Practical support for newcomer families — from school enrollment to community connection.',
    description:
      'Families arriving in a new country face practical questions every day. Our family support program helps newcomer families with school enrollment, accessing healthcare and community resources, and building connections with neighbors — so every family can put down roots and thrive.',
    imageUrl: IMG('/assets/images/sunrise-city.svg'),
  },
  {
    slug: 'arabic-language-learning',
    title: 'Arabic Language Learning',
    category: 'ARABIC',
    shortDescription: 'Arabic classes for children and adults — keeping language, culture, and identity alive.',
    description:
      'Language is home. Our Arabic learning program offers classes for children and adults at different levels, from reading and writing basics to conversation and cultural heritage. Classes are taught in a warm, encouraging environment that celebrates Arabic language and identity.',
    imageUrl: IMG('/assets/images/arabic-class.svg'),
  },
  {
    slug: 'community-volunteer-program',
    title: 'Community Volunteer Program',
    category: 'COMMUNITY',
    shortDescription: 'Join our volunteers — give time, skills, and kindness to neighbors who need them.',
    description:
      'Our volunteers are the heart of Arabic Step for Life. Whether you can offer an hour a week or a special skill, the Community Volunteer Program matches you with meaningful ways to help — supporting events, mentoring newcomers, visiting families, and strengthening the community we all share.',
    imageUrl: IMG('/assets/images/volunteers.svg'),
  },
];

async function main() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL;
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;
  if (!adminEmail || !adminPassword) {
    throw new Error(
      'SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD must be set in .env to seed the super admin account.\n' +
        'Set them in your .env file (see .env.example) and re-run: npm run db:seed'
    );
  }
  if (adminPassword.length < 8) {
    throw new Error('SEED_ADMIN_PASSWORD must be at least 8 characters.');
  }

  // Impact stats (honest zero starting values).
  for (const stat of IMPACT_STATS) {
    await prisma.impactStat.upsert({
      where: { key: stat.key },
      update: { label: stat.label },
      create: stat,
    });
  }
  console.log(`Seeded ${IMPACT_STATS.length} impact stats.`);

  // Programs (idempotent by slug).
  for (const program of PROGRAMS) {
    await prisma.program.upsert({
      where: { slug: program.slug },
      update: program,
      create: program,
    });
  }
  console.log(`Seeded ${PROGRAMS.length} programs.`);

  // Super admin (idempotent by email; updates password if re-run with a new one).
  const passwordHash = await bcrypt.hash(adminPassword, 12);
  const admin = await prisma.user.upsert({
    where: { email: adminEmail.trim().toLowerCase() },
    update: { passwordHash, role: 'SUPER_ADMIN', isActive: true, emailVerified: true },
    create: {
      email: adminEmail.trim().toLowerCase(),
      passwordHash,
      firstName: 'Admin',
      lastName: 'Arabic Step for Life',
      role: 'SUPER_ADMIN',
      isActive: true,
      emailVerified: true,
    },
  });
  console.log(`Seeded super admin: ${admin.email} (id: ${admin.id})`);
  console.log('Seed complete.');
}

main()
  .catch((err) => {
    console.error('Seed failed:', err.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
