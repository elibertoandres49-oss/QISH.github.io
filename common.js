/**
 * QISH 公共脚本 - 鼠标光效 / 侧边栏 / 认证导航 / 页面过渡
 * 各页面在 supabase 初始化后引入本文件
 */
(function () {
  const DEFAULT_AVATAR = "avatar.jpg";

  // 尽早应用主题，减少闪烁
  try {
    var _t = localStorage.getItem("qish_theme");
    if (_t === "light" || _t === "dark" || _t === "color" || _t === "aqua" || _t === "custom") {
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
          // 入场动画完成后，Q版小人启动缓慢漂移
          if (wrapId === "rightImage") {
            setTimeout(function () { wrap.classList.add("char-drifting"); }, 750);
          }
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
    if (glow.dataset.glowInited === "1") return;
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      glow.style.display = "none";
      return;
    }
    // 触摸设备不启用自定义光标特效
    if (window.matchMedia && window.matchMedia("(hover: none) and (pointer: coarse)").matches) {
      glow.style.display = "none";
      return;
    }
    glow.dataset.glowInited = "1";

    glow.classList.add("mouse-glow-ui");

    // —— 白色细线拖尾（SVG）——
    let trailSvg = document.getElementById("mouseTrail");
    if (!trailSvg) {
      trailSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      trailSvg.id = "mouseTrail";
      trailSvg.setAttribute("class", "mouse-trail-svg");
      trailSvg.innerHTML =
        '<path id="mouseTrailPath" fill="none" stroke="rgba(255,255,255,0.55)" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"></path>' +
        '<path id="mouseTrailPath2" fill="none" stroke="rgba(255,255,255,0.22)" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"></path>';
      document.body.appendChild(trailSvg);
    }
    const trailPath = document.getElementById("mouseTrailPath");
    const trailPath2 = document.getElementById("mouseTrailPath2");
    const trailPts = [];
    const TRAIL_MAX = 18;

    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let currentX = mouseX;
    let currentY = mouseY;
    let prevX = mouseX;
    let prevY = mouseY;
    let adsorb = 0; // 0~1 吸附强度
    let lastMoveT = performance.now();

    // 可吸附 UI（去掉整块 nav，避免大区域抖动）
    const MAGNET_SEL =
      ".container, .card, .userlist-card, .anime-search-panel, " +
      ".home-time-card, .home-stats-card, .home-announce-card, " +
      ".nav-links a, .nav-logout-btn, .panel-links a, " +
      ".filter-chip, .season-card, .anime-card, .user-item, " +
      ".theme-switcher-toggle, .anime-btn, .chat-enter-btn";

    var _magCache = null;
    var _magCacheT = 0;

    function nearestMagnet(x, y) {
      // 节流查询，减少 layout 抖动反馈
      var now = performance.now();
      if (!_magCache || now - _magCacheT > 48) {
        _magCache = document.querySelectorAll(MAGNET_SEL);
        _magCacheT = now;
      }
      var nodes = _magCache;
      var best = null;
      var bestD = 56;
      for (var i = 0; i < nodes.length; i++) {
        var el = nodes[i];
        if (!el) continue;
        var r = el.getBoundingClientRect();
        if (r.width < 10 || r.height < 10) continue;
        var cx = Math.max(r.left, Math.min(x, r.right));
        var cy = Math.max(r.top, Math.min(y, r.bottom));
        var dx = x - cx;
        var dy = y - cy;
        var d = Math.sqrt(dx * dx + dy * dy);
        var inside = x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
        if (inside) d = 0;
        if (d < bestD) {
          bestD = d;
          best = { d: d, cx: cx, cy: cy, inside: inside };
        }
      }
      return best;
    }

    document.addEventListener(
      "mousemove",
      function (e) {
        mouseX = e.clientX;
        mouseY = e.clientY;
        lastMoveT = performance.now();
      },
      { passive: true }
    );

    document.addEventListener(
      "mousedown",
      function (e) {
        if (e.button !== 0) return;
        spawnClickFx(e.clientX, e.clientY);
        glow.classList.add("mouse-glow-click");
        setTimeout(function () {
          glow.classList.remove("mouse-glow-click");
        }, 280);
      },
      { passive: true }
    );

    function spawnClickFx(x, y) {
      var ring = document.createElement("div");
      ring.className = "mouse-click-ring";
      ring.style.left = x + "px";
      ring.style.top = y + "px";
      document.body.appendChild(ring);
      var splash = document.createElement("div");
      splash.className = "mouse-click-splash";
      splash.style.left = x + "px";
      splash.style.top = y + "px";
      document.body.appendChild(splash);
      setTimeout(function () {
        ring.remove();
        splash.remove();
      }, 700);
    }

    function updateTrail(x, y) {
      // 位移太小不采样，避免静止时线段抖动
      var last = trailPts[trailPts.length - 1];
      if (last && Math.hypot(x - last.x, y - last.y) < 1.2) {
        if (trailSvg) {
          var idle = performance.now() - lastMoveT > 120;
          trailSvg.style.opacity = idle ? "0.25" : "0.85";
        }
        return;
      }
      trailPts.push({ x: x, y: y });
      if (trailPts.length > TRAIL_MAX) trailPts.shift();
      if (trailPts.length < 2) return;
      var d = "M " + trailPts[0].x.toFixed(1) + " " + trailPts[0].y.toFixed(1);
      for (var i = 1; i < trailPts.length; i++) {
        d += " L " + trailPts[i].x.toFixed(1) + " " + trailPts[i].y.toFixed(1);
      }
      if (trailPath) trailPath.setAttribute("d", d);
      if (trailPath2) trailPath2.setAttribute("d", d);
      if (trailSvg) trailSvg.style.opacity = "1";
    }

    function animate() {
      var mag = nearestMagnet(mouseX, mouseY);
      var targetX = mouseX;
      var targetY = mouseY;
      var wantAdsorb = 0;
      if (mag) {
        if (mag.inside) {
          // 在 UI 内部：只跟随鼠标，不额外拉扯（避免弹抖）
          wantAdsorb = 1;
        } else {
          var pull = Math.max(0, 1 - mag.d / 56);
          // 轻度拉向边缘，最多 55%
          targetX = mouseX + (mag.cx - mouseX) * pull * 0.55;
          targetY = mouseY + (mag.cy - mouseY) * pull * 0.55;
          wantAdsorb = pull;
        }
      }

      // 临界阻尼插值，无弹簧速度 → 不会来回弹
      adsorb += (wantAdsorb - adsorb) * 0.2;
      var follow = 0.28 + adsorb * 0.12;
      currentX += (targetX - currentX) * follow;
      currentY += (targetY - currentY) * follow;
      // 贴死微抖动
      if (Math.abs(targetX - currentX) < 0.35) currentX = targetX;
      if (Math.abs(targetY - currentY) < 0.35) currentY = targetY;

      var vx = currentX - prevX;
      var vy = currentY - prevY;
      prevX = currentX;
      prevY = currentY;
      var speed = Math.sqrt(vx * vx + vy * vy);
      // 轻微拉伸，上限压低
      var stretch = Math.min(speed * 0.045, 0.55) * (1 - adsorb * 0.6);
      var angle = speed > 0.15 ? (Math.atan2(vy, vx) * 180) / Math.PI : 0;

      // 吸附：略放大变软，不再大幅 scale 弹跳
      var sx = 1 + stretch + adsorb * 0.25;
      var sy = 1 - stretch * 0.35 + adsorb * 0.2;
      var br = 50 - adsorb * 8;

      glow.style.left = currentX + "px";
      glow.style.top = currentY + "px";
      glow.style.transform =
        "translate(-50%, -50%) rotate(" +
        angle.toFixed(1) +
        "deg) scale(" +
        sx.toFixed(3) +
        ", " +
        sy.toFixed(3) +
        ")";
      glow.style.borderRadius = br + "%";
      glow.style.opacity = String(0.55 + adsorb * 0.15);
      glow.classList.toggle("mouse-glow-adsorb", adsorb > 0.55);

      updateTrail(currentX, currentY);
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
  /**
   * 等待 Supabase 客户端完成从 localStorage 恢复会话。
   * 原因：createClient 后 initialize 是异步的，立刻 getSession 可能仍为 null；
   * 另外 SDK 在 refresh 失败时会静默清空 storage，需用备份恢复。
   */
  var AUTH_KEY = "qish-auth-v1";
  var AUTH_BACKUP_KEY = "qish-auth-backup-v1";

  function accessTokenStillValid(token) {
    if (!token || typeof token !== "string") return false;
    try {
      var parts = token.split(".");
      if (parts.length < 2) return false;
      var b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
      while (b64.length % 4) b64 += "=";
      var payload = JSON.parse(atob(b64));
      return payload && typeof payload.exp === "number" && payload.exp * 1000 > Date.now() + 30000;
    } catch (_) {
      return false;
    }
  }

  function normalizeSession(parsed) {
    if (!parsed || typeof parsed !== "object") return null;
    var sess = parsed.access_token
      ? parsed
      : (parsed.currentSession || parsed.session || null);
    if (sess && sess.access_token && (sess.user || sess.refresh_token)) return sess;
    if (parsed.user && parsed.access_token) return parsed;
    return null;
  }

  function readStoredAuth() {
    try {
      var raw = localStorage.getItem(AUTH_KEY);
      if (raw) {
        var sess = normalizeSession(JSON.parse(raw));
        if (sess) return sess;
      }
    } catch (_) {}
    try {
      var bak = localStorage.getItem(AUTH_BACKUP_KEY);
      if (bak) {
        var sess2 = normalizeSession(JSON.parse(bak));
        if (sess2 && sess2.access_token) {
          try { localStorage.setItem(AUTH_KEY, JSON.stringify(sess2)); } catch (_) {}
          return sess2;
        }
      }
    } catch (_) {}
    return null;
  }

  function saveAuthBackup(session) {
    if (!session || !session.access_token) return;
    try {
      localStorage.setItem(AUTH_BACKUP_KEY, JSON.stringify({
        access_token: session.access_token,
        refresh_token: session.refresh_token || "",
        expires_at: session.expires_at || null,
        expires_in: session.expires_in || null,
        token_type: session.token_type || "bearer",
        user: session.user || null
      }));
      localStorage.setItem(AUTH_KEY, JSON.stringify(session));
    } catch (_) {}
  }

  async function waitForAuthSession(sb, timeoutMs) {
    timeoutMs = timeoutMs || 4000;
    if (!sb || !sb.auth) return readStoredAuth();

    try {
      var res1 = await sb.auth.getSession();
      if (res1 && res1.data && res1.data.session && res1.data.session.user) {
        saveAuthBackup(res1.data.session);
        return res1.data.session;
      }
    } catch (_) {}

    var stored = readStoredAuth();
    if (stored && stored.access_token && stored.refresh_token) {
      try {
        var setRes = await sb.auth.setSession({
          access_token: stored.access_token,
          refresh_token: stored.refresh_token
        });
        if (setRes && !setRes.error && setRes.data && setRes.data.session) {
          saveAuthBackup(setRes.data.session);
          return setRes.data.session;
        }
        if (stored.user && accessTokenStillValid(stored.access_token)) {
          saveAuthBackup(stored);
          return stored;
        }
        if (stored.user) return stored;
      } catch (_) {
        if (stored && stored.user) return stored;
      }
    } else if (stored && stored.user && accessTokenStillValid(stored.access_token)) {
      return stored;
    }

    var waitMs = Math.min(timeoutMs, 2500);
    var fromEvent = await new Promise(function (resolve) {
      var settled = false;
      var timer = setTimeout(function () {
        if (settled) return;
        settled = true;
        try { if (sub) sub.unsubscribe(); } catch (_) {}
        resolve(null);
      }, waitMs);
      var sub = null;
      try {
        var ret = sb.auth.onAuthStateChange(function (event, session) {
          if (settled) return;
          if (session && session.user) {
            settled = true;
            clearTimeout(timer);
            try { if (sub) sub.unsubscribe(); } catch (_) {}
            resolve(session);
          }
        });
        sub = ret && ret.data && ret.data.subscription;
      } catch (e) {
        clearTimeout(timer);
        resolve(null);
      }
    });
    if (fromEvent) {
      saveAuthBackup(fromEvent);
      return fromEvent;
    }

    return readStoredAuth();
  }

  async function updateAuthNav(opts) {
    opts = opts || {};
    let sb = opts.supabase || window.supabaseClient || window.__qish_sb;
    const navAvatar = document.getElementById("navAvatar");
    const navNickname = document.getElementById("navNickname");
    const panelAvatar = document.getElementById("panelAvatar");
    const panelUsername = document.getElementById("panelUsername");
    const authNav = document.getElementById("auth-nav");
    const panelLinksBox = document.getElementById("panelLinksBox");

    let session = null;
    if (sb && typeof sb.auth === "object" && typeof sb.auth.getSession === "function") {
      session = await waitForAuthSession(sb, 4000);
      if (!window.__qish_auth_listener) {
        window.__qish_auth_listener = true;
        try {
          sb.auth.onAuthStateChange(function (event) {
            if (event === "INITIAL_SESSION") return;
            if (window.__qish_auth_nav_busy) return;
            window.__qish_auth_nav_busy = true;
            setTimeout(function () {
              var p = updateAuthNav({ supabase: sb });
              if (p && p.finally) p.finally(function () { window.__qish_auth_nav_busy = false; });
              else window.__qish_auth_nav_busy = false;
            }, 30);
          });
        } catch (_) {}
      }
    } else {
      console.warn("[QISH] Supabase client 无效", sb);
      session = readStoredAuth();
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

    if (session && session.user) {
      const user = session.user;
      let profile = null;
      if (sb && sb.from) {
        try {
          const res = await sb
            .from("public_user_list")
            .select("avatar_url, nickname")
            .eq("user_id", user.id)
            .maybeSingle();
          profile = res.data;
        } catch (_) {}
      }

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
              if (sb && sb.auth) await sb.auth.signOut({ scope: "local" });
            } catch (_) {}
            try { localStorage.removeItem("qish-auth-v1"); localStorage.removeItem("qish-auth-backup-v1"); } catch (_) {}
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
    try {
      var _qm = document.getElementById("qmMini");
      if (_qm) _qm.style.touchAction = "manipulation";
    } catch (_) {}

    let qmSuppressClick = false;
    document.getElementById("qmMini").addEventListener("click", (e) => {
      if (e.target.id === "qmMiniPlay" || e.target.closest("#qmMiniPlay")) return;
      if (qmSuppressClick) {
        qmSuppressClick = false;
        return;
      }
      if (wrap.dataset.wasDragged === "1") { wrap.dataset.wasDragged = "0"; return; }
      panelOpen = !panelOpen;
      document.getElementById("qmPanel").classList.toggle("open", panelOpen);
    });
    document.getElementById("qmMiniPlay").addEventListener("click", (e) => {
      e.stopPropagation();
      if (qmSuppressClick) {
        qmSuppressClick = false;
        return;
      }
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

    // ========== 播放器拖动（轻点展开 + 甩出撞边反弹，与小人一致） ==========
    (function initDrag() {
      const POS_KEY = "qish_music_pos";
      const MOVE_THRESHOLD = 12;
      const FRICTION = 0.965;
      const BOUNCE = 0.72;
      const MIN_SPEED = 0.35;
      const FLING_THRESHOLD = 2.2;
      const mini = document.getElementById("qmMini");
      let dragging = false;
      let startX, startY, origLeft, origTop;
      let moved = false;
      let isTouch = false;
      let lastX = 0, lastY = 0, lastT = 0;
      let velX = 0, velY = 0;
      let posX = 0, posY = 0;
      let inertiaRaf = null;

      function stopInertia() {
        if (inertiaRaf) {
          cancelAnimationFrame(inertiaRaf);
          inertiaRaf = null;
        }
      }

      function clampBounds(left, top) {
        const w = wrap.offsetWidth || 220;
        const h = wrap.offsetHeight || 56;
        const minL = -(w - 48);
        const maxL = window.innerWidth - 48;
        const minT = 0;
        const maxT = window.innerHeight - Math.min(h, 48);
        return {
          left: Math.max(minL, Math.min(maxL, left)),
          top: Math.max(minT, Math.min(maxT, top)),
          minL, maxL, minT, maxT
        };
      }

      function applyPos(left, top) {
        wrap.style.right = "auto";
        wrap.style.bottom = "auto";
        wrap.style.left = left + "px";
        wrap.style.top = top + "px";
        posX = left;
        posY = top;
      }

      function savePos() {
        try {
          localStorage.setItem(POS_KEY, JSON.stringify({ left: posX, top: posY }));
        } catch (_) {}
      }

      function bounceStep() {
        if (dragging) {
          inertiaRaf = null;
          return;
        }
        posX += velX;
        posY += velY;
        velX *= FRICTION;
        velY *= FRICTION;

        const b = clampBounds(posX, posY);
        if (posX <= b.minL) {
          posX = b.minL;
          velX = Math.abs(velX) * BOUNCE;
        } else if (posX >= b.maxL) {
          posX = b.maxL;
          velX = -Math.abs(velX) * BOUNCE;
        }
        if (posY <= b.minT) {
          posY = b.minT;
          velY = Math.abs(velY) * BOUNCE;
        } else if (posY >= b.maxT) {
          posY = b.maxT;
          velY = -Math.abs(velY) * BOUNCE;
        }

        applyPos(posX, posY);

        const speed = Math.sqrt(velX * velX + velY * velY);
        if (speed < MIN_SPEED) {
          velX = 0;
          velY = 0;
          inertiaRaf = null;
          savePos();
          return;
        }
        inertiaRaf = requestAnimationFrame(bounceStep);
      }

      // 恢复保存的位置
      try {
        const saved = localStorage.getItem(POS_KEY);
        if (saved) {
          const pos = JSON.parse(saved);
          if (pos && typeof pos.left === "number" && typeof pos.top === "number") {
            const c = clampBounds(pos.left, pos.top);
            applyPos(c.left, c.top);
          }
        }
      } catch (_) {}

      function onDown(e) {
        if (e.target.id === "qmMiniPlay" || e.target.closest("#qmMiniPlay")) return;
        isTouch = !!e.touches;
        const pt = e.touches ? e.touches[0] : e;
        stopInertia();
        dragging = true;
        moved = false;
        velX = 0;
        velY = 0;
        startX = pt.clientX;
        startY = pt.clientY;
        lastX = pt.clientX;
        lastY = pt.clientY;
        lastT = performance.now();
        const rect = wrap.getBoundingClientRect();
        origLeft = rect.left;
        origTop = rect.top;
        posX = origLeft;
        posY = origTop;
        // touch 不 preventDefault，否则无法轻点展开
        if (!isTouch) {
          applyPos(origLeft, origTop);
          mini.style.cursor = "grabbing";
          mini.style.transition = "none";
          e.preventDefault();
        }
      }

      function onMove(e) {
        if (!dragging) return;
        const pt = e.touches ? e.touches[0] : e;
        const dx = pt.clientX - startX;
        const dy = pt.clientY - startY;

        if (!moved && (Math.abs(dx) > MOVE_THRESHOLD || Math.abs(dy) > MOVE_THRESHOLD)) {
          moved = true;
          applyPos(origLeft, origTop);
          mini.style.transition = "none";
        }
        if (!moved) return;

        const now = performance.now();
        const dt = Math.max(1, now - lastT);
        const rawVx = (pt.clientX - lastX) * (16 / dt);
        const rawVy = (pt.clientY - lastY) * (16 / dt);
        velX = velX * 0.35 + rawVx * 0.65;
        velY = velY * 0.35 + rawVy * 0.65;
        lastX = pt.clientX;
        lastY = pt.clientY;
        lastT = now;

        const c = clampBounds(origLeft + dx, origTop + dy);
        applyPos(c.left, c.top);
        e.preventDefault();
      }

      function onUp(e) {
        if (!dragging) return;
        dragging = false;
        mini.style.cursor = "";
        mini.style.transition = "";
        if (moved) {
          wrap.dataset.wasDragged = "1";
          const speed = Math.sqrt(velX * velX + velY * velY);
          if (speed >= FLING_THRESHOLD) {
            stopInertia();
            inertiaRaf = requestAnimationFrame(bounceStep);
          } else {
            velX = 0;
            velY = 0;
            savePos();
          }
        } else if (isTouch) {
          qmSuppressClick = true;
          if (e && e.target && (e.target.id === "qmMiniPlay" || (e.target.closest && e.target.closest("#qmMiniPlay")))) {
            togglePlay();
          } else {
            panelOpen = !panelOpen;
            document.getElementById("qmPanel").classList.toggle("open", panelOpen);
          }
        }
        isTouch = false;
      }

      mini.addEventListener("mousedown", onDown);
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
      mini.addEventListener("touchstart", onDown, { passive: true });
      document.addEventListener("touchmove", onMove, { passive: false });
      document.addEventListener("touchend", onUp);
      document.addEventListener("touchcancel", onUp);

      // 双击恢复默认位置
      mini.addEventListener("dblclick", () => {
        stopInertia();
        velX = 0;
        velY = 0;
        wrap.style.left = "";
        wrap.style.top = "";
        wrap.style.right = "";
        wrap.style.bottom = "";
        try { localStorage.removeItem(POS_KEY); } catch (_) {}
      });
    })();
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
    title: "网站公告 v1.0.0",
    body: "欢迎来到 QISH 小站～\n\n• 支持新番查询功能啦\n• 聊天室支持发图、文件与一起听歌\n• 右下角可使用音乐播放器\n• 有问题可以在聊天室留言\n\n祝你玩得开心！",
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

  // 查询 Supabase 中 since 之后的新消息数量（排除自己发的）
  async function fetchNewMsgCount(supabase, sinceTs) {
    if (!supabase || !sinceTs) return 0;
    try {
      // 获取当前用户 ID，用于排除自己的消息
      let myUserId = null;
      try {
        const { data: udata } = await supabase.auth.getUser();
        if (udata && udata.user) myUserId = udata.user.id;
      } catch (_) {}

      const sinceISO = new Date(sinceTs).toISOString();
      let query = supabase
        .from("public_messages")
        .select("*", { count: "exact", head: true })
        .gt("created_at", sinceISO);
      if (myUserId) {
        query = query.neq("user_id", myUserId);
      }
      const { count, error } = await query.limit(NEWMSG_QUERY_LIMIT);
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
  const THEMES = ["color", "light", "dark", "aqua", "custom"];

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

  /** 水纹主题：注入多层 SVG 波浪，可见的横向流动 */
  function syncAquaWaves(on) {
    var el = document.getElementById("qishAquaWaves");
    if (!on) {
      if (el) el.remove();
      if (document.body) document.body.classList.remove("theme-aqua-active");
      return;
    }
    if (document.body) document.body.classList.add("theme-aqua-active");
    if (el) return;
    el = document.createElement("div");
    el.id = "qishAquaWaves";
    el.className = "qish-aqua-waves";
    el.setAttribute("aria-hidden", "true");
    el.innerHTML =
      '<div class="qish-aqua-caustic"></div>' +
      '<svg class="qish-wave-svg qish-wave-a" viewBox="0 0 1440 320" preserveAspectRatio="none">' +
      '<path fill="rgba(255,255,255,0.18)" d="M0,192L48,176C96,160,192,128,288,133.3C384,139,480,181,576,186.7C672,192,768,160,864,144C960,128,1056,128,1152,149.3C1248,171,1344,213,1392,234.7L1440,256L1440,320L0,320Z"></path>' +
      '<path fill="rgba(165,243,252,0.22)" d="M0,224L60,213.3C120,203,240,181,360,181.3C480,181,600,203,720,192C840,181,960,139,1080,133.3C1200,128,1320,160,1380,176L1440,192L1440,320L0,320Z"></path>' +
      "</svg>" +
      '<svg class="qish-wave-svg qish-wave-b" viewBox="0 0 1440 320" preserveAspectRatio="none">' +
      '<path fill="rgba(255,255,255,0.12)" d="M0,160L80,170.7C160,181,320,203,480,197.3C640,192,800,160,960,154.7C1120,149,1280,171,1360,181.3L1440,192L1440,320L0,320Z"></path>' +
      "</svg>" +
      '<svg class="qish-wave-svg qish-wave-c" viewBox="0 0 1440 320" preserveAspectRatio="none">' +
      '<path fill="rgba(14,165,233,0.25)" d="M0,256L48,240C96,224,192,192,288,181.3C384,171,480,181,576,197.3C672,213,768,235,864,229.3C960,224,1056,192,1152,170.7C1248,149,1344,139,1392,133.3L1440,128L1440,320L0,320Z"></path>' +
      "</svg>" +
      '<div class="qish-aqua-bubbles"></div>';
    // 气泡粒子
    var bubbles = el.querySelector(".qish-aqua-bubbles");
    for (var i = 0; i < 12; i++) {
      var b = document.createElement("span");
      b.style.left = Math.random() * 100 + "%";
      b.style.animationDelay = Math.random() * 8 + "s";
      b.style.animationDuration = 6 + Math.random() * 8 + "s";
      b.style.width = b.style.height = 6 + Math.random() * 14 + "px";
      bubbles.appendChild(b);
    }
    document.body.appendChild(el);
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
      meta.content =
        name === "dark" ? "#0b0f14" :
        name === "light" ? "#f5f6f8" :
        name === "aqua" ? "#0ea5e9" : "#60a5fa";
    }
    // 水纹主题：挂载可见波浪层
    try {
      syncAquaWaves(name === "aqua");
    } catch (_) {}
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
      aqua: {
        "--gradient-start": "#67e8f9",
        "--gradient-mid": "#22d3ee",
        "--gradient-end": "#0ea5e9",
        "--glass-bg": "rgba(255, 255, 255, 0.22)",
        "--glass-bg-strong": "rgba(255, 255, 255, 0.38)",
        "--glass-border": "rgba(255, 255, 255, 0.5)",
        "--text-main": "#0c4a6e",
        "--text-sub": "rgba(12, 74, 110, 0.85)",
        "--shadow": "0 12px 40px rgba(14, 165, 233, 0.25)",
        "--album-bg": "linear-gradient(160deg, #0ea5e9 0%, #22d3ee 40%, #67e8f9 100%)",
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
.theme-opt .dot.aqua{background:linear-gradient(135deg,#0ea5e9,#22d3ee,#a5f3fc)}
.theme-opt .dot.custom{background:repeating-linear-gradient(45deg,#60a5fa,#60a5fa 4px,#93c5fd 4px,#93c5fd 8px)}
html[data-theme="dark"] body.album-page{filter:none}
html[data-theme="dark"] .theme-switcher-panel{background:#1e2430;border-color:rgba(255,255,255,0.1)}
html[data-theme="dark"] .theme-opt{color:#e2e8f0}
html[data-theme="dark"] .theme-opt:hover{background:#2a3344}
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
        '<button type="button" class="theme-opt" data-theme="aqua"><span class="dot aqua"></span>水纹</button>' +
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


  // ---------- 角色点击对话（Q版小人完整系统） ----------
  function setupChar(wrapId, imgId, bubbleId) {
    const wrap = document.getElementById(wrapId);
    const img = document.getElementById(imgId) || (wrap && wrap.querySelector("img"));
    const bubble = document.getElementById(bubbleId);
    if (!wrap || !img || !bubble) return;

    const isChibi = wrapId === "rightImage";

    // ===== 对话文案库 =====
    const DIALOGUES = {
      normal: [
        "欢迎过来玩哦✨",
        "今天过得怎么样？",
        "不要忘记休息啦",
        "能来到这里，真的很开心",
        "四处逛逛我的小站吧",
        "有发现什么有趣的东西吗",
        "风今天也很温柔呢",
        "慢慢来，不用着急哦",
        "要不要听听站内的音乐？",
        "很高兴与你相遇🌟",
        "放松一下，短暂歇一会吧",
        "这里是属于我们的小角落",
        "希望你能拥有好心情",
        "累了就稍微放空一下",
      ],
      shy: [
        "诶！不要一直戳我啦🥺",
        "老是点我，有点不好意思咯",
        "别、别碰我嘛，脸都发烫了",
        "哇，看得我都害羞了",
        "再点我就要躲起来咯",
        "呜，你很喜欢逗我吗",
      ],
      happy: [
        "哇！好开心见到你🎉",
        "今天的心情超级棒！",
        "能被你触碰，我很高兴",
        "嘿嘿，和你聊天好快乐",
        "感觉整个人都暖洋洋的",
        "要不要一起玩一会呀",
      ],
      night: [
        "夜晚悄悄降临咯🌙",
        "天色已经很晚啦",
        "眼皮开始变得沉沉的",
        "夜晚适合安安静静发呆",
        "不要熬夜熬得太晚哦",
        "晚风轻轻吹过来了",
        "可以准备好好休息咯",
      ],
      lateNight: [
        "哈啊……好困呀🥱",
        "都这么晚了你还没睡吗",
        "脑袋昏昏沉沉的，好想睡觉",
        "夜深了，该早点休息啦",
        "我快要撑不住要睡着了",
        "快去睡觉，不许继续熬夜",
      ],
    };

    // 表情 GIF（千世系列）
    const EXPRESSIONS = {
      normal: "qishi-expr-normal.gif",
      shy: "qishi-expr-shy.gif",
      happy: "qishi-expr-happy.gif",
      sleepy: "qishi-expr-sleepy.gif",
      surprised: "qishi-expr-surprised.gif",
    };

    // ===== 状态变量 =====
    let hideTimer = null;
    let jumping = false;
    let clickCount = 0;
    let clickResetTimer = null;
    let shyActive = false;
    let shyTimer = null;
    let swayTimer = null;
    let lastNormalIdx = -1;

    // ===== 工具函数 =====
    function getTimeMode() {
      const h = new Date().getHours();
      if (h >= 23 || h < 7) return "lateNight";
      if (h >= 19) return "night";
      return "day";
    }
    function isSleepyTime() {
      const m = getTimeMode();
      return m === "night" || m === "lateNight";
    }
    function pick(arr) {
      if (arr.length <= 1) return arr[0];
      let idx;
      do { idx = Math.floor(Math.random() * arr.length); } while (idx === lastNormalIdx);
      lastNormalIdx = idx;
      return arr[idx];
    }
    function setExpression(mood) {
      if (!isChibi) return;
      const src = EXPRESSIONS[mood] || EXPRESSIONS.normal;
      // 用路径结尾判断，避免绝对 URL 导致重复赋值打断 GIF
      try {
        var cur = (img.getAttribute("src") || "").split("?")[0];
        if (cur === src || cur.endsWith("/" + src) || cur.endsWith(src)) return;
      } catch (_) {}
      img.src = src;
    }
    function showBubble(text) {
      const textEl = bubble.querySelector(".char-bubble-text");
      if (textEl) textEl.textContent = text;
      bubble.classList.add("show");
      bubble.setAttribute("aria-hidden", "false");
      if (hideTimer) clearTimeout(hideTimer);
      hideTimer = setTimeout(function () {
        bubble.classList.remove("show");
        bubble.setAttribute("aria-hidden", "true");
      }, 3600);
    }
    function jump() {
      if (jumping) return;
      jumping = true;
      // 只切换 jump 类：动画全部在 .char-inner 上，不必拆掉 char-drifting（避免卡顿回弹）
      wrap.classList.remove("char-sway", "jump");
      void wrap.offsetWidth;
      wrap.classList.add("jump");
      setTimeout(function () {
        wrap.classList.remove("jump");
        jumping = false;
      }, 460);
    }
    function restoreIdle() {
      if (shyActive) return;
      if (isSleepyTime()) {
        setExpression("sleepy");
        wrap.classList.add("char-sleepy");
      } else {
        setExpression("normal");
        wrap.classList.remove("char-sleepy");
      }
    }

    // ===== 害羞状态 =====
    function triggerShy() {
      if (shyActive) return;
      shyActive = true;
      wrap.classList.remove("char-drifting", "char-sleepy");
      wrap.classList.add("char-shy");
      setExpression("shy");
      showBubble(pick(DIALOGUES.shy));
      if (shyTimer) clearTimeout(shyTimer);
      shyTimer = setTimeout(function () {
        shyActive = false;
        clickCount = 0;
        wrap.classList.remove("char-shy");
        restoreIdle();
        if (!isSleepyTime()) wrap.classList.add("char-drifting");
      }, 3400);
    }

    // ===== 开心状态 =====
    function triggerHappy() {
      setExpression("happy");
      showBubble(pick(DIALOGUES.happy));
      setTimeout(function () { if (!shyActive) restoreIdle(); }, 3200);
    }

    // ===== 普通对话（按时段选池） =====
    function normalChat() {
      const mode = getTimeMode();
      let pool;
      if (mode === "lateNight") pool = DIALOGUES.lateNight;
      else if (mode === "night") pool = DIALOGUES.night;
      else pool = DIALOGUES.normal;
      showBubble(pick(pool));
    }

    // ===== 空闲摇摆（每 7~14 秒；与 jump 互斥，避免动画抢 transform） =====
    function scheduleSway() {
      // 已取消左右摇晃
    }

    // ===== Q版小人：用 .char-inner 包裹 img 实现呼吸分层 =====
    if (isChibi && img.parentElement && !img.parentElement.classList.contains("char-inner")) {
      const inner = document.createElement("div");
      inner.className = "char-inner";
      img.parentNode.insertBefore(inner, img);
      inner.appendChild(img);
    }

    // ===== 点击 / 轻触对话（桌面 click + 手机 tap 共用） =====
    function handleCharTap(e) {
      if (e) e.stopPropagation();
      // 拖动后不触发点击对话
      if (wrap.dataset.wasDragged === "1") {
        wrap.dataset.wasDragged = "0";
        return;
      }
      jump();

      if (!isChibi) {
        showBubble(bubble.querySelector(".char-bubble-text") ? bubble.querySelector(".char-bubble-text").textContent : "你好呀~");
        return;
      }

      clickCount++;
      if (clickResetTimer) clearTimeout(clickResetTimer);
      clickResetTimer = setTimeout(function () { clickCount = 0; }, 1800);

      if (clickCount >= 5 && !shyActive) {
        triggerShy();
        return;
      }
      if (shyActive) {
        showBubble(pick(DIALOGUES.shy));
        return;
      }
      if (Math.random() < 0.15 && !isSleepyTime()) {
        triggerHappy();
        return;
      }
      normalChat();
    }
    try { img.style.touchAction = "manipulation"; img.style.webkitUserSelect = "none"; img.style.userSelect = "none"; } catch (_) {}
    img.addEventListener("click", handleCharTap);

    // ===== 初始化状态 =====
    if (isChibi) {
      if (isSleepyTime()) {
        setExpression("sleepy");
        wrap.classList.add("char-sleepy");
      } else {
        setExpression("normal");
      }
      scheduleSway();

      // ===== 角色拖动（含甩出 + 边缘反弹；手机轻点触发对话） =====
      (function initCharDrag() {
        const POS_KEY = "qish_char_pos";
        const FRICTION = 0.965;
        const BOUNCE = 0.72;
        const MIN_SPEED = 0.35;
        const FLING_THRESHOLD = 2.2;
        const MOVE_THRESHOLD = 12; // 手机手指抖动阈值

        let dragging = false;
        let startX, startY, origLeft, origTop;
        let moved = false;
        let isTouch = false;
        let lastX = 0, lastY = 0, lastT = 0;
        let velX = 0, velY = 0;
        let posX = 0, posY = 0;
        let inertiaRaf = null;
        let suppressNextClick = false;

        function stopInertia() {
          if (inertiaRaf) {
            cancelAnimationFrame(inertiaRaf);
            inertiaRaf = null;
          }
        }

        function clampBounds(left, top) {
          const w = wrap.offsetWidth || 148;
          const minL = -(w - 48);
          const maxL = window.innerWidth - 48;
          const minT = 0;
          const maxT = window.innerHeight - 48;
          return {
            left: Math.max(minL, Math.min(maxL, left)),
            top: Math.max(minT, Math.min(maxT, top)),
            minL, maxL, minT, maxT
          };
        }

        function applyPos(left, top) {
          wrap.style.right = "auto";
          wrap.style.bottom = "auto";
          wrap.style.left = left + "px";
          wrap.style.top = top + "px";
          posX = left;
          posY = top;
        }

        function savePos() {
          try {
            localStorage.setItem(POS_KEY, JSON.stringify({ left: posX, top: posY }));
          } catch (_) {}
        }

        function bounceStep() {
          if (dragging) {
            inertiaRaf = null;
            return;
          }
          posX += velX;
          posY += velY;
          velX *= FRICTION;
          velY *= FRICTION;

          const b = clampBounds(posX, posY);
          if (posX <= b.minL) {
            posX = b.minL;
            velX = Math.abs(velX) * BOUNCE;
          } else if (posX >= b.maxL) {
            posX = b.maxL;
            velX = -Math.abs(velX) * BOUNCE;
          }
          if (posY <= b.minT) {
            posY = b.minT;
            velY = Math.abs(velY) * BOUNCE;
          } else if (posY >= b.maxT) {
            posY = b.maxT;
            velY = -Math.abs(velY) * BOUNCE;
          }

          applyPos(posX, posY);

          const speed = Math.sqrt(velX * velX + velY * velY);
          if (speed < MIN_SPEED) {
            velX = 0;
            velY = 0;
            inertiaRaf = null;
            savePos();
            return;
          }
          inertiaRaf = requestAnimationFrame(bounceStep);
        }

        // 恢复保存的位置
        try {
          const saved = localStorage.getItem(POS_KEY);
          if (saved) {
            const pos = JSON.parse(saved);
            if (pos && typeof pos.left === "number" && typeof pos.top === "number") {
              const c = clampBounds(pos.left, pos.top);
              applyPos(c.left, c.top);
              wrap.classList.remove("char-drifting");
            }
          }
        } catch (_) {}

        function onDown(e) {
          isTouch = !!e.touches;
          const pt = e.touches ? e.touches[0] : e;
          stopInertia();
          dragging = true;
          moved = false;
          velX = 0;
          velY = 0;
          startX = pt.clientX;
          startY = pt.clientY;
          lastX = pt.clientX;
          lastY = pt.clientY;
          lastT = performance.now();
          const rect = wrap.getBoundingClientRect();
          origLeft = rect.left;
          origTop = rect.top;
          posX = origLeft;
          posY = origTop;
          // 置顶，避免被大立绘挡住无法继续拖动
          wrap.classList.add("dragging");
          // 手机端：touchstart 不 preventDefault，否则会吞掉 click / 无法触发对话
          if (!isTouch) {
            applyPos(origLeft, origTop);
            wrap.classList.remove("char-drifting");
            img.style.cursor = "grabbing";
            e.preventDefault();
          }
        }

        function onMove(e) {
          if (!dragging) return;
          const pt = e.touches ? e.touches[0] : e;
          const dx = pt.clientX - startX;
          const dy = pt.clientY - startY;

          if (!moved && (Math.abs(dx) > MOVE_THRESHOLD || Math.abs(dy) > MOVE_THRESHOLD)) {
            moved = true;
            applyPos(origLeft, origTop);
            wrap.classList.remove("char-drifting");
            wrap.classList.add("dragging");
          }
          if (!moved) return;

          const now = performance.now();
          const dt = Math.max(1, now - lastT);
          const rawVx = (pt.clientX - lastX) * (16 / dt);
          const rawVy = (pt.clientY - lastY) * (16 / dt);
          velX = velX * 0.35 + rawVx * 0.65;
          velY = velY * 0.35 + rawVy * 0.65;
          lastX = pt.clientX;
          lastY = pt.clientY;
          lastT = now;

          const c = clampBounds(origLeft + dx, origTop + dy);
          applyPos(c.left, c.top);
          e.preventDefault();
        }

        function onUp(e) {
          if (!dragging) return;
          dragging = false;
          img.style.cursor = "";
          wrap.classList.remove("dragging");
          if (moved) {
            wrap.dataset.wasDragged = "1";
            suppressNextClick = true;
            const speed = Math.sqrt(velX * velX + velY * velY);
            if (speed >= FLING_THRESHOLD) {
              stopInertia();
              inertiaRaf = requestAnimationFrame(bounceStep);
            } else {
              velX = 0;
              velY = 0;
              savePos();
            }
          } else if (isTouch) {
            // 手机轻点：直接触发对话（不依赖可能被吞掉的 click）
            suppressNextClick = true;
            handleCharTap(e);
          }
          isTouch = false;
        }

        img.addEventListener("mousedown", onDown);
        document.addEventListener("mousemove", onMove);
        document.addEventListener("mouseup", onUp);
        img.addEventListener("touchstart", onDown, { passive: true });
        document.addEventListener("touchmove", onMove, { passive: false });
        document.addEventListener("touchend", onUp);
        document.addEventListener("touchcancel", onUp);

        // 若浏览器仍派发了 click，避免与 touch 轻点重复触发
        img.addEventListener("click", function (e) {
          if (suppressNextClick) {
            suppressNextClick = false;
            e.stopPropagation();
            e.preventDefault();
          }
        }, true);

        // 双击恢复默认位置
        img.addEventListener("dblclick", () => {
          stopInertia();
          velX = 0;
          velY = 0;
          wrap.style.left = "";
          wrap.style.top = "";
          wrap.style.right = "";
          wrap.style.bottom = "";
          try { localStorage.removeItem(POS_KEY); } catch (_) {}
          if (!wrap.classList.contains("char-shy") && !wrap.classList.contains("char-sleepy")) {
            wrap.classList.add("char-drifting");
          }
        });
      })();
    }
  }

  function initCharDialogue() {
    setupChar("rightImage", "rightCharImg", "charBubble");
    setupChar("leftImage", "leftCharImg", "leftCharBubble");
  }


  // ========== 在线状态 Presence ==========
  // 任意页面 boot 都会加入同一频道；登录用户用 user.id 作为 key，全站显示在线
  const PRESENCE_CHANNEL = "online_users";
  let presenceChannel = null;
  let presenceTracked = false;
  let presenceAuthListenerSet = false;
  let presenceHeartbeatTimer = null;
  let presenceInitSeq = 0;
  let presenceMeta = { user_id: null, nickname: "匿名用户", avatar_url: "" };

  function isUuidKey(k) {
    return typeof k === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(k);
  }

  function emitPresenceSync() {
    if (!presenceChannel) return;
    try {
      const state = presenceChannel.presenceState() || {};
      const ids = Array.from(collectOnlineUserIds(state));
      window.dispatchEvent(new CustomEvent("qish-presence-sync", {
        detail: { ids: ids, state: state }
      }));
    } catch (_) {}
  }

  function collectOnlineUserIds(state) {
    const ids = new Set();
    if (!state || typeof state !== "object") return ids;
    Object.keys(state).forEach(function (key) {
      const metas = state[key] || [];
      var hasUser = false;
      for (var i = 0; i < metas.length; i++) {
        var m = metas[i];
        if (m && m.user_id) {
          ids.add(m.user_id);
          hasUser = true;
        }
      }
      // 兼容：presence key 本身就是 user uuid
      if (!hasUser && isUuidKey(key)) ids.add(key);
    });
    return ids;
  }

  async function trackPresenceNow() {
    if (!presenceChannel || !presenceMeta.user_id) return;
    try {
      await presenceChannel.track({
        user_id: presenceMeta.user_id,
        nickname: presenceMeta.nickname || "匿名用户",
        avatar_url: presenceMeta.avatar_url || "",
        online_at: Date.now(),
        page: (location.pathname.split("/").pop() || "index.html").toLowerCase()
      });
      presenceTracked = true;
    } catch (e) {
      console.warn("[QISH] presence track", e);
    }
  }

  function startPresenceHeartbeat() {
    if (presenceHeartbeatTimer) {
      clearInterval(presenceHeartbeatTimer);
      presenceHeartbeatTimer = null;
    }
    // 定期续命，避免长时间停留某页被判定离线
    presenceHeartbeatTimer = setInterval(function () {
      if (document.visibilityState === "hidden") return;
      trackPresenceNow();
    }, 25000);
  }

  // 加入在线频道并上报当前用户状态（全站任意页面）
  async function initPresence(supabase) {
    if (!supabase || typeof supabase.auth !== "object") return;
    const seq = ++presenceInitSeq;

    // 清理旧频道 / 心跳
    if (presenceHeartbeatTimer) {
      clearInterval(presenceHeartbeatTimer);
      presenceHeartbeatTimer = null;
    }
    if (presenceChannel) {
      try { await supabase.removeChannel(presenceChannel); } catch (_) {}
      presenceChannel = null;
      presenceTracked = false;
    }

    // 关键：先等会话从 localStorage 恢复，再决定是否 track
    let user = null;
    try {
      const session = await waitForAuthSession(supabase, 5000);
      if (session && session.user) user = session.user;
    } catch (_) {}
    if (!user) {
      try {
        const { data } = await supabase.auth.getUser();
        user = data && data.user;
      } catch (_) { user = null; }
    }
    if (seq !== presenceInitSeq) return; // 被更新的 init 取代

    let nickname = "匿名用户";
    let avatar_url = "";
    if (user) {
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
    }

    presenceMeta = {
      user_id: user ? user.id : null,
      nickname: nickname,
      avatar_url: avatar_url
    };

    // 登录用户用稳定 uuid 作 key；游客用本地固定 guest id（不计入在线人数）
    var presenceKey;
    if (user) {
      presenceKey = user.id;
    } else {
      try {
        presenceKey = localStorage.getItem("qish_guest_presence");
        if (!presenceKey) {
          presenceKey = "guest-" + Math.random().toString(36).slice(2, 12);
          localStorage.setItem("qish_guest_presence", presenceKey);
        }
      } catch (_) {
        presenceKey = "guest-" + Math.random().toString(36).slice(2, 12);
      }
    }

    presenceChannel = supabase.channel(PRESENCE_CHANNEL, {
      config: { presence: { key: presenceKey } }
    });

    presenceChannel.on("presence", { event: "sync" }, function () {
      emitPresenceSync();
    });
    presenceChannel.on("presence", { event: "join" }, function () {
      emitPresenceSync();
    });
    presenceChannel.on("presence", { event: "leave" }, function () {
      emitPresenceSync();
    });

    await presenceChannel.subscribe(async function (status) {
      if (seq !== presenceInitSeq) return;
      if (status === "SUBSCRIBED") {
        if (user) {
          await trackPresenceNow();
          startPresenceHeartbeat();
        } else {
          presenceTracked = true; // 游客只订阅，不上报为在线成员
        }
        emitPresenceSync();
      }
    });

    // 页签重新可见时立刻续命
    if (!window.__qish_presence_vis) {
      window.__qish_presence_vis = true;
      document.addEventListener("visibilitychange", function () {
        if (document.visibilityState === "visible") trackPresenceNow();
      });
    }

    // auth 变化时重建（含 INITIAL_SESSION：解决「先 guest 后才恢复登录」）
    if (!presenceAuthListenerSet) {
      presenceAuthListenerSet = true;
      try {
        supabase.auth.onAuthStateChange(function (event) {
          if (
            event === "SIGNED_IN" ||
            event === "SIGNED_OUT" ||
            event === "TOKEN_REFRESHED" ||
            event === "USER_UPDATED" ||
            event === "INITIAL_SESSION"
          ) {
            clearTimeout(window.__qish_presence_reinit_t);
            window.__qish_presence_reinit_t = setTimeout(function () {
              initPresence(supabase);
            }, 120);
          }
        });
      } catch (_) {}
    }
  }

  // 获取当前在线用户 ID 集合（仅真实登录用户，不含 guest）
  function getOnlineUserIds() {
    if (!presenceChannel) return new Set();
    try {
      return collectOnlineUserIds(presenceChannel.presenceState());
    } catch (_) {
      return new Set();
    }
  }

  // ========== 访问统计（轻量，无第三方） ==========
  const VISIT_TABLE = "public_site_visits";
  const VISIT_DEDUP_MS = 30 * 60 * 1000; // 同页 30 分钟内不重复记

  function getVisitorKey() {
    try {
      let k = localStorage.getItem("qish_vid");
      if (!k) {
        k = "v_" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
        localStorage.setItem("qish_vid", k);
      }
      return k;
    } catch (_) {
      return "anon";
    }
  }

  function detectDeviceType() {
    const ua = navigator.userAgent || "";
    if (/iPad|Tablet|PlayBook/i.test(ua)) return "tablet";
    if (/Mobile|Android.*Mobile|iPhone|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(ua)) return "mobile";
    return "desktop";
  }

  function detectBrowserName() {
    const ua = navigator.userAgent || "";
    if (/MicroMessenger/i.test(ua)) return "微信";
    if (/Edg\//i.test(ua)) return "Edge";
    if (/OPR\/|Opera/i.test(ua)) return "Opera";
    if (/Chrome\//i.test(ua) && !/Edg\//i.test(ua)) return "Chrome";
    if (/Firefox\//i.test(ua)) return "Firefox";
    if (/Safari\//i.test(ua) && !/Chrome/i.test(ua)) return "Safari";
    return "其他";
  }

  function parseReferrerHost(ref) {
    if (!ref) return "直接访问";
    try {
      const u = new URL(ref);
      if (u.hostname === location.hostname) return "站内跳转";
      return (u.hostname || "").replace(/^www\./, "") || "其他";
    } catch (_) {
      return "其他";
    }
  }

  async function recordPageVisit(supabase) {
    if (!supabase || typeof supabase.from !== "function") return;
    try {
      const path = (location.pathname.split("/").pop() || "index.html").toLowerCase() || "index.html";
      const dedupKey = "qish_visit_" + path;
      try {
        const last = parseInt(sessionStorage.getItem(dedupKey) || "0", 10);
        if (last && Date.now() - last < VISIT_DEDUP_MS) return;
        sessionStorage.setItem(dedupKey, String(Date.now()));
      } catch (_) {}

      const ref = document.referrer || "";
      await supabase.from(VISIT_TABLE).insert({
        path: path,
        referrer: String(ref).slice(0, 500),
        referrer_host: parseReferrerHost(ref),
        device: detectDeviceType(),
        browser: detectBrowserName(),
        visitor_key: getVisitorKey(),
        page_title: String(document.title || "").slice(0, 120)
      });
    } catch (e) {
      console.warn("[QISH] visit record", e && e.message ? e.message : e);
    }
  }

  /** 拉取访问统计：总量、今日、设备/来源/页面分布 */
  async function fetchVisitStats(supabase) {
    if (!supabase || typeof supabase.from !== "function") {
      return { total: 0, today: 0, uniqueToday: 0, devices: {}, sources: {}, pages: {}, recent: [], error: "无客户端" };
    }
    try {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const todayIso = start.toISOString();

      const totalRes = await supabase.from(VISIT_TABLE).select("*", { count: "exact", head: true });
      const todayRes = await supabase
        .from(VISIT_TABLE)
        .select("*", { count: "exact", head: true })
        .gte("created_at", todayIso);

      const recentRes = await supabase
        .from(VISIT_TABLE)
        .select("path,referrer_host,device,browser,created_at,visitor_key")
        .order("created_at", { ascending: false })
        .limit(1000);

      if (totalRes.error) {
        return {
          total: 0, today: 0, uniqueToday: 0, devices: {}, sources: {}, pages: {}, recent: [],
          error: totalRes.error.message
        };
      }

      const rows = recentRes.data || [];
      const devices = {};
      const sources = {};
      const pages = {};
      const uniqueSet = new Set();
      const todayMs = start.getTime();

      rows.forEach(function (r) {
        const d = r.device || "desktop";
        devices[d] = (devices[d] || 0) + 1;
        const s = r.referrer_host || "直接访问";
        sources[s] = (sources[s] || 0) + 1;
        const p = r.path || "index.html";
        pages[p] = (pages[p] || 0) + 1;
        if (r.created_at && new Date(r.created_at).getTime() >= todayMs && r.visitor_key) {
          uniqueSet.add(r.visitor_key);
        }
      });

      return {
        total: totalRes.count || 0,
        today: todayRes.count || 0,
        uniqueToday: uniqueSet.size,
        devices: devices,
        sources: sources,
        pages: pages,
        recent: rows.slice(0, 12),
        error: null
      };
    } catch (e) {
      return {
        total: 0, today: 0, uniqueToday: 0, devices: {}, sources: {}, pages: {}, recent: [],
        error: e && e.message ? e.message : String(e)
      };
    }
  }

  // 导出
  window.QISH = {
    DEFAULT_AVATAR,
    initMouseGlow,
    initSidePanel,
    updateAuthNav,
    waitForAuthSession,
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
    recordPageVisit,
    fetchVisitStats,
  };

  // 自动初始化光效、侧栏、音乐播放器
  function boot() {
    initMouseGlow();
    initSidePanel();
    const page = (location.pathname.split("/").pop() || "index.html").toLowerCase();
    const chat = page === "chat.html";
    if (page === "album.html") document.body.classList.add("album-page");
    if (page === "index.html" || page === "" || page === "/") document.body.classList.add("home-page");
    // supabase 可能尚未就绪：轮询等待后初始化在线状态（全站任意页）
    (function waitSbAndPresence(attempt) {
      const sb = window.supabaseClient || window.__qish_sb || null;
      if (sb) {
        initMusicPlayer({ isChatPage: chat, supabase: sb });
        try { initPresence(sb); } catch (e) { console.warn("[QISH] initPresence", e); }
        setTimeout(function () {
          try { recordPageVisit(sb); } catch (e) { console.warn(e); }
        }, 400);
        return;
      }
      if (attempt < 40) {
        setTimeout(function () { waitSbAndPresence(attempt + 1); }, 150);
      } else {
        initMusicPlayer({ isChatPage: chat, supabase: null });
      }
    })(0);
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
