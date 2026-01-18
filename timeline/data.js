export async function loadTimelineData(url) {
  const data = await d3.json(url);

  return data.topics.map(item => {
    const d = new Date(item.first_post.created_at);

    return {
      ...item,
      date: new Date(d.getFullYear(), d.getMonth(), d.getDate()),
      lane: item.category?.name ?? 'Other'
    };
  });
}
