
export function populateFilters(tagStore, filterState) {
    const container = document.getElementById("filters");
    container.innerHTML = ""; // clear

    const groups = deriveTagGroups(tagStore);

    for (const [groupName, tags] of Object.entries(groups)) {
        const groupEl = document.createElement("div");
        groupEl.className = "filter-group";

        const heading = document.createElement("h3");
        heading.textContent = groupName;
        groupEl.appendChild(heading);

        for (const tag of tags) {
            const button = document.createElement("button");
            button.textContent = tag.label;
            button.dataset.tag = tag.name;

            button.className = "filter-tag";
            if (filterState.activeTags.has(tag.name)) {
                button.classList.add("active");
            }

            groupEl.appendChild(button);
        }

        container.appendChild(groupEl);
    }
}

function deriveTagGroups(tagStore) {
    const groups = {};

    for (const [tagName, meta] of Object.entries(tagStore)) {
        const tagGroups = meta.tag_groups;

        // drop tags with no groups
        if (!Array.isArray(tagGroups) || tagGroups.length === 0) {
            continue;
        }

        for (const group of tagGroups) {
            if (!groups[group]) {
                groups[group] = [];
            }

            groups[group].push({
                name: tagName,
                label: meta.label ?? tagName,
                fetched: meta.fetched
            });
        }
    }

    // sort groups alphabetically
    const sortedGroups = {};

    for (const groupName of Object.keys(groups).sort((a, b) =>
        a.localeCompare(b)
    )) {
        // sort tags within group
        sortedGroups[groupName] = groups[groupName].sort((a, b) =>
            a.label.localeCompare(b.label)
        );
    }

    return sortedGroups;
}

