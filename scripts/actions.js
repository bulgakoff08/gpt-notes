const JSON_BLOCK_REGEX = /```json[ \t]*\r?\n?([\s\S]*?)```/gi;

function isAction (value) {
    return (
        value !== null &&
        typeof value === "object" &&
        !Array.isArray(value) &&
        value.type === "action"
    );
}

function separateActions (rawResponse) {
    if (typeof rawResponse !== "string") {
        return { message: rawResponse == null ? "" : String(rawResponse), actions: [] };
    }
    const actions = [];
    const stripped = rawResponse.replace(JSON_BLOCK_REGEX, (fullMatch, body) => {
        try {
            const parsed = JSON.parse(body.trim());
            if (isAction(parsed)) {
                actions.push(parsed);
                return "";
            }
        } catch {
            console.log("Invalid json");
        }
        return fullMatch;
    });
    if (actions.length === 0) {
        return {
            message: rawResponse,
            actions
        };
    }
    const message = stripped.replace(/\n{3,}/g, "\n\n").trim();
    return {message, actions};
}

function processAction (actionSpec, container) {
    switch (actionSpec["name"]) {
        case "choose_variant":
            fillMakeChoiceAction(actionSpec, container);
            break;
        default:
            container.text("Unsupported action: " + JSON.stringify(actionSpec));
    }
}

function fillMakeChoiceAction (actionSpec, container) {
    if (actionSpec["parameters"] && actionSpec["parameters"]["options"]) {
        actionSpec["parameters"]["options"].forEach(option => {
            container.create("div").text(option).style("clickable").onclick(() => {
                $("chat-input").get().value = option;
                sendMessage();
            });
        });
    }
}