import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const source = await readFile(new URL('../web/story-ai.js', import.meta.url), 'utf8');
const panel = await readFile(new URL('../web/story-ai-panel.html', import.meta.url), 'utf8');
const preview = await readFile(new URL('../web/story-preview.html', import.meta.url), 'utf8');
const MODELS = [
  { id: 'test/story', name: 'Story Model', durations: [4, 6, 8], aspectRatios: ['16:9', '9:16'], paidOnly: false },
  { id: 'test/portrait', name: 'Portrait Model', durations: [5], aspectRatios: ['9:16'], paidOnly: true }
];
const ALIBABA_MODELS = [
  { id: 'wan2.7-t2v', name: 'Wan 2.7 Text to Video', durations: [5, 10, 15], defaultDuration: 5, aspectRatios: ['16:9', '9:16'], paidOnly: false }
];
const POLLINATIONS_CONFIG = { providerId: 'pollinations', provider: 'Pollinations', keyEnv: 'POLLINATIONS_API_KEY', freeQuotaRequired: false, freeQuotaConfirmed: false };
const ALIBABA_CONFIG = {
  configured: true,
  providerId: 'alibaba',
  provider: 'Alibaba Cloud Model Studio',
  keyEnv: 'DASHSCOPE_API_KEY',
  freeQuotaRequired: true,
  freeQuotaConfirmed: true,
  models: ALIBABA_MODELS
};
const SILICONFLOW_MODELS = [
  { id: 'Wan-AI/Wan2.2-T2V-A14B', name: 'Wan2.2 · SiliconFlow', durations: [5], defaultDuration: 5, aspectRatios: ['16:9', '9:16', '1:1'], paidOnly: true }
];
const SILICONFLOW_CONFIG = {
  configured: true,
  providerId: 'siliconflow',
  provider: 'SiliconFlow',
  keyEnv: 'SILICONFLOW_API_KEY',
  keyValid: true,
  modelAvailable: true,
  balanceCheckAvailable: true,
  creditConfirmationRequired: false,
  creditConfirmed: false,
  canGenerate: true,
  freeQuotaRequired: false,
  freeQuotaConfirmed: false,
  credit: { balance: 0.75, chargeBalance: 0.25, totalBalance: 1 },
  models: SILICONFLOW_MODELS
};
const SILICONFLOW_RETIRED_WALLET_CONFIG = {
  ...SILICONFLOW_CONFIG,
  credit: null,
  balanceCheckAvailable: false,
  creditConfirmationRequired: true,
  creditConfirmed: false,
  canGenerate: false,
  error: 'API key SiliconFlow hợp lệ và model Wan có sẵn; API số dư đã ngừng hoạt động (410). Hãy kiểm tra credit/coupon trên console rồi xác nhận SILICONFLOW_CREDIT_CONFIRMED.'
};
const STORY = { title: 'Chuyện kể từ tranh Đông Hồ', message: 'Tình yêu thương gia đình', narration: 'Cả nhà cùng chăm sóc khu vườn. Mỗi người góp một bàn tay.', painting: 'Lợn đàn' };
const configResponse = (config = { configured: true, models: MODELS }) => new Response(JSON.stringify({ ...POLLINATIONS_CONFIG, ...config }), { headers: { 'Content-Type': 'application/json' } });
const videoResponse = () => new Response(new Blob(['test-mp4-bytes'], { type: 'video/mp4' }), { headers: { 'Content-Type': 'video/mp4' } });
const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};

// Only browser primitives touched by this panel are modeled. Tests exercise the
// actual event handlers and outbound requests; no provider calls leave the test.
class Element {
  constructor() {
    this.value = '';
    this.textContent = '';
    this.disabled = false;
    this.hidden = false;
    this.open = false;
    this.attributes = new Map();
    this.listeners = new Map();
    this.children = [];
    this.dataset = {};
    this.classes = new Set();
    this.classList = {
      toggle: (name, force) => {
        const present = force === undefined ? !this.classes.has(name) : force;
        if (present) this.classes.add(name); else this.classes.delete(name);
        return present;
      },
      remove: name => this.classes.delete(name),
      contains: name => this.classes.has(name)
    };
  }
  addEventListener(type, listener) {
    this.listeners.set(type, [...(this.listeners.get(type) || []), listener]);
  }
  emit(type, event = {}) {
    return Promise.all((this.listeners.get(type) || []).map(listener => listener(event)));
  }
  click() { return this.disabled ? Promise.resolve() : this.emit('click'); }
  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  getAttribute(name) { return this.attributes.get(name) ?? null; }
  replaceChildren(...children) {
    this.children = children;
    this.value = children[0]?.value || '';
  }
  get selectedOptions() { return this.children.filter(option => option.value === this.value); }
  get src() { return this.getAttribute('src'); }
  set src(value) { this.setAttribute('src', value); }
  setCustomValidity(value) { this.validationMessage = value; }
  reportValidity() { return !this.validationMessage; }
  focus() { this.focused = true; }
  pause() { this.paused = true; }
}

