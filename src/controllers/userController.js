const { pool }     = require('../config/database');
const sendResponse = require('../utils/sendResponse');
const ApiError     = require('../utils/ApiError');

const getMyProfile = async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT id, username, email, role, bio, avatar, website, github,
              linkedin, skills, reputation_score, is_verified, created_at
       FROM users
       WHERE id = $1`,
      [req.user.id]
    );

    sendResponse(res, 200, result.rows[0]);
  } catch (err) {
    next(err);
  }
};

const updateMyProfile = async (req, res, next) => {
  try {
    const { bio, website, github, linkedin, skills } = req.body;

    const result = await pool.query(
      `UPDATE users
       SET bio      = COALESCE($1, bio),
           website  = COALESCE($2, website),
           github   = COALESCE($3, github),
           linkedin = COALESCE($4, linkedin),
           skills   = COALESCE($5, skills),
           updated_at = NOW()
       WHERE id = $6
       RETURNING id, username, email, role, bio, avatar, website,
                 github, linkedin, skills, reputation_score`,
      [bio, website, github, linkedin, skills, req.user.id]
    );

    sendResponse(res, 200, result.rows[0], 'Profile updated.');
  } catch (err) {
    next(err);
  }
};

const getUserProfile = async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT id, username, role, bio, avatar, website, github,
              linkedin, skills, reputation_score, created_at
       FROM users
       WHERE id = $1 AND is_active = TRUE`,
      [req.params.user_id]
    );

    if (!result.rows[0]) {
      return next(new ApiError(404, 'User not found.'));
    }

    sendResponse(res, 200, result.rows[0]);
  } catch (err) {
    next(err);
  }
};

const getUserProjects = async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT id, title, slug, description, status, technologies,
              thumbnail_url, view_count, like_count, created_at
       FROM projects
       WHERE owner_id = $1 AND visibility = 'public'
       ORDER BY created_at DESC`,
      [req.params.user_id]
    );

    sendResponse(res, 200, result.rows);
  } catch (err) {
    next(err);
  }
};

const switchRole = async (req, res, next) => {
  try {
    const { role } = req.body;

    const allowed = ['user', 'developer', 'investor', 'recruiter'];

    if (!allowed.includes(role)) {
      return next(new ApiError(400, `Role must be one of: ${allowed.join(', ')}`));
    }

    const result = await pool.query(
      `UPDATE users
       SET role = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING id, username, role`,
      [role, req.user.id]
    );

    sendResponse(res, 200, result.rows[0], 'Role updated.');
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getMyProfile,
  updateMyProfile,
  getUserProfile,
  getUserProjects,
  switchRole,
};
