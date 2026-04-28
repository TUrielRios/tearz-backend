const { JournalPost } = require('../models');
const { asyncHandler } = require('../utils/helpers');

/**
 * Generate a URL-safe slug from a title
 */
function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

/**
 * List all journal posts (public — only published ones)
 */
const listPublished = asyncHandler(async (req, res) => {
  const posts = await JournalPost.findAll({
    where: { published: true },
    order: [['publishedAt', 'DESC']],
  });

  res.json({ success: true, data: { posts } });
});

/**
 * Get a single published journal post by slug
 */
const getBySlug = asyncHandler(async (req, res) => {
  const post = await JournalPost.findOne({
    where: { slug: req.params.slug, published: true },
  });

  if (!post) {
    return res.status(404).json({ success: false, message: 'Publicación no encontrada' });
  }

  res.json({ success: true, data: { post } });
});

/**
 * List all journal posts (admin — all, including drafts)
 */
const listAll = asyncHandler(async (req, res) => {
  const posts = await JournalPost.findAll({
    order: [['createdAt', 'DESC']],
  });

  res.json({ success: true, data: { posts } });
});

/**
 * Get a single journal post by id (admin)
 */
const getById = asyncHandler(async (req, res) => {
  const post = await JournalPost.findByPk(req.params.id);

  if (!post) {
    return res.status(404).json({ success: false, message: 'Publicación no encontrada' });
  }

  res.json({ success: true, data: { post } });
});

/**
 * Create a new journal post (admin)
 */
const create = asyncHandler(async (req, res) => {
  const { title, excerpt, body, coverImage, published } = req.body;

  let slug = slugify(title);
  // Ensure unique slug
  const existing = await JournalPost.findOne({ where: { slug } });
  if (existing) slug = `${slug}-${Date.now()}`;

  const post = await JournalPost.create({
    title,
    slug,
    excerpt: excerpt || '',
    body: body || '',
    coverImage: coverImage || null,
    published: published || false,
    publishedAt: published ? new Date() : null,
  });

  res.status(201).json({ success: true, data: { post } });
});

/**
 * Update a journal post (admin)
 */
const update = asyncHandler(async (req, res) => {
  const post = await JournalPost.findByPk(req.params.id);

  if (!post) {
    return res.status(404).json({ success: false, message: 'Publicación no encontrada' });
  }

  const { title, excerpt, body, coverImage, published } = req.body;

  // If title changed, regenerate slug
  if (title && title !== post.title) {
    let slug = slugify(title);
    const existing = await JournalPost.findOne({ where: { slug } });
    if (existing && existing.id !== post.id) slug = `${slug}-${Date.now()}`;
    post.slug = slug;
  }

  if (title !== undefined) post.title = title;
  if (excerpt !== undefined) post.excerpt = excerpt;
  if (body !== undefined) post.body = body;
  if (coverImage !== undefined) post.coverImage = coverImage;
  if (published !== undefined) {
    // Set publishedAt when first publishing
    if (published && !post.published) {
      post.publishedAt = new Date();
    }
    post.published = published;
  }

  await post.save();

  res.json({ success: true, data: { post } });
});

/**
 * Delete a journal post (admin)
 */
const remove = asyncHandler(async (req, res) => {
  const post = await JournalPost.findByPk(req.params.id);

  if (!post) {
    return res.status(404).json({ success: false, message: 'Publicación no encontrada' });
  }

  await post.destroy();

  res.json({ success: true, message: 'Publicación eliminada' });
});

module.exports = { listPublished, getBySlug, listAll, getById, create, update, remove };
