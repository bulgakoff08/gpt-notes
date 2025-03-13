const $ = function (selector, context = document) {
	const element = "string" === typeof selector ? context.getElementById(selector) : selector;
	return {
		add: function (child) {
			element.appendChild(child);
			return this;
		},
		exist: function () {
			return element !== null && element !== undefined;
		},
		attribute: function (name, value) {
			element.setAttribute(name, value);
			return this;
		},
		child: function (index) {
			if (index >= element.childNodes.length) {
				console.log("Child node under index " + index + " not found");
				return null;
			}
			return $(element.childNodes.item(index));
		},
		clear: function () {
			element.innerHTML = "";
			return this;
		},
		id: function (id) {
			element.id = id;
			return this;
		},
		create: function (tag) {
			let child = context.createElement(tag);
			if (element) element.appendChild(child);
			return $(child);
		},
		destroy: function () {
			element.outerHTML = "";
		},
		forEach: function (callback) {
			element.childNodes.forEach((child, index) => callback($(child), index));
			return this;
		},
		get: function () {
			return element;
		},
		height: function (height) {
			element.style.height = height;
			return this;
		},
		onchange: function (handler) {
			element.onchange = handler;
			return this;
		},
		onclick: function (handler) {
			element.onclick = handler;
			return this;
		},
		property: function (key) {
			return element[key];
		},
		style: function (style, reset = false) {
			if (reset) {
				element.className = style;
			} else {
				let styles = new Set(element.className.split(" "));
				styles.add(style);
				element.className = [...styles].join(" ").trim();
			}
			return this;
		},
		text: function (text) {
			element.innerText = text;
			return this;
		},
		html: function (html) {
			element.innerHTML = html;
			return this;
		},
		toggle: function (style) {
			let styles = new Set(element.className.split(" "));
			return styles.has(style) ? this.unstyle(style) : this.style(style);
		},
		unstyle: function (style) {
			let styles = new Set(element.className.split(" "));
			styles.delete(style);
			element.className = [...styles].join(" ");
			return this;
		},
		width: function (width) {
			element.style.width = width;
			return this;
		}
	}
}