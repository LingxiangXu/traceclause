const $ = (s) => document.querySelector(s);
const esc = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const choiceKeys = [
  "pending",
  "supported",
  "partial",
  "unsupported",
  "missing",
  "excluded",
];
let session = null,
  selected = null,
  reviewDraft = null,
  editor = null,
  toastTimer,
  storageFailed = false;
let tabId;
try {
  tabId = sessionStorage.getItem("traceclause-tab") || crypto.randomUUID();
  sessionStorage.setItem("traceclause-tab", tabId);
} catch {
  tabId = crypto.randomUUID();
}
const drafts = new TraceDrafts(localStorage, tabId);
const active = () => session?.rows.filter((r) => !r.superseded_by.length) || [];
const currentRow = () => active().find((r) => r.clause.id === selected);
const date = (value) =>
  new Date(value).toLocaleString(language === "zh" ? "zh-CN" : "en-US");

function toast(message, error = false) {
  $("#toast").textContent = message;
  $("#toast").className = error ? "error" : "";
  $("#toast").hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => ($("#toast").hidden = true), 6000);
}
async function guarded(fn) {
  try {
    return await fn();
  } catch (error) {
    toast(error.message, true);
  }
}
async function api(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: { "Accept-Language": language, ...options.headers },
  });
  if (!response.ok) {
    let body;
    try {
      body = await response.json();
    } catch {
      body = { detail: t("unavailable") };
    }
    const error = new Error(
      response.status === 409
        ? t("updateConflict")
        : typeof body.detail === "string"
          ? body.detail
          : t("invalid"),
    );
    error.status = response.status;
    throw error;
  }
  return response.json();
}
async function mutation(path, body, method = "POST") {
  document.body.inert = true;
  try {
    return await api(path, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } finally {
    document.body.inert = false;
  }
}
function writeDraft(item, data) {
  try {
    drafts.save(session.id, item, data);
    storageFailed = false;
  } catch {
    storageFailed = true;
    toast(t("draftError"), true);
  }
  renderDrafts();
}
function reviewItem() {
  return `review-${selected}`;
}
function captureReview() {
  if (!reviewDraft || !$("#note")) return;
  reviewDraft.note = $("#note").value;
  reviewDraft.decision = $("#decision").value;
  writeDraft(reviewItem(), reviewDraft);
  $("#draft-state").textContent = t(storageFailed ? "draftError" : "draft");
}
function safeSwitch(fn) {
  if (storageFailed) {
    toast(t("draftError"), true);
    return;
  }
  fn();
}
function setSession(value) {
  session = value;
  selected = active()[0]?.clause.id ?? null;
  localStorage.setItem("traceclause-session", value.id);
  $("#search").value = "";
  $("#filter").value = "all";
  render();
  guarded(refreshHistory);
}
function renderShell() {
  document.documentElement.lang = language === "zh" ? "zh-CN" : "en";
  document.title =
    language === "zh" ? "TraceClause · 有据" : "TraceClause · Evidence review";
  document.body.innerHTML = `
  <aside class="sidebar">
    <a class="brand" href="/"><span class="brand-icon">▤</span><span>TraceClause<small>${t("subtitle")}</small></span></a>
    <button id="new-task" class="primary wide">${t("newTask")}</button>
    <div class="nav-caption">${t("workspace")}</div><div class="nav-active">▦ ${t("reviews")} <span class="nav-dot"></span></div>
    <div class="history-head"><span class="nav-caption">${t("recent")}</span><button id="refresh-history" class="icon-button" aria-label="${t("refresh")}">↻</button></div>
    <nav id="history" aria-label="${t("recent")}"></nav>
    <div class="sidebar-bottom"><span class="local-dot"></span> ${t("local")}<small>${t("localNote")}</small><div class="version">${t("edition")}<span>v0.2.0</span></div></div>
  </aside>
  <main>
    <header class="topbar"><div>${t("workspace")} <span>/</span> <strong>${t("reviews")}</strong></div><div class="topbar-right">
    <select id="language" aria-label="Language"><option value="en" ${language === "en" ? "selected" : ""}>English</option><option value="zh" ${language === "zh" ? "selected" : ""}>中文</option></select><button id="demo" class="subtle">${t("demo")}</button></div></header>
    <section class="page-heading"><div><div class="eyebrow">DOCUMENT EVIDENCE WORKBENCH</div><h1>${t("heading")}</h1><p>${t("intro")}</p></div><button id="export-open" class="secondary" disabled>${t("export")}</button></section>
    <section id="welcome" class="welcome"><div class="welcome-symbol">▤</div><div class="eyebrow">START WITH TWO DOCUMENTS</div><h2>${t("welcome")}</h2><p>${t("welcomeNote")}</p><div class="welcome-actions"><button id="welcome-new" class="primary">${t("first")}</button><button id="welcome-demo" class="secondary">${t("tryDemo")}</button></div><div class="steps"><div><b>01</b><strong>${t("import")}</strong><span>PDF / DOCX / TXT / MD</span></div><div><b>02</b><strong>${t("inspect")}</strong></div><div><b>03</b><strong>${t("decide")}</strong></div></div></section>
    <section id="workspace" hidden><div id="documents" class="documents"></div><div id="warnings" class="warnings" hidden></div><div id="stats" class="stats"></div>
    <div id="drafts-panel"></div><div class="workspace-caption"><div><h2>${t("clauseReview")}</h2><span id="progress"></span></div><button id="add-clause" class="secondary">${t("add")}</button></div>
    <div class="review-layout"><section class="clause-panel"><div class="list-tools"><label class="search"><span>⌕</span><input id="search" placeholder="${t("search")}" aria-label="${t("search")}"></label><select id="filter" aria-label="${t("filter")}">${["all", "pending", "reviewed", "conflict", "missing"].map((key) => `<option value="${key}">${t(key)}</option>`).join("")}</select></div><div id="clause-list"></div></section><section id="detail" class="detail-panel" aria-label="${t("clauseReview")}"></section></div><p class="footnote">${t("footnote")}</p></section>
  </main>
  <dialog id="upload-dialog"><form id="upload-form"><div class="dialog-heading"><h2>${t("newTask")}</h2><button type="button" class="icon-button close-dialog" aria-label="${t("close")}">×</button></div><p>${t("uploadNote")}</p><label class="upload-field"><b>01 · ${t("requirements")}</b><span>${t("requirementHint")}</span><input required type="file" name="requirement" accept=".pdf,.docx,.txt,.md"></label><label class="upload-field"><b>02 · ${t("response")}</b><span>${t("responseHint")}</span><input required type="file" name="response" accept=".pdf,.docx,.txt,.md"></label><p class="hint">${t("limits")}</p><div class="dialog-actions"><button type="button" class="secondary close-dialog">${t("uploadCancel")}</button><button id="upload-submit" type="submit" class="primary">${t("upload")}</button></div></form></dialog>
  <dialog id="source-dialog" class="source-dialog"><div class="dialog-heading"><h2 id="source-title"></h2><button class="icon-button close-dialog" aria-label="${t("close")}">×</button></div><div id="source-body"></div></dialog>
  <dialog id="editor-dialog" class="source-dialog"><div class="dialog-heading"><h2 id="editor-title"></h2><button class="icon-button close-dialog" aria-label="${t("close")}">×</button></div><div id="editor-body"></div></dialog>
  <dialog id="export-dialog"><div class="dialog-heading"><h2>${t("export")}</h2><button class="icon-button close-dialog" aria-label="${t("close")}">×</button></div><p>${t("exportNote")}</p><label class="report-language">${t("reportLang")} <select id="report-language"><option value="en">English</option><option value="zh">中文</option></select></label><div class="export-options">${["md", "csv", "json"].map((format) => `<a data-format="${format}"><b>${t(format)} ↗</b><span>${t(format + "Note")}</span></a>`).join("")}</div></dialog>
  <dialog id="draft-reader"><div class="dialog-heading"><h2>${t("drafts")}</h2><button class="icon-button close-dialog" aria-label="${t("close")}">×</button></div><p>${t("archivedDraft")}</p><textarea id="draft-content" readonly aria-label="${t("drafts")}"></textarea></dialog>
  <div id="toast" role="status" aria-live="polite" hidden></div>`;
  $("#new-task").onclick = $("#welcome-new").onclick = () =>
    safeSwitch(() => $("#upload-dialog").showModal());
  $("#demo").onclick = $("#welcome-demo").onclick = () =>
    guarded(async () => {
      if (storageFailed) throw new Error(t("draftError"));
      setSession(await mutation("/api/demo", {}));
    });
  $("#refresh-history").onclick = () => guarded(refreshHistory);
  $("#search").oninput = renderList;
  $("#filter").onchange = renderList;
  $("#add-clause").onclick = () => safeSwitch(() => openEditor("add"));
  $("#export-open").onclick = () => {
    $("#report-language").value = language;
    exportLinks();
    $("#export-dialog").showModal();
  };
  $("#report-language").onchange = exportLinks;
  document.querySelectorAll(".close-dialog").forEach(
    (b) =>
      (b.onclick = () => {
        if (storageFailed) {
          toast(t("draftError"), true);
          return;
        }
        b.closest("dialog").close();
      }),
  );
  document.querySelectorAll("dialog").forEach((d) =>
    d.addEventListener("cancel", (e) => {
      if (storageFailed) e.preventDefault();
    }),
  );
  $("#language").onchange = (e) =>
    safeSwitch(() => {
      const openEditorState = $("#editor-dialog").open ? { ...editor } : null;
      language = e.target.value;
      localStorage.setItem("traceclause-language", language);
      renderShell();
      if (session) render();
      guarded(refreshHistory);
      if (openEditorState)
        openEditor(
          openEditorState.mode,
          openEditorState.target,
          openEditorState.block_id,
        );
    });
  $("#upload-form").onsubmit = (e) => {
    e.preventDefault();
    guarded(async () => {
      document.body.inert = true;
      try {
        const value = await api("/api/sessions", {
          method: "POST",
          body: new FormData(e.target),
        });
        $("#upload-dialog").close();
        e.target.reset();
        setSession(value);
        toast(t("uploaded"));
      } finally {
        document.body.inert = false;
      }
    });
  };
}
async function refreshHistory() {
  const list = await api("/api/sessions");
  $("#history").innerHTML =
    list
      .map(
        (item) =>
          `<button class="history-item ${session?.id === item.id ? "active" : ""}" data-id="${item.id}"><strong>${esc(item.name)}</strong><small>${item.reviewed} / ${item.count} ${t("reviewed")}</small></button>`,
      )
      .join("") || `<div class="empty-list">${t("noTasks")}</div>`;
  $("#history")
    .querySelectorAll("button")
    .forEach(
      (b) =>
        (b.onclick = () =>
          safeSwitch(() =>
            guarded(async () =>
              setSession(await api(`/api/sessions/${b.dataset.id}`)),
            ),
          )),
    );
}
function render() {
  $("#welcome").hidden = true;
  $("#workspace").hidden = false;
  $("#export-open").disabled = false;
  if (!currentRow()) selected = active()[0]?.clause.id ?? null;
  $("#documents").innerHTML = ["requirement", "response"]
    .map(
      (kind, i) =>
        `<div class="document-card"><span class="file-icon">${esc(session[kind].filename.split(".").pop().toUpperCase())}</span><div class="doc-text"><small>${t(i ? "response" : "requirements")} · ${session[kind].blocks.length} ${t("blocks")}</small><strong>${esc(session[kind].filename)}</strong></div><button data-source="${kind}">${t("view")}</button></div>`,
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
  $("#warnings").textContent = warnings.map(localized).join(" ");
  const rows = active(),
    count = (status) => rows.filter((r) => r.status === status).length;
  $("#stats").innerHTML = [
    [rows.length, "total", "complete", ""],
    [count("candidate"), "candidate", "pending", ""],
    [count("conflict"), "conflict", "priority", "amber"],
    [count("missing"), "missing", "manual", "red"],
  ]
    .map(
      ([n, title, note, cls]) =>
        `<div class="stat ${cls}"><div class="stat-label">${t(title)}</div><strong>${String(n).padStart(2, "0")}</strong><small>${t(note)}</small></div>`,
    )
    .join("");
  $("#progress").textContent =
    `${rows.filter((r) => r.review.decision !== "pending").length} / ${rows.length} ${t("reviewed")}`;
  renderDrafts();
  renderList();
  renderDetail();
}
function renderList() {
  if (!session) return;
  const query = $("#search").value.toLowerCase(),
    filter = $("#filter").value;
  const rows = active().filter(
    (r) =>
      r.clause.text.toLowerCase().includes(query) &&
      (filter === "all" ||
        (filter === "pending" && r.review.decision === "pending") ||
        (filter === "reviewed" && r.review.decision !== "pending") ||
        r.status === filter),
  );
  $("#clause-list").innerHTML =
    rows
      .map(
        (r) =>
          `<button class="clause-row ${selected === r.clause.id ? "selected" : ""}" data-id="${r.clause.id}"><div class="clause-meta"><span class="clause-num">REQ-${String(r.clause.id + 1).padStart(3, "0")}</span><span class="badge ${r.review.decision === "pending" ? r.status : "reviewed"}">${t(r.review.decision === "pending" ? r.status : r.review.decision)}</span></div><p>${esc(r.clause.text)}</p><small>${esc(localized(r.clause.location))}</small></button>`,
      )
      .join("") ||
    `<div class="empty-list">${t(active().length ? "empty" : "noClauses")}</div>`;
  $("#clause-list")
    .querySelectorAll("button")
    .forEach(
      (b) =>
        (b.onclick = () =>
          safeSwitch(() => {
            selected = Number(b.dataset.id);
            renderList();
            renderDetail();
          })),
    );
}
function renderDrafts() {
  if (!session || !$("#drafts-panel")) return;
  const list = drafts.list(session.id);
  $("#drafts-panel").innerHTML = list.length
    ? `<details class="draft-box"><summary>${t("drafts")} · ${list.length}</summary>${list.map((d, i) => `<button class="subtle" data-draft="${i}">${t("resume")} · ${esc(d.item)} · ${esc(date(d.at))}</button>`).join("")}</details>`
    : "";
  $("#drafts-panel")
    .querySelectorAll("button")
    .forEach(
      (b) =>
        (b.onclick = () =>
          safeSwitch(() => {
            const d = list[Number(b.dataset.draft)];
            const target = d.data.target;
            if (
              (d.data.kind === "review" &&
                !active().some((r) => r.clause.id === target)) ||
              (d.data.kind === "editor" &&
                d.data.mode !== "add" &&
                !active().some((r) => r.clause.id === target))
            ) {
              $("#draft-content").value = JSON.stringify(d.data, null, 2);
              $("#draft-reader").showModal();
              return;
            }
            drafts.save(session.id, d.item, d.data);
            if (d.data.kind === "review") {
              selected = target;
              renderList();
              renderDetail();
            } else openEditor(d.data.mode, target, d.data.block_id);
          })),
    );
}
function renderDetail() {
  const row = currentRow();
  if (!row) {
    reviewDraft = null;
    $("#detail").innerHTML = `<p>${t("noClauses")}</p>`;
    return;
  }
  const stored = drafts.get(session.id, reviewItem());
  reviewDraft = stored
    ? structuredClone(stored.data)
    : {
        kind: "review",
        target: selected,
        base_revision: session.revision,
        clause_version: row.clause.version,
        ...structuredClone(row.review),
      };
  const stale =
    reviewDraft.base_revision !== session.revision ||
    reviewDraft.clause_version !== row.clause.version;
  const candidates = [...row.candidates];
  for (const id of reviewDraft.evidence_ids)
    if (!candidates.some((c) => c.block_id === id)) {
      const block = session.response.blocks.find((b) => b.id === id);
      if (block)
        candidates.unshift({
          ...block,
          block_id: id,
          terms: [],
          coverage: null,
        });
    }
  const lineage = new Set([selected]);
  let ancestor = row;
  while (ancestor.clause.parent_id !== undefined) {
    lineage.add(ancestor.clause.parent_id);
    ancestor = session.rows.find(
      (r) => r.clause.id === ancestor.clause.parent_id,
    );
  }
  const history = session.audit.filter((a) => lineage.has(a.clause_id));
  $("#detail").innerHTML =
    `<div class="detail-title"><span>REQ-${String(selected + 1).padStart(3, "0")}</span><span class="badge ${row.status}">${t(row.status)}</span></div>
  <h3 class="requirement-quote">${esc(row.clause.text)}</h3><button class="source-link" id="req-source">▤ ${esc(localized(row.clause.location))} ↗</button>
  <div class="clause-actions"><button id="edit-clause" class="subtle">${t("edit")}</button><button id="split-clause" class="subtle">${t("split")}</button></div>
  ${row.clause.origin !== "extracted" ? `<details class="audit"><summary>${t("original")}</summary><p>${esc(row.clause.source_text)}</p></details>` : ""}
  <div class="divider"></div><div class="section-label">${t("evidence")}<small>${t("selectMany")}</small></div>
  ${candidates.map((c) => `<label class="evidence"><div class="evidence-head"><span><input type="checkbox" name="evidence" value="${c.block_id}" ${reviewDraft.evidence_ids.includes(c.block_id) ? "checked" : ""}>${esc(localized(c.location))}</span><span>${c.coverage === null ? t("chosen") : t("coverage") + " " + Math.round(c.coverage * 100) + "%"}</span></div><p>${esc(c.text)}</p>${c.terms.length ? `<div class="terms">${t("terms")}: ${c.terms.slice(0, 10).map(esc).join(" · ")}</div>` : ""}</label>`).join("") || `<p class="hint">${t("noEvidence")}</p>`}
  <button class="source-link" id="res-source">${t("findEvidence")}</button><div class="explanation">${esc(localized(row.reason))}</div><div class="divider"></div>
  ${stale ? `<div class="warnings" role="alert">${t("stale")}<p>${t("current")}: ${t(row.review.decision)} · ${esc(row.review.note)}</p><button id="rebase-review" class="secondary">${t("rebase")}</button></div>` : ""}
  <form id="review-form" class="review-form"><div class="section-label">${t("review")}</div><label for="decision">${t("decision")}</label><select id="decision">${choiceKeys.map((k) => `<option value="${k}" ${reviewDraft.decision === k ? "selected" : ""}>${t(k)}</option>`).join("")}</select>
  <label for="note">${t("rationale")}</label><textarea id="note" maxlength="2000" placeholder="${t("noteHint")}">${esc(reviewDraft.note)}</textarea>
  <div class="review-actions"><small id="draft-state">${t(stored ? "draft" : "draftNone")}</small><button class="primary" type="submit" ${stale ? "disabled" : ""}>${t("save")}</button></div></form>
  <div class="clause-actions"><button id="reload-task" class="subtle">${t("conflictRefresh")}</button><button id="discard-draft" class="subtle">${t("discard")}</button></div>
  <details class="audit"><summary>${t("history")} · ${history.length}</summary>${history.map((e) => `<p>${esc(date(e.at))} · REQ-${String(e.clause_id + 1).padStart(3, "0")} · ${t({ add: "added", edit: "edited", split: "splitEvent", review: "review" }[e.kind || "review"])}</p><b>${t("before")}</b>${historyValue(e.before)}<b>${t("after")}</b>${historyValue(e.after)}`).join("") || t("noHistory")}</details>`;
  $("#req-source").onclick = () =>
    showSource("requirement", row.clause.block_id);
  $("#res-source").onclick = () => showSource("response");
  $("#edit-clause").onclick = () =>
    safeSwitch(() => openEditor("edit", selected));
  $("#split-clause").onclick = () =>
    safeSwitch(() => openEditor("split", selected));
  $("#note").oninput = captureReview;
  $("#decision").onchange = captureReview;
  document.querySelectorAll("input[name=evidence]").forEach(
    (input) =>
      (input.onchange = () => {
        const id = Number(input.value);
        reviewDraft.evidence_ids = input.checked
          ? [...new Set([...reviewDraft.evidence_ids, id])]
          : reviewDraft.evidence_ids.filter((x) => x !== id);
        captureReview();
      }),
  );
  if (stale)
    $("#rebase-review").onclick = () => {
      reviewDraft.base_revision = session.revision;
      reviewDraft.clause_version = row.clause.version;
      captureReview();
      renderDetail();
    };
  $("#reload-task").onclick = () =>
    guarded(async () => {
      session = await api(`/api/sessions/${session.id}`);
      render();
    });
  $("#discard-draft").onclick = () => {
    if (confirm(t("discardConfirm"))) {
      drafts.removeOwn(session.id, reviewItem());
      renderDetail();
      renderDrafts();
    }
  };
  $("#review-form").onsubmit = (e) => {
    e.preventDefault();
    captureReview();
    guarded(async () => {
      const task = session.id,
        item = reviewItem(),
        payload = structuredClone(reviewDraft);
      session = await mutation(
        `/api/sessions/${task}/reviews/${selected}`,
        {
          revision: payload.base_revision,
          decision: payload.decision,
          note: payload.note,
          evidence_ids: payload.evidence_ids,
        },
        "PUT",
      );
      drafts.removeOwn(task, item);
      storageFailed = false;
      render();
      await refreshHistory();
      toast(t("saved"));
    });
  };
}
function historyValue(value) {
  if (!value) return `<p>—</p>`;
  if (value.children) return value.children.map(historyValue).join("");
  const review = value.review || value;
  const ids =
    review.evidence_ids ||
    (review.evidence_id == null ? [] : [review.evidence_id]);
  return `${value.clause ? `<p>REQ-${String(value.clause.id + 1).padStart(3, "0")} · ${esc(value.clause.text)}</p>` : ""}<p>${t(review.decision)} · ${esc(review.note)}</p>${ids
    .map((id) => {
      const b = session.response.blocks.find((b) => b.id === id);
      return b
        ? `<blockquote>${esc(localized(b.location))} · ${esc(b.text)}</blockquote>`
        : "";
    })
    .join("")}`;
}
function showSource(kind, blockId) {
  const doc = session[kind];
  $("#source-title").textContent = doc.filename;
  $("#source-body").innerHTML =
    `<div class="source-meta">SHA-256 · ${esc(doc.sha256)}<br><a href="/api/sessions/${session.id}/source/${kind}">${t("download")}</a></div>${doc.blocks.map((b) => `<div class="source-block ${b.id === blockId ? "highlight" : ""}" data-block="${b.id}"><small>${esc(localized(b.location))}</small><p>${esc(b.text)}</p><button class="subtle" data-source-action="${b.id}">${t(kind === "requirement" ? "fromSource" : "select")}</button></div>`).join("")}`;
  $("#source-body")
    .querySelectorAll("[data-source-action]")
    .forEach(
      (b) =>
        (b.onclick = () => {
          const id = Number(b.dataset.sourceAction);
          if (kind === "requirement") {
            $("#source-dialog").close();
            openEditor("add", null, id);
          } else if (reviewDraft) {
            reviewDraft.evidence_ids = [
              ...new Set([...reviewDraft.evidence_ids, id]),
            ];
            captureReview();
            $("#source-dialog").close();
            renderDetail();
          }
        }),
    );
  $("#source-dialog").showModal();
  if (blockId !== undefined)
    $("#source-body")
      .querySelector(`[data-block="${blockId}"]`)
      ?.scrollIntoView({ block: "center" });
}
function editorItem(mode, target) {
  return `editor-${mode}-${target ?? "new"}`;
}
function openEditor(mode, target = null, blockId = 0) {
  const item = editorItem(mode, target),
    stored = drafts.get(session.id, item);
  const row = active().find((r) => r.clause.id === target),
    block = session.requirement.blocks.find(
      (b) => b.id === (row?.clause.block_id ?? blockId),
    );
  editor = stored
    ? structuredClone(stored.data)
    : {
        kind: "editor",
        mode,
        target,
        base_revision: session.revision,
        block_id: block.id,
        start: row?.clause.start ?? 0,
        end: row?.clause.end ?? Array.from(block.text).length,
        text: row?.clause.text ?? block.text,
      };
  // An explicit source action chooses that source unless there is an existing recoverable draft.
  const source = session.requirement.blocks.find(
    (b) => b.id === editor.block_id,
  );
  const stale = editor.base_revision !== session.revision;
  $("#editor-title").textContent = t(
    mode === "add" ? "add" : mode === "edit" ? "edit" : "split",
  );
  $("#editor-body").innerHTML = `<p class="hint">${t("editHelp")}</p>
  ${stale ? `<div class="warnings">${t("stale")}<p>${esc(row?.clause.text || source.text)}</p><p>${t("current")}: ${row ? t(row.review.decision) : ""} ${esc(row?.review.note || "")}</p><button id="rebase-editor" type="button" class="secondary">${t("rebase")}</button></div>` : ""}
  <form id="clause-form" class="review-form">
  ${
    mode === "add"
      ? `<label for="source-block">${t("requirements")}</label><select id="source-block">${session.requirement.blocks.map((b) => `<option value="${b.id}" ${b.id === source.id ? "selected" : ""}>${esc(localized(b.location))} · ${esc(b.text.slice(0, 55))}</option>`).join("")}</select>
  <p class="hint">${t("sourceHelp")}</p><textarea id="source-select" readonly aria-label="${t("sourceSpan")}">${esc(source.text)}</textarea><button id="use-selection" type="button" class="subtle">${t("useSelection")}</button>
  <div class="span-fields"><label>${t("start")}<input id="span-start" type="number" min="0" max="${Array.from(source.text).length}" value="${editor.start}" required></label><label>${t("end")}<input id="span-end" type="number" min="1" max="${Array.from(source.text).length}" value="${editor.end}" required></label></div>`
      : `<details class="audit"><summary>${t("original")}</summary><p>${esc(row.clause.source_text)}</p></details>`
  }
  <label for="clause-text">${t(mode === "split" ? "splitText" : "clauseText")}</label><textarea id="clause-text" required maxlength="${mode === "split" ? 80000 : 4000}">${esc(editor.text)}</textarea><p class="hint" id="editor-draft-state">${t(stored ? "draft" : "draftNone")}</p>
  <div class="dialog-actions"><button id="editor-close" type="button" class="secondary">${t("cancel")}</button><button type="submit" class="primary" ${stale ? "disabled" : ""}>${t("saveClause")}</button></div></form>`;
  const capture = () => {
    editor.text = $("#clause-text").value;
    if (mode === "add") {
      editor.start = Number($("#span-start").value);
      editor.end = Number($("#span-end").value);
    }
    writeDraft(item, editor);
    $("#editor-draft-state").textContent = t(
      storageFailed ? "draftError" : "draft",
    );
  };
  $("#clause-text").oninput = capture;
  $("#editor-close").onclick = () =>
    safeSwitch(() => $("#editor-dialog").close());
  if (stale)
    $("#rebase-editor").onclick = () => {
      editor.base_revision = session.revision;
      capture();
      openEditor(mode, target);
    };
  if (mode === "add") {
    $("#span-start").oninput = $("#span-end").oninput = capture;
    $("#source-block").onchange = () => {
      const b = session.requirement.blocks.find(
        (b) => b.id === Number($("#source-block").value),
      );
      editor.block_id = b.id;
      editor.start = 0;
      editor.end = Array.from(b.text).length;
      editor.text = b.text;
      writeDraft(item, editor);
      openEditor(mode, target);
    };
    $("#use-selection").onclick = () => {
      const area = $("#source-select");
      if (area.selectionStart === area.selectionEnd) {
        toast(t("noSelection"), true);
        return;
      }
      $("#span-start").value = Array.from(
        area.value.slice(0, area.selectionStart),
      ).length;
      $("#span-end").value = Array.from(
        area.value.slice(0, area.selectionEnd),
      ).length;
      $("#clause-text").value = area.value.slice(
        area.selectionStart,
        area.selectionEnd,
      );
      capture();
    };
  }
  $("#clause-form").onsubmit = (e) => {
    e.preventDefault();
    capture();
    guarded(async () => {
      let path = `/api/sessions/${session.id}/clauses`,
        method = "POST",
        body = { revision: editor.base_revision, text: editor.text };
      if (mode === "add") {
        if (
          !(
            editor.start >= 0 &&
            editor.end > editor.start &&
            editor.end <= Array.from(source.text).length
          )
        )
          throw new Error(t("incomplete"));
        body = {
          ...body,
          block_id: editor.block_id,
          start: editor.start,
          end: editor.end,
        };
      }
      if (mode === "edit") {
        path += `/${target}`;
        method = "PATCH";
      }
      if (mode === "split") {
        const parts = editor.text
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean);
        if (parts.length < 2 || new Set(parts).size !== parts.length)
          throw new Error(t("emptyParts"));
        path += `/${target}/split`;
        body = { revision: editor.base_revision, parts };
      }
      session = await mutation(path, body, method);
      drafts.removeOwn(session.id, item);
      storageFailed = false;
      if (mode === "add") selected = active().at(-1).clause.id;
      if (mode === "split")
        selected = session.rows.find((r) => r.clause.id === target)
          .superseded_by[0];
      $("#editor-dialog").close();
      render();
      await refreshHistory();
      toast(t("clauseSaved"));
    });
  };
  if (!$("#editor-dialog").open) $("#editor-dialog").showModal();
}
function exportLinks() {
  document
    .querySelectorAll("[data-format]")
    .forEach(
      (a) =>
        (a.href = `/api/sessions/${session.id}/export?format=${a.dataset.format}&lang=${$("#report-language").value}`),
    );
}
window.addEventListener("beforeunload", (event) => {
  if (storageFailed) {
    event.preventDefault();
    event.returnValue = "";
  }
});
renderShell();
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
