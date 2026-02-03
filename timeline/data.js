export async function loadTimelineData() {
    const res = await fetch(
        "https://argo.ex-astris.net/tljson?tags=azedi"
    );

    if (!res.ok) {
        throw new Error("Failed to load timeline data");
    }

    const raw = await res.json();
    console.log("raw =", raw);

    return raw.tljson.map((d, i) => ({
        id: d.id ?? i,
        time: new Date(d.first_post.created_at).getTime(), // normalize to ms
        title: d.title ?? "(untitled)",
        category: d.category, 
        tags: d.tags ?? [],
        first_post: d.first_post,
        url: d.url
    }));
}
