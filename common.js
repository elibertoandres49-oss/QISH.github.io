/**
 * QISH 公共脚本 - 鼠标光效 / 侧边栏 / 认证导航 / 页面过渡
 * 各页面在 supabase 初始化后引入本文件
 */
(function () {
  const DEFAULT_AVATAR = "avatar.jpg";

  // 尽早应用主题，减少闪烁
  try {
    var _t = localStorage.getItem("qish_theme");
    if (_t === "light" || _t === "dark" || _t === "color") {
      document.documentElement.setAttribute("data-theme", _t);
    } else {
      document.documentElement.setAttribute("data-theme", "color");
    }
  } catch (e) {
    document.documentElement.setAttribute("data-theme", "color");
  }


  // ---------- 页面进入过渡 ----------
  document.documentElement.classList.add("js-ready");
  function onPageReady() {
    document.body.classList.add("page-ready");
    highlightCurrentNav();
    // 通用：角色立绘加载完成后从侧边滑入
    function activateChar(wrapId) {
      const wrap = document.getElementById(wrapId);
      const img = wrap ? wrap.querySelector("img") : null;
      if (!img || !wrap) return;
      img.onerror = function () {
        wrap.style.display = "none";
      };
      const show = function () {
        if (img.naturalWidth === 0 && img.complete) {
          wrap.style.display = "none";
          return;
        }
        // 页面就绪后再弹出，更顺滑
        setTimeout(function () {
          wrap.classList.add("active");
        }, 320);
      };
      if (img.complete) show();
      else img.addEventListener("load", show);
    }
    activateChar("rightImage");
    activateChar("leftImage");
  }
  if (document.readyState === "loading") {
    window.addEventListener("DOMContentLoaded", onPageReady);
  } else {
    onPageReady();
  }
  // 兜底：防止脚本异常导致页面一直透明
  setTimeout(function () { document.body.classList.add("page-ready"); }, 1200);

  // 点击站内链接时淡出，切换更顺滑
  document.addEventListener("click", (e) => {
    const a = e.target.closest("a[href]");
    if (!a) return;
    const href = a.getAttribute("href") || "";
    if (
      href.startsWith("http") ||
      href.startsWith("#") ||
      href.startsWith("mailto:") ||
      a.target === "_blank" ||
      e.metaKey ||
      e.ctrlKey ||
      e.shiftKey
    ) {
      return;
    }
    // 同页锚点不处理
    if (href === window.location.pathname.split("/").pop()) return;

    e.preventDefault();
    document.body.classList.remove("page-ready");
    document.body.classList.add("page-leaving");
    setTimeout(() => {
      window.location.href = href;
    }, 180);
  });

  function highlightCurrentNav() {
    const page = (location.pathname.split("/").pop() || "index.html").toLowerCase();
    document.querySelectorAll(".nav-links a, .panel-links a").forEach((a) => {
      const h = (a.getAttribute("href") || "").replace("./", "").toLowerCase();
      if (h === page || (page === "" && h === "index.html")) {
        a.classList.add("nav-active");
      }
    });
  }

  // ---------- 鼠标弹性光效 ----------
  function initMouseGlow() {
    const glow = document.getElementById("glow");
    if (!glow) return;
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      glow.style.display = "none";
      return;
    }
    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let currentX = mouseX;
    let currentY = mouseY;
    let velX = 0;
    let velY = 0;

    document.addEventListener(
      "mousemove",
      (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
      },
      { passive: true }
    );

    function animate() {
      const dx = mouseX - currentX;
      const dy = mouseY - currentY;
      velX += dx * 0.12;
      velY += dy * 0.12;
      velX *= 0.78;
      velY *= 0.78;
      currentX += velX;
      currentY += velY;
      const speed = Math.sqrt(velX * velX + velY * velY);
      const stretch = Math.min(speed * 0.08, 1.8);
      const angle = (Math.atan2(velY, velX) * 180) / Math.PI;
      glow.style.left = currentX + "px";
      glow.style.top = currentY + "px";
      glow.style.transform = `translate(-50%, -50%) rotate(${angle}deg) scaleX(${
        1 + stretch
      }) scaleY(${1 - stretch * 0.3})`;
      glow.style.borderRadius = stretch > 0.3 ? "40%" : "50%";
      requestAnimationFrame(animate);
    }
    requestAnimationFrame(animate);
  }

  // ---------- 侧边栏 ----------
  function initSidePanel() {
    const sidePanel = document.getElementById("sidePanel");
    const overlay = document.getElementById("overlay");
    const closeBtn = document.getElementById("closePanel");
    const navAvatar = document.getElementById("navAvatar");
    const rightImage = document.getElementById("rightImage");
    if (!sidePanel || !overlay) return;

    function openPanel() {
      sidePanel.classList.add("active");
      overlay.classList.add("active");
    }
    function closePanel() {
      sidePanel.classList.remove("active");
      overlay.classList.remove("active");
    }

    if (navAvatar) navAvatar.addEventListener("click", openPanel);
    if (closeBtn) closeBtn.addEventListener("click", closePanel);
    overlay.addEventListener("click", closePanel);
  }

  // ---------- 认证导航（各页可调用） ----------
  /**
   * @param {object} opts
   * @param {object} opts.supabase - supabase client
   * @param {function} [opts.onLogin] - 登录后回调 (user, profile)
   * @param {function} [opts.onLogout] - 登出后回调
   * @returns {Promise<{user, profile, nickname, avatar}>}
   */
  async function updateAuthNav(opts) {
    opts = opts || {};
    // 只用真正的 client，绝不用 SDK 命名空间 window.supabase
    let sb = opts.supabase || window.supabaseClient || window.__qish_sb;
    if (!sb || typeof sb.auth !== "object" || typeof sb.auth.getSession !== "function") {
      console.warn("[QISH] Supabase client 无效", sb);
      return { user: null };
    }

    const navAvatar = document.getElementById("navAvatar");
    const navNickname = document.getElementById("navNickname");
    const panelAvatar = document.getElementById("panelAvatar");
    const panelUsername = document.getElementById("panelUsername");
    const authNav = document.getElementById("auth-nav");
    const panelLinksBox = document.getElementById("panelLinksBox");

    let session = null;
    try {
      const { data, error } = await sb.auth.getSession();
      if (error) console.warn("[QISH] getSession error", error);
      session = data && data.session;
    } catch (e) {
      console.warn("[QISH] getSession exception", e);
    }
    // 兜底：有时 getSession 为空但 token 仍在
    if (!session) {
      try {
        const { data: udata } = await sb.auth.getUser();
        if (udata && udata.user) {
          session = { user: udata.user };
        }
      } catch (_) {}
    }

    const linksLoggedIn = `
      <a href="index.html">首页</a>
      <a href="about.html">关于我</a>
      <a href="projects.html">我的项目</a>
      <a href="userlist.html">用户列表</a>
      <a href="profile.html">个人资料</a>
      <a href="album.html">相册</a>
      <a href="chat.html">聊天室</a>
    `;
    const linksGuest = linksLoggedIn + `<a href="auth.html">登录/注册</a>`;

    if (session) {
      const user = session.user;
      let profile = null;
      try {
        const res = await sb
          .from("public_user_list")
          .select("avatar_url, nickname")
          .eq("user_id", user.id)
          .single();
        profile = res.data;
      } catch (_) {}

      const avatarUrl = (profile && profile.avatar_url) || DEFAULT_AVATAR;
      const nickname = (profile && profile.nickname) || "匿名用户";

      if (navAvatar) navAvatar.src = avatarUrl;
      if (panelAvatar) panelAvatar.src = avatarUrl;
      if (navNickname) {
        navNickname.textContent = nickname;
        navNickname.style.display = "block";
      }
      if (panelUsername) panelUsername.innerText = nickname;
      ensurePanelEmail(user.email || "");

      if (authNav) {
        // 导航栏只放退出，邮箱放到侧栏，移动端更干净
        authNav.innerHTML = `
          <button id="logoutBtn" type="button" class="nav-logout-btn">退出登录</button>
        `;
        const btn = document.getElementById("logoutBtn");
        if (btn) {
          btn.onclick = async () => {
            try {
              await sb.auth.signOut({ scope: "local" });
            } catch (_) {}
            window.location.replace("auth.html");
          };
        }
      }
      if (panelLinksBox) panelLinksBox.innerHTML = linksLoggedIn;

      highlightCurrentNav();
      if (typeof opts.onLogin === "function") opts.onLogin(user, profile);

      return { user, profile, nickname, avatar: avatarUrl };
    } else {
      if (navAvatar) navAvatar.src = DEFAULT_AVATAR;
      if (panelAvatar) panelAvatar.src = DEFAULT_AVATAR;
      if (navNickname) navNickname.style.display = "none";
      if (panelUsername) panelUsername.innerText = "QISH";
      ensurePanelEmail("");
      if (authNav) authNav.innerHTML = `<a href="auth.html">登录/注册</a>`;
      if (panelLinksBox) panelLinksBox.innerHTML = linksGuest;
      highlightCurrentNav();
      if (typeof opts.onLogout === "function") opts.onLogout();
      return { user: null };
    }
  }

  function ensurePanelEmail(email) {
    const panelContent = document.querySelector(".side-panel-content");
    if (!panelContent) return;
    let el = document.getElementById("panelEmail");
    if (!el) {
      el = document.createElement("p");
      el.id = "panelEmail";
      el.className = "panel-email";
      const uname = document.getElementById("panelUsername");
      if (uname && uname.parentNode) {
        uname.insertAdjacentElement("afterend", el);
      } else {
        panelContent.insertBefore(el, panelContent.querySelector(".panel-desc") || panelContent.querySelector(".panel-links"));
      }
    }
    if (email) {
      el.textContent = email;
      el.style.display = "";
    } else {
      el.textContent = "";
      el.style.display = "none";
    }
  }



  // ========== 音乐播放器 ==========
  const MUSIC_KEY = "qish_music_v1";
  const SYNC_CHANNEL = "qish_music_together";
  let audioEl = null;
  let musicState = {
    playlist: [],
    index: 0,
    currentTime: 0,
    playing: false,
    volume: 0.8,
    together: false,
  };
  let panelOpen = false;
  let syncChannel = null;
  let isChatPage = false;
  let applyingSync = false;

  function isAudioFile(name) {
    return /\.(mp3|wav|ogg|m4a|flac|aac|webm)$/i.test(name || "");
  }

  function loadMusicState() {
    try {
      const raw = localStorage.getItem(MUSIC_KEY);
      if (raw) {
        const s = JSON.parse(raw);
        musicState = Object.assign(musicState, s);
      }
    } catch (_) {}
  }

  function saveMusicState() {
    try {
      if (audioEl) musicState.currentTime = audioEl.currentTime || 0;
      localStorage.setItem(MUSIC_KEY, JSON.stringify({
        playlist: musicState.playlist,
        index: musicState.index,
        currentTime: musicState.currentTime,
        playing: musicState.playing,
        volume: musicState.volume,
        together: false, // together only in-session on chat page
      }));
    } catch (_) {}
  }

  function fmtTime(sec) {
    if (!isFinite(sec) || sec < 0) return "0:00";
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return m + ":" + String(s).padStart(2, "0");
  }

  function currentTrack() {
    if (!musicState.playlist.length) return null;
    const i = Math.max(0, Math.min(musicState.index, musicState.playlist.length - 1));
    return musicState.playlist[i];
  }

  function ensureAudio() {
    if (audioEl) return audioEl;
    audioEl = new Audio();
    audioEl.preload = "metadata";
    audioEl.volume = musicState.volume;
    audioEl.addEventListener("timeupdate", onTimeUpdate);
    audioEl.addEventListener("ended", onEnded);
    audioEl.addEventListener("play", () => {
      musicState.playing = true;
      updatePlayerUI();
      saveMusicState();
    });
    audioEl.addEventListener("pause", () => {
      if (!applyingSync) {
        musicState.playing = false;
        updatePlayerUI();
        saveMusicState();
      }
    });
    return audioEl;
  }

  function onTimeUpdate() {
    const prog = document.getElementById("qmProgress");
    const cur = document.getElementById("qmCurTime");
    const dur = document.getElementById("qmDurTime");
    if (!audioEl) return;
    if (prog && !prog.dataset.dragging) {
      const d = audioEl.duration || 0;
      prog.max = d || 0;
      prog.value = audioEl.currentTime || 0;
    }
    if (cur) cur.textContent = fmtTime(audioEl.currentTime);
    if (dur) dur.textContent = fmtTime(audioEl.duration);
    // 定期存档
    if (Math.floor(audioEl.currentTime) % 3 === 0) {
      musicState.currentTime = audioEl.currentTime;
    }
  }

  function onEnded() {
    if (musicState.playlist.length > 1) {
      playIndex((musicState.index + 1) % musicState.playlist.length, true);
    } else {
      musicState.playing = false;
      updatePlayerUI();
      saveMusicState();
    }
  }

  function playIndex(i, autoplay) {
    if (!musicState.playlist.length) return;
    musicState.index = ((i % musicState.playlist.length) + musicState.playlist.length) % musicState.playlist.length;
    const track = currentTrack();
    if (!track) return;
    const a = ensureAudio();
    const curSrc = a.src || "";
    const fname = (track.url || "").split("/").pop().split("?")[0];
    const same = curSrc === track.url || (fname && curSrc.includes(fname));
    if (!same) {
      a.src = track.url;
      a.load();
    }
    a.volume = musicState.volume;
    const seek = musicState.currentTime || 0;
    const doPlay = () => {
      if (seek > 0 && Math.abs((a.currentTime || 0) - seek) > 1) {
        try { a.currentTime = seek; } catch (_) {}
      }
      if (autoplay !== false && musicState.playing !== false) {
        a.play().then(() => {
          musicState.playing = true;
          updatePlayerUI();
          saveMusicState();
          if (musicState.together && isChatPage) broadcastSync();
        }).catch(() => {
          musicState.playing = false;
          updatePlayerUI();
        });
      } else {
        updatePlayerUI();
        saveMusicState();
      }
    };
    if (a.readyState >= 1) doPlay();
    else a.addEventListener("loadedmetadata", doPlay, { once: true });
  }

  function togglePlay() {
    const a = ensureAudio();
    const track = currentTrack();
    if (!track) {
      alert("播放列表为空，可在聊天室把音频文件加入播放列表");
      return;
    }
    if (!a.src || a.src !== track.url) {
      musicState.playing = true;
      musicState.currentTime = musicState.currentTime || 0;
      playIndex(musicState.index, true);
      return;
    }
    if (a.paused) {
      a.play().then(() => {
        musicState.playing = true;
        updatePlayerUI();
        saveMusicState();
        if (musicState.together && isChatPage) broadcastSync();
      }).catch((e) => alert("播放失败：" + (e.message || "")));
    } else {
      a.pause();
      musicState.playing = false;
      musicState.currentTime = a.currentTime;
      updatePlayerUI();
      saveMusicState();
      if (musicState.together && isChatPage) broadcastSync();
    }
  }

  function addToPlaylist(url, name, playNow) {
    if (!url) return;
    const exists = musicState.playlist.findIndex((t) => t.url === url);
    if (exists >= 0) {
      if (playNow) {
        musicState.index = exists;
        musicState.currentTime = 0;
        musicState.playing = true;
        playIndex(exists, true);
      }
      updatePlayerUI();
      return exists;
    }
    musicState.playlist.push({
      id: Date.now() + "_" + Math.random().toString(36).slice(2, 7),
      url,
      name: name || "未知曲目",
    });
    if (playNow || musicState.playlist.length === 1) {
      musicState.index = musicState.playlist.length - 1;
      musicState.currentTime = 0;
      musicState.playing = true;
      playIndex(musicState.index, true);
    }
    saveMusicState();
    updatePlayerUI();
    return musicState.playlist.length - 1;
  }

  function removeFromPlaylist(id) {
    const i = musicState.playlist.findIndex((t) => t.id === id);
    if (i < 0) return;
    const wasCurrent = i === musicState.index;
    musicState.playlist.splice(i, 1);
    if (!musicState.playlist.length) {
      musicState.index = 0;
      musicState.playing = false;
      musicState.currentTime = 0;
      if (audioEl) {
        audioEl.pause();
        audioEl.removeAttribute("src");
      }
    } else {
      if (i < musicState.index) musicState.index--;
      else if (wasCurrent) {
        musicState.index = Math.min(i, musicState.playlist.length - 1);
        musicState.currentTime = 0;
        if (musicState.playing) playIndex(musicState.index, true);
      }
    }
    saveMusicState();
    updatePlayerUI();
  }

  function updatePlayerUI() {
    const track = currentTrack();
    const title = document.getElementById("qmMiniTitle");
    const sub = document.getElementById("qmMiniSub");
    const playBtn = document.getElementById("qmMiniPlay");
    const disc = document.getElementById("qmMiniDisc");
    const nowName = document.getElementById("qmNowName");
    const nowMeta = document.getElementById("qmNowMeta");
    const panelPlay = document.getElementById("qmPanelPlay");
    const bigDisc = document.getElementById("qmNowDisc");
    const modeTag = document.getElementById("qmModeTag");
    const listEl = document.getElementById("qmPlaylist");
    const playing = musicState.playing && audioEl && !audioEl.paused;

    if (title) title.textContent = track ? track.name : "暂无歌曲";
    if (sub) sub.textContent = track
      ? (musicState.playlist.length + " 首 · 点击展开")
      : "点击展开";
    if (playBtn) playBtn.textContent = playing ? "⏸" : "▶";
    if (panelPlay) panelPlay.textContent = playing ? "⏸" : "▶";
    if (disc) disc.classList.toggle("spinning", !!playing);
    if (bigDisc) bigDisc.classList.toggle("spinning", !!playing);
    if (nowName) nowName.textContent = track ? track.name : "暂无歌曲";
    if (nowMeta) {
      nowMeta.textContent = track
        ? ("第 " + (musicState.index + 1) + " / " + musicState.playlist.length + " 首")
        : "从聊天室添加音频即可播放";
    }
    if (modeTag) {
      if (musicState.together && isChatPage) {
        modeTag.textContent = "一起听";
        modeTag.className = "qm-mode-tag together";
        modeTag.style.display = "";
      } else {
        modeTag.textContent = "本地";
        modeTag.className = "qm-mode-tag";
        modeTag.style.display = track ? "" : "none";
      }
    }
    if (listEl) {
      if (!musicState.playlist.length) {
        listEl.innerHTML = '<div class="qm-empty">播放列表为空<br>在聊天室发送音频后可添加</div>';
      } else {
        listEl.innerHTML = musicState.playlist.map((t, idx) => {
          const active = idx === musicState.index ? " active" : "";
          return '<div class="qm-pl-item' + active + '" data-idx="' + idx + '">' +
            '<span class="qm-pl-name">' + escapeMusic(t.name) + '</span>' +
            '<button type="button" class="qm-pl-del" data-id="' + t.id + '" title="移除">×</button></div>';
        }).join("");
        listEl.querySelectorAll(".qm-pl-item").forEach((el) => {
          el.addEventListener("click", (e) => {
            if (e.target.classList.contains("qm-pl-del")) return;
            const idx = parseInt(el.dataset.idx, 10);
            musicState.currentTime = 0;
            musicState.playing = true;
            playIndex(idx, true);
          });
        });
        listEl.querySelectorAll(".qm-pl-del").forEach((btn) => {
          btn.addEventListener("click", (e) => {
            e.stopPropagation();
            removeFromPlaylist(btn.dataset.id);
          });
        });
      }
    }
  }

  function escapeMusic(s) {
    const d = document.createElement("div");
    d.textContent = s || "";
    return d.innerHTML;
  }


  function injectMusicStyles() {
    if (document.getElementById("qmPlayerStyles")) return;
    const css = `
.qm-player{position:fixed;right:20px;bottom:20px;z-index:9000;font-family:"Microsoft YaHei","PingFang SC",sans-serif;user-select:none}
.qm-mini{display:flex;align-items:center;gap:10px;padding:10px 14px;border-radius:999px;background:rgba(255,255,255,0.22);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,0.4);box-shadow:0 8px 32px rgba(0,0,0,0.15);cursor:pointer;transition:transform .25s ease,box-shadow .25s ease;max-width:260px}
.qm-mini:hover{transform:translateY(-2px);box-shadow:0 12px 36px rgba(0,0,0,0.2)}
.qm-disc{width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#60a5fa,#93c5fd);display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:0 2px 8px rgba(96,165,250,0.4);position:relative}
.qm-disc.spinning{animation:qm-spin 3s linear infinite}
@keyframes qm-spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
.qm-disc-inner{width:12px;height:12px;border-radius:50%;background:rgba(255,255,255,0.85)}
.qm-mini-info{flex:1;min-width:0}
.qm-mini-title{font-size:13px;font-weight:600;color:#1e293b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.qm-mini-sub{font-size:11px;color:#64748b;margin-top:1px}
.qm-mini-btn{width:32px;height:32px;border:none;border-radius:50%;background:linear-gradient(135deg,#60a5fa,#93c5fd);color:#fff;font-size:12px;cursor:pointer;flex-shrink:0;display:flex;align-items:center;justify-content:center;transition:transform .2s}
.qm-mini-btn:hover{transform:scale(1.08)}
.qm-panel{position:absolute;right:0;bottom:58px;width:300px;background:rgba(255,255,255,0.28);backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);border:1px solid rgba(255,255,255,0.4);border-radius:20px;box-shadow:0 12px 40px rgba(0,0,0,0.18);padding:16px;opacity:0;visibility:hidden;transform:translateY(12px) scale(0.96);transition:all .28s cubic-bezier(0.22,1,0.36,1);pointer-events:none}
.qm-panel.open{opacity:1;visibility:visible;transform:translateY(0) scale(1);pointer-events:auto}
.qm-panel-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px}
.qm-panel-head h4{margin:0;font-size:15px;color:#1e293b;font-weight:700}
.qm-close{width:28px;height:28px;border:none;border-radius:50%;background:rgba(255,255,255,0.4);cursor:pointer;font-size:16px;color:#334155;line-height:1}
.qm-now{text-align:center;margin-bottom:12px}
.qm-now-disc{width:72px;height:72px;border-radius:50%;margin:0 auto 10px;background:linear-gradient(135deg,#60a5fa,#93c5fd);display:flex;align-items:center;justify-content:center;box-shadow:0 6px 20px rgba(96,165,250,0.35)}
.qm-now-disc.spinning{animation:qm-spin 3s linear infinite}
.qm-now-disc-inner{width:22px;height:22px;border-radius:50%;background:rgba(255,255,255,0.9)}
.qm-now-name{font-size:14px;font-weight:600;color:#1e293b;word-break:break-all;max-height:2.6em;overflow:hidden}
.qm-now-meta{font-size:12px;color:#64748b;margin-top:4px}
.qm-progress-wrap{margin:12px 0 6px}
.qm-progress{width:100%;height:6px;border-radius:999px;background:rgba(0,0,0,0.1);cursor:pointer;appearance:none;outline:none}
.qm-progress::-webkit-slider-thumb{appearance:none;width:14px;height:14px;border-radius:50%;background:#60a5fa;cursor:pointer;box-shadow:0 1px 4px rgba(0,0,0,0.2)}
.qm-time-row{display:flex;justify-content:space-between;font-size:11px;color:#64748b;margin-bottom:10px}
.qm-controls{display:flex;align-items:center;justify-content:center;gap:12px;margin-bottom:12px}
.qm-ctrl{width:40px;height:40px;border:none;border-radius:50%;background:rgba(255,255,255,0.45);color:#1e293b;font-size:15px;cursor:pointer;transition:.2s;display:flex;align-items:center;justify-content:center}
.qm-ctrl:hover{background:rgba(255,255,255,0.7);transform:scale(1.06)}
.qm-ctrl.primary{width:48px;height:48px;background:linear-gradient(135deg,#60a5fa,#93c5fd);color:#fff;font-size:16px}
.qm-vol-row{display:flex;align-items:center;gap:8px;margin-bottom:12px}
.qm-vol-row span{font-size:14px}
.qm-vol{flex:1;height:5px;appearance:none;border-radius:999px;background:rgba(0,0,0,0.1);outline:none;cursor:pointer}
.qm-vol::-webkit-slider-thumb{appearance:none;width:12px;height:12px;border-radius:50%;background:#93c5fd;cursor:pointer}
.qm-playlist{max-height:140px;overflow-y:auto;border-top:1px solid rgba(255,255,255,0.3);padding-top:10px}
.qm-pl-item{display:flex;align-items:center;gap:8px;padding:7px 8px;border-radius:10px;font-size:12px;color:#334155;cursor:pointer;transition:background .15s}
.qm-pl-item:hover{background:rgba(255,255,255,0.35)}
.qm-pl-item.active{background:rgba(96,165,250,0.22);font-weight:600;color:#1e293b}
.qm-pl-item .qm-pl-name{flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.qm-pl-del{border:none;background:transparent;color:#94a3b8;cursor:pointer;font-size:14px;padding:0 4px}
.qm-pl-del:hover{color:#e53e3e}
.qm-empty{text-align:center;font-size:12px;color:#64748b;padding:12px 0}
.qm-mode-tag{display:inline-block;font-size:10px;padding:2px 8px;border-radius:999px;background:rgba(96,165,250,0.2);color:#6b21a8;margin-left:6px;font-weight:600}
.qm-mode-tag.together{background:rgba(34,197,94,0.2);color:#166534}
@media (max-width:640px){.qm-player{right:12px;bottom:12px}.qm-panel{width:min(300px,calc(100vw - 24px))}.qm-mini{max-width:200px;padding:8px 12px}}
/* 相册深色背景适配：文字更深、玻璃更亮 */
body.album-page .qm-mini,
body.album-page .qm-panel{
  background:rgba(255,255,255,0.88);
  border-color:rgba(255,255,255,0.7);
  box-shadow:0 10px 40px rgba(0,0,0,0.25);
}
body.album-page .qm-mini-title,
body.album-page .qm-panel-head h4,
body.album-page .qm-now-name,
body.album-page .qm-pl-item.active{color:#1e293b}
body.album-page .qm-mini-sub,
body.album-page .qm-now-meta,
body.album-page .qm-time-row,
body.album-page .qm-empty{color:#64748b}
`;
    const style = document.createElement("style");
    style.id = "qmPlayerStyles";
    style.textContent = css;
    document.head.appendChild(style);
  }

  function createPlayerDOM() {
    injectMusicStyles();
    if (document.getElementById("qmPlayer")) return;
    const wrap = document.createElement("div");
    wrap.className = "qm-player";
    wrap.id = "qmPlayer";
    wrap.innerHTML =
      '<div class="qm-panel" id="qmPanel">' +
        '<div class="qm-panel-head">' +
          '<h4>音乐播放器 <span id="qmModeTag" class="qm-mode-tag" style="display:none">本地</span></h4>' +
          '<button type="button" class="qm-close" id="qmClose">×</button>' +
        '</div>' +
        '<div class="qm-now">' +
          '<div class="qm-now-disc" id="qmNowDisc"><div class="qm-now-disc-inner"></div></div>' +
          '<div class="qm-now-name" id="qmNowName">暂无歌曲</div>' +
          '<div class="qm-now-meta" id="qmNowMeta">从聊天室添加音频即可播放</div>' +
        '</div>' +
        '<div class="qm-progress-wrap">' +
          '<input type="range" class="qm-progress" id="qmProgress" min="0" max="0" value="0" step="0.1">' +
        '</div>' +
        '<div class="qm-time-row"><span id="qmCurTime">0:00</span><span id="qmDurTime">0:00</span></div>' +
        '<div class="qm-controls">' +
          '<button type="button" class="qm-ctrl" id="qmPrev" title="上一首">⏮</button>' +
          '<button type="button" class="qm-ctrl primary" id="qmPanelPlay" title="播放/暂停">▶</button>' +
          '<button type="button" class="qm-ctrl" id="qmNext" title="下一首">⏭</button>' +
        '</div>' +
        '<div class="qm-vol-row">' +
          '<span>🔊</span>' +
          '<input type="range" class="qm-vol" id="qmVol" min="0" max="1" step="0.01" value="0.8">' +
        '</div>' +
        '<div class="qm-playlist" id="qmPlaylist"></div>' +
      '</div>' +
      '<div class="qm-mini" id="qmMini">' +
        '<div class="qm-disc" id="qmMiniDisc"><div class="qm-disc-inner"></div></div>' +
        '<div class="qm-mini-info">' +
          '<div class="qm-mini-title" id="qmMiniTitle">暂无歌曲</div>' +
          '<div class="qm-mini-sub" id="qmMiniSub">点击展开</div>' +
        '</div>' +
        '<button type="button" class="qm-mini-btn" id="qmMiniPlay">▶</button>' +
      '</div>';
    document.body.appendChild(wrap);

    document.getElementById("qmMini").addEventListener("click", (e) => {
      if (e.target.id === "qmMiniPlay" || e.target.closest("#qmMiniPlay")) return;
      panelOpen = !panelOpen;
      document.getElementById("qmPanel").classList.toggle("open", panelOpen);
    });
    document.getElementById("qmMiniPlay").addEventListener("click", (e) => {
      e.stopPropagation();
      togglePlay();
    });
    document.getElementById("qmClose").addEventListener("click", () => {
      panelOpen = false;
      document.getElementById("qmPanel").classList.remove("open");
    });
    document.getElementById("qmPanelPlay").addEventListener("click", togglePlay);
    document.getElementById("qmPrev").addEventListener("click", () => {
      if (!musicState.playlist.length) return;
      musicState.currentTime = 0;
      musicState.playing = true;
      playIndex(musicState.index - 1, true);
    });
    document.getElementById("qmNext").addEventListener("click", () => {
      if (!musicState.playlist.length) return;
      musicState.currentTime = 0;
      musicState.playing = true;
      playIndex(musicState.index + 1, true);
    });
    const prog = document.getElementById("qmProgress");
    prog.addEventListener("input", () => { prog.dataset.dragging = "1"; });
    prog.addEventListener("change", () => {
      if (audioEl) {
        audioEl.currentTime = parseFloat(prog.value) || 0;
        musicState.currentTime = audioEl.currentTime;
        saveMusicState();
        if (musicState.together && isChatPage) broadcastSync();
      }
      delete prog.dataset.dragging;
    });
    document.getElementById("qmVol").addEventListener("input", (e) => {
      musicState.volume = parseFloat(e.target.value);
      if (audioEl) audioEl.volume = musicState.volume;
      saveMusicState();
    });
  }

  function broadcastSync() {
    if (!syncChannel || !isChatPage) return;
    const track = currentTrack();
    if (!track) return;
    const payload = {
      url: track.url,
      name: track.name,
      position: audioEl ? audioEl.currentTime : 0,
      playing: musicState.playing && audioEl && !audioEl.paused,
      ts: Date.now(),
    };
    try {
      syncChannel.send({
        type: "broadcast",
        event: "music_sync",
        payload,
      });
    } catch (_) {}
  }

  function applySync(payload) {
    if (!payload || !payload.url) return;
    applyingSync = true;
    musicState.together = true;
    const idx = musicState.playlist.findIndex((t) => t.url === payload.url);
    if (idx < 0) {
      musicState.playlist.push({
        id: "sync_" + Date.now(),
        url: payload.url,
        name: payload.name || "一起听曲目",
      });
      musicState.index = musicState.playlist.length - 1;
    } else {
      musicState.index = idx;
    }
    musicState.currentTime = payload.position || 0;
    musicState.playing = !!payload.playing;
    const a = ensureAudio();
    if (a.src !== payload.url) {
      a.src = payload.url;
      a.load();
    }
    const afterMeta = () => {
      try { a.currentTime = payload.position || 0; } catch (_) {}
      if (payload.playing) {
        a.play().catch(() => {});
      } else {
        a.pause();
      }
      updatePlayerUI();
      applyingSync = false;
    };
    if (a.readyState >= 1) afterMeta();
    else a.addEventListener("loadedmetadata", afterMeta, { once: true });
  }

  function initMusicSync(supabaseClient) {
    if (!isChatPage || !supabaseClient || !supabaseClient.channel) return;
    if (syncChannel) {
      try { supabaseClient.removeChannel(syncChannel); } catch (_) {}
    }
    syncChannel = supabaseClient
      .channel(SYNC_CHANNEL)
      .on("broadcast", { event: "music_sync" }, ({ payload }) => {
        applySync(payload);
      })
      .subscribe();
  }

  function initMusicPlayer(opts) {
    opts = opts || {};
    isChatPage = !!opts.isChatPage;
    loadMusicState();
    createPlayerDOM();
    document.getElementById("qmVol").value = musicState.volume;
    updatePlayerUI();

    // 恢复播放
    if (musicState.playlist.length && currentTrack()) {
      const a = ensureAudio();
      a.src = currentTrack().url;
      a.volume = musicState.volume;
      a.addEventListener("loadedmetadata", () => {
        try { a.currentTime = musicState.currentTime || 0; } catch (_) {}
        if (musicState.playing) {
          a.play().then(() => updatePlayerUI()).catch(() => {
            musicState.playing = false;
            updatePlayerUI();
          });
        }
        updatePlayerUI();
      }, { once: true });
      a.load();
    }

    // 离开页面前保存进度
    window.addEventListener("beforeunload", saveMusicState);
    window.addEventListener("pagehide", saveMusicState);

    // 站内跳转前也保存（common 的淡出导航）
    document.addEventListener("click", (e) => {
      const a = e.target.closest("a[href]");
      if (a && a.getAttribute("href") && !a.getAttribute("href").startsWith("http")) {
        saveMusicState();
      }
    }, true);

    if (isChatPage && opts.supabase) {
      initMusicSync(opts.supabase);
    }

    // 对外 API
    window.QISHMusic = {
      addToPlaylist,
      isAudioFile,
      playTogether(url, name) {
        musicState.together = true;
        addToPlaylist(url, name, true);
        if (isChatPage) {
          setTimeout(broadcastSync, 400);
        }
      },
      getState: () => musicState,
      togglePlay,
    };
  }


  // ========== 首页公告 ==========
  const ANNOUNCE_KEY = "qish_announce_hide_date";
  // 可在此修改公告内容
  const ANNOUNCE_CONFIG = {
    title: "网站公告",
    body: "欢迎来到 QISH 小站～\n\n• 聊天室支持发图、文件与一起听歌\n• 右下角可使用音乐播放器\n• 有问题可以在聊天室留言\n\n祝你玩得开心！",
    onlyHome: true, // 仅首页弹出
  };

  function todayStr() {
    const d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }

  function shouldShowAnnounce() {
    try {
      const hide = localStorage.getItem(ANNOUNCE_KEY);
      if (hide && hide === todayStr()) return false;
    } catch (_) {}
    return true;
  }

  function closeAnnounce(mask, rememberToday) {
    if (!mask) return;
    mask.classList.remove("show");
    setTimeout(() => {
      if (mask.parentNode) mask.parentNode.removeChild(mask);
    }, 380);
    if (rememberToday) {
      try {
        localStorage.setItem(ANNOUNCE_KEY, todayStr());
      } catch (_) {}
    }
  }

  function showAnnounce() {
    if (document.getElementById("qmAnnounceMask")) return;
    const mask = document.createElement("div");
    mask.className = "qm-announce-mask";
    mask.id = "qmAnnounceMask";
    mask.innerHTML =
      '<div class="qm-announce-box" role="dialog" aria-modal="true" aria-labelledby="qmAnnounceTitle">' +
        '<div class="qm-announce-badge">📢 公告</div>' +
        '<h3 class="qm-announce-title" id="qmAnnounceTitle"></h3>' +
        '<div class="qm-announce-body" id="qmAnnounceBody"></div>' +
        '<div class="qm-announce-actions">' +
          '<button type="button" class="qm-announce-btn cancel" id="qmAnnounceCancel">取消</button>' +
          '<button type="button" class="qm-announce-btn today" id="qmAnnounceToday">本日不再提醒</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(mask);
    document.getElementById("qmAnnounceTitle").textContent = ANNOUNCE_CONFIG.title;
    document.getElementById("qmAnnounceBody").textContent = ANNOUNCE_CONFIG.body;

    // 下一帧再加 show，触发过渡动画
    requestAnimationFrame(() => {
      requestAnimationFrame(() => mask.classList.add("show"));
    });

    document.getElementById("qmAnnounceCancel").onclick = () => closeAnnounce(mask, false);
    document.getElementById("qmAnnounceToday").onclick = () => closeAnnounce(mask, true);
    // 点击遮罩空白处 = 取消
    mask.addEventListener("click", (e) => {
      if (e.target === mask) closeAnnounce(mask, false);
    });
    // Esc 关闭
    const onKey = (e) => {
      if (e.key === "Escape") {
        closeAnnounce(mask, false);
        document.removeEventListener("keydown", onKey);
      }
    };
    document.addEventListener("keydown", onKey);
  }

  function initAnnounce() {
    const page = (location.pathname.split("/").pop() || "index.html").toLowerCase();
    const isHome = page === "index.html" || page === "" || page === "/";
    if (ANNOUNCE_CONFIG.onlyHome && !isHome) return;
    if (!shouldShowAnnounce()) return;
    // 等页面淡入完成后再弹，更顺滑
    setTimeout(showAnnounce, 450);
  }


  // ========== 新消息通知 ==========
  const LAST_CHAT_CHECK_KEY = "qish_last_chat_check";
  const NEWMSG_QUERY_LIMIT = 500; // 单次查询上限保护

  function getLastChatCheck() {
    try {
      const v = localStorage.getItem(LAST_CHAT_CHECK_KEY);
      if (v) {
        const n = parseInt(v, 10);
        if (!isNaN(n) && n > 0) return n;
      }
    } catch (_) {}
    return 0;
  }

  function setLastChatCheck(ts) {
    try {
      localStorage.setItem(LAST_CHAT_CHECK_KEY, String(ts || Date.now()));
    } catch (_) {}
  }

  // 数字滚动动画：从 0 滚动到 target
  function animateNumber(el, target, duration) {
    if (!el) return;
    duration = duration || 1200;
    target = Math.max(0, Math.floor(target));
    const startTime = performance.now();
    el.classList.add("rolling");
    function tick(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // easeOutCubic，末尾减速
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.floor(target * eased);
      el.textContent = current;
      if (progress < 1) {
        requestAnimationFrame(tick);
      } else {
        el.textContent = target;
        el.classList.remove("rolling");
      }
    }
    requestAnimationFrame(tick);
  }

  // 查询 Supabase 中 since 之后的新消息数量
  async function fetchNewMsgCount(supabase, sinceTs) {
    if (!supabase || !sinceTs) return 0;
    try {
      const sinceISO = new Date(sinceTs).toISOString();
      const { count, error } = await supabase
        .from("public_messages")
        .select("*", { count: "exact", head: true })
        .gt("created_at", sinceISO)
        .limit(NEWMSG_QUERY_LIMIT);
      if (error) {
        console.warn("[新消息通知] 查询失败:", error.message);
        return 0;
      }
      return Math.min(count || 0, NEWMSG_QUERY_LIMIT);
    } catch (e) {
      console.warn("[新消息通知] 查询异常:", e);
      return 0;
    }
  }

  // 吸入动画 + 跳转
  function suckInAndNavigate(mask, box) {
    if (!mask || !box) return;
    // 创建中心漩涡
    const vortex = document.createElement("div");
    vortex.className = "qish-msg-vortex";
    document.body.appendChild(vortex);
    // 创建闪白层
    const flash = document.createElement("div");
    flash.className = "qish-msg-flash";
    document.body.appendChild(flash);

    // 下一帧触发动画
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        vortex.classList.add("active");
        flash.classList.add("active");
        box.classList.add("sucking");
        // 遮罩渐隐
        mask.style.transition = "opacity 0.6s ease";
        mask.style.opacity = "0";
      });
    });

    // 动画结束后跳转
    setTimeout(() => {
      setLastChatCheck(Date.now());
      window.location.href = "chat.html";
    }, 820);
  }

  // 显示新消息通知弹窗
  function showNewMsgNotifier(count, supabase) {
    if (document.getElementById("qishMsgMask")) return;
    count = Math.max(1, Math.floor(count));

    const mask = document.createElement("div");
    mask.className = "qish-msg-mask";
    mask.id = "qishMsgMask";
    mask.innerHTML =
      '<div class="qish-msg-box" role="dialog" aria-modal="true">' +
        '<div class="qish-msg-icon" style="position:relative;">' +
          '💬' +
          '<span class="qish-msg-dot" id="qishMsgDot">' + count + '</span>' +
        '</div>' +
        '<h3 class="qish-msg-title">聊天室有新消息</h3>' +
        '<p class="qish-msg-desc">你离开期间大家聊了很多，快来看看吧～</p>' +
        '<div class="qish-msg-number-wrap">' +
          '<span class="qish-msg-number" id="qishMsgNumber">0</span>' +
          '<span class="qish-msg-unit">条新消息</span>' +
        '</div>' +
        '<div class="qish-msg-actions">' +
          '<button type="button" class="qish-msg-btn ignore" id="qishMsgIgnore">稍后再说</button>' +
          '<button type="button" class="qish-msg-btn go" id="qishMsgGo">去看看</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(mask);

    const box = mask.querySelector(".qish-msg-box");
    const numEl = document.getElementById("qishMsgNumber");

    // 触发入场动画
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        mask.classList.add("show");
        // 入场动画完成后开始数字滚动
        setTimeout(() => animateNumber(numEl, count, 1200), 350);
      });
    });

    // 去看看：吸入动画 + 跳转
    document.getElementById("qishMsgGo").addEventListener("click", () => {
      document.getElementById("qishMsgGo").disabled = true;
      document.getElementById("qishMsgIgnore").disabled = true;
      suckInAndNavigate(mask, box);
    });

    // 忽略：关闭并标记已读
    function closeNotifier() {
      mask.classList.remove("show");
      setTimeout(() => {
        if (mask.parentNode) mask.parentNode.removeChild(mask);
      }, 400);
      setLastChatCheck(Date.now());
    }
    document.getElementById("qishMsgIgnore").addEventListener("click", closeNotifier);
    mask.addEventListener("click", (e) => {
      if (e.target === mask) closeNotifier();
    });
    // Esc 关闭
    const onKey = (e) => {
      if (e.key === "Escape") {
        closeNotifier();
        document.removeEventListener("keydown", onKey);
      }
    };
    document.addEventListener("keydown", onKey);
  }

  // 初始化：仅主页检查新消息
  async function initNewMsgNotifier() {
    const page = (location.pathname.split("/").pop() || "index.html").toLowerCase();
    const isHome = page === "index.html" || page === "" || page === "/";

    // 聊天页面：更新最后查看时间（进过聊天室就标记为已读）
    if (page === "chat.html") {
      setLastChatCheck(Date.now());
      return;
    }
    if (!isHome) return;

    const supabase = window.supabaseClient || window.__qish_sb || null;
    if (!supabase) return;

    const lastCheck = getLastChatCheck();
    // 首次访问：不弹通知，直接记录当前时间
    if (!lastCheck) {
      setLastChatCheck(Date.now());
      return;
    }

    // 等页面淡入 + 公告可能弹出后，再检查（避免和公告弹窗打架）
    setTimeout(async () => {
      // 如果公告弹窗正在显示，等它关闭再弹
      const announce = document.getElementById("qmAnnounceMask");
      if (announce && announce.classList.contains("show")) {
        // 监听公告关闭
        const observer = new MutationObserver(() => {
          if (!document.getElementById("qmAnnounceMask")) {
            observer.disconnect();
            doCheck();
          }
        });
        observer.observe(document.body, { childList: true, subtree: false });
        return;
      }
      doCheck();
    }, 700);

    async function doCheck() {
      const count = await fetchNewMsgCount(supabase, lastCheck);
      if (count > 0) {
        showNewMsgNotifier(count, supabase);
      }
    }
  }


  // ========== PWA ==========
  function initPWA() {
    // manifest + theme
    if (!document.querySelector('link[rel="manifest"]')) {
      const link = document.createElement("link");
      link.rel = "manifest";
      link.href = "manifest.json";
      document.head.appendChild(link);
    }
    if (!document.querySelector('meta[name="theme-color"]')) {
      const meta = document.createElement("meta");
      meta.name = "theme-color";
      meta.content = "#60a5fa";
      document.head.appendChild(meta);
    }
    if (!document.querySelector('link[rel="apple-touch-icon"]')) {
      const apple = document.createElement("link");
      apple.rel = "apple-touch-icon";
      apple.href = "apple-touch-icon.png";
      document.head.appendChild(apple);
    }
    // iOS 接近 App 体验
    if (!document.querySelector('meta[name="apple-mobile-web-app-capable"]')) {
      const m1 = document.createElement("meta");
      m1.name = "apple-mobile-web-app-capable";
      m1.content = "yes";
      document.head.appendChild(m1);
      const m2 = document.createElement("meta");
      m2.name = "apple-mobile-web-app-status-bar-style";
      m2.content = "default";
      document.head.appendChild(m2);
      const m3 = document.createElement("meta");
      m3.name = "mobile-web-app-capable";
      m3.content = "yes";
      document.head.appendChild(m3);
    }
    // Service Worker（需 HTTPS 或 localhost）
    if ("serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker.register("./sw.js").catch((e) => {
          console.warn("SW 注册失败（需 HTTPS 或 localhost）:", e);
        });
      });
    }
  }


  // ========== 主题 ==========
  const THEME_KEY = "qish_theme";
  const CUSTOM_BG_KEY = "qish_custom_bg";
  const THEMES = ["color", "light", "dark", "custom"];

  function getSavedTheme() {
    try {
      const t = localStorage.getItem(THEME_KEY);
      if (THEMES.includes(t)) return t;
    } catch (_) {}
    return "color";
  }

  function getCustomBg() {
    try {
      return localStorage.getItem(CUSTOM_BG_KEY) || "";
    } catch (_) {
      return "";
    }
  }

  function setCustomBg(dataUrl) {
    try {
      if (dataUrl) {
        localStorage.setItem(CUSTOM_BG_KEY, dataUrl);
      } else {
        localStorage.removeItem(CUSTOM_BG_KEY);
      }
      return true;
    } catch (e) {
      console.warn("[主题] 自定义背景保存失败（可能超出 localStorage 容量）:", e);
      return false;
    }
  }

  function applyTheme(name) {
    if (!THEMES.includes(name)) name = "color";
    document.documentElement.setAttribute("data-theme", name);
    try {
      localStorage.setItem(THEME_KEY, name);
    } catch (_) {}
    // 自定义主题：应用用户背景图
    if (name === "custom") {
      const bg = getCustomBg();
      if (bg) {
        document.documentElement.style.setProperty("--custom-bg", `url("${bg}")`);
      } else {
        document.documentElement.style.removeProperty("--custom-bg");
      }
    } else {
      document.documentElement.style.removeProperty("--custom-bg");
    }
    document.querySelectorAll(".theme-opt").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.theme === name);
    });
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.content = name === "dark" ? "#0b0f14" : name === "light" ? "#f5f6f8" : "#60a5fa";
    }
    // 相册页使用独立 CSS 变量，需单独同步
    applyAlbumTheme(name);
  }

  function applyAlbumTheme(name) {
    const root = document.documentElement;
    const body = document.body;
    if (!body || !body.classList.contains("album-page")) {
      // 仍写入变量，进入相册时即可用
    }
    const map = {
      color: {
        "--gradient-start": "#bae6fd",
        "--gradient-mid": "#93c5fd",
        "--gradient-end": "#dbeafe",
        "--glass-bg": "rgba(255, 255, 255, 0.18)",
        "--glass-bg-strong": "rgba(255, 255, 255, 0.28)",
        "--glass-border": "rgba(255, 255, 255, 0.35)",
        "--text-main": "#ffffff",
        "--text-sub": "rgba(255, 255, 255, 0.85)",
        "--shadow": "0 8px 32px rgba(0, 0, 0, 0.15)",
        "--album-bg": "radial-gradient(circle at 10% 20%, rgba(96, 165, 250, 0.85), transparent 50%), radial-gradient(circle at 90% 10%, rgba(59, 130, 246, 0.7), transparent 50%), radial-gradient(circle at 50% 90%, rgba(147, 197, 253, 0.8), transparent 50%), linear-gradient(135deg, #60a5fa 0%, #3b82f6 50%, #93c5fd 100%)",
      },
      light: {
        "--gradient-start": "#e2e8f0",
        "--gradient-mid": "#f1f5f9",
        "--gradient-end": "#ffffff",
        "--glass-bg": "rgba(255, 255, 255, 0.85)",
        "--glass-bg-strong": "rgba(255, 255, 255, 0.95)",
        "--glass-border": "rgba(15, 23, 42, 0.1)",
        "--text-main": "#0f172a",
        "--text-sub": "#64748b",
        "--shadow": "0 8px 28px rgba(15, 23, 42, 0.08)",
        "--album-bg": "#f5f6f8",
      },
      dark: {
        "--gradient-start": "#1e293b",
        "--gradient-mid": "#0f172a",
        "--gradient-end": "#020617",
        "--glass-bg": "rgba(30, 41, 59, 0.75)",
        "--glass-bg-strong": "rgba(30, 41, 59, 0.9)",
        "--glass-border": "rgba(255, 255, 255, 0.12)",
        "--text-main": "#e2e8f0",
        "--text-sub": "#94a3b8",
        "--shadow": "0 8px 32px rgba(0, 0, 0, 0.45)",
        "--album-bg": "#0b0f14",
      },
    };
    const vars = map[name] || map.color;
    Object.keys(vars).forEach((k) => {
      root.style.setProperty(k, vars[k]);
      if (body) body.style.setProperty(k, vars[k]);
    });
    if (body && body.classList.contains("album-page")) {
      body.style.background = vars["--album-bg"];
      body.style.color = vars["--text-main"];
    }
  }


  function initThemeSwitcher() {
    applyTheme(getSavedTheme());
    if (document.getElementById("themeSwitcher")) return;

    // 相册等未引入 style.css 的页面也能用主题切换器
    if (!document.getElementById("themeSwitcherStyles")) {
      const st = document.createElement("style");
      st.id = "themeSwitcherStyles";
      st.textContent = `
.theme-switcher{position:fixed;left:16px;bottom:20px;z-index:9999;display:flex;flex-direction:column;gap:8px;align-items:flex-start}
.theme-switcher-toggle{width:46px;height:46px;border-radius:50%;border:1px solid rgba(255,255,255,0.5);background:rgba(255,255,255,0.85);backdrop-filter:blur(16px);box-shadow:0 6px 20px rgba(0,0,0,0.2);cursor:pointer;font-size:20px;display:flex;align-items:center;justify-content:center;color:#1e293b}
.theme-switcher-panel{display:none;flex-direction:column;gap:6px;padding:10px;border-radius:14px;background:rgba(255,255,255,0.9);border:1px solid rgba(0,0,0,0.08);box-shadow:0 8px 24px rgba(0,0,0,0.15);min-width:120px}
.theme-switcher.open .theme-switcher-panel{display:flex}
.theme-opt{border:none;border-radius:10px;padding:8px 12px;font-size:13px;font-weight:600;cursor:pointer;text-align:left;background:transparent;color:#1e293b}
.theme-opt:hover{background:#f1f5f9}
.theme-opt.active{background:linear-gradient(135deg,#60a5fa,#93c5fd);color:#fff}
.theme-opt .dot{display:inline-block;width:10px;height:10px;border-radius:50%;margin-right:8px;vertical-align:middle;border:1px solid rgba(0,0,0,0.1)}
.theme-opt .dot.color{background:linear-gradient(135deg,#e0f2fe,#bae6fd,#dbeafe)}
.theme-opt .dot.light{background:#f8fafc}
.theme-opt .dot.dark{background:#0f172a}
.theme-opt .dot.custom{background:repeating-linear-gradient(45deg,#60a5fa,#60a5fa 4px,#93c5fd 4px,#93c5fd 8px)}
html[data-theme="dark"] body.album-page{filter:none}
html[data-theme="dark"] .theme-switcher-panel{background:#1e2430;border-color:rgba(255,255,255,0.1)}
html[data-theme="dark"] .theme-opt{color:#e2e8f0}
html[data-theme="dark"] .theme-opt:hover{background:#2a3344}
.nav-logout-btn{background:linear-gradient(135deg,#60a5fa,#93c5fd);border:none;border-radius:999px;padding:7px 14px;cursor:pointer;font-size:14px;font-weight:600;color:#fff!important;white-space:nowrap;box-shadow:0 4px 12px rgba(96,165,250,.3)}
.theme-opt.custom-opt{display:flex;align-items:center;justify-content:space-between;gap:6px}
.theme-opt .custom-main{flex:1;min-width:0;text-align:left}
.theme-opt .custom-actions{display:flex;gap:2px;align-items:center;flex-shrink:0}
.theme-opt .custom-change,.theme-opt .custom-clear{font-size:11px;opacity:0.55;cursor:pointer;padding:2px 5px;border-radius:5px;transition:all 0.2s ease;line-height:1}
.theme-opt .custom-change:hover,.theme-opt .custom-clear:hover{opacity:1;background:rgba(0,0,0,0.1)}
.panel-email{margin:4px 0 10px;font-size:12px;color:rgba(255,255,255,.85);word-break:break-all;line-height:1.35}
`;
      document.head.appendChild(st);
    }

    const wrap = document.createElement("div");
    wrap.className = "theme-switcher";
    wrap.id = "themeSwitcher";
    wrap.innerHTML =
      '<button type="button" class="theme-switcher-toggle" id="themeToggle" title="切换主题">🎨</button>' +
      '<div class="theme-switcher-panel" id="themePanel">' +
        '<button type="button" class="theme-opt" data-theme="color"><span class="dot color"></span>彩色</button>' +
        '<button type="button" class="theme-opt" data-theme="light"><span class="dot light"></span>白色</button>' +
        '<button type="button" class="theme-opt" data-theme="dark"><span class="dot dark"></span>黑色</button>' +
        '<button type="button" class="theme-opt custom-opt" data-theme="custom" id="themeCustomBtn">' +
          '<span class="custom-main"><span class="dot custom"></span>自定义背景</span>' +
          '<span class="custom-actions">' +
            '<span class="custom-change" id="themeCustomChange" title="更换图片">🔄</span>' +
            '<span class="custom-clear" id="themeCustomClear" title="清除自定义背景">✕</span>' +
          '</span>' +
        '</button>' +
        '<input type="file" id="themeBgInput" accept="image/*" style="display:none;">' +
      "</div>";
    document.body.appendChild(wrap);

    const toggle = document.getElementById("themeToggle");
    const bgInput = document.getElementById("themeBgInput");
    const customClear = document.getElementById("themeCustomClear");
    const customChange = document.getElementById("themeCustomChange");

    toggle.addEventListener("click", (e) => {
      e.stopPropagation();
      wrap.classList.toggle("open");
    });

    // 更换自定义背景图片
    if (customChange) {
      customChange.addEventListener("click", (e) => {
        e.stopPropagation();
        if (bgInput) bgInput.click();
        wrap.classList.remove("open");
      });
    }

    // 清除自定义背景
    if (customClear) {
      customClear.addEventListener("click", (e) => {
        e.stopPropagation();
        setCustomBg("");
        applyTheme("color");
        wrap.classList.remove("open");
      });
    }

    // 选择自定义背景图片
    if (bgInput) {
      bgInput.addEventListener("change", (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        if (!file.type.startsWith("image/")) {
          alert("请选择图片文件");
          return;
        }
        const reader = new FileReader();
        reader.onload = (ev) => {
          const img = new Image();
          img.onload = () => {
            // 压缩图片：最大宽度 1920px，JPEG 质量 0.82，控制 localStorage 体积
            const maxW = 1920;
            let w = img.width;
            let h = img.height;
            if (w > maxW) {
              h = Math.round(h * (maxW / w));
              w = maxW;
            }
            const canvas = document.createElement("canvas");
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext("2d");
            ctx.drawImage(img, 0, 0, w, h);
            const dataUrl = canvas.toDataURL("image/jpeg", 0.82);
            const ok = setCustomBg(dataUrl);
            if (ok) {
              applyTheme("custom");
            } else {
              alert("图片过大，保存失败。请选择更小的图片或清除旧的自定义背景后重试。");
            }
            bgInput.value = "";
          };
          img.onerror = () => {
            alert("图片加载失败");
            bgInput.value = "";
          };
          img.src = ev.target.result;
        };
        reader.onerror = () => {
          alert("读取文件失败");
          bgInput.value = "";
        };
        reader.readAsDataURL(file);
      });
    }

    document.getElementById("themePanel").addEventListener("click", (e) => {
      // 点击更换/清除按钮不触发主题切换
      if (e.target.closest(".custom-change") || e.target.closest(".custom-clear")) return;
      const btn = e.target.closest(".theme-opt");
      if (!btn) return;
      const theme = btn.dataset.theme;
      if (theme === "custom") {
        // 已有保存背景 → 直接应用；没有 → 弹出选择器
        if (getCustomBg()) {
          applyTheme("custom");
        } else if (bgInput) {
          bgInput.click();
        }
        wrap.classList.remove("open");
        return;
      }
      applyTheme(theme);
      wrap.classList.remove("open");
    });
    document.addEventListener("click", () => wrap.classList.remove("open"));
    applyTheme(getSavedTheme());
  }


  // ---------- 角色点击对话 ----------
  function setupChar(wrapId, imgId, bubbleId) {
    const wrap = document.getElementById(wrapId);
    const img = document.getElementById(imgId) || (wrap && wrap.querySelector("img"));
    const bubble = document.getElementById(bubbleId);
    if (!wrap || !img || !bubble) return;

    let hideTimer = null;
    let jumping = false;

    function showBubble() {
      bubble.classList.add("show");
      bubble.setAttribute("aria-hidden", "false");
      if (hideTimer) clearTimeout(hideTimer);
      hideTimer = setTimeout(() => {
        bubble.classList.remove("show");
        bubble.setAttribute("aria-hidden", "true");
      }, 3200);
    }

    function jump() {
      if (jumping) return;
      jumping = true;
      wrap.classList.add("jump");
      setTimeout(() => {
        wrap.classList.remove("jump");
        jumping = false;
      }, 450);
    }

    img.addEventListener("click", (e) => {
      e.stopPropagation();
      jump();
      showBubble();
    });
  }

  function initCharDialogue() {
    setupChar("rightImage", "rightCharImg", "charBubble");
    setupChar("leftImage", "leftCharImg", "leftCharBubble");
  }


  // ========== 在线状态 Presence ==========
  const PRESENCE_CHANNEL = "online_users";
  let presenceChannel = null;
  let presenceTracked = false;
  let presenceAuthListenerSet = false;

  // 加入在线频道并上报当前用户状态
  async function initPresence(supabase) {
    if (!supabase || typeof supabase.auth !== "object") return;

    // 清理旧频道
    if (presenceChannel) {
      try { await supabase.removeChannel(presenceChannel); } catch (_) {}
      presenceChannel = null;
      presenceTracked = false;
    }

    // 获取当前登录用户（会等待 session 恢复）
    let user = null;
    try {
      const { data } = await supabase.auth.getUser();
      user = data && data.user;
    } catch (_) { user = null; }
    if (!user) return; // 未登录不上报

    // 拉取用户资料（昵称、头像）
    let nickname = "匿名用户";
    let avatar_url = "";
    try {
      const { data: profile } = await supabase
        .from("public_user_list")
        .select("nickname, avatar_url")
        .eq("user_id", user.id)
        .maybeSingle();
      if (profile) {
        nickname = profile.nickname || nickname;
        avatar_url = profile.avatar_url || "";
      }
    } catch (_) {}

    // 创建频道，以 user_id 为 presence key（多标签页合并为同一在线状态）
    presenceChannel = supabase.channel(PRESENCE_CHANNEL, {
      config: { presence: { key: user.id } }
    });

    // 监听在线状态同步，派发自定义事件供各页面订阅
    presenceChannel.on("presence", { event: "sync" }, () => {
      try {
        const state = presenceChannel.presenceState();
        const ids = Object.keys(state);
        window.dispatchEvent(new CustomEvent("qish-presence-sync", {
          detail: { ids, state }
        }));
      } catch (_) {}
    });

    await presenceChannel.subscribe(async (status) => {
      if (status === "SUBSCRIBED" && !presenceTracked) {
        try {
          await presenceChannel.track({
            user_id: user.id,
            nickname,
            avatar_url,
            online_at: Date.now()
          });
          presenceTracked = true;
        } catch (_) {}
      }
    });

    // 只绑定一次 auth 监听
    if (!presenceAuthListenerSet) {
      presenceAuthListenerSet = true;
      try {
        supabase.auth.onAuthStateChange((event) => {
          if (event === "SIGNED_IN" || event === "SIGNED_OUT") {
            initPresence(supabase);
          }
        });
      } catch (_) {}
    }
  }

  // 获取当前在线用户 ID 集合
  function getOnlineUserIds() {
    if (!presenceChannel) return new Set();
    try {
      const state = presenceChannel.presenceState();
      return new Set(Object.keys(state));
    } catch (_) {
      return new Set();
    }
  }

  // 导出
  window.QISH = {
    DEFAULT_AVATAR,
    initMouseGlow,
    initSidePanel,
    updateAuthNav,
    highlightCurrentNav,
    initMusicPlayer,
    isAudioFile,
    initAnnounce,
    showAnnounce,
    initNewMsgNotifier,
    showNewMsgNotifier,
    fetchNewMsgCount,
    initPWA,
    initThemeSwitcher,
    applyTheme,
    initCharDialogue,
    initPresence,
    getOnlineUserIds,
  };

  // 自动初始化光效、侧栏、音乐播放器
  function boot() {
    initMouseGlow();
    initSidePanel();
    const page = (location.pathname.split("/").pop() || "index.html").toLowerCase();
    const chat = page === "chat.html";
    if (page === "album.html") document.body.classList.add("album-page");
    // supabase 可能尚未就绪，延迟一帧
    setTimeout(() => {
      const sb = window.supabaseClient || window.__qish_sb || null;
      initMusicPlayer({ isChatPage: chat, supabase: sb });
      if (sb) initPresence(sb);
    }, 50);
    try { initAnnounce(); } catch (e) { console.warn(e); }
    try { initNewMsgNotifier(); } catch (e) { console.warn(e); }
    try { initPWA(); } catch (e) { console.warn(e); }
    try { initThemeSwitcher(); } catch (e) { console.warn(e); }
    try { initCharDialogue(); } catch (e) { console.warn(e); }
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
