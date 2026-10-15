(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const T = window.CUA_STEPS, C = window.CUAStepsCore;
  if (!T || !C) { $('view-steps').disabled = true; return; }
  const labels = {
    en:{fullVideo:'Full video',actionFrames:'Action frames',actionSequence:'Action sequence',allActions:'All actions',clicks:'Clicks',drags:'Drags',scrolls:'Scrolls',moves:'Moves',compounds:'Compound inputs',keys:'Keys / typing',goToStep:'Go to step',go:'Go',originalFrame:'Original frame',copyStepLink:'Copy step link',sourceFrames:'Source screenshots + recorded actions',loadingFrame:'Loading action frame…',frameFailed:'This frame could not load.',retry:'Retry frame',frameRate:'Frames per second',noSteps:'No matching actions',clearSearch:'Clear filters',step:'Step',search:'Search operations or keys…',previous:'Previous action',next:'Next action',play:'Play action frames',pause:'Pause action frames',show:'Show action highlights',hide:'Hide action highlights',fullscreen:'Fullscreen action frame',fullscreenFailed:'Fullscreen is unavailable in this browser.',copied:'Step link copied',copyManually:'Select and copy this link',loading:'Loading',filter:'Action type'},
    zh:{fullVideo:'完整视频',actionFrames:'关键操作帧',actionSequence:'操作序列',allActions:'全部操作',clicks:'点击',drags:'拖动',scrolls:'滚动',moves:'鼠标移动',compounds:'复合输入',keys:'按键 / 输入',goToStep:'跳至步骤',go:'跳转',originalFrame:'原始截图',copyStepLink:'复制此步链接',sourceFrames:'来源截图与对应操作',loadingFrame:'正在加载操作帧…',frameFailed:'此帧暂时无法加载。',retry:'重新加载',frameRate:'每秒步数',noSteps:'没有匹配的操作',clearSearch:'清除筛选',step:'步骤',search:'搜索英文操作或按键…',previous:'上一步操作',next:'下一步操作',play:'连续播放操作帧',pause:'暂停操作帧',show:'显示操作高亮',hide:'隐藏操作高亮',fullscreen:'全屏查看操作帧',fullscreenFailed:'当前浏览器无法进入全屏。',copied:'已复制此步链接',copyManually:'选中并复制此链接',loading:'加载中',filter:'操作类型'},
  };
  const language = () => document.documentElement.lang.startsWith('zh') ? 'zh' : 'en';
  const t = key => labels[language()][key] || key;
  let view = 'video', selected = C.parseStep(location.hash,T.stepCount,T.initialStep - 1);
  let displayed = -1, request = 0, running = false, timer = 0, showMarkers = true, busy = false;
  let filtered = C.filterSteps(T.steps), visible = [], filter = 'all';
  const cache = new Map();
  const svgNS = 'http://www.w3.org/2000/svg';
  function svg(tag,attrs = {}) {
    const node = document.createElementNS(svgNS,tag);
    for (const [name,value] of Object.entries(attrs)) node.setAttribute(name,String(value));
    return node;
  }
  function setHidden(node,hidden) {
    node.hidden = hidden;
    // SVG has no HTMLElement.hidden reflection: keep the real attribute in
    // sync so [hidden] controls vector layers as well as HTML labels.
    if (hidden) node.setAttribute('hidden',''); else node.removeAttribute('hidden');
  }
  function updateMarkerVisibility() {
    const hidden = !showMarkers || busy || !filtered.length || displayed !== selected || $('step-image').hidden;
    for (const id of ['step-overlay','step-overlay-labels','step-keycaps']) setHidden($(id),hidden);
  }
  function name(id,key) { $(id).setAttribute('aria-label',t(key)); $(id).title = t(key); }
  function updateLanguage() {
    document.querySelectorAll('[data-step-i18n]').forEach(node => { node.textContent = t(node.dataset.stepI18n); });
    $('step-search').placeholder = t('search'); $('step-search').setAttribute('aria-label',t('search'));
    name('step-prev','previous'); name('step-next','next'); name('step-fullscreen','fullscreen');
    name('step-rate','frameRate'); name('step-filter','filter');
    $('step-actions').setAttribute('aria-label',language() === 'zh' ? '原始操作指令' : 'Recorded action commands');
    $('step-operation').setAttribute('aria-label',language() === 'zh' ? '操作说明' : 'Action description');
    updateControls();
    if (displayed >= 0) updateFrameSource(T.steps[displayed]);
  }
  function updateControls() {
    const position = filtered.indexOf(selected);
    $('step-prev').disabled = position <= 0;
    $('step-next').disabled = position < 0 || position === filtered.length - 1;
    $('step-play').disabled = !filtered.length;
    $('step-play').replaceChildren(svg('svg',{class:'icon','aria-hidden':'true'}));
    $('step-play').firstElementChild.append(svg('use',{href:`#i-${running ? 'pause' : 'play'}`}));
    name('step-play',running ? 'pause' : 'play');
    name('step-markers-toggle',showMarkers ? 'hide' : 'show');
    $('step-counter').textContent = `${t('step')} ${(selected + 1).toLocaleString('en-US')} / ${T.stepCount.toLocaleString('en-US')}${busy ? ` · ${t('loading')}` : ''}`;
    $('step-seek').value = selected + 1;
    $('step-seek').setAttribute('aria-valuetext',`${t('step')} ${selected + 1} / ${T.stepCount}`);
    $('step-number').value = selected + 1;
    $('step-seek').style.setProperty('--progress',`${selected / Math.max(1,T.stepCount - 1) * 100}%`);
    $('step-markers-toggle').setAttribute('aria-pressed',String(showMarkers));
  }
  function stop() { running = false; clearTimeout(timer); updateControls(); }
  function setView(next) {
    const changed = view !== next;
    view = next;
    $('video-view').hidden = next !== 'video'; $('steps-view').hidden = next !== 'steps';
    document.querySelectorAll('[data-view]').forEach(button => {
      const active = button.dataset.view === next;
      button.classList.toggle('active',active); button.setAttribute('aria-selected',String(active)); button.tabIndex = active ? 0 : -1;
    });
    if (next === 'steps') {
      $('video').pause();
      if (changed || displayed < 0) showStep(selected);
    } else stop();
  }
  function loadImage(index) {
    const url = T.steps[index].image;
    if (!cache.has(index)) {
      const picture = new Image(); picture.src = url;
      const promise = picture.decode().then(() => picture).catch(error => { cache.delete(index); throw error; });
      cache.set(index,promise);
      if (cache.size > 10) cache.delete(cache.keys().next().value);
    }
    return cache.get(index);
  }
  function prefetch() {
    const position = filtered.indexOf(selected);
    for (const offset of [-1,1,2,3]) {
      const index = filtered[position + offset];
      if (index !== undefined) loadImage(index).catch(() => {});
    }
  }
  function schedule() {
    clearTimeout(timer);
    if (!running || busy || view !== 'steps' || !filtered.length) return;
    const position = filtered.indexOf(selected);
    if (position < 0 || position >= filtered.length - 1) { stop(); return; }
    timer = setTimeout(() => showStep(filtered[position + 1]),1000 / Number($('step-rate').value || 2));
  }
  function drawMarkers(step) {
    C.renderOverlay({document,overlay:$('step-overlay'),labels:$('step-overlay-labels'),keycaps:$('step-keycaps')},
      C.overlayForTime(step,step.width,step.height,Infinity,{mode:'frame'}),step.width,step.height);
    updateMarkerVisibility();
  }
  function updateFrameSource(step) {
    const note = $('step-frame-source');
    if (!note) return;
    note.scrollTop = 0;
    if (!C.isNative(step)) { note.textContent = t('sourceFrames'); return; }
    const roles = {
      en:{pre_action:'Before input',event_start:'Input start boundary',event_end:'Input end boundary',physical_release:'Physical release boundary',result_state:'Independent result frame'},
      zh:{pre_action:'输入前帧',event_start:'输入起始边界帧',event_end:'输入结束边界帧',physical_release:'物理释放边界帧',result_state:'独立结果帧'},
    };
    const role = roles[language()][step.frameRole] || step.frameRole || t('originalFrame');
    const timestamp = Number.isFinite(step.frameTimestamp_s) ? ` · ${step.frameTimestamp_s.toFixed(3)}s` : '';
    const boundary = step.frameRole && step.frameRole !== 'result_state' ? (language() === 'zh' ? ' · 完整动作示意，非独立结果' : ' · Full action schematic; not an independent result') : '';
    note.textContent = `${role}${timestamp}${boundary}`;
  }
  function actionTitle(step) {
    if (!C.isNative(step)) return step.commands.map(C.label).join(' · ');
    const display = step.display;
    const parts = [...new Set((display.keys || []).map(key => C.keyName(key.displayKey || key.key)))];
    const buttons = [...new Set((display.edges || []).map(edge => edge.button).filter(Boolean))];
    for (const button of buttons) {
      const members = (display.members || []).filter(member => (member.edges || []).some(edge => edge.button === button));
      const types = [step.type,...members.map(member => member.type)];
      const action = types.includes('drag') ? 'drag' : types.includes('double_click') ? 'double click' : 'click';
      parts.push(`${C.keyName(button)} ${action}`);
    }
    if (display.ticks?.length) parts.push('Scroll');
    if (!buttons.length && !display.ticks?.length && (display.path?.length || display.pointerPath?.length)) parts.push('Move');
    const detail = [...new Set(parts)].join(' + ');
    return step.type === 'compound_input' ? `Compound${detail ? ` · ${detail}` : ' input'}` : detail || step.commands.map(C.label).join(' · ');
  }
  function renderList() {
    visible = C.windowAround(filtered,selected);
    const fragment = document.createDocumentFragment();
    for (const index of visible) {
      const step = T.steps[index], row = document.createElement('button');
      row.className = 'timeline-row step-row'; row.dataset.step = index;
      const kinds = [...new Set(step.commands.map(command => command.kind))];
      const colorBar = document.createElement('span'); colorBar.className = 'step-action-bar'; colorBar.setAttribute('aria-hidden','true');
      for (const kind of kinds.filter(kind => kind !== 'move' || kinds.length === 1)) {
        const segment = document.createElement('span'); segment.className = 'step-kind-color'; segment.dataset.actionKind = kind;
        colorBar.append(segment);
      }
      const stamp = document.createElement('span'); stamp.className = 'row-time'; stamp.textContent = String(step.step).padStart(4,'0');
      const body = document.createElement('span'); body.className = 'row-body';
      const title = document.createElement('span'); title.className = 'row-title';
      title.textContent = actionTitle(step);
      const detail = document.createElement('span'); detail.className = 'row-detail'; detail.textContent = step.operation;
      body.append(title,detail); row.append(colorBar,stamp,body);
      if (index === selected) { row.classList.add('active'); row.setAttribute('aria-current','step'); }
      row.addEventListener('click',() => { stop(); showStep(index); });
      fragment.append(row);
    }
    $('step-list').replaceChildren(fragment);
    $('step-match-count').textContent = filtered.length.toLocaleString('en-US');
    $('step-empty').hidden = !!filtered.length; $('step-list').hidden = !filtered.length;
    const active = [...$('step-list').children].find(row => Number(row.dataset.step) === selected);
    if (active) {
      const panel = $('step-list-panel');
      panel.scrollTop += active.getBoundingClientRect().top - panel.getBoundingClientRect().top - 12;
    }
  }
  async function showStep(index) {
    clearTimeout(timer);
    selected = Math.max(0,Math.min(T.stepCount - 1,index));
    const currentRequest = ++request, step = T.steps[selected];
    busy = true; updateControls(); renderList();
    $('step-stage').setAttribute('aria-busy','true'); $('step-loading').hidden = false; $('step-error').hidden = true;
    $('step-image').hidden = true;
    for (const id of ['step-overlay','step-overlay-labels','step-keycaps']) setHidden($(id),true);
    try {
      const picture = await loadImage(selected);
      if (currentRequest !== request) return;
      picture.setAttribute('id','step-image'); picture.setAttribute('alt',`${t('step')} ${step.step}: ${step.operation}`);
      picture.setAttribute('width',step.width); picture.setAttribute('height',step.height); picture.draggable = false;
      const old = $('step-stage').querySelector('img'); old.replaceWith(picture); picture.hidden = false;
      displayed = selected; busy = false;
      $('step-stage').style.setProperty('--media-aspect',step.width / step.height);
      updateFrameSource(step);
      $('step-loading').hidden = true; $('step-stage').setAttribute('aria-busy','false');
      $('step-operation').textContent = step.operation;
      const commands = C.isNative(step) ? [{kind:step.type,raw:step.action}] : step.commands;
      $('step-actions').replaceChildren(...commands.map(command => {
        const code = document.createElement('code'); code.className = `step-command command-${command.kind}`; code.textContent = command.raw; return code;
      }));
      $('step-actions').scrollTop = 0;
      $('step-operation').scrollTop = 0;
      $('step-download').href = step.image; $('step-download').setAttribute('download',step.image.split('/').pop());
      drawMarkers(step); updateControls();
      if (view === 'steps') {
        history.replaceState(null,'',`#step=${step.step}`);
        $('code-tab-trace').dataset.stepIndex = selected; $('code-tab-trace').click();
      }
      prefetch(); schedule();
    } catch {
      if (currentRequest !== request) return;
      busy = false; stop(); $('step-loading').hidden = true; $('step-error').hidden = false;
      $('step-stage').setAttribute('aria-busy','false');
    }
  }
  function move(direction) {
    const position = filtered.indexOf(selected), next = filtered[position + direction];
    if (next !== undefined) { stop(); showStep(next); }
  }
  function togglePlayback() {
    if (running) { stop(); return; }
    if (!filtered.length) return;
    running = true; updateControls();
    if (filtered.indexOf(selected) === filtered.length - 1) showStep(filtered[0]);
    else if (displayed !== selected) showStep(selected);
    else schedule();
  }
  function updateFilter() {
    stop(); filter = $('step-filter').value;
    filtered = C.filterSteps(T.steps,filter,$('step-search').value);
    if (filtered.length && !filtered.includes(selected)) {
      showStep(filtered.find(index => index >= selected) ?? filtered[filtered.length - 1]);
    } else { renderList(); updateControls(); }
    updateMarkerVisibility();
  }
  function jump(index) {
    stop(); $('step-filter').value = 'all'; $('step-search').value = ''; filter = 'all';
    filtered = C.filterSteps(T.steps); showStep(index);
  }
  document.querySelectorAll('[data-view]').forEach(button => button.addEventListener('click',() => {
    setView(button.dataset.view);
    if (button.dataset.view === 'video') history.replaceState(null,'',`#t=${$('video').currentTime.toFixed(3)}`);
  }));
  const tabs = [$('view-video'),$('view-steps')];
  tabs.forEach((button,index) => button.addEventListener('keydown',event => {
    if (!['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return;
    event.preventDefault(); const next = event.key === 'Home' ? 0 : event.key === 'End' ? 1 : 1 - index;
    tabs[next].click(); tabs[next].focus();
  }));
  $('step-prev').addEventListener('click',() => move(-1)); $('step-next').addEventListener('click',() => move(1));
  $('step-play').addEventListener('click',togglePlayback);
  $('step-seek').addEventListener('input',event => jump(Number(event.target.value) - 1));
  $('step-jump-form').addEventListener('submit',event => { event.preventDefault(); if ($('step-number').reportValidity()) jump(Number($('step-number').value) - 1); });
  $('step-rate').addEventListener('change',schedule);
  $('step-search').addEventListener('input',updateFilter); $('step-filter').addEventListener('change',updateFilter);
  $('step-clear').addEventListener('click',() => jump(selected));
  $('step-markers-toggle').addEventListener('click',() => {
    showMarkers = !showMarkers;
    updateMarkerVisibility();
    updateControls();
  });
  $('step-retry').addEventListener('click',() => { cache.delete(selected); showStep(selected); });
  $('step-player').addEventListener('keydown',event => {
    if (['INPUT','SELECT','BUTTON','TEXTAREA'].includes(event.target.tagName)) return;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); move(event.key === 'ArrowLeft' ? -1 : 1); }
    if (event.key === ' ') { event.preventDefault(); togglePlayback(); }
    if (event.key === 'Home' || event.key === 'End') { event.preventDefault(); if (filtered.length) { stop(); showStep(filtered[event.key === 'Home' ? 0 : filtered.length - 1]); } }
  });
  $('step-fullscreen').addEventListener('click',async () => {
    try { if (document.fullscreenElement) await document.exitFullscreen(); else await $('step-player').requestFullscreen(); }
    catch { $('toast').textContent = t('fullscreenFailed'); $('toast').hidden = false; setTimeout(() => { $('toast').hidden = true; },3000); }
  });
  $('step-share').addEventListener('click',async () => {
    const url = new URL(location.href); url.hash = `step=${selected + 1}`;
    try { await navigator.clipboard.writeText(url.href); $('toast').textContent = t('copied'); $('toast').hidden = false; setTimeout(() => { $('toast').hidden = true; },3000); }
    catch { $('copy-fallback').hidden = false; $('copy-value').value = url.href; $('copy-value').focus(); $('copy-value').select(); }
  });
  $('language').addEventListener('click',updateLanguage);
  $('video').addEventListener('play',() => { if (view !== 'video') setView('video'); });
  addEventListener('hashchange',() => {
    if (/^#step=\d+$/.test(location.hash)) { setView('steps'); jump(C.parseStep(location.hash,T.stepCount)); }
    else if (/^#t=/.test(location.hash)) setView('video');
  });
  $('step-seek').max = T.stepCount; $('step-number').max = T.stepCount;
  if ($('sample-step-count')) $('sample-step-count').textContent = T.stepCount.toLocaleString('en-US');
  $('step-match-count').textContent = T.stepCount.toLocaleString('en-US');
  $('step-filter').value = 'all'; $('step-rate').value = '2'; updateLanguage();
  updateMarkerVisibility();
  if (/^#step=\d+$/.test(location.hash)) setView('steps');
})();
