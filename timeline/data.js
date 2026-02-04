export async function loadTimelineData() {
    const res = await fetch(
        "https://argo.ex-astris.net/tljson?tags=azedi"
    );

    if (!res.ok) {
        throw new Error("Failed to load timeline data");
    }

    const raw = await res.json();
    console.log("raw =", raw);

    return raw.tljson.map((d, i) => {
        const created = new Date(d.first_post.created_at).getTime();
        const rootCreated = new Date(d.created_at).getTime();

        const time =
            created === rootCreated
                ? randomizeTimeSameDay(created)
                : created;

        return {
            id: d.id ?? i,
            time, // normalized & de-stacked
            title: d.title ?? "(untitled)",
            category: d.category,
            tags: d.tags ?? [],
            first_post: d.first_post,
            url: d.url
        };
    });
}

function randomizeTimeSameDay(ts) {
    const d = new Date(ts);

    // start of day
    const start = new Date(d);
    start.setHours(0, 0, 0, 0);

    // end of day
    const end = new Date(d);
    end.setHours(23, 59, 59, 999);

    return start.getTime() + Math.random() * (end.getTime() - start.getTime());
}
