/**
 * Wraps an async route handler to catch errors and pass them to Express error handler.
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Builds pagination metadata for list endpoints.
 */
const paginate = (page, limit, totalCount) => {
  const totalPages = Math.ceil(totalCount / limit);
  return {
    page,
    limit,
    totalCount,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
};

module.exports = { asyncHandler, paginate };
