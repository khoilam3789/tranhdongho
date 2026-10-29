import https from 'node:https';
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { Readable } from 'node:stream';

const BASE = 'https://api.siliconflow.com';
const JSON_LIMIT = 1024 * 1024;
export class SiliconFlowError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
export const SILICONFLOW_MODELS = Object.freeze([Object.freeze({
  id: 'Wan-AI/Wan2.2-T2V-A14B', name: 'Wan 2.2 · SiliconFlow',
  durations: [5], aspectRatios: ['16:9', '9:16', '1:1'],
  defaultDuration: 5, minDuration: 5, maxDuration: 5, paidOnly: true,
})]);

function providerError(status, payload) {
  if (status === 410 && Number(payload?.code) === 20092) return new SiliconFlowError(410, 'SiliconFlow đã ngừng API xem số dư. Hãy kiểm tra coupon hoặc số dư trong trang tài khoản quốc tế.');
  if (status === 401) return new SiliconFlowError(401, 'SiliconFlow chưa chấp nhận API key. Hãy dùng key quốc tế từ cloud.siliconflow.com, không dùng key của hệ thống .cn.');
  if (status === 403) return new SiliconFlowError(403, 'Tài khoản hoặc API key SiliconFlow chưa có quyền thực hiện yêu cầu này. Kiểm tra quyền dùng mô hình và trạng thái tài khoản quốc tế.');
  if (status === 402) return new SiliconFlowError(402, 'SiliconFlow chưa có đủ số dư để tạo video. Kiểm tra khoản dùng thử và số dư trong tài khoản.');
  if (status === 429) return new SiliconFlowError(429, 'SiliconFlow đang giới hạn lượt gọi. Hãy chờ rồi chủ động thử lại; ứng dụng không tự gửi lại tác vụ.');
  if (status === 400 || status === 422) return new SiliconFlowError(422, 'SiliconFlow chưa chấp nhận lời kể hoặc cấu hình video. Hãy kiểm tra nội dung và thử lại.');
  return new SiliconFlowError(502, 'SiliconFlow chưa hoàn thành yêu cầu. Kiểm tra tác vụ và số dư trước khi chủ động tạo lại.');
}

async function readJSON(response, signal) {
  const reader = response.body?.getReader();
  if (!reader) throw new SiliconFlowError(502, 'SiliconFlow trả về nội dung rỗng.');
  let size = 0;
  const chunks = [];
  try {
    while (true) {
      signal?.throwIfAborted();
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > JSON_LIMIT) throw new SiliconFlowError(502, 'Phản hồi SiliconFlow vượt quá kích thước cho phép.');
      chunks.push(Buffer.from(value));
    }
  } catch (error) { await reader.cancel().catch(() => {}); throw error; }
  finally { reader.releaseLock(); }
  let payload;
  try { payload = JSON.parse(Buffer.concat(chunks, size).toString('utf8')); }
  catch { throw providerError(response.status); }
  if (!response.ok || (typeof payload?.code !== 'undefined' && Number(payload.code) !== 20000)) throw providerError(response.status, payload);
  return payload;
}

const safeBalance = value => {
  if (typeof value !== 'number' && typeof value !== 'string') return null;
  if (typeof value === 'string' && !value.trim()) return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
};

export async function getSiliconFlowCredit({ apiKey, fetchImpl = fetch, signal }) {
  const response = await fetchImpl(`${BASE}/v1/user/info`, { method: 'GET', signal, redirect: 'error', headers: { Authorization: `Bearer ${apiKey}`, Accept: 'application/json' } });
  const payload = await readJSON(response, signal);
  if (payload?.status !== true || !payload.data || payload.data.status !== 'normal') throw new SiliconFlowError(403, 'Tài khoản SiliconFlow chưa ở trạng thái hoạt động. Hãy kiểm tra tài khoản quốc tế.');
  return {
    balance: safeBalance(payload.data.balance),
    chargeBalance: safeBalance(payload.data.chargeBalance),
    totalBalance: safeBalance(payload.data.totalBalance),
  };
}

export async function getSiliconFlowAccess({ apiKey, fetchImpl = fetch, signal }) {
  try {
    return { credit: await getSiliconFlowCredit({ apiKey, fetchImpl, signal }), balanceCheckAvailable: true, modelAvailable: null, creditConfirmationRequired: false };
  } catch (error) {
    // Only the observed deprecated-wallet response enables this fallback.
    // Network failures, real zero balances and authentication failures stay
    // blocked; a local confirmation cannot override those conditions.
    if (!(error instanceof SiliconFlowError) || error.status !== 410) throw error;
  }
  const response = await fetchImpl(`${BASE}/v1/models?sub_type=text-to-video`, {
    method: 'GET', signal, redirect: 'error', headers: { Authorization: `Bearer ${apiKey}`, Accept: 'application/json' },
  });
  const payload = await readJSON(response, signal);
  if (!Array.isArray(payload?.data)) throw new SiliconFlowError(502, 'SiliconFlow chưa trả về danh sách mô hình hợp lệ để xác thực kết nối.');
  return {
    credit: null, balanceCheckAvailable: false, creditConfirmationRequired: true,
    modelAvailable: payload.data.some(item => item?.id === SILICONFLOW_MODELS[0].id),
  };
}

