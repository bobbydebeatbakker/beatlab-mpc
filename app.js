'use strict';
const $ = id => document.getElementById(id);
const PAD_NAMES = ['KICK','SNARE','CLOSED HH','OPEN HH','CLAP','RIM','TOM LOW','TOM HIGH','SAMPLE 09','SAMPLE 10','SAMPLE 11','SAMPLE 12','SAMPLE 13','SAMPLE 14','SAMPLE 15','SAMPLE 16'];
const COLORS = ['#c5ff4a','#ff8b4a','#63d8ff','#d28bff','#ff6584','#f4d35e','#63e6be','#9ca8ff'];
const state = {
  audio: null, masterGain: null, eq: null, convolver: null, dry: null, wet: null,
  sourceBuffer: null, sourceName: '', selectedPad: 0, selectedChop: 0, chops: [],
  patternIndex: 0, patterns: Array.from({length:4}, () => Array.from({length:16}, () => Array(16).fill(false))),
  pads: PAD_NAMES.map(name => ({name, buffer:null, file:'', steps:Array(16).fill(false)})),
  playing:false, timer:null, stepIndex:0, nextStepTime:0, scheduler:null
};

function initAudio() {
  if (!state.audio) {
    state.audio = new (window.AudioContext || window.webkitAudioContext)();
    buildAudioGraph();
    $('audioStatus').textContent = '● AUDIO READY';
  }
  if (state.audio.state === 'suspended') state.audio.resume();
  return state.audio;
}
function buildAudioGraph() {
  const ctx = state.audio;
  state.eq = ctx.createBiquadFilter();
  state.eq.type = 'peaking'; state.eq.frequency.value = 1000; state.eq.Q.value = 1; state.eq.gain.value = 0;
  state.convolver = ctx.createConvolver();
  state.dry = ctx.createGain(); state.wet = ctx.createGain(); state.masterGain = ctx.createGain();
  const length = Math.floor(ctx.sampleRate * 2);
  const impulse = ctx.createBuffer(2, length, ctx.sampleRate);
  for (let ch=0; ch<2; ch++) {
    const data = impulse.getChannelData(ch);
    for (let i=0; i<length; i++) data[i] = (Math.random()*2-1) * Math.pow(1-i/length, 2.4);
  }
  state.convolver.buffer = impulse;
  state.eq.connect(state.dry); state.eq.connect(state.convolver);
  state.convolver.connect(state.wet); state.dry.connect(state.masterGain);
  state.wet.connect(state.masterGain); state.masterGain.connect(ctx.destination);
  updateFx();
}
function playBuffer(buffer, start=0, duration=null, when=null) {
  if (!buffer) return;
  const ctx = initAudio();
  const src = ctx.createBufferSource(); src.buffer = buffer;
  const gain = ctx.createGain(); gain.gain.value = .9;
  src.connect(gain); gain.connect(state.eq);
  const at = when == null ? ctx.currentTime + .006 : when;
  const safeStart = Math.max(0, Math.min(start, buffer.duration));
  const dur = duration == null ? buffer.duration-safeStart : Math.min(duration, buffer.duration-safeStart);
  if (dur <= 0) return;
  src.start(at, safeStart, dur);
}
function esc(s) { return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function drawPads() {
  const root=$('pads'); root.innerHTML='';
  state.pads.forEach((p,i)=>{
    const b=document.createElement('button');
    b.className='pad'+(i===state.selectedPad?' lit':''); b.style.setProperty('--padcolor',COLORS[i%COLORS.length]);
    b.innerHTML=`<span class="n">${String(i+1).padStart(2,'0')}</span><span class="pname">${esc(p.name)}</span><span class="assign">${p.file?esc(p.file):'EMPTY PAD'}</span>`;
    b.setAttribute('aria-label',`Pad ${i+1}: ${p.name}`);
    b.onclick=()=>{state.selectedPad=i;$('selectedLabel').textContent=`PAD ${String(i+1).padStart(2,'0')} SELECTED`;drawPads();drawSteps();if(p.buffer)playBuffer(p.buffer);else $('message').textContent=`Pad ${i+1} is leeg. Importeer audio of wijs een chop toe.`;};
    root.appendChild(b);
  });
}
function drawSteps() {
  const root=$('steps'); root.innerHTML='';
  state.pads[state.selectedPad].steps.forEach((on,i)=>{
    const b=document.createElement('button'); b.className='step'+(on?' lit':''); b.textContent=String(i+1).padStart(2,'0');
    b.setAttribute('aria-label',`Step ${i+1}`);
    b.onclick=()=>{state.pads[state.selectedPad].steps[i]=!state.pads[state.selectedPad].steps[i];syncPatternFromPads();drawSteps();};
    root.appendChild(b);
  });
}
function syncPatternFromPads() {
  state.pads.forEach((p,pi)=>state.patterns[state.patternIndex][pi]=p.steps.slice());
}
function loadPattern(index) {
  syncPatternFromPads(); state.patternIndex=index;
  state.pads.forEach((p,pi)=>p.steps=state.patterns[index][pi].slice());
  $('patternStatus').textContent=`PATTERN ${String(index+1).padStart(2,'0')}`;
  renderPatterns();drawSteps();
}
function renderPatterns() {
  const root=$('patternList');root.innerHTML='';
  state.patterns.forEach((_,i)=>{const b=document.createElement('button');b.className='pattern-btn'+(i===state.patternIndex?' active':'');b.textContent=`PATTERN ${String(i+1).padStart(2,'0')}`;b.onclick=()=>loadPattern(i);root.appendChild(b);});
}
function updateFx() {
  const f=+$('eqFreq').value, gain=+$('eqGain').value, size=+$('reverbSize').value;
  $('eqFreqText').textContent=f.toLocaleString('nl-NL')+' Hz'; $('eqGainText').textContent=gain.toLocaleString('nl-NL')+' dB';
  $('reverbSizeText').textContent=size+'%';$('reverbState').textContent=size<34?'SMALL':size<68?'MEDIUM':'LARGE';
  if(state.eq){state.eq.frequency.value=Math.max(10,Math.min(20000,f));state.eq.gain.value=gain;state.wet.gain.value=size/100*.45;state.dry.gain.value=1-size/100*.18;}
}
function setBpm(v){$('bpm').value=v;$('bpmValue').textContent=v;}
$('bpm').oninput=e=>setBpm(e.target.value);
$('minus').onclick=()=>setBpm(Math.max(50,+$('bpm').value-1));
$('plus').onclick=()=>setBpm(Math.min(180,+$('bpm').value+1));

function drawWave(buffer) {
  const canvas=$('wave'), dpr=window.devicePixelRatio||1, w=canvas.clientWidth||300,h=canvas.clientHeight||82;
  canvas.width=Math.floor(w*dpr);canvas.height=Math.floor(h*dpr);
  const ctx=canvas.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);
  ctx.fillStyle='#101217';ctx.fillRect(0,0,w,h);ctx.strokeStyle='#c5ff4a';ctx.lineWidth=1;const data=buffer.getChannelData(0), step=Math.max(1,Math.floor(data.length/w));
  ctx.beginPath();for(let x=0;x<w;x++){let min=1,max=-1;for(let j=0;j<step;j++){const v=data[x*step+j]||0;min=Math.min(min,v);max=Math.max(max,v);}ctx.moveTo(x,h/2+min*h*.42);ctx.lineTo(x,h/2+max*h*.42);}ctx.stroke();
  ctx.strokeStyle='#ffffff20';ctx.beginPath();ctx.moveTo(0,h/2);ctx.lineTo(w,h/2);ctx.stroke();
}
function makeSlice(buffer,startRatio,endRatio) {
  const ctx=initAudio(), start=Math.floor(startRatio*buffer.length), end=Math.max(start+1,Math.floor(endRatio*buffer.length));
  const out=ctx.createBuffer(buffer.numberOfChannels,end-start,buffer.sampleRate);
  for(let ch=0;ch<buffer.numberOfChannels;ch++)out.copyToChannel(buffer.getChannelData(ch).slice(start,end),ch);
  return out;
}
function updateChopLabels() {
  if(!state.sourceBuffer)return;
  let a=+$('chopStart').value/1000,b=+$('chopEnd').value/1000;
  if(a>=b){if(document.activeElement===$('chopStart')){a=Math.max(0,b-.01);$('chopStart').value=Math.round(a*1000);}else{b=Math.min(1,a+.01);$('chopEnd').value=Math.round(b*1000);}}
  $('startVal').textContent=(a*state.sourceBuffer.duration).toFixed(2)+' s';$('endVal').textContent=(b*state.sourceBuffer.duration).toFixed(2)+' s';
  $('chopStatus').textContent=((b-a)*state.sourceBuffer.duration).toFixed(2)+' SEC CHOP';
}
function renderChopPads() {
  const root=$('chopPads');root.innerHTML='';
  for(let i=0;i<16;i++){const b=document.createElement('button');b.className='chop-pad'+(i===state.selectedChop?' active':'');b.textContent=state.chops.length?`CHOP ${String(i+1).padStart(2,'0')}`:`SLICE ${String(i+1).padStart(2,'0')}`;b.onclick=()=>{if(!state.chops.length)return;state.selectedChop=i;renderChopPads();playBuffer(state.chops[i]);$('chopHint').textContent=`Chop ${i+1} · ${state.chops[i].duration.toFixed(2)} sec`;};root.appendChild(b);}
}
$('fileInput').onchange=async e=>{
  const file=e.target.files[0];if(!file)return;
  try{
    $('message').textContent='Audio wordt geladen…';
    const ctx=initAudio(), buffer=await ctx.decodeAudioData(await file.arrayBuffer());
    state.sourceBuffer=buffer;state.sourceName=file.name;
    state.pads[state.selectedPad].buffer=buffer;state.pads[state.selectedPad].file=file.name;state.pads[state.selectedPad].name=file.name.replace(/\.[^.]+$/,'').slice(0,18)||'SAMPLE';
    $('sampleName').textContent=file.name;$('sampleHint').textContent=`${buffer.duration.toFixed(2)} sec · ${buffer.sampleRate} Hz · pad ${state.selectedPad+1}`;
    $('sampleCount').textContent=`${state.pads.filter(p=>p.buffer).length} SAMPLES`;
    ['chopStart','chopEnd'].forEach(id=>$(id).disabled=false);
    ['previewChop','assignChop','autoChop','assignNext'].forEach(id=>$(id).disabled=false);
    $('chopStart').value=0;$('chopEnd').value=1000;state.chops=[];updateChopLabels();renderChopPads();drawWave(buffer);drawPads();
    $('chopHint').textContent='Sleep start/einde om een fragment te kiezen, of tik AUTO-CHOP 16.';
    $('message').textContent='Sample geladen. Tik op een pad om te luisteren.';
  }catch(err){$('message').textContent='Bestand niet leesbaar. Probeer een standaard WAV- of MP3-bestand.';}
  e.target.value='';
};
$('chopStart').oninput=updateChopLabels;$('chopEnd').oninput=updateChopLabels;
$('previewChop').onclick=()=>{if(!state.sourceBuffer)return;const a=+$('chopStart').value/1000,b=+$('chopEnd').value/1000;const part=makeSlice(state.sourceBuffer,a,b);playBuffer(part);$('chopHint').textContent=`Preview · ${part.duration.toFixed(2)} sec`};
$('assignChop').onclick=()=>{if(!state.sourceBuffer)return;const a=+$('chopStart').value/1000,b=+$('chopEnd').value/1000;const part=makeSlice(state.sourceBuffer,a,b),i=state.selectedPad;state.pads[i].buffer=part;state.pads[i].file=state.sourceName+' · chop';state.pads[i].name='CUSTOM CHOP';$('sampleHint').textContent=`${part.duration.toFixed(2)} sec · toegewezen aan pad ${i+1}`;$('sampleCount').textContent=`${state.pads.filter(p=>p.buffer).length} SAMPLES`;drawPads();$('chopHint').textContent=`Chop toegewezen aan pad ${i+1}.`};
$('autoChop').onclick=()=>{if(!state.sourceBuffer)return;state.chops=Array.from({length:16},(_,i)=>makeSlice(state.sourceBuffer,i/16,(i+1)/16));state.chops.forEach((buffer,i)=>{state.pads[i].buffer=buffer;state.pads[i].file=`${state.sourceName} · ${String(i+1).padStart(2,'0')}`;state.pads[i].name=`CHOP ${String(i+1).padStart(2,'0')}`;});state.selectedPad=0;state.selectedChop=0;$('selectedLabel').textContent='PAD 01 SELECTED';$('sampleCount').textContent='16 CHOPS LOADED';$('sampleHint').textContent=`${state.sourceBuffer.duration.toFixed(2)} sec · verdeeld in 16 gelijke chops`;drawPads();drawSteps();renderChopPads();$('chopStatus').textContent='16 CHOPS READY';$('chopHint').textContent='Tik een chop of performance pad om het fragment af te spelen.';};

