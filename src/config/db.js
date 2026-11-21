// PrismaClient singleton — one client for the whole process.
const { PrismaClient } = require('@prisma/client');
const { config, assertDatabaseUrl } = require('./env');

assertDatabaseUrl();

const prisma = new PrismaClient({
  log: config.isProduction ? ['error'] : ['warn', 'error'],
});

module.exports = { prisma };