function sleep(ms, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) { reject(signal.reason); return; }
    const timer = setTimeout(() => { signal?.removeEventListener('abort', abort); resolve(); }, ms);
    const abort = () => { clearTimeout(timer); signal.removeEventListener('abort', abort); reject(signal.reason); };
    signal?.addEventListener('abort', abort, { once: true });
  });
}

export function isPublicAddress(value) {
  const family = isIP(value);
  if (family === 4) {
    const [a, b, c] = value.split('.').map(Number);
    return !(a === 0 || a === 10 || a === 127 || a >= 224
      || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254)
      || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168)
      || (a === 192 && b === 0 && [0, 2].includes(c))
      || (a === 198 && [18, 19].includes(b)) || (a === 198 && b === 51 && c === 100)
      || (a === 203 && b === 0 && c === 113));
  }
  // Accept global unicast only, excluding documentation and transition ranges.
  if (family === 6) {
    const [first, second = '0'] = value.split(':');
    return /^[23]/i.test(value) && !/^3fff:/i.test(value) && !/^2002:/i.test(value)
      && !(parseInt(first, 16) === 0x2001 && (parseInt(second || '0', 16) < 0x200 || parseInt(second, 16) === 0xdb8));
  }
  return false;
}

export function validateSiliconFlowResultURL(value) {
  let url;
  try { url = new URL(value); }
  catch { throw new SiliconFlowError(502, 'SiliconFlow chưa trả về địa chỉ video hợp lệ.'); }
  const host = url.hostname.toLowerCase();
  if (url.protocol !== 'https:' || url.username || url.password || (url.port && url.port !== '443')
    || isIP(host.replace(/^\[|\]$/g, '')) || !host.includes('.') || /(?:^|\.)(?:localhost|local|internal|lan|home|test|invalid)$/.test(host)) {
    throw new SiliconFlowError(502, 'Địa chỉ tải video chưa hợp lệ hoặc không thuộc Internet công khai.');
  }
  return url;
}

// SiliconFlow does not document one fixed result CDN. Resolve once, reject all
// private addresses, and pin the selected public IP to prevent DNS rebinding.
export async function publicVideoDownload(value, { signal } = {}) {
  const url = validateSiliconFlowResultURL(value);
  signal?.throwIfAborted();
  const addresses = await new Promise((resolve, reject) => {
    const abort = () => reject(signal.reason);
    signal?.addEventListener('abort', abort, { once: true });
    lookup(url.hostname, { all: true, verbatim: true }).then(resolve, reject)
      .finally(() => signal?.removeEventListener('abort', abort));
  });
  signal?.throwIfAborted();
  if (!addresses.length || addresses.some(item => !isPublicAddress(item.address))) throw new SiliconFlowError(502, 'Địa chỉ tải video không thuộc Internet công khai.');
  const pinned = addresses[0];
  return new Promise((resolve, reject) => {
    const request = https.request(url, {
      method: 'GET', signal, headers: { Accept: 'video/mp4' },
      lookup: (_host, options, callback) => options.all ? callback(null, [pinned]) : callback(null, pinned.address, pinned.family),
    }, response => {
      if (response.statusCode < 200 || response.statusCode >= 300) {
        response.destroy();
        reject(new SiliconFlowError(502, 'Chưa tải được video từ SiliconFlow; liên kết có thể đã hết hạn. Không tự tạo lại tác vụ.'));
        return;
      }
      resolve(new Response(Readable.toWeb(response), { status: response.statusCode, headers: response.headers }));
    });
    request.on('error', reject);
    request.end();
  });
}

export async function generateSiliconFlowVideo({ story, prompt, apiKey, fetchImpl = fetch, downloadImpl = publicVideoDownload, signal, pollIntervalMs = 5000 }) {
  const headers = { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', Accept: 'application/json' };
  const imageSize = { '16:9': '1280x720', '9:16': '720x1280', '1:1': '960x960' }[story.aspectRatio];
  const response = await fetchImpl(`${BASE}/v1/video/submit`, {
    method: 'POST', signal, redirect: 'error', headers,
    // Model produces a fixed five-second clip. No unsupported duration or fps.
    body: JSON.stringify({ model: story.model.id, prompt, image_size: imageSize }),
  });
  const submitted = await readJSON(response, signal);
  const requestId = submitted?.requestId;
  if (typeof requestId !== 'string' || requestId.length < 1 || requestId.length > 300) throw new SiliconFlowError(502, 'SiliconFlow chưa trả về mã tác vụ hợp lệ. Kiểm tra tài khoản trước khi tạo lại.');
  while (true) {
    await sleep(pollIntervalMs, signal);
    const statusResponse = await fetchImpl(`${BASE}/v1/video/status`, {
      method: 'POST', signal, redirect: 'error', headers, body: JSON.stringify({ requestId }),
    });
    const status = await readJSON(statusResponse, signal);
    if (status.status === 'Succeed') {
      const url = validateSiliconFlowResultURL(status?.results?.videos?.[0]?.url);
      return downloadImpl(url, { signal });
    }
    if (status.status === 'Failed') throw new SiliconFlowError(502, 'SiliconFlow báo tác vụ video thất bại. Kiểm tra lịch sử và số dư trước khi chủ động tạo lại.');
    if (!['InQueue', 'InProgress'].includes(status.status)) throw new SiliconFlowError(502, 'Trạng thái video SiliconFlow chưa xác định. Kiểm tra tài khoản trước khi gửi lại.');
  }
}
