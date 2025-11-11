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
		let editMode = userInput.startsWith("/edit");
		if (!model.has("activeChat")) {
			let notes = model.has("selection") ? Array.from(model.get("selection").keys()) : [];
			let chat = {title: "New chat", notes: notes, messages: []};
			settings["chats"].push(chat);
			model.set("activeChat", chat);
			model.set("activeThread", chat["messages"]);
			model.set("chats", settings["chats"]);
		}
		let message;
		let messages = model.get("activeThread");
		if (editMode) {
			if (messages.length == 0) {
				toast("There are no AI messages yet, cannot send request to edit");
				return;
			}
			message = {role: "system", time: formatDate(), content: settings["editPrompt"] + userInput.replace("/edit ", "")};
			messages.push(message);
		} else {
			message = {role: "user", time: formatDate(), content: userInput};
			messages.push(message);
			createUserMessage($("chat"), messages.length - 1, message, messages);
			saveSettings();
		}
		$("chat-input").get().value = "";
		model.set("waitingLabel", $("chat").create("div").style("waiting-indicator assistant-message message").text("Typing..."));
		$("chat").get().scrollTop = $("chat").get().scrollHeight;
		model.get("activeChatHandler")();
		model.remove("savedResponse");
		sendRequest(editMode ? editMessageHandler : sendMessageHandler);
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
		$("selection-section").create("div").style("bean").tooltip("Click to start editing this note").html("&#128462; " + note["title"]).onclick(event => {
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
	$("archive-items").clear();
	const archivePanel = $().create("div");
	model.set("archive", archivePanel);
	let archiveCount = 0;
	
	list.forEach((chat, index, chats) => {
		if (chat["archived"]) {
			archiveCount++;
			createChatEntry(archivePanel, chat, index, chats);
		} else {
			createChatEntry($("history-items"), chat, index, chats);
		}
	});
	
	if (archiveCount > 0) {
		let archiveHeader = $().create("div").style("horizontal");
		archiveHeader.create("span").style("archive-counter").text(archiveCount);
		archiveHeader.create("span").style("archive-title").text("Archived");
		$("archive-items").add(Accordion(archiveHeader.get(), archivePanel.get()));
	}
});

