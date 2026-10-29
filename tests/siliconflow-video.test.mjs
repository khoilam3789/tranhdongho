import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createVideoServer } from '../server.mjs';
import { isPublicAddress, validateSiliconFlowResultURL } from '../siliconflow-video.mjs';

const KEY = 'sk_siliconflow_test_secret';
const BASE = 'https://api.siliconflow.com';
const RESULT = 'https://video-cdn.example.com/test.mp4?signature=mock';
const MP4 = Buffer.concat([Buffer.from([0, 0, 0, 24]), Buffer.from('ftypisom'), Buffer.alloc(16)]);
const STORY = { title: 'Câu chuyện tranh', message: 'Yêu thương gia đình', narration: 'Gia đình cùng nhau chăm sóc khu vườn. Cuối ngày cả nhà quây quần.', painting: 'Lợn đàn', model: 'Wan-AI/Wan2.2-T2V-A14B', duration: 5, aspectRatio: '16:9' };
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const info = (balance = '1.00') => json({ code: 20000, status: true, message: 'OK', data: { id: 'private-id', name: 'Private Name', email: 'private@example.com', balance, chargeBalance: '0.00', totalBalance: balance, status: 'normal' } });

async function fixture(t, options = {}) {
  const calls = [];
  const downloads = [];
  const server = createVideoServer({
    provider: 'siliconflow', siliconflowApiKey: KEY, pollIntervalMs: 1,
    fetchImpl: async (url, init) => {
      calls.push({ url: String(url), init });
      if (String(url).endsWith('/user/info')) return info();
      if (String(url).endsWith('/video/submit')) return json({ requestId: 'request-123' });
      return json({ status: 'Succeed', results: { videos: [{ url: RESULT }] } });
    },
    downloadImpl: async (url, options) => { downloads.push({ url: String(url), options }); return new Response(MP4); },
    ...options,
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => { server.closeAllConnections(); server.close(); });
  return { server, calls, downloads, base: `http://127.0.0.1:${server.address().port}` };
}
function generate(base, story = STORY, options = {}) {
  return fetch(`${base}/api/video/generate`, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: base }, body: JSON.stringify(story), ...options });
}

test('SiliconFlow config validates key using a read-only request and exposes balance only', async t => {
  const { base, calls } = await fixture(t);
  const response = await fetch(`${base}/api/video/config`);
  const text = await response.text();
  for (const secret of [KEY, 'private-id', 'Private Name', 'private@example.com']) assert.equal(text.includes(secret), false);
  const config = JSON.parse(text);
  assert.equal(config.providerId, 'siliconflow');
  assert.equal(config.provider, 'SiliconFlow');
  assert.equal(config.keyEnv, 'SILICONFLOW_API_KEY');
  assert.equal(config.keyValid, true);
  assert.equal(config.canGenerate, true);
  assert.equal(config.freeQuotaRequired, false);
  assert.deepEqual(config.credit, { balance: 1, chargeBalance: 0, totalBalance: 1 });
  assert.equal(config.models[0].id, STORY.model);
  assert.deepEqual(config.models[0].durations, [5]);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, `${BASE}/v1/user/info`);
  assert.equal(calls[0].init.method, 'GET');
});

test('missing SiliconFlow key is immediate and does not contact provider', async t => {
  const { base, calls } = await fixture(t, { siliconflowApiKey: '' });
  const config = await (await fetch(`${base}/api/video/config`)).json();
  assert.equal(config.configured, false);
  assert.equal(config.canGenerate, false);
  assert.equal(config.keyValid, null);
  const response = await generate(base);
  assert.equal(response.status, 503);
  assert.ok((await response.json()).error.includes('SILICONFLOW_API_KEY'));
  assert.equal(calls.length, 0);
});

test('rejected international key keeps config disabled and blocks submission', async t => {
  let requests = 0;
  const { base } = await fixture(t, { fetchImpl: async () => { requests++; return new Response(`Invalid token ${KEY}`, { status: 401 }); } });
  const configResponse = await fetch(`${base}/api/video/config`);
  const text = await configResponse.text();
  const config = JSON.parse(text);
  assert.equal(config.configured, true);
  assert.equal(config.keyValid, false);
  assert.equal(config.canGenerate, false);
  assert.equal(text.includes(KEY), false);
  const response = await generate(base);
  assert.equal(response.status, 401);
  assert.equal((await response.text()).includes(KEY), false);
  assert.equal(requests, 2);
});

test('permission failures disable generation without labeling the key invalid', async t => {
  const { base } = await fixture(t, { fetchImpl: async () => json({ message: `permission denied ${KEY}` }, 403) });
  const config = await (await fetch(`${base}/api/video/config`)).json();
  assert.equal(config.configured, true);
  assert.equal(config.keyValid, null);
  assert.equal(config.canGenerate, false);
  assert.ok(config.error.includes('quyền'));
  assert.equal(config.error.includes(KEY), false);
  const response = await generate(base);
  assert.equal(response.status, 403);
  assert.ok((await response.json()).error.includes('quyền'));
});

