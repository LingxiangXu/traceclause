const test = require("node:test");
const assert = require("node:assert/strict");
const TraceDrafts = require("../traceclause/static/drafts.js");
class Storage {
  constructor() {
    this.items = new Map();
  }
  get length() {
    return this.items.size;
  }
  key(i) {
    return [...this.items.keys()][i];
  }
  getItem(k) {
    return this.items.get(k) ?? null;
  }
  setItem(k, v) {
    this.items.set(k, v);
  }
  removeItem(k) {
    this.items.delete(k);
  }
}
test("draft survives refresh, is isolated by task, and retains its base revision", () => {
  const storage = new Storage();
  new TraceDrafts(storage, "tabA").save("taskA", "review-0", {
    base_revision: 2,
    note: "Unsaved rationale",
    evidence_ids: [0, 3],
  });
  const reopened = new TraceDrafts(storage, "tabA");
  assert.deepEqual(reopened.get("taskA", "review-0").data, {
    base_revision: 2,
    note: "Unsaved rationale",
    evidence_ids: [0, 3],
  });
  assert.equal(reopened.get("taskB", "review-0"), null);
});
test("two windows keep separate drafts and cannot discard each other", () => {
  const storage = new Storage(),
    a = new TraceDrafts(storage, "A"),
    b = new TraceDrafts(storage, "B");
  a.save("task", "review-0", { note: "First" });
  b.save("task", "review-0", { note: "Second" });
  assert.equal(a.get("task", "review-0").data.note, "First");
  assert.equal(b.get("task", "review-0").data.note, "Second");
  a.removeOwn("task", "review-0");
  assert.equal(b.get("task", "review-0").data.note, "Second");
});
test("new window recovers a prior draft, including clause edit metadata", () => {
  const storage = new Storage();
  new TraceDrafts(storage, "old").save("task", "editor-add-new", {
    mode: "add",
    block_id: 2,
    start: 3,
    end: 8,
    text: "Draft clause",
    base_revision: 4,
  });
  const recovered = new TraceDrafts(storage, "new").get(
    "task",
    "editor-add-new",
  );
  assert.equal(recovered.data.start, 3);
  assert.equal(recovered.data.text, "Draft clause");
});
test("corrupt entries are skipped without deleting other drafts", () => {
  const storage = new Storage(),
    drafts = new TraceDrafts(storage, "a");
  storage.setItem("traceclause-draft-v2:t:bad:a", "invalid json");
  drafts.save("t", "review-2", { note: "Keep" });
  assert.equal(drafts.list("t").length, 1);
  assert.equal(storage.length, 2);
});
test("storage exhaustion is surfaced rather than reporting a saved draft", () => {
  const storage = new Storage();
  storage.setItem = () => {
    throw Error("quota");
  };
  assert.throws(
    () => new TraceDrafts(storage, "a").save("t", "r", { note: "Keep me" }),
    /quota/,
  );
});
