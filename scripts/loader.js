function sendRequest (handler) {
	let messages = [
		{
			role: "system",
			content: [
				settings["systemPrompt"],
				formatAttachments(model.get("selection"))
			].join("\n\n")
		},
		...getLastMessages(model.get("activeChat")["messages"]).map(entry => {return {role: entry["role"], content: entry["content"]}})
	];
	
	let requestBody = {
		model: model.get("model"),
		max_tokens: settings["maxTokens"],
		messages: messages
	};
	if (settings["useTuning"] === "Yes") {
		requestBody["temperature"] = settings["randomLevel"];
		requestBody["repetition_penalty"] = settings["repeatLevel"];
	}
	if (settings["format"] === "ollama") {
		requestBody["stream"] = false;
	}
	let counter = 0;
	function countdown () {
		if (model.get("waitingLabel")) {
			counter += 100;
			model.get("waitingLabel").text("Typing... (" + (counter / 1000) + " sec)");
			setTimeout(countdown, 100);
		} else {
			clearInterval(countdown);
		}
	}
	console.log(requestBody);
	countdown();
	
	const ollamaEndpoint = "http://localhost:11434/api/chat";
	const openrouterEndpoint = "https://openrouter.ai/api/v1/chat/completions";
	const headers = (settings["format"] === "openrouter" ? {
		"Content-Type": "application/json",
		"Authorization": "Bearer " + settings["apiKey"],
		"HTTP-Referer": "https://codepen.website"
	} : {
		"Content-Type": "application/json"
	})	
	
	fetch((settings["format"] === "openrouter" ? openrouterEndpoint : ollamaEndpoint), {
		method: "POST",
		headers: headers,
		body: JSON.stringify(requestBody)
	})
	.then(response => response.json())
	.then(data => {
		if (settings["format"] === "openrouter") {
			processResponseOpenrounter(data, handler);
		}
		if (settings["format"] == "ollama") {
			processResponseOllama(data, handler);
		}
	})
	.catch(error => {
		toast(String(error), 5000);
		model.get("waitingLabel").destroy();
		model.remove("waitingLabel");
		counter = 0;
	});
}

function processResponseOpenrounter (data, handler) {
	if (data["choices"]) {
		if (data["choices"].length > 0) {
			let entry = data["choices"][0]["message"];
			handler({
				role: entry["role"],
				time: formatDate(),
				content: removeBuggySymbols(entry["content"])
			});
		}
	}
}

function processResponseOllama (data, handler) {
	if (data["message"]) {
		let entry = data["message"];
		handler({
			role: entry["role"],
			time: formatDate(),
			content: removeBuggySymbols(entry["content"])
		});
	}
}

function formatAttachments (notes) {
	let result = [];
	notes.forEach((note, uuid) => result.push(formatAttachment(note)));
	return result.join("\n\n");
}

function formatAttachment (note) {
	let result = [];
	result.push("Title: " + note["title"]);
	if (note["tags"] && note["tags"].length > 0) {
		result.push("Tags: " + note["tags"].join(", "));
	}
	result.push("Content: " + note["content"]);
	return result.join("\n");
}

function replaceAll (input, pattern, replaceText) {
	let result = input.replace(pattern, replaceText);
	return result.indexOf(pattern) == -1 ? result : replaceAll(result, pattern, replaceText);
}

function removeBuggySymbols (input) {
	if (input.indexOf("###") > -1) {
		return input.replace("###", "").trim();
	}
	return input.trim();
}

function getLastMessages (messages) {
	if (messages.length > settings["contextSize"]) {
		let buffer = [];
		for (let i = settings["contextSize"]; i > 0; i--) {
			buffer.push(messages[messages.length - i]);
		}
		return buffer;
	} else {
		return messages;
	}
}