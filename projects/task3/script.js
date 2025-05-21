function memoize(fn, { maxSize = Infinity, strategy = 'none', ttl = 0 } = {}) {
  const cache = new Map();
  const usage = new Map();
  const access = new Map();
  const timestamps = new Map();

  const now = () => Date.now();
  const shouldEvictTTL = key => strategy === 'ttl' && timestamps.has(key) && now() - timestamps.get(key) >= ttl;

  const deleteKey = key => {
    cache.delete(key);
    usage.delete(key);
    access.delete(key);
    timestamps.delete(key);
  };

  function evictIfNeeded() {
    if (strategy === 'ttl') {
      for (const key of [...timestamps.keys()]) {
        if (shouldEvictTTL(key)) deleteKey(key);
      }
    }

    while (cache.size > maxSize) {
      let keyToDelete;

      if (strategy === 'lfu') {
        keyToDelete = [...usage.entries()].reduce((a, b) => a[1] <= b[1] ? a : b)[0];
      } else if (strategy === 'lru') {
        keyToDelete = [...access.entries()].reduce((a, b) => a[1] <= b[1] ? a : b)[0];
      } else {
        keyToDelete = cache.keys().next().value;
      }

      if (keyToDelete !== undefined) deleteKey(keyToDelete);
      else break;
    }
  }

  return function (...args) {
    const key = JSON.stringify(args);

    if (shouldEvictTTL(key)) deleteKey(key);

    if (cache.has(key)) {
      if (strategy === 'lfu') usage.set(key, usage.get(key) + 1);
      if (strategy === 'lru') access.set(key, now());
      return cache.get(key);
    }

    const result = fn(...args);
    cache.set(key, result);
    if (strategy === 'lfu') usage.set(key, 1);
    if (strategy === 'lru') access.set(key, now());
    if (strategy === 'ttl') timestamps.set(key, now());

    evictIfNeeded();
    return result;
  };
}

function slowSquare(n) {
  console.log(`Calculating square of ${n}`);
  return n * n;
}

const outputEl = document.getElementById("output");

document.getElementById("runBtn").addEventListener("click", () => {
  const num = parseInt(document.getElementById("numberInput").value, 10);
  const strategy = document.getElementById("strategy").value;
  const maxSize = parseInt(document.getElementById("maxSize").value, 10) || Infinity;
  const ttl = parseInt(document.getElementById("ttl").value, 10) || 0;

  outputEl.textContent = '';

  const memoizedFn = memoize(slowSquare, {
    maxSize: strategy === "none" ? Infinity : maxSize,
    strategy,
    ttl,
  });

  const result = memoizedFn(num);
  outputEl.textContent = `Result: ${result}`;
});
