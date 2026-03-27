const { pool }     = require('../config/database');
const sendResponse = require('../utils/sendResponse');
const ApiError     = require('../utils/ApiError');

const checkProjectOwner = async (projectId, userId) => {
  const result = await pool.query(
    'SELECT owner_id FROM projects WHERE id = $1',
    [projectId]
  );

  if (!result.rows[0]) {
    throw new ApiError(404, 'Project not found.');
  }

  if (result.rows[0].owner_id !== userId) {
    throw new ApiError(403, 'You do not own this project.');
  }
};

const getTimeline = async (req, res, next) => {
  try {
    const { project_id } = req.params;

    const stagesResult = await pool.query(
      'SELECT * FROM stages WHERE project_id = $1 ORDER BY order_index ASC',
      [project_id]
    );

    const stages = await Promise.all(
      stagesResult.rows.map(async (stage) => {
        const milestonesResult = await pool.query(
          'SELECT * FROM milestones WHERE stage_id = $1 ORDER BY order_index ASC',
          [stage.id]
        );
        return { ...stage, milestones: milestonesResult.rows };
      })
    );

    sendResponse(res, 200, stages);
  } catch (err) {
    next(err);
  }
};

const createStage = async (req, res, next) => {
  try {
    await checkProjectOwner(req.params.project_id, req.user.id);

    const { name, description, order_index } = req.body;

    const validNames = ['idea', 'planning', 'development', 'testing', 'deployment'];

    if (!validNames.includes(name)) {
      return next(new ApiError(400, `Stage name must be one of: ${validNames.join(', ')}`));
    }

    const result = await pool.query(
      `INSERT INTO stages (project_id, name, description, order_index)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [req.params.project_id, name, description || null, order_index || 0]
    );

    sendResponse(res, 201, result.rows[0], 'Stage created.');
  } catch (err) {
    next(err);
  }
};

const updateStage = async (req, res, next) => {
  try {
    await checkProjectOwner(req.params.project_id, req.user.id);

    const { description, order_index } = req.body;

    const result = await pool.query(
      `UPDATE stages
       SET description = COALESCE($1, description),
           order_index = COALESCE($2, order_index),
           updated_at  = NOW()
       WHERE id = $3 AND project_id = $4
       RETURNING *`,
      [description, order_index, req.params.stage_id, req.params.project_id]
    );

    if (!result.rows[0]) {
      return next(new ApiError(404, 'Stage not found.'));
    }

    sendResponse(res, 200, result.rows[0], 'Stage updated.');
  } catch (err) {
    next(err);
  }
};

const deleteStage = async (req, res, next) => {
  try {
    await checkProjectOwner(req.params.project_id, req.user.id);

    const result = await pool.query(
      'DELETE FROM stages WHERE id = $1 AND project_id = $2 RETURNING id',
      [req.params.stage_id, req.params.project_id]
    );

    if (!result.rows[0]) {
      return next(new ApiError(404, 'Stage not found.'));
    }

    sendResponse(res, 200, null, 'Stage deleted.');
  } catch (err) {
    next(err);
  }
};

const getMilestones = async (req, res, next) => {
  try {
    const result = await pool.query(
      'SELECT * FROM milestones WHERE project_id = $1 ORDER BY order_index ASC',
      [req.params.project_id]
    );

    sendResponse(res, 200, result.rows);
  } catch (err) {
    next(err);
  }
};

const createMilestone = async (req, res, next) => {
  try {
    await checkProjectOwner(req.params.project_id, req.user.id);

    const stageCheck = await pool.query(
      'SELECT id FROM stages WHERE id = $1 AND project_id = $2',
      [req.params.stage_id, req.params.project_id]
    );

    if (!stageCheck.rows[0]) {
      return next(new ApiError(404, 'Stage not found in this project.'));
    }

    const { title, description, order_index, completed_at } = req.body;

    if (!title) {
      return next(new ApiError(400, 'Milestone title is required.'));
    }

    const result = await pool.query(
      `INSERT INTO milestones (stage_id, project_id, title, description, order_index, completed_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        req.params.stage_id,
        req.params.project_id,
        title,
        description  || null,
        order_index  || 0,
        completed_at || null,
      ]
    );

    sendResponse(res, 201, result.rows[0], 'Milestone created.');
  } catch (err) {
    next(err);
  }
};

const updateMilestone = async (req, res, next) => {
  try {
    await checkProjectOwner(req.params.project_id, req.user.id);

    const { title, description, order_index, completed_at } = req.body;

    const result = await pool.query(
      `UPDATE milestones
       SET title        = COALESCE($1, title),
           description  = COALESCE($2, description),
           order_index  = COALESCE($3, order_index),
           completed_at = COALESCE($4, completed_at),
           updated_at   = NOW()
       WHERE id = $5 AND project_id = $6
       RETURNING *`,
      [title, description, order_index, completed_at, req.params.milestone_id, req.params.project_id]
    );

    if (!result.rows[0]) {
      return next(new ApiError(404, 'Milestone not found.'));
    }

    sendResponse(res, 200, result.rows[0], 'Milestone updated.');
  } catch (err) {
    next(err);
  }
};

const deleteMilestone = async (req, res, next) => {
  try {
    await checkProjectOwner(req.params.project_id, req.user.id);

    const result = await pool.query(
      'DELETE FROM milestones WHERE id = $1 AND project_id = $2 RETURNING id',
      [req.params.milestone_id, req.params.project_id]
    );

    if (!result.rows[0]) {
      return next(new ApiError(404, 'Milestone not found.'));
    }

    sendResponse(res, 200, null, 'Milestone deleted.');
  } catch (err) {
    next(err);
  }
};

const addTimeLog = async (req, res, next) => {
  try {
    await checkProjectOwner(req.params.project_id, req.user.id);

    const { hours, note } = req.body;

    if (!hours || isNaN(hours) || Number(hours) <= 0) {
      return next(new ApiError(400, 'Hours must be a positive number.'));
    }

    const result = await pool.query(
      `INSERT INTO time_logs (milestone_id, user_id, hours, note)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [req.params.milestone_id, req.user.id, hours, note || null]
    );

    sendResponse(res, 201, result.rows[0], `${hours} hour(s) logged.`);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getTimeline,
  createStage,
  updateStage,
  deleteStage,
  getMilestones,
  createMilestone,
  updateMilestone,
  deleteMilestone,
  addTimeLog,
};
