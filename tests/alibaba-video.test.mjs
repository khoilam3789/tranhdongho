import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createVideoServer } from '../server.mjs';
import { validateAlibabaResultURL } from '../alibaba-video.mjs';

const KEY = 'sk_alibaba_mock_do_not_expose';
const BASE = 'https://dashscope-intl.aliyuncs.com';
const OSS = 'https://dashscope-result-sg.oss-ap-southeast-1.aliyuncs.com/test.mp4?Expires=123&Signature=mock';
const MP4 = Buffer.concat([Buffer.from([0, 0, 0, 24]), Buffer.from('ftypisom'), Buffer.alloc(16)]);
const STORY = { title: 'Câu chuyện gia đình', message: 'Sẻ chia yêu thương', narration: 'Mẹ và các con cùng chăm sóc vườn. Cuối ngày cả nhà đoàn tụ.', painting: 'Lợn đàn', model: 'wan2.7-t2v', duration: 5, aspectRatio: '16:9' };
const ENGLISH = 'A warm family cares for a garden together and reunites at sunset, in the flat colors and woodcut texture of Vietnamese Dong Ho folk art.';
const jsonResponse = (value, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } });
const translated = (content = ENGLISH, finish_reason = 'stop') => jsonResponse({ choices: [{ message: { content }, finish_reason }] });
const pending = () => jsonResponse({ output: { task_id: 'task-123', task_status: 'PENDING' } });
const succeeded = (url = OSS) => jsonResponse({ output: { task_id: 'task-123', task_status: 'SUCCEEDED', video_url: url } });

async function fixture(t, options = {}) {
  const calls = [];
  const defaultFetch = async (url, init) => {
    calls.push({ url: String(url), init });
    if (String(url).endsWith('/chat/completions')) return translated();
    if (String(url).endsWith('/video-synthesis')) return pending();
    if (String(url).includes('/tasks/')) return succeeded();
    return new Response(MP4, { headers: { 'Content-Type': 'video/mp4' } });
  };
  const server = createVideoServer({ provider: 'alibaba', alibabaApiKey: KEY, freeQuotaConfirmed: true, pollIntervalMs: 1, fetchImpl: defaultFetch, ...options });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => { server.closeAllConnections(); server.close(); });
  return { server, calls, base: `http://127.0.0.1:${server.address().port}` };
}

function generate(base, story = STORY, options = {}) {
  return fetch(`${base}/api/video/generate`, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: base }, body: JSON.stringify(story), ...options });
}

test('Alibaba configuration is local and exposes only confirmation state, not secret', async t => {
  const { base, calls } = await fixture(t, { freeQuotaConfirmed: false });
  const response = await fetch(`${base}/api/video/config`);
  const text = await response.text();
  assert.equal(text.includes(KEY), false);
  const config = JSON.parse(text);
  assert.equal(config.providerId, 'alibaba');
  assert.equal(config.provider, 'Alibaba Cloud Model Studio');
  assert.equal(config.keyEnv, 'DASHSCOPE_API_KEY');
  assert.equal(config.configured, true);
  assert.equal(config.freeQuotaRequired, true);
  assert.equal(config.freeQuotaConfirmed, false);
  assert.equal(config.translationModel, 'qwen-flash');
  assert.equal(config.models[0].id, 'wan2.7-t2v');
  assert.equal(config.models[0].maxPromptLength, 5000);
  assert.deepEqual(config.models[0].durations, [5, 10, 15]);
  assert.equal(calls.length, 0);
});

test('missing key or unconfirmed free-only switches block all provider requests', async t => {
  for (const [options, expected] of [[{ alibabaApiKey: '' }, 'DASHSCOPE_API_KEY'], [{ freeQuotaConfirmed: false }, 'qwen-flash'], [{ freeQuotaConfirmed: 'true' }, 'qwen-flash']]) {
    const { base, calls } = await fixture(t, options);
    const response = await generate(base);
    assert.equal(response.status, 503);
    assert.ok((await response.json()).error.includes(expected));
    assert.equal(calls.length, 0);
  }
});

test('translates complete story, submits once, polls and downloads MP4 without leaking key to OSS', async t => {
  const { base, calls } = await fixture(t);
  const response = await generate(base);
  assert.equal(response.status, 200);
  assert.deepEqual(Buffer.from(await response.arrayBuffer()), MP4);
  assert.equal(calls.length, 4);
  const [translation, submission, polling, download] = calls;
  assert.equal(translation.url, `${BASE}/compatible-mode/v1/chat/completions`);
  const translationBody = JSON.parse(translation.init.body);
  assert.equal(translationBody.model, 'qwen-flash');
  assert.equal(translationBody.enable_thinking, false);
  assert.equal(translationBody.stream, false);
  for (const text of [STORY.title, STORY.message, STORY.narration, STORY.painting]) assert.ok(translationBody.messages[1].content.includes(text));
  assert.equal(submission.url, `${BASE}/api/v1/services/aigc/video-generation/video-synthesis`);
  assert.equal(submission.init.headers['X-DashScope-Async'], 'enable');
  const job = JSON.parse(submission.init.body);
  assert.equal(job.model, 'wan2.7-t2v');
  assert.equal(job.input.prompt, ENGLISH);
  assert.deepEqual(job.parameters, { resolution: '720P', ratio: '16:9', duration: 5, prompt_extend: false, watermark: false });
  assert.equal(polling.url, `${BASE}/api/v1/tasks/task-123`);
  for (const call of [translation, submission, polling]) assert.equal(call.init.headers.Authorization, `Bearer ${KEY}`);
  assert.equal(download.url, OSS);
  assert.equal(download.init.headers.Authorization, undefined);
  assert.equal(download.init.redirect, 'error');
});

