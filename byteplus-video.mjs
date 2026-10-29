import {joinVideoClips, getNarrationConfig, extractLastFrame} from './narration.mjs';
// BytePlus ModelArk Singapore. Connection checks only list existing tasks.
const BASE = 'https://ark.ap-southeast.bytepluses.com/api/v3';
const TASKS = `${BASE}/contents/generations/tasks`;
export class BytePlusError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
export const BYTEPLUS_MODELS = Object.freeze([Object.freeze({
  id: 'seedance-1-0-pro-fast-251015', name: 'Seedance 1.0 Pro Fast · BytePlus',
  durations: [5, 10, 15, 20, 25, 30], aspectRatios: ['16:9', '9:16', '1:1'],
  defaultDuration: 5, minDuration: 5, maxDuration: 30, nativeMaxDuration: 12,
  segmentDuration: 10, paidOnly: false,
})]);

function failure(status, code = '') {
  if (status === 401) return new BytePlusError(401, 'BytePlus chưa chấp nhận API key. Kiểm tra key của ModelArk tại Singapore.');
  if (status === 402 || /Quota|Balance|LimitExceeded/i.test(code)) return new BytePlusError(402, 'BytePlus chưa có quota hoặc số dư khả dụng. Kiểm tra Model activation trước khi tạo lại.');
  if (status === 403 || /NotOpen|NotActivated|AccessDenied/i.test(code)) return new BytePlusError(403, 'Model BytePlus chưa được kích hoạt hoặc key chưa có quyền sử dụng. Kiểm tra Model activation.');
  if (status === 429) return new BytePlusError(429, 'BytePlus đang giới hạn lượt gọi. Không tự gửi lại tác vụ; hãy kiểm tra quota rồi thử sau.');
  if (status === 400 || status === 422) return new BytePlusError(422, 'BytePlus chưa chấp nhận nội dung hoặc cấu hình video.');
  return new BytePlusError(502, 'BytePlus chưa hoàn thành yêu cầu. Kiểm tra lịch sử tác vụ trước khi tạo lại.');
}
async function json(response, signal) {
  const reader = response.body?.getReader();
  if (!reader) throw failure(response.status);
  let size = 0;
  const chunks = [];
  try {
    while (true) {
      signal?.throwIfAborted();
      const {done, value} = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 1024 * 1024) throw new BytePlusError(502, 'Phản hồi BytePlus vượt quá kích thước cho phép.');
      chunks.push(Buffer.from(value));
    }
  } catch (error) { await reader.cancel().catch(() => {}); throw error; }
  finally { reader.releaseLock(); }
  let payload;
  try { payload = JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { throw failure(response.status); }
  if (!response.ok || payload.error) throw failure(response.status, String(payload.error?.code || ''));
  return payload;
}
const headers = apiKey => ({Authorization: `Bearer ${apiKey}`, Accept: 'application/json'});
export async function getBytePlusAccess({apiKey, fetchImpl = fetch, signal}) {
  const payload = await json(await fetchImpl(`${TASKS}?page_size=1`, {
    method: 'GET', headers: headers(apiKey), redirect: 'error', signal,
  }), signal);
  if (!Array.isArray(payload.items)) throw new BytePlusError(502, 'BytePlus chưa trả về danh sách tác vụ hợp lệ để xác thực key.');
  // Listing tasks proves key access, never the remaining quota/model activation.
  return {keyValid: true, quotaCheckAvailable: false};
}
function sleep(ms, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) { reject(signal.reason); return; }
    const abort = () => { clearTimeout(timer); reject(signal.reason); };
    const timer = setTimeout(() => { signal?.removeEventListener('abort', abort); resolve(); }, ms);
    signal?.addEventListener('abort', abort, {once: true});
  });
}
async function generateBytePlusClip({story, prompt, apiKey, fetchImpl = fetch, downloadImpl, signal, pollIntervalMs = 5000}) {
  const task = await json(await fetchImpl(TASKS, {
    method: 'POST', redirect: 'error', signal,
    headers: {...headers(apiKey), 'Content-Type': 'application/json'},
    body: JSON.stringify({model: story.model.id, content: [{type: 'text', text: prompt},
      ...(story.referenceImage ? [{type: 'image_url', image_url: {url: story.referenceImage}, role: 'first_frame'}] : [])],
      duration: story.duration || 5, resolution: '720p', ratio: story.aspectRatio,
      watermark: true, service_tier: 'default'}),
  }), signal);
  if (typeof task.id !== 'string' || !/^[\w-]{1,160}$/.test(task.id)) throw new BytePlusError(502, 'BytePlus chưa trả về mã tác vụ hợp lệ. Kiểm tra lịch sử trước khi tạo lại.');
  while (true) {
    await sleep(pollIntervalMs, signal);
    const result = await json(await fetchImpl(`${TASKS}/${encodeURIComponent(task.id)}`, {
      method: 'GET', redirect: 'error', signal, headers: headers(apiKey),
    }), signal);
    if (result.status === 'succeeded') {
      let url;
      try { url = new URL(result.content?.video_url); } catch { throw new BytePlusError(502, 'BytePlus chưa trả về địa chỉ MP4 hợp lệ.'); }
      if (url.protocol !== 'https:' || url.username || url.password || (url.port && url.port !== '443')) throw new BytePlusError(502, 'Địa chỉ MP4 BytePlus chưa hợp lệ.');
      // Existing DNS-pinned public downloader: no API key, no private network or redirect.
      return downloadImpl(url, {signal});
    }
    if (['failed', 'cancelled', 'expired'].includes(result.status)) throw failure(502, String(result.error?.code || ''));
    if (!['queued', 'running'].includes(result.status)) throw new BytePlusError(502, 'Trạng thái tác vụ BytePlus chưa xác định. Không tự tạo lại tác vụ.');
  }
}

