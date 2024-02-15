/* PICO Daemon module */

//************************************************************/

// Namespace.
var pico = pico || {};

// Worker class.
pico.Worker = class {
	static debug = true; // Debug print.
	static script = "./index.js"; // This script file.
	static manifest = "./app.json"; // Manifest file.

	//*----------------------------------------------------------*/

	// constructor.
	constructor() {
		this.replacing = {}; // Replacing table by manifest json.
		this.cacheKey = null; // Cache key.
		this.cacheName = null; // Cache key without version.

		// Script for worker.
		if (self && self.registration) {
			self.addEventListener("install", (event) => {
				this.onInstall(event);
			}); // Install.
			self.addEventListener("activate", (event) => {
				this.onActivate(event);
			}); // Activate.
			self.addEventListener("fetch", (event) => {
				this.onFetch(event);
			}); // Fetch.

		// Script for client to register worker.
		} else {
			window.addEventListener("load", async () => {
				await this.onLoad()
			}); // Load.
		}
	}

	// On installing worker event.
	onInstall(event) {
		this._debug("Install worker: " + pico.Worker.script);
		event.waitUntil(this.install());
	}

	// On activating worker event.
	onActivate(event) {
		this._debug("Activate worker: " + pico.Worker.script);
		event.waitUntil(this.activate());
	}

	// On fetching network request event.
	onFetch(event) {
		this._debug("Fetch by worker: " + event.request.url);
		event.respondWith(this.fetch(event.request.url));
	}

	// On load event.
	async onLoad() {
		try {

			// Register worker.
			if (pico.Worker.script) {
				if (navigator.serviceWorker) {
					console.log("Register worker: " + pico.Worker.script);
					await navigator.serviceWorker.register(pico.Worker.script);
				} else {
					console.log("No worker.");
				}
			}
		} catch (error) {
			console.error(error.name, error.message);
		}
	}

	// Debug print.
	_debug(text) {
		if (pico.Worker.debug) {
			console.log(text);
		}
	}

	// Get file from cache or fetch.
	_cacheOrFetch(url, cacheKey, replacing) {
		return new Promise((resolve, reject) => {
			if (cacheKey) {

				// Get cached file.
				this._debug("Get cached file: " + url + " from " + cacheKey);
				self.caches.open(cacheKey).then((cache) => {
					cache.match(url, {ignoreSearch: true}).then((result) => {

						// Resolves by cached response.
						this._debug("Resolves by cached response: " + url + " -> " + result.status + " " + result.statusText);
						resolve(result);
					}).catch((error) => {

						// Not found cached file.
						this._debug("Not found cached file: " + url);
						this._fetchAndCache(url, cacheKey, replacing).then((result) => {

							// Resolves by fetched response.
							this._debug("Resolves by fetched response: " + url + " -> " + result.status + " " + result.statusText);
							resolve(result);
						});
					});
				});

			} else {

				// No cache.
				this._debug("No cache: " + url);
				fetch(url).then((result) => {

					// Resolves by fetched response.
					this._debug("Resolves by fetched response: " + url + " -> " + result.status + " " + result.statusText);
					resolve(result);
				});
			}
		}); // end of new Promise.
	}

	// Fetch and cache.
	_fetchAndCache(url, cacheKey, replacing) {
		return fetch(url, {cache: "no-store"}).then((result) => {

			// Cache the fetched file.
			this._debug("Fetched file: " + url + " -> " + result.status + " " + result.statusText);
			let contentType = result.headers.get("Content-Type");
			if (!contentType.match("text/html")) {
				if (cacheKey) {
					this._debug("Cache the fetched file: " + url + " to " + cacheKey + " -> " + result.status + " " + result.statusText);
					self.caches.open(cacheKey).then((cache) => {
						cache.put(url, result.clone());
					});
				}

				// Returns fetched response.
				this._debug("Returns fetched response. -> " + result.status + " " + result.statusText);
				return result.clone();

			// Replace fetched html file.
			} else {
				return new Promise((resolve, reject) => {
					result.text().then((text) => {
						this._debug("Fetched html file: " + text.replace(/\s+/g, " ").substr(-1000));

						// Replace strings by manifest.
						for (let key in replacing) {
							this._debug("Replacing: " + key + " -> " + replacing[key]);
							let reg1 = new RegExp("(<.*id=\"" + key + "\".*>).*(<\/.*>)");
							text = text.replace(reg1, "$1" + replacing[key] + "$2");
							let reg2 = new RegExp("(<" + key + ".*>).*(<\/" + key + ".*>)");
							text = text.replace(reg2, "$1" + replacing[key] + "$2");
						}
						let reg0 = new RegExp("\/index.html");
						text = text.replace(reg0, "\/");
						this._debug("Replaced file: " + text.replace(/\s+/g, " ").substr(-1000));

						// Replaced responce.
						let options = {status: result.status,
							 statusText: result.statusText,
							 headers: result.headers};
						result = new Response(text, options);

						// Cache the replaced file.
						if (cacheKey) {
							this._debug("Cache the replaced file: " + url + " to " + cacheKey + " -> " + result.status + " " + result.statusText);
							self.caches.open(cacheKey).then((cache) => {
								cache.put(url, result.clone());
							});
						}

						// Resolves by replaced response.
						this._debug("Resolves by replaced response: " + url + " -> " + result.status + " " + result.statusText);
						resolve(result.clone());
					});
				}); // end of new Promise.
			}
		});
	}

	// Prefetch all content files to renew.
	_renew() {
		return new Promise((resolve, reject) => {
			this._debug("Renew worker.");

			// Fetch new manifest file.
			let url = pico.Worker.manifest;
			this._debug("Fetch new manifest: " + url);
			return fetch(url, {cache: "no-store"}).then((result) => {

				// Check countent type.
				let contentType = result.headers.get("Content-Type");
				if (!contentType.match("application/json")) {
					this._debug("Failed to parse manifest file.");
					reject();
					return;
				}

				// Parse manifest json.
				result.clone().json().then((manifest) => {
					this._debug("Parsed new manifest json: " + JSON.stringify(manifest));
					let cacheKey = manifest.name + "/" + manifest.version;
					let replacing = this._replacing(manifest);

					// Not found new version.
					if (cacheKey == this.cacheKey) {
						this._debug("Not found new version: " + cacheKey);
						resolve(result.clone());

					// Found new version.
					} else {
						this._debug("Found new version: " + cacheKey + " old: " + this.cacheKey);

						// Prefetch and cache all content files.
						this._debug("Prefetch all content files.");
						Promise.all(manifest.contents.map((content) => {
							return this._fetchAndCache(content, cacheKey, replacing);
						})).then(() => { // end of Promise.all.

							// Cache new manifest.
							cacheKey = "*";
							this._debug("Cache new manifest: " + url + " to " + cacheKey + " -> " + result.status + " " + result.statusText);
							self.caches.open(cacheKey).then((cache) => {
								cache.put(url, result.clone());

								// Resolves.
								this._debug("Renew worker completed.");
								resolve(result.clone());
							});
						});
					}
				});
			}).catch((error) => {
				this._debug("Failed to parse manifest file.");
				console.error(error.name, error.message);
				reject();
			});
		}); // end of new Promise.
	}

	// Check new manifest file.
	_check() {
		return new Promise((resolve, reject) => {
			this._debug("Check new maniefst file.");

			// Fetch new manifest file.
			let url = pico.Worker.manifest;
			this._debug("Fetch new manifest: " + url);
			return fetch(url, {cache: "no-store"}).then((result) => {

				// Check countent type.
				let contentType = result.headers.get("Content-Type");
				if (!contentType.match("application/json")) {
					this._debug("Failed to parse manifest file.");
					reject();
					return;
				}

				// Parse manifest json.
				result.clone().json().then((manifest) => {
					this._debug("Parsed new manifest json: " + JSON.stringify(manifest));
					let cacheKey = manifest.name + "/" + manifest.version;
					let replacing = this._replacing(manifest);

					// Not found new version.
					if (cacheKey == this.cacheKey) {
						this._debug("Not found new version: " + cacheKey);
						resolve(result.clone());

					// Found new version.
					} else {
						this._debug("Found new version: " + cacheKey + " old: " + this.cacheKey);
						reject();
					}
				});
			}).catch((error) => {
				this._debug("Failed to fetch manifest file.");
				console.error(error.name, error.message);
				reject();
			});
		}); // end of new Promise.
	}

	// Replacing table.
	_replacing(manifest) {
		let replacing = {};
		if (manifest.version) {
			replacing.version = manifest.version.substr(-4);
		}
		if (manifest.author) {
			replacing.author = manifest.author;
		}
		this._debug("Created replacing table: " + JSON.stringify(replacing));
		return replacing;
	}

	// Set manifest file to start worker.
	_start(result) {
		if (this.cacheKey) {
			this._debug("Worker already started.");
			return Promise.resolve();
		}
		return new Promise((resolve, reject) => {
			this._debug("Start worker.");

			// Get cached manifest file.
			let url = pico.Worker.manifest, cacheKey = "*";
			this._debug("Get cached manifest file: " + url + " from " + cacheKey);
			self.caches.open(cacheKey).then((cache) => {
				cache.match(url, {ignoreSearch: true}).then((result) => {
					this._debug("Found manifest file: " + url + " from " + cacheKey);

					// Check result.
					if (!result) {
						this._debug("Failed to get manifest file.");
						reject();
						return;
					}

					// Check countent type.
					let contentType = result.headers.get("Content-Type");
					if (!contentType.match("application/json")) {
						this._debug("Failed to parse manifest file.");
						reject();
						return;
					}

					// Parse manifest json.
					result.clone().json().then((manifest) => {
						this._debug("Parsed manifest json: " + JSON.stringify(manifest));

						// Set version and cache key.
						this.cacheKey = manifest.name + "/" + manifest.version;
						this.cacheName = manifest.name;
						this._debug("Set version: " + this.cacheKey);

						// Set replacing table.
						this.replacing = this._replacing(manifest);

						// Resolves.
						this._debug("Start worker completed.");
						resolve(result.clone());
					});
				}).catch((error) => {
					this._debug("Failed to parse manifest file.");
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
				this._debug("Worker already installed.");
				resolve(result);
			}).catch((error) => {
				this._debug("Reinstall worker.");

				// Refetch manifest file.
				let url = pico.Worker.manifest, cacheKey = "*", replacing = null;
				this._debug("Refetch manifest file: " + url);
				this._fetchAndCache(url, cacheKey, replacing).then((result) => {

					// Resolves.
					this._debug("Install worker completed.");
					resolve(result);

					// Prefetch all content files on background for this install.
					this._renew();
				}).catch((error) => {

					// Failed but resolves to continue worker.
					this._debug("Failed to install worker.");
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
					this._debug("Failed to get manifest file.");
					reject();
					return;
				}

				// Delete all cache files.
				this._debug("Delete all cache files: " + this.cacheName);
				self.caches.keys().then((keys) => {
					Promise.all(keys.map((key) => {
						if (!key.indexOf(this.cacheName) && key != this.cacheKey) {
							this._debug("Delete old cache: " + key);
							return self.caches.delete(key);
						}
					})).then(() => { // end of Promise.all.

						// Resolves.
						this._debug("Delete all cache files completed.");
						resolve();
					});
				});
			}).catch((error) => {

				// Failed but resolves to continue worker.
				this._debug("Failed to activate worker.");
				resolve();
			});
		}); // end of new Promise.
	}

	// Get cache or fetch files called by app.
	fetch(url) {
		return new Promise((resolve) => {

			// Read manifest file to use cache.
			this._start().then(() => {

				// Get cache or fetch and return response.
				this._debug("Get cache or fetch");
				this._cacheOrFetch(url, this.cacheKey, this.replacing).then((result) => {

					// Resolves.
					this._debug("Fetch by worker completed: " + url + " -> " + result.status + " " + result.statusText);
					resolve(result);

					// Prefetch all content files on background for next install.
					this._renew();
				}).catch((error) => {

					// Failed but resolves to continue worker.
					this._debug("Failed to fetch by worker.");
					resolve(fetch(url)); // Simple fetch.
				});
			});
		}); // end of new Promise.
	}
};

// Master worker.
pico.worker = new pico.Worker();
