document.addEventListener("DOMContentLoaded", () => {
    const modelFilter = document.getElementById("modelFilter");
    const toolFilter = document.getElementById("toolFilter");
    const cards = Array.from(document.querySelectorAll(".model-card"));
    const emptyState = document.querySelector("[data-empty-state]");

    if (!modelFilter || !toolFilter || cards.length === 0) {
        return;
    }

    const toolOptions = new Set();
    cards.forEach((card) => {
        const tool = (card.dataset.toolName || "").trim();
        if (tool) {
            toolOptions.add(tool);
        }
    });

    Array.from(toolOptions)
        .sort((a, b) => a.localeCompare(b))
        .forEach((tool) => {
            const option = document.createElement("option");
            option.value = tool;
            option.textContent = tool;
            toolFilter.appendChild(option);
        });

    const applyFilters = () => {
        const searchTerm = modelFilter.value.trim().toLowerCase();
        const selectedTool = toolFilter.value;

        let visibleCount = 0;

        cards.forEach((card) => {
            const modelName =
                (card.dataset.modelName || card.querySelector(".model-name")?.textContent || "").toLowerCase();
            const cardTool = (card.dataset.toolName || "").trim();

            const matchesModel = !searchTerm || modelName.includes(searchTerm);
            const matchesTool = !selectedTool || cardTool === selectedTool;

            const isVisible = matchesModel && matchesTool;
            card.style.display = isVisible ? "" : "none";
            if (isVisible) {
                visibleCount += 1;
            }
        });

        if (emptyState instanceof HTMLElement) {
            emptyState.hidden = visibleCount !== 0;
        }
    };

    modelFilter.addEventListener("input", applyFilters);
    toolFilter.addEventListener("change", applyFilters);

    applyFilters();
});
