const modelsList = [
	["---", "openrouter.ai"],
	["gryphe/mythomax-l2-13b", "Llama 2 Mythomax 13B"],
	["meta-llama/llama-3-70b-instruct", "Llama 3 70B"],
	["meta-llama/llama-3.1-405b-instruct", "Llama 3.1 405B"],
	["meta-llama/llama-3.2-90b-vision-instruct", "Llama 3.2 90B"],
	["meta-llama/llama-3.3-70b-instruct", "Llama 3.3 70B"],
	["meta-llama/llama-4-maverick", "Llama 4 Maverick"],
	["mistralai/mistral-nemo", "Mistralai Nemo"],
	["microsoft/wizardlm-2-8x22b", "Wizard LM2 22B"],
	["deepseek/deepseek-chat-v3-0324", "Deepseek Chat V3"],
	["---", "Open AI"],
	["openai/gpt-4o", "GTP4 Omni"],
	["openai/gpt-5", "GTP5"],
	["openai/gpt-5-chat", "GPT5 Chat"],
	["openai/gpt-5-mini", "GTP5 Mini"],
	["openai/gpt-5-nano", "GTP5 Nano"],
	["---", "Mistral AI"],
	["mistral-large-latest", "Mistral Large"],
	["---", "Local LLM Studio"],
	["llama3.2-8b-stheno", "Llama 3.2 Stheno 8B"],
	["gemmasutra-9b", "Gemma 2 Gemmasutra 9B"]
];

const editPromptTemplate = "Rewrite your latest message precisely following user guidance. Latest last message is going to be replaced with whatever you create now. Do not mention the fact of editing at all. User instructions:";

const settings = localStorage.getItem("GptNotesSettings") ? JSON.parse(localStorage.getItem("GptNotesSettings")) : ({
	apiKey: "-- your api key --",
	model: "meta-llama/llama-3-8b-instruct",
	models: modelsList,
	maxTokens: 192,
	contextSize: 20,
	useTuning: "Yes",
	floatingIndex: 0,
	randomLevel: 1,
	repeatLevel: 1,
	topP: 1,
	systemPrompt: "Your name is Note Keeper and you're an advanced AI. Your task is to assist user with any questions they have in friendly and tame manner. User may attach some notes to their queries and if so, they will be listed bellow.",
	editPrompt: editPromptTemplate,
	notes: [],
	chats: []
});

function saveSettings () {
	localStorage.setItem("GptNotesSettings", JSON.stringify(settings));
}

if (!settings["model"]) {
	settings["model"] = "meta-llama/llama-3-8b-instruct";	
	saveSettings();
}

if (settings["floatingIndex"] == null) {
	settings["floatingIndex"] = 0;
	saveSettings();
}

if (!settings["view"]) {
	settings["view"] = "card";
	saveSettings();
}

if (!settings["editPrompt"]) {
	settings["editPrompt"] = editPromptTemplate;
	saveSettings();
}

if (settings["chatVisible"] == null) {
	settings["chatVisible"] = true;
}

settings["models"] = modelsList;

if (!settings["format"]) {
	settings["format"] = "openrouter";
	saveSettings();
}

model.set("notes", settings["notes"]);
model.set("chats", settings["chats"]);
model.set("model", settings["model"]);
model.set("chatVisible", settings["chatVisible"]);

model.listen("chatVisible", value => {
	settings["chatVisible"] = value;
	saveSettings();
});

model.listen("notes", value => {
	settings["notes"] = value;
	saveSettings();
});

let importContainer = $().create("div").style("clickable-light danger").html("&#9888;");
importContainer.create("input").style("settings-input").attribute("type", "file").onchange(event => {
	let file = event.target.files[0];
	let reader = new FileReader();
	reader.onload = function(e) {
		let json = e.target.result;
		localStorage.setItem("GptNotesSettings", json);
		location.reload();
	};
	reader.readAsText(file);
});

