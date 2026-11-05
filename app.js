const state = {
  results: [],
  queue: [],
  queueIndex: -1,
  current: null,
  filter: "all",
  playlists: readStore("tf_playlists", []),
  liked: readStore("tf_liked", []),
  recent: readStore("tf_recent", [])
};

const $ = (selector) => document.querySelector(selector);
const searchInput = $("#searchInput");

let player = null;
let playerReady = false;
let pendingVideoId = null;
let progressTimer = null;
let toastTimer = null;

function readStore(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}

function saveStore() {
  localStorage.setItem("tf_playlists", JSON.stringify(state.playlists));
  localStorage.setItem("tf_liked", JSON.stringify(state.liked));
  localStorage.setItem("tf_recent", JSON.stringify(state.recent));
}

function escapeText(value = "") {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[char]));
}

function showToast(message) {
  const toast = $("#toast");

  toast.textContent = message;
  toast.classList.add("show");

  clearTimeout(toastTimer);

  toastTimer = setTimeout(() => {
    toast.classList.remove("show");
  }, 2300);
}

function emptyState(title, detail) {
  return `
    <div class="empty-state">
      <span class="empty-icon">♫</span>
      <b>${escapeText(title)}</b>
      <p>${escapeText(detail)}</p>
    </div>
  `;
}

function videoCard(video) {
  const liked = state.liked.some(item => item.id === video.id);

  return `
    <article class="music-card">
      <div class="cover-wrap">
        <img loading="lazy" src="${escapeText(video.thumbnail)}" alt="">

        <button
          class="cover-play"
          data-play="${escapeText(video.id)}"
          aria-label="Play"
        >▶</button>
      </div>

      <div class="track-title" title="${escapeText(video.title)}">
        ${escapeText(video.title)}
      </div>

      <p class="track-artist">
        ${escapeText(video.channelTitle || "YouTube")}
      </p>

      <div class="card-bottom">
        <small>YouTube Music</small>

        <button
          class="heart-btn ${liked ? "liked" : ""}"
          data-like="${escapeText(video.id)}"
          aria-label="Like"
        >${liked ? "♥" : "♡"}</button>
      </div>
    </article>
  `;
}

function renderCards(container, items, emptyTitle, emptyDetail) {
  if (!items.length) {
    container.innerHTML = emptyState(emptyTitle, emptyDetail);
    return;
  }

  container.innerHTML = items.map(videoCard).join("");
}

async function api(path) {
  const response = await fetch(path);
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data.error || "Request failed. Check your API key and server."
    );
  }

  return data;
}

async function searchMusic(query, target = "search") {
  const clean = query.trim();

  if (!clean) return;

  navigate("search");

  $("#searchGrid").innerHTML = emptyState(
    "Searching music...",
    "Finding tracks for you."
  );

  $("#musicGrid").innerHTML = emptyState(
    "Searching music...",
    "Finding tracks for you."
  );

  searchInput.value = clean;

  try {
    const data = await api(
      `/api/search?q=${encodeURIComponent(clean)}`
    );

    state.results = data.items || [];

    renderCards(
      $("#searchGrid"),
      state.results,
      "No music found.",
      "Try another song or artist."
    );

    renderCards(
      $("#musicGrid"),
      state.results.slice(0, 8),
      "No music found.",
      "Try another search."
    );

    if (target === "explore") {
      renderCards(
        $("#exploreGrid"),
        state.results,
        "Nothing found.",
        "Try another mood."
      );
    }

    if (!state.results.length) {
      showToast("No results found. Try another search.");
    }

  } catch (error) {
    const message = error.message.includes("API key")
      ? "Add your YouTube API key to .env, then restart the server."
      : error.message;

    $("#searchGrid").innerHTML = emptyState(
      "Search unavailable",
      message
    );

    $("#musicGrid").innerHTML = emptyState(
      "Search unavailable",
      message
    );

    showToast(message);
  }
}

