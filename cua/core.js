(function (root) {
  'use strict';
  function clampTime(value, duration) {
    const number = Number(value);
    return Number.isFinite(number) ? Math.max(0, Math.min(number, duration)) : 0;
  }
  function formatTime(value, milliseconds = false) {
    const safe = Math.max(0, Number(value) || 0);
    const whole = Math.floor(safe);
    const seconds = String(whole % 60).padStart(2, '0');
    const minutes = Math.floor(whole / 60) % 60;
    const hours = Math.floor(whole / 3600);
    const result = hours ? `${hours}:${String(minutes).padStart(2, '0')}:${seconds}` : `${String(minutes).padStart(2, '0')}:${seconds}`;
    return milliseconds ? `${result}.${String(Math.floor((safe - whole) * 1000 + 0.00001)).padStart(3, '0')}` : result;
  }
  // Last item at or before time, returning -1 before the first record.
  function indexAt(items, time, key = 'start_s') {
    let low = 0, high = items.length;
    while (low < high) {
      const middle = (low + high) >>> 1;
      const value = typeof key === 'function' ? key(items[middle]) : items[middle][key];
      if (value <= time) low = middle + 1; else high = middle;
    }
    return low - 1;
  }
  function annotationAt(items, time) {
    const index = indexAt(items, time);
    return index >= 0 && time < items[index].end_s ? index : -1;
  }
  // Look up time inside the filtered sequence. The latest global event may be
  // a different type, and therefore absent from this list.
  function filteredPositionAt(items, indices, time, key = 'start_s') {
    return indexAt(indices, time, index => items[index][key]);
  }
  function createFollowController(delay = 3000) {
    let browsing = false, resumeAt = 0;
    return {
      browse(now) { browsing = true; resumeAt = now + delay; },
      resume() { browsing = false; },
      ready(now, playing) {
        if (browsing && playing && now >= resumeAt) browsing = false;
        return !browsing;
      },
    };
  }
  // Windows VK names: Microsoft Win32 virtual-key-codes. Modifier bits are
  // Markov's recording format (Shift=1, Ctrl=2, Alt=4, Win=8), NOT Win32 MOD_*.
  const windowsKeys = {
    8:'Backspace', 9:'Tab', 12:'Clear', 13:'Enter', 16:'Shift', 17:'Ctrl',
    18:'Alt', 19:'Pause', 20:'Caps Lock', 27:'Escape', 32:'Space',
    33:'Page Up', 34:'Page Down', 35:'End', 36:'Home', 37:'Left', 38:'Up',
    39:'Right', 40:'Down', 44:'Print Screen', 45:'Insert', 46:'Delete',
    91:'Win', 92:'Win', 93:'Menu', 106:'Numpad *', 107:'Numpad +',
    109:'Numpad −', 110:'Numpad .', 111:'Numpad /', 144:'Num Lock',
    145:'Scroll Lock', 160:'Shift', 161:'Shift', 162:'Ctrl', 163:'Ctrl',
    164:'Alt', 165:'Alt',
  };
  function keyLabel(event) {
    // Native producers supply a physical-key label. Mac numeric codes and
    // modifier arrays must never fall through to the Windows reference map.
    if (typeof event.displayKey === 'string' && event.displayKey.trim()) return event.displayKey;
    if (event.platform === 'macos' || event.keyCodeSpace === 'macos' || Array.isArray(event.modifiers)) {
      return typeof event.key === 'string' && event.key ? event.key : `Key ${event.keyCode ?? 'unknown'}`;
    }
    const code = Number(event.keyCode), characters = event.characters || '';
    const modifiers = Number(event.modifiers) || 0;
    const chord = [[2,'Ctrl'],[4,'Alt'],[1,'Shift'],[8,'Win']]
      .filter(([bit]) => modifiers & bit).map(([,name]) => name);
    let key = windowsKeys[code];
    if (!key && code >= 96 && code <= 105) key = `Numpad ${code - 96}`;
    if (!key && code >= 112 && code <= 135) key = `F${code - 111}`;
    if (!key && characters && !/[\u0000-\u001f\u007f-\u009f]/u.test(characters)) {
      key = /^[a-z]$/i.test(characters) ? characters.toUpperCase() : characters;
    }
    if (!key && ((code >= 48 && code <= 57) || (code >= 65 && code <= 90))) key = String.fromCharCode(code);
    if (!key) key = `Key ${event.keyCode ?? 'unknown'}`;
    if (!chord.includes(key)) chord.push(key);
    if (modifiers & ~15) chord.push(`unknown modifiers 0x${(modifiers & ~15).toString(16)}`);
    return chord.join('+');
  }
  function eventText(event) {
    if (event.type === 'click') return `${event.button || 'left'} click (${event.x}, ${event.y})`;
    if (event.type === 'key') {
      return `${keyLabel(event)}${event.isRepeat ? ' · repeat' : ''}`;
    }
    const native = event.scroll_unit === 'point' || event.scroll_unit === 'points';
    return `${native ? 'native scroll' : 'scroll'} Δx ${event.deltaX ?? 0}, Δy ${event.deltaY ?? 0}${native ? ' points' : ''}`;
  }
  function detailsText(value) {
    if (typeof value === 'string') return value;
    if (!value || typeof value !== 'object') return '';
    return ['observed_before','observed_after','inference'].map(key => value[key])
      .filter(part => typeof part === 'string' && part.trim()).join(' · ');
  }
  function cursorClock(cursor, seconds) {
    return cursor?.timeUnit === 'seconds' ? seconds : seconds * (Number(cursor?.fps) || 0);
  }
  function durationLabel(value, lang = 'en') {
    const seconds = Math.ceil(Math.max(0, Number(value) || 0));
    if (seconds >= 3600) {
      const minutes = Math.ceil(seconds / 60), hours = Math.floor(minutes / 60), remaining = minutes % 60;
      return lang === 'zh' ? `${hours} 小时 ${remaining} 分钟` : `${hours}h ${remaining}m`;
    }
    return lang === 'zh' ? `${Math.floor(seconds / 60)} 分 ${seconds % 60} 秒` : `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  }
  function filterRecords(items, mode, query = '', type = 'all') {
    const terms = query.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
    return items.reduce((result, record, index) => {
      if (mode === 'events' && type !== 'all' && record.type !== type) return result;
      const haystack = (mode === 'events'
        ? `${record.type} ${eventText(record)} ${formatTime(record.t_s)}`
        : `${record.action ?? ''} ${record.intent ?? ''} ${detailsText(record.details)} ${record.app ?? ''} ${formatTime(record.start_s)}`).toLocaleLowerCase();
      if (terms.every(term => haystack.includes(term))) result.push(index);
      return result;
    }, []);
  }
  function parseMoment(hash, duration, fallback = 0) {
    const match = /^#t=(\d+(?:\.\d+)?)$/.exec(hash);
    return match ? clampTime(match[1], duration) : fallback;
  }
  root.CUACore = Object.freeze({ clampTime, formatTime, indexAt, annotationAt, filteredPositionAt, createFollowController, keyLabel, eventText, detailsText, cursorClock, durationLabel, filterRecords, parseMoment });
})(globalThis);
