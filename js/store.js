// Post images live in IndexedDB (localStorage only holds ~5MB of JSON on iPad).
// localStorage keeps the small state; posts reference images by id.

const ImageStore = (() => {
  const urls = new Map();
  let dbp = null;

  function db() {
    if (!dbp) dbp = new Promise((res, rej) => {
      const r = indexedDB.open('kotvim-images', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('img');
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
    return dbp;
  }

  async function tx(mode, fn) {
    const d = await db();
    return new Promise((res, rej) => {
      const t = d.transaction('img', mode);
      const req = fn(t.objectStore('img'));
      t.oncomplete = () => res(req && req.result);
      t.onerror = t.onabort = () => rej(t.error);
    });
  }

  return {
    put: (id, blob) => tx('readwrite', s => s.put(blob, id)),
    del(id) {
      if (urls.has(id)) { URL.revokeObjectURL(urls.get(id)); urls.delete(id); }
      return tx('readwrite', s => s.delete(id)).catch(() => {});
    },
    async url(id) {
      if (urls.has(id)) return urls.get(id);
      const blob = await tx('readonly', s => s.get(id));
      if (!blob) return '';
      const u = URL.createObjectURL(blob);
      urls.set(id, u);
      return u;
    },
    // Fill <img data-img="id"> elements under root
    hydrate(root = document) {
      root.querySelectorAll('img[data-img]').forEach(img => {
        const id = img.dataset.img;
        if (urls.has(id)) { img.src = urls.get(id); return; }
        this.url(id).then(u => { if (u) img.src = u; }).catch(() => {});
      });
    },
  };
})();
