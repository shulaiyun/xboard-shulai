(() => {
  "use strict";

  const API_BASE = "/api/v1";
  const AUTH_KEY = "sloth_portal_auth_data";
  const APP = document.getElementById("app");

  const PERIODS = [
    ["month_price", "月付"],
    ["quarter_price", "季付"],
    ["half_year_price", "半年"],
    ["year_price", "年付"],
    ["two_year_price", "两年"],
    ["three_year_price", "三年"],
    ["onetime_price", "一次性"],
    ["reset_price", "重置流量"],
  ];

  const state = {
    authData: localStorage.getItem(AUTH_KEY) || "",
    guestConfig: null,
    userInfo: null,
    subInfo: null,
    plans: [],
    orders: [],
    notices: [],
    invite: null,
    loadingPortal: false,
  };

  const el = {
    toastWrap: null,
    modalMask: null,
    modalBody: null,
    btnLoginTop: null,
    btnRegisterTop: null,
    btnPortalTop: null,
    btnLogoutTop: null,
    plansGrid: null,
    noticeList: null,
    portal: null,
    portalLoginHint: null,
    portalMain: null,
    userEmail: null,
    userPlan: null,
    userExpire: null,
    userTraffic: null,
    userBalance: null,
    subUrl: null,
    ordersBody: null,
    inviteSummary: null,
  };

  function esc(input) {
    return String(input ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function toDateText(v) {
    if (!v) return "--";
    const t = new Date(v);
    if (Number.isNaN(t.getTime())) return String(v);
    return t.toLocaleString("zh-CN", { hour12: false });
  }

  function money(cents) {
    const n = Number(cents || 0);
    return `CNY ${(n / 100).toFixed(2)}`;
  }

  function bytesToText(v) {
    const n = Number(v || 0);
    if (n >= 1024 ** 3) return `${(n / 1024 ** 3).toFixed(2)} GB`;
    if (n >= 1024 ** 2) return `${(n / 1024 ** 2).toFixed(2)} MB`;
    if (n >= 1024) return `${(n / 1024).toFixed(2)} KB`;
    return `${n.toFixed(0)} B`;
  }

  function readData(json) {
    if (json && typeof json === "object" && "status" in json) {
      if (json.status === "success") return json.data;
      const msg = json.message || "请求失败";
      throw new Error(msg);
    }
    if (json && typeof json === "object" && "data" in json && !("status" in json)) {
      return json.data;
    }
    return json;
  }

  function getErrorMessage(err) {
    if (!err) return "请求失败，请稍后重试";
    if (typeof err === "string") return err;
    if (err.message) return err.message;
    return "请求失败，请稍后重试";
  }

  async function api(path, options = {}) {
    const headers = {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    };
    if (state.authData) headers.Authorization = state.authData;

    const resp = await fetch(`${API_BASE}${path}`, {
      method: options.method || "GET",
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
      credentials: "same-origin",
    });

    let json = null;
    try {
      json = await resp.json();
    } catch (_) {
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      return null;
    }

    if (!resp.ok) {
      const msg = json?.message || json?.error?.message || `HTTP ${resp.status}`;
      const err = new Error(msg);
      err.status = resp.status;
      err.raw = json;
      throw err;
    }
    return readData(json);
  }

  function showToast(text, type = "ok") {
    const n = document.createElement("div");
    n.className = `toast ${type}`;
    n.textContent = text;
    el.toastWrap.appendChild(n);
    setTimeout(() => n.remove(), 3200);
  }

  function openModal(title, html) {
    el.modalBody.innerHTML = `
      <div class="modal-head">
        <h3 class="modal-title">${esc(title)}</h3>
        <button class="btn" id="modal-close-btn" type="button">关闭</button>
      </div>
      ${html}
    `;
    el.modalMask.classList.add("show");
    document.getElementById("modal-close-btn")?.addEventListener("click", closeModal);
  }

  function closeModal() {
    el.modalMask.classList.remove("show");
    el.modalBody.innerHTML = "";
  }

  function setAuth(authData) {
    state.authData = authData || "";
    if (state.authData) {
      localStorage.setItem(AUTH_KEY, state.authData);
    } else {
      localStorage.removeItem(AUTH_KEY);
    }
    refreshTopActions();
  }

  function refreshTopActions() {
    const logged = !!state.authData;
    el.btnLoginTop.classList.toggle("hide", logged);
    el.btnRegisterTop.classList.toggle("hide", logged);
    el.btnPortalTop.classList.toggle("hide", !logged);
    el.btnLogoutTop.classList.toggle("hide", !logged);
  }

  function createLayout() {
    document.body.dataset.theme = window.settings?.theme?.color || "default";
    APP.innerHTML = `
      <header class="topbar">
        <div class="shell topbar-inner">
          <div class="brand">
            <div class="brand-logo">
              <img src="${esc(window.settings.logo || `${window.settings.assets_path}/images/logo.png`)}" alt="logo"/>
            </div>
            <div class="brand-text">
              <h1>${esc(window.settings.title || "树懒VPN")}</h1>
              <p>${esc(window.settings.description || "现代化代理服务平台")}</p>
            </div>
          </div>
          <nav class="nav-links">
            <a href="#hero">首页</a>
            <a href="#plans">套餐</a>
            <a href="#support">帮助中心</a>
            <a href="#portal">用户中心</a>
          </nav>
          <div class="nav-actions">
            <button class="btn" id="btn-login-top">登录</button>
            <button class="btn btn-primary" id="btn-register-top">注册</button>
            <button class="btn hide" id="btn-portal-top">进入中心</button>
            <button class="btn hide" id="btn-logout-top">退出</button>
          </div>
        </div>
      </header>

      <main class="shell">
        <section class="hero" id="hero">
          <div>
            <h2>树懒VPN 前台门户</h2>
            <p>先看产品，再登录购买。我们在保留 XBoard 核心业务能力的基础上，重构前台体验，提供现代化官网、清晰套餐、顺滑下单与统一用户中心。</p>
            <div class="hero-actions">
              <button class="btn btn-primary" id="btn-hero-register">立即注册</button>
              <button class="btn" id="btn-hero-login">已有账号登录</button>
              <a class="btn" href="#plans">查看套餐</a>
            </div>
            <div class="badges">
              <span class="badge">支持 VLESS / VMESS / Trojan / Hysteria2 / TUIC</span>
              <span class="badge">节点覆盖 亚洲 / 欧洲 / 北美</span>
              <span class="badge">支持购买、续费、套餐升级</span>
            </div>
          </div>
          <aside class="hero-panel">
            <h3>新用户上手流程</h3>
            <ul>
              <li>注册账号并完成邮箱验证</li>
              <li>选择套餐并在线支付</li>
              <li>复制或重置订阅链接</li>
              <li>导入客户端后一键连接</li>
            </ul>
          </aside>
        </section>

        <section class="section" id="features">
          <div class="section-header">
            <div>
              <h3 class="section-title">核心能力</h3>
              <p class="section-subtitle">不减功能，重构体验</p>
            </div>
          </div>
          <div class="grid grid-4">
            <article class="card"><h4>品牌化官网</h4><p>落地页+产品信息+购买入口，避免“只见登录框”。</p></article>
            <article class="card"><h4>套餐与订单闭环</h4><p>套餐浏览、下单、支付、续费、升级降级在同一体验链路。</p></article>
            <article class="card"><h4>用户中心聚合</h4><p>订阅、流量、到期、订单、返利、工单集中管理。</p></article>
            <article class="card"><h4>兼容后端逻辑</h4><p>尽量复用 XBoard 现有接口、数据库与支付流程。</p></article>
          </div>
        </section>

        <section class="section" id="plans">
          <div class="section-header">
            <div>
              <h3 class="section-title">套餐与价格</h3>
              <p class="section-subtitle">支持周期切换、优惠码、余额抵扣与升级续费</p>
            </div>
          </div>
          <div id="plans-grid" class="grid grid-3"></div>
        </section>

        <section class="section" id="support">
          <div class="section-header">
            <div>
              <h3 class="section-title">公告与帮助</h3>
              <p class="section-subtitle">公告、FAQ、协议与地区信息</p>
            </div>
          </div>
          <div class="grid grid-2">
            <div>
              <h4 style="margin:0 0 10px">公告</h4>
              <div id="notice-list" class="notice-list"></div>
            </div>
            <div>
              <h4 style="margin:0 0 10px">常见问题</h4>
              <div id="faq-list"></div>
            </div>
          </div>
        </section>

        <section class="section portal" id="portal">
          <div class="section-header">
            <div>
              <h3 class="section-title">用户中心</h3>
              <p class="section-subtitle">登录后查看账户、订阅、订单和返利</p>
            </div>
          </div>

          <div id="portal-login-hint" class="card">
            <h4>尚未登录</h4>
            <p>请先登录后查看账户与订单信息。</p>
            <div style="margin-top:10px;display:flex;gap:8px;">
              <button class="btn btn-primary" id="btn-login-in-portal">登录</button>
              <button class="btn" id="btn-register-in-portal">注册</button>
            </div>
          </div>

          <div id="portal-main" class="hide">
            <div class="stats-row">
              <div class="stat-box"><div class="stat-label">邮箱</div><div class="stat-value" id="user-email">--</div></div>
              <div class="stat-box"><div class="stat-label">当前套餐</div><div class="stat-value" id="user-plan">--</div></div>
              <div class="stat-box"><div class="stat-label">到期时间</div><div class="stat-value" id="user-expire">--</div></div>
              <div class="stat-box"><div class="stat-label">账户余额</div><div class="stat-value" id="user-balance">--</div></div>
            </div>

            <div class="section" style="margin-top:12px;">
              <h4 style="margin:0 0 10px">订阅管理</h4>
              <div class="kv">
                <div class="kv-item"><div class="kv-label">剩余流量</div><div class="kv-value" id="user-traffic">--</div></div>
                <div class="kv-item"><div class="kv-label">订阅链接</div><div class="kv-value" id="sub-url">--</div></div>
              </div>
              <div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap;">
                <button class="btn btn-primary" id="btn-copy-sub">复制订阅</button>
                <button class="btn" id="btn-reset-sub">重置订阅</button>
                <button class="btn" id="btn-refresh-portal">刷新数据</button>
              </div>
            </div>

            <div class="section" style="margin-top:12px;">
              <h4 style="margin:0 0 10px">订单列表</h4>
              <div style="overflow:auto;">
                <table class="orders-table">
                  <thead>
                    <tr>
                      <th>订单号</th><th>套餐</th><th>状态</th><th>金额</th><th>操作</th>
                    </tr>
                  </thead>
                  <tbody id="orders-body"></tbody>
                </table>
              </div>
            </div>

            <div class="section" style="margin-top:12px;">
              <h4 style="margin:0 0 10px">邀请返利</h4>
              <div id="invite-summary" class="kv"></div>
            </div>
          </div>
        </section>

        <footer class="footer">
          © ${new Date().getFullYear()} ${esc(window.settings.title || "SlothVPN")} · Powered by XBoard
        </footer>
      </main>

      <div class="toast-wrap" id="toast-wrap"></div>
      <div class="modal-mask" id="modal-mask"><div class="modal" id="modal-body"></div></div>
    `;

    el.toastWrap = document.getElementById("toast-wrap");
    el.modalMask = document.getElementById("modal-mask");
    el.modalBody = document.getElementById("modal-body");
    el.btnLoginTop = document.getElementById("btn-login-top");
    el.btnRegisterTop = document.getElementById("btn-register-top");
    el.btnPortalTop = document.getElementById("btn-portal-top");
    el.btnLogoutTop = document.getElementById("btn-logout-top");
    el.plansGrid = document.getElementById("plans-grid");
    el.noticeList = document.getElementById("notice-list");
    el.portal = document.getElementById("portal");
    el.portalLoginHint = document.getElementById("portal-login-hint");
    el.portalMain = document.getElementById("portal-main");
    el.userEmail = document.getElementById("user-email");
    el.userPlan = document.getElementById("user-plan");
    el.userExpire = document.getElementById("user-expire");
    el.userTraffic = document.getElementById("user-traffic");
    el.userBalance = document.getElementById("user-balance");
    el.subUrl = document.getElementById("sub-url");
    el.ordersBody = document.getElementById("orders-body");
    el.inviteSummary = document.getElementById("invite-summary");
  }

  function bindStaticEvents() {
    el.btnLoginTop.addEventListener("click", () => openAuth("login"));
    el.btnRegisterTop.addEventListener("click", () => openAuth("register"));
    el.btnPortalTop.addEventListener("click", () => document.getElementById("portal").scrollIntoView({ behavior: "smooth" }));
    el.btnLogoutTop.addEventListener("click", () => logout());

    document.getElementById("btn-hero-login").addEventListener("click", () => openAuth("login"));
    document.getElementById("btn-hero-register").addEventListener("click", () => openAuth("register"));
    document.getElementById("btn-login-in-portal").addEventListener("click", () => openAuth("login"));
    document.getElementById("btn-register-in-portal").addEventListener("click", () => openAuth("register"));

    document.getElementById("btn-copy-sub").addEventListener("click", copySubUrl);
    document.getElementById("btn-reset-sub").addEventListener("click", resetSubUrl);
    document.getElementById("btn-refresh-portal").addEventListener("click", loadPortal);
    el.modalMask.addEventListener("click", (e) => { if (e.target === el.modalMask) closeModal(); });

    buildFaq();
  }

  function buildFaq() {
    const data = [
      ["如何开始使用？", "先注册账号并购买套餐，然后在用户中心复制订阅并导入客户端。"],
      ["支持哪些协议？", "通常支持 VLESS、VMESS、Trojan、Hysteria2、TUIC 等，具体以节点配置为准。"],
      ["如何续费或升级？", "在套餐页选择目标套餐和周期，系统会按后端规则计算折扣与抵扣。"],
      ["遇到问题怎么办？", "可在用户中心打开工单，并关注公告与教程内容。"],
    ];
    const box = document.getElementById("faq-list");
    box.innerHTML = data.map(([q, a], i) => `
      <div class="faq-item ${i === 0 ? "open" : ""}">
        <button type="button" class="faq-q">${esc(q)}</button>
        <div class="faq-a">${esc(a)}</div>
      </div>
    `).join("");
    box.querySelectorAll(".faq-q").forEach((btn) => {
      btn.addEventListener("click", () => btn.closest(".faq-item").classList.toggle("open"));
    });
  }

  function openAuth(mode) {
    const title = mode === "register" ? "注册账号" : mode === "forget" ? "找回密码" : "账号登录";
    openModal(title, `
      <form id="auth-form" class="form-grid">
        <div class="field"><label>邮箱</label><input name="email" required type="email" placeholder="name@example.com"/></div>
        <div class="field"><label>密码</label><input name="password" required type="password" minlength="8"/></div>
        <div class="mini-row ${mode === "login" ? "hide" : ""}" id="email-code-row">
          <div class="field"><label>邮箱验证码</label><input name="email_code" placeholder="6位验证码"/></div>
          <button class="btn" type="button" id="btn-send-code">发送验证码</button>
        </div>
        <div class="mini-row ${mode === "register" ? "" : "hide"}" id="invite-row">
          <div class="field"><label>邀请码（选填）</label><input name="invite_code" placeholder="邀请码"/></div>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <button class="btn btn-primary" type="submit">${mode === "register" ? "注册并登录" : mode === "forget" ? "重置密码" : "立即登录"}</button>
          <button class="btn" type="button" id="btn-switch-login">登录</button>
          <button class="btn" type="button" id="btn-switch-register">注册</button>
          <button class="btn" type="button" id="btn-switch-forget">忘记密码</button>
        </div>
      </form>
    `);

    document.getElementById("btn-switch-login").addEventListener("click", () => openAuth("login"));
    document.getElementById("btn-switch-register").addEventListener("click", () => openAuth("register"));
    document.getElementById("btn-switch-forget").addEventListener("click", () => openAuth("forget"));

    const form = document.getElementById("auth-form");
    const sendCodeBtn = document.getElementById("btn-send-code");
    sendCodeBtn?.addEventListener("click", async () => {
      const email = form.email.value.trim();
      if (!email) return showToast("请先输入邮箱", "warn");
      try {
        await api("/passport/comm/sendEmailVerify", { method: "POST", body: { email } });
        showToast("验证码已发送，请检查邮箱");
      } catch (e) {
        showToast(`发送失败：${getErrorMessage(e)}`, "err");
      }
    });

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const body = {
        email: form.email.value.trim(),
        password: form.password.value,
      };

      let path = "/passport/auth/login";
      if (mode === "register") {
        path = "/passport/auth/register";
        body.email_code = form.email_code.value.trim();
        body.invite_code = form.invite_code.value.trim();
      } else if (mode === "forget") {
        path = "/passport/auth/forget";
        body.email_code = form.email_code.value.trim();
      }

      try {
        const data = await api(path, { method: "POST", body });
        if (mode === "forget") {
          showToast("密码重置成功，请重新登录");
          openAuth("login");
          return;
        }
        setAuth(data);
        closeModal();
        showToast(mode === "register" ? "注册成功，已登录" : "登录成功");
        await loadPortal();
      } catch (err) {
        showToast(getErrorMessage(err), "err");
      }
    });
  }

  function logout() {
    setAuth("");
    state.userInfo = null;
    state.subInfo = null;
    state.orders = [];
    renderPortal();
    showToast("已退出登录");
  }

  function getPlanPeriods(plan) {
    return PERIODS
      .map(([k, label]) => ({ key: k, label, value: plan[k] }))
      .filter((it) => it.value !== null && it.value !== undefined);
  }

  function renderPlans() {
    el.plansGrid.innerHTML = state.plans.map((p) => {
      const periods = getPlanPeriods(p);
      const best = periods[0];
      return `
        <article class="plan-card" data-plan-id="${p.id}">
          <div class="plan-title">
            <h4>${esc(p.name)}</h4>
            <span class="plan-pill">${(p.transfer_enable / 1024 ** 3).toFixed(0)}GB</span>
          </div>
          <div style="color:var(--muted);font-size:13px;line-height:1.6;">${esc((p.content || "").replace(/[#>*`]/g, "").slice(0, 120))}</div>
          <div class="price-row">
            <div class="price">${best ? money(best.value) : "--"}</div>
            <div style="color:var(--muted);font-size:12px;">起</div>
          </div>
          <div class="plan-meta">
            <span class="meta-pill">设备数：${p.device_limit ?? "不限"}</span>
            <span class="meta-pill">速率：${p.speed_limit ?? "不限"}</span>
          </div>
          <div class="mini-row">
            <div class="field" style="margin:0;">
              <label>周期</label>
              <select class="plan-period">${periods.map(x => `<option value="${x.key}" data-price="${x.value}">${x.label} · ${money(x.value)}</option>`).join("")}</select>
            </div>
          </div>
          <div class="plan-actions">
            <button class="btn btn-primary plan-buy">立即购买</button>
            <button class="btn plan-login">${state.authData ? "进入中心" : "登录后购买"}</button>
          </div>
        </article>
      `;
    }).join("");

    el.plansGrid.querySelectorAll(".plan-login").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (!state.authData) return openAuth("login");
        document.getElementById("portal").scrollIntoView({ behavior: "smooth" });
      });
    });

    el.plansGrid.querySelectorAll(".plan-buy").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const card = btn.closest(".plan-card");
        const planId = Number(card.dataset.planId);
        const period = card.querySelector(".plan-period").value;
        if (!state.authData) return openAuth("login");
        await createOrder(planId, period);
      });
    });
  }

  async function createOrder(planId, period) {
    const coupon = window.prompt("可选：输入优惠码（留空则不使用）", "") || "";
    try {
      const tradeNo = await api("/user/order/save", {
        method: "POST",
        body: { plan_id: planId, period, coupon_code: coupon || undefined },
      });
      showToast(`下单成功：${tradeNo}`);
      await loadPortal();
      await payOrder(tradeNo);
    } catch (e) {
      showToast(`下单失败：${getErrorMessage(e)}`, "err");
    }
  }

  async function payOrder(tradeNo) {
    try {
      const methods = await api("/user/order/getPaymentMethod");
      if (!methods?.length) {
        showToast("当前没有可用支付方式", "warn");
        return;
      }
      const m = methods[0];
      const payResp = await fetch(`${API_BASE}/user/order/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: state.authData },
        body: JSON.stringify({ trade_no: tradeNo, method: m.id }),
      });
      const result = await payResp.json();
      if (!payResp.ok) throw new Error(result?.message || "支付发起失败");

      if (result.type === -1) {
        showToast("订单已完成支付");
        await loadPortal();
        return;
      }
      const payload = result.data;
      if (typeof payload === "string" && /^https?:/i.test(payload)) {
        window.open(payload, "_blank");
        showToast("已打开支付页面");
        return;
      }
      if (typeof payload === "string" && payload.includes("<form")) {
        const win = window.open("", "_blank");
        if (win) {
          win.document.write(payload);
          win.document.close();
        }
        showToast("已打开支付页面");
        return;
      }
      showToast("支付通道已返回，请在订单页刷新状态", "warn");
    } catch (e) {
      showToast(`支付失败：${getErrorMessage(e)}`, "err");
    }
  }

  function renderNotices() {
    if (!state.notices.length) {
      el.noticeList.innerHTML = `<div class="notice-item"><h5>暂无公告</h5><p>后续会在这里展示公告与活动。</p></div>`;
      return;
    }
    el.noticeList.innerHTML = state.notices.map((n) => `
      <article class="notice-item" data-id="${n.id}">
        <h5>${esc(n.title || "公告")}</h5>
        <p>${esc((n.content || "").replace(/<[^>]+>/g, "").slice(0, 90))}</p>
      </article>
    `).join("");
    el.noticeList.querySelectorAll(".notice-item").forEach((node) => {
      node.addEventListener("click", () => {
        const id = Number(node.dataset.id);
        const item = state.notices.find((x) => Number(x.id) === id);
        openModal(item?.title || "公告详情", `<div style="line-height:1.8;color:var(--muted);">${item?.content || "暂无内容"}</div>`);
      });
    });
  }

  function renderPortal() {
    const logged = !!state.authData;
    el.portal.classList.toggle("show", true);
    el.portalLoginHint.classList.toggle("hide", logged);
    el.portalMain.classList.toggle("hide", !logged);
    if (!logged) return;

    const user = state.userInfo || {};
    const sub = state.subInfo || {};

    el.userEmail.textContent = user.email || "--";
    el.userPlan.textContent = sub.plan?.name || "--";
    el.userExpire.textContent = toDateText(sub.expired_at);
    el.userBalance.textContent = money(user.balance || 0);
    el.userTraffic.textContent = `${bytesToText((sub.transfer_enable || 0) - (sub.u || 0) - (sub.d || 0))} / ${bytesToText(sub.transfer_enable || 0)}`;
    el.subUrl.textContent = sub.subscribe_url || "--";

    el.ordersBody.innerHTML = (state.orders || []).slice(0, 12).map((o) => {
      const statusMap = { 0: "待支付", 1: "已支付", 2: "已取消", 3: "已折抵" };
      return `
        <tr>
          <td>${esc(o.trade_no)}</td>
          <td>${esc(o.plan?.name || "--")}</td>
          <td>${statusMap[o.status] || o.status}</td>
          <td>${money(o.total_amount || 0)}</td>
          <td>
            <div class="orders-actions">
              ${o.status === 0 ? `<button class="btn btn-primary act-pay" data-trade="${esc(o.trade_no)}">支付</button>` : ""}
              ${o.status === 0 ? `<button class="btn act-cancel" data-trade="${esc(o.trade_no)}">取消</button>` : ""}
              <button class="btn act-detail" data-trade="${esc(o.trade_no)}">详情</button>
            </div>
          </td>
        </tr>
      `;
    }).join("");

    el.ordersBody.querySelectorAll(".act-pay").forEach((b) => b.addEventListener("click", () => payOrder(b.dataset.trade)));
    el.ordersBody.querySelectorAll(".act-cancel").forEach((b) => b.addEventListener("click", () => cancelOrder(b.dataset.trade)));
    el.ordersBody.querySelectorAll(".act-detail").forEach((b) => b.addEventListener("click", () => viewOrderDetail(b.dataset.trade)));

    const inv = state.invite || {};
    const stat = Array.isArray(inv.stat) ? inv.stat : [0, 0, 0, 0, 0];
    const code = inv.codes?.[0]?.code || "--";
    el.inviteSummary.innerHTML = `
      <div class="kv-item"><div class="kv-label">邀请码</div><div class="kv-value">${esc(code)}</div></div>
      <div class="kv-item"><div class="kv-label">邀请人数</div><div class="kv-value">${stat[0] || 0}</div></div>
      <div class="kv-item"><div class="kv-label">累计返利</div><div class="kv-value">${money(stat[1] || 0)}</div></div>
      <div class="kv-item"><div class="kv-label">可用佣金</div><div class="kv-value">${money(stat[4] || 0)}</div></div>
    `;
  }

  async function cancelOrder(tradeNo) {
    try {
      await api("/user/order/cancel", { method: "POST", body: { trade_no: tradeNo } });
      showToast("订单已取消");
      await loadPortal();
    } catch (e) {
      showToast(getErrorMessage(e), "err");
    }
  }

  async function viewOrderDetail(tradeNo) {
    try {
      const d = await api(`/user/order/detail?trade_no=${encodeURIComponent(tradeNo)}`);
      openModal("订单详情", `
        <div class="kv">
          <div class="kv-item"><div class="kv-label">订单号</div><div class="kv-value">${esc(d.trade_no)}</div></div>
          <div class="kv-item"><div class="kv-label">状态</div><div class="kv-value">${esc(String(d.status))}</div></div>
          <div class="kv-item"><div class="kv-label">套餐</div><div class="kv-value">${esc(d.plan?.name || "--")}</div></div>
          <div class="kv-item"><div class="kv-label">周期</div><div class="kv-value">${esc(d.period || "--")}</div></div>
          <div class="kv-item"><div class="kv-label">金额</div><div class="kv-value">${money(d.total_amount || 0)}</div></div>
          <div class="kv-item"><div class="kv-label">创建时间</div><div class="kv-value">${toDateText(d.created_at)}</div></div>
        </div>
      `);
    } catch (e) {
      showToast(getErrorMessage(e), "err");
    }
  }

  async function copySubUrl() {
    const url = state.subInfo?.subscribe_url;
    if (!url) return showToast("暂无订阅链接", "warn");
    try {
      await navigator.clipboard.writeText(url);
      showToast("订阅链接已复制");
    } catch (_) {
      showToast("复制失败，请手动复制", "warn");
    }
  }

  async function resetSubUrl() {
    try {
      const url = await api("/user/resetSecurity");
      showToast("订阅已重置");
      if (state.subInfo) state.subInfo.subscribe_url = url;
      renderPortal();
    } catch (e) {
      showToast(getErrorMessage(e), "err");
    }
  }

  async function loadGuest() {
    try {
      state.guestConfig = await api("/guest/comm/config");
    } catch (e) {
      showToast(`配置加载失败：${getErrorMessage(e)}`, "warn");
    }
  }

  async function loadPlans() {
    try {
      const plans = await api("/guest/plan/fetch");
      state.plans = Array.isArray(plans) ? plans : [];
      renderPlans();
    } catch (e) {
      showToast(`套餐加载失败：${getErrorMessage(e)}`, "err");
    }
  }

  async function loadNotices() {
    try {
      const resp = await fetch(`${API_BASE}/guest/notice/fetch?current=1&page_size=6`);
      if (!resp.ok) {
        state.notices = [];
        renderNotices();
        return;
      }
      const json = await resp.json();
      state.notices = Array.isArray(json.data) ? json.data : [];
      renderNotices();
    } catch (_) {
      state.notices = [];
      renderNotices();
    }
  }

  async function loadPortal() {
    if (!state.authData || state.loadingPortal) {
      renderPortal();
      return;
    }
    state.loadingPortal = true;
    try {
      const [userInfo, subInfo, orders, invite] = await Promise.all([
        api("/user/info"),
        api("/user/getSubscribe"),
        api("/user/order/fetch"),
        api("/user/invite/fetch"),
      ]);
      state.userInfo = userInfo;
      state.subInfo = subInfo;
      state.orders = Array.isArray(orders) ? orders : [];
      state.invite = invite || {};
      renderPortal();
    } catch (e) {
      if (e.status === 401) {
        logout();
        showToast("登录已失效，请重新登录", "warn");
      } else {
        showToast(`用户数据加载失败：${getErrorMessage(e)}`, "err");
      }
    } finally {
      state.loadingPortal = false;
    }
  }

  async function boot() {
    createLayout();
    bindStaticEvents();
    refreshTopActions();
    renderPortal();
    renderNotices();
    await loadGuest();
    await loadPlans();
    await loadNotices();
    if (state.authData) await loadPortal();
  }

  boot();
})();
