function Model(properties) {
    this.properties = new Map();
    this.listeners = new Map();
	
    if (properties) {
        Object.keys(properties).forEach(key => this.properties.set(key, properties[key]));
    }

    this.set = function (key, value) {
		this.properties.set(key, value);
		this._trigger(key, value);
    }

    this.get = function (key) {
        return this.properties.get(key);
    }
	
	this.update = function (key) {
		this._trigger(key, this.properties.get(key));
	}
	
	this.has = function (key) {
		return this.properties.has(key);
	}

    this.remove = function (key) {
        this.properties.delete(key);
        this._trigger(key);
    }

    this.listen = function (key, listener) {
		if (this.listeners.has(key)) {
			this.listeners.get(key).add(listener);
		} else {
			this.listeners.set(key, new Set([listener]));
		}
    }
    
    this.unlisten = function (key, listener) {
        if (this.listeners.has(key)) {
            this.listeners.get(key).delete(listener);
        }
    }

    this._trigger = function (key, value) {
		if (this.listeners.has(key)) {
			this.listeners.get(key).forEach(listener => listener(value));
        }
    }
}

const model = new Model();