function fixture({ configured = true, models = MODELS, config = {}, generate = async () => videoResponse(), narrate = async () => videoResponse(), configure, protocol = 'http:' } = {}) {
  const elements = new Map();
  for (const match of (panel + preview).matchAll(/<[^>]+\bid="([^"]+)"[^>]*>/g)) {
    const element = new Element();
    element.disabled = /\sdisabled(?:\s|>)/.test(match[0]);
    element.hidden = /\shidden(?:\s|>)/.test(match[0]);
    elements.set('#' + match[1], element);
  }
  for (const selector of ['#storyHeading', '#themeSelect', '#storyText', '.painting-card.active strong', '.painting-card.active img', '#playPreviewBtn', '#preview2DPanel', '.ai-generator', '.preview-mode-switch', '.narration-settings']) {
    if (!elements.has(selector)) elements.set(selector, new Element());
  }
  const get = selector => {
    if (!elements.has(selector)) throw new Error('Unexpected DOM selector: ' + selector);
    return elements.get(selector);
  };
  get('#storyHeading').value = STORY.title;
  get('#storyText').value = STORY.narration;
  get('.painting-card.active strong').textContent = STORY.painting;
  get('.painting-card.active img').setAttribute('src', 'data:image/jpeg;base64,' + Buffer.alloc(256, 1).toString('base64'));
  get('#themeSelect').replaceChildren({ value: 'family', textContent: STORY.message });
  get('#preview2DTab').setAttribute('aria-selected', 'true');
  get('#previewAITab').setAttribute('aria-selected', 'false');
  get('#playPreviewBtn').setAttribute('aria-pressed', 'false');

  const calls = [];
  const blobs = [];
  const revoked = [];
  const timers = new Map();
  const window = new Element();
  const document = new Element();
  let recording = false;
  window.donghoPlayback = { isRecording: () => recording };
  document.querySelector = get;
  document.querySelectorAll = selector => selector === '.nav-link' ? [] : [];
  document.createElement = () => ({getContext: () => ({fillRect(){},drawImage(){}}),toDataURL: () => 'data:image/png;base64,reference-frame'});
  let timerID = 0;
  const startTimer = callback => { timers.set(++timerID, callback); return timerID; };
  const context = vm.createContext({
    window, document, location: { protocol }, AbortController, FormData, Blob, Response,
    Image: class {naturalWidth=650;naturalHeight=433;async decode(){}},
    Option: class { constructor(text, value) { this.textContent = text; this.value = value; } },
    URL: {
      createObjectURL(blob) { blobs.push(blob); return `blob:test-${blobs.length}`; },
      revokeObjectURL(url) { revoked.push(url); }
    },
    setTimeout: startTimer, clearTimeout: id => timers.delete(id),
    setInterval: startTimer, clearInterval: id => timers.delete(id),
    fetch: async (url, init = {}) => {
      calls.push({ url, init });
      if (url === '/api/video/config') return configure ? configure(init) : configResponse({ configured, models, ...config });
      if (url === '/api/video/narrate') return narrate(init);
      assert.equal(url, '/api/video/generate');
      return generate(init);
    }
  });
  vm.runInContext(source, context, { filename: 'story-ai.js' });
  return {
    get, calls, blobs, revoked, timers, window,
    connect: () => get('#checkAIConnectionBtn').click(),
    generationCalls: () => calls.filter(call => call.url === '/api/video/generate'),
    setRecording(value) { recording = value; }
  };
}

test('SiliconFlow setup links the .com service and explains credit billing without promising unlimited free video', () => {
  assert.match(panel, /SILICONFLOW_API_KEY/);
  assert.match(panel, /https:\/\/(?:cloud\.)?siliconflow\.com/);
  assert.match(panel, /credit/i);
  assert.match(panel, /dùng thử|thử nghiệm|tặng|khuyến mại|ưu đãi/i);
  assert.match(panel, /không[^<.]{0,120}miễn phí|không[^<.]{0,120}vĩnh viễn|hết[^<.]{0,100}credit/i);
});

