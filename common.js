/**
 * QISH 公共脚本 - 鼠标光效 / 侧边栏 / 认证导航 / 页面过渡
 * 各页面在 supabase 初始化后引入本文件
 */
(function () {
  const DEFAULT_AVATAR = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='96' height='96' viewBox='0 0 96 96'%3E%3Crect width='96' height='96' rx='48' fill='%23a8c5b8'/%3E%3Ccircle cx='48' cy='38' r='16' fill='%23fff'/%3E%3Cpath d='M20 82c0-15.5 12.5-28 28-28s28 12.5 28 28' fill='%23fff'/%3E%3C/svg%3E";

  // 尽早应用主题，减少闪烁
  try {
    var _t = localStorage.getItem("qish_theme");
    if (_t === "light" || _t === "dark" || _t === "aqua" || _t === "custom") {
      document.documentElement.setAttribute("data-theme", _t);
    } else {
      document.documentElement.setAttribute("data-theme", "aqua");
    }
  } catch (e) {
    document.documentElement.setAttribute("data-theme", "aqua");
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
    document.querySelectorAll(".nav-links a, .panel-links a, .sidebar-nav a").forEach((a) => {
      const h = (a.getAttribute("href") || "").replace("./", "").toLowerCase();
      if (h === page || (page === "" && h === "index.html")) {
        a.classList.add("nav-active");
      }
    });
  }

  // ---------- 左上角圆形导航按钮 + 下拉菜单 ----------
  function initNavFab() {
    const fab = document.getElementById("navFab");
    const ring = document.getElementById("navFabRing");
    if (!fab) return;
    if (fab.dataset.fabInited === "1") return;
    fab.dataset.fabInited = "1";

    // 创建下拉菜单
    const dd = document.createElement("div");
    dd.className = "nav-dropdown";
    dd.id = "navDropdown";
    document.body.appendChild(dd);

    const NAV_ITEMS = [
      { label: "首页", href: "index.html" },
      { label: "关于我", href: "about.html" },
      { label: "个人历程", href: "timeline.html" },
      { label: "我的项目", href: "projects.html" },
      { label: "公告", href: "announce.html" },
      { label: "角色", href: "character.html" },
      { label: "聊天室", href: "chat.html" },
      { label: "成员相册", href: "album.html" },
      { label: "友链", href: "friends.html" },
      { label: "动态", href: "diary.html" },
      { label: "用户列表", href: "userlist.html" },
      { label: "个人资料", href: "profile.html" },
    ];

    function renderDropdown() {
      const session = readStoredAuth();
      const loggedIn = !!(session && session.user);
      let html = "";
      NAV_ITEMS.forEach(function (item) {
        html += '<a href="' + item.href + '">' + item.label + '</a>';
      });
      html += '<div class="nav-dropdown-divider"></div>';
      html += '<a href="#" id="ddCustomUI" style="color:var(--accent);font-weight:600;">自定义UI</a>';
      html += '<div class="nav-dropdown-divider"></div>';
      if (loggedIn) {
        html += '<a href="#" class="nav-dropdown-logout" id="ddLogout">退出登录</a>';
      } else {
        html += '<a href="auth.html">登录 / 注册</a>';
      }
      dd.innerHTML = html;
      var customBtn = document.getElementById("ddCustomUI");
      if (customBtn) {
        customBtn.addEventListener("click", function (e) {
          e.preventDefault();
          dd.classList.remove("show");
          fab.style.opacity = "1";
          if (typeof window.enterEditMode === "function") window.enterEditMode();
        });
      }
      const logoutBtn = document.getElementById("ddLogout");
      if (logoutBtn) {
        logoutBtn.addEventListener("click", function (e) {
          e.preventDefault();
          doLogout();
        });
      }
    }

    function doLogout() {
      const sb = window.supabaseClient || window.__qish_sb;
      (async function () {
        try { if (sb && sb.auth) await sb.auth.signOut({ scope: "local" }); } catch (_) {}
        try { localStorage.removeItem("qish-auth-v1"); localStorage.removeItem("qish-auth-backup-v1"); } catch (_) {}
        dd.classList.remove("show");
        renderDropdown();
        if (typeof updateAuthNav === "function") {
          try { updateAuthNav({ supabase: sb }); } catch (_) {}
        }
      })();
    }

    function toggle() {
      const willShow = !dd.classList.contains("show");
      dd.classList.toggle("show");
      if (ring) {
        ring.classList.remove("pulse");
        void ring.offsetWidth;
        ring.classList.add("pulse");
      }
      if (willShow) {
        fab.style.opacity = "0.6";
        renderDropdown();
      } else {
        fab.style.opacity = "1";
      }
    }

    fab.addEventListener("click", function (e) {
      e.stopPropagation();
      toggle();
    });

    // 点击外部关闭
    document.addEventListener("click", function (e) {
      if (!dd.classList.contains("show")) return;
      if (e.target.closest("#navDropdown") || e.target.closest("#navFab")) return;
      dd.classList.remove("show");
      fab.style.opacity = "1";
    });

    // ESC 关闭
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && dd.classList.contains("show")) {
        dd.classList.remove("show");
        fab.style.opacity = "1";
      }
    });

    // 暴露刷新方法，登录状态变化时调用
    window.__qishRefreshDropdown = renderDropdown;
  }

  // ---------- 页面滑动导航 ----------
  function navigateWithSlide(url, direction) {
    var main = document.querySelector(".main-content") || document.querySelector(".dash-main");
    if (!main) { window.location.href = url; return; }
    // direction: "left" = 当前页向左滑出（去右侧下一页）, "right" = 当前页向右滑出（去左侧上一页）
    sessionStorage.setItem("qish_slide_dir", direction === "left" ? "from-right" : "from-left");
    main.classList.add(direction === "left" ? "slide-out-left" : "slide-out-right");
    setTimeout(function () { window.location.href = url; }, 380);
  }
  window.navigateWithSlide = navigateWithSlide;

  // 页面加载时应用滑入动画
  function applySlideIn() {
    var dir = sessionStorage.getItem("qish_slide_dir");
    if (!dir) return;
    sessionStorage.removeItem("qish_slide_dir");
    var main = document.querySelector(".main-content");
    if (main) {
      main.classList.add(dir === "from-right" ? "slide-in-from-right" : "slide-in-from-left");
    }
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

    // 滚动时清除拖尾点，避免视口坐标与内容错位
    window.addEventListener("scroll", function () {
      trailPts.length = 0;
      if (trailPath) trailPath.setAttribute("d", "");
      if (trailPath2) trailPath2.setAttribute("d", "");
    }, { passive: true });

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
    const topNavAvatar = document.getElementById("topNavAvatar");
    const navNickname = document.getElementById("navNickname");
    const panelAvatar = document.getElementById("panelAvatar");
    const panelUsername = document.getElementById("panelUsername");
    const authNav = document.getElementById("auth-nav");
    const panelLinksBox = document.getElementById("panelLinksBox");
    const sidebarAvatar = document.getElementById("sidebarAvatar");
    const sidebarUsername = document.getElementById("sidebarUsername");
    const sidebarStatus = document.getElementById("sidebarStatus");
    const sidebarAuthLink = document.getElementById("sidebarAuthLink");
    const sidebarLogoutBtn = document.getElementById("sidebarLogoutBtn");

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
      if (topNavAvatar) topNavAvatar.src = avatarUrl;
      if (panelAvatar) panelAvatar.src = avatarUrl;
      if (sidebarAvatar) sidebarAvatar.src = avatarUrl;
      if (navNickname) {
        navNickname.textContent = nickname;
        navNickname.style.display = "block";
      }
      if (panelUsername) panelUsername.innerText = nickname;
      if (sidebarUsername) sidebarUsername.textContent = nickname;
      if (sidebarStatus) {
        sidebarStatus.textContent = "在线";
        sidebarStatus.className = "sidebar-status online";
      }
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
      // 侧边栏退出按钮
      if (sidebarLogoutBtn) {
        sidebarLogoutBtn.style.display = "block";
        sidebarLogoutBtn.onclick = async () => {
          try { if (sb && sb.auth) await sb.auth.signOut({ scope: "local" }); } catch (_) {}
          try { localStorage.removeItem("qish-auth-v1"); localStorage.removeItem("qish-auth-backup-v1"); } catch (_) {}
          window.location.replace("auth.html");
        };
      }
      if (sidebarAuthLink) sidebarAuthLink.style.display = "none";
      if (panelLinksBox) panelLinksBox.innerHTML = linksLoggedIn;

      highlightCurrentNav();
      if (typeof window.__qishRefreshDropdown === "function") window.__qishRefreshDropdown();
      if (typeof opts.onLogin === "function") opts.onLogin(user, profile);

      return { user, profile, nickname, avatar: avatarUrl };
    } else {
      if (navAvatar) navAvatar.src = DEFAULT_AVATAR;
      if (panelAvatar) panelAvatar.src = DEFAULT_AVATAR;
      if (sidebarAvatar) sidebarAvatar.src = DEFAULT_AVATAR;
      if (navNickname) navNickname.style.display = "none";
      if (panelUsername) panelUsername.innerText = "QISH";
      if (sidebarUsername) sidebarUsername.textContent = "QISH";
      if (sidebarStatus) {
        sidebarStatus.textContent = "未登录";
        sidebarStatus.className = "sidebar-status offline";
      }
      ensurePanelEmail("");
      if (authNav) authNav.innerHTML = `<a href="auth.html">登录/注册</a>`;
      if (sidebarLogoutBtn) sidebarLogoutBtn.style.display = "none";
      if (sidebarAuthLink) sidebarAuthLink.style.display = "flex";
      if (panelLinksBox) panelLinksBox.innerHTML = linksGuest;
      highlightCurrentNav();
      if (typeof window.__qishRefreshDropdown === "function") window.__qishRefreshDropdown();
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
    mode: "list",
  };
  // 全局自定义唱片图片（不随歌曲切换）
  let customDiscImage = "";
  try { customDiscImage = localStorage.getItem("qish-custom-disc") || ""; } catch(e) {}
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
        together: false,
        mode: musicState.mode,
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
    // 全屏播放器实时更新
    if (typeof fsOpen !== "undefined" && fsOpen) {
      var _fsProg = document.getElementById("qmFsProgress");
      var _fsCur = document.getElementById("qmFsCurTime");
      var _fsDur = document.getElementById("qmFsDurTime");
      if (_fsProg && !_fsProg.dataset.dragging) {
        _fsProg.max = audioEl.duration || 0;
        _fsProg.value = audioEl.currentTime || 0;
      }
      if (_fsCur) _fsCur.textContent = fmtTime(audioEl.currentTime);
      if (_fsDur) _fsDur.textContent = fmtTime(audioEl.duration);
      renderFsLyrics();
    }
  }

  function onEnded() {
    if (musicState.playlist.length === 0) return;
    if (musicState.mode === "single") {
      playIndex(musicState.index, true);
    } else if (musicState.mode === "shuffle") {
      let next = Math.floor(Math.random() * musicState.playlist.length);
      if (musicState.playlist.length > 1 && next === musicState.index) {
        next = (next + 1) % musicState.playlist.length;
      }
      playIndex(next, true);
    } else {
      if (musicState.playlist.length > 1) {
        playIndex((musicState.index + 1) % musicState.playlist.length, true);
      } else {
        musicState.playing = false;
        updatePlayerUI();
        saveMusicState();
      }
    }
  }

  function cyclePlayMode() {
    const modes = ["list", "single", "shuffle"];
    const idx = modes.indexOf(musicState.mode);
    musicState.mode = modes[(idx + 1) % modes.length];
    saveMusicState();
    updatePlayerUI();
  }

  let fsOpen = false;

  function openFullscreen() {
    updateFavButton();
    const fs = document.getElementById("qmFullscreen");
    if (!fs) return;
    fsOpen = true;
    fs.classList.add("open");
    document.body.style.overflow = "hidden";
    updateFullscreenUI();
    setTimeout(renderFsLyrics, 100);
  }

  function closeFullscreen() {
    stopVisualizer();
    const fs = document.getElementById("qmFullscreen");
    if (!fs) return;
    fsOpen = false;
    fs.classList.remove("open");
    document.body.style.overflow = "";
  }

  function updateFullscreenUI() {
    updateFavButton();
    if (!fsOpen) return;
    const track = currentTrack();
    const titleEl = document.getElementById("qmFsTitle");
    const artistEl = document.getElementById("qmFsArtist");
    const coverEl = document.getElementById("qmFsCover");
    const playBtn = document.getElementById("qmFsPlay");
    const progEl = document.getElementById("qmFsProgress");
    const curEl = document.getElementById("qmFsCurTime");
    const durEl = document.getElementById("qmFsDurTime");
    const modeBtn = document.getElementById("qmFsMode");

    if (titleEl) titleEl.textContent = track ? track.name : "暂无歌曲";
    if (artistEl) artistEl.textContent = track && track.artist ? track.artist : "未知歌手";

    if (coverEl) {
      const discImg = customDiscImage || (track && track.cover);
      if (discImg) {
        coverEl.innerHTML = '<img src="' + discImg + '" referrerpolicy="no-referrer" alt="cover" style="width:70%;height:70%;object-fit:cover;border-radius:50%;display:block;">';
      } else {
        coverEl.innerHTML = '<div class="qm-fs-cover-inner"></div>';
      }
      if (musicState.playing) {
        coverEl.classList.add("spinning");
        coverEl.classList.remove("paused");
      } else {
        coverEl.classList.add("paused");
      }
    }

    if (playBtn) playBtn.textContent = musicState.playing ? "❚❚" : "►";

    if (audioEl) {
      if (progEl && !progEl.dataset.dragging) {
        progEl.max = audioEl.duration || 0;
        progEl.value = audioEl.currentTime || 0;
      }
      if (curEl) curEl.textContent = fmtTime(audioEl.currentTime);
      if (durEl) durEl.textContent = fmtTime(audioEl.duration);
    }

    if (modeBtn) {
      modeBtn.textContent = musicState.mode === "single" ? "↺" : musicState.mode === "shuffle" ? "⇄" : "↻";
      modeBtn.title = musicState.mode === "single" ? "单曲循环" : musicState.mode === "shuffle" ? "随机播放" : "列表循环";
    }

    renderFsLyrics();
  }

  // 收藏功能
  function getFavorites() {
    try { return JSON.parse(localStorage.getItem("qish-music-favs") || "[]"); }
    catch(e) { return []; }
  }
  function saveFavorites(favs) {
    localStorage.setItem("qish-music-favs", JSON.stringify(favs));
  }
  function isFavorited(track) {
    if (!track) return false;
    const favs = getFavorites();
    return favs.some(f => f.url === track.url || f.id === track.id);
  }
  // 音频可视化
  let audioAnalyser = null;
  let audioSource = null;
  let visualizerAnimId = null;
  function initAudioVisualizer() {
    if (!audioEl || audioAnalyser) return;
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      audioSource = audioCtx.createMediaElementSource(audioEl);
      audioAnalyser = audioCtx.createAnalyser();
      audioAnalyser.fftSize = 128;
      audioSource.connect(audioAnalyser);
      audioAnalyser.connect(audioCtx.destination);
      drawVisualizer();
    } catch(e) { console.log("可视化初始化失败:", e); }
  }
  function drawVisualizer() {
    const canvas = document.getElementById("qmFsVisualizer");
    if (!canvas || !audioAnalyser) return;
    const ctx = canvas.getContext("2d");
    const bufferLength = audioAnalyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    function draw() {
      visualizerAnimId = requestAnimationFrame(draw);
      audioAnalyser.getByteFrequencyData(dataArray);
      const w = canvas.width = canvas.offsetWidth * 2;
      const h = canvas.height = canvas.offsetHeight * 2;
      ctx.clearRect(0, 0, w, h);
      const cx = w / 2, cy = h / 2;
      const radius = Math.min(w, h) * 0.32;
      const barCount = 64;
      for (let i = 0; i < barCount; i++) {
        const dataIdx = Math.floor(i * bufferLength / barCount);
        const value = dataArray[dataIdx] / 255;
        const angle = (i / barCount) * Math.PI * 2 - Math.PI / 2;
        const barHeight = value * radius * 0.6 + 4;
        const x1 = cx + Math.cos(angle) * radius;
        const y1 = cy + Math.sin(angle) * radius;
        const x2 = cx + Math.cos(angle) * (radius + barHeight);
        const y2 = cy + Math.sin(angle) * (radius + barHeight);
        const vizColor1 = getComputedStyle(document.documentElement).getPropertyValue("--viz-color1").trim() || "#60a5fa";
        const vizColor2 = getComputedStyle(document.documentElement).getPropertyValue("--viz-color2").trim() || "#f472b6";
        const gradient = ctx.createLinearGradient(x1, y1, x2, y2);
        gradient.addColorStop(0, vizColor1);
        gradient.addColorStop(1, vizColor2);
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 3;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }
    }
    draw();
  }
  function stopVisualizer() {
    if (visualizerAnimId) cancelAnimationFrame(visualizerAnimId);
  }
  // 更换唱片图片
  function changeDiscImage() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = function(e) {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = function(ev) {
        const coverEl = document.getElementById("qmFsCover");
        if (coverEl) {
          coverEl.innerHTML = '<img src="' + ev.target.result + '" alt="cover" style="width:70%;height:70%;object-fit:cover;border-radius:50%;display:block;">';
        }
        customDiscImage = ev.target.result;
        try { localStorage.setItem("qish-custom-disc", ev.target.result); } catch(e) {}
      };
      reader.readAsDataURL(file);
    };
    input.click();
  }
  function resetDiscImage() {
    customDiscImage = "";
    try { localStorage.removeItem("qish-custom-disc"); } catch(e) {}
    updateFullscreenUI();
  }

  function toggleFsPlaylist() {
    const panel = document.getElementById("qmFsPlaylistPanel");
    if (!panel) return;
    if (panel.classList.contains("show")) {
      panel.classList.remove("show");
    } else {
      renderFsPlaylist();
      panel.style.display = "flex";
      // 下一帧添加 show 类，触发动画
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          panel.classList.add("show");
        });
      });
    }
  }
  function renderFsPlaylist() {
    const listEl = document.getElementById("qmFsPlaylistList");
    if (!listEl) return;
    if (!musicState.playlist.length) {
      listEl.innerHTML = '<div style="text-align:center;padding:40px;color:rgba(255,255,255,0.5)">播放列表为空</div>';
      return;
    }
    listEl.innerHTML = musicState.playlist.map((t, i) => {
      return '<div class="qm-fs-playlist-item' + (i === musicState.index ? ' active' : '') + '" data-idx="' + i + '">' +
        '<span class="idx">' + (i + 1) + '</span>' +
        '<div class="info"><div class="name">' + escapeMusic(t.name) + '</div><div class="artist">' + escapeMusic(t.artist || "") + '</div></div>' +
        '<button class="del" data-idx="' + i + '" title="删除">×</button>' +
      '</div>';
    }).join("");
    listEl.querySelectorAll(".qm-fs-playlist-item").forEach(item => {
      item.addEventListener("click", (e) => {
        if (e.target.classList.contains("del")) return;
        const idx = parseInt(item.dataset.idx, 10);
        playIndex(idx, true);
        toggleFsPlaylist();
      });
    });
    listEl.querySelectorAll(".del").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const idx = parseInt(btn.dataset.idx, 10);
        musicState.playlist.splice(idx, 1);
        if (musicState.index >= idx && musicState.index > 0) musicState.index--;
        if (musicState.playlist.length === 0) {
          musicState.playing = false;
          if (audioEl) audioEl.pause();
        }
        saveMusicState();
        renderFsPlaylist();
        updatePlayerUI();
      });
    });
  }
  function toggleFavorite() {
    const track = currentTrack();
    if (!track) return;
    const favs = getFavorites();
    const idx = favs.findIndex(f => f.url === track.url || f.id === track.id);
    if (idx >= 0) {
      favs.splice(idx, 1);
    } else {
      favs.push({
        id: track.id, name: track.name, artist: track.artist,
        url: track.url, cover: track.cover, neteaseId: track.neteaseId
      });
    }
    saveFavorites(favs);
    updateFavButton();
  }
  function updateFavButton() {
    const btn = document.getElementById("qmFsFav");
    if (btn) btn.textContent = isFavorited(currentTrack()) ? "♥" : "♡";
  }
  // 分享功能
  function shareToChat() {
    const track = currentTrack();
    if (!track) return;
    // 构造音乐卡片数据，用 base64 编码避免特殊字符
    const musicData = {
      name: track.name,
      artist: track.artist || "未知歌手",
      cover: track.cover || "",
      url: track.url || "",
      neteaseId: track.neteaseId || ""
    };
    const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(musicData))));
    const msg = "♪ 分享音乐：" + track.name + " - " + (track.artist || "未知歌手") + " #qish_music:" + encoded;
    // 检查是否在聊天室页面
    const msgInput = document.getElementById('msgInput');
    const sendBtn = document.getElementById('sendBtn');
    if (msgInput && sendBtn && typeof sendMessage === "function") {
      // 在聊天室页面，直接填入并发送
      msgInput.value = msg;
      sendMessage();
      alert("已分享到聊天室");
    } else {
      // 不在聊天室页面，存到 localStorage 并跳转
      try {
        localStorage.setItem("qish-pending-share", msg);
      } catch(e) {}
      if (confirm("将跳转到聊天室并自动分享音乐，是否继续？")) {
        window.location.href = "chat.html";
      }
    }
  }
  function shareToDiary() {
    const track = currentTrack();
    if (!track) return;
    const content = "♪ 正在听：" + track.name + " - " + (track.artist || "未知歌手");
    // 跳转到动态页并预填内容
    const diaryUrl = "diary.html?content=" + encodeURIComponent(content);
    if (confirm("分享到动态？将跳转到动态页面并预填内容。")) {
      window.location.href = diaryUrl;
    }
  }
  function showShareMenu() {
    const track = currentTrack();
    if (!track) return;
    // 直接分享到聊天室
    shareToChat();
  }

  function renderFsLyrics() {
    const el = document.getElementById("qmFsLyrics");
    if (!el) return;
    const track = currentTrack();
    if (!track || !track.lyrics || !track.lyrics.length) {
      el.innerHTML = '<div class="lyric-empty">暂无歌词</div>';
      return;
    }
    const currentTime = audioEl ? audioEl.currentTime : 0;
    let activeIdx = -1;
    for (let i = 0; i < track.lyrics.length; i++) {
      if (currentTime >= track.lyrics[i].time) activeIdx = i;
    }
    // 添加上下空白行，让第一行和最后一行也能滚动到中心
    const _spacerH = Math.max(0, (el.clientHeight || 400) / 2 - 40);
    const _spacer = '<div style="height:' + _spacerH + 'px"></div>';
    el.innerHTML = _spacer + track.lyrics.map((line, i) => {
      return '<div class="lyric-line' + (i === activeIdx ? ' active' : '') + '">' + escapeMusic(line.text) + '</div>';
    }).join('') + _spacer;
    // 滚动到当前行
    if (activeIdx >= 0) {
      const activeLine = el.querySelector('.lyric-line.active');
      if (activeLine) {
        const containerHeight = el.clientHeight;
        const lineTop = activeLine.offsetTop;
        const lineHeight = activeLine.offsetHeight;
        const containerRect = el.getBoundingClientRect();
        const lineRect = activeLine.getBoundingClientRect();
        const offset = lineRect.top - containerRect.top - containerHeight / 2 + lineHeight / 2;
        el.scrollTop += offset;
      }
    }
  }


  // ========== 网易云音乐搜索 ==========
  const NETEASE_API = "https://api-enhanced-six-delta.vercel.app";
  const NETEASE_REALIP = "116.25.146.177";

  function parseLRC(lrcText) {
    if (!lrcText) return [];
    const lines = lrcText.split(/\r?\n/);
    const result = [];
    const timeReg = /\[(\d{2}):(\d{2})[.:](\d{2,3})\]/g;
    lines.forEach(line => {
      const text = line.replace(timeReg, "").trim();
      if (!text) return;
      let match;
      timeReg.lastIndex = 0;
      while ((match = timeReg.exec(line)) !== null) {
        const min = parseInt(match[1], 10);
        const sec = parseInt(match[2], 10);
        const ms = parseInt(match[3].padEnd(3, "0"), 10);
        const time = min * 60 + sec + ms / 1000;
        result.push({ time, text });
      }
    });
    return result.sort((a, b) => a.time - b.time);
  }

  async function searchNetease(keywords) {
    try {
      const resp = await fetch(NETEASE_API + "/search?keywords=" + encodeURIComponent(keywords) + "&limit=20");
      const data = await resp.json();
      return data.result?.songs || [];
    } catch (e) {
      console.error("搜索失败:", e);
      return [];
    }
  }

  async function getNeteasePlayUrl(id) {
    try {
      const resp = await fetch(NETEASE_API + "/song/url?id=" + id + "&realIP=" + NETEASE_REALIP);
      const data = await resp.json();
      return data.data?.[0]?.url || null;
    } catch (e) {
      console.error("获取播放地址失败:", e);
      return null;
    }
  }

  async function getNeteaseSongDetail(id) {
    try {
      const resp = await fetch(NETEASE_API + "/song/detail?ids=" + id);
      const data = await resp.json();
      const song = data.songs?.[0];
      if (song) {
        return {
          name: song.name,
          artist: song.ar?.map(a => a.name).join(" / ") || "未知歌手",
          cover: song.al?.picUrl || "",
        };
      }
      return null;
    } catch (e) {
      console.error("获取歌曲详情失败:", e);
      return null;
    }
  }

  async function getNeteaseLyric(id) {
    try {
      const resp = await fetch(NETEASE_API + "/lyric?id=" + id);
      const data = await resp.json();
      return parseLRC(data.lrc?.lyric);
    } catch (e) {
      console.error("获取歌词失败:", e);
      return [];
    }
  }

  async function addNeteaseSong(song) {
    const id = song.id;
    const name = song.name;
    
    let cover = song.album?.picUrl || song.al?.picUrl || "";
    let artist = song.artists?.map(a => a.name).join(" / ") || song.ar?.map(a => a.name).join(" / ") || "未知歌手";
    // 调用 /song/detail 获取更准确的封面和歌手
    const detail = await getNeteaseSongDetail(id);
    if (detail) {
      if (detail.cover) cover = detail.cover;
      if (detail.artist) artist = detail.artist;
    }

    // 获取播放地址
    const url = await getNeteasePlayUrl(id);
    if (!url) {
      alert("无法获取播放地址，可能是 VIP 歌曲");
      return;
    }

    // 获取歌词
    const lyrics = await getNeteaseLyric(id);

    // 添加到播放列表
    const track = {
      id: "netease_" + id + "_" + Date.now(),
      url: url,
      name: name,
      artist: artist,
      cover: cover,
      lyrics: lyrics,
      neteaseId: id,
    };

    const exists = musicState.playlist.findIndex(t => t.url === url);
    if (exists >= 0) {
      musicState.index = exists;
      musicState.currentTime = 0;
      musicState.playing = true;
      playIndex(exists, true);
    } else {
      musicState.playlist.push(track);
      musicState.index = musicState.playlist.length - 1;
      musicState.currentTime = 0;
      musicState.playing = true;
      playIndex(musicState.index, true);
    }
    saveMusicState();
    updatePlayerUI();
    closeSearchModal();
  }

  function openSearchModal() {
    const mask = document.getElementById("qmSearchMask");
    if (mask) {
      mask.classList.add("open");
      setTimeout(() => document.getElementById("qmSearchInput")?.focus(), 100);
    }
  }

  function closeSearchModal() {
    const mask = document.getElementById("qmSearchMask");
    if (mask) mask.classList.remove("open");
  }

  function renderSearchResults(songs) {
    const container = document.getElementById("qmSearchResults");
    if (!container) return;
    if (!songs.length) {
      container.innerHTML = '<div class="qm-search-empty">没有找到相关歌曲</div>';
      return;
    }
    container.innerHTML = songs.map(song => {
      const name = song.name;
      const artist = song.artists?.map(a => a.name).join(" / ") || "未知歌手";
      const cover = song.album?.picUrl || "";
      const coverHtml = cover ? '<img src="' + cover + '" referrerpolicy="no-referrer" class="qm-search-cover" alt="">' : '<div class="qm-search-cover"></div>';
      return '<div class="qm-search-item" data-id="' + song.id + '">' +
        coverHtml +
        '<div class="qm-search-info">' +
          '<div class="qm-search-name">' + escapeMusic(name) + '</div>' +
          '<div class="qm-search-artist">' + escapeMusic(artist) + '</div>' +
        '</div>' +
        '<button class="qm-search-add" title="添加并播放">+</button>' +
      '</div>';
    }).join("");

    container.querySelectorAll(".qm-search-item").forEach(item => {
      item.addEventListener("click", (e) => {
        if (e.target.classList.contains("qm-search-add")) return;
        const id = parseInt(item.dataset.id, 10);
        const song = songs.find(s => s.id === id);
        if (song) addNeteaseSong(song);
      });
    });
    container.querySelectorAll(".qm-search-add").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const item = btn.closest(".qm-search-item");
        const id = parseInt(item.dataset.id, 10);
        const song = songs.find(s => s.id === id);
        if (song) addNeteaseSong(song);
      });
    });
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
      ? (track.artist || (musicState.playlist.length + " 首 · 点击展开"))
      : "点击展开";
    if (playBtn) playBtn.textContent = playing ? "❚❚" : "►";
    if (panelPlay) panelPlay.textContent = playing ? "❚❚" : "►";
    if (disc) disc.classList.toggle("spinning", !!playing);
    if (bigDisc) {
      bigDisc.classList.toggle("spinning", !!playing);
      if (track && track.cover) {
        bigDisc.innerHTML = '<img src="' + track.cover + '" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">';
      } else {
        bigDisc.innerHTML = '<div class="qm-now-disc-inner"></div>';
      }
    }
    if (nowName) nowName.textContent = track ? track.name : "暂无歌曲";
    if (nowMeta) {
      nowMeta.textContent = track
        ? (track.artist || ("第 " + (musicState.index + 1) + " / " + musicState.playlist.length + " 首"))
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
    const modeBtn = document.getElementById("qmMode");
    if (modeBtn) {
      modeBtn.className = "qm-ctrl qm-mode " + musicState.mode;
      modeBtn.textContent = musicState.mode === "single" ? "↺" : musicState.mode === "shuffle" ? "⇄" : "↻";
      modeBtn.title = musicState.mode === "single" ? "单曲循环" : musicState.mode === "shuffle" ? "随机播放" : "列表循环";
    }
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
    // 同步主页音乐气泡
    const homeMusicBtn = document.getElementById("musicPlayBtn");
    if (homeMusicBtn) {
      const hmCover = homeMusicBtn.querySelector(".bubble-music-cover");
      const hmTitle = homeMusicBtn.querySelector(".bubble-music-title");
      if (hmCover) hmCover.textContent = playing ? "❚❚" : "♪";
      if (hmTitle) hmTitle.textContent = track ? track.name : "暂无歌曲";
    }
    // 更新全屏播放器
    if (typeof fsOpen !== "undefined" && fsOpen) updateFullscreenUI();
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
.qm-music-entry{position:fixed;right:20px;bottom:20px;z-index:9999;width:50px;height:50px;border:none;border-radius:50%;background:var(--music-btn-bg,linear-gradient(135deg,var(--accent,#60a5fa),var(--accent2,#a78bfa)));color:var(--music-btn-color,#fff);font-size:22px;cursor:pointer;box-shadow:0 6px 20px var(--music-btn-shadow,rgba(96,165,250,0.4));transition:transform .2s ease,box-shadow .2s ease;display:flex;align-items:center;justify-content:center;will-change:left,top}.qm-music-entry:hover{transform:scale(1.1);box-shadow:0 8px 25px var(--music-btn-shadow,rgba(96,165,250,0.5))}.qm-mini{display:none!important;align-items:center;gap:10px;padding:10px 14px;border-radius:999px;background:rgba(255,255,255,0.22);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,0.4);box-shadow:0 8px 32px rgba(0,0,0,0.15);cursor:pointer;transition:transform .25s ease,box-shadow .25s ease;max-width:260px}
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
.qm-panel{display:none!important;position:absolute;right:0;bottom:58px;width:300px;background:rgba(255,255,255,0.28);backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);border:1px solid rgba(255,255,255,0.4);border-radius:20px;box-shadow:0 12px 40px rgba(0,0,0,0.18);padding:16px;opacity:0;visibility:hidden;transform:translateY(12px) scale(0.96);transition:all .28s cubic-bezier(0.22,1,0.36,1);pointer-events:none}
.qm-panel.open{opacity:1;visibility:visible;transform:translateY(0) scale(1);pointer-events:auto}
.qm-panel-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px}
.qm-panel-head h4{margin:0;font-size:15px;color:#1e293b;font-weight:700}
.qm-close{width:28px;height:28px;border:none;border-radius:50%;background:rgba(255,255,255,0.4);cursor:pointer;font-size:16px;color:#334155;line-height:1}
.qm-now{text-align:center;margin-bottom:12px}
.qm-now-disc{woverflow:hidden;idth:72px;height:72px;border-radius:50%;margin:0 auto 10px;background:linear-gradient(135deg,#60a5fa,#93c5fd);display:flex;align-items:center;justify-content:center;box-shadow:0 6px 20px rgba(96,165,250,0.35)}
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
.qm-mode{font-size:13px!important}
.qm-mode.list{color:#60a5fa}
.qm-mode.single{color:#f59e0b}
.qm-mode.shuffle{color:#10b981}
.qm-lyrics{max-height:120px;overflow-y:auto;border-top:1px solid rgba(255,255,255,0.3);padding-top:10px;margin-top:8px;text-align:center;font-size:12px;color:#475569;line-height:1.8}
.qm-lyrics .lyric-line{text-align:center;transition:all .3s}
.qm-lyrics .lyric-line.active{color:#1e293b;font-weight:700;font-size:13px}
.qm-lyrics .lyric-empty{color:#94a3b8;padding:8px 0}

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

/* 全屏音乐播放器 */
.qm-fullscreen{position:fixed;inset:0;z-index:99999;display:none;align-items:center;justify-content:center;font-family:"Microsoft YaHei","PingFang SC",sans-serif;user-select:none;overflow:hidden}
.qm-fullscreen.open{display:flex;animation:qmFsFadeIn .35s ease}
@keyframes qmFsFadeIn{from{opacity:0}to{opacity:1}}
.qm-fs-bg{position:absolute;inset:0;background:var(--bg-gradient,linear-gradient(135deg,#1a1a2e,#16213e,#0f3460));z-index:0}.qm-fs-bg::after{content:"";position:absolute;inset:0;background:rgba(0,0,0,0.45);backdrop-filter:blur(2px)}
.qm-fs-bg::before{content:"";position:absolute;inset:0;background:radial-gradient(circle at 30% 20%,rgba(96,165,250,0.25),transparent 50%),radial-gradient(circle at 70% 80%,rgba(244,114,182,0.2),transparent 50%);filter:blur(40px)}
.qm-fs-content{position:relative;z-index:1;width:100%;max-width:1100px;height:100%;max-height:900px;display:flex;flex-direction:column;padding:24px;box-sizing:border-box}
.qm-fs-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:16px}
.qm-fs-close{width:40px;height:40px;border:none;border-radius:50%;background:rgba(255,255,255,0.12);color:#fff;font-size:24px;cursor:pointer;transition:all .2s;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(10px)}
.qm-fs-close:hover{background:rgba(255,255,255,0.22);transform:rotate(90deg)}
.qm-fs-center{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:20px;min-height:0}
.qm-fs-main{flex:1;display:flex;flex-direction:row;align-items:center;justify-content:center;gap:40px;min-height:0;padding:0 20px}
.qm-fs-left{display:flex;flex-direction:column;align-items:center;gap:20px;flex-shrink:0}
.qm-fs-right{flex:1;min-width:0;height:100%;display:flex;flex-direction:column;overflow:hidden}
.qm-fs-right .qm-fs-lyrics{height:400px;max-height:400px;flex:1;overflow-y:auto;scroll-behavior:smooth;padding:0 10px;display:block}
@media (max-width:768px){.qm-fs-main{flex-direction:column;gap:20px}.qm-fs-search-btn{width:42px;height:42px;border:none;border-radius:50%;background:rgba(255,255,255,0.12);backdrop-filter:blur(10px);color:#fff;font-size:20px;cursor:pointer;transition:all .25s ease;display:flex;align-items:center;justify-content:center;border:1px solid rgba(255,255,255,0.15)}.qm-fs-search-btn:hover{background:rgba(255,255,255,0.22);transform:scale(1.12);box-shadow:0 4px 16px rgba(0,0,0,0.2)}.qm-fs-right{width:100%}.qm-fs-right .qm-fs-lyrics{max-height:200px}}
.qm-fs-cover-wrap{position:relative;width:min(300px,38vw);height:min(300px,38vw);margin:0 auto}
.qm-fs-cover{width:100%;height:100%;border-radius:50%;background:var(--disc-bg,linear-gradient(135deg,#1a1a2e,#16213e));display:flex;align-items:center;justify-content:center;box-shadow:0 0 0 8px var(--disc-border-inner,rgba(255,255,255,0.15)),0 0 0 12px var(--disc-border-outer,rgba(0,0,0,0.3)),0 20px 60px var(--disc-shadow,rgba(0,0,0,0.4));position:relative;overflow:hidden;cursor:pointer}
.qm-fs-cover::before{content:"";position:absolute;inset:0;border-radius:50%;background:repeating-radial-gradient(circle at center,transparent 0,transparent 2px,var(--disc-texture,rgba(255,255,255,0.05)) 2px,var(--disc-texture,rgba(255,255,255,0.05)) 4px);pointer-events:none}
.qm-fs-cover img{width:70%;height:70%;border-radius:50%;object-fit:cover;position:relative;z-index:1}
.qm-fs-cover.spinning{animation:qmFsSpin 8s linear infinite}
.qm-fs-cover.paused{animation-play-state:paused}
@keyframes qmFsSpin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
.qm-fs-visualizer{position:absolute;inset:-20px;pointer-events:none;z-index:0}
.qm-fs-visualizer canvas{width:100%;height:100%}
.qm-fs-cover.spinning{animation:qmFsSpin 12s linear infinite}
.qm-fs-cover.paused{animation-play-state:paused}
@keyframes qmFsSpin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
.qm-fs-cover-inner{width:30%;height:30%;border-radius:50%;background:rgba(255,255,255,0.9);box-shadow:inset 0 2px 8px rgba(0,0,0,0.1)}
.qm-fs-cover img{width:100%;height:100%;object-fit:cover;border-radius:50%}
.qm-fs-info{text-align:center;max-width:100%}
.qm-fs-title{font-size:22px;font-weight:700;color:#fff;margin:0 0 6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:360px}
.qm-fs-artist{font-size:14px;color:rgba(255,255,255,0.6);margin:0}
.qm-fs-lyrics{flex:1;min-height:80px;max-height:160px;overflow-y:auto;margin:12px 0;padding:8px 16px;text-align:center;scrollbar-width:none;-ms-overflow-style:none}
.qm-fs-lyrics::-webkit-scrollbar{display:none}
.qm-fs-lyrics .lyric-line{font-size:14px;color:rgba(255,255,255,0.45);line-height:2.2;transition:all .3s}
.qm-fs-lyrics .lyric-line.active{color:#fff;font-size:16px;font-weight:600;transform:scale(1.05)}
.qm-fs-lyrics .lyric-empty{color:rgba(255,255,255,0.35);font-size:13px;padding:20px 0}
.qm-fs-playlist{position:absolute;right:24px;bottom:120px;width:320px;max-height:400px;background:var(--glass-bg,rgba(255,255,255,0.22));backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);border:1px solid var(--glass-border,rgba(255,255,255,0.4));border-radius:20px;box-shadow:0 12px 40px rgba(0,0,0,0.25);z-index:20;display:flex;flex-direction:column;padding:16px;box-sizing:border-box;transform-origin:right bottom;transform:perspective(800px) rotateX(-90deg) scale(0.8);opacity:0;transition:transform 0.4s cubic-bezier(0.34,1.56,0.64,1),opacity 0.3s ease;pointer-events:none;overflow:hidden}.qm-fs-playlist.show{transform:perspective(800px) rotateX(0deg) scale(1);opacity:1;pointer-events:auto}
.qm-fs-playlist-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;flex-shrink:0}.qm-fs-playlist-head span{font-size:15px;font-weight:700;color:var(--text-main,#fff)}.qm-fs-playlist-close{width:28px;height:28px;border:none;border-radius:50%;background:rgba(255,255,255,0.2);color:var(--text-main,#fff);font-size:16px;cursor:pointer;line-height:1;display:flex;align-items:center;justify-content:center;transition:all .2s}.qm-fs-playlist-close:hover{background:rgba(255,255,255,0.35);transform:rotate(90deg)}.qm-fs-playlist-list{flex:1;overflow-y:auto;max-height:340px}.qm-fs-playlist-list .qm-fs-playlist-item{display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:12px;font-size:13px;color:var(--text-main,#fff);cursor:pointer;transition:background .15s;margin-bottom:4px}.qm-fs-playlist-list .qm-fs-playlist-item:hover{background:rgba(255,255,255,0.15)}.qm-fs-playlist-list .qm-fs-playlist-item.active{background:var(--accent-soft,rgba(96,165,250,0.3));font-weight:600}.qm-fs-playlist-list .qm-fs-playlist-item .idx{width:24px;text-align:center;opacity:0.6;flex-shrink:0}.qm-fs-playlist-list .qm-fs-playlist-item .info{flex:1;min-width:0}.qm-fs-playlist-list .qm-fs-playlist-item .name{font-size:13px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.qm-fs-playlist-list .qm-fs-playlist-item .artist{font-size:11px;opacity:0.6;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.qm-fs-playlist-list .qm-fs-playlist-item .del{border:none;background:transparent;color:rgba(255,255,255,0.5);cursor:pointer;font-size:16px;padding:2px 6px;border-radius:6px;flex-shrink:0;transition:all .2s}.qm-fs-playlist-list .qm-fs-playlist-item .del:hover{color:#e53e3e;background:rgba(229,62,62,0.15)}.qm-fs-playlist-list .qm-empty{text-align:center;font-size:12px;color:rgba(255,255,255,0.5);padding:20px 0}.qm-fs-playlist.show{transform:perspective(1000px) rotateY(0deg);opacity:1;pointer-events:auto}
.qm-fs-playlist-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;color:#fff;font-size:16px;font-weight:600}
.qm-fs-playlist-close{width:32px;height:32px;border:none;border-radius:50%;background:rgba(255,255,255,0.15);color:#fff;font-size:18px;cursor:pointer}
.qm-fs-playlist-list{flex:1;overflow-y:auto}
.qm-fs-playlist-item{display:flex;align-items:center;gap:12px;padding:10px 12px;border-radius:10px;cursor:pointer;color:rgba(255,255,255,0.7);transition:all .15s}
.qm-fs-playlist-item:hover{background:rgba(255,255,255,0.1);color:#fff}
.qm-fs-playlist-item.active{background:rgba(96,165,250,0.3);color:#fff}
.qm-fs-playlist-item .idx{width:24px;text-align:center;font-size:13px}
.qm-fs-playlist-item .info{flex:1;min-width:0}
.qm-fs-playlist-item .name{font-size:14px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.qm-fs-playlist-item .artist{font-size:12px;opacity:0.7;margin-top:2px}
.qm-fs-playlist-item .del{width:28px;height:28px;border:none;border-radius:50%;background:transparent;color:rgba(255,255,255,0.5);font-size:14px;cursor:pointer}
.qm-fs-playlist-item .del:hover{background:rgba(255,100,100,0.2);color:#ff6b6b}
.qm-fs-bottom{margin-top:auto}
.qm-fs-progress-row{display:flex;align-items:center;gap:10px;margin-bottom:16px}
.qm-fs-progress-row span{font-size:11px;color:rgba(255,255,255,0.6);min-width:36px;text-align:center}
.qm-fs-progress{flex:1;height:4px;-webkit-appearance:none;appearance:none;background:rgba(255,255,255,0.15);border-radius:999px;outline:none;cursor:pointer}
.qm-fs-progress::-webkit-slider-thumb{-webkit-appearance:none;width:14px;height:14px;border-radius:50%;background:#fff;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,0.3)}
.qm-fs-controls{display:flex;align-items:center;justify-content:center;gap:20px}
.qm-fs-ctrl{width:48px;height:48px;border:none;border-radius:50%;background:rgba(255,255,255,0.1);color:#fff;font-size:18px;cursor:pointer;transition:all .2s;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(10px)}
.qm-fs-ctrl:hover{background:rgba(255,255,255,0.22);transform:scale(1.08)}
.qm-fs-ctrl.qm-fs-play{width:64px;height:64px;background:linear-gradient(135deg,#60a5fa,#f472b6);font-size:24px;box-shadow:0 8px 24px rgba(96,165,250,0.4)}
.qm-fs-ctrl.qm-fs-play:hover{transform:scale(1.1)}
.qm-fs-ctrl.active{color:#60a5fa}
@media (max-width:480px){.qm-fs-content{padding:16px}.qm-fs-title{font-size:18px}.qm-fs-controls{gap:14px}.qm-fs-ctrl{width:42px;height:42px;font-size:16px}.qm-fs-ctrl.qm-fs-play{width:56px;height:56px;font-size:20px}}
/* 网易云搜索 - 美化版 */
.qm-search-btn{position:absolute;top:12px;right:48px;width:36px;height:36px;border:none;border-radius:50%;background:rgba(255,255,255,0.15);backdrop-filter:blur(10px);color:#fff;font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .25s ease;border:1px solid rgba(255,255,255,0.2)}
.qm-search-btn:hover{background:rgba(255,255,255,0.25);transform:scale(1.1);box-shadow:0 4px 16px rgba(0,0,0,0.2)}
.qm-search-mask{position:fixed;inset:0;z-index:100000;background:rgba(0,0,0,0.4);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);display:none;align-items:flex-start;justify-content:center;padding-top:60px}
.qm-search-mask.open{display:flex;animation:qmFadeIn .3s ease}
@keyframes qmFadeIn{from{opacity:0}to{opacity:1}}
.qm-search-box{width:90%;max-width:580px;background:var(--card-bg-strong,rgba(255,255,255,0.92));backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);border:1px solid var(--card-border,rgba(255,255,255,0.3));border-radius:24px;box-shadow:0 24px 64px rgba(0,0,0,0.25);overflow:hidden;animation:qmSlideDown .35s cubic-bezier(.22,1,.36,1)}
@keyframes qmSlideDown{from{opacity:0;transform:translateY(-24px) scale(0.96)}to{opacity:1;transform:translateY(0) scale(1)}}
.qm-search-head{display:flex;align-items:center;gap:12px;padding:18px 22px;border-bottom:1px solid var(--card-border,rgba(0,0,0,0.06));background:var(--card-bg,rgba(255,255,255,0.5))}
.qm-search-icon{font-size:18px;color:var(--text-sub,#94a3b8);flex-shrink:0;display:flex;align-items:center;justify-content:center}
.qm-search-input{flex:1;border:none;outline:none;font-size:16px;background:transparent;color:var(--text-main,#1e293b);font-family:inherit;font-weight:500}
.qm-search-input::placeholder{color:var(--text-sub,#94a3b8);font-weight:400}
.qm-search-input:focus{color:var(--accent,#60a5fa)}
.qm-search-close{width:34px;height:34px;border:none;border-radius:50%;background:var(--accent-soft,rgba(96,165,250,0.15));color:var(--text-sub,#64748b);font-size:18px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .25s ease;flex-shrink:0}
.qm-search-close:hover{background:var(--accent,rgba(96,165,250,0.25));color:var(--accent,#60a5fa);transform:rotate(90deg) scale(1.05)}
.qm-search-results{max-height:62vh;overflow-y:auto;padding:10px}
.qm-search-results::-webkit-scrollbar{width:6px}
.qm-search-results::-webkit-scrollbar-track{background:transparent}
.qm-search-results::-webkit-scrollbar-thumb{background:var(--accent-soft,rgba(96,165,250,0.3));border-radius:3px}
.qm-search-results::-webkit-scrollbar-thumb:hover{background:var(--accent,rgba(96,165,250,0.5))}
.qm-search-item{display:flex;align-items:center;gap:14px;padding:12px 14px;border-radius:16px;cursor:pointer;transition:all .2s ease;margin-bottom:4px;border:1px solid transparent}
.qm-search-item:hover{background:var(--accent-soft,rgba(96,165,250,0.1));border-color:var(--accent-soft,rgba(96,165,250,0.2));transform:translateX(4px)}
.qm-search-cover{display:none}
.qm-search-info{flex:1;min-width:0}
.qm-search-name{font-size:15px;font-weight:600;color:var(--text-main,#1e293b);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-bottom:3px}
.qm-search-artist{font-size:12px;color:var(--text-sub,#94a3b8);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:flex;align-items:center;gap:4px}
.qm-search-artist::before{content:"♪";font-size:10px;opacity:0.6}
.qm-search-add{width:38px;height:38px;border:none;border-radius:50%;background:var(--accent,#60a5fa);color:#fff;font-size:18px;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all .25s ease;box-shadow:0 4px 12px rgba(96,165,250,0.3)}
.qm-search-add:hover{transform:scale(1.12) rotate(90deg);box-shadow:0 6px 20px rgba(96,165,250,0.45)}
.qm-search-add:active{transform:scale(0.95)}
.qm-search-loading,.qm-search-empty{text-align:center;padding:48px 20px;color:var(--text-sub,#94a3b8);font-size:14px}
.qm-search-loading{animation:qmPulse 1.5s ease-in-out infinite}
@keyframes qmPulse{0%,100%{opacity:0.4}50%{opacity:1}}
.qm-search-empty-icon{font-size:40px;margin-bottom:12px;opacity:0.5;display:block}


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
          '<button type="button" class="qm-music-entry" id="qmMusicEntry" title="音乐播放器">♪</button>' +      '<div class="qm-panel" id="qmPanel">' +

        '<div class="qm-panel-head">' +
          '<h4>音乐播放器 <span id="qmModeTag" class="qm-mode-tag" style="display:none">本地</span></h4>' +
          '<button type="button" class="qm-search-btn" id="qmSearchBtn" title="网易云搜索">⌕</button><button type="button" class="qm-close" id="qmClose">×</button>' +
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
          '<button type="button" class="qm-ctrl" id="qmPrev" title="上一首">|◄</button>' +
          '<button type="button" class="qm-ctrl primary" id="qmPanelPlay" title="播放/暂停">►</button>' +
          '<button type="button" class="qm-ctrl" id="qmNext" title="下一首">►|</button>' +
          '<button type="button" class="qm-ctrl qm-mode" id="qmMode" title="播放模式">↻</button>' +
        '</div>' +
        '<div class="qm-vol-row">' +
          '<span>🔊</span>' +
          '<input type="range" class="qm-vol" id="qmVol" min="0" max="1" step="0.01" value="0.8">' +
        '</div>' +
        '<div class="qm-lyrics" id="qmLyrics"><div class="lyric-empty">暂无歌词</div></div>' +
        '<div class="qm-playlist" id="qmPlaylist"></div>' +
      '</div>' +
      '<div class="qm-mini" id="qmMini">' +
        '<div class="qm-disc" id="qmMiniDisc"><div class="qm-disc-inner"></div></div>' +
        '<div class="qm-mini-info">' +
          '<div class="qm-mini-title" id="qmMiniTitle">暂无歌曲</div>' +
          '<div class="qm-mini-sub" id="qmMiniSub">点击展开</div>' +
        '</div>' +
        '<button type="button" class="qm-mini-btn" id="qmMiniPlay">►</button>' +
      '</div>' +
      '<div class="qm-search-mask" id="qmSearchMask">' +
        '<div class="qm-search-box">' +
          '<div class="qm-search-head">' +
            '<input type="text" class="qm-search-input" id="qmSearchInput" placeholder="搜索歌曲、歌手...">' +
            '<button type="button" class="qm-search-close" id="qmSearchClose">×</button>' +
          '</div>' +
          '<div class="qm-search-results" id="qmSearchResults"><div class="qm-search-empty">输入关键词搜索歌曲</div></div>' +
        '</div>' +
      '</div>' +
      '<div class="qm-fullscreen" id="qmFullscreen">' +
        '<div class="qm-fs-bg"></div>' +
        '<div class="qm-fs-content">' +
          '<div class="qm-fs-top">' +
            '<button type="button" class="qm-fs-search-btn" id="qmFsSearchBtn" title="搜索歌曲">⌕</button>            <button type="button" class="qm-fs-close" id="qmFsClose">×</button>' +
          '</div>' +
          '<div class="qm-fs-main">' +
            '<div class="qm-fs-left">' +
              '<div class="qm-fs-cover-wrap">' +
              '<div class="qm-fs-visualizer"><canvas id="qmFsVisualizer"></canvas></div>' +
              '<div class="qm-fs-cover" id="qmFsCover"><div class="qm-fs-cover-inner"></div></div>' +
            '</div>' +
              '<div class="qm-fs-info">' +
                '<div class="qm-fs-title" id="qmFsTitle">暂无歌曲</div>' +
                '<div class="qm-fs-artist" id="qmFsArtist">未知歌手</div>' +
              '</div>' +
            '</div>' +
            '<div class="qm-fs-right">' +
              '<div class="qm-fs-lyrics" id="qmFsLyrics"><div class="lyric-empty">暂无歌词</div></div>' +
            '</div>' +
          '</div>' +
          '<div class="qm-fs-playlist" id="qmFsPlaylistPanel" style="display:none">' +
            '<div class="qm-fs-playlist-head"><span>播放列表</span><button type="button" class="qm-fs-playlist-close" id="qmFsPlaylistClose">×</button></div>' +
            '<div class="qm-fs-playlist-list" id="qmFsPlaylistList"></div>' +
          '</div>' +
          '<div class="qm-fs-bottom">' +
            '<div class="qm-fs-progress-row">' +
              '<span id="qmFsCurTime">0:00</span>' +
              '<input type="range" class="qm-fs-progress" id="qmFsProgress" min="0" max="0" value="0" step="0.1">' +
              '<span id="qmFsDurTime">0:00</span>' +
            '</div>' +
            '<div class="qm-fs-controls">' +
              '<button type="button" class="qm-fs-ctrl" id="qmFsFav" title="收藏">♡</button>' +
              '<button type="button" class="qm-fs-ctrl" id="qmFsMode" title="播放模式">↻</button>' +
              '<button type="button" class="qm-fs-ctrl" id="qmFsPrev" title="上一首">|◄</button>' +
              '<button type="button" class="qm-fs-ctrl qm-fs-play" id="qmFsPlay" title="播放/暂停">►</button>' +
              '<button type="button" class="qm-fs-ctrl" id="qmFsNext" title="下一首">►|</button>' +
      '<button type="button" class="qm-fs-ctrl" id="qmFsShare" title="分享到聊天室">↗</button>' +                  '<button type="button" class="qm-fs-ctrl" id="qmFsPlaylist" title="播放列表">≡</button>' +
            '</div>' +
          '</div>' +
        '</div>' +
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
      openFullscreen();
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
    // 全屏播放器事件
    document.getElementById("qmFsClose").addEventListener("click", closeFullscreen);
    document.getElementById("qmFsCover").addEventListener("click", changeDiscImage);
    if (audioEl && !audioAnalyser) initAudioVisualizer();
    document.getElementById("qmFsPlaylistClose").addEventListener("click", toggleFsPlaylist);
    document.getElementById("qmFsFav").addEventListener("click", toggleFavorite);
    document.getElementById("qmFsShare").addEventListener("click", showShareMenu);
    document.getElementById("qmFsPlay").addEventListener("click", togglePlay);
    document.getElementById("qmFsPrev").addEventListener("click", () => {
      if (!musicState.playlist.length) return;
      musicState.currentTime = 0;
      musicState.playing = true;
      playIndex((musicState.index - 1 + musicState.playlist.length) % musicState.playlist.length, true);
    });
    document.getElementById("qmFsNext").addEventListener("click", () => {
      if (!musicState.playlist.length) return;
      musicState.currentTime = 0;
      musicState.playing = true;
      playIndex((musicState.index + 1) % musicState.playlist.length, true);
    });
    document.getElementById("qmFsMode").addEventListener("click", () => { cyclePlayMode(); });
    document.getElementById("qmFsPlaylist").addEventListener("click", () => {
      toggleFsPlaylist();
    });
    var _fsProg = document.getElementById("qmFsProgress");
    if (_fsProg) {
      _fsProg.addEventListener("input", () => {
        if (audioEl) audioEl.currentTime = parseFloat(_fsProg.value) || 0;
      });
    }
    document.getElementById("qmFullscreen").addEventListener("click", (e) => {
      if (e.target.id === "qmFullscreen" || e.target.classList.contains("qm-fs-bg")) {
        closeFullscreen();
      }
    });
    // 网易云搜索事件
    var _searchBtn = document.getElementById("qmSearchBtn");
    if (_searchBtn) _searchBtn.addEventListener("click", openSearchModal);
    var _musicEntry = document.getElementById("qmMusicEntry");
    if (_musicEntry) _musicEntry.addEventListener("click", function(e) {
      if (_musicEntry.dataset.wasDragged === "1") { _musicEntry.dataset.wasDragged = "0"; return; }
      if (musicState.playlist.length > 0) { openFullscreen(); } else { openSearchModal(); }
    });
    // 首页音乐气泡点击跳转全屏播放器
    var _homeMusicBtn = document.getElementById("musicPlayBtn");
    if (_homeMusicBtn) {
      _homeMusicBtn.addEventListener("click", function(e) {
        e.preventDefault();
        if (musicState.playlist.length > 0) {
          openFullscreen();
        } else {
          openSearchModal();
        }
      });
    }
    var _fsSearchBtn = document.getElementById("qmFsSearchBtn");
    if (_fsSearchBtn) _fsSearchBtn.addEventListener("click", openSearchModal);
    var _searchClose = document.getElementById("qmSearchClose");
    if (_searchClose) _searchClose.addEventListener("click", closeSearchModal);
    var _searchMask = document.getElementById("qmSearchMask");
    if (_searchMask) _searchMask.addEventListener("click", function(e) {
      if (e.target.id === "qmSearchMask") closeSearchModal();
    });
    var _searchInput = document.getElementById("qmSearchInput");
    var _searchTimer = null;
    if (_searchInput) {
      _searchInput.addEventListener("input", function() {
        var kw = _searchInput.value.trim();
        clearTimeout(_searchTimer);
        if (!kw) {
          document.getElementById("qmSearchResults").innerHTML = '<div class="qm-search-empty">输入关键词搜索歌曲</div>';
          return;
        }
        document.getElementById("qmSearchResults").innerHTML = '<div class="qm-search-loading">搜索中...</div>';
        _searchTimer = setTimeout(async function() {
          var songs = await searchNetease(kw);
          renderSearchResults(songs);
        }, 400);
      });
      _searchInput.addEventListener("keydown", function(e) {
        if (e.key === "Escape") closeSearchModal();
      });
    }
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
    document.getElementById("qmMode").addEventListener("click", () => { cyclePlayMode(); });
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
      const mini = document.getElementById("qmMusicEntry") || document.getElementById("qmMini");
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
        const w = mini.offsetWidth || 50;
        const h = mini.offsetHeight || 50;
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
        mini.style.right = "auto";
        mini.style.bottom = "auto";
        mini.style.left = left + "px";
        mini.style.top = top + "px";
        posX = left;
        posY = top;
      }

      function savePos() {
          mini.style.transition = "";
        try {
          localStorage.setItem(POS_KEY, JSON.stringify({ left: posX, top: posY }));
        } catch (_) {}
      }

      function bounceStep() {
          mini.style.transition = "none";
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
        const rect = mini.getBoundingClientRect();
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
          mini.dataset.wasDragged = "1";
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
        mini.style.left = "";
        mini.style.top = "";
        mini.style.right = "";
        mini.style.bottom = "";
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
      openFullscreen,
      closeFullscreen,
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
          '❝' +
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
      meta.content = "#5ba8a0";
      document.head.appendChild(meta);
    }
    if (!document.querySelector('link[rel="apple-touch-icon"]')) {
      const apple = document.createElement("link");
      apple.rel = "apple-touch-icon";
      apple.href = "avatar.jpg";
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
  const THEMES = ["light", "dark", "aqua", "custom"];

  function getSavedTheme() {
    try {
      const t = localStorage.getItem(THEME_KEY);
      if (THEMES.includes(t)) return t;
    } catch (_) {}
    return "aqua";
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
    if (!THEMES.includes(name)) name = "aqua";
    // 切换前：添加淡入遮罩防止闪屏
    var flash = document.getElementById("qishThemeFlash");
    if (!flash) {
      flash = document.createElement("div");
      flash.id = "qishThemeFlash";
      flash.style.cssText = "position:fixed;inset:0;z-index:99999;background:var(--bg-gradient,#fff);opacity:0;pointer-events:none;transition:opacity 0.25s ease;";
      document.body.appendChild(flash);
    }
    flash.style.opacity = "1";
    // 等一帧让遮罩淡入，再切换主题
    requestAnimationFrame(function () {
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
      // 唱片主题变量
      const discThemes = {
        light: { "--disc-bg": "linear-gradient(135deg,#f0f0f0,#e0e0e0)", "--disc-border-inner": "rgba(0,0,0,0.1)", "--disc-border-outer": "rgba(0,0,0,0.15)", "--disc-shadow": "rgba(0,0,0,0.2)", "--disc-texture": "rgba(0,0,0,0.05)", "--disc-hole-bg": "#f0f0f0", "--disc-hole-border": "rgba(0,0,0,0.15)", "--viz-color1": "#60a5fa", "--viz-color2": "#a78bfa" },
        dark: { "--disc-bg": "linear-gradient(135deg,#1a1a2e,#16213e)", "--disc-border-inner": "rgba(255,255,255,0.1)", "--disc-border-outer": "rgba(0,0,0,0.3)", "--disc-shadow": "rgba(0,0,0,0.5)", "--disc-texture": "rgba(255,255,255,0.03)", "--disc-hole-bg": "#1a1a2e", "--disc-hole-border": "rgba(255,255,255,0.2)", "--viz-color1": "#60a5fa", "--viz-color2": "#f472b6" },
        aqua: { "--disc-bg": "linear-gradient(135deg,#0c4a6e,#0369a1)", "--disc-border-inner": "rgba(255,255,255,0.15)", "--disc-border-outer": "rgba(0,0,0,0.25)", "--disc-shadow": "rgba(14,165,233,0.3)", "--disc-texture": "rgba(255,255,255,0.04)", "--disc-hole-bg": "#0c4a6e", "--disc-hole-border": "rgba(255,255,255,0.25)", "--viz-color1": "#22d3ee", "--viz-color2": "#a78bfa" },
        custom: { "--disc-bg": "linear-gradient(135deg,#1a1a2e,#16213e)", "--disc-border-inner": "rgba(255,255,255,0.1)", "--disc-border-outer": "rgba(0,0,0,0.3)", "--disc-shadow": "rgba(0,0,0,0.5)", "--disc-texture": "rgba(255,255,255,0.03)", "--disc-hole-bg": "#1a1a2e", "--disc-hole-border": "rgba(255,255,255,0.2)", "--viz-color1": "#60a5fa", "--viz-color2": "#f472b6" }
      };
      const discVars = discThemes[name] || discThemes.aqua;
      Object.keys(discVars).forEach(k => document.documentElement.style.setProperty(k, discVars[k]));
      applyAlbumTheme(name);
      // 主题应用完成后，遮罩淡出
      requestAnimationFrame(function () {
        flash.style.opacity = "0";
      });
    });
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
    const vars = map[name] || map.aqua;
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
        applyTheme("aqua");
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
        "欢迎过来玩哦✦",
        "今天过得怎么样？",
        "不要忘记休息啦",
        "能来到这里，真的很开心",
        "四处逛逛我的小站吧",
        "有发现什么有趣的东西吗",
        "风今天也很温柔呢",
        "慢慢来，不用着急哦",
        "要不要听听站内的音乐？",
        "很高兴与你相遇★",
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
        "哇！好开心见到你✿",
        "今天的心情超级棒！",
        "能被你触碰，我很高兴",
        "嘿嘿，和你聊天好快乐",
        "感觉整个人都暖洋洋的",
        "要不要一起玩一会呀",
      ],
      night: [
        "夜晚悄悄降临咯☾",
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

    // 表情 GIF（统一使用千世GIF12）
    const EXPRESSIONS = {
      normal: "chise-char.gif",
      shy: "chise-char.gif",
      happy: "chise-char.gif",
      sleepy: "chise-char.gif",
      surprised: "chise-char.gif",
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
        firstVisit: rows.length > 0 ? rows[rows.length - 1].created_at : null,
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
    initNavFab();
    applySlideIn();
    const page = (location.pathname.split("/").pop() || "index.html").toLowerCase();
    const chat = page === "chat.html";
    if (page === "album.html") document.body.classList.add("album-page");
    if (page === "index.html" || page === "" || page === "/") document.body.classList.add("home-page");
    // supabase 可能尚未就绪：轮询等待后初始化在线状态（全站任意页）
    (function waitSbAndPresence(attempt) {
      const sb = window.supabaseClient || window.__qish_sb || null;
      if (sb) {
        try { updateAuthNav({ supabase: sb }); } catch (e) { console.warn("[QISH] updateAuthNav", e); }
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
        try { updateAuthNav({ supabase: null }); } catch (e) {}
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
