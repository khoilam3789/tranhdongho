import test from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {createVideoServer} from '../server.mjs';

const KEY = 'byteplus_private_test_key';
const TASKS = 'https://ark.ap-southeast.bytepluses.com/api/v3/contents/generations/tasks';
const MP4 = Buffer.concat([Buffer.from([0, 0, 0, 24]), Buffer.from('ftypisom'), Buffer.alloc(16)]);
const STORY = {title: 'Chuyện tranh', message: 'Gia đình', narration: 'Cả nhà cùng chăm sóc khu vườn.', painting: 'Lợn đàn', model: 'seedance-1-0-pro-fast-251015', duration: 5, aspectRatio: '16:9'};
const json = (body, status = 200) => new Response(JSON.stringify(body), {status, headers: {'Content-Type': 'application/json'}});
async function fixture(t, options = {}) {
  const calls = [], downloads = [];
  const server = createVideoServer({provider: 'byteplus', byteplusApiKey: KEY, pollIntervalMs: 1,
    fetchImpl: async (url, init) => {
      calls.push({url: String(url), init});
      if (String(url).includes('?page_size')) return json({items: [], total: 0});
      if (init.method === 'POST') return json({id: 'cgt-test'});
      return json({status: 'succeeded', content: {video_url: 'https://media.example.com/video.mp4'}});
    },
    downloadImpl: async (url, init) => { downloads.push({url, init}); return new Response(MP4); }, ...options});
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  t.after(() => {server.closeAllConnections(); server.close();});
  const base = `http://127.0.0.1:${server.address().port}`;
  return {calls, downloads, base, generate: () => fetch(`${base}/api/video/generate`, {method: 'POST', headers: {'Content-Type': 'application/json', Origin: base}, body: JSON.stringify(STORY)})};
}
test('BytePlus read-only connection proves key access but never claims quota or enables generation', async t => {
  const f = await fixture(t);
  const text = await (await fetch(`${f.base}/api/video/config`)).text();
  const config = JSON.parse(text);
  assert.equal(config.keyValid, true);
  assert.equal(config.quotaCheckAvailable, false);
  assert.equal(config.canGenerate, false);
  assert.equal(text.includes(KEY), false);
  assert.equal(f.calls.length, 1);
  assert.equal(f.calls[0].url, `${TASKS}?page_size=1`);
  assert.equal(f.calls[0].init.method, 'GET');
  assert.equal((await f.generate()).status, 503);
  assert.equal(f.calls.length, 1);
});
test('BytePlus authenticated generation submits once, polls and downloads without sending credentials to media', async t => {
  const f = await fixture(t, {byteplusQuotaConfirmed: true});
  const response = await f.generate();
  assert.equal(response.status, 200);
  assert.deepEqual(Buffer.from(await response.arrayBuffer()), MP4);
  assert.equal(f.calls.filter(c => c.init.method === 'POST').length, 1);
  const submit = f.calls.find(c => c.init.method === 'POST');
  const payload = JSON.parse(submit.init.body);
  assert.equal(payload.model, STORY.model);
  assert.equal(payload.resolution, '720p');
  assert.equal(payload.duration, 5);
  assert.equal(payload.generate_audio, undefined);
  assert.ok(payload.content[0].text.includes(STORY.narration));
  assert.equal(f.downloads.length, 1);
  assert.equal(f.downloads[0].init.headers, undefined);
});

test('artwork preservation sends the original first frame with strict constraints and no style replacement', async t => {
  const f = await fixture(t, {byteplusQuotaConfirmed:true});
  const image = 'data:image/jpeg;base64,' + Buffer.concat([Buffer.from([255,216,255]),Buffer.alloc(20000)]).toString('base64');
  const response=await fetch(f.base+'/api/video/generate',{method:'POST',headers:{'Content-Type':'application/json','X-Video-Reference':'first-frame'},body:JSON.stringify({...STORY,preserveArtwork:true,referenceImage:image})});
  assert.equal(response.status,200);
  const payload=JSON.parse(f.calls.find(call=>call.init.method==='POST').init.body);
  assert.deepEqual(payload.content[1],{type:'image_url',image_url:{url:image},role:'first_frame'});
  assert.match(payload.content[0].text,/ARTWORK PRESERVATION IS THE HIGHEST PRIORITY/);
  assert.match(payload.content[0].text,/No photorealism, 3D rendering/);
  assert.match(payload.content[0].text,/no cropping, zoom, pan/);
});

test('missing or remote reference is rejected before any provider request in preservation mode',async t=>{
  const f=await fixture(t,{byteplusQuotaConfirmed:true});
  for(const referenceImage of [undefined,'https://example.com/image.jpg','data:image/svg+xml;base64,AAAA']){
    const response=await fetch(f.base+'/api/video/generate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...STORY,preserveArtwork:true,referenceImage})});
    assert.equal(response.status,400);
  }
  assert.equal(f.calls.length,0);
});
test('BytePlus invalid keys never submit and upstream messages cannot expose the key', async t => {
  let requests = 0;
  const f = await fixture(t, {byteplusQuotaConfirmed: true, fetchImpl: async () => {requests++; return json({error: {code: 'AuthenticationError', message: KEY}}, 401);}});
  const configText = await (await fetch(`${f.base}/api/video/config`)).text();
  assert.equal(JSON.parse(configText).keyValid, false);
  assert.equal(JSON.parse(configText).canGenerate, false);
  assert.equal(configText.includes(KEY), false);
  const response = await f.generate();
  assert.equal(response.status, 401);
  assert.equal((await response.text()).includes(KEY), false);
  assert.equal(requests, 2);
});
test('BytePlus failed tasks do not resubmit or download', async t => {
  let posts = 0;
  const f = await fixture(t, {byteplusQuotaConfirmed: true, fetchImpl: async (url, init) => {
    if (String(url).includes('?')) return json({items: []});
    if (init.method === 'POST') {posts++; return json({id: 'cgt-test'});}
    return json({status: 'failed', error: {code: 'QuotaExceeded', message: KEY}});
  }});
  const response = await f.generate();
  assert.equal(response.status, 402);
  assert.equal((await response.text()).includes(KEY), false);
  assert.equal(posts, 1);
  assert.equal(f.downloads.length, 0);
});
test('BytePlus rejects non-HTTPS result URLs and never returns credentials', async t => {
  const f = await fixture(t, {byteplusQuotaConfirmed: true, fetchImpl: async (url, init) => {
    if (String(url).includes('?')) return json({items: []});
    if (init.method === 'POST') return json({id: 'cgt-test'});
    return json({status: 'succeeded', content: {video_url: 'http://127.0.0.1/private'}});
  }});
  assert.equal((await f.generate()).status, 502);
  assert.equal(f.downloads.length, 0);
});
