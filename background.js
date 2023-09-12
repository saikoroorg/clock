// Service worker.
Worker = class {
	constructor() {
		this.background = "./background.js"; // This script file.
		this.manifest = "./manifest.json"; // Manifest file.
		this.replacing = {}; // Replacing table by manifest json.
		this.cacheKey = null; // Cache key.
	}

	// Get file from cache or fetch.
	cacheOrFetch(url, cacheKey) {
		return new Promise((resolve) => {

			// Get cached file.
			console.log("Get cached file: " + url + " from " + cacheKey);
			self.caches.open(cacheKey).then((cache) => {
				cache.match(url, {ignoreSearch: true}).then((res) => {
					console.log("Found cached file. -> " + res.statusText);
					resolve(res);
				}).catch((error) => {

					// Not found cached file.
					console.log("Not found cached file: " + url);
					this.fetchAndCache(url, cacheKey).then((res) => {
						resolve(res);
					});
				})
			});
		});
	}

	// Delete old cache files when the cache version updated.
	deleteOldCache(cacheKey) {
		return self.caches.keys().then((keys) => {
			return Promise.all(keys.map((key) => {
				if (key != cacheKey && key != "*") {
					console.log("Delete old cache: " + key);
					return self.caches.delete(key);
				}
			}));
		});
	}

	// Fetch and cache.
	fetchAndCache(url, cacheKey) {

		// Cache the fetched file.
		console.log("Fetch and cache: " + url);
		return fetch(url).then((res) => {
			if (res.ok) {
				let contentType = res.headers.get("Content-Type");
				if (!contentType.match("text/html")) {

					if (cacheKey) {
						console.log("Cache the fetched file: " + url + " to " + cacheKey + " -> " + res.statusText);
						self.caches.open(cacheKey).then((cache) => {
							cache.put(url, res.clone());
						});
					}

					// Returns fetched response.
					console.log("Returns fetched response. -> " + res.statusText);
					return res.clone();

				// Replace fetched html file.
				} else {
					return new Promise((resolve) => {
						res.text().then((text) => {
							console.log("Fetched file: " + text.replace(/\s+/g, " ").substr(-1000));

							// Replace strings by manifest.
							for (let key in this.replacing) {
								console.log("Replacing: " + key + " -> " + this.replacing[key]);
								let reg = new RegExp("(<.*class=\"" + key + "\".*>).*(<\/.*>)");
								text = text.replace(reg, "$1" + this.replacing[key] + "$2");
							}
							console.log("Replaced file: " + text.replace(/\s+/g, " ").substr(-1000));

							// Replaced responce.
							let options = {status: res.status,
								 statusText: res.statusText,
								 headers: res.headers};
							res = new Response(text, options);

							// Cache the replaced file.
							if (cacheKey) {
								console.log("Cache the replaced file: " + url + " to " + cacheKey + " -> " + res.statusText + " : " + text.replace(/\s+/g, " ").substr(-1000));
								self.caches.open(cacheKey).then((cache) => {
									cache.put(url, res.clone());
								});
							}

							// Resolves by replaced response.
							console.log("Resolves by replaced response. -> " + res.statusText);
							resolve(res.clone());
						});
					});
				}

			// File not found.
			} else {
				console.log("File not found: " + url + " -> " + res.statusText);
				return res;
			}
		});
	}

	// Get manifest file from cache or fetch to start.
	start() {
		console.log("Start worker.");
		return new Promise((resolve) => {

			// Get cache or fetch manifest file.
			console.log("Get cache or fetch: " + this.manifest);
			this.cacheOrFetch(this.manifest, "*").then((res) => {
				if (res.ok) {
					res.json().then((manifest) => {
						console.log("Found manifest: " + JSON.stringify(manifest));
						this.replacing = {};
						if (manifest.version) {
							this.replacing.version = "#" + manifest.version.substr(-4);
						}
						if (manifest.author && manifest.name) {
							this.replacing.author = manifest.author + "/" + manifest.name;
						}
						if (manifest.short_name) {
							this.replacing.title = manifest.short_name;
						}
						console.log("Replacing table: " + JSON.stringify(this.replacing));
						this.cacheKey = manifest.name + "/" + manifest.version;
						resolve(manifest);
					}).catch((error) => {
						console.log(error.message);
					});
				}
			});
		});
	}

	// Prefetch all content files to renew.
	renew() {
		console.log("Renew worker.");
		return new Promise((resolve) => {

			// Fetch manifest file.
			let url = this.manifest;
			console.log("Fetch new manifest: " + url);
			return fetch(url).then((res) => {
				if (res.ok) {
					res.json().then((manifest) => {
						console.log("Fetched new manifest: " + JSON.stringify(manifest));
						let cacheKey = manifest.name + "/" + manifest.version;

						// Prefetch all content files.
						console.log("Prefetch content files.");
						Promise.all(manifest.contents.map((content) => {
							return this.fetchAndCache(content, cacheKey);
						})).then(() => {

							console.log("Cache new manifest: " + url);
							self.caches.open("*").then((cache) => {
								cache.put(url, new Response(manifest));
							});

							resolve();
						});
					});
				}
			});
		});
	}
};
var worker = new Worker();

// Script for client to register worker.
if (!self || !self.registration) {
	try {

		// Register worker.
		if (worker.background) {
			if (navigator.serviceWorker) {
				console.log("Register worker: " + worker.background);
				(async()=>{
					await navigator.serviceWorker.register(worker.background);
				})();
			}
		}

		// Wake lock.
		window.addEventListener('click', async () => {
			if (navigator.wakeLock) {
				console.log("Request wake lock.");
				await navigator.wakeLock.request("screen");
			}
		});

	} catch (error) {
		console.error(error.name, error.message);
	}

// Script for worker.
} else {

	// Event on installing worker.
	self.addEventListener("install", (evt) => {
		console.log("Install worker: " + worker.background);

		// Read manifest file.
		evt.waitUntil(worker.start());

		// Delete old cache files when the cache version updated.
		evt.waitUntil(worker.deleteOldCache(worker.cacheKey));

		// Update manifest file for next install.
		evt.waitUntil(worker.renew());
	});

	// Event on activating worker.
	self.addEventListener("activate", (evt) => {
		console.log("Activate worker: " + worker.background);
	});

	// Event on fetching network request.
	self.addEventListener("fetch", (evt) => {
		console.log("Fetch by worker: " + evt.request.url);

		// Read manifest file.
		evt.waitUntil(worker.start());

		// Get cache or fetch and return response.
		evt.respondWith(worker.cacheOrFetch(evt.request.url, worker.cacheKey));
	});
}
