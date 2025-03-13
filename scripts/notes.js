model.set("selection", new Map());
function isSelected (uuid) {
	return model.get("selection").has(uuid);
}

model.set("notesCache", new Map());
model.set("relationsCache", new Map());

model.listen("notes", value => {
	$("notes-section").clear();
	model.get("notesCache").clear();
	model.get("relationsCache").clear();
	let childNotes = [];
	value.forEach((note, index) => {
		model.get("notesCache").set(note["uuid"], note);
		if (note["parentId"]) {
			childNotes.push(note);
			if (!model.get("relationsCache").has(note["parentId"])) {
				model.get("relationsCache").set(note["parentId"], []);
			}
			model.get("relationsCache").get(note["parentId"]).push(note["uuid"]);
		} else {
			createNoteElement($("notes-section"), note, index);
		}
	});
	for (let index = 0; index < childNotes.length; index++) {
		const note = childNotes[index];
		if (model.get("notesCache").has(note["parentId"])) {
			const container = $(note["parentId"]);
			if (container.exist()) {
				createNoteElement(container, note, index);
			} else {
				childNotes.push(note);
			}
		} else {
			delete note["parentId"];
			model.update("notes");
		}
	}
	childNotes.forEach((note, index, notes) => {});
});

function openAttachment (file) {
	let components = [];
	if (file["type"].startsWith("image/")) {
		let image = new Image();
		image.src = file["content"];
		components.push(image);
	} else {
		let pre = document.createElement("pre");
		pre.innerText = file["content"];
		components.push(pre);
	}
	new Popup("File " + file["name"], "800px", "600px", ...components);
	
	/* if (file["type"].startsWith("image/")) {
		let image = new Image();
		image.src = file["content"];
		let newTab = window.open("", "_blank");
		newTab.document.body.appendChild(image);
	} else {
		let blob = new Blob([file["content"]], {type: file["type"]});
		const url = URL.createObjectURL(blob);
		window.open(url, "_blank");
	} */
}

function createNoteElement (container, note, index) {
	let noteContainer = container.create("div").style("note").id(note["uuid"]);
	noteContainer.style(note["parentId"] ? "child-note" : "root-note");
	if (isSelected(note["uuid"])) {
		noteContainer.style("selected");
	}
	let controlPanel = noteContainer.create("div").style("note-control-panel");
	if (!note["parentId"]) {
		controlPanel.create("div").style("clickable").text("⮝").onclick(event => {
			event.stopPropagation();
			const index = model.get("notes").findIndex(n => n.uuid === note.uuid);
			if (index > 0) {
				const temp = model.get("notes")[index];
				model.get("notes")[index] = model.get("notes")[index - 1];
				model.get("notes")[index - 1] = temp;
				model.update("notes");
			}
		});
		controlPanel.create("div").style("clickable").text("⮟").onclick(event => {
			event.stopPropagation();
			const index = model.get("notes").findIndex(n => n.uuid === note.uuid);
			if (index < model.get("notes").length - 1) {
				const temp = model.get("notes")[index];
				model.get("notes")[index] = model.get("notes")[index + 1];
				model.get("notes")[index + 1] = temp;
				model.update("notes");
			}
		});
	}
	controlPanel.create("div").style("clickable").text("EDIT").onclick(event => {
		event.stopPropagation();
		loadIntoEditor(note);
	});
	controlPanel.create("div").style("clickable").text("COPY").onclick(event => {
		event.stopPropagation();
		let uuid = createUuid();
		let copy = JSON.parse(JSON.stringify(note));
		copy["uuid"] = uuid;
		copy["title"] += " (copy)";
		model.get("notes").unshift(copy);
		model.update("notes");
	});
	let deleteButton = controlPanel.create("div").style("clickable").text("DELETE");
	deleteButton.onclick(event => {
		event.stopPropagation();
		deleteButton.destroy();
		controlPanel.create("div").style("clickable").text("REALLY?").onclick(event => {
			event.stopPropagation();
			model.get("notes").splice(index, 1);
			if (isSelected(note["uuid"])) {
				model.get("selection").delete(note["uuid"])
				model.update("selection");
			}
			model.update("notes");
			toast("Removed");
		});
	});
	if (note["parentId"]) {
		controlPanel.create("div").style("clickable").text("EXTRACT").onclick(event => {
			event.stopPropagation();
			delete note["parentId"]
			model.update("notes");
		});
	}
	noteContainer.onclick(event => {
		event.stopPropagation();
		if (isSelected(note["uuid"])) {
			model.get("selection").delete(note["uuid"]);
		} else {
			model.get("selection").set(note["uuid"], note);
		}
		model.update("selection");
	});
	let contentWrapper = noteContainer.create("div").style("note-content-wrapper");
	let title = contentWrapper.create("div").style("title").id(note["uuid"] + "-title");
	title.create("div").style("order-number").text(index + 1);
	title.create("span").text(note["title"]);
	if (note["tags"]) {
		let tagsContainer = contentWrapper.create("div").style("note-tags-wrapper");
		note["tags"].forEach(tagText => {
			let tag = tagsContainer.create("div").style("note-tag-bean");
			tag.create("div").style("tag-bean-hashtag").text("#");
			tag.create("div").style("tag-bean-text").text(tagText);
			tag.onclick(event => {
				event.stopPropagation();
				model.set("searchTag", tagText);
			});
		});
	}
	if (note["files"]) {
		let filesContainer = contentWrapper.create("div").style("note-files-wrapper");
		note["files"].forEach(file => {
			let fileBean = filesContainer.create("div").style("note-file-bean");
			fileBean.create("div").style("file-bean-icon").text("file");
			fileBean.create("div").style("file-bean-text").text(file["name"]);
			fileBean.onclick(event => {
				event.stopPropagation();
				openAttachment(file);
			});
		});
	}
	contentWrapper.create("div").style("content").id(note["uuid"] + "-content").html(markdownToHtml(note["content"]));
}

