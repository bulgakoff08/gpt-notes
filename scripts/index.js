function Accordion (title, ...children) {
	let wrapper = $().create("div").style("accordion-wrapper");
	let header = wrapper.create("div").style("accordion-header").add(title);
	let content = wrapper.create("div").style("accordion-content");
	let contentWrapper = content.create("div").style("accordion-content-wrapper");
	children.forEach(child => {
		contentWrapper.add(child);
	});
	header.onclick(event => {
		header.toggle("accordion-header-active");
		content.toggle("accordion-content-active");
	});
	return wrapper.get();
}

function Input (title, value, placeholder, handler) {
	let wrapper = $().create("div").style("input-wrapper");
	wrapper.create("span").text(title);
	let input = wrapper.create("input");
	input.attribute("placeholder", placeholder);
	input.get().value = value;
	input.onchange(event => handler(input.get().value));
	return wrapper.get();
}

function Textarea (title, rows, value, placeholder, handler) {
	let wrapper = $().create("div").style("textarea-wrapper");
	wrapper.create("span").text(title);
	let textarea = wrapper.create("textarea");
	textarea.attribute("placeholder", placeholder);
	textarea.attribute("rows", rows);
	textarea.get().value = value || "";
	textarea.onchange(event => handler(textarea.get().value));
	return wrapper.get();
}

function Popup (title, width, height, ...children) {
	let backdrop = $(document.body).create("div").style("backdrop");
	let wrapper = $(document.body).create("div").style("popup");
	wrapper.width(width);
	wrapper.get().style.left = "calc(50% - " + (parseInt(width) / 2) + (width.includes("px") ? "px" : "%") + ")";
	let header = wrapper.create("div").style("popup-header");
	header.create("span").text(title);
	let content = wrapper.create("div").style("popup-root-panel");
	children.forEach(entry => content.add(entry));
	backdrop.onclick(event => {
		backdrop.destroy();
		wrapper.destroy();
	});
}

function visibility (model, element, key, initial) {
    model.listen(key, function (value) {
        if (element) {
            if (value) {
                $(element).unstyle("hidden");
            } else {
                $(element).style("hidden");
            }
        }
    });
	model.set(key, initial);
}

function toggle (model, key) {
	model.set(key, !Boolean(model.get(key)));
}

function generateUuidPart (mask) {
	return mask.replace(/[x]/g, function() {
		return (Math.random() * 16 | 0).toString(16);
	});
}

function createUuid () {
	return generateUuidPart("xxxxxxxxxxxx");
}

function toast (text, duration = 2000) {
	$("toast-section").style("toast-visible");
	$("toast-section").text(text);
	setTimeout(() => {
		$("toast-section").text("");
		$("toast-section").unstyle("toast-visible");
	}, duration);
}

function formatDate () {
	let now = new Date();
	
	let date = now.getDate() > 9 ? now.getDate() : "0" + now.getDate();
	let month = now.getMonth() > 8 ? now.getMonth() + 1 : "0" + (now.getMonth() + 1);
	
	let hours = now.getHours() > 9 ? now.getHours() : "0" + now.getHours();;
	let minutes = now.getMinutes() > 9 ? now.getMinutes() : "0" + now.getMinutes();;
	
	return date + "." + month + "." + now.getUTCFullYear() + " " + hours + ":" + minutes;
}

function markdownToHtml(input) {
	let message = "";

	let italic = false;
	let bold = false;
	let block = false;
	let characters = input.split("");

	for (let index = 0; index < characters.length; index++) {
		let character = characters[index];

		if (character === "*" && !block) {
			if (characters[index + 1] === "*") {
				if (bold) {
					message += "</b>";
					bold = false;
				} else {
					message += "<b>";
					bold = true;
				}
				index++;
				continue;
			}
			if (italic) {
				message += "</i>";
				italic = false;
			} else {
				message += "<i>";
				italic = true;
			}
			continue;
		}

		if (character === "\n") {
			if (characters[index + 1] === "\n") {
				message += "<p>";
				index++;
			} else {
				message += "<br>";
			}
			continue;
		}

		if (character === "`") {
			if (characters[index + 1] === "`" && characters[index + 2] === "`") {
				if (block) {
					message += "</pre></code>";
					block = false;
					index++;
				} else {
					block = true;
					message += "<code><pre>";
					if (characters[index + 3] === "\n") {
						index++;
					}
				}
				index += 2;
				continue;
			}
		}

		if (character === ">") {
			message += "&gt;";
			continue;
		}

		if (character === "<") {
			message += "&lt;";
			continue;
		}

		if (character === "&") {
			message += "&amp;";
			continue;
		}

		message += character;
	}

	if (italic) message += "</i>";
	if (bold) message += "</b>";
	if (block) message += "</pre></code>";

	return message;
}