test('enabled narration sends the complete story and generated MP4 only to the free mux route', async () => {
  let sent;
  const ui = fixture({narrate: async init => {
    sent = init.body;
    return new Response(new Blob(['mp4-with-audio']), {headers: {'content-type': 'video/mp4', 'x-video-duration': '28.2'}});
  }});
  await ui.connect();
  ui.get('#narrationEnabled').checked = true;
  ui.get('#narrationVoice').value = 'vi-VN-NamMinhNeural';
  await ui.get('#generateAIVideoBtn').click();
  assert.equal(ui.generationCalls().length, 1);
  assert.equal(sent.get('narration'), STORY.narration);
  assert.equal(sent.get('voice'), 'vi-VN-NamMinhNeural');
  assert.equal(await sent.get('video').text(), 'test-mp4-bytes');
  assert.equal(ui.get('#downloadAIVideoBtn').href, 'blob:test-2');
  assert.match(ui.get('#aiResultMeta').textContent, /29 giây sau ghép/);
  assert.equal(ui.get('#aiVideoPlayer').muted, false);
  assert.equal(ui.timers.size, 0);
});

test('free narration failure preserves downloadable video and retries audio without re-generating imagery', async () => {
  let attempts = 0;
  const ui = fixture({narrate: async () => {
    attempts++;
    return attempts === 1 ? new Response(JSON.stringify({error: 'Dịch vụ đọc chưa sẵn sàng'}), {status: 503}) : videoResponse();
  }});
  await ui.connect();
  ui.get('#narrationEnabled').checked = true;
  await ui.get('#generateAIVideoBtn').click();
  assert.equal(ui.get('#downloadAIVideoBtn').href, 'blob:test-1');
  assert.match(ui.get('#aiStatus').textContent, /Video gốc vẫn tải được/);
  assert.equal(ui.get('#addNarrationBtn').disabled, false);
  await ui.get('#addNarrationBtn').click();
  assert.equal(attempts, 2);
  assert.equal(ui.generationCalls().length, 1);
  assert.match(ui.get('#aiStatus').textContent, /đã có giọng đọc tiếng Việt/);
  assert.equal(ui.timers.size, 0);
});

test('an existing MP4 can get narration even with no video provider key', async () => {
  const ui = fixture({configured: false});
  await ui.connect();
  const file = new Blob(['existing-video'], {type: 'video/mp4'});
  file.name = 'existing.mp4';
  ui.get('#narrationVideoFile').files = [file];
  await ui.get('#narrationVideoFile').emit('change');
  assert.equal(ui.get('#generateAIVideoBtn').disabled, true);
  assert.equal(ui.get('#addNarrationBtn').disabled, false);
  await ui.get('#addNarrationBtn').click();
  assert.equal(ui.generationCalls().length, 0);
  assert.equal(ui.calls.filter(call => call.url === '/api/video/narrate').length, 1);
});

test('SiliconFlow provider, disclosure and ready status identify the selected recipient', async () => {
  const ui = fixture({ config: SILICONFLOW_CONFIG });
  await ui.connect();
  assert.match(ui.get('#aiProviderLabel').textContent, /SiliconFlow/);
  assert.match(ui.get('#aiDisclosure').textContent, /SiliconFlow/);
  assert.match(ui.get('#aiDisclosure').textContent, /được gửi đến SiliconFlow/);
  assert.doesNotMatch(ui.get('#aiDisclosure').textContent, /được gửi đến (?:Alibaba|Qwen|Pollinations)/);
  assert.match(ui.get('#aiStatus').textContent, /SiliconFlow/);
  assert.equal(ui.get('#generateAIVideoBtn').disabled, false);
  assert.equal(ui.get('#aiSetupHelp').open, false);
  assert.match(ui.get('#aiCreditSummary').textContent, /1(?:[.,]0+)?/);
  assert.equal(ui.generationCalls().length, 0);
});

test('missing SiliconFlow key keeps generation disabled and shows the correct setup variable', async () => {
  const ui = fixture({ config: { ...SILICONFLOW_CONFIG, configured: false, keyValid: null, canGenerate: false, credit: null } });
  await ui.connect();
  assert.equal(ui.get('#generateAIVideoBtn').disabled, true);
  assert.equal(ui.get('#aiSetupHelp').open, true);
  assert.match(ui.get('#aiStatus').textContent, /SILICONFLOW_API_KEY/);
  assert.doesNotMatch(ui.get('#aiStatus').textContent, /DASHSCOPE_API_KEY|POLLINATIONS_API_KEY/);
  await ui.get('#generateAIVideoBtn').click();
  assert.equal(ui.generationCalls().length, 0);
  assert.equal(ui.timers.size, 0);
});

test('SiliconFlow authentication failure stays disabled despite a configured key and advertised model', async () => {
  const ui = fixture({ config: {
    ...SILICONFLOW_CONFIG,
    keyValid: false,
    canGenerate: false,
    credit: null,
    error: 'SiliconFlow không xác thực được API key. Kiểm tra SILICONFLOW_API_KEY trên siliconflow.com.'
  } });
  await ui.connect();
  assert.equal(ui.get('#generateAIVideoBtn').disabled, true);
  assert.equal(ui.get('#aiSetupHelp').open, true);
  assert.match(ui.get('#aiStatus').textContent, /SiliconFlow|SILICONFLOW_API_KEY/);
  ui.window.donghoAI.refreshControls();
  assert.equal(ui.get('#generateAIVideoBtn').disabled, true);
  await ui.get('#generateAIVideoBtn').click();
  assert.equal(ui.generationCalls().length, 0);
});

