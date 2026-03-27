const { pool }     = require('../config/database');
const sendResponse = require('../utils/sendResponse');
const ApiError     = require('../utils/ApiError');

const listUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, role, search } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const params = [];
    let where    = 'WHERE 1=1';

    if (role) {
      params.push(role);
      where += ` AND role = $${params.length}`;
    }

    if (search) {
      params.push(`%${search}%`);
      where += ` AND (username ILIKE $${params.length} OR email ILIKE $${params.length})`;
    }

    params.push(parseInt(limit));
    const limitIndex = params.length;

    params.push(offset);
    const offsetIndex = params.length;

    const rows = await pool.query(
      `SELECT id, username, email, role, is_active, is_verified, reputation_score, created_at
       FROM users
       ${where}
       ORDER BY created_at DESC
       LIMIT $${limitIndex} OFFSET $${offsetIndex}`,
      params
    );

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM users ${where}`,
      params.slice(0, params.length - 2)
    );

    const total = parseInt(countResult.rows[0].count);

    sendResponse(res, 200, rows.rows, null, {
      pagination: {
        total,
        page:  parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (err) {
    next(err);
  }
};

const suspendUser = async (req, res, next) => {
  try {
    const result = await pool.query(
      `UPDATE users
       SET is_active = FALSE, updated_at = NOW()
       WHERE id = $1
       RETURNING id, username, is_active`,
      [req.params.user_id]
    );

    if (!result.rows[0]) {
      return next(new ApiError(404, 'User not found.'));
    }

    sendResponse(res, 200, result.rows[0], 'User suspended.');
  } catch (err) {
    next(err);
  }
};

const changeUserRole = async (req, res, next) => {
  try {
    const { role } = req.body;

    const allowed = ['user', 'developer', 'investor', 'recruiter', 'admin'];

    if (!allowed.includes(role)) {
      return next(new ApiError(400, 'Invalid role provided.'));
    }

    const result = await pool.query(
      `UPDATE users
       SET role = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING id, username, role`,
      [role, req.params.user_id]
    );

    if (!result.rows[0]) {
      return next(new ApiError(404, 'User not found.'));
    }

    sendResponse(res, 200, result.rows[0], 'User role updated.');
  } catch (err) {
    next(err);
  }
};

const listAllProjects = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const rows = await pool.query(
      `SELECT p.id, p.title, p.slug, p.status, p.visibility,
              p.is_featured, p.view_count, p.created_at,
              u.username AS owner
       FROM projects p
       JOIN users u ON u.id = p.owner_id
       ORDER BY p.created_at DESC
       LIMIT $1 OFFSET $2`,
      [parseInt(limit), offset]
    );

    const countResult = await pool.query('SELECT COUNT(*) FROM projects');
    const total       = parseInt(countResult.rows[0].count);

    sendResponse(res, 200, rows.rows, null, {
      pagination: {
        total,
        page:  parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (err) {
    next(err);
  }
};

const featureProject = async (req, res, next) => {
  try {
    const result = await pool.query(
      `UPDATE projects
       SET is_featured = NOT is_featured, updated_at = NOW()
       WHERE id = $1
       RETURNING id, title, is_featured`,
      [req.params.project_id]
    );

    if (!result.rows[0]) {
      return next(new ApiError(404, 'Project not found.'));
    }

    const msg = result.rows[0].is_featured ? 'Project featured.' : 'Project unfeatured.';
    sendResponse(res, 200, result.rows[0], msg);
  } catch (err) {
    next(err);
  }
};

const removeProject = async (req, res, next) => {
  try {
    const result = await pool.query(
      'DELETE FROM projects WHERE id = $1 RETURNING id, title',
      [req.params.project_id]
    );

    if (!result.rows[0]) {
      return next(new ApiError(404, 'Project not found.'));
    }

    sendResponse(res, 200, null, `Project "${result.rows[0].title}" has been removed.`);
  } catch (err) {
    next(err);
  }
};

const getReports = async (req, res, next) => {
  try {
    sendResponse(res, 200, [], 'Reports module coming in the next phase.');
  } catch (err) {
    next(err);
  }
};

const resolveReport = async (req, res, next) => {
  try {
    sendResponse(res, 200, null, 'Reports module coming in the next phase.');
  } catch (err) {
    next(err);
  }
};

const getPlatformStats = async (req, res, next) => {
  try {
    const [users, projects] = await Promise.all([
      pool.query(
        `SELECT COUNT(*) AS total,
                SUM(CASE WHEN is_active THEN 1 ELSE 0 END) AS active
         FROM users`
      ),
      pool.query(
        `SELECT COUNT(*) AS total,
                COALESCE(SUM(view_count), 0) AS total_views
         FROM projects`
      ),
    ]);

    sendResponse(res, 200, {
      users: {
        total:  parseInt(users.rows[0].total),
        active: parseInt(users.rows[0].active),
      },
      projects: {
        total:      parseInt(projects.rows[0].total),
        totalViews: parseInt(projects.rows[0].total_views),
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  listUsers,
  suspendUser,
  changeUserRole,
  listAllProjects,
  featureProject,
  removeProject,
  getReports,
  resolveReport,
  getPlatformStats,
};
