// filters.js

// --- Main entry point (exported) ---
export function populateFilters(tagStore, filterState, { onTagToggle } = {}) {
    const container = document.getElementById("filters");
    container.innerHTML = "";

    const activeSection = createActiveSection(tagStore, filterState, onTagToggle);
    const browseSection = createBrowseSection(tagStore, filterState, activeSection, onTagToggle);

    const { controlsEl, searchInput, groupSelect } = createControls();

    container.append(activeSection.container, controlsEl, browseSection.container);

    // Initialize browse section with controls
    browseSection.init(searchInput, groupSelect);

    // Initialize active section from pre-existing filterState
    for (const tagName of filterState.activeTags) {
        if (tagStore[tagName]) {
            activeSection.addTag(tagName, browseSection);
        }
    }

    // Expose a refresh method for programmatic updates
    const filtersUI = {
        activeSection,
        browseSection,
        controls: { searchInput, groupSelect },
        refresh: () => {
            // Re-sync active section
            activeSection.container.innerHTML = "";
            for (const tagName of filterState.activeTags) {
                if (tagStore[tagName]) {
                    activeSection.addTag(tagName, browseSection);
                }
            }
            // Update browse visibility
            browseSection.updateVisibility(
                groupSelect.value,
                searchInput.value
            );
        }
    };

    return filtersUI;
}

// =====================
// --- Internal helpers ---
// =====================

// --- Active section module ---
function createActiveSection(tagStore, filterState, onTagToggle) {
    const container = document.createElement("div");
    container.className = "active-tags";

    function addTag(tagName, browseSection) {
        const tag = tagStore[tagName];
        if (!tag) return;

        const pill = document.createElement("span");
        pill.className = "tag-pill";
        pill.textContent = tag.name;

        const removeBtn = document.createElement("button");
        removeBtn.textContent = "×";
        removeBtn.className = "remove-tag";
        removeBtn.onclick = async () => {
            filterState.activeTags.delete(tagName);
            container.removeChild(pill);
            browseSection.showTag(tagName);

            if (onTagToggle) await onTagToggle(tagName, false);
        };

        pill.appendChild(removeBtn);
        container.appendChild(pill);
    }

    return { container, addTag };
}

// --- Browse section module ---
function createBrowseSection(tagStore, filterState, activeSection, onTagToggle) {
    const container = document.createElement("div");
    container.className = "browse-tags";

    const tagElements = {};
    const tags = Object.values(tagStore).filter(
        tag => Array.isArray(tag.tag_groups) && tag.tag_groups.length > 0
    );

    // Build group map
    const groupMap = {};
    for (const tag of tags) {
        for (const group of tag.tag_groups ?? []) {
            if (!groupMap[group]) groupMap[group] = [];
            groupMap[group].push(tag);
        }
    }

    // Create browse tag elements
    tags.forEach(tag => {
        const item = document.createElement("div");
        item.className = "browse-tag";
        item.dataset.tag = tag.name;
        item.dataset.groups = tag.tag_groups.join(",");
        item.textContent = tag.name;

        item.onclick = async () => {
            filterState.activeTags.add(tag.name);
            container.removeChild(item);
            activeSection.addTag(tag.name, browseSectionAPI);

            if (onTagToggle) await onTagToggle(tag.name, true);
        };

        container.appendChild(item);
        tagElements[tag.name] = item;
    });

    let currentScope = "__all__";
    let currentQuery = "";

    function showTag(tagName) {
        const item = tagElements[tagName];
        if (item && !container.contains(item)) {
            container.appendChild(item);
        }
        updateVisibility(currentScope, currentQuery);
    }

    function updateVisibility(scope, query) {
        currentScope = scope;
        currentQuery = query.toLowerCase();

        for (const tagName in tagElements) {
            const item = tagElements[tagName];

            if (filterState.activeTags.has(tagName)) {
                item.style.display = "none";
                continue;
            }

            const groups = item.dataset.groups.split(",");
            const inScope = scope === "__all__" || groups.includes(scope);
            const matchesQuery = !query || tagName.toLowerCase().includes(currentQuery);

            item.style.display = inScope && matchesQuery ? "inline-block" : "none";
        }
    }

    function init(searchInput, groupSelect) {
        // Populate category dropdown
        groupSelect.append(new Option("(Search all)", "__all__"));
        Object.keys(groupMap)
            .sort()
            .forEach(groupName => groupSelect.append(new Option(groupName, groupName)));

        // Event listeners
        groupSelect.addEventListener("change", () => updateVisibility(groupSelect.value, searchInput.value));
        searchInput.addEventListener("input", () => updateVisibility(groupSelect.value, searchInput.value));

        // Initial render
        updateVisibility(groupSelect.value, searchInput.value);
    }

    const browseSectionAPI = { container, showTag, updateVisibility, init };
    return browseSectionAPI;
}

// --- Controls module ---
function createControls() {
    const controlsEl = document.createElement("div");
    controlsEl.className = "controls";

    const searchInput = document.createElement("input");
    searchInput.className = "tag-search";
    searchInput.placeholder = "Filter tags…";

    const groupSelect = document.createElement("select");
    groupSelect.className = "group-select";

    controlsEl.append(searchInput, groupSelect);

    return { controlsEl, searchInput, groupSelect };
}