test('SiliconFlow must verify the key before generation even when credentials are configured', async () => {
  const ui = fixture({ config: {
    ...SILICONFLOW_CONFIG,
    keyValid: null,
    canGenerate: false,
    credit: null,
    error: 'Không kiểm tra được tài khoản SiliconFlow. Kiểm tra kết nối rồi thử lại.'
  } });
  await ui.connect();
  assert.equal(ui.get('#generateAIVideoBtn').disabled, true);
  assert.match(ui.get('#aiStatus').textContent, /SiliconFlow/);
  ui.window.donghoAI.refreshControls();
  assert.equal(ui.get('#generateAIVideoBtn').disabled, true);
  await ui.get('#generateAIVideoBtn').click();
  assert.equal(ui.generationCalls().length, 0);
});

test('SiliconFlow zero total credit blocks submission and gives a balance explanation', async () => {
  const ui = fixture({ config: {
    ...SILICONFLOW_CONFIG,
    canGenerate: false,
    credit: { balance: 0, chargeBalance: 0, totalBalance: 0 }
  } });
  await ui.connect();
  assert.equal(ui.get('#generateAIVideoBtn').disabled, true);
  assert.match(ui.get('#aiStatus').textContent, /credit|số dư/i);
  await ui.get('#generateAIVideoBtn').click();
  assert.equal(ui.generationCalls().length, 0);
});

test('SiliconFlow retired wallet API keeps a valid key distinct from unverified credit and blocks generation', async () => {
  const ui = fixture({ config: SILICONFLOW_RETIRED_WALLET_CONFIG });
  await ui.connect();
  assert.match(ui.get('#aiConnectionBadge').textContent, /key hợp lệ/i);
  assert.doesNotMatch(ui.get('#aiConnectionBadge').textContent, /không hợp lệ|chưa xác thực/i);
  assert.match(ui.get('#aiCreditSummary').textContent, /chưa|không thể|chưa thể|không đọc|không xác minh/i);
  assert.doesNotMatch(ui.get('#aiCreditSummary').textContent, /(?:tổng|số dư)\s*:?\s*0(?:[.,]0+)?\b/i);
  assert.equal(ui.get('#generateAIVideoBtn').disabled, true);
  assert.equal(ui.get('#aiSetupHelp').open, true);
  assert.match(ui.get('#aiStatus').textContent, /credit|coupon/i);
  assert.match(ui.get('#aiStatus').textContent, /xác nhận|xác minh|kiểm tra/i);
  assert.match(panel, /https:\/\/cloud\.siliconflow\.com/);
  ui.window.donghoAI.refreshControls();
  await ui.get('#generateAIVideoBtn').click();
  assert.equal(ui.get('#generateAIVideoBtn').disabled, true);
  assert.equal(ui.generationCalls().length, 0);
  assert.equal(ui.timers.size, 0);
});

test('SiliconFlow manual credit confirmation enables the retired-wallet fallback without pretending the API verified funds', async () => {
  const ui = fixture({ config: {
    ...SILICONFLOW_RETIRED_WALLET_CONFIG,
    creditConfirmed: true,
    canGenerate: true,
    error: undefined
  } });
  await ui.connect();
  assert.match(ui.get('#aiConnectionBadge').textContent, /key hợp lệ/i);
  assert.equal(ui.get('#generateAIVideoBtn').disabled, false);
  const explanation = ['#aiStatus', '#aiCreditSummary', '#aiDisclosure'].map(selector => ui.get(selector).textContent).join(' ');
  assert.match(explanation, /(?:thủ công|người dùng|đã xác nhận|tự xác nhận|xác nhận trên|xác nhận từ|dashboard|console)/i);
  assert.match(explanation, /(?:chưa|không|ngừng|dừng|410|retired)[^.]{0,120}(?:API|số dư|credit)|API[^.]{0,120}(?:chưa|không|ngừng|dừng|410)/i);
  assert.equal(ui.generationCalls().length, 0, 'Connecting must never start a paid generation');
  assert.deepEqual(ui.calls.map(call => call.url), ['/api/video/config']);
  await ui.get('#generateAIVideoBtn').click();
  assert.equal(ui.generationCalls().length, 1);
  assert.equal(ui.blobs.length, 1);
});

