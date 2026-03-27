const slugify = (text) => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-')
    .replace(/^-+|-+$/g, '');
};

const createUniqueSlug = (text) => {
  const base   = slugify(text);
  const suffix = Math.random().toString(36).substring(2, 6);
  return `${base}-${suffix}`;
};

module.exports = { slugify, createUniqueSlug };
