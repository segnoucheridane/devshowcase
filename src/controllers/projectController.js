const { pool }             = require('../config/database');
const sendResponse         = require('../utils/sendResponse');
const ApiError             = require('../utils/ApiError');
const { createUniqueSlug } = require('../utils/slugify');

const listProjects = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 12,
      search,
      technology,
      industry,
      status,
      sort = 'created_at',
      fundingOpen,
      forSale,
    } = req.query;

    const offset     = (parseInt(page) - 1) * parseInt(limit);
    const params     = [];
    const conditions = ["p.visibility = 'public'"];

    if (search) {
      params.push(`%${search}%`);
      const n = params.length;
      conditions.push(
        `(p.title ILIKE $${n} OR p.description ILIKE $${n} OR p.problem_solved ILIKE $${n})`
      );
    }

    if (technology) {
      params.push(`{${technology}}`);
      conditions.push(`p.technologies @> $${params.length}::text[]`);
    }

    if (industry) {
      params.push(`{${industry}}`);
      conditions.push(`p.industries @> $${params.length}::text[]`);
    }

    if (status) {
      params.push(status);
      conditions.push(`p.status = $${params.length}`);
    }

    if (fundingOpen === 'true') conditions.push(`p.is_funding_open = TRUE`);
    if (forSale     === 'true') conditions.push(`p.is_for_sale = TRUE`);

    const where = 'WHERE ' + conditions.join(' AND ');

    const sortOptions = {
      created_at: 'p.created_at',
      view_count:  'p.view_count',
      like_count:  'p.like_count',
    };
    const orderBy = sortOptions[sort] || 'p.created_at';

    params.push(parseInt(limit));
    const limitIdx = params.length;

    params.push(offset);
    const offsetIdx = params.length;

    const rows = await pool.query(
      `SELECT p.id, p.title, p.slug, p.description, p.status,
              p.technologies, p.thumbnail_url, p.view_count, p.like_count,
              p.is_featured, p.is_funding_open, p.funding_goal,
              p.funding_raised, p.created_at,
              u.id AS owner_id, u.username AS owner_username, u.avatar AS owner_avatar
       FROM projects p
       JOIN users u ON u.id = p.owner_id
       ${where}
       ORDER BY ${orderBy} DESC
       LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
      params
    );

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM projects p ${where}`,
      params.slice(0, params.length - 2)
    );

    const total = parseInt(countResult.rows[0].count);

    sendResponse(res, 200, rows.rows, null, {
      pagination: {
        total,
        page:  parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        limit: parseInt(limit),
      },
    });
  } catch (err) {
    next(err);
  }
};

const getProject = async (req, res, next) => {
  try {
    const { project_id } = req.params;

    const isUUID = /^[0-9a-f-]{36}$/i.test(project_id);
    const column = isUUID ? 'p.id' : 'p.slug';

    const result = await pool.query(
      `SELECT p.*,
              u.username AS owner_username,
              u.avatar   AS owner_avatar,
              u.bio      AS owner_bio,
              u.reputation_score AS owner_reputation
       FROM projects p
       JOIN users u ON u.id = p.owner_id
       WHERE ${column} = $1`,
      [project_id]
    );

    const project = result.rows[0];

    if (!project) {
      return next(new ApiError(404, 'Project not found.'));
    }

    if (project.visibility === 'private') {
      if (!req.user || req.user.id !== project.owner_id) {
        return next(new ApiError(403, 'This project is private.'));
      }
    }

    if (!req.user || req.user.id !== project.owner_id) {
      await pool.query(
        'UPDATE projects SET view_count = view_count + 1 WHERE id = $1',
        [project.id]
      );
      project.view_count += 1;
    }

    sendResponse(res, 200, project);
  } catch (err) {
    next(err);
  }
};

const createProject = async (req, res, next) => {
  try {
    const {
      title,
      description,
      full_description,
      status,
      visibility,
      technologies,
      industries,
      tags,
      problem_solved,
      repo_url,
      demo_url,
    } = req.body;

    if (!title || !description) {
      return next(new ApiError(400, 'Title and description are required.'));
    }

    const slug = createUniqueSlug(title);

    const result = await pool.query(
      `INSERT INTO projects
         (owner_id, title, slug, description, full_description,
          status, visibility, technologies, industries, tags,
          problem_solved, repo_url, demo_url)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       RETURNING *`,
      [
        req.user.id,
        title,
        slug,
        description,
        full_description    || null,
        status              || 'idea',
        visibility          || 'public',
        technologies        || [],
        industries          || [],
        tags                || [],
        problem_solved      || null,
        repo_url            || null,
        demo_url            || null,
      ]
    );

    sendResponse(res, 201, result.rows[0], 'Project created.');
  } catch (err) {
    next(err);
  }
};

