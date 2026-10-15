(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const S = window.CUA_SAMPLE;
  if (!S || !window.CUACore) {
    $('player-error').hidden = false;
    $('player-error').textContent = 'Sample data is missing. Restore the configured sample data directory, then reload this page.';
    $('big-play').hidden = true;
    return;
  }
  const C = window.CUACore;
  const video = $('video');
  const duration = S.media.duration_s;
  const nativeSample = S.sourceKind === 'local_recording' || S.source_kind === 'local_recording';
  const sampleId = window.CUASampleLoader?.selectedId || S.id;
  const nativeSteps = nativeSample ? (window.CUA_STEPS?.steps || []) : [];
  let activeOverlayStep = null, activeOverlayTime = null;
  const mediaWidth = Number(S.media.width), mediaHeight = Number(S.media.height);
  const PAGE_SIZE = 40;
  const follower = C.createFollowController();
  const keyIndices = S.events.reduce((indices, event, index) => { if (event.type === 'key') indices.push(index); return indices; }, []);
  let wasFollowing = true;
  let lang = 'en';
  try { lang = localStorage.getItem('digients-sample-language') === 'zh' ? 'zh' : 'en'; } catch {}
  let mode = 'narration', recordMode = 'narration', filter = 'all', page = 0;
  let filtered = [], currentAnnotation = -2, currentEvent = -2, activeRow = -2;
  let hasPlayed = false, cursorEnabled = true, toastTimer, codeCache = '', lastSync = 0;
  let pendingTime = C.parseMoment(location.hash, duration, S.initialTime);
  let timelineRows = new Map();
  const text = {
    en: {
      signOut:'Sign out',chooseSample:'Choose sample',resumeFollow:'Resume follow',mouse:'Mouse',leftHeld:'Left held',rightHeld:'Right held',middleHeld:'Middle held',noPointer:'No pointer position',
      skip:'Skip to the sample',navSample:'Workflow sample',navData:'Explore the data',eyebrow:'Computer-use data, up close',
      heroLine1:'Human work.',heroLine2:'In full context.',heroDescription:'Go beyond the screen recording. Explore the actions, intent and structured traces behind a real creative workflow.',heroCta:'Explore one complete workflow',
      category:'3D creation',downloadSample:'Download sample JSON',watchWorkflow:'Watch the workflow',speed:'Playback speed',currentIntent:'Current intent',statDuration:'continuous workflow',statAnnotations:'semantic annotations',statSteps:'training action steps',
      narration:'Narration',events:'Input events',synced:'Synced',all:'All',clicks:'Clicks',keys:'Keys',scroll:'Scroll',noResults:'No matching moments',clearSearch:'Clear search',follow:'Follow video',
      sourceLine:'Recording and annotations prepared by Digients.',originalSource:'Original source',copyManually:'Select and copy this link',done:'Done',
      momentsTitle:'A few moments worth exploring.',momentsDescription:'Jump into the work. Every moment is connected to its context.',momentsAside:'From the same continuous recording',
      dataEyebrow:'Under the surface',dataTitle:'See what’s in the data.',dataDescription:'Inspect the original annotations, video-aligned inputs and an official training record. The first two follow your playhead.',downloadAnnotations:'All annotations',downloadTrace:'Full training trace',downloadSource:'Source manifest',originalLanguage:'Annotations are shown in their original English. Source labels are model-generated.',input:'Input',trace:'Training trace',traceNote:'Official step 727. This record has no video timestamp and is shown independently of playback.',copyJsonManually:'Select and copy the JSON below',footer:'A closer look at how people work.',backSample:'Back to the sample',
      search:'Search actions or intent…',searchEvents:'Search key, button or time…',noAnnotation:'No source annotation covers this moment.',play:'Play',pause:'Pause',backTen:'Back 10 seconds',fullScreen:'Fullscreen',showCursor:'Show cursor trail',hideCursor:'Hide cursor trail',copyLink:'Copy link to this moment',copyJson:'Copy JSON',previousPage:'Previous timeline page',nextPage:'Next timeline page',
      copied:'Copied to clipboard',linkCopied:'Link to this moment copied',playFailed:'Playback could not start. Try the play button again.',videoFailed:'The recording could not be loaded. Keep the assets/sample folder beside this page and reload.',fullscreenFailed:'Fullscreen is unavailable in this browser.',eventNote:'Selected mouse/key presses and scrolls. Timing comes from the source video-aligned event sidecar.',narrationNote:'Source model annotation. Intervals use the source video clock.',traceRecordNote:'Original Scale-CUA-style training record. No video timestamp is supplied.',noInput:'No input event has occurred yet.',eventTime:'Latest input at',sourceModel:'Source model annotation',sampleDuration:'1h 28m',linkLocal:'Local link copied. It opens on this computer.',
    },
    zh: {
      signOut:'退出',chooseSample:'选择样本',resumeFollow:'恢复跟随',mouse:'鼠标',leftHeld:'左键按住',rightHeld:'右键按住',middleHeld:'中键按住',noPointer:'无光标位置记录',
      skip:'跳到样本',navSample:'工作流样本',navData:'查看数据',eyebrow:'近距离查看 Computer-use 数据',
      heroLine1:'看见真实操作。',heroLine2:'理解完整上下文。',heroDescription:'从一段真实创作过程出发，查看屏幕背后的操作、意图与结构化训练记录。',heroCta:'探索一个完整工作流',
      category:'三维创作',downloadSample:'下载样本 JSON',watchWorkflow:'播放工作流',speed:'播放速度',currentIntent:'当前意图',statDuration:'连续工作流',statAnnotations:'语义标注',statSteps:'训练操作步骤',
      narration:'语义叙述',events:'输入事件',synced:'同步',all:'全部',clicks:'点击',keys:'按键',scroll:'滚动',noResults:'没有匹配的片段',clearSearch:'清除搜索',follow:'跟随视频',
      sourceLine:'录屏与标注由 Digients 提供。',originalSource:'原始来源',copyManually:'选中并复制此链接',done:'完成',
      momentsTitle:'从几个片段开始探索。',momentsDescription:'跳入真实工作现场，同时查看每一步的上下文。',momentsAside:'均来自同一段连续录屏',
      dataEyebrow:'走进数据内部',dataTitle:'查看数据内容。',dataDescription:'检查原始标注、与视频对齐的输入事件和一条官方训练记录。前两项会随播放位置更新。',downloadAnnotations:'完整语义标注',downloadTrace:'完整训练记录',downloadSource:'来源清单',originalLanguage:'标注保留原始英文。来源标签由模型生成。',input:'输入事件',trace:'训练记录',traceNote:'官方第 727 步。该记录没有视频时间戳，因此独立于播放进度展示。',copyJsonManually:'选中并复制下方 JSON',footer:'更近一步，看见人如何工作。',backSample:'返回样本',
      search:'搜索英文操作或意图…',searchEvents:'搜索按键、鼠标或时间…',noAnnotation:'此时刻没有对应的来源标注。',play:'播放',pause:'暂停',backTen:'后退 10 秒',fullScreen:'全屏',showCursor:'显示光标轨迹',hideCursor:'隐藏光标轨迹',copyLink:'复制此时刻的链接',copyJson:'复制 JSON',previousPage:'上一页时间记录',nextPage:'下一页时间记录',
      copied:'已复制到剪贴板',linkCopied:'已复制此时刻的链接',playFailed:'暂时无法开始播放，请再点一次播放按钮。',videoFailed:'无法加载录屏。请保留页面旁的 assets/sample 文件夹，然后刷新。',fullscreenFailed:'当前浏览器无法进入全屏。',eventNote:'筛选鼠标按下、按键按下与滚动事件。时间来自已映射到视频的官方事件文件。',narrationNote:'来源模型标注，时间区间对应来源视频时钟。',traceRecordNote:'原始 Scale-CUA 格式训练记录。来源未提供视频时间戳。',noInput:'此前尚无输入事件。',eventTime:'最近输入时间',sourceModel:'来源模型标注',sampleDuration:'1 小时 28 分钟',linkLocal:'已复制本机链接，适用于这台电脑。',
    },
  };
  const nativeText = {
    en: {heroDescription:'Explore the actions, intent and structured traces behind a recorded desktop workflow.',sourceLine:'Local recording · Model-generated labels',dataDescription:'Inspect the model annotations, recorded inputs and reconstructed training actions. Narration and inputs follow your playhead.',originalLanguage:'Annotations retain the model’s original wording.',currentIntent:'Current operation',eventNote:'Recorded Mac inputs on the source video clock. Native scroll deltas retain their original units.',narrationNote:'Model-generated workflow annotation on the source video clock.',traceRecordNote:'Reconstructed action from the local recording. Frame roles and source timestamps are retained.',traceNote:'Reconstructed training action, linked to the action-frame view.',videoFailed:'The recording could not be loaded. Keep this page’s data and assets folders together, then reload.',search:'Search actions or descriptions…'},
    zh: {heroDescription:'查看一段真实桌面操作录制背后的输入、意图与结构化训练记录。',sourceLine:'本地录制 · 机器标注',dataDescription:'查看模型标注、录制输入和重建训练动作。语义叙述与输入事件随播放位置更新。',originalLanguage:'标注保留模型原文。',currentIntent:'当前操作',eventNote:'Mac 原始输入按来源视频时钟展示。原生滚轮保留其原始单位与数值。',narrationNote:'模型生成的工作段描述，时间对应来源视频时钟。',traceRecordNote:'从本地录制重建的动作，保留关键帧角色与来源时间。',traceNote:'重建训练动作，与关键操作帧视图关联。',videoFailed:'无法加载录屏。请将本页的数据与 assets 文件夹一起保留，然后刷新。',search:'搜索操作或描述…'},
  };
  const localized = value => value && typeof value === 'object' ? value[lang] ?? value.en ?? '' : value ?? '';
  const t = key => localized(S.presentation?.[key]) || (nativeSample && nativeText[lang][key]) || text[lang][key] || text.en[key] || key;
  function icon(name) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.classList.add('icon'); svg.setAttribute('aria-hidden', 'true');
    const use = document.createElementNS(svg.namespaceURI, 'use'); use.setAttribute('href', `#i-${name}`); svg.append(use);
    return svg;
  }
  function toast(message) {
    clearTimeout(toastTimer); $('toast').textContent = message; $('toast').hidden = false;
    toastTimer = setTimeout(() => { $('toast').hidden = true; }, 3000);
  }
  function accessibleName(id, label) { $(id).setAttribute('aria-label', label); $(id).title = label; }
  function setLayerHidden(node, hidden) {
    // SVGElement does not reflect the HTMLElement.hidden property. Explicitly
    // update the attribute used by [hidden] CSS for both SVG and HTML layers.
    node.hidden = hidden;
    if (hidden) node.setAttribute('hidden',''); else node.removeAttribute('hidden');
  }
  function applyLanguage() {
    document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
    document.querySelectorAll('[data-i18n]').forEach(node => { node.textContent = t(node.dataset.i18n); });
    $('sample-title').textContent = localized(S.title);
    $('stat-duration').textContent = localized(S.presentation?.sampleDuration) || C.durationLabel(duration,lang);
    $('sample-application').textContent = localized(S.application);
    $('sample-number').textContent = String((window.CUASampleLoader?.registry?.findIndex(item => item.id === sampleId) ?? 0) + 1).padStart(2, '0');
    $('sample-select').setAttribute('aria-label',t('chooseSample'));
    $('sample-select').value = sampleId;
    for (const option of $('sample-select').children) {
      const entry = window.CUASampleLoader?.registry?.find(item => item.id === option.getAttribute('value'));
      if (entry) option.textContent = localized(entry.label);
    }
    $('stat-annotations').textContent = S.counts.annotations.toLocaleString('en-US');
    $('stat-steps').textContent = S.counts.trainingSteps.toLocaleString('en-US');
    $('language').firstElementChild.textContent = lang === 'en' ? '中文' : 'EN';
    $('language').setAttribute('aria-label', lang === 'en' ? '切换到中文' : 'Switch to English');
    $('search').placeholder = t(mode === 'narration' ? 'search' : 'searchEvents');
    $('search').setAttribute('aria-label', $('search').placeholder);
    accessibleName('big-play',t('watchWorkflow')); accessibleName('rewind',t('backTen'));
    accessibleName('fullscreen',t('fullScreen')); accessibleName('cursor-toggle',t(cursorEnabled ? 'hideCursor' : 'showCursor'));
    accessibleName('share-time',t('copyLink')); accessibleName('copy-json',t('copyJson'));
    accessibleName('prev-page',t('previousPage')); accessibleName('next-page',t('nextPage'));
    $('seek').setAttribute('aria-label',lang === 'zh' ? '视频时间轴' : 'Video timeline');
    $('video').setAttribute('aria-label',localized(S.presentation?.videoLabel) || `${localized(S.application)} ${lang === 'zh' ? '工作流录屏' : 'workflow screen recording'}`);
    renderHighlights(); rebuildFilter(true); updatePlaybackState(); sync(true);
    document.title = lang === 'zh' ? '工作流样本 · Digients' : 'Workflow sample · Digients';
  }
  function updatePlaybackState() {
    $('play').replaceChildren(icon(video.paused ? 'play' : 'pause'));
    accessibleName('play',t(video.paused ? 'play' : 'pause'));
    $('big-play').hidden = hasPlayed || !video.paused;
  }
  function moment() { return video.readyState >= 1 ? video.currentTime : pendingTime; }
  function seek(time, playAfter = false) {
    follower.resume();
    pendingTime = C.clampTime(time, duration);
    if (video.readyState >= 1) video.currentTime = pendingTime;
    sync(true);
    if (playAfter) playVideo();
  }
  async function playVideo() {
    window.CUAAudio?.start();
    try { await video.play(); hasPlayed = true; updatePlaybackState(); }
    catch { window.CUAAudio?.pause(); toast(t('playFailed')); }
  }
  function togglePlayback() { if (video.paused) playVideo(); else video.pause(); }

  function sourceRows() { return mode === 'narration' ? S.annotations : S.events; }
  function currentPosition(time = moment()) { return C.filteredPositionAt(sourceRows(),filtered,time,mode === 'narration' ? 'start_s' : 't_s'); }
  function resumeFollowing() {
    $('follow').checked = true;
    follower.resume();
    highlightTimeline(true);
  }
  function browseTimeline() {
    if (!$('follow').checked) return;
    follower.browse(performance.now());
    highlightTimeline();
  }
  function rebuildFilter(followCurrent = false) {
    filtered = C.filterRecords(sourceRows(), mode, $('search').value, filter);
    $('match-count').textContent = filtered.length.toLocaleString('en-US');
    page = 0;
    if (followCurrent && $('follow').checked) {
      const position = currentPosition();
      if (position >= 0) page = Math.floor(position / PAGE_SIZE);
    }
    renderTimeline();
  }
  function renderTimeline() {
    timelineRows = new Map();
    const fragment = document.createDocumentFragment();
    const records = sourceRows();
    for (const index of filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)) {
      const record = records[index];
      const button = document.createElement('button'); button.className = 'timeline-row'; button.dataset.index = index;
      const stamp = document.createElement('span'); stamp.className = 'row-time';
      const stampText = document.createElement('span'); stampText.textContent = C.formatTime(mode === 'narration' ? record.start_s : record.t_s);
      const dot = document.createElement('span'); dot.className = 'row-dot'; dot.setAttribute('aria-hidden','true'); stamp.append(stampText,dot);
      const body = document.createElement('span'); body.className = 'row-body';
      const title = document.createElement('span'); title.className = 'row-title';
      const detail = document.createElement('span'); detail.className = 'row-detail';
      if (mode === 'narration') {
        title.textContent = record.intent || record.action || '';
        detail.textContent = record.intent ? record.action : C.detailsText(record.details);
        const app = document.createElement('span'); app.className = 'row-app'; app.textContent = record.app || ''; app.hidden = !record.app;
        body.append(title,detail,app);
      } else {
        title.textContent = t({click:'clicks',key:'keys',scroll:'scroll'}[record.type]);
        detail.classList.add('event-code'); detail.textContent = C.eventText(record);
        body.append(title,detail);
      }
      button.append(stamp,body);
      button.addEventListener('click',() => {
        $('follow').checked = true; follower.resume();
        seek(mode === 'narration' ? record.start_s : record.t_s);
      });
      timelineRows.set(index,button); fragment.append(button);
    }
    $('timeline-list').replaceChildren(fragment);
    $('timeline-list').hidden = !filtered.length; $('empty-state').hidden = !!filtered.length;
    const pageCount = Math.max(1,Math.ceil(filtered.length / PAGE_SIZE));
    $('page-indicator').textContent = `${page + 1} / ${pageCount}`;
    $('prev-page').disabled = page === 0; $('next-page').disabled = page + 1 >= pageCount;
    $('timeline-panel').scrollTop = 0; activeRow = -2;
    highlightTimeline(true);
  }
  function highlightTimeline(force = false) {
    const time = moment();
    const position = currentPosition(time);
    const latest = position >= 0 ? filtered[position] : -1;
    const current = mode === 'narration' ? (latest >= 0 && time < S.annotations[latest].end_s ? latest : -1) : (latest >= 0 && time - S.events[latest].t_s <= 1.2 ? latest : -1);
    const following = $('follow').checked && follower.ready(performance.now(),!video.paused);
    force ||= following !== wasFollowing;
    wasFollowing = following;
    $('sync-state').classList.toggle('browsing',!following);
    $('sync-state-label').textContent = t(following ? 'synced' : 'resumeFollow');
    accessibleName('sync-state',t('resumeFollow'));
    if (following) {
      const nextPage = Math.floor(Math.max(0,position) / PAGE_SIZE);
      if (nextPage !== page) {
        page = nextPage; renderTimeline(); return;
      }
    }
    if (!force && current === activeRow) return;
    activeRow = current;
    timelineRows.forEach((node,index) => {
      node.classList.toggle('active',index === current);
      if (index === current) node.setAttribute('aria-current','true'); else node.removeAttribute('aria-current');
    });
    if (following && timelineRows.has(latest)) {
      const node = timelineRows.get(latest), panel = $('timeline-panel');
      const rowBox = node.getBoundingClientRect(), panelBox = panel.getBoundingClientRect();
      if (rowBox.top < panelBox.top + 8 || rowBox.bottom > panelBox.bottom - 8) {
        panel.scrollTop += rowBox.top - panelBox.top - 12;
      }
    }
  }
  function setTimelineMode(next) {
    mode = next; page = 0; follower.resume();
    document.querySelectorAll('[data-mode]').forEach(button => {
      const active = button.dataset.mode === mode;
      button.classList.toggle('active',active); button.setAttribute('aria-selected',String(active)); button.tabIndex = active ? 0 : -1;
    });
    $('timeline-panel').setAttribute('aria-labelledby',`tab-${mode}`);
    $('event-filters').hidden = mode !== 'events';
    $('search').placeholder = t(mode === 'narration' ? 'search' : 'searchEvents');
    $('search').setAttribute('aria-label',$('search').placeholder);
    rebuildFilter(true);
  }
  function renderHighlights() {
    $('highlights').replaceChildren(...S.highlights.map(highlight => {
      const button = document.createElement('button'); button.className = 'highlight';
      button.setAttribute('aria-label',`${localized(highlight.title)} · ${C.formatTime(highlight.start_s)}`);
      const picture = document.createElement('div'); picture.className = 'highlight-image';
      const img = document.createElement('img'); img.src = highlight.image; img.alt = localized(highlight.title); img.loading = 'lazy'; img.width = highlight.width || mediaWidth; img.height = highlight.height || mediaHeight;
      const stamp = document.createElement('span'); stamp.className = 'highlight-time'; stamp.textContent = C.formatTime(highlight.start_s);
      const play = document.createElement('span'); play.className = 'highlight-play'; play.append(icon('play'));
      picture.append(img,stamp,play);
      const title = document.createElement('h3'); title.textContent = localized(highlight.title); title.append(icon('external'));
      const description = document.createElement('p'); description.textContent = localized(highlight.description);
      button.append(picture,title,description);
      button.addEventListener('click',() => {
        $('search').value = ''; $('follow').checked = true; setTimelineMode('narration');
        seek(highlight.start_s,true); $('workflow').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'});
      });
      return button;
    }));
  }
  function colorJSON(value) {
    // Use text nodes for all source content; markup never comes from sample strings.
    const output = JSON.stringify(value,null,2);
    const token = /("(?:\\.|[^"\\])*"\s*:)|("(?:\\.|[^"\\])*")|\b(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)\b|\b(true|false|null)\b/g;
    const fragment = document.createDocumentFragment(); let end = 0;
    for (const match of output.matchAll(token)) {
      fragment.append(document.createTextNode(output.slice(end,match.index)));
      const span = document.createElement('span'); span.className = match[1] ? 'json-key' : match[2] ? 'json-string' : match[3] ? 'json-number' : 'json-null'; span.textContent = match[0]; fragment.append(span);
      end = match.index + match[0].length;
    }
    fragment.append(document.createTextNode(output.slice(end)));
    return {output,fragment};
  }
  function updateRecord(force = false) {
    let record, filename, label, note;
    if (recordMode === 'narration') {
      record = currentAnnotation >= 0 ? S.annotations[currentAnnotation] : null;
      filename = 'narration.json'; label = record ? `${C.formatTime(record.start_s,true)} → ${C.formatTime(record.end_s,true)}` : '—'; note = t('narrationNote');
    } else if (recordMode === 'event') {
      record = currentEvent >= 0 ? S.events[currentEvent] : null;
      filename = nativeSample ? 'recorded inputs · preview fields' : 'frame_events.json · preview fields'; label = record ? `${t('eventTime')} ${C.formatTime(record.t_s,true)}` : '—'; note = t('eventNote');
    } else {
      const stepIndex = Number($('code-tab-trace').dataset.stepIndex ?? S.tracePreview.step - 1);
      const step = window.CUA_STEPS?.steps[stepIndex];
      record = step?.record || S.tracePreview.record;
      filename = 'trajectory.jsonl'; label = `step ${step?.step || S.tracePreview.step} / ${S.counts.trainingSteps.toLocaleString('en-US')}`; note = t('traceRecordNote');
      $('trace-preview-image').src = step?.image || S.tracePreview.image;
      $('trace-preview-image').alt = `${nativeSample ? 'Recorded frame' : 'Original screenshot'} for training step ${step?.step || S.tracePreview.step}`;
      const selectedStep = step?.step || S.tracePreview.step;
      const frameRole = step?.frameRole || step?.display?.frameRole;
      const frameTime = step?.frameTimestamp_s ?? step?.display?.frameTimestamp_s;
      $('trace-preview-note').textContent = nativeSample
        ? `${lang === 'zh' ? '本地动作' : 'Local action'} ${selectedStep}${frameRole ? ` · ${frameRole}` : ''}${Number.isFinite(frameTime) ? ` · ${C.formatTime(frameTime,true)}` : ''}. ${t('traceNote')}`
        : (lang === 'zh' ? `官方第 ${selectedStep} 步，与上方关键操作帧同步。来源未提供视频时间戳。` : `Official step ${selectedStep}. Follows the action-frame view. No video timestamp is supplied.`);
    }
    const encoded = JSON.stringify(record,null,2);
    if (!force && encoded === codeCache) return;
    codeCache = encoded;
    $('json-output').replaceChildren(colorJSON(record).fragment);
    $('record-filename').textContent = filename; $('record-time').textContent = label; $('record-note').textContent = note;
    $('trace-preview').hidden = recordMode !== 'trace';
  }
  function drawCursor(time) {
    if (!cursorEnabled) return;
    const frame = C.cursorClock(S.cursor,time);
    const index = C.indexAt(S.cursor.points,frame,point => point[0]);
    if (index < 0) {
      setLayerHidden($('cursor-overlay'),true); return;
    }
    setLayerHidden($('cursor-overlay'),false);
    const [,x,y,,buttons = 0] = S.cursor.points[index];
    let start = index;
    while (start > 0 && S.cursor.points[start - 1][0] >= frame - C.cursorClock(S.cursor,.7)) start--;
    $('cursor-path').setAttribute('points',S.cursor.points.slice(start,index + 1).map(point => `${point[1]},${point[2]}`).join(' '));
    for (const id of ['cursor-ring','cursor-center']) { $(id).setAttribute('cx',x); $(id).setAttribute('cy',y); }
    $('cursor-ring').setAttribute('r',buttons ? '25' : '15');
    $('cursor-overlay').classList.toggle('button-held',!!buttons);
  }
  function drawVideoAction(time, force = false) {
    const overlay = $('video-action-overlay'), labels = $('video-action-labels'), keycaps = $('video-action-keycaps');
    const stepCore = window.CUAStepsCore;
    const index = C.indexAt(nativeSteps,time,'start_s');
    const candidate = index >= 0 ? nativeSteps[index] : null;
    // Only native training actions have source video intervals. An official
    // Markov training row never receives an invented video timestamp here.
    const step = cursorEnabled && candidate && time >= candidate.start_s && time <= candidate.end_s ? candidate : null;
    for (const node of [overlay,labels,keycaps]) setLayerHidden(node,!step);
    if (!step || !stepCore?.overlayForTime || !stepCore?.renderOverlay) {
      overlay.replaceChildren(); labels.replaceChildren(); keycaps.replaceChildren();
      for (const attr of ['data-source-step-id','data-scope','data-point-count','data-cutoff-s']) overlay.removeAttribute(attr);
      activeOverlayStep = null; activeOverlayTime = null;
      return;
    }
    if (!force && step === activeOverlayStep && time === activeOverlayTime) return;
    activeOverlayStep = step; activeOverlayTime = time;
    stepCore.renderOverlay({document,overlay,labels,keycaps},
      stepCore.overlayForTime(step,mediaWidth,mediaHeight,time,{mode:'video'}),mediaWidth,mediaHeight);
  }
  function updateInputFeedback(time) {
    const index = C.indexAt(S.cursor.points,C.cursorClock(S.cursor,time),point => point[0]);
    const point = S.cursor.points[index];
    const held = point ? [[1,'leftHeld'],[2,'rightHeld'],[4,'middleHeld']].filter(([bit]) => (point[4] || 0) & bit).map(([,key]) => t(key)) : [];
    $('pointer-status').textContent = point ? `${t('mouse')} · ${point[1]}, ${point[2]}${held.length ? ` · ${held.join(' + ')}` : ''}` : t('noPointer');
    const keyPosition = C.filteredPositionAt(S.events,keyIndices,time,'t_s');
    const key = keyPosition >= 0 ? S.events[keyIndices[keyPosition]] : null;
    $('key-feedback').hidden = !key || time - key.t_s > 1.2;
    $('key-feedback').textContent = key ? C.keyLabel(key) : '';
  }
  function sync(force = false) {
    const time = moment();
    $('current-time').textContent = C.formatTime(time);
    $('seek').value = time;
    $('seek').style.setProperty('--progress',`${time / duration * 100}%`);
    $('seek').setAttribute('aria-valuetext',`${C.formatTime(time)} / ${C.formatTime(Math.ceil(duration))}`);
    const annotation = C.annotationAt(S.annotations,time), event = C.indexAt(S.events,time,'t_s');
    const changed = annotation !== currentAnnotation || event !== currentEvent;
    currentAnnotation = annotation; currentEvent = event;
    if (changed || force) {
      $('current-intent').textContent = annotation >= 0 ? S.annotations[annotation].intent || S.annotations[annotation].action || t('noAnnotation') : t('noAnnotation');
      updateRecord(force);
    }
    highlightTimeline(force); drawCursor(time); drawVideoAction(time,force); updateInputFeedback(time);
  }
  async function copy(value, kind) {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(value);
      toast(t(kind === 'link' ? (location.protocol === 'file:' || location.hostname === '127.0.0.1' ? 'linkLocal' : 'linkCopied') : 'copied'));
    } catch {
      const input = $(kind === 'link' ? 'copy-value' : 'json-copy-value');
      $(kind === 'link' ? 'copy-fallback' : 'json-copy-fallback').hidden = false;
      input.value = value; input.focus(); input.select();
    }
  }
  function wireTabKeys(selector) {
    const buttons = [...document.querySelectorAll(selector)];
    buttons.forEach((button,index) => button.addEventListener('keydown',event => {
      let next;
      if (event.key === 'ArrowRight') next = (index + 1) % buttons.length;
      else if (event.key === 'ArrowLeft') next = (index + buttons.length - 1) % buttons.length;
      else if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = buttons.length - 1;
      else return;
      event.preventDefault(); buttons[next].click(); buttons[next].focus();
    }));
  }
  $('play').addEventListener('click',togglePlayback); $('big-play').addEventListener('click',togglePlayback);
  video.addEventListener('click',togglePlayback);
  video.addEventListener('loadedmetadata',() => { video.currentTime = pendingTime; sync(true); });
  video.addEventListener('play',() => { hasPlayed = true; follower.resume(); $('player-error').hidden = true; updatePlaybackState(); highlightTimeline(true); });
  video.addEventListener('pause',() => { updatePlaybackState(); sync(true); });
  video.addEventListener('ended',() => { updatePlaybackState(); sync(true); });
  video.addEventListener('timeupdate',() => sync()); video.addEventListener('seeked',() => sync(true));
  video.addEventListener('error',() => { $('player-error').hidden = false; $('player-error').textContent = t('videoFailed'); $('big-play').hidden = true; });
  $('seek').addEventListener('input',event => seek(event.target.value));
  $('rewind').addEventListener('click',() => seek(moment() - 10));
  $('speed').addEventListener('change',event => { video.playbackRate = Number(event.target.value); });
  $('cursor-toggle').addEventListener('click',() => {
    cursorEnabled = !cursorEnabled; $('cursor-toggle').setAttribute('aria-pressed',String(cursorEnabled));
    accessibleName('cursor-toggle',t(cursorEnabled ? 'hideCursor' : 'showCursor'));
    setLayerHidden($('cursor-overlay'),!cursorEnabled); drawCursor(moment()); drawVideoAction(moment(),true);
  });
  $('fullscreen').addEventListener('click',async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if ($('player').requestFullscreen) await $('player').requestFullscreen();
      else if (video.webkitEnterFullscreen) video.webkitEnterFullscreen();
      else throw new Error('No fullscreen support');
    } catch { toast(t('fullscreenFailed')); }
  });
  $('search').addEventListener('input',() => { follower.resume(); rebuildFilter(true); });
  $('clear-search').addEventListener('click',() => { $('search').value = ''; filter = 'all'; updateFilters(); $('follow').checked = true; follower.resume(); rebuildFilter(true); $('search').focus(); });
  $('follow').addEventListener('change',() => { follower.resume(); highlightTimeline(true); });
  $('sync-state').addEventListener('click',resumeFollowing);
  ['wheel','touchstart','touchmove'].forEach(type => $('timeline-panel').addEventListener(type,browseTimeline,{passive:true}));
  $('timeline-panel').addEventListener('keydown',event => { if (['ArrowUp','ArrowDown','PageUp','PageDown','Home','End'].includes(event.key)) browseTimeline(); });
  $('prev-page').addEventListener('click',() => { if (page > 0) { browseTimeline(); page--; renderTimeline(); } });
  $('next-page').addEventListener('click',() => { if ((page + 1) * PAGE_SIZE < filtered.length) { browseTimeline(); page++; renderTimeline(); } });
  document.querySelectorAll('[data-mode]').forEach(button => button.addEventListener('click',() => setTimelineMode(button.dataset.mode)));
  function updateFilters() { document.querySelectorAll('[data-filter]').forEach(button => { const active = button.dataset.filter === filter; button.classList.toggle('active',active); button.setAttribute('aria-pressed',String(active)); }); }
  document.querySelectorAll('[data-filter]').forEach(button => button.addEventListener('click',() => { filter = button.dataset.filter; follower.resume(); updateFilters(); rebuildFilter(true); }));
  document.querySelectorAll('[data-record]').forEach(button => button.addEventListener('click',() => {
    recordMode = button.dataset.record;
    document.querySelectorAll('[data-record]').forEach(node => { const active = node === button; node.classList.toggle('active',active); node.setAttribute('aria-selected',String(active)); node.tabIndex = active ? 0 : -1; });
    $('code-panel').setAttribute('aria-labelledby',button.id); $('json-copy-fallback').hidden = true; updateRecord(true);
  }));
  $('copy-json').addEventListener('click',() => copy(codeCache,'json'));
  $('share-time').addEventListener('click',() => { const url = new URL(location.href); url.hash = `t=${moment().toFixed(3)}`; copy(url.href,'link'); });
  $('close-copy').addEventListener('click',() => { $('copy-fallback').hidden = true; $('share-time').focus(); });
  $('language').addEventListener('click',() => { lang = lang === 'en' ? 'zh' : 'en'; try { localStorage.setItem('digients-sample-language',lang); } catch {} applyLanguage(); });
  addEventListener('hashchange',() => { if (/^#t=/.test(location.hash)) seek(C.parseMoment(location.hash,duration,S.initialTime)); });
  // Player shortcuts never steal typing, native range keys or tab navigation.
  $('player').addEventListener('keydown',event => {
    if (['INPUT','SELECT','BUTTON','TEXTAREA'].includes(event.target.tagName)) return;
    if (event.key === ' ' || event.key.toLowerCase() === 'k') { event.preventDefault(); togglePlayback(); }
    if (event.key === 'ArrowLeft') { event.preventDefault(); seek(moment() - 5); }
    if (event.key === 'ArrowRight') { event.preventDefault(); seek(moment() + 5); }
  });
  $('player').tabIndex = 0;
  wireTabKeys('[data-mode]'); wireTabKeys('[data-record]');
  $('duration').textContent = C.formatTime(Math.ceil(duration)); $('seek').max = duration;
  video.poster = S.media.poster; video.src = S.media.src;
  $('video-stage').style.setProperty('--media-aspect',String(mediaWidth / mediaHeight));
  $('cursor-overlay').setAttribute('viewBox',`0 0 ${mediaWidth} ${mediaHeight}`);
  $('media-resolution').textContent = `${mediaWidth} × ${mediaHeight}`;
  $('media-frame-rate').textContent = localized(S.media.frameRateLabel) || (S.media.variableFrameRate || S.media.variable_frame_rate || !Number.isFinite(S.media.fps) ? 'VFR' : `${S.media.fps} fps`);
  const sourceURL = S.source_url ?? S.provenance?.source_url;
  $('source-link').hidden = !sourceURL;
  if (sourceURL) $('source-link').href = sourceURL; else $('source-link').removeAttribute('href');
  const defaultDownloads = {sample:'data/sample.json',annotations:'data/narration.json',trace:'data/trajectory.jsonl',provenance:'data/provenance.json'};
  for (const [kind,fallback] of Object.entries(defaultDownloads)) {
    const link = $(`download-${kind}`), href = S.downloads?.[kind] || (!nativeSample ? fallback : null);
    link.hidden = !href;
    if (href) { link.href = href; link.setAttribute('download',kind === 'sample' && !nativeSample ? 'digients-reference-sample.json' : href.split('/').pop()); }
    else link.removeAttribute('href');
  }
  if (nativeSample) {
    // Keep the same application-glyph slot; this sample spans desktop apps.
    const svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
    svg.setAttribute('viewBox','0 0 32 32'); svg.setAttribute('width','29'); svg.setAttribute('height','29');
    const path = document.createElementNS(svg.namespaceURI,'path');
    path.setAttribute('d','M4 5h24v17H4zM11 28h10M16 22v6'); path.setAttribute('fill','none'); path.setAttribute('stroke','currentColor'); path.setAttribute('stroke-width','2');
    svg.append(path); $('sample-glyph').replaceChildren(svg);
  }
  applyLanguage();
  if ('requestVideoFrameCallback' in video) {
    const onFrame = now => { drawCursor(video.currentTime); drawVideoAction(video.currentTime); if (now - lastSync > 160) { sync(); lastSync = now; } video.requestVideoFrameCallback(onFrame); };
    video.requestVideoFrameCallback(onFrame);
  }
})();
