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
			if (cacheKey) {

				// Get cached file.
				console.log("Get cached file: " + url + " from " + cacheKey);
				self.caches.open(cacheKey).then((cache) => {
					cache.match(url, {ignoreSearch: true}).then((res) => {

						// Resolves by cached response.
						console.log("Resolves by cached response: " + url + " -> " + res.statusText);
						resolve(res);
					}).catch((error) => {

						// Not found cached file.
						console.log("Not found cached file: " + url);
						this.fetchAndCache(url, cacheKey).then((res) => {

							// Resolves by fetched response.
							console.log("Resolves by fetched response: " + url + " -> " + res.statusText);
							resolve(res);
						});
					})

				// Failed to open cache.
				}).catch((error) => {
					console.log(error.message);
				});

			} else {

				// No cache.
				console.log("No cache: " + url);
				fetch(url).then((res) => {

					// Resolves by fetched response.
					console.log("Resolves by fetched response: " + url + " -> " + res.statusText);
					resolve(res);

				// Failed to fetch file.
				}).catch((error) => {
					console.log(error.message);
				});
			}
		}); // end of new Promise.
	}

	// Fetch and cache.
	fetchAndCache(url, cacheKey) {
		return fetch(url).then((res) => {
			if (res.ok) {

				// Cache the fetched file.
				console.log("Fetched file: " + url + " -> " + res.statusText);
				let contentType = res.headers.get("Content-Type");
				if (!contentType.match("text/html")) {

					if (cacheKey) {
						console.log("Cache the fetched file: " + url + " to " + cacheKey + " -> " + res.statusText);
						self.caches.open(cacheKey).then((cache) => {
							cache.put(url, res.clone());

						// Failed to open cache.
						}).catch((error) => {
							console.log(error.message);
						});
					}

					// Returns fetched response.
					console.log("Returns fetched response. -> " + res.statusText);
					return res.clone();

				// Replace fetched html file.
				} else {
					return new Promise((resolve) => {
						res.text().then((text) => {
							console.log("Fetched html file: " + text.replace(/\s+/g, " ").substr(-1000));

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
								console.log("Cache the replaced file: " + url + " to " + cacheKey + " -> " + res.statusText);
								self.caches.open(cacheKey).then((cache) => {
									cache.put(url, res.clone());

								// Failed to open cache.
								}).catch((error) => {
									console.log(error.message);
								});
							}

							// Resolves by replaced response.
							console.log("Resolves by replaced response: " + url + " -> " + res.statusText);
							resolve(res.clone());

						// File is not text.
						}).catch((error) => {
							console.log(error.message);
						});
					}); // end of new Promise.
				}

			// File not found.
			} else {
				console.log("Returns error: File not found: " + url + " -> " + res.statusText);
				return res;
			}

		// Failed to fetch file.
		}).catch((error) => {
			console.log(error.message);
		});
	}

	// Prefetch all content files to renew.
	renew() {
		return new Promise((resolve) => {
			console.log("Renew worker.");

			// Fetch new manifest file.
			let url = this.manifest;
			console.log("Fetch new manifest: " + url);
			return fetch(url, {cache: "no-store"}).then((res) => {
				if (!res.ok) {
					console.log("File not found: " + url + " -> " + res.statusText);
					resolve(res.clone());
					return;
				}
				let contentType = res.headers.get("Content-Type");
				if (!contentType.match("application/json")) {
					console.log("File is not json: " + url + " -> " + res.statusText);
					resolve(res.clone());
					return;
				}

				// Parse manifest json.
				res.clone().json().then((manifest) => {
					console.log("Fetched new manifest: " + JSON.stringify(manifest));
					let cacheKey = manifest.name + "/" + manifest.version;

					// Not found new version.
					if (cacheKey == this.cacheKey) {
						console.log("Not found new version: " + cacheKey);
						resolve(res.clone());

					// Found new version.
					} else {
						console.log("Found new version: " + cacheKey + " old: " + this.cacheKey);

						// Prefetch all content files.
						console.log("Prefetch all content files.");
						Promise.all(manifest.contents.map((content) => {
							return this.fetchAndCache(content, cacheKey);
						})).then(() => {

							// Cache new manifest.
							console.log("Cache new manifest: " + url + " to * -> " + res.statusText);
							self.caches.open("*").then((cache) => {
								cache.put(url, res.clone());
							});

							// Returns fetched response.
							console.log("Resolves by fetched response: " + url + " -> " + res.statusText);
							resolve(res.clone());
						});
					}

				});
			}).catch((error) => {
				console.log(error.message);
			});
		}); // end of new Promise.
	}

	// Get manifest file from cache to start worker.
	start() {
		if (this.cacheKey) {
			console.log("Worker already installed.");
			return Promise.resolve();
		}
		return new Promise((resolve) => {
			console.log("Start worker.");

			// Get cached manifest file.
			let url = this.manifest, cacheKey = "*";
			console.log("Get cached manifest file: " + url + " from " + cacheKey);
			self.caches.open(cacheKey).then((cache) => {
				cache.match(url, {ignoreSearch: true}).then((res) => {
					if (!res.ok) {
						console.log("File not found: " + url + " -> " + res.statusText);
						return;
					}
					let contentType = res.headers.get("Content-Type");
					if (!contentType.match("application/json")) {
						console.log("File is not json: " + url + " -> " + res.statusText);
						return;
					}

					// Parse manifest json.
					res.json().then((manifest) => {
						console.log("Found manifest: " + JSON.stringify(manifest));

						// Set version and cache key.
						this.cacheKey = manifest.name + "/" + manifest.version;
						console.log("Set version: " + this.cacheKey);

						// Set replacing table.
						this.replacing = {};
						if (manifest.version) {
							if (manifest.name) {
								this.replacing.version = manifest.name + "#" + manifest.version.substr(-4);
							} else {
								this.replacing.version = "#" + manifest.version.substr(-4);
							}
						}
						if (manifest.author) {
							this.replacing.author = manifest.author;
						}
						if (manifest.short_name) {
							this.replacing.title = manifest.short_name;
						}
						console.log("Created replacing table: " + JSON.stringify(this.replacing));

						// Resolves.
						console.log("Resolves: Install worker completed.");
						resolve();
					});
				});
			}).catch((error) => {
				console.log(error.message);
			});
		}); // end of new Promise.
	}
	
	// Get manifest file from cache or fetch on installing worker.
	install() {
		return new Promise((resolve) => {

			// Read manifest file to use cache.
			this.start().then((res) => {
				resolve(res);
			}).catch((error) => {
				console.log("Install worker.");

				// Refetch manifest file.
				let url = this.manifest, cacheKey = "*";
				console.log("Refetch manifest file: " + url);
				return this.fetchAndCache(content, cacheKey).then((res) => {
					resolve(this.start());
				});
			}).catch((error) => {
				console.log(error.message);
			});
		}); // end of new Promise.
	}

	// Delete old cache files when the cache version updated on activating worker.
	activate() {
		return new Promise((resolve) => {

			// Read manifest file to use cache.
			this.start().then(() => {

				// Delete all cache files.
				console.log("Delete all cache files: " + this.cacheKey);
				self.caches.keys().then((keys) => {
					Promise.all(keys.map((key) => {
						if (key != this.cacheKey && key != "*") {
							console.log("Delete old cache: " + key);
							return self.caches.delete(key);
						}
					})).then(() => { // end of Promise.all.

						// Resolves.
						console.log("Resolves: Delete all cache files completed.");
						resolve();
					});
				});
			}).catch((error) => {
				console.log(error.message);
			});
		}); // end of new Promise.
	}

	// Get cache or fetch files called by app.
	fetch(url) {
		return new Promise((resolve) => {

			// Read manifest file to use cache.
			this.start().then(() => {

				// Get cache or fetch and return response.
				console.log("Get cache or fetch");
				this.cacheOrFetch(url, this.cacheKey).then((res) => {

					// Resolves.
					console.log("Resolves: Fetch by worker completed: " + url + " -> " + res.statusText);
					resolve(res);

					// Prefetch all content files on background for next install.
					this.renew();
				});
			}).catch((error) => {
				console.log(error.message);
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
			}
		}

	} catch (error) {
		console.error(error.name, error.message);
	}

// Script for worker.
} else {

	// Event on installing worker.
	self.addEventListener("install", (evt) => {
		console.log("Install worker: " + worker.background);
		evt.waitUntil(worker.install().then(() => {
			console.log("Installed worker.");
		}));
		console.log("Installing worker.");
	});

	// Event on activating worker.
	self.addEventListener("activate", (evt) => {
		console.log("Activate worker: " + worker.background);
		evt.waitUntil(worker.activate().then(() => {
			console.log("Activated worker.");
		}));
		console.log("Activating worker.");
	});

	// Event on fetching network request.
	self.addEventListener("fetch", (evt) => {
		console.log("Fetch by worker: " + evt.request.url);
		evt.respondWith(worker.fetch(evt.request.url).then((res) => {
			console.log("Fetched by worker.");
			return res;
		}));
		console.log("Fetching by worker.");
	});
}
