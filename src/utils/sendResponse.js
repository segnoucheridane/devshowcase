const sendResponse = (res, statusCode, data, message, extras = {}) => {
  const body = { success: true };

  if (message) body.message = message;
  if (data !== undefined && data !== null) body.data = data;
  if (Object.keys(extras).length > 0) Object.assign(body, extras);

  return res.status(statusCode).json(body);
};

module.exports = sendResponse;
