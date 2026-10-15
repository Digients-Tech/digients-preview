(() => {
  'use strict';
  const tracks = window.CUA_SAMPLE?.audioTracks || [];
  const section = document.getElementById('recorded-audio');
  if (!section || !tracks.length) return;
  const C = window.CUAAudioCore, video = document.getElementById('video');
  const states = [], duration = window.CUA_SAMPLE.media.duration_s;
  const labels = {
    en: { title:'Listen to the recording', note:'Two independent sources, on the video timeline. Select a word to jump to it.', oneNote:'Recorded audio, on the video timeline. Select a word to jump to it.', audioOnly:'Microphone and computer output stay separate. Adjust each track while watching the video.', microphone:'Microphone input', system:'Computer output', playing:'Playing with video', ready:'Synced with video', muted:'Muted', mute:'Mute track', unmute:'Unmute track', volume:'Volume', seek:'Audio timeline', silent:'This track contains silence.', no_speech:'No speech was detected in this track.', pending:'Transcription is being prepared.', not_transcribed:'No transcript yet. The recorded audio is ready to play.', blocked:'Transcription is awaiting speech-service access.', failed:'Transcription is unavailable.', aligned:'Word-aligned transcript', partial_alignment:'Transcript · some words have no timestamp', gap:'Between spoken passages', before:'First spoken passage', full:'Full transcript', download:'Download audio', play:'Play video + audio', pause:'Pause playback', enable:'Enable sound', error:'Audio could not load. Keep the complete sample folder together.', timestamp:'Jump to', asr:'Automatic transcription · Recording recognition 2.0', unavailable:'Timestamp unavailable' },
    zh: { title:'听见录制现场', note:'两条独立音轨，与视频同步。点击任意字词，跳到说话的位置。', oneNote:'录制声音与视频同步。点击任意字词，跳到说话的位置。', audioOnly:'麦克风与电脑输出分别保留，可单独调节音量，播放时与视频同步。', microphone:'麦克风输入', system:'电脑输出', playing:'随视频播放', ready:'与视频同步', muted:'已静音', mute:'静音此轨', unmute:'开启此轨声音', volume:'音量', seek:'音频时间轴', silent:'此轨录制内容为静音。', no_speech:'此轨未识别到语音。', pending:'正在准备语音识别。', not_transcribed:'尚未生成文字转录，可直接播放录制声音。', blocked:'语音识别等待服务授权。', failed:'暂时无法获取语音识别结果。', aligned:'逐字对齐字幕', partial_alignment:'对齐字幕 · 部分字词缺少时间戳', gap:'语音间歇', before:'首段语音', full:'完整转录', download:'下载音轨', play:'播放视频与声音', pause:'暂停播放', enable:'开启声音', error:'无法加载音轨，请保留完整样本文件夹。', timestamp:'跳转到', asr:'自动识别 · 录音文件识别 2.0', unavailable:'缺少时间戳' },
  };
  const lang = () => document.documentElement.lang.startsWith('zh') ? 'zh' : 'en';
  const t = key => labels[lang()][key] || key;
  const stamp = n => window.CUACore.formatTime(Math.max(0, n));
  function el(tag, cls, text) { const node = document.createElement(tag); if (cls) node.className = cls; if (text !== undefined) node.textContent = text; return node; }
  function label(node, text) { node.setAttribute('aria-label', text); node.title = text; }
  const heading = el('div', 'audio-heading');
  const intro = el('div'); const title = el('h3'); title.id = 'audio-title'; const note = el('p'); intro.append(title, note);
  const play = el('button', 'button button-secondary audio-play'); play.type = 'button';
  heading.append(intro, play); section.append(heading);
  const grid = el('div', 'audio-tracks'); section.append(grid); section.hidden = false;

  function seek(time, resume = false) {
    if (document.getElementById('video-view')?.hidden) document.getElementById('view-video').click();
    video.currentTime = Math.min(duration, Math.max(0, time));
    sync(true);
    if (resume) begin();
  }
  function begin() {
    if (document.getElementById('video-view')?.hidden) document.getElementById('view-video').click();
    start();
    video.play().catch(() => pause());
  }
  play.addEventListener('click', () => video.paused ? begin() : video.pause());

  function playTrack(state) {
    if (state.audio.error || state.audio.muted || !state.track.hasSignal || state.pending) return;
    state.pending = state.audio.play().then(() => { state.blocked = false; }).catch(() => { state.blocked = true; }).finally(() => { state.pending = null; updateLabels(state); });
  }
  function start() {
    for (const state of states) {
      const audio = state.audio;
      audio.playbackRate = video.playbackRate;
      if (audio.readyState >= 1) audio.currentTime = Math.min(video.currentTime, audio.duration || duration);
      playTrack(state);
    }
  }
  function pause() { states.forEach(state => state.audio.pause()); }

  function appendWords(target, utterance, state, full = false) {
    for (const token of C.displayTokens(utterance)) {
      if (token.word < 0) { target.append(document.createTextNode(token.text)); continue; }
      const word = utterance.words[token.word];
      const button = el('button', 'asr-word', token.text); button.type = 'button';
      button.dataset.word = token.word;
      button.dataset.start = word.start_s;
      if (word.aligned === false || word.end_s <= word.start_s) {
        button.disabled = true; button.title = t('unavailable');
      } else {
        label(button, `${token.text} · ${t('timestamp')} ${stamp(word.start_s)}`);
        button.addEventListener('click', () => seek(word.start_s, true));
      }
      if (!full) state.wordNodes.set(token.word, button);
      target.append(button);
    }
  }

  for (const track of tracks) {
    const card = el('article', 'audio-track'); card.dataset.track = track.id;
    const audio = document.createElement('audio'); audio.src = track.src; audio.preload = 'metadata';
    const header = el('div', 'audio-track-heading');
    const name = el('h4'); name.id = `track-${track.id}`; card.setAttribute('aria-labelledby', name.id);
    const status = el('span', 'audio-status'); header.append(name, status);
    const controls = el('div', 'audio-track-controls');
    const mute = el('button', 'audio-mute'); mute.type = 'button'; mute.disabled = !track.hasSignal;
    const volume = document.createElement('input'); volume.type = 'range'; volume.min = '0'; volume.max = '1'; volume.step = '.05'; volume.value = '1'; volume.className = 'audio-volume'; volume.disabled = !track.hasSignal;
    const enable = el('button', 'text-link audio-enable'); enable.type = 'button'; enable.hidden = true;
    const download = el('a', 'audio-download'); download.href = track.src; download.download = '';
    controls.append(mute, volume, enable, download);
    const wave = el('div', 'audio-waveform');
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); svg.setAttribute('viewBox', '0 0 600 48'); svg.setAttribute('preserveAspectRatio', 'none'); svg.setAttribute('aria-hidden', 'true');
    const path = document.createElementNS(svg.namespaceURI, 'path');
    const maximum = Math.max(.001, ...(track.waveform || []));
    path.setAttribute('d', (track.waveform || []).map((n, i) => { const h = Math.max(.6, Math.sqrt(n / maximum) * 21); return `M${i} ${24-h}v${h*2}`; }).join(' ')); svg.append(path);
    const line = el('span', 'audio-playhead'); line.setAttribute('aria-hidden', 'true');
    const range = document.createElement('input'); range.type = 'range'; range.min = '0'; range.max = duration; range.step = '.01'; range.value = video.currentTime; range.className = 'audio-seek';
    range.addEventListener('input', () => seek(Number(range.value)));
    wave.append(svg, line, range);
    const timing = el('div', 'audio-timing'); const clock = el('span'); const length = el('span', '', stamp(Math.ceil(duration))); timing.append(clock, length);
    const transcript = el('div', 'audio-transcript');
    const captionHeader = el('div', 'asr-caption-heading'); const captionLabel = el('span'); const captionTime = el('span'); captionHeader.append(captionLabel, captionTime);
    const current = el('p', 'asr-current'); current.dir = 'auto';
    const empty = el('p', 'asr-empty');
    const details = el('details', 'asr-details'); const summary = el('summary'); const full = el('div', 'asr-full'); details.append(summary, full);
    const foot = el('p', 'asr-source');
    transcript.append(captionHeader, current, empty, details, foot);
    card.append(header, wave, timing, controls, transcript, audio); grid.append(card);
    const state = { track, audio, card, name, status, mute, volume, enable, download, range, line, clock, captionLabel, captionTime, current, empty, details, summary, full, foot, sentence:-2, word:-2, wordNodes:new Map(), blocked:false, pending:null, fullBuilt:false, lastVolume:1 };
    states.push(state);
    function unmute() { audio.muted = false; if (!audio.volume) { audio.volume = state.lastVolume; volume.value = state.lastVolume; } }
    mute.addEventListener('click', () => { audio.muted ? unmute() : audio.muted = true; if (!video.paused) playTrack(state); updateLabels(state); });
    volume.addEventListener('input', () => { audio.volume = Number(volume.value); audio.muted = !audio.volume; if (audio.volume) state.lastVolume = audio.volume; if (!video.paused) playTrack(state); updateLabels(state); });
    enable.addEventListener('click', () => { unmute(); video.paused ? begin() : playTrack(state); });
    audio.addEventListener('error', () => updateLabels(state));
    audio.addEventListener('loadedmetadata', () => { audio.currentTime = video.currentTime; if (!video.paused) playTrack(state); });
    details.addEventListener('toggle', () => {
      if (!details.open || state.fullBuilt) return;
      for (const utterance of track.transcript?.utterances || []) {
        const row = el('div', 'asr-full-row');
        const time = el('button', 'asr-time', stamp(utterance.start_s)); time.type = 'button'; label(time, `${t('timestamp')} ${stamp(utterance.start_s)}`); time.addEventListener('click', () => seek(utterance.start_s, true));
        const content = el('p'); content.dir = 'auto'; appendWords(content, utterance, state, true); row.append(time, content); full.append(row);
      }
      state.fullBuilt = true;
    });
  }

  function updateLabels(state) {
    const { track, audio } = state, trans = track.transcript || { status:'pending' };
    state.name.textContent = t(track.id);
    state.status.textContent = audio.error ? t('failed') : !track.hasSignal ? t('silent') : t(audio.muted ? 'muted' : video.paused ? 'ready' : 'playing');
    state.mute.textContent = audio.muted ? t('unmute') : t('mute'); state.mute.setAttribute('aria-pressed', String(audio.muted));
    label(state.mute, `${t(track.id)} · ${audio.muted ? t('unmute') : t('mute')}`);
    label(state.volume, `${t(track.id)} · ${t('volume')}`); label(state.range, `${t(track.id)} · ${t('seek')}`);
    state.enable.textContent = t('enable'); state.enable.hidden = !state.blocked;
    state.download.textContent = t('download');
    state.captionLabel.textContent = t(trans.status === 'partial_alignment' ? 'partial_alignment' : 'aligned');
    const hasText = !!trans.utterances?.length;
    state.captionLabel.parentElement.hidden = !hasText; state.current.hidden = !hasText; state.details.hidden = !hasText; state.empty.hidden = hasText;
    state.empty.textContent = t(!track.hasSignal ? 'silent' : trans.status === 'no_speech' ? 'no_speech' : ['blocked', 'failed', 'not_transcribed'].includes(trans.status) ? trans.status : 'pending');
    if (audio.error) { state.empty.textContent = t('error'); state.empty.hidden = false; }
    state.summary.textContent = `${t('full')}${hasText ? ` · ${trans.utterances.length}` : ''}`;
    state.foot.textContent = t('asr'); state.foot.hidden = !hasText;
  }
  function language() {
    title.textContent = t('title');
    note.textContent = tracks.some(track => track.transcript?.utterances?.length)
      ? t(tracks.length > 1 ? 'note' : 'oneNote')
      : tracks.length > 1 ? t('audioOnly') : lang() === 'zh'
        ? '录制声音与视频同步，可单独调节音量。'
        : 'Recorded audio stays in sync with the video. Adjust its volume independently.';
    states.forEach(state => { updateLabels(state); state.sentence = -2; }); sync();
  }
  function sync(hard = false) {
    play.textContent = t(video.paused ? 'play' : 'pause');
    const time = video.currentTime;
    for (const state of states) {
      state.range.value = time; state.range.setAttribute('aria-valuetext', `${stamp(time)} / ${stamp(Math.ceil(duration))}`);
      state.line.style.transform = `translateX(${Math.min(100, time/duration*100)}cqw)`;
      state.clock.textContent = stamp(time);
      if (state.audio.readyState >= 1 && !video.seeking) {
        const target = C.correction(time, state.audio.currentTime, hard);
        if (target !== null) state.audio.currentTime = Math.min(target, state.audio.duration || duration);
      }
      const utterances = state.track.transcript?.utterances || [];
      const current = C.locate(utterances, time);
      if (current.sentence !== state.sentence) {
        state.sentence = current.sentence; state.word = -2; state.wordNodes.clear(); state.current.replaceChildren();
        if (utterances[current.sentence]) appendWords(state.current, utterances[current.sentence], state);
      }
      state.current.classList.toggle('asr-between', !current.active);
      const sentence = utterances[current.sentence];
      state.captionTime.textContent = sentence ? current.active ? `${stamp(sentence.start_s)}–${stamp(sentence.end_s)}` : `${t(time < sentence.start_s ? 'before' : 'gap')} · ${stamp(sentence.start_s)}` : '';
      if (state.word !== current.word) {
        state.word = current.word;
        for (const [index, node] of state.wordNodes) {
          node.classList.toggle('speaking', index === current.word);
          if (index === current.word) node.setAttribute('aria-current', 'true'); else node.removeAttribute('aria-current');
        }
      }
    }
  }
  let frame;
  function tick() { sync(); if (!video.paused) frame = requestAnimationFrame(tick); }
  video.addEventListener('play', () => { start(); cancelAnimationFrame(frame); tick(); states.forEach(updateLabels); });
  for (const event of ['pause', 'ended', 'waiting']) video.addEventListener(event, () => { pause(); sync(); states.forEach(updateLabels); });
  video.addEventListener('playing', () => { start(); cancelAnimationFrame(frame); tick(); });
  video.addEventListener('seeking', pause);
  video.addEventListener('seeked', () => { sync(true); if (!video.paused) start(); });
  video.addEventListener('ratechange', () => { states.forEach(s => { s.audio.playbackRate = video.playbackRate; }); sync(true); });
  video.addEventListener('timeupdate', () => sync());
  document.getElementById('language').addEventListener('click', language);
  window.addEventListener('pagehide', pause);
  window.CUAAudio = Object.freeze({ start, pause, sync });
  language();
})();
