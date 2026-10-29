import {FFmpeg} from '@ffmpeg/ffmpeg';

function delay(ms,signal){return new Promise((resolve,reject)=>{if(signal.aborted){reject(signal.reason);return;}const abort=()=>{clearTimeout(timer);reject(signal.reason);};const timer=setTimeout(()=>{signal.removeEventListener('abort',abort);resolve();},ms);signal.addEventListener('abort',abort,{once:true});});}
async function payload(response){const data=await response.json();if(!response.ok)throw new Error(data.error||'Chưa xử lý được tác vụ video.');return data;}
window.donghoCloudGenerate=async({story,options,reference,signal,onProgress})=>{
  const durations=[];for(let remaining=options.duration||5;remaining>0;remaining-=10)durations.push(Math.min(10,remaining));
  let ffmpeg;
  let currentFrame=reference.referenceImage;
  const clips=[];
  try{
    if(durations.length>1){
      onProgress('Đang tải bộ ghép video trong trình duyệt, chưa tạo tác vụ AI…');
      ffmpeg=new FFmpeg();
      await ffmpeg.load({classWorkerURL:new URL('/ffmpeg/worker.js',location.href).href,coreURL:new URL('/ffmpeg/ffmpeg-core.js',location.href).href,wasmURL:new URL('/ffmpeg/ffmpeg-core.wasm',location.href).href});
      signal.throwIfAborted();
    }
    for(let index=0;index<durations.length;index++){
      signal.throwIfAborted();
      onProgress(`Đang gửi đoạn ${index+1}/${durations.length} · ${durations[index]} giây. Mỗi đoạn dùng quota riêng.`);
      const job=await payload(await fetch('/api/video/jobs',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...story,...options,...reference,referenceImage:currentFrame,duration:durations[index],segmentIndex:index+1,segmentTotal:durations.length}),signal}));
      let finished=false;
      const deadline=Date.now()+20*60*1000;
      while(Date.now()<deadline){
        await delay(5000,signal);
        const state=await payload(await fetch('/api/video/jobs?token='+encodeURIComponent(job.token),{signal,cache:'no-store'}));
        onProgress(`Đoạn ${index+1}/${durations.length} · ${state.status==='queued'?'đang xếp hàng':'đang xử lý'}. Không tự tạo lại tác vụ.`);
        if(state.status==='failed')throw new Error(state.error);
        if(state.status==='succeeded'){finished=true;break;}
      }
      if(!finished)throw new Error('Đã hết thời gian chờ. BytePlus có thể vẫn xử lý; kiểm tra lịch sử trước khi tạo lại.');
      const response=await fetch('/api/video/media?token='+encodeURIComponent(job.token),{signal,cache:'no-store'});
      if(!response.ok){const data=await response.json().catch(()=>({}));throw new Error(data.error||'Chưa tải được đoạn video.');}
      const bytes=new Uint8Array(await response.arrayBuffer());
      if(bytes.length<12||String.fromCharCode(...bytes.slice(4,8))!=='ftyp')throw new Error('Một đoạn chưa phải MP4 hợp lệ. Không tự tạo lại.');
      clips.push(bytes);
      if(ffmpeg){
        await ffmpeg.writeFile(`clip-${index}.mp4`,bytes);
        if(index<durations.length-1){
          onProgress(`Đang lấy khung cuối đoạn ${index+1} để nối tiếp đoạn ${index+2}…`);
          const exit=await ffmpeg.exec(['-sseof','-0.5','-i',`clip-${index}.mp4`,'-an','-update','1','-vsync','0','-y','continuation.png']);
          if(exit!==0)throw new Error('Chưa lấy được khung hình nối cảnh; đã dừng, không tạo đoạn tiếp theo.');
          const frame=await ffmpeg.readFile('continuation.png');
          currentFrame=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(new Error('Chưa đọc được ảnh nối cảnh.'));reader.readAsDataURL(new Blob([frame],{type:'image/png'}));});
          signal.throwIfAborted();
        }
      }
    }
    if(!ffmpeg)return new Blob(clips,{type:'video/mp4'});
    onProgress('Đang ghép các đoạn ngay trong trình duyệt. Không gọi thêm AI.');
    await ffmpeg.writeFile('clips.txt',new TextEncoder().encode(clips.map((_,index)=>`file 'clip-${index}.mp4'`).join('\n')));
    const args=['-f','concat','-safe','1','-i','clips.txt','-an','-c:v','copy','-t',String(options.duration),'-movflags','+faststart','result.mp4'];
    const abort=()=>ffmpeg.terminate();signal.addEventListener('abort',abort,{once:true});
    let exit;try{exit=await ffmpeg.exec(args);}finally{signal.removeEventListener('abort',abort);}
    signal.throwIfAborted();
    if(exit!==0)throw new Error('Ghép các đoạn trong trình duyệt bị lỗi. Các đoạn đã tạo có thể đã dùng quota; không tự tạo lại.');
    return new Blob([await ffmpeg.readFile('result.mp4')],{type:'video/mp4'});
  } finally{ffmpeg?.terminate();}
};
