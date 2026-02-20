const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

function parsePagination(query) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  let limit = parseInt(query.limit, 10) || DEFAULT_LIMIT;
  limit = Math.min(Math.max(1, limit), MAX_LIMIT);
  return { page, limit };
}

async function paginate(model, filter, { page, limit }, queryOpts = {}) {
  const { populate, sort } = queryOpts;
  const options = {
    page,
    limit,
    lean: true,
    sort,
    populate,
    customLabels: { docs: "data", totalDocs: "total", totalPages: "pages" },
  };
  const result = await model.paginate(filter, options);
  return {
    data: result.data,
    total: result.total,
    page: result.page,
    limit: result.limit,
    pages: result.pages,
    hasNextPage: result.hasNextPage,
    hasPrevPage: result.hasPrevPage,
  };
}

module.exports = { parsePagination, paginate };
