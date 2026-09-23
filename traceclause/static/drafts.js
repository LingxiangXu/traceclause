/* Per-tab keys prevent two windows from overwriting each other's drafts. */
class TraceDrafts {
  constructor(storage, tabId) {
    this.storage = storage;
    this.tabId = tabId;
  }
  key(task, item) {
    return `traceclause-draft-v2:${task}:${item}:${this.tabId}`;
  }
  list(task) {
    const result = [];
    for (let i = 0; i < this.storage.length; i++) {
      const key = this.storage.key(i);
      if (!key.startsWith(`traceclause-draft-v2:${task}:`)) continue;
      try {
        const draft = JSON.parse(this.storage.getItem(key));
        if (draft && typeof draft.item === "string" && draft.data)
          result.push({ ...draft, key });
      } catch {
        /* Ignore damaged entries; never delete them silently. */
      }
    }
    return result.sort((a, b) => b.at - a.at);
  }
  get(task, item) {
    const drafts = this.list(task).filter((d) => d.item === item);
    return (
      drafts.find((d) => d.key === this.key(task, item)) || drafts[0] || null
    );
  }
  save(task, item, data) {
    const value = { item, data, at: Date.now() };
    this.storage.setItem(this.key(task, item), JSON.stringify(value));
    return value;
  }
  removeOwn(task, item) {
    this.storage.removeItem(this.key(task, item));
  }
}
if (typeof module !== "undefined") module.exports = TraceDrafts;
else globalThis.TraceDrafts = TraceDrafts;