test('SiliconFlow manual credit confirmation cannot override a real zero balance', async () => {
  const ui = fixture({ config: {
    ...SILICONFLOW_CONFIG,
    creditConfirmed: true,
    canGenerate: false,
    credit: { balance: 0, chargeBalance: 0, totalBalance: 0 }
  } });
  await ui.connect();
  assert.equal(ui.get('#generateAIVideoBtn').disabled, true);
  await ui.get('#generateAIVideoBtn').click();
  assert.equal(ui.generationCalls().length, 0);
});

test('SiliconFlow manual credit confirmation cannot override a failed key or model check', async () => {
  const ui = fixture({ config: {
    ...SILICONFLOW_RETIRED_WALLET_CONFIG,
    keyValid: null,
    modelAvailable: null,
    creditConfirmed: true,
    canGenerate: false,
    error: 'Không kiểm tra được key và model SiliconFlow. Hãy thử kiểm tra kết nối lại.'
  } });
  await ui.connect();
  assert.equal(ui.get('#generateAIVideoBtn').disabled, true);
  await ui.get('#generateAIVideoBtn').click();
  assert.equal(ui.generationCalls().length, 0);
});

test('SiliconFlow honors a server generation gate even after a valid positive-balance check', async () => {
  const ui = fixture({ config: { ...SILICONFLOW_CONFIG, canGenerate: false } });
  await ui.connect();
  assert.equal(ui.get('#generateAIVideoBtn').disabled, true);
  ui.window.donghoAI.refreshControls();
  assert.equal(ui.get('#generateAIVideoBtn').disabled, true);
  await ui.get('#generateAIVideoBtn').click();
  assert.equal(ui.generationCalls().length, 0);
});

test('SiliconFlow submits all three story fields once and makes its MP4 downloadable', async () => {
  const ui = fixture({ config: SILICONFLOW_CONFIG });
  await ui.connect();
  assert.equal(ui.generationCalls().length, 0);
  await ui.get('#generateAIVideoBtn').click();
  assert.equal(ui.generationCalls().length, 1);
  const request = ui.generationCalls()[0].init;
  assert.equal(request.method, 'POST');
  assert.deepEqual(JSON.parse(request.body), { ...STORY, model: SILICONFLOW_MODELS[0].id, duration: 5, aspectRatio: '16:9' });
  assert.equal(ui.blobs[0].type, 'video/mp4');
  assert.equal(ui.get('#aiVideoPlayer').src, 'blob:test-1');
  assert.match(ui.get('#downloadAIVideoBtn').download, /-ai\.mp4$/);
});

for (const status of [402, 403]) {
  test(`SiliconFlow ${status} balance or quota rejection never falls back to Alibaba or Qwen`, async () => {
    const ui = fixture({
      config: SILICONFLOW_CONFIG,
      generate: async () => new Response(JSON.stringify({ error: 'SiliconFlow: số dư credit hoặc quota không đủ. Kiểm tra tài khoản trước khi tạo lại.' }), { status })
    });
    await ui.connect();
    await ui.get('#generateAIVideoBtn').click();
    assert.equal(ui.generationCalls().length, 1);
    assert.match(ui.get('#aiStatus').textContent, /SiliconFlow.*(?:credit|quota)/);
    assert.equal(ui.get('#aiStatus').classList.contains('error'), true);
    assert.equal(ui.get('#aiModel').value, SILICONFLOW_MODELS[0].id);
    assert.equal(ui.get('#aiResult').hidden, true);
    assert.equal(ui.blobs.length, 0);
    assert.equal(ui.timers.size, 0);
    assert.deepEqual(ui.calls.map(call => call.url), ['/api/video/config', '/api/video/generate']);
    assert.equal(JSON.parse(ui.generationCalls()[0].init.body).model, SILICONFLOW_MODELS[0].id);
  });
}

test('Alibaba setup explains the free-quota-only requirement for both translation and video models', () => {
  assert.match(panel, /Qwen/i);
  assert.match(panel, /Wan/i);
  assert.match(panel, /Free\s*quota\s*only/i);
  assert.match(panel, /DASHSCOPE_API_KEY/);
});

test('Alibaba provider is named in the panel, disclosure and ready status', async () => {
  const ui = fixture({ config: ALIBABA_CONFIG });
  await ui.connect();
  assert.match(ui.get('#aiProviderLabel').textContent, /Alibaba Cloud Model Studio/);
  assert.match(ui.get('#aiDisclosure').textContent, /Alibaba/);
  assert.doesNotMatch(ui.get('#aiDisclosure').textContent, /Pollinations/);
  assert.match(ui.get('#aiStatus').textContent, /Alibaba/);
  assert.equal(ui.get('#generateAIVideoBtn').disabled, false);
  assert.equal(ui.generationCalls().length, 0);
});

