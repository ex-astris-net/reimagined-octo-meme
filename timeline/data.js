export const tagStore = {};
export const eventStore = {};

export async function initTagStore() {
    const allTags = await fetchAllTags();
    console.log(allTags);
    
    for (const tag of allTags) {
        tagStore[tag.name] = {
            ...tag,
            fetched: false,
            ids: new Set()
        };
    }
}

export async function loadTagToStore(tagName) {
    console.log("Loading", tagName, "to tagStore...");
    if (tagStore[tagName]?.fetched)
      return;

    const tagEvents = await fetchTagEvents(tagName);

    for (const event of tagEvents) {
        if (!eventStore[event.id]) {
            eventStore[event.id] = event;
        }
        tagStore[tagName].ids.add(event.id);
    }

    tagStore[tagName].fetched = true;
}

async function fetchTagEvents(tagName) {
    const res = await fetch(
        "https://argo.ex-astris.net/tljson?tags=" + tagName
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

async function fetchAllTags() {
    const res = await fetch("https://argo.ex-astris.net/tljson");

    if (!res.ok) {
        throw new Error("Failed to load tags");
    }

    const raw = await res.json();

    return raw.tljson;
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
