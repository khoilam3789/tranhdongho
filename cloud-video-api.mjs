import {createHmac, timingSafeEqual} from 'node:crypto';
import {BYTEPLUS_MODELS, getBytePlusAccess} from './byteplus-video.mjs';
import {validateStory, buildVideoPrompt} from './server.mjs';
import {publicVideoDownload} from './siliconflow-video.mjs';

const TASKS = 'https://ark.ap-southeast.bytepluses.com/api/v3/contents/generations/tasks';
class CloudError extends Error {constructor(status,message){super(message);this.status=status;}}
const json = (data,status=200) => Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
function sign(id,key,now=Date.now()) {
  const data=Buffer.from(JSON.stringify({id,expires:now+86400000})).toString('base64url');
  return data+'.'+createHmac('sha256',key).update(data).digest('base64url');
}
function verify(token,key,now=Date.now()) {
  if(typeof token!=='string'||token.length>1024) throw new CloudError(400,'Mã tác vụ chưa hợp lệ.');
  const [data,signature,...extra]=token.split('.');
  const expected=createHmac('sha256',key).update(data||'').digest();
  const supplied=Buffer.from(signature||'','base64url');
  if(extra.length||supplied.length!==expected.length||!timingSafeEqual(supplied,expected)) throw new CloudError(403,'Mã tác vụ không được chấp nhận.');
  let value;try{value=JSON.parse(Buffer.from(data,'base64url'));}catch{throw new CloudError(400,'Mã tác vụ chưa hợp lệ.');}
  if(typeof value.id!=='string'||!/^[\w-]{1,160}$/.test(value.id)||!Number.isFinite(value.expires)||value.expires<now) throw new CloudError(410,'Mã tác vụ đã hết hạn.');
  return value.id;
}
async function upstream(url,{key,fetchImpl,method='GET',body,signal}) {
  const response=await fetchImpl(url,{method,body:body?JSON.stringify(body):undefined,signal,redirect:'error',headers:{Authorization:`Bearer ${key}`,Accept:'application/json',...(body?{'Content-Type':'application/json'}:{})}});
  if(!response.ok){await response.body?.cancel();throw new CloudError(response.status===401?401:response.status===402?402:response.status===403?403:response.status===429?429:502,'BytePlus chưa hoàn tất yêu cầu. Kiểm tra key, quyền model và quota; không tự tạo lại tác vụ.');}
  const text=await response.text();
  if(text.length>1024*1024) throw new CloudError(502,'Phản hồi BytePlus quá lớn.');
  let payload;try{payload=JSON.parse(text);}catch{throw new CloudError(502,'Phản hồi BytePlus chưa hợp lệ.');}
  if(payload.error) throw new CloudError(502,'BytePlus từ chối tác vụ; kiểm tra quota và model trong tài khoản.');
  return payload;
}
export function createCloudHandler({env=process.env,fetchImpl=fetch,downloadImpl=publicVideoDownload}={}) {
  return async request => {
    try {
      const url=new URL(request.url),origin=request.headers.get('origin');
      const route=url.pathname==='/api/index'?'/api/'+(url.searchParams.get('route')||''):url.pathname;
      if((origin&&origin!==url.origin)||request.headers.get('sec-fetch-site')==='cross-site') throw new CloudError(403,'Chỉ trang ứng dụng được phép gọi API.');
      const key=env.BYTEPLUS_API_KEY?.trim()||'';
      const confirmed=env.BYTEPLUS_FREE_QUOTA_CONFIRMED==='true';
      if(request.method==='GET'&&route==='/api/video/config') {
        const info={configured:!!key,provider:'BytePlus ModelArk',providerId:'byteplus',keyEnv:'BYTEPLUS_API_KEY',models:BYTEPLUS_MODELS,cloudMode:true,
          freeQuotaRequired:true,freeQuotaConfirmed:confirmed,canGenerate:false,keyValid:null,quotaCheckAvailable:false};
        if(key){try{Object.assign(info,await getBytePlusAccess({apiKey:key,fetchImpl,signal:AbortSignal.timeout(15000)}));info.canGenerate=confirmed;}
          catch{info.error='Chưa xác thực được key BytePlus. Kiểm tra biến môi trường và quyền truy cập Singapore.';}}
        return json(info);
      }
      if(!['/api/video/jobs','/api/video/media'].includes(route)) return json({error:'Không tìm thấy API.'},404);
      if(!key||!confirmed) throw new CloudError(503,'Chưa cấu hình key hoặc chưa xác nhận quota và Free Credits Only Mode trên máy chủ.');
      const signal=AbortSignal.timeout(45000);
      if(request.method==='POST'&&route==='/api/video/jobs') {
        if(!/^application\/json/.test(request.headers.get('content-type')||'')) throw new CloudError(415,'Cần nội dung JSON.');
        if(Number(request.headers.get('content-length'))>4*1024*1024) throw new CloudError(413,'Ảnh và nội dung vượt quá 4 MB.');
        const reader=request.body?.getReader(),chunks=[];let size=0;
        if(!reader) throw new CloudError(400,'Nội dung rỗng.');
        while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>4*1024*1024){await reader.cancel();throw new CloudError(413,'Ảnh và nội dung vượt quá 4 MB.');}chunks.push(Buffer.from(value));}
        let body;try{body=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{throw new CloudError(400,'Nội dung JSON chưa hợp lệ.');}
        if(![5,10].includes(body.duration)||body.preserveArtwork!==true) throw new CloudError(400,'Mỗi đoạn cần 5/10 giây và ảnh tranh gốc.');
        const story=validateStory(body,BYTEPLUS_MODELS);
        if(!story.referenceImage) throw new CloudError(400,'Chưa có ảnh tranh gốc.');
        const part=Number(body.segmentIndex)||1,total=Number(body.segmentTotal)||1;
        if(!Number.isInteger(part)||!Number.isInteger(total)||part<1||part>total||total>3) throw new CloudError(400,'Số đoạn chưa hợp lệ.');
        const prompt=buildVideoPrompt(story)+`\nSegment ${part} of ${total}. Preserve the exact supplied painting in every segment, with only minimal existing-element motion. Do not invent a new scene.`;
        const task=await upstream(TASKS,{key,fetchImpl,signal,method:'POST',body:{model:BYTEPLUS_MODELS[0].id,content:[{type:'text',text:prompt},{type:'image_url',image_url:{url:story.referenceImage},role:'first_frame'}],duration:story.duration,resolution:'720p',ratio:story.aspectRatio,watermark:true,service_tier:'default'}});
        if(typeof task.id!=='string'||!/^[\w-]{1,160}$/.test(task.id)) throw new CloudError(502,'BytePlus chưa trả mã tác vụ hợp lệ. Kiểm tra lịch sử trước khi tạo lại.');
        return json({token:sign(task.id,key),status:'queued'},202);
      }
      if(request.method!=='GET') return json({error:'Phương thức không được hỗ trợ.'},405);
      const id=verify(url.searchParams.get('token'),key);
      const task=await upstream(`${TASKS}/${encodeURIComponent(id)}`,{key,fetchImpl,signal});
      if(route==='/api/video/jobs') {
        if(['failed','cancelled','expired'].includes(task.status)) return json({status:'failed',error:'BytePlus chưa tạo được đoạn video. Các đoạn đã tạo có thể đã dùng quota; không tự tạo lại.'});
        if(!['queued','running','succeeded'].includes(task.status)) throw new CloudError(502,'Trạng thái BytePlus chưa xác định.');
        return json({status:task.status});
      }
      if(task.status!=='succeeded') throw new CloudError(409,'Đoạn video chưa hoàn tất.');
      let media;try{media=new URL(task.content?.video_url);}catch{throw new CloudError(502,'Chưa có địa chỉ video hợp lệ.');}
      if(media.protocol!=='https:'||media.username||media.password||(media.port&&media.port!=='443')) throw new CloudError(502,'Địa chỉ video chưa hợp lệ.');
      const response=await downloadImpl(media,{signal});
      if(!response.ok||!response.body) throw new CloudError(502,'Chưa tải được đoạn video.');
      // Stream media instead of buffering a large MP4 in a function response.
      return new Response(response.body,{headers:{'Content-Type':'video/mp4','Cache-Control':'no-store','Content-Disposition':'inline; filename="dong-ho-ai.mp4"'}});
    } catch(error) {
      const known=error instanceof CloudError||Number.isInteger(error.status)&&error.status>=400&&error.status<500;
      return json({error:known?error.message:'Không kết nối được dịch vụ video. Không tự tạo lại tác vụ; kiểm tra lịch sử BytePlus trước khi thử lại.'},known?error.status:502);
    }
  };
}