const updateProject = async (req, res, next) => {
  try {
    const ownerCheck = await pool.query(
      'SELECT owner_id FROM projects WHERE id = $1',
      [req.params.project_id]
    );

    if (!ownerCheck.rows[0]) {
      return next(new ApiError(404, 'Project not found.'));
    }

    if (ownerCheck.rows[0].owner_id !== req.user.id && req.user.role !== 'admin') {
      return next(new ApiError(403, 'You do not own this project.'));
    }

    const { title, description, full_description, problem_solved, repo_url, demo_url, tags } = req.body;

    const result = await pool.query(
      `UPDATE projects
       SET title            = COALESCE($1, title),
           description      = COALESCE($2, description),
           full_description = COALESCE($3, full_description),
           problem_solved   = COALESCE($4, problem_solved),
           repo_url         = COALESCE($5, repo_url),
           demo_url         = COALESCE($6, demo_url),
           tags             = COALESCE($7, tags),
           updated_at       = NOW()
       WHERE id = $8
       RETURNING *`,
      [title, description, full_description, problem_solved, repo_url, demo_url, tags, req.params.project_id]
    );

    sendResponse(res, 200, result.rows[0], 'Project updated.');
  } catch (err) {
    next(err);
  }
};

const deleteProject = async (req, res, next) => {
  try {
    const ownerCheck = await pool.query(
      'SELECT owner_id, title FROM projects WHERE id = $1',
      [req.params.project_id]
    );

    if (!ownerCheck.rows[0]) {
      return next(new ApiError(404, 'Project not found.'));
    }

    if (ownerCheck.rows[0].owner_id !== req.user.id && req.user.role !== 'admin') {
      return next(new ApiError(403, 'You do not own this project.'));
    }

    await pool.query('DELETE FROM projects WHERE id = $1', [req.params.project_id]);

    sendResponse(res, 200, null, `Project "${ownerCheck.rows[0].title}" deleted.`);
  } catch (err) {
    next(err);
  }
};

const addTechnology = async (req, res, next) => {
  try {
    const { technology } = req.body;

    if (!technology) {
      return next(new ApiError(400, 'Technology name is required.'));
    }

    const ownerCheck = await pool.query(
      'SELECT owner_id FROM projects WHERE id = $1',
      [req.params.project_id]
    );

    if (!ownerCheck.rows[0]) return next(new ApiError(404, 'Project not found.'));
    if (ownerCheck.rows[0].owner_id !== req.user.id) return next(new ApiError(403, 'Not authorized.'));

    const result = await pool.query(
      `UPDATE projects
       SET technologies = array_append(technologies, $1), updated_at = NOW()
       WHERE id = $2 AND NOT ($1 = ANY(technologies))
       RETURNING technologies`,
      [technology, req.params.project_id]
    );

    sendResponse(res, 200, result.rows[0], 'Technology added.');
  } catch (err) {
    next(err);
  }
};

const removeTechnology = async (req, res, next) => {
  try {
    const ownerCheck = await pool.query(
      'SELECT owner_id FROM projects WHERE id = $1',
      [req.params.project_id]
    );

    if (!ownerCheck.rows[0]) return next(new ApiError(404, 'Project not found.'));
    if (ownerCheck.rows[0].owner_id !== req.user.id) return next(new ApiError(403, 'Not authorized.'));

    const result = await pool.query(
      `UPDATE projects
       SET technologies = array_remove(technologies, $1), updated_at = NOW()
       WHERE id = $2
       RETURNING technologies`,
      [req.params.tech, req.params.project_id]
    );

    sendResponse(res, 200, result.rows[0], 'Technology removed.');
  } catch (err) {
    next(err);
  }
};

const addIndustry = async (req, res, next) => {
  try {
    const { industry } = req.body;

    if (!industry) {
      return next(new ApiError(400, 'Industry name is required.'));
    }

    const ownerCheck = await pool.query(
      'SELECT owner_id FROM projects WHERE id = $1',
      [req.params.project_id]
    );

    if (!ownerCheck.rows[0]) return next(new ApiError(404, 'Project not found.'));
    if (ownerCheck.rows[0].owner_id !== req.user.id) return next(new ApiError(403, 'Not authorized.'));

    const result = await pool.query(
      `UPDATE projects
       SET industries = array_append(industries, $1), updated_at = NOW()
       WHERE id = $2 AND NOT ($1 = ANY(industries))
       RETURNING industries`,
      [industry, req.params.project_id]
    );

    sendResponse(res, 200, result.rows[0], 'Industry added.');
  } catch (err) {
    next(err);
  }
};

const updateVisibility = async (req, res, next) => {
  try {
    const { visibility } = req.body;

    const allowed = ['public', 'private', 'unlisted'];

    if (!allowed.includes(visibility)) {
      return next(new ApiError(400, "Visibility must be 'public', 'private', or 'unlisted'."));
    }

    const ownerCheck = await pool.query(
      'SELECT owner_id FROM projects WHERE id = $1',
      [req.params.project_id]
    );

    if (!ownerCheck.rows[0]) return next(new ApiError(404, 'Project not found.'));
    if (ownerCheck.rows[0].owner_id !== req.user.id) return next(new ApiError(403, 'Not authorized.'));

    const result = await pool.query(
      `UPDATE projects
       SET visibility = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING id, title, visibility`,
      [visibility, req.params.project_id]
    );

    sendResponse(res, 200, result.rows[0], `Visibility set to ${visibility}.`);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  listProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
  addTechnology,
  removeTechnology,
  addIndustry,
  updateVisibility,
};
