const $ = (s) => document.querySelector(s);
const esc = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const labels = {
  candidate: "候选证据",
  conflict: "疑似冲突",
  missing: "未找到证据",
};
const decisions = {
  pending: "待复核",
  supported: "证据充分",
  partial: "部分覆盖",
  unsupported: "明确不满足",
  missing: "未找到证据",
  excluded: "非要求条款",
};
let session = null,
  selected = 0,
  evidenceId = null,
  toastTimer;

function toast(message, error = false) {
  const el = $("#toast");
  el.textContent = message;
  el.className = error ? "error" : "";
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (el.hidden = true), 5500);
}
async function api(path, options = {}) {
  const res = await fetch(path, options);
  if (!res.ok) {
    let body;
    try {
      body = await res.json();
    } catch {
      body = { detail: "服务暂时不可用。" };
    }
    throw new Error(
      typeof body.detail === "string"
        ? body.detail
        : "提交内容无效，请检查文件与填写内容。",
    );
  }
  return res.json();
}
async function guarded(fn) {
  try {
    await fn();
  } catch (error) {
    toast(error.message, true);
  }
}
function openUpload() {
  $("#upload-dialog").showModal();
}
function setSession(value) {
  session = value;
  selected = 0;
  evidenceId = null;
  localStorage.setItem("traceclause-session", value.id);
  $("#search").value = "";
  $("#filter").value = "all";
  render();
  guarded(refreshHistory);
}
async function refreshHistory() {
  const list = await api("/api/sessions");
  $("#history").innerHTML = list.length
    ? list
        .map(
          (item) =>
            `<button class="history-item ${session?.id === item.id ? "active" : ""}" data-id="${item.id}"><strong>${esc(item.name)}</strong><small>${item.reviewed} / ${item.count} 已复核 · ${new Date(item.created_at).toLocaleDateString("zh-CN")}</small></button>`,
        )
        .join("")
    : '<div class="empty-list">还没有核验任务</div>';
  $("#history")
    .querySelectorAll("button")
    .forEach(
      (button) =>
        (button.onclick = () =>
          guarded(async () =>
            setSession(await api(`/api/sessions/${button.dataset.id}`)),
          )),
    );
}
function render() {
  $("#welcome").hidden = true;
  $("#workspace").hidden = false;
  $("#export-open").disabled = false;
  $("#documents").innerHTML = ["requirement", "response"]
    .map(
      (kind, i) =>
        `<div class="document-card"><span class="file-icon">${esc(session[kind].filename.split(".").pop().toUpperCase())}</span><div class="doc-text"><small>${i ? "响应材料" : "需求基准"} · ${session[kind].blocks.length} 个原文片段</small><strong>${esc(session[kind].filename)}</strong></div><button data-source="${kind}">查看原文 ↗</button></div>`,
    )
    .join("");
  $("#documents")
    .querySelectorAll("button")
    .forEach((b) => (b.onclick = () => showSource(b.dataset.source)));
  const warnings = [
    ...session.requirement.warnings,
    ...session.response.warnings,
  ];
  $("#warnings").hidden = !warnings.length;
  $("#warnings").textContent = warnings.join(" ");
  const rows = session.rows,
    count = (status) => rows.filter((r) => r.status === status).length;
  $("#stats").innerHTML = [
    [rows.length, "提取要求", "待核对完整性", ""],
    [count("candidate"), "候选证据", "待人工确认", ""],
    [count("conflict"), "疑似冲突", "建议优先核对", "amber"],
    [count("missing"), "未找到证据", "可手动查找", "red"],
  ]
    .map(
      ([n, title, note, cls]) =>
        `<div class="stat ${cls}"><div class="stat-label">${title}<span>↗</span></div><strong>${n.toString().padStart(2, "0")}</strong><small>${note}</small></div>`,
    )
    .join("");
  $("#progress").textContent =
    `${rows.filter((r) => r.review.decision !== "pending").length} / ${rows.length} 已复核`;
  renderList();
  renderDetail();
  document
    .querySelectorAll("[data-format]")
    .forEach(
      (a) =>
        (a.href = `/api/sessions/${session.id}/export?format=${a.dataset.format}`),
    );
}
function renderList() {
  if (!session) return;
  const query = $("#search").value.toLowerCase(),
    filter = $("#filter").value;
  const rows = session.rows.filter(
    (row) =>
      row.clause.text.toLowerCase().includes(query) &&
      (filter === "all" ||
        (filter === "pending" && row.review.decision === "pending") ||
        (filter === "reviewed" && row.review.decision !== "pending") ||
        row.status === filter),
  );
  $("#clause-list").innerHTML =
    rows
      .map((row) => {
        const done = row.review.decision !== "pending";
        return `<button class="clause-row ${selected === row.clause.id ? "selected" : ""}" data-id="${row.clause.id}"><div class="clause-meta"><span class="clause-num">REQ-${String(row.clause.id + 1).padStart(3, "0")}</span><span class="badge ${done ? "reviewed" : row.status}">${done ? decisions[row.review.decision] : labels[row.status]}</span></div><p>${esc(row.clause.text)}</p><small>${esc(row.clause.location)} · ${done ? "已记录复核依据" : "等待人工复核"}</small></button>`;
      })
      .join("") || '<div class="empty-list">没有符合条件的条款</div>';
  $("#clause-list")
    .querySelectorAll("button")
    .forEach(
      (b) =>
        (b.onclick = () => {
          selected = Number(b.dataset.id);
          evidenceId = null;
          renderList();
          renderDetail();
        }),
    );
}
function renderDetail() {
  const row = session.rows[selected];
  if (!row) return;
  evidenceId = row.review.evidence_id;
  const candidates = [...row.candidates];
  if (
    evidenceId !== null &&
    !candidates.some((c) => c.block_id === evidenceId)
  ) {
    const b = session.response.blocks.find((b) => b.id === evidenceId);
    candidates.unshift({ ...b, block_id: b.id, terms: [], coverage: null });
  }
  $("#detail").innerHTML =
    `<div class="detail-title"><span>REQUIREMENT ${String(selected + 1).padStart(3, "0")}</span><span class="badge ${row.status}">${labels[row.status]}</span></div><h3 class="requirement-quote">${esc(row.clause.text)}</h3><button class="source-link" id="req-source">▤ ${esc(session.requirement.filename)} / ${esc(row.clause.location)} ↗</button><div class="divider"></div><div class="section-label">原文证据 <small>选择用于支撑复核结论的段落</small></div>${candidates.map((c) => `<label class="evidence"><div class="evidence-head"><span><input type="radio" name="evidence" value="${c.block_id}" ${c.block_id === evidenceId ? "checked" : ""}>${esc(c.location)}</span><span>${c.coverage === null ? "人工选定" : `词面覆盖 ${Math.round(c.coverage * 100)}%`}</span></div><p>${esc(c.text)}</p>${c.terms.length ? `<div class="terms">匹配词：${c.terms.slice(0, 10).map(esc).join(" · ")}</div>` : ""}</label>`).join("") || '<p class="hint">没有检索到候选段落，可打开响应全文手动选择证据。</p>'}<button class="source-link" id="res-source">在响应全文中查找证据 ↗</button><div class="explanation">${esc(row.reason)}</div><div class="divider"></div><form id="review-form" class="review-form"><div class="section-label">人工复核 <small>已保存 ${session.audit.filter((a) => a.clause_id === selected).length} 次记录</small></div><label for="decision">复核结论</label><select id="decision">${Object.entries(
      decisions,
    )
      .map(
        ([key, label]) =>
          `<option value="${key}" ${row.review.decision === key ? "selected" : ""}>${label}</option>`,
      )
      .join(
        "",
      )}</select><label for="note">复核依据</label><textarea id="note" maxlength="2000" placeholder="说明覆盖范围、缺失内容或数值差异，便于后续追溯…">${esc(row.review.note)}</textarea><div class="review-actions"><small>保存后记录结论与修改历史</small><button type="submit" class="primary">保存复核结果 ✓</button></div></form><details class="audit"><summary>查看本条复核历史</summary>${
      session.audit
        .filter((a) => a.clause_id === selected)
        .map(
          (a) =>
            `<p>${new Date(a.at).toLocaleString("zh-CN")} · ${decisions[a.before.decision]} → ${decisions[a.after.decision]}<br>${esc(a.after.note)}</p>`,
        )
        .join("") || "<p>尚无人工复核记录。</p>"
    }</details>`;
  $("#req-source").onclick = () =>
    showSource("requirement", row.clause.block_id);
  $("#res-source").onclick = () => showSource("response");
  document
    .querySelectorAll("input[name=evidence]")
    .forEach((r) => (r.onchange = () => (evidenceId = Number(r.value))));
  $("#review-form").onsubmit = (event) => {
    event.preventDefault();
    guarded(async () => {
      const button = event.target.querySelector("button[type=submit]");
      button.disabled = true;
      try {
        session = await api(`/api/sessions/${session.id}/reviews/${selected}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            revision: session.revision,
            decision: $("#decision").value,
            note: $("#note").value,
            evidence_id: evidenceId,
          }),
        });
        render();
        await refreshHistory();
        toast("复核结果已保存，修改记录已保留。");
      } finally {
        button.disabled = false;
      }
    });
  };
}
function showSource(kind, blockId) {
  const doc = session[kind];
  $("#source-title").textContent = doc.filename;
  $("#source-body").innerHTML =
    `<div class="source-meta">SHA-256 · ${esc(doc.sha256)}<br><a href="/api/sessions/${session.id}/source/${kind}">↓ 下载原始文件</a></div>${doc.blocks.map((b) => `<div class="source-block ${b.id === blockId ? "highlight" : ""}" data-block="${b.id}"><small>${esc(b.location)}</small><p>${esc(b.text)}</p>${kind === "response" ? `<button class="subtle" data-evidence="${b.id}">选择此段作为证据 →</button>` : ""}</div>`).join("")}`;
  $("#source-body")
    .querySelectorAll("[data-evidence]")
    .forEach(
      (button) =>
        (button.onclick = () => {
          const decision = $("#decision").value,
            note = $("#note").value;
          const row = session.rows[selected];
          const previous = row.review.evidence_id;
          row.review.evidence_id = Number(button.dataset.evidence);
          renderDetail();
          row.review.evidence_id = previous;
          $("#decision").value = decision;
          $("#note").value = note;
          $("#source-dialog").close();
          toast("已选定证据，请保存复核结果。");
        }),
    );
  $("#source-dialog").showModal();
  if (blockId !== undefined)
    $("#source-body")
      .querySelector(`[data-block="${blockId}"]`)
      ?.scrollIntoView({ block: "center" });
}
async function loadDemo() {
  await guarded(async () => {
    const buttons = [$("#demo"), $("#welcome-demo")];
    buttons.forEach((b) => (b.disabled = true));
    try {
      setSession(await api("/api/demo", { method: "POST" }));
      toast("演示任务已创建，包含数值差异、否定表述与缺失证据。");
    } finally {
      buttons.forEach((b) => (b.disabled = false));
    }
  });
}
$("#new-task").onclick = openUpload;
$("#welcome-new").onclick = openUpload;
$("#demo").onclick = loadDemo;
$("#welcome-demo").onclick = loadDemo;
$("#refresh-history").onclick = () => guarded(refreshHistory);
$("#export-open").onclick = () => $("#export-dialog").showModal();
document
  .querySelectorAll(".close-dialog")
  .forEach((b) => (b.onclick = () => b.closest("dialog").close()));
$("#search").oninput = renderList;
$("#filter").onchange = renderList;
$("#upload-form").onsubmit = (event) => {
  event.preventDefault();
  guarded(async () => {
    const button = $("#upload-submit");
    button.disabled = true;
    button.textContent = "正在解析与检索…";
    try {
      const data = await api("/api/sessions", {
        method: "POST",
        body: new FormData(event.target),
      });
      setSession(data);
      $("#upload-dialog").close();
      event.target.reset();
      toast("文件已导入，可以开始核验。");
    } finally {
      button.disabled = false;
      button.textContent = "导入并开始核验 →";
    }
  });
};
guarded(async () => {
  await refreshHistory();
  const id = localStorage.getItem("traceclause-session");
  if (id) {
    try {
      setSession(await api(`/api/sessions/${encodeURIComponent(id)}`));
    } catch {
      localStorage.removeItem("traceclause-session");
    }
  }
});