function createChatEntry (container, chat, index, chats) {
	let entry = container.create("div").style("chat-history-entry");
	let nameSpan = entry.create("span").style("chat-history-title flex-one").text(chat["title"]);
	let countSpan = entry.create("span").style("chat-history-messages").html(chat["messages"].length + " MSG");
	let handler = event => {
		let activeChat = model.get("activeChat");
		
		if (activeChat === chat) {
			model.remove("activeChat");
			model.remove("activeThread");
			entry.unstyle("selected");
			setSelection([]);
		} else {
			model.set("activeChat", chat);
			model.set("activeThread", chat["messages"]);
			model.set("activeChatItem", entry);
			model.set("activeChatHandler", () => {
				countSpan.html(chat["messages"].length + " MSG");
			});
			$("history-items").forEach(section => section.unstyle("selected"));
			model.get("archive").forEach(section => section.unstyle("selected"));
			entry.style("selected");
		}
		
	};
	nameSpan.onclick(handler);
	countSpan.onclick(handler);
	let buttons = entry.create("div").style("list-item-actions");

	buttons.create("div").tooltip("Duplicate chat").text("▚").onclick(event => {
		chats.push(JSON.parse(JSON.stringify(chat)));
		model.update("chats");
		toast("Chat copied");
		saveSettings();
	});

	buttons.create("div").tooltip("Rename chat").text("✎").onclick(event => {
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

	if (chat["archived"]) {
		buttons.create("div").tooltip("Restore from archive").text("⤴").onclick(event => {
			delete chat["archived"];
			saveSettings();
			toast("Chat restored from archive");
			model.update("chats");
		});
	} else {
		buttons.create("div").tooltip("Archive chat").text("⤵").onclick(event => {
			chat["archived"] = true;
			saveSettings();
			toast("Chat moved to archive");
			model.update("chats");
		});
	}
	
	let removeButon = buttons.create("div").tooltip("Delete chat").text("⛌");
	removeButon.onclick(event => {
		event.stopPropagation();
		removeButon.destroy();
		buttons.create("div").tooltip("Confirm chat removal").text("✓").onclick(event => {
			chats.splice(index, 1);
			model.remove("activeChat");
			saveSettings();
			model.update("chats");
			toast("Chat removed");
		});
	});

	if (model.get("activeChat") === chat) {
		model.set("activeChatItem", entry);
		$("history-items").forEach(section => section.unstyle("selected"));
		entry.style("selected");
		model.set("activeChatHandler", () => {
			countSpan.html(chat["messages"].length + " MSG");
		});
	}
}

model.listen("activeChat", chat => {
	$("chat").clear();
	model.set("resolvedChat", []);
	if (chat) {
		setSelection(chat["notes"]);
		printMessages($("chat"), chat["messages"]);
		model.set("chatVisible", true);
	} else {
		model.remove("activeChatHandler");
		model.remove("activeChatItem");
	}
});

function printMessages (container, messages, scrollDown = true) {
	messages.forEach((message, index, messages) => {
		if (message["role"] === "assistant") {
			createAssistantMessage(container, index, message, messages);
		} else if (message["role"] === "user") {
			createUserMessage(container, index, message, messages);
		} else if (message["threads"]) {
			createThreadSwitcher (container, index, message, messages);
		}
	});
	if (scrollDown) {
		$("chat").get().scrollTop = $("chat").get().scrollHeight;
	}
}

function sendMessageHandler (message) {
	model.get("activeThread").push(message);
	saveSettings();
	if (model.get("waitingLabel")) {
		model.get("waitingLabel").destroy();
		model.remove("waitingLabel");
	}
	model.update("activeChat");
	model.get("activeChatHandler")();
	$("chat").get().scrollTop = $("chat").get().scrollHeight;
}

function editMessageHandler (message) {
	model.get("activeThread").pop();
	model.get("activeThread").pop();
	model.get("activeThread").push(message);
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

	header.create("span").style("message-action").tooltip("Edit message").text("✎").onclick(event =>{
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
			model.set("activeThread", messages);
			sendRequest(sendMessageHandler);
		} else {
			resendButton.text("CONFIRM RE-SEND?").get().onclick = event => {
				messages.splice(index + 1);
				model.set("activeThread", messages);
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
		body.create("div").style("message-icon").create("img").attribute("src", icon).width("100px");
	}
	let messageSection = body.create("div").style("message-section");
	let header = messageSection.create("div").style("message-header");
	header.create("span").style("message-sender").text("Notes Keeper");
	header.create("span").style("message-time").text(message["time"]);
	let content = messageSection.create("div").style("message-content").html(markdownToHtml(message["content"]));
	header.create("span").style("message-action").tooltip("Edit message").text("✎").onclick(event =>{
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
	header.create("span").style("message-action").tooltip("Create new note with this message").text("NOTE").onclick(event => {
		model.get("notes").unshift({
			uuid: createUuid(),
			title: "Message (" + message["time"] + ")",
			content: message["content"]
		});
		model.update("notes");
		toast("New note created");
	});
	if (index > 0) {
		header.create("span").style("message-action").text("BRANCH").onclick(event => {
			let copy = {role: message["role"], time: message["time"], content: message["content"]};
			let messagesLeftover = messages.splice(index, messages.length - index);
			messages.push({
				index: 1,
				threads: [messagesLeftover, [copy]]
			});
			model.update("activeChat");
			toast("New thread created");
		});
	}
	let holdButton = header.create("span").style("message-action").tooltip("Copy this message to buffer").text("▚");
	holdButton.onclick(event => {
		model.set("savedResponse", message["content"]);
		holdButton.destroy();
		saveSettings();
		toast("Message put to buffer");
	});
	if (model.get("savedResponse") && index == messages.length - 1) {
		let restoreButton = header.create("span").style("message-action").tooltip("Paste message from buffer").text("↩");
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
	let regenButton = header.create("span").style("message-action").text("REGEN");
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

function createThreadSwitcher (container, index, message, messages) {
	let switcher = container.create("div").style("thread-switcher");
	let counter = switcher.create("span").text("Thread " + (message["index"] + 1) + " / " + message["threads"].length);
	let threadContainer = container.create("div").style("thread-container");
	let thread = message["threads"][message["index"]];
	switcher.onclick(event => {
		message["index"] = message["index"] + 1;
		if (message["index"] ==  message["threads"].length) {
			message["index"] = 0;
		}
		counter.text("Thread " + (message["index"] + 1) + " / " + message["threads"].length);
		threadContainer.clear();
		thread = message["threads"][message["index"]];
		model.set("activeThread", thread);
		printMessages(threadContainer, thread, false);
	});
	switcher.create("div").style("spacer");
	switcher.create("span").style("thread-action").text("NEW THREAD").onclick(event => {
		event.stopPropagation();
		let copy = {role: thread[0]["role"], time: thread[0]["time"], content: thread[0]["content"]};
		message["threads"].push([copy]);
		message["index"] = message["threads"].length - 1;
		model.update("activeChat");
		toast("New thread created");
	});
	let deleteButton = switcher.create("div").style("thread-action").tooltip("Delete this thread").text("DELETE");
	deleteButton.onclick(event => {
		event.stopPropagation();
		deleteButton.destroy();
		switcher.create("div").style("thread-action").tooltip("Confirm thread removal").text("REALLY?").onclick(event => {
			event.stopPropagation();
			message["threads"].splice(message["index"], 1);
			message["index"] = 0;
			if (message["threads"].length == 1) {
				messages.pop();
				messages.push(...message["threads"][0]);
				model.set("activeThread", messages);
			}
			model.update("activeChat");
			toast("Thread removed");
		});
	});
	switcher.create("span").style("thread-action").text("▽").onclick(event => {
		event.stopPropagation();
		$("chat").get().scrollTop = $("chat").get().scrollHeight;
	});
	model.set("activeThread", thread);
	printMessages(threadContainer, thread);
}