function schedulerTick() {
  if(!state.playing)return;
  const ctx=initAudio(), secondsPerStep=60/(+$('bpm').value)/4;
  while(state.nextStepTime<ctx.currentTime+.1){
    for(let p=0;p<16;p++){if(state.pads[p].steps[state.stepIndex]&&state.pads[p].buffer)playBuffer(state.pads[p].buffer,0,null,state.nextStepTime);}
    const step=state.stepIndex;
    state.timer=setTimeout(()=>{$('meterBar').style.width=((step+1)/16*100)+'%';$('transportHint').textContent=`PATTERN ${state.patternIndex+1} · STEP ${String(step+1).padStart(2,'0')}`;},Math.max(0,(state.nextStepTime-ctx.currentTime)*1000));
    state.stepIndex=(state.stepIndex+1)%16;
    if(state.stepIndex===0){/* loop current pattern */}
    state.nextStepTime+=secondsPerStep;
  }
  state.scheduler=setTimeout(schedulerTick,25);
}
function startPlayback(){initAudio();if(state.playing)return;state.playing=true;state.stepIndex=0;state.nextStepTime=state.audio.currentTime+.04;schedulerTick();$('play').textContent='▶ PLAYING';$('stop').classList.add('primary');}
function stopPlayback(){state.playing=false;clearTimeout(state.scheduler);clearTimeout(state.timer);state.scheduler=null;state.timer=null;$('play').textContent='▶ PLAY';$('stop').classList.remove('primary');$('transportHint').textContent='Ready to make a beat';$('meterBar').style.width='0%';}
$('play').onclick=startPlayback;$('stop').onclick=stopPlayback;
$('clearSteps').onclick=()=>{state.pads[state.selectedPad].steps.fill(false);syncPatternFromPads();drawSteps();};
$('demoBeat').onclick=()=>{state.pads.forEach(p=>p.steps.fill(false));[0,8].forEach(i=>state.pads[0].steps[i]=true);[4,12].forEach(i=>state.pads[1].steps[i]=true);[2,6,10,14].forEach(i=>state.pads[2].steps[i]=true);syncPatternFromPads();state.selectedPad=0;$('selectedLabel').textContent='PAD 01 SELECTED';drawPads();drawSteps();renderPatterns();$('message').textContent='Demo-patroon geladen. Wijs samples toe aan kick, snare en hi-hat en druk PLAY.'};
$('copyPattern').onclick=()=>{syncPatternFromPads();const next=(state.patternIndex+1)%state.patterns.length;state.patterns[next]=state.patterns[state.patternIndex].map(row=>row.slice());loadPattern(next);$('message').textContent=`Pattern gekopieerd naar pattern ${next+1}.`};
$('clearPattern').onclick=()=>{state.pads.forEach(p=>p.steps.fill(false));syncPatternFromPads();drawSteps();$('message').textContent=`Pattern ${state.patternIndex+1} leeggemaakt.`};
$('eqFreq').oninput=()=>{if(state.audio)updateFx();else{const f=+$('eqFreq').value;$('eqFreqText').textContent=f.toLocaleString('nl-NL')+' Hz';}};
$('eqGain').oninput=()=>{if(state.audio)updateFx();$('eqGainText').textContent=(+$('eqGain').value).toLocaleString('nl-NL')+' dB';};
$('reverbSize').oninput=()=>{if(state.audio)updateFx();const v=+$('reverbSize').value;$('reverbSizeText').textContent=v+'%';$('reverbState').textContent=v<34?'SMALL':v<68?'MEDIUM':'LARGE';};
window.addEventListener('resize',()=>{if(state.sourceBuffer)drawWave(state.sourceBuffer);});
drawPads();drawSteps();renderPatterns();

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) { window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{})); }
