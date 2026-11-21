"use strict";

// Relative to this file, so it resolves to /Movium-2/scram/scramjet.all.js
// on GitHub Pages.
importScripts("./scram/scramjet.all.js");

const { ScramjetServiceWorker } = $scramjetLoadWorker();
const scramjet = new ScramjetServiceWorker();

// Activate immediately and take control of open pages, so the very first
// visit works without a manual reload.
self.addEventListener("install", () => {
    self.skipWaiting();
});

self.addEventListener("activate", event => {
    event.waitUntil(self.clients.claim());
});

async function handleRequest(event) {
    await scramjet.loadConfig();

    // The config is written by the page (scramjet.init()). Until it exists,
    // let every request through untouched.
    if (scramjet.config && scramjet.route(event)) {
        return scramjet.fetch(event);
    }

    return fetch(event.request);
}

self.addEventListener("fetch", event => {
    event.respondWith(handleRequest(event));
});
