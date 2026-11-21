// Program logic: public reads (active only) + admin CRUD.
const { prisma } = require('../config/db');
const { ApiError } = require('../middleware/errorHandler');

const VALID_CATEGORIES = ['BURN_SUPPORT', 'NEWCOMER', 'ARABIC', 'COMMUNITY'];

function slugify(text) {
  return String(text)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

async function listActivePrograms() {
  return prisma.program.findMany({ where: { isActive: true }, orderBy: { createdAt: 'asc' } });
}

async function getActiveProgramBySlug(slug) {
  const program = await prisma.program.findFirst({ where: { slug, isActive: true } });
  if (!program) throw ApiError.notFound('Program not found.');
  return program;
}

async function adminListPrograms() {
  return prisma.program.findMany({ orderBy: { createdAt: 'asc' } });
}

async function getProgramById(id) {
  const program = await prisma.program.findUnique({ where: { id } });
  if (!program) throw ApiError.notFound('Program not found.');
  return program;
}

async function createProgram({ slug, title, category, shortDescription, description, imageUrl, isActive }) {
  const finalSlug = slug ? slugify(slug) : slugify(title);
  if (!finalSlug) throw ApiError.badRequest('A valid slug is required.');
  const existing = await prisma.program.findUnique({ where: { slug: finalSlug } });
  if (existing) throw ApiError.conflict('A program with this slug already exists.');
  return prisma.program.create({
    data: {
      slug: finalSlug,
      title: title.trim(),
      category,
      shortDescription: shortDescription.trim(),
      description: description.trim(),
      imageUrl: imageUrl || null,
      isActive: isActive !== undefined ? Boolean(isActive) : true,
    },
  });
}

async function updateProgram(id, { slug, title, category, shortDescription, description, imageUrl, isActive }) {
  await getProgramById(id);
  const data = {};
  if (slug !== undefined) {
    const finalSlug = slugify(slug);
    const clash = await prisma.program.findFirst({ where: { slug: finalSlug, NOT: { id } } });
    if (clash) throw ApiError.conflict('A program with this slug already exists.');
    data.slug = finalSlug;
  }
  if (title !== undefined) data.title = title.trim();
  if (category !== undefined) data.category = category;
  if (shortDescription !== undefined) data.shortDescription = shortDescription.trim();
  if (description !== undefined) data.description = description.trim();
  if (imageUrl !== undefined) data.imageUrl = imageUrl || null;
  if (isActive !== undefined) data.isActive = Boolean(isActive);
  return prisma.program.update({ where: { id }, data });
}

async function deleteProgram(id) {
  const program = await getProgramById(id);
  const appCount = await prisma.application.count({ where: { programId: id } });
  if (appCount > 0) {
    throw ApiError.conflict('This program has applications and cannot be deleted. Deactivate it instead.');
  }
  await prisma.program.delete({ where: { id } });
  return program;
}

async function toggleProgram(id) {
  const program = await getProgramById(id);
  return prisma.program.update({ where: { id }, data: { isActive: !program.isActive } });
}

module.exports = {
  VALID_CATEGORIES,
  slugify,
  listActivePrograms,
  getActiveProgramBySlug,
  adminListPrograms,
  getProgramById,
  createProgram,
  updateProgram,
  deleteProgram,
  toggleProgram,
};
