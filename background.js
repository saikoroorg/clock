// Service worker.
Worker = class {
	constructor() {
		this.background = "./background.js"; // This script file.
		this.manifest = "./manifest.json"; // Manifest file.
		this.replacing = {}; // Replacing table by manifest json.
		this.cacheKey = null; // Cache key.
		this.cacheName = null; // Cache key without version.
	}

	// Get file from cache or fetch.
	_cacheOrFetch(url, cacheKey=null, replacing=null) {
		return new Promise((resolve, reject) => {
			if (cacheKey) {

				// Get cached file.
				console.log("Get cached file: " + url + " from " + cacheKey);
				self.caches.open(cacheKey).then((cache) => {
					cache.match(url, {ignoreSearch: true}).then((result) => {

						// Resolves by cached response.
						console.log("Resolves by cached response: " + url + " -> " + result.status + " " + result.statusText);
						resolve(result);
					}).catch((error) => {

						// Not found cached file.
						console.log("Not found cached file: " + url);
						this._fetchAndCache(url, cacheKey, replacing).then((result) => {

							// Resolves by fetched response.
							console.log("Resolves by fetched response: " + url + " -> " + result.status + " " + result.statusText);
							resolve(result);
						});
					});
				});

			} else {

				// No cache.
				console.log("No cache: " + url);
				fetch(url).then((result) => {

					// Resolves by fetched response.
					console.log("Resolves by fetched response: " + url + " -> " + result.status + " " + result.statusText);
					resolve(result);
				});
			}
		}); // end of new Promise.
	}

	// Fetch and cache.
	_fetchAndCache(url, cacheKey, replacing) {
		return fetch(url, {cache: "no-store"}).then((result) => {

			// Cache the fetched file.
			console.log("Fetched file: " + url + " -> " + result.status + " " + result.statusText);
			let contentType = result.headers.get("Content-Type");
			if (!contentType.match("text/html")) {
				if (cacheKey) {
					console.log("Cache the fetched file: " + url + " to " + cacheKey + " -> " + result.status + " " + result.statusText);
					self.caches.open(cacheKey).then((cache) => {
						cache.put(url, result.clone());
					});
				}

				// Returns fetched response.
				console.log("Returns fetched response. -> " + result.status + " " + result.statusText);
				return result.clone();

			// Replace fetched html file.
			} else {
				return new Promise((resolve, reject) => {
					result.text().then((text) => {
						console.log("Fetched html file: " + text.replace(/\s+/g, " ").substr(-1000));

						// Replace strings by manifest.
						for (let key in replacing) {
							console.log("Replacing: " + key + " -> " + replacing[key]);
							let reg = new RegExp("(<.*class=\"" + key + "\".*>).*(<\/.*>)");
							text = text.replace(reg, "$1" + replacing[key] + "$2");
						}
						console.log("Replaced file: " + text.replace(/\s+/g, " ").substr(-1000));

						// Replaced responce.
						let options = {status: result.status,
							 statusText: result.statusText,
							 headers: result.headers};
						result = new Response(text, options);

						// Cache the replaced file.
						if (cacheKey) {
							console.log("Cache the replaced file: " + url + " to " + cacheKey + " -> " + result.status + " " + result.statusText);
							self.caches.open(cacheKey).then((cache) => {
								cache.put(url, result.clone());
							});
						}

						// Resolves by replaced response.
						console.log("Resolves by replaced response: " + url + " -> " + result.status + " " + result.statusText);
						resolve(result.clone());
					});
				}); // end of new Promise.
			}
		});
	}

	// Prefetch all content files to renew.
	_renew() {
		return new Promise((resolve, reject) => {
			console.log("Renew worker.");

			// Fetch new manifest file.
			let url = this.manifest;
			console.log("Fetch new manifest: " + url);
			return fetch(url, {cache: "no-store"}).then((result) => {

				// Check countent type.
				let contentType = result.headers.get("Content-Type");
				if (!contentType.match("application/json")) {
					console.log("Failed to parse manifest file.");
					reject();
				}

				// Parse manifest json.
				result.clone().json().then((manifest) => {
					console.log("Parsed new manifest json: " + JSON.stringify(manifest));
					let cacheKey = manifest.name + "/" + manifest.version;
					let replacing = this._replacing(manifest);

					// Not found new version.
					if (cacheKey == this.cacheKey) {
						console.log("Not found new version: " + cacheKey);
						resolve(result.clone());

					// Found new version.
					} else {
						console.log("Found new version: " + cacheKey + " old: " + this.cacheKey);

						// Prefetch and cache all content files.
						console.log("Prefetch all content files.");
						Promise.all(manifest.contents.map((content) => {
							return this._fetchAndCache(content, cacheKey, replacing);
						})).then(() => { // end of Promise.all.

							// Cache new manifest.
							cacheKey = "*";
							console.log("Cache new manifest: " + url + " to " + cacheKey + " -> " + result.status + " " + result.statusText);
							self.caches.open(cacheKey).then((cache) => {
								cache.put(url, result.clone());

								// Resolves.
								console.log("Renew worker completed.");
								resolve(result.clone());
							});
						});
					}
				});
			}).catch((error) => {
				console.log("Failed to parse manifest file.");
				console.error(error.name, error.message);
				reject();
			});
		}); // end of new Promise.
	}

	// Check installed worker.
	_check() {
		return new Promise((resolve, reject) => {
			console.log("Check installed worker.");

			// Get cached manifest file.
			let url = this.manifest, cacheKey = "*";
			console.log("Get cached manifest file: " + url + " from " + cacheKey);
			self.caches.open(cacheKey).then((cache) => {
				cache.match(url, {ignoreSearch: true}).then((result) => {
					console.log("Found manifest file: " + url + " from " + cacheKey);

					// Check result.
					if (!result) {
						console.log("Failed to get manifest file.");
						reject();
					}

					// Check countent type.
					let contentType = result.headers.get("Content-Type");
					if (!contentType.match("application/json")) {
						console.log("Failed to parse manifest file.");
						reject();
					}

					// Parse manifest json.
					result.clone().json().then((manifest) => {
						console.log("Parsed manifest json: " + JSON.stringify(manifest));

						// Resolves.
						console.log("Check worker completed.");
						resolve(result.clone());
					});
				}).catch((error) => {
					console.log("Failed to parse manifest file.");
					console.error(error.name, error.message);
					reject();
				});
			});
		}); // end of new Promise.
	}

	// Replacing table.
	_replacing(manifest) {
		let replacing = {};
		if (manifest.version) {
			if (manifest.name) {
				replacing.version = manifest.name + "#" + manifest.version.substr(-4);
			} else {
				replacing.version = "#" + manifest.version.substr(-4);
			}
		}
		if (manifest.author) {
			replacing.author = manifest.author;
		}
		if (manifest.short_name) {
			replacing.title = manifest.short_name;
		}
		console.log("Created replacing table: " + JSON.stringify(replacing));
		return replacing;
	}

	// Set manifest file to start worker.
	_start(result) {
		if (this.cacheKey) {
			console.log("Worker already started.");
			return Promise.resolve();
		}
		return new Promise((resolve, reject) => {
			console.log("Start worker.");

			// Get cached manifest file.
			let url = this.manifest, cacheKey = "*";
			console.log("Get cached manifest file: " + url + " from " + cacheKey);
			self.caches.open(cacheKey).then((cache) => {
				cache.match(url, {ignoreSearch: true}).then((result) => {
					console.log("Found manifest file: " + url + " from " + cacheKey);

					// Check result.
					if (!result) {
						console.log("Failed to get manifest file.");
						reject();
					}

					// Check countent type.
					let contentType = result.headers.get("Content-Type");
					if (!contentType.match("application/json")) {
						console.log("Failed to parse manifest file.");
						reject();
					}

					// Parse manifest json.
					result.clone().json().then((manifest) => {
						console.log("Parsed manifest json: " + JSON.stringify(manifest));

						// Set version and cache key.
						this.cacheKey = manifest.name + "/" + manifest.version;
						this.cacheName = manifest.name;
						console.log("Set version: " + this.cacheKey);

						// Set replacing table.
						this.replacing = this._replacing(manifest);

						// Resolves.
						console.log("Start worker completed.");
						resolve(result.clone());
					});
				}).catch((error) => {
					console.log("Failed to parse manifest file.");
					console.error(error.name, error.message);
					reject();
				});
			});
		}); // end of new Promise.
	}
	
	// Get manifest file from cache or fetch on installing worker.
	install() {
		return new Promise((resolve) => {

			// Check manifest file to use cache.
			this._check().then((result) => {
				console.log("Worker already installed.");
				resolve(result);
			}).catch((error) => {
				console.log("Reinstall worker.");

				// Refetch manifest file.
				let url = this.manifest, cacheKey = "*", replacing = null;
				console.log("Refetch manifest file: " + url);
				this._fetchAndCache(url, cacheKey, replacing).then((result) => {

					// Resolves.
					console.log("Install worker completed.");
					resolve(result);

					// Prefetch all content files on background for this install.
					this._renew();
				}).catch((error) => {

					// Failed but resolves to continue worker.
					console.log("Failed to install worker.");
					resolve();
				});
			});
		}); // end of new Promise.
	}

	// Delete old cache files when the cache version updated on activating worker.
	activate() {
		return new Promise((resolve) => {

			// Read manifest file to use cache.
			this._start().then(() => {

				// Check cache name.
				if (!this.cacheName) {
					console.log("Failed to get manifest file.");
					reject();
				}

				// Delete all cache files.
				console.log("Delete all cache files: " + this.cacheName);
				self.caches.keys().then((keys) => {
					Promise.all(keys.map((key) => {
						if (!key.indexOf(this.cacheName) && key != this.cacheKey) {
							console.log("Delete old cache: " + key);
							return self.caches.delete(key);
						}
					})).then(() => { // end of Promise.all.

						// Resolves.
						console.log("Delete all cache files completed.");
						resolve();
					});
				});
			}).catch((error) => {

				// Failed but resolves to continue worker.
				console.log("Failed to activate worker.");
				resolve();
			});
		}); // end of new Promise.
	}

	// Get cache or fetch files called by app.
	fetch(url) {
		return new Promise((resolve) => {

			// Not activated.
			if (!this.cacheKey) {
				console.log("Not activated.");
				resolve(fetch(url)); // Simple fetch.

				// Reinstall and reactivate for next fetch.
				this.install().then(() => {
					this.activate();
				});
			}

			// Get cache or fetch and return response.
			console.log("Get cache or fetch");
			this._cacheOrFetch(url, this.cacheKey).then((result) => {

				// Resolves.
				console.log("Fetch by worker completed: " + url + " -> " + result.status + " " + result.statusText);
				resolve(result);

				// Prefetch all content files on background for next install.
				this._renew();
			}).catch((error) => {

				// Failed but resolves to continue worker.
				console.log("Failed to fetch by worker.");
				resolve(fetch(url)); // Simple fetch.
			});
		}); // end of new Promise.
	}
};

// Create worker.
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
			} else {
				console.log("No worker.");
			}
		}

		// Wake lock.
		// Not work on iOS 16 PWA.
		// https://bugs.webkit.org/show_bug.cgi?id=254545
		if (navigator.wakeLock) {
			console.log("Request wake lock.");
			navigator.wakeLock.request("screen");
		} else {
			console.log("No wake lock.");
		}

	} catch (error) {
		console.error(error.name, error.message);
	}

// Script for worker.
} else {

	// Event on installing worker.
	self.addEventListener("install", (event) => {
		console.log("Install worker: " + worker.background);
		event.waitUntil(worker.install());
	});

	// Event on activating worker.
	self.addEventListener("activate", (event) => {
		console.log("Activate worker: " + worker.background);
		event.waitUntil(worker.activate());
	});

	// Event on fetching network request.
	self.addEventListener("fetch", (event) => {
		console.log("Fetch by worker: " + event.request.url);
		event.respondWith(worker.fetch(event.request.url));
	});
}