test('deprecated wallet validates key through models but requires manual coupon confirmation', async t => {
  const calls = [];
  const { base } = await fixture(t, { fetchImpl: async (url, init) => {
    calls.push({ url: String(url), init });
    if (String(url).endsWith('/user/info')) return json({ code: 20092, message: `deprecated ${KEY}` }, 410);
    return json({ object: 'list', data: [{ id: STORY.model }] });
  } });
  const response = await fetch(`${base}/api/video/config`);
  const text = await response.text();
  const config = JSON.parse(text);
  assert.equal(config.keyValid, true);
  assert.equal(config.modelAvailable, true);
  assert.equal(config.credit, null);
  assert.equal(config.balanceCheckAvailable, false);
  assert.equal(config.creditConfirmed, false);
  assert.equal(config.creditConfirmationRequired, true);
  assert.equal(config.canGenerate, false);
  assert.ok(config.error.includes('coupon'));
  assert.equal(text.includes(KEY), false);
  assert.equal(calls[1].url, `${BASE}/v1/models?sub_type=text-to-video`);
  assert.equal(calls[1].init.method, 'GET');
  const generated = await generate(base);
  assert.equal(generated.status, 503);
  assert.ok((await generated.json()).error.includes('SILICONFLOW_CREDIT_CONFIRMED'));
  assert.equal(calls.length, 4);
  assert.equal(calls.some(x => x.url.endsWith('/submit')), false);
});

test('confirmed coupon allows one submission only after deprecated wallet and model validation', async t => {
  const calls = [];
  const { base } = await fixture(t, { siliconflowCreditConfirmed: true, fetchImpl: async (url, init) => {
    calls.push({ url: String(url), init });
    if (String(url).endsWith('/user/info')) return json({ code: 20092 }, 410);
    if (String(url).includes('/models?')) return json({ object: 'list', data: [{ id: STORY.model }] });
    if (String(url).endsWith('/submit')) return json({ requestId: 'confirmed-r' });
    return json({ status: 'Succeed', results: { videos: [{ url: RESULT }] } });
  } });
  const config = await (await fetch(`${base}/api/video/config`)).json();
  assert.equal(config.keyValid, true);
  assert.equal(config.credit, null);
  assert.equal(config.creditConfirmed, true);
  assert.equal(config.canGenerate, true);
  const response = await generate(base);
  assert.equal(response.status, 200);
  await response.arrayBuffer();
  assert.equal(calls.filter(x => x.url.endsWith('/submit')).length, 1);
  assert.equal(calls.filter(x => x.url.includes('/models?')).length, 2, 'model access must be refreshed before submission');
});

test('manual coupon confirmation cannot override a real zero balance or a wallet network failure', async t => {
  for (const kind of ['zero', 'network']) {
    let calls = 0;
    const { base } = await fixture(t, { siliconflowCreditConfirmed: true, fetchImpl: async () => {
      calls++;
      if (kind === 'network') throw new Error(`network details ${KEY}`);
      return info('0');
    } });
    const config = await (await fetch(`${base}/api/video/config`)).json();
    assert.equal(config.canGenerate, false);
    const response = await generate(base);
    assert.equal(response.status, kind === 'zero' ? 402 : 502);
    assert.equal((await response.text()).includes(KEY), false);
    assert.equal(calls, 2);
  }
});

test('deprecated wallet fallback keeps missing model access and bad keys blocked', async t => {
  for (const kind of ['missing-model', 'bad-key', 'permission']) {
    const { base } = await fixture(t, { siliconflowCreditConfirmed: true, fetchImpl: async url => {
      if (String(url).endsWith('/user/info')) return json({ code: 20092 }, 410);
      if (kind === 'bad-key') return new Response('Invalid token', { status: 401 });
      if (kind === 'permission') return json({ message: 'Permission denied' }, 403);
      return json({ object: 'list', data: [] });
    } });
    const config = await (await fetch(`${base}/api/video/config`)).json();
    assert.equal(config.canGenerate, false);
    assert.equal(config.keyValid, kind === 'bad-key' ? false : kind === 'permission' ? null : true);
    if (kind === 'missing-model') assert.equal(config.modelAvailable, false);
    const response = await generate(base);
    assert.equal(response.status, kind === 'bad-key' ? 401 : 403);
    await response.arrayBuffer();
  }
});

