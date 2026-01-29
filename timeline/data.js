// data.js
export async function loadTimelineData(url) { 
  // Load raw JSON
  const data = await d3.json(url);
  console.log("Fetched data", data);

  // Define which categories get their own lane
  const laneCategories = new Set([
    "Open Frequency",
    "Mission Briefs (Events)",
    "Communications",
    "Reports"
  ]);

  // Flatten to array of events, filtering out items without first_post
  const events = data.topics
    .map(item => {
      if (!item.first_post) {
        console.warn('Dropped item with missing first_post:', item);
        return null;
      }

      const rawDate = new Date(item.first_post.created_at);

      // Only assign to lane if category is in laneCategories, else "Other"
      const laneName = laneCategories.has(item.category?.name) 
        ? item.category.name 
        : "Other";

      return {
        ...item,
        date: rawDate,
        lane: laneName
      };
    })
    .filter(d => d !== null);

  // Compute domain for xScale
  const dates = events.map(d => d.date);
  const minDate = d3.min(dates);
  const maxDate = d3.max(dates);

  console.log(events);

  return {
    events,
    domain: [minDate, maxDate]
  };
}
