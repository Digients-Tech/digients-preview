(function (root) {
  'use strict';

  // These are public-root paths, deliberately independent of query-string text.
  const registry = Object.freeze([
    Object.freeze({
      id: 'cua-windows-20260918-30fps',
      label: Object.freeze({ en: 'ZBrush · Sep 18 · 30 FPS', zh: 'ZBrush · 9 月 18 日 · 30 FPS' }),
      scripts: Object.freeze(['data/cua-windows-20260918-30fps/sample-data.js', 'data/cua-windows-20260918-30fps/steps-data.js']),
    }),
  ]);
  const applicationScripts = ['core.js', 'steps-core.js', 'audio-core.js', 'app.js', 'steps.js', 'audio.js'];

  function resolveSample(search = '') {
    const id = new URLSearchParams(search).get('sample');
    return registry.find(sample => sample.id === id) || registry[0];
  }

  function sampleURL(href, id) {
    const url = new URL(href);
    const sample = registry.find(item => item.id === id) || registry[0];
    if (sample.id === registry[0].id) url.searchParams.delete('sample');
    else url.searchParams.set('sample', sample.id);
    url.hash = 'workflow';
    return url.href;
  }

  const selected = resolveSample(root.location.search);
  let status = 'idle';
  let ready;

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = root.document.createElement('script');
      script.src = src;
      script.async = false;
      script.onload = () => {
        script.onload = script.onerror = null;
        resolve();
      };
      script.onerror = () => {
        script.onload = script.onerror = null;
        reject(new Error(`Unable to load sample resource: ${src}`));
      };
      root.document.head.appendChild(script);
    });
  }

  function showError(error) {
    status = 'error';
    const message = root.document.getElementById('player-error');
    const chinese = root.document.documentElement.lang === 'zh';
    if (message) {
      message.textContent = chinese
        ? `样本加载失败，请保留完整文件夹后重新打开。${error.message}`
        : `Unable to load this sample. Keep the complete sample folder together and reload. ${error.message}`;
      message.hidden = false;
      message.setAttribute('role', 'alert');
    }
    const play = root.document.getElementById('big-play');
    if (play) play.hidden = true;
  }

  function bootstrap() {
    if (ready) return ready;
    status = 'loading';
    const selector = root.document.getElementById('sample-select');
    if (selector) {
      selector.value = selected.id;
      selector.addEventListener('change', event => {
        root.location.assign(sampleURL(root.location.href, event.target.value));
      });
    }
    // A failed source must never continue with data left by a different wrapper.
    root.CUA_SAMPLE = undefined;
    root.CUA_STEPS = undefined;
    ready = (async () => {
      try {
        for (const src of selected.scripts) await loadScript(src);
        if (!root.CUA_SAMPLE || !root.CUA_STEPS) {
          throw new Error('The selected sample data is incomplete.');
        }
        for (const src of applicationScripts) await loadScript(src);
        status = 'ready';
        return selected;
      } catch (error) {
        showError(error);
        throw error;
      }
    })();
    return ready;
  }

  root.CUASampleLoader = Object.freeze({
    registry,
    resolveSample,
    sampleURL,
    bootstrap,
    get selectedId() { return selected.id; },
    get status() { return status; },
    get ready() { return ready; },
  });

  // index.html loads this classic script with defer, after its DOM is available.
  // Keep the rejected promise inspectable without an unhandled-rejection event.
  bootstrap().catch(() => {});
})(globalThis);