function navigate(page) {
  document.querySelectorAll(".page-section").forEach(section => {
    section.classList.remove("active");
  });

  const pageEl = $(`#${page}Page`);

  if (pageEl) {
    pageEl.classList.add("active");
  }

  document.querySelectorAll(".nav-link[data-page]").forEach(button => {
    button.classList.toggle(
      "active",
      button.dataset.page === page
    );
  });

  $("#sidebar").classList.remove("open");

  if (page === "liked") {
    renderCards(
      $("#likedGrid"),
      state.liked,
      "No liked songs yet.",
      "Tap the heart on a track to save it here."
    );
  }

  if (page === "recent") {
    renderCards(
      $("#recentGrid"),
      state.recent,
      "Nothing played yet.",
      "Choose a track and it will appear here."
    );
  }

  if (page === "playlists") {
    renderPlaylists();
  }
}

function toggleLike(id) {
  const video = [
    ...state.results,
    ...state.liked,
    ...state.recent,
    ...state.queue
  ].find(item => item.id === id);

  if (!video) return;

  const index = state.liked.findIndex(item => item.id === id);

  if (index >= 0) {
    state.liked.splice(index, 1);
    showToast("Removed from Liked Music");
  } else {
    state.liked.unshift(video);
    showToast("Added to Liked Music ♥");
  }

  saveStore();
  refreshVisibleCards();
}

function refreshVisibleCards() {
  const active = $(".page-section.active")?.id;

  if (active === "likedPage") {
    renderCards(
      $("#likedGrid"),
      state.liked,
      "No liked songs yet.",
      "Tap the heart on a track to save it here."
    );
  }

  if (active === "homePage") {
    renderCards(
      $("#musicGrid"),
      state.results.slice(0, 8),
      "Your next favourite song is waiting.",
      "Search for a song or artist to get started."
    );
  }

  if (active === "searchPage") {
    renderCards(
      $("#searchGrid"),
      state.results,
      "No music found.",
      "Try another search."
    );
  }

  if (active === "recentPage") {
    renderCards(
      $("#recentGrid"),
      state.recent,
      "Nothing played yet.",
      "Choose a track and it will appear here."
    );
  }

  if (active === "playlistsPage") {
    renderPlaylists();
  }
}

function playVideo(id) {
  const all = [
    ...state.results,
    ...state.liked,
    ...state.recent,
    ...state.queue
  ];

  const video = all.find(item => item.id === id);

  if (!video) return;

  state.current = video;

  state.queue = state.results.length
    ? [...state.results]
    : [video];

  state.queueIndex = state.queue.findIndex(
    item => item.id === id
  );

  state.recent = [
    video,
    ...state.recent.filter(item => item.id !== id)
  ].slice(0, 30);

  saveStore();

  $("#nowTitle").textContent = video.title;
  $("#nowArtist").textContent = video.channelTitle || "YouTube";
  $("#nowThumb").src = video.thumbnail;

  $("#modalTitle").textContent = video.title;
  $("#modalArtist").textContent = video.channelTitle || "YouTube";

  $("#playerModal").classList.add("open");

  $("#playerModal").setAttribute(
    "aria-hidden",
    "false"
  );

  if (playerReady && player) {
    player.loadVideoById(video.id);
  } else {
    pendingVideoId = video.id;
  }

  $("#playPauseBtn").textContent = "Ⅱ";

  refreshVisibleCards();
}

function minimizePlayer() {
  $("#playerModal").classList.remove("open");

  $("#playerModal").setAttribute(
    "aria-hidden",
    "true"
  );

  // Minimizing only hides the expanded view; playback continues.
}

function expandPlayer() {
  if (!state.current) return;

  $("#playerModal").classList.add("open");

  $("#playerModal").setAttribute(
    "aria-hidden",
    "false"
  );
}

function nextTrack(direction) {
  if (!state.queue.length) return;

  state.queueIndex = (
    state.queueIndex + direction + state.queue.length
  ) % state.queue.length;

  playVideo(state.queue[state.queueIndex].id);
}

