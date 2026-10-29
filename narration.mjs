import {spawn} from 'node:child_process';
import {mkdtemp, readFile, writeFile, rm, stat} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
export const NARRATION_VOICES = Object.freeze([
  {id: 'vi-VN-NamMinhNeural', name: 'Nam Minh · nam'},
  {id: 'vi-VN-HoaiMyNeural', name: 'Hoài My · nữ'},
]);
export class NarrationError extends Error {
  constructor(status, message) {super(message); this.status = status;}
}
const unavailable = () => new NarrationError(503, 'Chưa tạo được giọng Việt miễn phí. Kiểm tra Internet và bộ đọc Microsoft Edge rồi bấm ghép giọng lại. Video gốc vẫn được giữ; không cần tạo video AI lại.');
const pythonPath = () => process.env.NARRATION_PYTHON || path.join(ROOT, '.venv', process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python');

function helper(args, data, signal, timeout = 220000) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {reject(signal.reason); return;}
    const child = spawn(pythonPath(), [path.join(ROOT, 'scripts/narrate-video.py'), ...args], {
      windowsHide: true, stdio: ['pipe', 'pipe', 'ignore'], env: {...process.env, PYTHONUTF8: '1'},
    });
    let output = '', stopped = false;
    const stop = () => {
      if (stopped) return;
      stopped = true;
      if (process.platform === 'win32' && child.pid) {
        const killer = spawn('taskkill.exe', ['/pid', String(child.pid), '/t', '/f'], {windowsHide: true, stdio: 'ignore'});
        killer.on('error', () => child.kill());
      } else child.kill('SIGTERM');
    };
    const abort = () => {stop();};
    const timer = setTimeout(stop, timeout);
    const cleanup = () => {clearTimeout(timer); signal?.removeEventListener('abort', abort);};
    signal?.addEventListener('abort', abort, {once: true});
    child.on('error', () => {cleanup(); reject(unavailable());});
    child.stdin.on('error', () => {});
    child.stdout.on('data', chunk => {output += chunk.toString('utf8'); if (output.length > 8192) stop();});
    child.on('close', code => {
      cleanup();
      if (code !== 0 || stopped) {reject(signal?.aborted ? signal.reason : unavailable()); return;}
      try {resolve(JSON.parse(output));} catch {reject(unavailable());}
    });
    child.stdin.end(data ? JSON.stringify(data) : '');
  });
}

export async function getNarrationConfig() {
  try {
    await helper(['--check'], null, null, 12000);
    return {available: true, voices: NARRATION_VOICES, free: true};
  } catch {
    return {available: false, voices: NARRATION_VOICES, free: true};
  }
}

export async function narrateVideo({video, narration, voice = NARRATION_VOICES[0].id, signal}) {
  if (typeof narration !== 'string' || !narration.trim() || narration.length > 1600)
    throw new NarrationError(400, 'Lời kể cần có nội dung và tối đa 1600 ký tự.');
  if (!NARRATION_VOICES.some(item => item.id === voice)) throw new NarrationError(400, 'Chọn giọng đọc tiếng Việt trong danh sách.');
  if (!Buffer.isBuffer(video) || video.length < 12 || video.length > 128 * 1024 * 1024 || video.toString('ascii', 4, 8) !== 'ftyp')
    throw new NarrationError(400, 'Chọn video MP4 hợp lệ, tối đa 128 MB.');
  const tempRoot = path.resolve(os.tmpdir());
  const directory = await mkdtemp(path.join(tempRoot, 'dongho-narration-'));
  if (path.dirname(path.resolve(directory)) !== tempRoot || !path.basename(directory).startsWith('dongho-narration-')) throw unavailable();
  try {
    await writeFile(path.join(directory, 'input.mp4'), video);
    const meta = await helper([], {directory, narration: narration.trim(), voice}, signal);
    const output = path.join(directory, 'output.mp4');
    if ((await stat(output)).size > 128 * 1024 * 1024) throw unavailable();
    return {video: await readFile(output), duration: meta.duration};
  } finally {await rm(directory, {recursive: true, force: true});}
}

export async function joinVideoClips({clips, durations, signal}) {
  if (!Array.isArray(clips) || clips.length < 2 || clips.length > 3 || clips.length !== durations?.length
    || !durations.every(value => Number.isInteger(value) && value >= 5 && value <= 10)
    || durations.reduce((a, b) => a + b, 0) > 30) throw new NarrationError(400, 'Cấu hình ghép video chưa hợp lệ.');
  const tempRoot = path.resolve(os.tmpdir());
  const directory = await mkdtemp(path.join(tempRoot, 'dongho-video-'));
  if (path.dirname(path.resolve(directory)) !== tempRoot || !path.basename(directory).startsWith('dongho-video-')) throw unavailable();
  try {
    for (let index = 0; index < clips.length; index++) await writeFile(path.join(directory, `clip-${index}.mp4`), clips[index]);
    await helper([], {mode: 'join', directory, durations}, signal);
    const output = path.join(directory, 'output.mp4');
    if ((await stat(output)).size > 128 * 1024 * 1024) throw unavailable();
    return await readFile(output);
  } finally {await rm(directory, {recursive: true, force: true});}
}

export async function extractLastFrame({video,signal}){
  const tempRoot=path.resolve(os.tmpdir());
  const directory=await mkdtemp(path.join(tempRoot,'dongho-frame-'));
  if(path.dirname(path.resolve(directory))!==tempRoot||!path.basename(directory).startsWith('dongho-frame-'))throw unavailable();
  try{
    await writeFile(path.join(directory,'input.mp4'),video);
    await helper([],{mode:'last-frame',directory},signal);
    const bytes=await readFile(path.join(directory,'frame.png'));
    if(bytes.length>8*1024*1024)throw unavailable();
    return 'data:image/png;base64,'+bytes.toString('base64');
  }finally{await rm(directory,{recursive:true,force:true});}
}
