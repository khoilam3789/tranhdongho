/* Run: node scripts/test-playback.cjs. No packages or browser required. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, 'patch-playback.py'), 'utf8');
const block = name => {
  const match = source.match(new RegExp(name + " = r'''([\\s\\S]*?)'''"));
  assert.ok(match, 'Missing patch block: ' + name);
  return match[1];
};
const storyCode = block('STORY_FUNCTIONS');
const wrapCode = block('WRAP_FUNCTIONS');
const exportCode = block('EXPORT_FUNCTIONS');
new vm.Script(storyCode + wrapCode + exportCode);

function element(value = '') {
  return {
    value, innerHTML: '', textContent: '', disabled: false, hidden: true,
    inert: false, isConnected: true, style: {}, attributes: {},
    setAttribute(name, value) { this.attributes[name] = value; },
  };
}

function harness() {
  const dom = Object.fromEntries([
    '#playPreviewBtn', '#videoSeek', '#saveVideoBtn', '#videoProgress',
    '#videoMessage', '#videoProgressBar', '#videoProgressText', '#movieCanvas',
    '#storyHeading', '#themeSelect', '#storyText', '#motionStrength', '#undoBtn',
  ].map(selector => [selector, element()]));
  dom['#videoSeek'].value = '5';
  dom['#undoBtn'].disabled = true;
  const controls = Object.entries(dom).filter(([key]) => !/Progress|Message|Canvas/.test(key)).map(([, value]) => value);
  const stage = element();
  const frames = new Map();
  const listeners = new Map();
  const result = {rendered: [], downloads: [], stoppedTracks: 0, refreshed: 0};
  let nextFrame = 0;
  const context = vm.createContext({
    SVG: {}, state: {storyText: ''}, icon: value => value,
    $: selector => dom[selector],
    $$: selector => selector === '.art-stage' ? [stage] : controls,
    movieRunning: false, recorderRunning: false, renderToken: 0, currentView: 'story',
    window: {MediaRecorder: true, donghoAI: {refreshControls: () => result.refreshed++}},
    document: {
      hidden: false, activeElement: null,
      addEventListener(type, callback) { if (!listeners.has(type)) listeners.set(type, new Set()); listeners.get(type).add(callback); },
      removeEventListener(type, callback) { listeners.get(type)?.delete(callback); },
    },
    requestAnimationFrame(callback) { const id = ++nextFrame; frames.set(id, callback); return id; },
    cancelAnimationFrame(id) { frames.delete(id); },
    renderMovie(time) { result.rendered.push(time); dom['#videoSeek'].value = time; },
    logEvent() {}, alertToast() {}, Blob,
    saveBlob(blob, filename) { result.downloads.push({blob, filename}); },
  });
  class Recorder {
    static isTypeSupported() { return true; }
    constructor() { this.state = 'inactive'; result.recorder = this; }
    start() { this.state = 'recording'; }
    stop() {
      if (this.state === 'inactive') throw new Error('Already stopped');
      this.state = 'inactive';
      this.ondataavailable?.({data: new Blob(['video-data'])});
      this.onstop?.();
    }
  }
  context.MediaRecorder = Recorder;
  dom['#movieCanvas'].captureStream = () => ({getTracks: () => [{stop: () => result.stoppedTracks++}]});
  vm.runInContext(storyCode + wrapCode + exportCode, context);
  context.prepareMovieAssets = async () => {};
  return {
    context, dom, controls, stage, frames, result,
    frame(time) {
      const entry = frames.entries().next().value;
      assert.ok(entry, 'Expected an animation frame');
      frames.delete(entry[0]);
      entry[1](time);
    },
    hide() {
      context.document.hidden = true;
      for (const callback of [...(listeners.get('visibilitychange') || [])]) callback();
    },
  };
}

async function run() {
  const test = harness();
  for (let length = 1; length <= 120; length++) {
    const narrative = Array.from({length}, (_, index) => `từ${index}${index % 9 === 8 ? '.' : ''}`).join(' ');
    test.context.state.storyText = narrative;
    const scenes = test.context.storyboard();
    assert.equal(scenes.length, 4);
    assert.equal(scenes.map(scene => scene.text).filter(Boolean).join(' '), narrative, 'Every word must appear exactly once');
    assert.equal(scenes[3].end, 12);
  }
  test.context.state.storyText = '';
  assert.equal(new Set(test.context.storyboard().map(scene => scene.text)).size, 4);
  const measure = {font: '20px Arial', measureText(text) { return {width: text.length * Number(this.font.match(/(\d+)px/)[1]) * .5}; }};
  const wrapped = test.context.wrapLines(measure, 'A'.repeat(120), 50, 3);
  assert.equal(wrapped.truncated, true);
  assert.ok(wrapped.at(-1).endsWith('…'));
  assert.ok(wrapped.every(line => measure.measureText(line).width <= 50));

  await test.context.toggleMoviePreview();
  test.frame(1000);
  test.frame(1500);
  assert.equal(test.result.rendered.at(-1), 5.5);
  await test.context.toggleMoviePreview();
  assert.equal(test.frames.size, 0, 'Pausing must cancel the pending frame');
  assert.match(test.dom['#playPreviewBtn'].innerHTML, /Tiếp tục/);
  await test.context.toggleMoviePreview();
  test.frame(2000);
  test.frame(2500);
  assert.equal(test.result.rendered.at(-1), 6, 'Playback must resume from the paused position');
  test.context.stopMoviePreview();
  let resolveAssets;
  test.context.prepareMovieAssets = () => new Promise(resolve => { resolveAssets = resolve; });
  const preparing = test.context.toggleMoviePreview();
  test.context.stopMoviePreview();
  resolveAssets();
  await preparing;
  assert.equal(test.frames.size, 0, 'A stale preparation must never restart playback');

  const exported = harness();
  await exported.context.toggleMoviePreview();
  await exported.context.exportMovie();
  assert.equal(exported.context.movieRunning, false);
  assert.ok(exported.controls.every(control => control.disabled));
  const frameCount = exported.frames.size;
  await exported.context.toggleMoviePreview();
  assert.equal(exported.frames.size, frameCount, 'Export must reject concurrent preview');
  exported.frame(1000);
  exported.frame(13000);
  assert.equal(exported.result.downloads.length, 1);
  assert.equal(exported.context.recorderRunning, false);
  assert.equal(exported.dom['#storyText'].disabled, false);
  assert.equal(exported.dom['#undoBtn'].disabled, true, 'Restore the original disabled state');
  assert.equal(exported.stage.inert, false);
  assert.equal(exported.result.stoppedTracks, 1);
  assert.equal(exported.result.refreshed, 1);

  const hidden = harness();
  await hidden.context.exportMovie();
  hidden.frame(1000);
  hidden.hide();
  assert.equal(hidden.result.downloads.length, 0, 'Never download a partial background-tab recording');
  assert.equal(hidden.context.recorderRunning, false);
  assert.equal(hidden.frames.size, 0);
  assert.match(hidden.dom['#videoMessage'].textContent, /chuyển sang nền/);

  const failed = harness();
  await failed.context.exportMovie();
  failed.result.recorder.onerror();
  assert.equal(failed.result.downloads.length, 0);
  assert.equal(failed.context.recorderRunning, false);
  assert.equal(failed.dom['#storyText'].disabled, false);
  assert.equal(failed.result.stoppedTracks, 1);

  const captureFailed = harness();
  captureFailed.dom['#movieCanvas'].captureStream = () => { throw new Error('Capture failed'); };
  await captureFailed.context.exportMovie();
  assert.equal(captureFailed.context.recorderRunning, false);
  assert.equal(captureFailed.dom['#storyText'].disabled, false);
  console.log('Playback regressions passed: 120 narrative lengths, text fitting, pause/resume, stale preparation, export overlap, successful export, hidden-tab cancellation, recorder failure, capture failure.');
}
run().catch(error => { console.error(error); process.exitCode = 1; });
