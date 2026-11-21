
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import { hostname } from "node:os";
import { server as wisp, logging } from "@mercuryworkshop/wisp-js/server";
import Fastify from "fastify";
import fastifyStatic from "@fastify/static";

import { scramjetPath } from "@mercuryworkshop/scramjet/path";
import { libcurlPath } from "@mercuryworkshop/libcurl-transport";
import { baremuxPath } from "@mercuryworkshop/bare-mux/node";

const projectPath = fileURLToPath(new URL("../", import.meta.url));

logging.set_level(logging.NONE);

Object.assign(wisp.options, {
    allow_udp_streams: false,
    hostname_blacklist: [/example\.com/],
    dns_servers: ["1.1.1.3", "1.0.0.3"],
});

const fastify = Fastify({
    serverFactory: (handler) => {
        return createServer()
            .on("request", (req, res) => {
                res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
                res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
                handler(req, res);
            })
            .on("upgrade", (req, socket, head) => {
                if (req.url.endsWith("/wisp/")) {
                    wisp.routeRequest(req, socket, head);
                } else {
                    socket.end();
                }
            });
    },
});

fastify.register(fastifyStatic, {
    root: projectPath,
    index: ["index.html"],
});

fastify.register(fastifyStatic, {
    root: scramjetPath,
    prefix: "/scram/",
    decorateReply: false,
});

fastify.register(fastifyStatic, {
    root: libcurlPath,
    prefix: "/libcurl/",
    decorateReply: false,
});

fastify.register(fastifyStatic, {
    root: baremuxPath,
    prefix: "/baremux/",
    decorateReply: false,
});

fastify.setNotFoundHandler((request, reply) => {
    return reply.code(404).type("text/html").sendFile("404.html");
});

fastify.server.on("listening", () => {
    const address = fastify.server.address();
    console.log(`Movium listening on port ${address.port}`);
});

function shutdown() {
    console.log("Closing server...");
    fastify.close();
    process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

const port = Number.parseInt(process.env.PORT || "8080", 10);

fastify.listen({
    port,
    host: "0.0.0.0",
});
