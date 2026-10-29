import test from 'node:test';
import assert from 'node:assert/strict';
import {createCloudHandler} from '../cloud-video-api.mjs';
const key='private-cloud-test-key';
const image='data:image/jpeg;base64,'+Buffer.concat([Buffer.from([255,216,255]),Buffer.alloc(256)]).toString('base64');
const story={title:'Chuyện tranh',message:'Gia đình',narration:'Cả nhà cùng nhau chăm sóc khu vườn.',painting:'Lợn đàn',model:'seedance-1-0-pro-fast-251015',duration:10,aspectRatio:'16:9',preserveArtwork:true,referenceImage:image};
const request=(route,body,headers={})=>new Request('https://example.vercel.app'+route,body?{method:'POST',headers:{'Content-Type':'application/json',...headers},body:JSON.stringify(body)}:{headers});
function fixture(options={}){const calls=[],downloads=[];const handler=createCloudHandler({env:{BYTEPLUS_API_KEY:key,BYTEPLUS_FREE_QUOTA_CONFIRMED:'true'},fetchImpl:async(url,init)=>{calls.push({url:String(url),init});return Response.json(String(url).includes('page_size')?{items:[]}:init.method==='POST'?{id:'cgt-test'}:{status:'succeeded',content:{video_url:'https://media.example.com/video.mp4'}});},downloadImpl:async(url,init)=>{downloads.push({url:String(url),init});return new Response(Buffer.concat([Buffer.from([0,0,0,24]),Buffer.from('ftypisom'),Buffer.alloc(16)]));},...options});return {handler,calls,downloads};}
test('cloud config exposes readiness and cloud mode without leaking key or creating a job',async()=>{
 const f=fixture();const response=await f.handler(request('/api/video/config'));const text=await response.text(),data=JSON.parse(text);
 assert.equal(data.cloudMode,true);assert.equal(data.canGenerate,true);assert.equal(text.includes(key),false);assert.equal(f.calls.length,1);assert.equal(f.calls[0].init.method,'GET');
});
test('cloud creates a single native job with the first-frame image and polls using a signed token',async()=>{
 const f=fixture();const creation=await f.handler(request('/api/video/jobs',story));assert.equal(creation.status,202);const {token}=await creation.json();
 const body=JSON.parse(f.calls[0].init.body);assert.equal(body.duration,10);assert.equal(body.content[1].role,'first_frame');assert.equal(body.content[1].image_url.url,image);assert.match(body.content[0].text,/ARTWORK PRESERVATION/);
 const status=await f.handler(request('/api/video/jobs?token='+token));assert.equal((await status.json()).status,'succeeded');
 const media=await f.handler(request('/api/video/media?token='+token));assert.equal(media.status,200);assert.equal(media.headers.get('Content-Type'),'video/mp4');assert.equal(media.headers.has('Content-Length'),false);await media.arrayBuffer();
 assert.equal(f.downloads[0].init.headers,undefined);assert.equal(f.calls.filter(c=>c.init.method==='POST').length,1);assert.equal(token.includes(key),false);
});
test('cloud refuses unsupported duration, missing reference, cross-site calls and forged task tokens',async()=>{
 const f=fixture();
 for(const body of [{...story,duration:30},{...story,preserveArtwork:false},{...story,referenceImage:undefined}])assert.equal((await f.handler(request('/api/video/jobs',body))).status,400);
 assert.equal((await f.handler(request('/api/video/jobs',story,{Origin:'https://other.example'}))).status,403);
 assert.equal((await f.handler(request('/api/video/jobs?token=forged.signature'))).status,403);
 assert.equal(f.calls.length,0);
});
test('cloud does not submit without free-quota confirmation and sanitizes upstream failures',async()=>{
 const blocked=fixture({env:{BYTEPLUS_API_KEY:key}});assert.equal((await blocked.handler(request('/api/video/jobs',story))).status,503);assert.equal(blocked.calls.length,0);
 const failing=fixture({fetchImpl:async()=>Response.json({error:{message:key}},{status:401})});const response=await failing.handler(request('/api/video/jobs',story));assert.equal(response.status,401);assert.equal((await response.text()).includes(key),false);
});
test('Vercel shared-handler rewrite resolves the original video API route',async()=>{
 const f=fixture();const response=await f.handler(request('/api/index?route=video/config'));assert.equal((await response.json()).cloudMode,true);
});
