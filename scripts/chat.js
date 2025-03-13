$("new-chat-button").onclick(event => {
	settings["chats"].push({
		title: "New chat",
		notes: [],
		messages: []
	});
	model.set("chats", settings["chats"]);
});

function sendMessage () {
	let userInput = $("chat-input").get().value;
	if (userInput) {
		if (!model.has("activeChat")) {
			let chat = {
				title: "New chat",
				notes: (model.has("selection") ? Array.from(model.get("selection").keys()) : []),
				messages: []
			};
			console.log(chat);
			settings["chats"].push(chat);
			model.set("activeChat", chat);
			model.set("chats", settings["chats"]);
		}
		let message = {role: "user", time: formatDate(), content: userInput};
		let messages = model.get("activeChat")["messages"];
		messages.push(message);
		$("chat-input").get().value = "";
		createUserMessage($("chat"), messages.length - 1, message, messages);
		model.set("waitingLabel", $("chat").create("div").style("waiting-indicator assistant-message message").text("Typing..."));
		$("chat").get().scrollTop = $("chat").get().scrollHeight;
		model.get("activeChatHandler")();
		model.remove("savedResponse");
		saveSettings();
		sendRequest(sendMessageHandler);
	} else {
		toast("Input is empty");
	}
}

$("chat-send-button").onclick(event => sendMessage());

$("chat-input").get().onkeypress= event => {
	if (event.key === "Enter") {
		sendMessage();
	}
};

model.listen("selection", list => {
	$("selection-section").clear();
	let uuids = [];
	list.forEach((note, uuid) => {
		$("selection-section").create("div").style("bean").html("&#128462; " + note["title"]).onclick(event => {
			event.stopPropagation();
			loadIntoEditor(note);
		});
		uuids.push(uuid);
	});
	if (model.has("activeChat")) {
		model.get("activeChat")["notes"] = uuids;
		saveSettings();
	}
})

model.listen("chats", list => {
	$("history-items").clear();
	list.forEach((chat, index, chats) => {
		let entry = $("history-items").create("div").style("chat-history-entry");
		let nameSpan = entry.create("span").style("chat-history-title flex-one").text(chat["title"]);
		let countSpan = entry.create("span").style("chat-history-messages").html(chat["messages"].length + " MSG");
		let handler = event => {
			if (model.get("activeChat") === chat) {
				model.remove("activeChat");
				entry.unstyle("selected");
				setSelection([]);
			} else {
				model.set("activeChat", chat);
				model.set("activeChatItem", entry);
				$("history-items").forEach(section => section.unstyle("selected"));
				entry.style("selected");
				model.set("activeChatHandler", () => {
					countSpan.html(chat["messages"].length + " MSG");
				});
			}
		};
		nameSpan.onclick(handler);
		countSpan.onclick(handler);
		let buttons = entry.create("div").style("chat-history-actions");
		buttons.create("div").text("✎").onclick(event => {
			let name = prompt("Please enter new name for this chat", chat["title"]);
			if (name !== null) {
				if (name.trim() === "") {
					name = "Unnamed Chat";
				}
				chat["title"] = name;
				nameSpan.text(name);
				saveSettings();
			}
		});
		buttons.create("div").text("DELETE").onclick(event => {
			if (confirm("This will delete conversation, continue?")) {
				chats.splice(index, 1);
				model.remove("activeChat");
				saveSettings();
				model.update("chats");
				toast("Removed");
			}
		});
		if (model.get("activeChat") === chat) {
			model.set("activeChatItem", entry);
			$("history-items").forEach(section => section.unstyle("selected"));
			entry.style("selected");
			model.set("activeChatHandler", () => {
				countSpan.html(chat["messages"].length + " MSG");
			});
		}
	});
});

model.listen("activeChat", chat => {
	$("chat").clear();
	model.set("resolvedChat", []);
	if (chat) {
		setSelection(chat["notes"]);
		printMessages($("chat"), chat["messages"]);
	} else {
		model.remove("activeChatHandler");
		model.remove("activeChatItem");
	}
});

function printMessages (container, messages) {
	messages.forEach((message, index, messages) => {
		if (message["role"] === "assistant") {
			createAssistantMessage(container, index, message, messages);
		} else if (message["role"] === "user") {
			createUserMessage(container, index, message, messages);
		} else if (message["threads"]) {
			createThreadSwitcher (container, message);
		}
	});
	$("chat").get().scrollTop = $("chat").get().scrollHeight;
}

function sendMessageHandler (message) {
	model.get("activeChat")["messages"].push(message);
	saveSettings();
	if (model.get("waitingLabel")) {
		model.get("waitingLabel").destroy();
		model.remove("waitingLabel");
	}
	model.update("activeChat");
	model.get("activeChatHandler")();
	$("chat").get().scrollTop = $("chat").get().scrollHeight;
}

