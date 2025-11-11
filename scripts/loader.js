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
		let temp = parseFloat((settings["randomLevel"] + getRandomInRange(settings["floatingIndex"])).toFixed(2));
		let repeat = parseFloat((settings["repeatLevel"] + getRandomInRange(settings["floatingIndex"])).toFixed(2));
		let topP = parseFloat((settings["topP"] + getRandomInRange(settings["floatingIndex"])).toFixed(2));
		
		requestBody["temperature"] = temp > 1 ? 1 : temp;
		if ("mistral" !== settings["format"]) {
			requestBody["repetition_penalty"] = repeat > 1 ? 1 : repeat;
		}
		requestBody["top_p"] = topP > 1 ? 1 : topP;
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
	
	countdown();

	const localEndpoint = "http://localhost:1234/v1/chat/completions";
	const openrouterEndpoint = "https://openrouter.ai/api/v1/chat/completions";
	const mistralEndpoint = "https://api.mistral.ai/v1/chat/completions";
	const headers = (settings["format"] === "local" ? {
		"Content-Type": "application/json"
	} : {
		"Content-Type": "application/json",
		"Authorization": "Bearer " + settings["apiKey"],
		"Accept": "application/json"
		//"HTTP-Referer": "https://codepen.website"
	});

	if (settings["format"] === "echo") {
		handler({
			role: "assistant",
			time: formatDate(),
			content: "Response to: " + messages[messages.length - 1].content
		});
	} else {
		let endpoint = openrouterEndpoint;
		if ("mistral" === settings["format"]) {
			endpoint = mistralEndpoint;
		}
		if ("local" === settings["format"]) {
			endpoint = localEndpoint;
		}
		
		fetch(endpoint, {
			method: "POST",
			headers: headers,
			body: JSON.stringify(requestBody)
		})
		.then(response => response.json())
		.then(data => {
			processResponse(data, handler);
		})
		.catch(error => {
			toast(String(error), 5000);
			model.get("waitingLabel").destroy();
			model.remove("waitingLabel");
			counter = 0;
		});
	}
}

function processResponse (data, handler) {
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

function formatAttachments (notes) {
	let result = [];
	notes.forEach((note, uuid) => result.push(formatAttachment(note)));
	return result.join("\n\n");
}

function formatAttachment (note) {
	let result = [];
	result.push("\nAttachment\n------\nTitle: " + note["title"]);
	if (note["tags"] && note["tags"].length > 0) {
		result.push("Tags: " + note["tags"].join(", "));
	}
	result.push("Content: " + note["content"] + "\n");
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
	let buffer = [];
	collectMessages(buffer, messages);
	if (buffer.length > settings["contextSize"]) {
		let result = [];
		for (let i = settings["contextSize"]; i > 0; i--) {
			result.push(buffer[buffer.length - i]);
		}
		return result;
	}
	return buffer;
}

function collectMessages (buffer, messages) {
	messages.forEach(message => {
		if (message["threads"]) {
			collectMessages(buffer, message["threads"][message["index"]]);
		} else {
			buffer.push(message);
		}
	});
}

function getRandomInRange (range) {
	const step = 0.02;
	const stepsCount = Math.floor(range / step);
	const randomStep = Math.floor(Math.random() * (stepsCount + 1)) * step;
	const sign = Math.random() < 0.5 ? -1 : 1;
	return parseFloat((randomStep * sign).toFixed(2));
}