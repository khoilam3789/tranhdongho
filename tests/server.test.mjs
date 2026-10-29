import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { once } from 'node:events';
import { createVideoServer, normalizeModels, buildVideoPrompt } from '../server.mjs';

const KEY = 'sk_test_secret_never_expose';
const CATALOG = [{ name: 'test/video', title: 'Test Video', allowed_durations: [4, 6, 8], paid_only: false, video_capabilities: { aspect_ratios: ['16:9', '9:16'] } }];
const MP4 = Buffer.concat([Buffer.from([0, 0, 0, 24]), Buffer.from('ftypisom'), Buffer.alloc(16)]);
const STORY = { title: 'Chuyện tranh', message: 'Gia đình cùng sẻ chia', narration: 'Cả nhà chăm sóc khu vườn. Mọi người cùng nhau vui chơi.', painting: 'Lợn đàn', model: 'test/video', duration: 6, aspectRatio: '16:9' };
const catalogResponse = () => new Response(JSON.stringify(CATALOG), { headers: { 'Content-Type': 'application/json' } });
const mp4Response = () => new Response(MP4, { headers: { 'Content-Type': 'video/mp4' } });

async function fixture(t, options = {}) {
  const calls = [];
  const server = createVideoServer({ apiKey: KEY, fetchImpl: async (url, init) => {
    calls.push({ url: String(url), init });
    return String(url).includes('/video/models') ? catalogResponse() : mp4Response();
  }, ...options });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => { server.closeAllConnections(); server.close(); });
  return { server, calls, base: `http://127.0.0.1:${server.address().port}` };
}
function generate(base, body = STORY, options = {}) {
  return fetch(`${base}/api/video/generate`, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: base, ...options.headers }, body: JSON.stringify(body), signal: options.signal });
}

test('normalizes authoritative catalog limits without inventing missing metadata', () => {
  assert.deepEqual(normalizeModels([{ name: 'test/a' }])[0], { id: 'test/a', name: 'test/a', durations: [], aspectRatios: [], minDuration: null, maxDuration: null, defaultDuration: null, paidOnly: null });
  assert.deepEqual(normalizeModels([{ name: 'test/a', min_duration: 4, max_duration: 6 }])[0].durations, [4, 5, 6]);
  assert.equal(normalizeModels([{ name: 'community/owner/model', community: true }]).length, 0);
});

test('uses current array capabilities and excludes reference-only tools', () => {
  const models = normalizeModels([
    { name: 'test/text', input_modalities: ['text', 'image'], video_capabilities: ['start_frame', 'end_frame'], min_duration: 5, max_duration: 5, default_duration: 5, paid_only: true },
    { name: 'test/sfx', input_modalities: ['text', 'video'], video_capabilities: ['reference_videos', 'audio_output'], min_duration: 1, max_duration: 120, default_duration: 120 },
    { name: 'test/audio-driven', input_modalities: ['text', 'audio'], video_capabilities: ['reference_audios', 'audio_output'] },
    { name: 'test/image-only', input_modalities: ['image'], video_capabilities: ['start_frame'] },
    { name: 'test/full-video', input_modalities: ['text', 'image', 'video', 'audio'], video_capabilities: ['start_frame', 'end_frame', 'reference_images', 'reference_videos', 'reference_audios'], allowed_durations: [5, 10], default_duration: 5 },
    { name: 'test/unknown' },
  ]);
  assert.deepEqual(models.map(x => x.id), ['test/text', 'test/full-video', 'test/unknown']);
  assert.equal(models[0].defaultDuration, 5);
  assert.equal(models[0].paidOnly, true);
  assert.deepEqual(models[0].durations, [5]);
  assert.equal(models[2].defaultDuration, null);
});

test('config never sends the secret and requests official dynamic models', async t => {
  const { base, calls } = await fixture(t);
  const response = await fetch(`${base}/api/video/config`);
  const body = await response.text();
  assert.equal(response.status, 200);
  assert.equal(body.includes(KEY), false);
  const config = JSON.parse(body);
  assert.equal(config.configured, true);
  assert.equal(config.models[0].paidOnly, false);
  assert.deepEqual(config.models[0].durations, [4, 6, 8]);
  assert.equal(calls[0].url, 'https://gen.pollinations.ai/video/models?source=official');
  assert.equal(calls[0].init.headers.Authorization, undefined);
});

test('passes all story inputs to a single authenticated request and returns valid MP4', async t => {
  const { base, calls } = await fixture(t);
  const response = await generate(base);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('content-type'), 'video/mp4');
  assert.deepEqual(Buffer.from(await response.arrayBuffer()), MP4);
  const generation = calls.filter(x => !x.url.includes('/video/models'));
  assert.equal(generation.length, 1);
  assert.equal(generation[0].init.headers.Authorization, `Bearer ${KEY}`);
  const url = new URL(generation[0].url);
  const prompt = decodeURIComponent(url.pathname.slice('/video/'.length));
  for (const text of [STORY.title, STORY.message, STORY.narration, STORY.painting]) assert.ok(prompt.includes(text));
  assert.equal(url.searchParams.get('duration'), '6');
  assert.equal(url.searchParams.get('aspectRatio'), '16:9');
  assert.equal(url.searchParams.get('audio'), 'false');
  assert.equal(url.searchParams.has('key'), false);
  assert.equal(response.headers.get('access-control-allow-origin'), null);
});