test('missing Alibaba key shows DASHSCOPE setup and cannot generate even with a static model list', async () => {
  const ui = fixture({ config: { ...ALIBABA_CONFIG, configured: false } });
  await ui.connect();
  assert.equal(ui.get('#generateAIVideoBtn').disabled, true);
  assert.equal(ui.get('#aiSetupHelp').open, true);
  assert.match(ui.get('#aiStatus').textContent, /DASHSCOPE_API_KEY/);
  assert.doesNotMatch(ui.get('#aiStatus').textContent, /POLLINATIONS_API_KEY/);
  assert.match(ui.get('#aiConnectionBadge').textContent, /Chưa cấu hình key/);
  await ui.get('#generateAIVideoBtn').click();
  assert.equal(ui.generationCalls().length, 0);
  assert.equal(ui.timers.size, 0);
});

test('Alibaba waits for free-quota confirmation before enabling generation', async () => {
  const ui = fixture({ config: { ...ALIBABA_CONFIG, freeQuotaConfirmed: false } });
  await ui.connect();
  assert.equal(ui.get('#generateAIVideoBtn').disabled, true);
  assert.equal(ui.get('#aiSetupHelp').open, true);
  assert.match(ui.get('#aiStatus').textContent, /Free\s*quota\s*only|quota|miễn phí/i);
  ui.window.donghoAI.refreshControls();
  assert.equal(ui.get('#generateAIVideoBtn').disabled, true, 'Refreshing controls must preserve the quota confirmation gate');
  await ui.get('#generateAIVideoBtn').click();
  assert.equal(ui.generationCalls().length, 0);
  assert.equal(ui.timers.size, 0);
});

test('ready Alibaba offers Wan 2.7 at five seconds by default without starting a generation', async () => {
  const ui = fixture({ config: ALIBABA_CONFIG });
  await ui.connect();
  assert.deepEqual(ui.get('#aiModel').children.map(option => option.value), ['wan2.7-t2v']);
  assert.deepEqual(ui.get('#aiDuration').children.map(option => option.value), ['5', '10', '15']);
  assert.equal(ui.get('#aiDuration').value, '5');
  assert.deepEqual(ui.get('#aiAspectRatio').children.map(option => option.value), ['16:9', '9:16']);
  assert.equal(ui.get('#generateAIVideoBtn').disabled, false);
  assert.equal(ui.get('#aiSetupHelp').open, false);
  assert.equal(ui.generationCalls().length, 0);
  assert.deepEqual(ui.calls.map(call => call.url), ['/api/video/config']);
});

test('Alibaba sends the whole story and never falls back after a free-quota rejection', async () => {
  const ui = fixture({
    config: ALIBABA_CONFIG,
    generate: async () => new Response(JSON.stringify({ error: 'Free quota only: quota miễn phí đã hết. Không tự chuyển sang trả phí.' }), { status: 403 })
  });
  await ui.connect();
  await ui.get('#generateAIVideoBtn').click();
  assert.equal(ui.generationCalls().length, 1);
  const request = ui.generationCalls()[0].init;
  assert.equal(request.method, 'POST');
  assert.deepEqual(JSON.parse(request.body), { ...STORY, model: 'wan2.7-t2v', duration: 5, aspectRatio: '16:9' });
  assert.match(ui.get('#aiStatus').textContent, /quota miễn phí đã hết/);
  assert.equal(ui.get('#aiStatus').classList.contains('error'), true);
  assert.equal(ui.get('#aiModel').value, 'wan2.7-t2v');
  assert.equal(ui.get('#aiResult').hidden, true);
  assert.equal(ui.blobs.length, 0);
  assert.equal(ui.timers.size, 0);
  assert.deepEqual(ui.calls.map(call => call.url), ['/api/video/config', '/api/video/generate']);
});

test('missing key leaves generation disabled and opens actionable setup help', async () => {
  const ui = fixture({ configured: false, models: [] });
  await ui.connect();
  assert.equal(ui.get('#generateAIVideoBtn').disabled, true);
  assert.equal(ui.get('#aiSetupHelp').open, true);
  assert.match(ui.get('#aiStatus').textContent, /POLLINATIONS_API_KEY/);
  assert.match(ui.get('#aiConnectionBadge').textContent, /Chưa cấu hình key/);
  await ui.get('#generateAIVideoBtn').click();
  assert.equal(ui.generationCalls().length, 0);
  assert.equal(ui.timers.size, 0);
});

test('direct file mode explains localhost setup without issuing API requests', async () => {
  const ui = fixture({ protocol: 'file:' });
  await ui.connect();
  assert.equal(ui.calls.length, 0);
  assert.equal(ui.get('#generateAIVideoBtn').disabled, true);
  assert.equal(ui.get('#aiSetupHelp').open, true);
  assert.match(ui.get('#aiStatus').textContent, /npm start/);
});