test('incomplete, empty or over-limit English translations never submit a video', async t => {
  for (const [content, finish] of [['', 'stop'], ['A scene', 'length'], ['a'.repeat(5001), 'stop']]) {
    let calls = 0;
    const { base } = await fixture(t, { fetchImpl: async () => { calls++; return translated(content, finish); } });
    const response = await generate(base);
    assert.ok([422, 502].includes(response.status));
    await response.arrayBuffer();
    assert.equal(calls, 1);
  }
});

test('free-only quota errors stop translation, submission or polling without retries', async t => {
  for (const stage of ['translation', 'submission', 'polling']) {
    const calls = [];
    const { base } = await fixture(t, { fetchImpl: async (url, init) => {
      calls.push({ url: String(url), init });
      if (String(url).endsWith('/chat/completions')) return stage === 'translation' ? jsonResponse({ error: { code: 'AllocationQuota.FreeTierOnly', message: KEY } }, 400) : translated();
      if (String(url).endsWith('/video-synthesis')) return stage === 'submission' ? jsonResponse({ code: 'AllocationQuota.FreeTierOnly', message: KEY }, 400) : pending();
      return jsonResponse({ output: { task_id: 'task-123', task_status: 'FAILED', code: 'AllocationQuota.FreeTierOnly', message: KEY } });
    } });
    const response = await generate(base);
    assert.equal(response.status, 402);
    const text = await response.text();
    assert.ok(text.includes('Quota miễn phí'));
    assert.equal(text.includes(KEY), false);
    assert.equal(calls.length, stage === 'translation' ? 1 : stage === 'submission' ? 2 : 3);
  }
});

test('task failures and unsafe result URLs stop without downloading or re-creating', async t => {
  for (const output of [{ task_status: 'FAILED', code: 'VideoGenerationFailed', message: KEY }, { task_status: 'SUCCEEDED', video_url: 'http://127.0.0.1/admin' }]) {
    let calls = 0;
    const { base } = await fixture(t, { fetchImpl: async url => {
      calls++;
      if (String(url).endsWith('/chat/completions')) return translated();
      if (String(url).endsWith('/video-synthesis')) return pending();
      return jsonResponse({ output });
    } });
    const response = await generate(base);
    assert.equal(response.status, 502);
    assert.equal((await response.text()).includes(KEY), false);
    assert.equal(calls, 3);
  }
});

test('only public HTTPS Alibaba OSS result URLs are accepted', () => {
  assert.equal(validateAlibabaResultURL(OSS).hostname, 'dashscope-result-sg.oss-ap-southeast-1.aliyuncs.com');
  assert.equal(validateAlibabaResultURL('https://dashscope-result-sh.oss-accelerate.aliyuncs.com/a.mp4').protocol, 'https:');
  for (const value of ['https://127.0.0.1/a.mp4', 'https://example.com/a.mp4', 'http://a.oss-accelerate.aliyuncs.com/a', 'https://key:secret@a.oss-accelerate.aliyuncs.com/a', 'https://a.oss-cn-shanghai-internal.aliyuncs.com/a', 'https://a.oss-accelerate.aliyuncs.com.attacker.example/a']) assert.throws(() => validateAlibabaResultURL(value));
});

test('client cancellation stops polling without re-submitting a provider job', async t => {
  let submitted;
  const onSubmitted = new Promise(resolve => { submitted = resolve; });
  const calls = [];
  const { base } = await fixture(t, { pollIntervalMs: 200, fetchImpl: async url => {
    calls.push(String(url));
    if (String(url).endsWith('/chat/completions')) return translated();
    if (String(url).endsWith('/video-synthesis')) { submitted(); return pending(); }
    return jsonResponse({ output: { task_id: 'task-123', task_status: 'RUNNING' } });
  } });
  const controller = new AbortController();
  const request = generate(base, STORY, { signal: controller.signal }).catch(error => error);
  await onSubmitted;
  controller.abort();
  await request;
  await new Promise(resolve => setTimeout(resolve, 250));
  assert.equal(calls.filter(x => x.endsWith('/video-synthesis')).length, 1);
  assert.equal(calls.filter(x => x.includes('/tasks/')).length, 0);
});
