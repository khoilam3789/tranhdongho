import test from 'node:test';
import assert from 'node:assert/strict';
import {generateBytePlusVideo, planBytePlusDuration, BYTEPLUS_MODELS} from '../byteplus-video.mjs';
const mp4 = Buffer.concat([Buffer.from([0,0,0,24]), Buffer.from('ftypisom'), Buffer.alloc(16)]);
const options = () => ({story: {model: BYTEPLUS_MODELS[0], duration: 30, aspectRatio: '16:9', referenceImage: 'data:image/png;base64,reference'}, prompt: 'Complete story', apiKey: 'private-test-key', pollIntervalMs: 0,
  compositionReadyImpl: async () => ({available: true}), downloadImpl: async () => new Response(mp4)});

test('long durations have bounded plans that never send an unsupported 30-second provider task', () => {
  for (const [total, plan] of [[5,[5]],[10,[10]],[15,[10,5]],[20,[10,10]],[25,[10,10,5]],[30,[10,10,10]]]) assert.deepEqual(planBytePlusDuration(total), plan);
  for (const invalid of [0,12,31,40,-1,'30']) assert.throws(() => planBytePlusDuration(invalid));
});
test('30 seconds submits exactly three 10-second jobs, preserves segment order and joins once', async () => {
  const submissions = [];
  let joins = 0;
  const result = await generateBytePlusVideo({...options(),
    fetchImpl: async (url, init) => {
      if (init.method === 'POST') {submissions.push(JSON.parse(init.body)); return Response.json({id:'clip-'+submissions.length});}
      return Response.json({status:'succeeded',content:{video_url:'https://media.example.com/video.mp4'}});
    },
    composeImpl: async ({clips,durations}) => {joins++; assert.equal(clips.length,3); assert.deepEqual(durations,[10,10,10]); return mp4;},
  });
  assert.equal(result.status,200);
  assert.equal(submissions.length,3);
  assert.equal(joins,1);
  submissions.forEach((body,index) => {assert.equal(body.duration,10); assert.match(body.content[0].text,new RegExp('segment '+(index+1)+' of 3')); assert.equal(body.model,BYTEPLUS_MODELS[0].id);assert.equal(body.content[1].role,'first_frame');assert.equal(body.content[1].image_url.url,options().story.referenceImage);});
});
test('missing local composer blocks all paid video submissions', async () => {
  let calls=0;
  await assert.rejects(generateBytePlusVideo({...options(),compositionReadyImpl:async()=>({available:false}),fetchImpl:async()=>{calls++;}}),error=>error.status===503);
  assert.equal(calls,0);
});
test('second-segment failure stops without submitting a third segment or retrying', async () => {
  let calls=0;
  await assert.rejects(generateBytePlusVideo({...options(),fetchImpl:async(url,init)=>{
    if(init.method==='POST') {calls++; return calls===1?Response.json({id:'clip-1'}):Response.json({error:{code:'QuotaExceeded'}},{status:402});}
    return Response.json({status:'succeeded',content:{video_url:'https://media.example.com/video.mp4'}});
  }}),error=>error.status===402 && /1\/3/.test(error.message));
  assert.equal(calls,2);
});
test('cancellation after a segment never submits the next segment', async () => {
  const controller=new AbortController();let calls=0;
  await assert.rejects(generateBytePlusVideo({...options(),signal:controller.signal,
    fetchImpl:async(url,init)=>{if(init.method==='POST'){calls++;return Response.json({id:'clip-1'});}return Response.json({status:'succeeded',content:{video_url:'https://media.example.com/video.mp4'}});},
    downloadImpl:async()=>{controller.abort(new Error('cancelled'));return new Response(mp4);},
  }),/cancelled/);
  assert.equal(calls,1);
});