test('dynamic model selection offers only its advertised durations and aspect ratios', async () => {
  const ui = fixture();
  await ui.connect();
  assert.deepEqual(ui.get('#aiModel').children.map(option => option.value), ['test/story', 'test/portrait']);
  assert.deepEqual(ui.get('#aiDuration').children.map(option => option.value), ['4', '6', '8']);
  assert.deepEqual(ui.get('#aiAspectRatio').children.map(option => option.value), ['16:9', '9:16']);
  assert.equal(ui.get('#generateAIVideoBtn').disabled, false);
  ui.get('#aiModel').value = 'test/portrait';
  await ui.get('#aiModel').emit('change');
  assert.deepEqual(ui.get('#aiDuration').children.map(option => option.value), ['5']);
  assert.deepEqual(ui.get('#aiAspectRatio').children.map(option => option.value), ['9:16']);
  assert.match(ui.get('#aiModelNote').textContent, /credit đã mua/);
});

test('generation sends the whole story once, suppresses duplicate clicks and makes MP4 downloadable', async () => {
  const pending = deferred();
  const ui = fixture({ generate: () => pending.promise });
  await ui.connect();
  ui.get('#aiDuration').value = '6';
  const generation = ui.get('#generateAIVideoBtn').click();
  await ui.get('#generateAIVideoBtn').click();
  assert.equal(ui.generationCalls().length, 1);
  const request = ui.generationCalls()[0].init;
  assert.equal(request.method, 'POST');
  assert.deepEqual(JSON.parse(request.body), { ...STORY, model: 'test/story', duration: 6, aspectRatio: '16:9' });
  assert.equal(ui.get('#preview2DTab').disabled, true);
  assert.equal(ui.get('#cancelAIVideoBtn').hidden, false);
  pending.resolve(videoResponse());
  await generation;
  assert.equal(ui.blobs[0].type, 'video/mp4');
  assert.equal(await ui.blobs[0].text(), 'test-mp4-bytes');
  assert.equal(ui.get('#aiVideoPlayer').src, 'blob:test-1');
  assert.equal(ui.get('#downloadAIVideoBtn').href, 'blob:test-1');
  assert.match(ui.get('#downloadAIVideoBtn').download, /-ai\.mp4$/);
  assert.equal(ui.get('#aiResult').hidden, false);
  assert.equal(ui.get('#aiStaleNotice').hidden, true);
  ui.get('#storyText').value += ' Một chi tiết mới.';
  ui.window.donghoAI.updateStory();
  assert.equal(ui.get('#aiStaleNotice').hidden, false);
  assert.equal(ui.get('#aiVideoPlayer').src, 'blob:test-1', 'editing retains the existing downloadable video');
  assert.equal(ui.get('#generateAIVideoBtn').disabled, false);
  assert.equal(ui.timers.size, 0);
});

test('stopping a wait warns about provider credit charges and never retries', async () => {
  const ui = fixture({ generate: init => new Promise((resolve, reject) => {
    init.signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true });
  }) });
  await ui.connect();
  const generation = ui.get('#generateAIVideoBtn').click();
  await ui.get('#cancelAIVideoBtn').click();
  await generation;
  assert.equal(ui.generationCalls().length, 1);
  assert.match(ui.get('#aiStatus').textContent, /có thể vẫn xử lý và tính credit/);
  assert.match(ui.get('#aiStatus').textContent, /Kiểm tra tài khoản trước khi tạo lại/);
  assert.equal(ui.get('#cancelAIVideoBtn').hidden, true);
  assert.equal(ui.get('#aiResult').hidden, true);
  assert.equal(ui.get('#generateAIVideoBtn').disabled, false);
  assert.equal(ui.timers.size, 0);
});

test('provider errors are actionable and are not automatically retried', async () => {
  const ui = fixture({ generate: async () => new Response(JSON.stringify({ error: 'Không đủ credit. Kiểm tra số dư.' }), { status: 402 }) });
  await ui.connect();
  await ui.get('#generateAIVideoBtn').click();
  assert.equal(ui.generationCalls().length, 1);
  assert.match(ui.get('#aiStatus').textContent, /Không đủ credit/);
  assert.equal(ui.blobs.length, 0);
  assert.equal(ui.get('#generateAIVideoBtn').disabled, false);
});

test('empty story fields prevent generation and focus the missing input', async () => {
  const ui = fixture();
  await ui.connect();
  ui.get('#storyHeading').value = '  ';
  await ui.get('#generateAIVideoBtn').click();
  assert.equal(ui.generationCalls().length, 0);
  assert.equal(ui.get('#storyHeading').focused, true);
  assert.match(ui.get('#storyHeading').validationMessage, /điền nội dung/);
});