test('known zero or unknown balance never starts a charged submission', async t => {
  for (const balance of ['0', null, 'not-a-number']) {
    let calls = 0;
    const { base } = await fixture(t, { fetchImpl: async () => { calls++; return info(balance); } });
    const config = await (await fetch(`${base}/api/video/config`)).json();
    assert.equal(config.canGenerate, false);
    const response = await generate(base);
    assert.equal(response.status, 402);
    await response.arrayBuffer();
    assert.equal(calls, 2);
  }
});

test('submits complete story once without paid translation, duration, or fps fields', async t => {
  const { base, calls, downloads } = await fixture(t);
  const response = await generate(base);
  assert.equal(response.status, 200);
  assert.deepEqual(Buffer.from(await response.arrayBuffer()), MP4);
  assert.deepEqual(calls.map(x => x.url), [`${BASE}/v1/user/info`, `${BASE}/v1/video/submit`, `${BASE}/v1/video/status`]);
  const submission = calls[1];
  const body = JSON.parse(submission.init.body);
  assert.deepEqual(Object.keys(body).sort(), ['image_size', 'model', 'prompt']);
  assert.equal(body.image_size, '1280x720');
  assert.equal(body.model, STORY.model);
  for (const value of [STORY.title, STORY.message, STORY.narration, STORY.painting]) assert.ok(body.prompt.includes(value));
  assert.deepEqual(JSON.parse(calls[2].init.body), { requestId: 'request-123' });
  for (const call of calls) assert.equal(call.init.headers.Authorization, `Bearer ${KEY}`);
  assert.equal(downloads.length, 1);
  assert.equal(downloads[0].url, RESULT);
  assert.equal(downloads[0].options.headers, undefined);
});

test('polls documented queue states and downloads immediately after Succeed', async t => {
  let poll = 0;
  const { base } = await fixture(t, { fetchImpl: async url => {
    if (String(url).endsWith('/user/info')) return info();
    if (String(url).endsWith('/submit')) return json({ requestId: 'r' });
    poll++;
    return json(poll < 3 ? { status: poll === 1 ? 'InQueue' : 'InProgress' } : { status: 'Succeed', results: { videos: [{ url: RESULT }] } });
  } });
  const response = await generate(base);
  assert.equal(response.status, 200);
  await response.arrayBuffer();
  assert.equal(poll, 3);
});

test('Failed status never leaks provider reason or resubmits generation', async t => {
  const requests = [];
  const { base, downloads } = await fixture(t, { fetchImpl: async url => {
    requests.push(String(url));
    if (String(url).endsWith('/user/info')) return info();
    if (String(url).endsWith('/submit')) return json({ requestId: 'r' });
    return json({ status: 'Failed', reason: `private text ${KEY}` });
  } });
  const response = await generate(base);
  assert.equal(response.status, 502);
  assert.equal((await response.text()).includes(KEY), false);
  assert.equal(requests.filter(x => x.endsWith('/submit')).length, 1);
  assert.equal(downloads.length, 0);
});

test('status cancellation stops polling without cancel/recreate requests', async t => {
  let submitted;
  const onSubmitted = new Promise(resolve => { submitted = resolve; });
  const calls = [];
  const { base } = await fixture(t, { pollIntervalMs: 200, fetchImpl: async url => {
    calls.push(String(url));
    if (String(url).endsWith('/user/info')) return info();
    submitted(); return json({ requestId: 'r' });
  } });
  const controller = new AbortController();
  const request = generate(base, STORY, { signal: controller.signal }).catch(error => error);
  await onSubmitted;
  controller.abort();
  await request;
  await new Promise(resolve => setTimeout(resolve, 250));
  assert.equal(calls.filter(x => x.endsWith('/submit')).length, 1);
  assert.equal(calls.filter(x => x.endsWith('/status')).length, 0);
});

test('result URL rejects local targets; DNS pinning accepts public addresses only', () => {
  assert.equal(validateSiliconFlowResultURL(RESULT).protocol, 'https:');
  for (const value of ['https://127.0.0.1/a', 'https://[::1]/a', 'https://localhost/a', 'https://evil.local/a', 'http://video.example.com/a', 'https://key:secret@video.example.com/a']) assert.throws(() => validateSiliconFlowResultURL(value));
  for (const value of ['127.0.0.1', '10.0.0.1', '172.16.3.4', '192.168.1.1', '169.254.169.254', '100.64.1.1', '192.0.0.1', '192.0.2.1', '198.18.1.1', '198.51.100.1', '203.0.113.1', '::1', '::ffff:127.0.0.1', 'fe80::1', 'fc00::1', '2001:db8::1', '224.0.0.1']) assert.equal(isPublicAddress(value), false, value);
  for (const value of ['8.8.8.8', '1.1.1.1', '192.2.1.1', '198.51.99.1', '203.0.1.1', '2606:4700:4700::1111']) assert.equal(isPublicAddress(value), true, value);
});
