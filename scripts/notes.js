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
	value.forEach((note, index) => {
		model.get("notesCache").set(note["uuid"], note);
		if (note["parentId"]) {
			if (!model.get("relationsCache").has(note["parentId"])) {
				model.get("relationsCache").set(note["parentId"], []);
			}
			model.get("relationsCache").get(note["parentId"]).push(note["uuid"]);
		}
	});
	
	if (settings["view"] === "card") {
		updateCardView(value);
	}
	if (settings["view"] === "table") {
		updateTableView(value);
	}
});

function updateCardView (notes) {
	let childNotes = [];
	notes.forEach((note, index) => {
		if (note["parentId"]) {
			childNotes.push(note);
		} else {
			createNoteElement($("notes-section"), notes, note);
		}
	});
	for (let index = 0; index < childNotes.length; index++) {
		const note = childNotes[index];
		if (model.get("notesCache").has(note["parentId"])) {
			const container = $(note["parentId"]);
			if (container.exist()) {
				createNoteElement(container, notes, note);
			} else {
				childNotes.push(note);
			}
		} else {
			delete note["parentId"];
			model.update("notes");
		}
	}
}

function updateTableView (notes) {
	let table = $("notes-section").create("table").style("table zebra");
	notes.forEach((note, index) => {
		if (note["parentId"] == null) {
			createTableRow(table, notes, note, 0);
		}
	});
}

function createTableRow (table, notes, note, level) {
	let index = findNoteIndex(notes, note);
	
	let row = table.create("tr").style("hoverable row-level-" + level).id(note["uuid"]);
	row.create("td").style("enumerator").text(index + 1)

	let titleCell = row.create("td");
	titleCell.create("div").text(note["title"]);

	if (note["tags"]) {
		titleCell.add(createTagsPanel(note));
	}
	let text = note["content"].length > 120 ? note["content"].replace(/\n/g, " ").substring(0, 117) + "..." : note["content"];
	row.create("td").text(text);
	row.create("td").add(createControlPanel(note, index));

	if (isSelected(note["uuid"])) {
		row.style("selected");
	}

	row.onclick(event => {
		event.stopPropagation();
		if (isSelected(note["uuid"])) {
			model.get("selection").delete(note["uuid"]);
		} else {
			model.get("selection").set(note["uuid"], note);
		}
		model.update("selection");
	});
	
	if (model.get("relationsCache").has(note["uuid"])) {
		model.get("relationsCache").get(note["uuid"]).forEach(child => {
			createTableRow(table, notes, model.get("notesCache").get(child), level + 1);
		});
	}
}

function findNoteIndex (notes, note) {
	for (let counter = 0; counter < notes.length; counter++) {
		if (notes[counter] === note) {
			return counter;
		}
	}
	return 0;
}

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
}

function createNoteElement (container, notes, note) {
	let noteContainer = container.create("div").style("note").id(note["uuid"]);
	let index = findNoteIndex(notes, note);
	noteContainer.style(note["parentId"] ? "child-note" : "root-note");
	if (isSelected(note["uuid"])) {
		noteContainer.style("selected");
	}
	
	noteContainer.add(createControlPanel(note, index));
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
		contentWrapper.add(createTagsPanel(note));
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

function createControlPanel (note, index) {
	let controlPanel = $().create("div").style("note-control-panel");
	if (!note["parentId"]) {
		controlPanel.create("div").style("clickable").tooltip("Move this note up").text("⮝").onclick(event => {
			event.stopPropagation();
			const index = model.get("notes").findIndex(n => n.uuid === note.uuid);
			if (index > 0) {				
				const temp = model.get("notes")[index];
				model.get("notes")[index] = model.get("notes")[index - 1];
				model.get("notes")[index - 1] = temp;
				model.update("notes");
			}
		});
		controlPanel.create("div").style("clickable").tooltip("Move this note down").text("⮟").onclick(event => {
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
	controlPanel.create("div").style("clickable").tooltip("Edit note").text("✎").onclick(event => {
		event.stopPropagation();
		loadIntoEditor(note);
	});
	controlPanel.create("div").style("clickable").tooltip("Duplicate this note").text("▚").onclick(event => {
		event.stopPropagation();
		let uuid = createUuid();
		let copy = JSON.parse(JSON.stringify(note));
		copy["uuid"] = uuid;
		copy["title"] += " (copy)";
		model.get("notes").unshift(copy);
		model.update("notes");
	});
	let deleteButton = controlPanel.create("div").style("clickable").tooltip("Delete this note").text("⛌");
	deleteButton.onclick(event => {
		event.stopPropagation();
		deleteButton.destroy();
		controlPanel.create("div").style("clickable").tooltip("Confirm note removal").text("✓").onclick(event => {
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
		controlPanel.create("div").style("clickable").tooltip("Exctract this note from parent").text("↪").onclick(event => {
			event.stopPropagation();
			delete note["parentId"]
			model.update("notes");
		});
	}
	return controlPanel.get();
}

function createTagsPanel (note) {
	let tagsContainer = $().create("div").style("note-tags-wrapper");
	note["tags"].forEach(tagText => {
		let tag = tagsContainer.create("div").style("note-tag-bean");
		tag.create("div").style("tag-bean-hashtag").text("#");
		tag.create("div").style("tag-bean-text").text(tagText);
		tag.onclick(event => {
			event.stopPropagation();
			model.set("searchTag", tagText);
			toast("Selected all notes with tag: " + tagText);
		});
	});
	return tagsContainer.get();
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
		case "text/csv":
			return ".csv";
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
		container.create("div").style("flex-one");
		let buttons = container.create("div").style("list-item-actions");
		
		buttons.create("div").tooltip("Rename attachment").text("✎").onclick(event => {
			event.stopPropagation();
			let name = prompt("Please enter new name for this file", file["name"]);
			if (name !== null) {
				if (name.trim() === "") {
					name = "unnamed";
				}
				file["name"] = name;
				loadEditorFiles(note);
			}
		});
		
		let removeButton = buttons.create("div").tooltip("Delete this attachment").text("⛌");
		removeButton.onclick(event => {
			event.stopPropagation();
			removeButton.destroy();
			buttons.create("div").tooltip("Confirm attachment removal").text("✓").onclick(event => {
				event.stopPropagation();
				note["files"].splice(note["files"].indexOf(note), 1);
				if (note["files"].length == 0) {
					delete note["files"];
				}
				loadEditorFiles(note);
			});
		});
		container.onclick(event => {
			openAttachment(file);
		});
	});
}

function loadIntoEditor (note) {
	model.set("editUuid", note["uuid"]);
	//model.set("chatVisible", false);
	model.set("editorVisible", true);
	$("editor-title-input").get().value = note["title"];
	$("editor-tags-input").get().value = note["tags"] ? note["tags"].join(", ") : "";
	loadEditorFiles(note);
	$("editor-content-input").get().value = note["content"];
	$("editor-file-input").onchange(event => {
		console.log(event);
		let file = event.target.files[0];
		let reader = new FileReader();
		reader.onload = function(e) {
			if (!note["files"]) {
				note["files"] = [];
			}
			note["files"].push({
				name: file.name,
				type: file.type,
				content: e.target.result
			});
			loadEditorFiles(note);
			$("editor-file-input").get().value = null;
		};
		switch (file.type) {
			case "text/plain":
			case "application/json":
			case "text/csv":
				reader.readAsText(file);
				break;
			case "image/png":
			case "image/jpeg":
			case "image/bmp":
				reader.readAsDataURL(file);
				break;
			default:
				toast("Unsupported type: " + file.type);
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