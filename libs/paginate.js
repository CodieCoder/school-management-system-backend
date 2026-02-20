const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

function parsePagination(query) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  let limit = parseInt(query.limit, 10) || DEFAULT_LIMIT;
  limit = Math.min(Math.max(1, limit), MAX_LIMIT);
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

async function paginate(model, filter, { page, limit, skip }, queryOpts = {}) {
  const { populate, sort } = queryOpts;
  let q = model.find(filter).skip(skip).limit(limit);
  if (sort) q = q.sort(sort);
  if (populate) q = q.populate(populate);
  const [data, total] = await Promise.all([
    q.lean(),
    model.countDocuments(filter),
  ]);
  return { data, total, page, limit, pages: Math.ceil(total / limit) };
}

module.exports = { parsePagination, paginate };