export function planBytePlusDuration(duration = 5) {
  if (!BYTEPLUS_MODELS[0].durations.includes(duration)) throw new BytePlusError(400, 'Chọn thời lượng từ 5 đến 30 giây theo danh sách.');
  const plan = [];
  for (let remaining = duration; remaining > 0; remaining -= 10) plan.push(Math.min(10, remaining));
  return plan;
}

export async function generateBytePlusVideo(options) {
  const {story, prompt, signal, composeImpl = joinVideoClips, compositionReadyImpl = getNarrationConfig, continuationImpl = extractLastFrame} = options;
  const plan = planBytePlusDuration(story.duration || 5);
  if (plan.length === 1) return generateBytePlusClip(options);
  // Verify the local composer BEFORE using any video quota.
  if (!(await compositionReadyImpl()).available) throw new BytePlusError(503, 'Bộ ghép video trên máy chưa sẵn sàng. Chưa gửi tác vụ BytePlus; hãy cài bộ FFmpeg trước khi tạo video dài.');
  const clips = [];
  let currentFrame=story.referenceImage;
  let totalBytes = 0;
  for (let index = 0; index < plan.length; index++) {
    signal?.throwIfAborted();
    const segmentPrompt = `${prompt}\nThis is segment ${index + 1} of ${plan.length} in one ${story.duration}-second story, suggesting the ${index === 0 ? 'opening' : index === plan.length - 1 ? 'ending' : 'middle development'} only through subtle motion. ${index>0?'The supplied image is the final frame of the previous segment: continue directly from it with no pose reset, jump, camera change or change of motion direction.':''} Preserve the exact printed artwork; do not invent new scenes. Keep the same figures, composition, palette and print style. This segment lasts ${plan[index]} seconds.`;
    let response;
    try {response = await generateBytePlusClip({...options, story: {...story, referenceImage:currentFrame, duration: plan[index]}, prompt: segmentPrompt});}
    catch (error) {
      if (index && error instanceof BytePlusError) throw new BytePlusError(error.status, `${error.message} Đã hoàn tất ${index}/${plan.length} đoạn; các đoạn đã tạo có thể đã dùng quota. Không tự tạo lại.`);
      throw error;
    }
    if (!response.ok || !response.body) throw new BytePlusError(502, 'Chưa tải được một đoạn video. Các đoạn đã tạo có thể đã dùng quota; không tự tạo lại.');
    const parts = [];
    for await (const part of response.body) {
      signal?.throwIfAborted();
      totalBytes += part.byteLength;
      if (totalBytes > 128 * 1024 * 1024) throw new BytePlusError(502, 'Các đoạn video vượt quá 128 MB. Không tự tạo lại tác vụ.');
      parts.push(Buffer.from(part));
    }
    const clip = Buffer.concat(parts);
    if (clip.length < 12 || clip.toString('ascii', 4, 8) !== 'ftyp') throw new BytePlusError(502, 'Một đoạn chưa phải MP4 hợp lệ. Không tự tạo lại tác vụ.');
    clips.push(clip);
    if(currentFrame&&index<plan.length-1){
      try{currentFrame=await continuationImpl({video:clip,signal});}
      catch{signal?.throwIfAborted();throw new BytePlusError(502,`Đã tạo ${index+1}/${plan.length} đoạn nhưng chưa lấy được khung nối cảnh. Đã dừng; không tự tạo đoạn tiếp theo hoặc gửi lại tác vụ.`);}
    }
  }
  try {
    const video = await composeImpl({clips, durations: plan, signal});
    return new Response(video, {headers: {'Content-Type': 'video/mp4'}});
  } catch {
    signal?.throwIfAborted();
    throw new BytePlusError(502, 'Đã tạo các đoạn nhưng ghép video trên máy bị lỗi. Các đoạn có thể đã dùng quota; không tự gửi lại yêu cầu.');
  }
}