function renderPlaylists() {
  const list = $("#playlistList");

  if (!state.playlists.length) {
    list.innerHTML = emptyState(
      "No playlists yet.",
      "Create one, then add tracks using the + Playlist button on a song."
    );

    $("#playlistTracks").innerHTML = "";

    return;
  }

  list.innerHTML = state.playlists.map((playlist, index) => `
    <button
      class="playlist-chip ${index === 0 ? "active" : ""}"
      data-playlist="${index}"
    >
      ▤ ${escapeText(playlist.name)}
      <small>(${playlist.tracks.length})</small>
    </button>
  `).join("");

  renderCards(
    $("#playlistTracks"),
    state.playlists[0].tracks,
    "This playlist is empty.",
    "Add tracks from search results."
  );
}

function addToPlaylist(video) {
  if (!state.playlists.length) {
    const name = prompt("Enter a playlist name:");

    if (!name?.trim()) return;

    state.playlists.push({
      name: name.trim(),
      tracks: []
    });
  }

  const playlist = state.playlists[0];

  if (!playlist.tracks.some(item => item.id === video.id)) {
    playlist.tracks.push(video);
  }

  saveStore();
  renderPlaylists();

  showToast(`Added to ${playlist.name}`);
}

function formatTime(seconds) {
  if (!Number.isFinite(seconds)) return "0:00";

  const min = Math.floor(seconds / 60);

  const sec = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");

  return `${min}:${sec}`;
}

function loadYouTubeApi() {
  const script = document.createElement("script");

  script.src = "https://www.youtube.com/iframe_api";

  document.head.appendChild(script);

  window.onYouTubeIframeAPIReady = () => {
    player = new YT.Player("youtubePlayer", {
      height: "100%",
      width: "100%",
      videoId: "",

      playerVars: {
        playsinline: 1,
        rel: 0,
        controls: 1
      },

      events: {
        onReady: () => {
          playerReady = true;

          if (pendingVideoId) {
            player.loadVideoById(pendingVideoId);
            pendingVideoId = null;
          }
        },

        onStateChange: event => {
          if (event.data === YT.PlayerState.PLAYING) {
            $("#playPauseBtn").textContent = "Ⅱ";
          }

          if (
            event.data === YT.PlayerState.PAUSED ||
            event.data === YT.PlayerState.ENDED
          ) {
            $("#playPauseBtn").textContent = "▶";
          }

          if (event.data === YT.PlayerState.ENDED) {
            nextTrack(1);
          }
        }
      }
    });
  };
}

function updateProgress() {
  if (!playerReady || !player?.getDuration) return;

  try {
    const duration = player.getDuration() || 0;
    const current = player.getCurrentTime() || 0;

    $("#progressBar").value = duration
      ? Math.round(current / duration * 1000)
      : 0;

    $("#currentTime").textContent = formatTime(current);
    $("#durationTime").textContent = formatTime(duration);

  } catch {}
}