test('a connection response cannot re-enable controls locked by a 2D recording', async () => {
  const pending = deferred();
  const ui = fixture({ configure: () => pending.promise });
  const connection = ui.connect();
  ui.setRecording(true);
  // The 2D recorder owns this lock. An in-flight API check must preserve it.
  for (const id of ['#generateAIVideoBtn', '#checkAIConnectionBtn', '#aiModel', '#aiDuration', '#aiAspectRatio']) ui.get(id).disabled = true;
  pending.resolve(configResponse());
  await connection;
  ui.window.donghoAI.refreshControls();
  for (const id of ['#generateAIVideoBtn', '#checkAIConnectionBtn', '#aiModel', '#aiDuration', '#aiAspectRatio']) assert.equal(ui.get(id).disabled, true, id);
  ui.setRecording(false);
  ui.window.donghoAI.refreshControls();
  assert.equal(ui.get('#generateAIVideoBtn').disabled, false);
});

test('BytePlus key validation alone cannot unlock generation', async () => {
  const ui = fixture({config: {providerId:'byteplus', provider:'BytePlus ModelArk', keyEnv:'BYTEPLUS_API_KEY', configured:true, keyValid:true, canGenerate:false, freeQuotaRequired:true, freeQuotaConfirmed:false, models:[{id:'seedance-1-0-pro-fast-251015',name:'Seedance 1.0 Pro Fast',durations:[5,10],aspectRatios:['16:9'],defaultDuration:5}]}});
  await ui.connect();
  assert.equal(ui.get('#generateAIVideoBtn').disabled, true);
  assert.match(ui.get('#aiProviderLabel').textContent, /BytePlus/);
  assert.match(ui.get('#aiDisclosure').textContent, /BytePlus/);
  assert.equal(ui.get('#byteplusSetupSteps').hidden, false);
  assert.equal(ui.get('#siliconflowSetupSteps').hidden, true);
  await ui.get('#generateAIVideoBtn').click();
  assert.equal(ui.generationCalls().length, 0);
});
test('BytePlus ready UI sends only the selected video model and story after a user click', async () => {
  const ui = fixture({config: {providerId:'byteplus', provider:'BytePlus ModelArk', keyEnv:'BYTEPLUS_API_KEY', configured:true, keyValid:true, canGenerate:true, freeQuotaRequired:true, freeQuotaConfirmed:true, models:[{id:'seedance-1-0-pro-fast-251015',name:'Seedance 1.0 Pro Fast',durations:[5,10],aspectRatios:['16:9'],defaultDuration:5}]}});
  await ui.connect();
  assert.equal(ui.get('#generateAIVideoBtn').disabled, false);
  assert.equal(ui.generationCalls().length, 0);
  await ui.get('#generateAIVideoBtn').click();
  const payload=JSON.parse(ui.generationCalls()[0].init.body);
  assert.equal(payload.model,'seedance-1-0-pro-fast-251015');
  assert.equal(payload.narration,STORY.narration);
  assert.equal(ui.generationCalls().length,1);
});


test('BytePlus offers 30 seconds with three jobs disclosed and sends the original artwork first frame', async () => {
  const ui=fixture({config:{providerId:'byteplus',configured:true,keyValid:true,canGenerate:true,freeQuotaRequired:true,freeQuotaConfirmed:true,models:[{id:'seedance-1-0-pro-fast-251015',name:'Seedance',durations:[5,10,15,20,25,30],nativeMaxDuration:12,segmentDuration:10,defaultDuration:5,aspectRatios:['16:9']}]}});
  await ui.connect();
  const option=ui.get('#aiDuration').children.find(item=>item.value==='30');
  assert.match(option.textContent,/ghép 3 đoạn/);
  ui.get('#aiDuration').value='30';
  await ui.get('#aiDuration').emit('change');
  assert.match(ui.get('#aiModelNote').textContent,/3 lượt tạo AI/);
  await ui.get('#generateAIVideoBtn').click();
  const payload=JSON.parse(ui.generationCalls()[0].init.body);
  assert.equal(payload.duration,30);
  assert.equal(payload.preserveArtwork,true);
  assert.equal(payload.referenceImage,'data:image/png;base64,reference-frame');
  assert.equal(ui.generationCalls()[0].init.headers['X-Video-Reference'],'first-frame');
});

test('BytePlus never falls back to text-only generation if the artwork image is missing', async () => {
 const ui=fixture({config:{providerId:'byteplus',configured:true,keyValid:true,canGenerate:true,models:[{id:'seedance-1-0-pro-fast-251015',durations:[5,10],aspectRatios:['16:9']}]}});
 await ui.connect();
 ui.get('.painting-card.active img').setAttribute('src','');
 await ui.get('#generateAIVideoBtn').click();
 assert.equal(ui.generationCalls().length,0);
 assert.match(ui.get('#aiStatus').textContent,/Chưa lấy được tranh gốc/);
});
