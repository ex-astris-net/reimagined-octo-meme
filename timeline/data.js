export async function loadTimelineData(baseUrl) {
  let page = 0;
  let hasMore = true;
  let allTopics = [];

  while (hasMore) {
    const url = new URL(baseUrl + "?page=");
    url.searchParams.set("page", page);

    const data = await d3.json(url.toString());

    const topics = data.topics.map(item => {
      const d = new Date(item.first_post.created_at);

      return {
        ...item,
        date: new Date(d.getFullYear(), d.getMonth(), d.getDate()),
        lane: item.category?.name ?? "Other"
      };
    });

    allTopics.push(...topics);

    hasMore = data.has_more;
    page += 1;
  }

  return allTopics;
}
