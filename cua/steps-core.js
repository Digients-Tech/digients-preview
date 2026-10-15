(function(root) {
  'use strict';
  const keyNames = {ctrl:'Ctrl',control:'Ctrl',shift:'Shift',alt:'Alt',win:'Win',super:'Win',esc:'Escape',escape:'Escape',enter:'Enter',return:'Enter',tab:'Tab',space:'Space',backspace:'Backspace',delete:'Delete',left:'Left',right:'Right',up:'Up',down:'Down'};
  function keyName(value) {
    if (value && typeof value === 'object') value = value.displayKey ?? value.key ?? value.name ?? '';
    const key = String(value);
    const sided = /^(Ctrl|Control|Shift|Alt|Option|Cmd|Command|Super|Meta)_([LR])$/i.exec(key);
    if (sided) return `${({control:'Ctrl',cmd:'Cmd',command:'Cmd',super:'Cmd',meta:'Cmd',option:'Option'})[sided[1].toLowerCase()] || sided[1]} ${sided[2] === 'L' ? 'Left' : 'Right'}`;
    return keyNames[key.toLowerCase()] || (/^[a-z]$|^f\d{1,2}$/i.test(key) ? key.toUpperCase() : key);
  }
  function label(command) {
    if (command.label) return command.label;
    const p = command.params || {}, name = command.name;
    if (command.source === 'typed_parameters') {
      const button = p.button || 'left';
      if (name === 'move') return 'Move';
      if (name === 'drag') return `${keyName(button)} drag`;
      if (name === 'double_click') return `${keyName(button)} double click`;
      if (name === 'scroll') return 'Scroll · macOS points';
      if (name === 'compound_input') return `Compound${p.keys?.length ? ` · ${p.keys.map(keyName).join(' → ')}` : ' input'}`;
    }
    if (name === 'hotkey') return command.args.map(keyName).join('+');
    if (name === 'press') return (Array.isArray(p.keys) ? p.keys : [p.keys]).map(keyName).join(' → ');
    if (name === 'write') {
      const characters = Array.from(String(p.message).replace(/[\u0000-\u001f\u007f]/g,c => `U+${c.charCodeAt(0).toString(16).toUpperCase().padStart(4,'0')}`));
      return `Type “${characters.slice(0,64).join('')}${characters.length > 64 ? '…' : ''}”`;
    }
    if (name === 'scroll') return `Scroll ${p.clicks > 0 ? 'up' : 'down'} · ${Math.abs(p.clicks)}`;
    if (name === 'moveTo') return 'Move';
    const button = name === 'rightClick' ? 'right' : p.button || 'left';
    return `${button[0].toUpperCase() + button.slice(1)} ${name === 'dragTo' ? 'drag' : name === 'doubleClick' ? 'double click' : 'click'}`;
  }
  function markers(step) {
    const result = []; let origin = null;
    for (const command of step.commands) {
      const p = command.params;
      if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) continue;
      const point = {x:p.x * step.width,y:p.y * step.height};
      if (command.kind === 'move') { origin = point; continue; }
      result.push({kind:command.kind,point,from:command.kind === 'drag' ? origin : null,
        label:label(command),clicks:p.clicks ?? 0});
      if (command.kind === 'drag') origin = point;
    }
    if (!result.length && origin) result.push({kind:'move',point:origin,label:'Move'});
    return result;
  }
  function filterSteps(steps,kind = 'all',query = '') {
    const words = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
    return steps.flatMap((step,index) => {
      if (kind !== 'all' && step.type !== kind && !step.commands.some(command => command.kind === kind)) return [];
      const text = `${step.step} ${step.operation} ${step.action} ${step.commands.map(label).join(' ')}`.toLocaleLowerCase();
      return words.every(word => text.includes(word)) ? [index] : [];
    });
  }
  function windowAround(indices,index,size = 40) {
    const position = Math.max(0,indices.indexOf(index));
    const start = Math.max(0,Math.min(position - 3,indices.length - size));
    return indices.slice(start,start + size);
  }
  function parseStep(hash,count,fallback = 0) {
    const match = /^#step=(\d+)$/.exec(hash);
    return match ? Math.max(0,Math.min(count - 1,Number(match[1]) - 1)) : fallback;
  }

  // Native display values are a typed projection of the recorded events. Never
  // parse an executor DSL to rediscover coordinates, keys, or timing here.
  const isNative = step => step?.display?.source === 'digients-native';
  function pointAt(sample,width,height) {
    if (!Number.isFinite(sample.nx) || !Number.isFinite(sample.ny)) return null;
    return {x:sample.nx * width,y:sample.ny * height,t:sample.t};
  }
  function timedPrefix(items,now,complete) {
    return (items || []).filter(item => Number.isFinite(item.t) && (complete || item.t <= now));
  }
  function arrowBetween(from,to) {
    if (!from || !to || Math.hypot(to.x - from.x,to.y - from.y) < .01) return null;
    return {from,to};
  }
  function pathArrow(path,scale = 1) {
    if (path.length < 2) return null;
    const end = path.at(-1), direct = arrowBetween(path[0],end);
    // Closed loops use the final real segment; a stationary path has no arrow.
    if (direct) return {...direct,mode:'endpoints'};
    for (let index = path.length - 2; index >= 0; index--) {
      const tangent = arrowBetween(path[index],end);
      if (tangent) {
        const distance = Math.hypot(end.x - path[index].x,end.y - path[index].y);
        return {from:{x:end.x - (end.x - path[index].x) / distance * 96 * scale,y:end.y - (end.y - path[index].y) / distance * 96 * scale},to:end,mode:'terminal_tangent',source:path[index]};
      }
    }
    return null;
  }
  const compactNumber = n => Number(n.toFixed(3)).toString();
  const signed = n => `${n > 0 ? '+' : ''}${compactNumber(n)}`;
  function displayPaths(display,type) {
    const own = item => [
      ...(item.path?.length ? [{type:item.type || type,path:item.path}] : []),
      ...(item.pointerPath?.length ? [{type:'pointer',path:item.pointerPath}] : []),
    ];
    const members = (display.members || []).flatMap(own);
    if (!members.length) return own(display);
    // A compound may carry motion between member actions. Keep those points in
    // separate contiguous runs; do not bridge two member paths or discard the
    // compound-only path merely because member paths are available.
    const identity = p => `${p.t},${p.nx},${p.ny}`, represented = new Map();
    for (const track of members) for (const point of track.path) represented.set(identity(point),(represented.get(identity(point)) || 0) + 1);
    const residual = [];
    for (const track of own(display)) {
      let run = [];
      for (const point of track.path) {
        const key = identity(point), count = represented.get(key) || 0;
        if (count) {
          represented.set(key,count - 1);
          if (run.length) { residual.push({type:'pointer',path:run}); run = []; }
        } else run.push(point);
      }
      if (run.length) residual.push({type:'pointer',path:run});
    }
    return [...members,...residual];
  }
  function keycapsForTime(step,now,complete) {
    const keys = timedPrefix(step.display.keys,now,complete);
    const start = step.start_s ?? step.start ?? keys[0]?.t ?? 0;
    const ordered = new Map();
    for (const event of keys) {
      const name = keyName(event.displayKey || event.key), state = ordered.get(name) || {name,events:[],held:false};
      state.events.push(event);
      if (event.action === 'down') state.held = true;
      if (event.action === 'up') state.held = false;
      ordered.set(name,state);
    }
    return [...ordered.values()].filter(state => complete || state.held || now - state.events.at(-1).t <= .8).map(state => ({
      key:state.name,held:state.held,
      label:complete ? `${state.name} ${state.events.map(e => `${e.action === 'down' ? '↓' : e.action === 'up' ? '↑' : '↻'}${compactNumber(e.t - start)}s`).join(' ')}` : `${state.name} ${state.held ? 'held' : state.events.at(-1).action === 'repeat' ? 'repeat' : 'released'}`,
      events:state.events,
    }));
  }
  function overlayForTime(step,width = step.width,height = step.height,now = Infinity,{mode = 'frame'} = {}) {
    if (!isNative(step)) return {markers:markers(step).map(marker => ({...marker,
      point:{x:marker.point.x / step.width * width,y:marker.point.y / step.height * height},
      from:marker.from ? {x:marker.from.x / step.width * width,y:marker.from.y / step.height * height} : null,
    })),keycaps:step.commands.filter(c => c.kind === 'keyboard').map(command => ({label:label(command)})),native:false};
    const complete = mode === 'frame', display = step.display, result = [];
    const paths = displayPaths(display,step.type);
    for (const member of paths) {
      const path = timedPrefix(member.path,now,complete).map(p => pointAt(p,width,height)).filter(Boolean);
      if (!path.length) continue;
      const kind = member.type === 'drag' ? 'drag' : 'move';
      const description = member.type === 'drag' ? 'Drag' : member.type === 'move' ? 'Move' : 'Pointer path';
      result.push({kind,point:path.at(-1),from:path[0],path,arrow:pathArrow(path,Math.min(width,height) / 1080),
        label:`${description} · ${path.length} points`,native:true});
    }
    const ticks = timedPrefix(display.ticks,now,complete), tickCount = ticks.length;
    ticks.forEach((tick,index) => {
      const point = pointAt(tick,width,height); if (!point) return;
      const dx = Number(tick.dx ?? tick.delta_x ?? 0), dy = Number(tick.dy ?? tick.delta_y ?? 0);
      const radius = Math.min(width,height) * .016;
      const arrows = [];
      // CGEvent point signs are raw axes, not Markov wheel notches or inferred
      // content motion. Draw both components, and no arrow for a phase-only tick.
      const clamp = (v,min,max) => Math.max(min,Math.min(max,v));
      if (dx) {
        const origin = {x:clamp(point.x,radius * 4,width - radius * 4),y:clamp(point.y + radius * 2,radius,height - radius)};
        arrows.push({...arrowBetween(origin,{x:origin.x + Math.sign(dx) * radius * 4,y:origin.y}),axis:'x',sign:Math.sign(dx)});
      }
      if (dy) {
        const origin = {x:clamp(point.x + radius * 2,radius,width - radius),y:clamp(point.y,radius * 4,height - radius * 4)};
        arrows.push({...arrowBetween(origin,{x:origin.x,y:origin.y - Math.sign(dy) * radius * 4}),axis:'y',sign:Math.sign(dy)});
      }
      result.push({kind:'scroll',point,arrows,native:true,tick,
        label:index === tickCount - 1 ? `Scroll · ${tickCount} ticks\nΔx ${signed(dx)} · Δy ${signed(dy)} points${!dx && !dy ? '\nphase only' : ''}` : '',
        title:`${compactNumber(tick.t)}s · native Δx ${signed(dx)} / Δy ${signed(dy)} points · phase ${tick.phase ?? 0} · momentum ${tick.momentumPhase ?? 0}`});
    });
    const edges = timedPrefix(display.edges,now,complete);
    const groupedEdges = new Map();
    for (const edge of edges) {
      const point = pointAt(edge,width,height); if (!point) continue;
      const identity = `${point.x},${point.y},${edge.button}`;
      const group = groupedEdges.get(identity) || {kind:'click',point,native:true,edges:[],double:step.type === 'double_click'};
      group.edges.push(edge); groupedEdges.set(identity,group);
    }
    for (const marker of groupedEdges.values()) {
      const start = step.start_s ?? step.start ?? marker.edges[0].t;
      marker.label = `${marker.double ? 'Double click · ' : ''}${marker.edges[0].button || 'left'}\n${marker.edges.map(e => `${e.action === 'down' ? '↓' : '↑'} ${compactNumber(e.t - start)}s`).join(' · ')}`;
      result.push(marker);
    }
    return {markers:result,keycaps:keycapsForTime(step,now,complete),native:true,
      sourceStepId:step.sourceId ?? step.source_id ?? step.id ?? step.step,
      scope:complete ? 'full_action_schematic' : 'occurred_by_playback_time',cutoff:now};
  }

  // Shared by the video clock and decoded action screenshots. All coordinates
  // have already been scaled to this exact viewBox; original PNGs stay intact.
  function renderOverlay({document,overlay,labels,keycaps},model,width,height) {
    const svg = (tag,attrs = {}) => {
      const node = document.createElementNS('http://www.w3.org/2000/svg',tag);
      for (const [name,value] of Object.entries(attrs)) node.setAttribute(name,String(value));
      return node;
    };
    overlay.replaceChildren(); labels?.replaceChildren(); keycaps?.replaceChildren();
    overlay.setAttribute('viewBox',`0 0 ${width} ${height}`);
    if (model.native) {
      overlay.setAttribute('data-source-step-id',model.sourceStepId);
      overlay.setAttribute('data-scope',model.scope);
      overlay.setAttribute('data-point-count',model.markers.reduce((count,m) => count + (m.path?.length || 0),0));
      if (Number.isFinite(model.cutoff)) overlay.setAttribute('data-cutoff-s',model.cutoff);
      else overlay.removeAttribute('data-cutoff-s');
    } else for (const attr of ['data-source-step-id','data-scope','data-point-count','data-cutoff-s']) overlay.removeAttribute(attr);
    function drawArrow(group,arrow,{legacy = false} = {}) {
      if (!arrow) return;
      const {from,to} = arrow, dx = to.x - from.x, dy = to.y - from.y;
      const angle = Math.atan2(dy,dx), head = Math.min(legacy ? 55 : Math.min(width,height) * .045,Math.hypot(dx,dy) / 2);
      group.append(svg('line',{x1:from.x,y1:from.y,x2:to.x,y2:to.y,class:'marker-arrow-line'}),
        svg('path',{d:`M ${to.x - head * Math.cos(angle - .5)} ${to.y - head * Math.sin(angle - .5)} L ${to.x} ${to.y} L ${to.x - head * Math.cos(angle + .5)} ${to.y - head * Math.sin(angle + .5)}`,class:'marker-arrow-head'}));
    }
    const captions = new Map();
    for (const marker of model.markers) {
      const {x,y} = marker.point, scale = marker.native ? Math.min(width,height) / 1080 : 1;
      const group = svg('g',{class:`action-marker marker-${marker.kind}${marker.native ? ' marker-native' : ''}`,'data-kind':marker.kind});
      if (marker.title) { const title = svg('title'); title.textContent = marker.title; group.append(title); }
      if (marker.path) {
        group.append(svg('polyline',{points:marker.path.map(p => `${p.x},${p.y}`).join(' '),class:'marker-full-path','data-point-count':marker.path.length,'data-last-t':marker.path.at(-1).t}));
        drawArrow(group,marker.arrow);
        if (marker.arrow) group.setAttribute('data-arrow-mode',marker.arrow.mode);
        group.append(svg('circle',{cx:marker.from.x,cy:marker.from.y,r:13 * scale,class:'marker-origin'}));
      } else if (marker.kind === 'drag' && marker.from) {
        drawArrow(group,{from:marker.from,to:marker.point},{legacy:true});
        group.append(svg('circle',{cx:marker.from.x,cy:marker.from.y,r:13,class:'marker-origin'}));
      }
      if (marker.native && marker.kind === 'scroll') {
        for (const arrow of marker.arrows) {
          drawArrow(group,arrow);
          const text = svg('text',{x:Math.max(8,Math.min(width - 120 * scale,arrow.to.x + 14 * scale)),y:Math.max(28 * scale,arrow.to.y - 12 * scale),class:'marker-raw-axis','data-raw-axis':`${arrow.sign > 0 ? '+' : '−'}${arrow.axis.toUpperCase()}`,
            fill:'var(--marker-color)',stroke:'var(--dark)','stroke-width':3,'paint-order':'stroke','font-size':22 * scale});
          text.textContent = `raw ${arrow.sign > 0 ? '+' : '−'}${arrow.axis.toUpperCase()}`; group.append(text);
        }
        group.setAttribute('data-scroll-t',marker.tick.t);
        group.setAttribute('data-delta-x',marker.tick.dx ?? marker.tick.delta_x ?? 0);
        group.setAttribute('data-delta-y',marker.tick.dy ?? marker.tick.delta_y ?? 0);
      } else if (marker.kind === 'scroll') {
        const end = y + (marker.clicks > 0 ? -100 : 100), sign = marker.clicks > 0 ? 1 : -1;
        group.append(svg('line',{x1:x,y1:y,x2:x,y2:end}),svg('path',{d:`M ${x - 25} ${end + 30 * sign} L ${x} ${end} L ${x + 25} ${end + 30 * sign}`}));
      }
      group.append(svg('circle',{cx:x,cy:y,r:34 * scale,class:'marker-ring'}),svg('circle',{cx:x,cy:y,r:7 * scale,class:'marker-center'}));
      if (marker.kind === 'click') group.append(svg('path',{d:`M ${x - 46 * scale} ${y} H ${x + 46 * scale} M ${x} ${y - 46 * scale} V ${y + 46 * scale}`}));
      if (marker.double) group.append(svg('circle',{cx:x,cy:y,r:49 * scale,class:'marker-ring'}));
      overlay.append(group);
      if (labels && marker.label) {
        const identity = marker.native ? `${x},${y}` : `${x},${y},${captions.size}`;
        const existing = captions.get(identity);
        if (existing) existing.label += `\n${marker.label}`;
        else captions.set(identity,{x,y,kind:marker.kind,label:marker.label,native:marker.native});
      }
    }
    for (const marker of captions.values()) {
      const caption = document.createElement('span'); caption.className = `overlay-caption marker-${marker.kind}${marker.native ? ' native-caption' : ''}`;
      caption.textContent = marker.label;
      caption.style.left = `clamp(8px, calc(${marker.x / width * 100}% + 18px), calc(100% - 144px))`;
      caption.style.top = `clamp(8px, calc(${marker.y / height * 100}% - 40px), calc(100% - 40px))`;
      labels.append(caption);
    }
    if (keycaps) for (const key of model.keycaps) {
      const keycap = document.createElement('kbd'); keycap.textContent = key.label;
      if (key.key) keycap.setAttribute('data-key',key.key);
      if (key.held) keycap.setAttribute('data-held','true');
      keycaps.append(keycap);
    }
  }
  root.CUAStepsCore = Object.freeze({keyName,label,markers,filterSteps,windowAround,parseStep,isNative,overlayForTime,renderOverlay});
})(globalThis);
