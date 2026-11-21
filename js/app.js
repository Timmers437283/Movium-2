"use strict";

/* ELEMENTS */

const homeScreen = document.getElementById("home-screen");
const libraryScreen = document.getElementById("library-screen");
const detailsScreen = document.getElementById("details-screen");
const playerScreen = document.getElementById("player-screen");

const documentariesScreen = document.getElementById("documentaries-screen");
const documentaryGrid = document.getElementById("documentary-grid");
const documentaryEmpty = document.getElementById("documentary-empty");
const detailsNarratorWrap = document.getElementById("details-narrator-wrap");
const detailsNarrator = document.getElementById("details-narrator");
const detailsExtraWrap = document.getElementById("details-extra-wrap");
const detailsExtra = document.getElementById("details-extra");
const detailsDirectorLabel = document.getElementById("details-director-label");
const castSection = document.querySelector(".cast-section");

const movieGrid = document.getElementById("movie-grid");
const libraryGrid = document.getElementById("library-grid");
const emptyState = document.getElementById("empty-state");
const libraryEmpty = document.getElementById("library-empty");
const movieSearch = document.getElementById("movie-search");

const featuredTitle = document.getElementById("featured-title");
const featuredBackdrop = document.getElementById("featured-backdrop");
const featuredDots = document.getElementById("featured-dots");

const detailsTitle = document.getElementById("details-title");
const detailsCover = document.getElementById("details-cover");
const detailsBackdrop = document.getElementById("details-backdrop");
const detailsMeta = document.getElementById("details-meta");
const detailsDescription = document.getElementById("details-description");
const detailsDirector = document.getElementById("details-director");
const detailsGenres = document.getElementById("details-genres");
const castGrid = document.getElementById("cast-grid");
const detailsLibraryButton = document.getElementById("details-library");

const playerBack = document.getElementById("player-back");
const playerHotzone = document.getElementById("player-hotzone");
const playerError = document.getElementById("player-error");
const playerFrameContainer = document.getElementById("player-frame-container");
const playerLoading = document.getElementById("player-loading");

const navHome = document.getElementById("nav-home");
const navMovies = document.getElementById("nav-movies");
const navDocumentaries = document.getElementById("nav-documentaries");
const navLibrary = document.getElementById("nav-library");

/* STATE */

const LIBRARY_KEY = "movium-library";
const FEATURED_INTERVAL_MS = 8000;

let movies = [];
let documentaries = [];
let selectedMovie = null;
let featuredMovie = null;

let featuredList = [];
let featuredIndex = 0;

let currentPage = "home";
let previousPage = "home";

let savedMovies = loadSavedMovies();

/* LIBRARY STORAGE */

function loadSavedMovies() {
    try {
        const saved = JSON.parse(localStorage.getItem(LIBRARY_KEY) || "[]");
        return Array.isArray(saved) ? saved : [];
    } catch {
        return [];
    }
}

function saveLibrary() {
    try {
        localStorage.setItem(LIBRARY_KEY, JSON.stringify(savedMovies));
    } catch (error) {
        console.error("Unable to save library:", error);
    }
}

