// Web app manifest for progressive web app.
const manifest = {
	"name": "clock",
	"short_name": "Clock",
	"version": "0.8.30827",
	"author": "saikoro.org",
	"background_color": "#ccc",
	"theme_color": "#ccc",
	"icons": [{
		"src": "./icon.svg",
		"sizes": "300x300",
		"type": "image/svg"
	},{
		"src": "./icon.png",
		"sizes": "192x192",
		"type": "image/png"
	}],
	"start_url": "./?app=1",
	"display": "standalone",
	"service": "./manifest.js",
	"scope": "/clock/",
	"contents": ["./"],
	"json": "manifest.json"
};

// Script for client to register service worker.
if (!self || !self.registration) {

	// Register service worker.
	if (manifest.service) {
		console.log("ServiceWorker:" + manifest.service);
		(async()=>{
			if (navigator.serviceWorker) {
				await navigator.serviceWorker.register(manifest.service, {"scope": manifest.scope});
			}
		})();
	}

	// Set manifest.json.
	let head = document.querySelector("head");
	if (head) {
		let link = document.createElement("link");
		if (link) {
			link.setAttribute("rel", "manifest");
			link.setAttribute("href", manifest.json);
			head.appendChild(link);
		}
	}

	// Set manifest parameters.
	let title = document.querySelector("title");
	if (title && manifest.short_name) {
		title.innerText = manifest.short_name;
	}
	title = document.querySelector(".title");
	if (title && manifest.short_name) {
		title.innerText = manifest.short_name;
	}
	let author = document.querySelector(".author");
	if (author && manifest.author) {
		author.innerText = manifest.author;
		if (manifest.name) {
			author.innerText += "/" + manifest.name;
		}
	}
	let version = document.querySelector(".version");
	if (version && manifest.version) {
		version.innerText = "#" + manifest.version.substr(-4);
	}

// Script for service worker.
} else {
	const identifier = manifest.name + "/" + manifest.version;

	// Event on installing service worker.
	self.addEventListener("install", (evt) => {

		// Cache all contents.
		evt.waitUntil(caches.open(identifier).then((cache) => {

			// Contents to cache.
			// (need to set relative path "./" or absolute path "/")
			return cache.addAll(manifest.contents).then(() => self.skipWaiting());
		}));
	});

	// Event on activating service worker.
	self.addEventListener("activate", (evt) => {

		// Delete old cache files when the cache version updated.
		evt.waitUntil(caches.keys().then((keys) => {
			return Promise.all(keys.map((key) => {
				if (key != identifier) {
					return caches.delete(key);
				}
			}));
		}));
	});

	// Event on fetching network request.
	self.addEventListener("fetch", (evt) => {

		// Returns manifest.
		let reqCloned = evt.request.clone();

		console.log("Request:" + reqCloned.url);

		if (reqCloned.url.match(manifest.json + "$")) {

			console.log("Manifest:" + JSON.stringify(manifest));

			let res = new Response(JSON.stringify(manifest),
				{"status": 200, "statusText": "OK",
				 "headers": {"Content-Type": "application/json"}});
			evt.respondWith(res);

		// Returns the cache file that matches the request.
		} else {
			evt.respondWith(caches.match(reqCloned, {ignoreSearch: true}).then((res) => {

				// Fetch if not found.
				return res || fetch(reqCloned).then((res) => {

					// Cache the fetched file.
					if (res.ok) {
						let resCloned = res.clone();
						caches.open(identifier).then((cache) => {
							cache.put(evt.request, resCloned);
						});
					}

					// Returns the fetched file.
					return res;
				});
			}));
		}
	});
}
