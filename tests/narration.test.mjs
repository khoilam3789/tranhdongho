import test from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {createVideoServer} from '../server.mjs';
import {narrateVideo, NarrationError} from '../narration.mjs';

const MP4 = Buffer.concat([Buffer.from([0, 0, 0, 24]), Buffer.from('ftypisom'), Buffer.alloc(16)]);
async function fixture(t, options = {}) {
  let providerCalls = 0;
  const server = createVideoServer({provider: 'byteplus', fetchImpl: async () => {providerCalls++; throw new Error('never call video provider');}, ...options});
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => {server.closeAllConnections(); server.close();});
  return {base: `http://127.0.0.1:${server.address().port}`, providerCalls: () => providerCalls};
}
function form() {
  const data = new FormData();
  data.append('video', new Blob([MP4], {type: 'video/mp4'}), 'story.mp4');
  data.append('narration', 'Cả nhà cùng nhau chăm sóc khu vườn.');
  data.append('voice', 'vi-VN-HoaiMyNeural');
  return data;
}
test('free narration route works without video credentials or quota and preserves the full Vietnamese text', async t => {
  let received;
  const app = await fixture(t, {narrationImpl: async body => {received = body; return {video: MP4, duration: 23.4};}});
  const response = await fetch(app.base + '/api/video/narrate', {method: 'POST', body: form()});
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('x-video-duration'), '23.4');
  assert.deepEqual(Buffer.from(await response.arrayBuffer()), MP4);
  assert.equal(received.narration, 'Cả nhà cùng nhau chăm sóc khu vườn.');
  assert.equal(received.voice, 'vi-VN-HoaiMyNeural');
  assert.deepEqual(received.video, MP4);
  assert.equal(app.providerCalls(), 0);
});
test('narration validates content, voice and MP4 before starting a subprocess', async () => {
  for (const data of [
    {video: MP4, narration: ''}, {video: MP4, narration: 'x'.repeat(1601)},
    {video: MP4, narration: 'Xin chào', voice: 'invalid'},
    {video: Buffer.from('not video'), narration: 'Xin chào'},
  ]) await assert.rejects(narrateVideo(data), error => error instanceof NarrationError && error.status === 400);
});
test('narration failures cannot expose provider internals and never create a paid video', async t => {
  const app = await fixture(t, {narrationImpl: async () => {throw new Error('secret_story_network_details');}});
  const response = await fetch(app.base + '/api/video/narrate', {method: 'POST', body: form()});
  assert.equal(response.status, 500);
  assert.doesNotMatch(await response.text(), /secret_story_network_details/);
  assert.equal(app.providerCalls(), 0);
});
test('narration rejects cross-origin requests before parsing video or calling TTS', async t => {
  let called = false;
  const app = await fixture(t, {narrationImpl: async () => {called = true;}});
  const response = await fetch(app.base + '/api/video/narrate', {method: 'POST', headers: {Origin: 'https://untrusted.example'}, body: form()});
  assert.equal(response.status, 403);
  assert.equal(called, false);
});
test('concurrent narration is blocked and cancellation releases its lock', async t => {
  let started;
  const begun = new Promise(resolve => {started = resolve;});
  const app = await fixture(t, {narrationImpl: async ({signal}) => {
    started();
    await new Promise((resolve, reject) => signal.addEventListener('abort', () => reject(signal.reason), {once: true}));
  }});
  const controller = new AbortController();
  const request = fetch(app.base + '/api/video/narrate', {method: 'POST', body: form(), signal: controller.signal});
  await begun;
  const second = await fetch(app.base + '/api/video/narrate', {method: 'POST', body: form()});
  assert.equal(second.status, 409);
  controller.abort();
  await assert.rejects(request, {name: 'AbortError'});
});
