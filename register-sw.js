"use strict";

/**
 * The service worker lives next to index.html. On GitHub Pages that is
 * /Movium-2/sw.js, and its scope must be /Movium-2/ (not the domain root,
 * which this project site is not allowed to control).
 */
const stockSW = new URL("sw.js", location.href).href;
const swScope = new URL("./", location.href).pathname;

/**
 * List of hostnames that are allowed to run serviceworkers on http://
 */
const swAllowedHostnames = ["localhost", "127.0.0.1"];

/**
 * Global util
 * Used in 404.html and index.html
 */
async function registerSW() {
	if (!navigator.serviceWorker) {
		if (
			location.protocol !== "https:" &&
			!swAllowedHostnames.includes(location.hostname)
		)
			throw new Error("Service workers cannot be registered without https.");

		throw new Error("Your browser doesn't support service workers.");
	}

	await navigator.serviceWorker.register(stockSW, { scope: swScope });

	// register() resolves before the worker is active; wait until it is.
	await navigator.serviceWorker.ready;
}