function bindEvents() {
  searchInput.addEventListener("keydown", event => {
    if (event.key === "Enter") {
      searchMusic(searchInput.value);
    }
  });

  $("#heroSearchBtn").addEventListener("click", () => {
    navigate("search");
    searchInput.focus();
  });

  $("#settingsBtn").addEventListener("click", () => {
    navigate("settings");
  });

  $("#menuBtn").addEventListener("click", () => {
    $("#sidebar").classList.toggle("open");
  });

  $("#minimizePlayerBtn").addEventListener("click", minimizePlayer);
  $("#expandPlayerBtn").addEventListener("click", expandPlayer);

  $("#prevBtn").addEventListener("click", () => {
    nextTrack(-1);
  });

  $("#nextBtn").addEventListener("click", () => {
    nextTrack(1);
  });

  $("#playPauseBtn").addEventListener("click", () => {
    if (!state.current) {
      showToast("Select a song first.");
      return;
    }

    if (playerReady && player) {
      const status = player.getPlayerState();

      status === YT.PlayerState.PLAYING
        ? player.pauseVideo()
        : player.playVideo();

    } else {
      showToast("The player is loading.");
    }
  });

  $("#dockLikeBtn").addEventListener("click", () => {
    if (state.current) {
      toggleLike(state.current.id);
    }
  });

  $("#progressBar").addEventListener("change", event => {
    if (playerReady && player?.getDuration) {
      player.seekTo(
        player.getDuration() * Number(event.target.value) / 1000,
        true
      );
    }
  });

  $("#createPlaylistBtn").addEventListener("click", () => {
    const input = $("#playlistName");
    const name = input.value.trim();

    if (!name) {
      showToast("Enter a playlist name.");
      return;
    }

    state.playlists.push({
      name,
      tracks: []
    });

    input.value = "";

    saveStore();
    renderPlaylists();

    showToast("Playlist created!");
  });

  $("#clearDataBtn").addEventListener("click", () => {
    if (!confirm(
      "Are you sure you want to clear your liked songs, playlists, and history?"
    )) {
      return;
    }

    state.liked = [];
    state.playlists = [];
    state.recent = [];

    saveStore();
    navigate("settings");

    showToast("Local data cleared.");
  });

  document.addEventListener("click", event => {
    const pageButton = event.target.closest("[data-page]");

    if (pageButton) {
      navigate(pageButton.dataset.page);
    }

    const queryButton = event.target.closest("[data-query]");

    if (queryButton) {
      searchMusic(queryButton.dataset.query, "explore");
    }

    const playButton = event.target.closest("[data-play]");

    if (playButton) {
      playVideo(playButton.dataset.play);
    }

    const likeButton = event.target.closest("[data-like]");

    if (likeButton) {
      toggleLike(likeButton.dataset.like);
    }

    const playlistButton = event.target.closest("[data-playlist]");

    if (playlistButton) {
      document.querySelectorAll(".playlist-chip").forEach(chip => {
        chip.classList.remove("active");
      });

      playlistButton.classList.add("active");

      const playlist = state.playlists[
        Number(playlistButton.dataset.playlist)
      ];

      renderCards(
        $("#playlistTracks"),
        playlist.tracks,
        "This playlist is empty.",
        "Add tracks from search results."
      );
    }
  });

  document.querySelectorAll(".filter-chip").forEach(chip => {
    chip.addEventListener("click", () => {
      document.querySelectorAll(".filter-chip").forEach(item => {
        item.classList.remove("active");
      });

      chip.classList.add("active");

      state.filter = chip.dataset.filter;

      if (state.filter === "all") {
        renderCards(
          $("#searchGrid"),
          state.results,
          "No music found.",
          "Try another search."
        );

      } else {
        const terms = {
          song: [],
          live: ["live"],
          remix: ["remix"],
          instrumental: ["instrumental", "karaoke", "piano"]
        }[state.filter];

        const filtered = state.results.filter(item =>
          terms.some(term =>
            item.title.toLowerCase().includes(term)
          )
        );

        renderCards(
          $("#searchGrid"),
          filtered,
          "No matching tracks.",
          "Try another filter or search."
        );
      }
    });
  });

  // Right-click on a music card to add the track to a playlist.
  document.addEventListener("contextmenu", event => {
    const card = event.target.closest(".music-card");

    if (!card) return;

    const id = card.querySelector("[data-play]")?.dataset.play;

    const video = [
      ...state.results,
      ...state.liked,
      ...state.recent
    ].find(item => item.id === id);

    if (video) {
      event.preventDefault();
      addToPlaylist(video);
    }
  });
}

async function checkApiStatus() {
  try {
    const data = await api("/api/status");

    $("#apiStatus").textContent = data.configured
      ? "Connected"
      : "API key missing";

    $("#apiStatus").style.color = data.configured
      ? "#9bd4ff"
      : "#ffd18a";

  } catch {
    $("#apiStatus").textContent = "Server offline";
  }
}

bindEvents();
loadYouTubeApi();
checkApiStatus();

setInterval(updateProgress, 1000);