function getMovieId(movie) {
    if (movie.id !== undefined && movie.id !== null) {
        return String(movie.id);
    }

    return String(movie.title || "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
}

function isSaved(movie) {
    return savedMovies.includes(getMovieId(movie));
}

function toggleLibrary(movie) {
    const id = getMovieId(movie);

    if (isSaved(movie)) {
        savedMovies = savedMovies.filter(savedId => savedId !== id);
    } else {
        savedMovies.push(id);
    }

    saveLibrary();

    renderMovies(getFilteredMovies());
    renderDocumentaries(getFilteredDocumentaries());
    renderLibrary();
    updateLibraryButton();
}

function updateLibraryButton() {
    if (!selectedMovie) return;

    const saved = isSaved(selectedMovie);

    detailsLibraryButton.classList.toggle("checked", saved);
    detailsLibraryButton.setAttribute("aria-pressed", String(saved));

    detailsLibraryButton.querySelector(".library-check-label").textContent =
        saved ? "In Library" : "Add to Library";
}

/* MOVIE DATA */

async function loadMovies() {
    try {
        const response = await fetch("./data/movies.json", {
            cache: "no-store"
        });

        if (!response.ok) {
            throw new Error("Could not load movies.json");
        }

        const data = await response.json();

        movies = Array.isArray(data.movies) ? data.movies : [];

        renderFeatured();
        renderMovies(movies);
        renderLibrary();

        // Documentaries load separately so a problem with that file can
        // never break the movies.
        await loadDocumentaries();

    } catch (error) {
        console.error(error);

        movieGrid.innerHTML = "";

        emptyState.hidden = false;
        emptyState.querySelector("h3").textContent =
            "Unable to load movies";

        emptyState.querySelector("p").textContent =
            "Check that movies.json exists and contains valid JSON.";
    }
}

async function loadDocumentaries() {
    try {
        const response = await fetch("./data/documentaries.json", {
            cache: "no-store"
        });

        if (!response.ok) {
            throw new Error("Could not load documentaries.json");
        }

        const data = await response.json();
        const list = Array.isArray(data.documentaries) ? data.documentaries : [];

        // The "doc-" prefix keeps library ids from clashing with movie ids.
        documentaries = list.map(doc => ({
            ...doc,
            id: "doc-" + getMovieId(doc),
            isDocumentary: true
        }));

        renderDocumentaries(getFilteredDocumentaries());
        renderLibrary();

    } catch (error) {
        console.error(error);

        documentaryGrid.innerHTML = "";
        documentaryEmpty.hidden = false;
        documentaryEmpty.querySelector("h3").textContent =
            "Unable to load documentaries";
        documentaryEmpty.querySelector("p").textContent =
            "Check that documentaries.json exists and contains valid JSON.";
    }
}

/* HELPERS */

function makeMeta(movie) {
    const parts = [];

    if (movie.year) parts.push(movie.year);
    if (movie.duration) parts.push(movie.duration);

    if (Array.isArray(movie.genre)) {
        parts.push(...movie.genre);
    }

    return parts;
}

function makeRating(rating) {
    if (rating === undefined || rating === null || rating === "") {
        return "";
    }

    return `★ ${rating}`;
}

function makeImage(src, alt) {
    const img = document.createElement("img");

    img.src = src || "";
    img.alt = alt || "";
    img.loading = "lazy";

    img.addEventListener("error", () => {
        img.style.visibility = "hidden";
    }, { once: true });

    return img;
}

/* FEATURED MOVIE */

function renderFeaturedTitle(movie) {
    featuredTitle.textContent = "";

    const logo = movie.featuredText;
    const hasLogo = typeof logo === "string" && /^https?:\/\//i.test(logo);

    if (!hasLogo) {
        featuredTitle.textContent = movie.title || "";
        return;
    }

    // Title image instead of plain text. Falls back to the text title
    // if the image can't be loaded.
    const img = document.createElement("img");

    img.className = "featured-logo";
    img.alt = movie.title || "";
    img.src = logo;

    img.addEventListener("error", () => {
        featuredTitle.textContent = movie.title || "";
    }, { once: true });

    featuredTitle.appendChild(img);
}

function renderFeatured() {
    featuredList = movies.filter(movie => movie.featured === true);

    if (!featuredList.length && movies.length) {
        featuredList = [movies[0]];
    }

    if (!featuredList.length) {
        featuredMovie = null;
        featuredTitle.textContent = "Movium";
        featuredBackdrop.removeAttribute("src");
        featuredDots.innerHTML = "";

        document.getElementById("featured-watch").disabled = true;
        document.getElementById("featured-details").disabled = true;

        return;
    }

    showFeatured(0, false);
}

function showFeatured(index, animate = true) {
    featuredIndex = (index + featuredList.length) % featuredList.length;
    featuredMovie = featuredList[featuredIndex];

    const apply = () => {
        renderFeaturedTitle(featuredMovie);

        featuredBackdrop.src =
            featuredMovie.bigCover || featuredMovie.cover || "";

        document.getElementById("featured-watch").disabled =
            !featuredMovie.link;

        document.getElementById("featured-details").disabled = false;

        document.body.classList.remove("featured-fading");
    };

    if (animate) {
        document.body.classList.add("featured-fading");
        setTimeout(apply, 350);
    } else {
        apply();
    }

    renderFeaturedDots();
}

function renderFeaturedDots() {
    // Rebuilding the dots restarts the fill animation from empty.
    featuredDots.innerHTML = "";
    featuredDots.style.setProperty("--featured-ms", FEATURED_INTERVAL_MS + "ms");

    // No dots needed if there's only one featured movie.
    if (featuredList.length < 2) return;

    featuredList.forEach((movie, i) => {
        const dot = document.createElement("button");

        dot.type = "button";
        dot.className = "featured-dot" + (i === featuredIndex ? " active" : "");
        dot.setAttribute(
            "aria-label",
            "Show " + (movie.title || "movie " + (i + 1))
        );

        dot.addEventListener("click", () => showFeatured(i));

        featuredDots.appendChild(dot);
    });
}

// When the active dot finishes filling, go to the next featured movie.
featuredDots.addEventListener("animationend", event => {
    if (event.animationName === "featuredFill") {
        showFeatured(featuredIndex + 1);
    }
});

/* MOVIE ORDER: everything A-Z (the featured carousel sits above the grid) */

function byTitle(a, b) {
    return (a.title || "").localeCompare(b.title || "", undefined, {
        sensitivity: "base",
        numeric: true
    });
}

function orderMovies(list) {
    return list.slice().sort(byTitle);
}

/* MOVIE CARDS */

function createMovieCard(movie) {
    const card = document.createElement("article");
    card.className = "movie-card";

    const poster = document.createElement("div");
    poster.className = "movie-poster";

    if (movie.cover) {
        poster.appendChild(makeImage(movie.cover, movie.title));
    } else {
        // No cover image yet: show the title on a plain poster.
        const fallback = document.createElement("span");

        fallback.className = "poster-fallback";
        fallback.textContent = movie.title || "Untitled";

        poster.appendChild(fallback);
    }

    if (movie.rating !== undefined && movie.rating !== null) {
        const rating = document.createElement("span");

        rating.className = "movie-rating";
        rating.textContent = makeRating(movie.rating);

        poster.appendChild(rating);
    }

    // Movie title

    const title = document.createElement("span");
    title.className = "movie-title";
    title.textContent = movie.title || "Untitled";

    const year = document.createElement("span");
    year.className = "movie-year";
    year.textContent = movie.year || "";

    card.append(poster, title, year);

    card.addEventListener("click", () => {
        showDetails(movie);
    });

    // The cover tilts toward the mouse as it moves; the text stays put.
    const MAX_TILT = 14;

    card.addEventListener("mousemove", event => {
        const rect = poster.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width - 0.5;
        const y = (event.clientY - rect.top) / rect.height - 0.5;

        card.classList.add("tilting");
        poster.style.setProperty("--tilt-y", (x * MAX_TILT * 2).toFixed(2) + "deg");
        poster.style.setProperty("--tilt-x", (-y * MAX_TILT * 2).toFixed(2) + "deg");
        poster.style.setProperty("--tilt-scale", "1.04");
    });

    card.addEventListener("mouseleave", () => {
        card.classList.remove("tilting");
        poster.style.removeProperty("--tilt-x");
        poster.style.removeProperty("--tilt-y");
        poster.style.removeProperty("--tilt-scale");
    });

    return card;
}

function renderMovies(list) {
    list = orderMovies(list);

    movieGrid.innerHTML = "";

    document.getElementById("movie-count").textContent =
        `${list.length} ${list.length === 1 ? "movie" : "movies"}`;

    emptyState.hidden = list.length !== 0;

    list.forEach(movie => {
        movieGrid.appendChild(createMovieCard(movie));
    });
}

/* DOCUMENTARIES */

function renderDocumentaries(list) {
    list = orderMovies(list);

    documentaryGrid.innerHTML = "";

    document.getElementById("documentary-count").textContent =
        `${list.length} ${list.length === 1 ? "documentary" : "documentaries"}`;

    documentaryEmpty.hidden = list.length !== 0;

    if (!list.length && !documentaries.length) {
        // Still loading (or failed; loadDocumentaries sets its own message).
        documentaryEmpty.hidden = true;
    }

    list.forEach(doc => {
        documentaryGrid.appendChild(createMovieCard(doc));
    });
}

function getFilteredDocumentaries() {
    const query = movieSearch.value.toLowerCase().trim();

    if (!query) return documentaries;

    return documentaries.filter(doc => {
        const genres = Array.isArray(doc.genre) ? doc.genre.join(" ") : "";

        return [doc.title, doc.description, doc.director, doc.narrator, genres]
            .map(value => String(value || "").toLowerCase())
            .some(value => value.includes(query));
    });
}

/* MY LIBRARY */

function renderLibrary() {
    if (!libraryGrid) return;

    libraryGrid.innerHTML = "";

    const libraryMovies = [...movies, ...documentaries]
        .filter(movie => isSaved(movie))
        .sort(byTitle);

    document.getElementById("library-count").textContent =
        `${libraryMovies.length} saved`;

    libraryEmpty.hidden = libraryMovies.length !== 0;

    libraryMovies.forEach(movie => {
        libraryGrid.appendChild(createMovieCard(movie));
    });
}

/* SEARCH FILTER */

function getFilteredMovies() {
    const query = movieSearch.value.toLowerCase().trim();

    if (!query) return movies;

    return movies.filter(movie => {
        const title = (movie.title || "").toLowerCase();
        const description = (movie.description || "").toLowerCase();
        const director = (movie.director || "").toLowerCase();

        const genres = Array.isArray(movie.genre)
            ? movie.genre.join(" ").toLowerCase()
            : "";

        const actors = Array.isArray(movie.actors)
            ? movie.actors
                .map(actor => actor.name || "")
                .join(" ")
                .toLowerCase()
            : "";

        return (
            title.includes(query) ||
            description.includes(query) ||
            director.includes(query) ||
            genres.includes(query) ||
            actors.includes(query)
        );
    });
}

/* DETAILS PAGE */

function showDetails(movie) {
    if (!movie) return;

    selectedMovie = movie;

    if (!detailsScreen.hidden) {
        // Keep the original page when opening another movie.
    } else {
        previousPage = currentPage;
    }

    homeScreen.hidden = true;
    libraryScreen.hidden = true;
    documentariesScreen.hidden = true;
    playerScreen.hidden = true;
    detailsScreen.hidden = false;

    detailsTitle.textContent = movie.title || "Untitled";

    showDetailsCover(movie);
    detailsBackdrop.src = movie.bigCover || movie.cover || "";
    detailsBackdrop.style.visibility =
        detailsBackdrop.getAttribute("src") ? "visible" : "hidden";

    detailsMeta.innerHTML = "";

    const rating = document.createElement("span");
    rating.textContent = makeRating(movie.rating);

    const metadata = document.createElement("span");
    metadata.textContent = makeMeta(movie).join(" · ");

    detailsMeta.append(rating, metadata);

    detailsDescription.textContent = movie.description || "";

    detailsDirector.textContent = movie.director || "Unknown";

    // Documentaries show the narrator + country and have no cast list.
    const isDoc = movie.isDocumentary === true;

    detailsDirectorLabel.textContent =
        isDoc && String(movie.director || "").includes(",")
            ? "Directors"
            : "Director";

    detailsNarratorWrap.hidden = !isDoc;
    detailsNarrator.textContent = movie.narrator || "None";

    detailsExtraWrap.hidden = !(isDoc && movie.country);
    detailsExtra.textContent = movie.country || "";

    castSection.hidden = isDoc;

    detailsGenres.textContent =
        Array.isArray(movie.genre)
            ? movie.genre.join(", ")
            : movie.genre || "Unknown";

    if (!isDoc) renderCast(movie.actors || []);

    document.getElementById("details-watch").disabled = !movie.link;

    updateLibraryButton();

    window.scrollTo(0, 0);
}

// Shows the cover image, or a plain title poster when there isn't one.
function showDetailsCover(movie) {
    const old = document.getElementById("details-cover-fallback");
    if (old) old.remove();

    if (movie.cover) {
        detailsCover.hidden = false;
        detailsCover.src = movie.cover;
        return;
    }

    detailsCover.hidden = true;
    detailsCover.removeAttribute("src");

    const fallback = document.createElement("div");

    fallback.id = "details-cover-fallback";
    fallback.className = "details-cover-fallback";
    fallback.textContent = movie.title || "Untitled";

    detailsCover.after(fallback);
}

function renderCast(actors) {
    castGrid.innerHTML = "";

    if (!Array.isArray(actors) || !actors.length) {
        const message = document.createElement("span");

        message.textContent = "No cast information available.";
        message.style.color = "#85858D";
        message.style.fontSize = "12px";

        castGrid.appendChild(message);
        return;
    }

    actors.forEach(actor => {
        const card = document.createElement("div");
        card.className = "cast-card";

        card.appendChild(makeImage(actor.image, actor.name));

        const name = document.createElement("strong");
        name.textContent = actor.name || "Unknown";

        const role = document.createElement("span");
        role.textContent = actor.role || "";

        card.append(name, role);

        castGrid.appendChild(card);
    });
}

/* NAVIGATION */

function updateNavigation(activePage) {
    navHome.classList.toggle("active", activePage === "home");
    navMovies.classList.toggle("active", activePage === "movies");
    navDocumentaries.classList.toggle("active", activePage === "documentaries");
    navLibrary.classList.toggle("active", activePage === "library");

    movieSearch.placeholder =
        activePage === "documentaries"
            ? "Search documentaries..."
            : "Search movies...";
}

function hideAllScreens() {
    homeScreen.hidden = true;
    libraryScreen.hidden = true;
    documentariesScreen.hidden = true;
    detailsScreen.hidden = true;
    playerScreen.hidden = true;
}

function showHome() {
    hideAllScreens();

    homeScreen.hidden = false;
    currentPage = "home";

    updateNavigation("home");

    window.scrollTo(0, 0);
}

function showMovies() {
    hideAllScreens();

    homeScreen.hidden = false;
    currentPage = "movies";

    updateNavigation("movies");

    renderMovies(getFilteredMovies());

    window.scrollTo(0, 0);

    document.querySelector("#home-screen .catalog-section")
        .scrollIntoView({ behavior: "smooth" });
}

function showDocumentaries() {
    hideAllScreens();

    documentariesScreen.hidden = false;
    currentPage = "documentaries";

    updateNavigation("documentaries");

    renderDocumentaries(getFilteredDocumentaries());

    window.scrollTo(0, 0);
}

function showLibrary() {
    hideAllScreens();

    libraryScreen.hidden = false;
    currentPage = "library";

    updateNavigation("library");

    renderLibrary();

    window.scrollTo(0, 0);
}

document.getElementById("home-link").addEventListener("click", event => {
    event.preventDefault();
    showHome();
});

navHome.addEventListener("click", showHome);
navMovies.addEventListener("click", showMovies);
navDocumentaries.addEventListener("click", showDocumentaries);
navLibrary.addEventListener("click", showLibrary);

document.getElementById("library-discover")
    .addEventListener("click", showMovies);

document.getElementById("details-back").addEventListener("click", () => {
    if (previousPage === "library") {
        showLibrary();
    } else if (previousPage === "movies") {
        showMovies();
    } else if (previousPage === "documentaries") {
        showDocumentaries();
    } else {
        showHome();
    }
});

document.getElementById("featured-details")
    .addEventListener("click", () => {
        if (featuredMovie) showDetails(featuredMovie);
    });

document.getElementById("featured-watch")
    .addEventListener("click", () => {
        if (featuredMovie) openMovie(featuredMovie);
    });

detailsLibraryButton.addEventListener("click", () => {
    if (selectedMovie) toggleLibrary(selectedMovie);
});

document.getElementById("details-watch")
    .addEventListener("click", () => {
        if (selectedMovie) openMovie(selectedMovie);
    });

/* SEARCH */

movieSearch.addEventListener("input", () => {
    // On the Documentaries tab the search filters documentaries.
    if (currentPage === "documentaries") {
        showDocumentaries();
        return;
    }

    hideAllScreens();

    homeScreen.hidden = false;
    currentPage = "movies";

    updateNavigation("movies");

    renderMovies(getFilteredMovies());
});

/* SCRAMJET PLAYER */

/*
 * The frontend is hosted on GitHub Pages in a sub-directory
 * (https://<user>.github.io/Movium-2/), so every asset path is resolved
 * relative to this page and never from the domain root. BASE_PATH is
 * "/Movium-2/" on GitHub Pages and "/" when the site is served from a root.
 */
const BASE_URL = new URL("./", location.href);
const BASE_PATH = BASE_URL.pathname;

const SCRAMJET_PREFIX = BASE_PATH + "scramjet/";
const SCRAMJET_FILES = {
    wasm: BASE_PATH + "scram/scramjet.wasm.wasm",
    all: BASE_PATH + "scram/scramjet.all.js",
    sync: BASE_PATH + "scram/scramjet.sync.js"
};

// BareMux runs the transport inside a SharedWorker, which resolves module
// paths against the worker's own URL, so these must be full URLs.
const BAREMUX_WORKER_URL = new URL("baremux/worker.js", BASE_URL).href;
const LIBCURL_TRANSPORT_URL = new URL("libcurl/index.mjs", BASE_URL).href;

// The Wisp backend lives on Render, not on GitHub Pages.
const RENDER_BACKEND = "https://movium-2.onrender.com";
const IS_LOCAL = ["localhost", "127.0.0.1"].includes(location.hostname);
const WISP_URL = IS_LOCAL
    ? "ws://" + location.hostname + ":8080/wisp/"
    : "wss://movium-2.onrender.com/wisp/";

// Render's free tier sleeps when idle. Poke it early so it is awake by the
// time someone presses "Watch".
if (!IS_LOCAL) {
    fetch(RENDER_BACKEND + "/", { mode: "no-cors" }).catch(() => {});
}

let scramjet = null;
let connection = null;
let frame = null;
let setupPromise = null;

function setupScramjet() {
    if (!setupPromise) {
        setupPromise = (async () => {
            if (typeof $scramjetLoadController !== "function") {
                throw new Error(
                    "Scramjet controller failed to load (" +
                    SCRAMJET_FILES.all + ")."
                );
            }

            if (!window.BareMux) {
                throw new Error(
                    "BareMux failed to load (" + BASE_PATH + "baremux/index.js)."
                );
            }

            if (typeof registerSW !== "function") {
                throw new Error("Service worker registration script is missing.");
            }

            const { ScramjetController } = $scramjetLoadController();

            scramjet = new ScramjetController({
                prefix: SCRAMJET_PREFIX,
                files: SCRAMJET_FILES
            });

            // init() creates the "$scramjet" IndexedDB and stores the config
            // in it. It has to run BEFORE the service worker starts: the
            // worker opens that database on its first request and would
            // otherwise create it empty.
            await scramjet.init();

            // The service worker must be active before Scramjet is used.
            await registerSW();

            connection = new BareMux.BareMuxConnection(BAREMUX_WORKER_URL);

            await connection.setTransport(LIBCURL_TRANSPORT_URL, [
                { websocket: WISP_URL }
            ]);
        })().catch(error => {
            setupPromise = null;
            throw error;
        });
    }

    return setupPromise;
}

async function loadInPlayer(url) {
    await setupScramjet();

    if (!frame) {
        frame = scramjet.createFrame();

        frame.frame.id = "sj-frame";
        frame.frame.allow =
            "autoplay; fullscreen; encrypted-media; picture-in-picture";
        frame.frame.allowFullscreen = true;

        frame.frame.addEventListener("load", () => {
            bindFrameActivity();
            playerLoading.hidden = true;
        });

        playerFrameContainer.appendChild(frame.frame);
    }

    frame.go(url);
}

function destroyPlayerFrame() {
    if (frame) {
        // Removing the iframe also stops the video and its audio.
        frame.frame.remove();
        frame = null;
    }
}

/* PLAYER BACK BUTTON (hides after 2 seconds without mouse movement) */

const BACK_BUTTON_IDLE_MS = 2000;

let backButtonTimer = null;
let activityScanTimer = null;
let boundDocuments = new WeakSet();

function showBackButton() {
    playerBack.classList.remove("idle");
    playerHotzone.hidden = true;

    clearTimeout(backButtonTimer);
    backButtonTimer = setTimeout(hideBackButton, BACK_BUTTON_IDLE_MS);
}

function hideBackButton() {
    // Keep the button on screen while an error message is shown.
    if (!playerError.hidden) return;

    playerBack.classList.add("idle");

    // A small invisible corner area wakes the button back up, because the
    // browser sends no mouse events to the parent page while the pointer is
    // over the movie frame.
    playerHotzone.hidden = false;
}

/*
 * The movie runs inside an iframe, which swallows mouse events. The proxied
 * frame is same-origin with this page, so listen for movement inside it (and
 * any nested frames). Frames that cannot be read are skipped.
 */
function bindFrameActivity() {
    if (!frame) return;

    const visit = (win, depth) => {
        if (!win || depth > 6) return;

        try {
            const doc = win.document;

            if (doc && !boundDocuments.has(doc)) {
                boundDocuments.add(doc);

                win.addEventListener("mousemove", showBackButton, {
                    passive: true
                });
                win.addEventListener("touchstart", showBackButton, {
                    passive: true
                });
            }

            for (let i = 0; i < win.frames.length; i++) {
                visit(win.frames[i], depth + 1);
            }
        } catch {
            // Cross-origin frame: its events cannot be observed.
        }
    };

    visit(frame.frame.contentWindow, 0);
}

function startPlayerActivity() {
    showBackButton();

    clearInterval(activityScanTimer);
    activityScanTimer = setInterval(bindFrameActivity, 1000);
}

function stopPlayerActivity() {
    clearTimeout(backButtonTimer);
    clearInterval(activityScanTimer);

    backButtonTimer = null;
    activityScanTimer = null;
    boundDocuments = new WeakSet();

    playerBack.classList.remove("idle");
    playerHotzone.hidden = true;
}

document.addEventListener("mousemove", () => {
    if (!playerScreen.hidden) showBackButton();
});

playerHotzone.addEventListener("mousemove", showBackButton);
playerHotzone.addEventListener("mouseenter", showBackButton);
playerHotzone.addEventListener("touchstart", showBackButton, {
    passive: true
});

/* OPEN / CLOSE PLAYER */

async function openMovie(movie) {
    if (!movie || !movie.link) return;

    let url;

    try {
        url = new URL(movie.link);

        if (!["http:", "https:"].includes(url.protocol)) {
            throw new Error("Invalid movie link.");
        }
    } catch (error) {
        console.error(error);
        alert("This movie has an invalid link.");
        return;
    }

    selectedMovie = movie;

    hideAllScreens();
    playerScreen.hidden = false;

    playerError.hidden = true;
    playerLoading.hidden = false;

    window.scrollTo(0, 0);

    startPlayerActivity();

    try {
        await loadInPlayer(url.href);
    } catch (error) {
        console.error(error);

        playerLoading.hidden = true;
        playerError.hidden = false;
        playerError.textContent =
            "Unable to open this movie: " + error.message;

        showBackButton();
    }
}

function closePlayer() {
    stopPlayerActivity();
    destroyPlayerFrame();

    playerError.hidden = true;
    playerScreen.hidden = true;

    if (selectedMovie) {
        showDetails(selectedMovie);
    } else {
        showHome();
    }
}

playerBack.addEventListener("click", closePlayer);

/* START */

loadMovies();