function createUserMessage (container, index, message, messages) {
	let body = container.create("div").style("message user-message");
	let messageSection = body.create("div").style("message-section");
	let header = messageSection.create("div").style("message-header");
	header.create("span").style("message-sender").text("Me");
	header.create("span").style("message-time").text(message["time"]);
	let content = messageSection.create("div").style("message-content").html(markdownToHtml(message["content"]));

	header.create("span").style("message-action").text("EDIT").onclick(event =>{
		content.clear();
		let textArea = content.create("textarea").text(message["content"]);
		textArea.height(textArea.get().scrollHeight + "px");
		textArea.onchange(even => {
			message["content"] = textArea.get().value;
			textArea.destroy();
			content.html(markdownToHtml(message["content"]));
			saveSettings();
		});
	});

	let deleteButton = header.create("span").style("message-action").text("DELETE");
	deleteButton.onclick(event => {
		deleteButton.text("REALLY?").get().onclick = event => {
			messages.splice(index);
			model.update("activeChat");
			model.get("activeChatHandler")();
			saveSettings();
		};
	});

	let resendButton = header.create("span").style("message-action").text("RE-SEND");
	resendButton.onclick(event =>{
		if (index == messages.length - 1) {
			model.set("waitingLabel", $("chat").create("div").style("waiting-indicator assistant-message message").text("Typing..."));
			$("chat").get().scrollTop = $("chat").get().scrollHeight;
			model.remove("regens");
			sendRequest(sendMessageHandler);
		} else {
			resendButton.text("CONFIRM RE-SEND?").get().onclick = event => {
				messages.splice(index + 1);
				model.remove("regens");
				saveSettings();
				model.update("activeChat");
				model.set("waitingLabel", $("chat").create("div").style("waiting-indicator assistant-message message").text("Typing..."));
				$("chat").get().scrollTop = $("chat").get().scrollHeight;
				sendRequest(sendMessageHandler);
			};
		}
	});
}

function getIconForMessage () {
	let result = null;
	if (model.has("selection")) {
		model.get("selection").forEach((note, uuid) => {
			if (!result && note["files"]) {
				note["files"].forEach(file => {
					if (file["type"] == "image/png" || file["type"] == "image/jpeg" || file["type"] == "image/bmp") {
						result = file["content"];
					}
				});
			}
		});
	}
	return result;
}

function createAssistantMessage (container, index, message, messages) {
	let body = container.create("div").style("message assistant-message");
	let icon = getIconForMessage();
	if (icon) {
		body.create("div").style("message-icon").create("img").attribute("src", icon).width("75px").height("75px");
	}
	let messageSection = body.create("div").style("message-section");
	let header = messageSection.create("div").style("message-header");
	header.create("span").style("message-sender").text("Notes Keeper");
	header.create("span").style("message-time").text(message["time"]);
	let content = messageSection.create("div").style("message-content").html(markdownToHtml(message["content"]));
	header.create("span").style("message-action").text("EDIT").onclick(event =>{
		content.clear();
		let textArea = content.create("textarea").html(message["content"]);
		textArea.height(textArea.get().scrollHeight + "px");
		textArea.onchange(even => {
			message["content"] = textArea.get().value;
			textArea.destroy();
			content.html(markdownToHtml(message["content"]));
			saveSettings();
		});
	});
	header.create("span").style("message-action").text("NOTE").onclick(event => {
		model.get("notes").unshift({
			uuid: createUuid(),
			title: "Message (" + message["time"] + ")",
			content: message["content"]
		});
		model.update("notes");
		toast("New note created");
	});
	/* header.create("span").style("message-action").text("THREAD").onclick(event => {
		let copy = {role: message["role"], time: message["time"], content: message["content"]};
		let messagesLeftover = messages.splice(index, messages.length - index);
		messages.push({
			index: 1,
			threads: [messagesLeftover, [copy]]
		});
		model.update("activeChat");
		toast("New thread created");
	}); */
	let holdButton = header.create("span").style("message-action").text("HOLD");
	holdButton.onclick(event => {
		model.set("savedResponse", message["content"]);
		holdButton.destroy();
		saveSettings();
		toast("Message put to buffer");
	});
	if (model.get("savedResponse") && index == messages.length - 1) {
		let restoreButton = header.create("span").style("message-action").text("PASTE");
		restoreButton.onclick(event => {
			restoreButton.destroy();
			message["content"] = model.get("savedResponse");
			content.html(markdownToHtml(message["content"]));
			model.remove("savedResponse");
			saveSettings();
			toast("Message restored");
		});
	}
	function regenerateMessage () {
		messages.splice(index);
		saveSettings();
		model.update("activeChat");
		model.set("waitingLabel", $("chat").create("div").style("waiting-indicator assistant-message message").text("Typing..."));
		$("chat").get().scrollTop = $("chat").get().scrollHeight;
		sendRequest(sendMessageHandler);
	}
	let regenButton = header.create("span").style("message-action").text("RE-GENERATE");
	regenButton.onclick(event => {
		if (index == messages.length - 1) {
			regenerateMessage();
		} else {
			regenButton.destroy();
			header.create("span").style("message-action").text("REALLY?").onclick(event => {
				regenerateMessage();
			});
		}
	});
}

function createThreadSwitcher (container, message) {
	let switcher = container.create("div").style("thread-switcher").text("Thread " + (message["index"] + 1) + " / " + message["threads"].length);
	let threadContainer = container.create("div").style("thread-container");
	switcher.onclick(event => {
		message["index"] = message["index"] + 1;
		if (message["index"] ==  message["threads"].length) {
			message["index"] = 0;
		}
		switcher.text("Thread " + (message["index"] + 1) + " / " + message["threads"].length);
		threadContainer.clear();
		printMessages(threadContainer, message["threads"][message["index"]]);
	});
	printMessages(threadContainer, message["threads"][message["index"]]);
}