function saveEditedNote () {
	if (model.get("editUuid")) {
		model.get("notes").forEach(note => {
			if (note["uuid"] == model.get("editUuid")) {
				note["title"] = $("editor-title-input").get().value;
				note["content"] = $("editor-content-input").get().value;
				if ($("editor-tags-input").get().value.trim() === "") {
					delete note["tags"];
				} else {
					note["tags"] = $("editor-tags-input").get().value.split(",").map(entry => entry.trim());
				}
			}
		});
		model.remove("editUuid");
		model.update("notes");
		model.update("selection");
		toast("Note saved!");
	}
}

function getExtensionByType (type) {
	switch (type) {
		case "text/plain":
			return ".txt";
		case "application/json":
			return ".json";
		case "image/png":
			return ".png";
		case "image/jpeg":
			return ".jpg";
		case "image/bmp":
			return ".bmp";
	}
	return ".unknown";
}

function loadEditorFiles (note) {
	$("editor-files").clear();
	(note["files"] || []).forEach(file => {
		let container = $("editor-files").create("div").style("editor-file-wrapper");
		container.create("img").width("24px").height("24px").attribute("src", "images/extension" + getExtensionByType(file["type"]) + ".svg");
		container.create("span").text(file["name"]);
		container.onclick(event => {
			note["files"].splice(note["files"].indexOf(note), 1);
			if (note["files"].length == 0) {
				delete note["files"];
			}
			loadEditorFiles(note);
		});
	});
}

function loadIntoEditor (note) {
	model.set("editUuid", note["uuid"]);
	model.set("chatVisible", false);
	model.set("editorVisible", true);
	$("editor-title-input").get().value = note["title"];
	$("editor-tags-input").get().value = note["tags"] ? note["tags"].join(", ") : "";
	loadEditorFiles(note);
	$("editor-content-input").get().value = note["content"];
	$("editor-file-input").onchange(event => {
		let file = event.target.files[0];
		let reader = new FileReader();
		reader.onload = function(e) {
			if (!note["files"]) {
				note["files"] = [];
			}
			note["files"].push({
				name: generateUuidPart("xxxxxx") + getExtensionByType(file.type),
				type: file.type,
				content: e.target.result
			});
			loadEditorFiles(note);
		};
		switch (file.type) {
			case "text/plain":
			case "application/json":
				reader.readAsText(file);
				break;
			case "image/png":
			case "image/jpeg":
			case "image/bmp":
				reader.readAsDataURL(file);
				break;
		}
	});
}

function setSelection (uuids) {
	model.get("selection").clear();
	uuids.forEach(uuid => {
		if (model.get("notesCache").has(uuid)) {
			$(uuid).style("selected");
			model.get("selection").set(uuid, model.get("notesCache").get(uuid));
		}
	});
	model.update("selection");
}

model.listen("selection", value =>{
	model.get("notes").forEach(note => {
		if (model.get("selection").has(note["uuid"])) {
			$(note["uuid"]).style("selected");
		} else {
			$(note["uuid"]).unstyle("selected");
		}
	});
});

model.listen("searchTag", event => {
	model.get("selection").clear();
	model.get("notes").forEach(note => {
		if (note["tags"]) {
			if (new Set(note["tags"]).has(model.get("searchTag"))) {
				model.get("selection").set(note["uuid"], note);
			}
		}
	});
	model.update("selection");
});

model.listen("selection", values => {
	model.remove("parent");
	model.remove("children");
	model.set("children", []);
	model.set("mergeVisible", false);
	if (values.size > 1) {
		let first = true;
		values.forEach((note, uuid) => {
			if (first) {
				if (note["parentId"]) {
					return;
				}
				first = false;
				model.set("parent", note);
			} else {
				model.get("children").push(note);
				model.set("mergeVisible", true);
			}
		});
	}
});