test('uses provider default duration when catalog omits supported values', async t => {
  let upstream;
  const { base } = await fixture(t, { fetchImpl: async (url) => {
    if (String(url).includes('/video/models')) return new Response(JSON.stringify([{ name: 'test/video' }]));
    upstream = new URL(url); return mp4Response();
  } });
  const response = await generate(base, { ...STORY, duration: null });
  assert.equal(response.status, 200);
  await response.arrayBuffer();
  assert.equal(upstream.searchParams.has('duration'), false);
});

test('rejects empty, oversized or unsupported story fields without generating', async t => {
  const { base, calls } = await fixture(t);
  for (const patch of [{ title: '   ' }, { narration: '' }, { narration: 'a'.repeat(1601) }, { title: 'a'.repeat(91) }, { message: '' }, { model: 'fake' }, { duration: 30 }, { aspectRatio: '4:3' }]) {
    const response = await generate(base, { ...STORY, ...patch });
    assert.equal(response.status, 400, JSON.stringify(patch));
    assert.equal((await response.text()).includes(KEY), false);
  }
  assert.equal(calls.filter(x => !x.url.includes('/video/models')).length, 0);
});

test('missing API key is actionable, and source/dotfiles are never served', async t => {
  const { base, calls } = await fixture(t, { apiKey: '' });
  const config = await fetch(`${base}/api/video/config`);
  assert.equal(config.status, 200);
  assert.deepEqual(await config.json(), { configured: false, provider: 'Pollinations', providerId: 'pollinations', keyEnv: 'POLLINATIONS_API_KEY', models: [] });
  assert.equal(calls.length, 0, 'configuration without a key must not wait for the provider');
  const response = await generate(base);
  assert.equal(response.status, 503);
  assert.ok((await response.json()).error.includes('POLLINATIONS_API_KEY'));
  assert.equal(calls.length, 0);
  for (const file of ['/.env', '/server.mjs', '/package.json', '/tests/server.test.mjs']) assert.equal((await fetch(base + file)).status, 404);
});

test('oversized request bodies get a bounded readable rejection', async t => {
  const { base, calls } = await fixture(t);
  const response = await generate(base, { ...STORY, narration: 'a'.repeat(20_000) });
  assert.equal(response.status, 413);
  assert.ok((await response.json()).error.includes('quá dài'));
  assert.equal(calls.length, 0);
});

test('rejects cross-origin and DNS-rebinding hosts', async t => {
  const { base } = await fixture(t);
  const response = await generate(base, STORY, { headers: { Origin: 'https://untrusted.example' } });
  assert.equal(response.status, 403);
  await response.arrayBuffer();
  const port = new URL(base).port;
  const status = await new Promise((resolve, reject) => {
    const req = http.get({ host: '127.0.0.1', port, path: '/api/video/config', headers: { Host: `attacker.example:${port}` } }, res => { res.resume(); resolve(res.statusCode); });
    req.on('error', reject);
  });
  assert.equal(status, 403);
});

test('maps provider errors without exposing details or retrying generation', async t => {
  for (const [upstreamStatus, localStatus] of [[401, 401], [402, 402], [403, 403], [429, 429], [500, 502]]) {
    let generations = 0;
    const { base } = await fixture(t, { fetchImpl: async url => {
      if (String(url).includes('/video/models')) return catalogResponse();
      generations++;
      return new Response(`${KEY} private upstream details`, { status: upstreamStatus });
    } });
    const response = await generate(base);
    assert.equal(response.status, localStatus);
    const text = await response.text();
    assert.equal(text.includes(KEY), false);
    assert.equal(text.includes('private upstream'), false);
    assert.equal(generations, 1);
  }
});

test('rejects successful non-MP4 responses', async t => {
  const { base } = await fixture(t, { fetchImpl: async url => String(url).includes('/video/models') ? catalogResponse() : new Response('<html>error</html>') });
  const response = await generate(base);
  assert.equal(response.status, 502);
  assert.ok((await response.json()).error.includes('MP4'));
});

test('aborts timed-out generation and releases the single-job lock', async t => {
  let aborted = false;
  const { base } = await fixture(t, { generationTimeout: 80, fetchImpl: async (url, init) => {
    if (String(url).includes('/video/models')) return catalogResponse();
    return new Promise((resolve, reject) => init.signal.addEventListener('abort', () => { aborted = true; reject(init.signal.reason); }, { once: true }));
  } });
  const response = await generate(base);
  assert.equal(response.status, 504);
  assert.ok((await response.json()).error.includes('không được tự gửi lại'));
  assert.equal(aborted, true);
  const second = await generate(base);
  assert.equal(second.status, 504);
  await second.arrayBuffer();
});

test('client cancellation aborts upstream and simultaneous jobs are rejected', async t => {
  let started;
  const onStarted = new Promise(resolve => { started = resolve; });
  let abortObserved;
  const onAborted = new Promise(resolve => { abortObserved = resolve; });
  const { base } = await fixture(t, { fetchImpl: async (url, init) => {
    if (String(url).includes('/video/models')) return catalogResponse();
    started();
    return new Promise((resolve, reject) => init.signal.addEventListener('abort', () => { abortObserved(); reject(init.signal.reason); }, { once: true }));
  } });
  const controller = new AbortController();
  const first = generate(base, STORY, { signal: controller.signal }).catch(error => error);
  await onStarted;
  const duplicate = await generate(base);
  assert.equal(duplicate.status, 409);
  await duplicate.arrayBuffer();
  controller.abort();
  await first;
  await onAborted;
});

test('prompt does not lose later narrative sentences', () => {
  const narrative = 'Câu một. Câu hai. Câu ba. Câu bốn. Câu năm. Câu sáu.';
  assert.ok(buildVideoPrompt({ ...STORY, narration: narrative }).includes(narrative));
});
