// Loads every page of a paginated endpoint, so lists and counts are never
// silently cut at an arbitrary page size.
export default async function fetchAllPages(fetchPage, pageSize = 100) {
  const items = [];
  for (let page = 0; ; page++) {
    const data = await fetchPage(page, pageSize);
    items.push(...(data.content || []));
    if (page + 1 >= (data.totalPages || 0)) return items;
  }
}