$("settings-section").add(Accordion(
	$().create("span").text("System Settings").get(),
	Input("Endpoint", settings["format"], "api endpoint format...", value => {
		settings["format"] = value;
		saveSettings();
	}, ["openrouter", "local", "mistral", "echo"]),
	Input("Platform API Key", settings["apiKey"], "api key auth token...", value => {
		settings["apiKey"] = value;
		saveSettings();
	}),
	Input("Custom Instructions", settings["systemPrompt"], "Instructions for AI to generate responses...", value => {
		settings["systemPrompt"] = value;
		saveSettings();
	}),
	Input("Rewrite Instructions", settings["editPrompt"], "Instructions for AI to rewrite message...", value => {
		settings["editPrompt"] = value;
		saveSettings();
	}),
	$().create("div").style("clickable-light").html("&#10100; &#10101; EXPORT SETTINGS").onclick(event => {
		const filename = "gpt-notes-backup.json";
		const payload = settings;
		const blob = new Blob([JSON.stringify(payload)], {type: "application/json"});
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.setAttribute("href", url);
		link.setAttribute("download", filename);
		link.click();
		URL.revokeObjectURL(url);
	}).get(),
	importContainer.get()
));

$("settings-section").add(Accordion(
	$().create("span").text("Generator Parameters").get(),
	Input("Response Length in Tokens", settings["maxTokens"], "Response length in tokens...", value => {
		settings["maxTokens"] = parseInt(value);
		saveSettings();
	}, ["100", "200", "500", "1000"]),
	Input("Context Size in Messages", settings["contextSize"], "Messages amount in memory...", value => {
		settings["contextSize"] = parseInt(value);
		saveSettings();
	}),		
	Input("Use output tuning", settings["useTuning"], "Defines usage of response random, repetition penalty and new topic chance", value => {
		settings["useTuning"] = value === "Yes" ? "Yes" : "No";
		saveSettings();
	}, ["Yes", "No"]),
	
	Input("Floating index", settings["floatingIndex"], "Defines random parameters deviation on each query", value => {
		settings["floatingIndex"] = parseFloat(value);
		saveSettings();
	}, ["0", "0.1", "0.2", "0.3"]),
	
	Input("Level of Response Random", settings["randomLevel"], "Level of random for generator...", value => {
		settings["randomLevel"] = parseFloat(value);
		saveSettings();
	}),
	Input("Level of Words Variety", settings["topP"], "Level of words variety for generator...", value => {
		settings["topP"] = parseFloat(value);
		saveSettings();
	}, ["0.6", "0.7", "0.8", "0.9"]),
	Input("Repeat Penalty", settings["repeatLevel"], "Penalty for tokens repeat...", value => {
		settings["repeatLevel"] = parseFloat(value);
		saveSettings();
	}, ["0.6", "0.7", "0.8", "0.9"])
));

let modelsAccordion = null;

function reloadModels () {
	if (modelsAccordion) {
		$(modelsAccordion).destroy();
	}
	let modelButtons = [
		/* $().create("div").style("clickable-light center bnorder").text("+ Add New").onclick(event => {
			model.set("addModelVisible", !Boolean(model.get("addModelVisible")));
			toast("addModelVisible: " + model.get("addModelVisible"));
		}).get() */
	];
	settings["models"].forEach(pair => {
		if ("---" === pair[0]) {
			let divider = $().create("div").style("divider");
			divider.create("span").style("divider-label").text(pair[1]);
			modelButtons.push(divider.get());
		} else {
			let button = $().create("div").style("clickable-light").text(pair[1]).onclick(event => {
				model.set("model", pair[0]);
				settings["model"] = pair[0];
				saveSettings();
			});
			if (model.get("model") === pair[0]) {
				button.style("selected");
			}
			model.listen("model", value => {
				if (value !== pair[0]) {
					button.unstyle("selected");
				} else {
					button.style("selected");
				}
			});
			modelButtons.push(button.get());
		}
	});

	modelsAccordion = Accordion(
		$().create("span").text("Active Model").get(),
		...modelButtons
	);

	$("settings-section").add(modelsAccordion);
}

reloadModels();
