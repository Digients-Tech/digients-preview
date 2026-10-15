(function (root) {
  'use strict';
  function before(items, time) {
    let lo = 0, hi = items.length;
    while (lo < hi) { const mid = (lo + hi) >>> 1; if (items[mid].start_s <= time) lo = mid + 1; else hi = mid; }
    return lo - 1;
  }
  function locate(utterances, time) {
    const index = before(utterances, time);
    const active = index >= 0 && time < utterances[index].end_s;
    const shown = index < 0 && utterances.length ? 0 : index;
    const words = utterances[shown]?.words || [];
    const candidate = active ? before(words, time) : -1;
    const word = words[candidate];
    return { sentence: shown, active, word: word && word.aligned !== false && word.end_s > time ? candidate : -1 };
  }
  function displayTokens(utterance) {
    // Punctuation is untimed text. Only tokens with service timestamps highlight.
    const tokens = [], text = utterance.text || '';
    let cursor = 0;
    for (const [index, word] of (utterance.words || []).entries()) {
      const position = text.toLocaleLowerCase().indexOf(word.text.toLocaleLowerCase(), cursor);
      if (position < 0) {
        // Preserve the service token sequence if its punctuated text differs.
        return utterance.words.flatMap((w, i) => [
          ...(i && /^[A-Za-z0-9]/.test(w.text) && /[A-Za-z0-9]$/.test(utterance.words[i-1].text) ? [{ text:' ', word:-1 }] : []),
          { text:w.text, word:i },
        ]);
      }
      if (position > cursor) tokens.push({ text:text.slice(cursor, position), word:-1 });
      tokens.push({ text:text.slice(position, position + word.text.length), word:index });
      cursor = position + word.text.length;
    }
    if (cursor < text.length) tokens.push({ text:text.slice(cursor), word:-1 });
    return tokens;
  }
  function correction(videoTime, audioTime, hard = false) {
    const drift = videoTime - audioTime;
    return hard || Math.abs(drift) > .12 ? videoTime : null;
  }
  root.CUAAudioCore = Object.freeze({ locate, displayTokens, correction });
})(globalThis);
