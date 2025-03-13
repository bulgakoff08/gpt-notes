const modelsList = [
	["meta-llama/llama-3-70b-instruct", "Llama 3 70B Instruct"],
	["meta-llama/llama-3.1-405b-instruct", "Llama3.1 405B Instruct"],
	["neversleep/llama-3.1-lumimaid-70b", "Llama 3.1 Lumimaid 70B"],
	["meta-llama/llama-3.2-90b-vision-instruct", "Llama 3.2 90B"],
	["meta-llama/llama-3.3-70b-instruct", "Llama 3.3 70B"],
	["eva-unit-01/eva-llama-3.33-70b", "Llama 3.3 Eva"],
	["openai/gpt-4o", "GTP4 Omni"],
	["llama3.1", "Local Llama 3.1"],
	["llama3.2", "Local Llama 3.2"]
];

const settings = localStorage.getItem("GptNotesSettings") ? JSON.parse(localStorage.getItem("GptNotesSettings")) : ({
	apiKey: "-- your api key --",
	model: "meta-llama/llama-3-8b-instruct",
	models: modelsList,
	maxTokens: 192,
	contextSize: 20,
	useTuning: "Yes",
	randomLevel: 1,
	repeatLevel: 1,
	systemPrompt: "Your name is Note Keeper and you're an advanced AI. Your task is to assist user with any questions they have in friendly and tame manner. User may attach some notes to their queries and if so, they will be listed bellow.",
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


settings["models"] = modelsList;

if (!settings["format"]) {
	settings["format"] = "openrouter";
	saveSettings();
}

model.set("notes", settings["notes"]);
model.set("chats", settings["chats"]);
model.set("model", settings["model"]);

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
	Input("Endpoint (openrouter / ollama)", settings["format"], "api endpoint format...", value => {
		settings["format"] = value;
		saveSettings();
	}),
	Input("Platform API Key", settings["apiKey"], "api key auth token...", value => {
		settings["apiKey"] = value;
		saveSettings();
	}),
	Input("Custom Instructions", settings["systemPrompt"], "Instructions for AI to generate responses...", value => {
		settings["systemPrompt"] = value;
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
	}),
	Input("Context Size in Messages", settings["contextSize"], "Messages amount in memory...", value => {
		settings["contextSize"] = parseInt(value);
		saveSettings();
	}),		
	Input("Use output tuning. Yes / No", settings["useTuning"], "Defines usage of response random, repetition penalty and new topic chance", value => {
		settings["useTuning"] = value === "Yes" ? "Yes" : "No";
		saveSettings();
	}),
	Input("Level of Response Random", settings["randomLevel"], "Level of random for generator...", value => {
		settings["randomLevel"] = parseFloat(value);
		saveSettings();
	}),
	Input("Repeat Penalty", settings["repeatLevel"], "Penalty for tokens repeat...", value => {
		settings["repeatLevel"] = parseFloat(value);
		saveSettings();
	})
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
	});
	
	modelsAccordion = Accordion(
		$().create("span").text("Active Model").get(),
		...modelButtons
	);
	
	$("settings-section").add(modelsAccordion);
}

reloadModels();

































