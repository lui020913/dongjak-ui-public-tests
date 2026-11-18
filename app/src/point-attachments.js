/**
 * Survey-point attachments are private, device-local IndexedDB Blobs.
 * They are not uploaded to any server, and survive normal page reloads.
 * Storage can still be removed by the browser or by clearing website data.
 */
export const ATTACHMENT_DB_NAME = 'dongjak_survey_point_attachments_v1';
export const MAX_POINT_FILES = 6;
export const MAX_SINGLE_FILE_BYTES = 8 * 1024 * 1024;
export const MAX_POINT_TOTAL_BYTES = 24 * 1024 * 1024;
export const ACCEPTED_POINT_FILE_EXTENSIONS = new Set([
  'jpg','jpeg','png','webp','heic','heif',
  'pdf','txt','csv','hwp','hwpx','doc','docx','xls','xlsx','ppt','pptx'
]);
const PHOTO_EXTENSIONS = new Set(['jpg','jpeg','png','webp','heic','heif']);
const INLINE_PHOTO_EXTENSIONS = new Set(['jpg','jpeg','png','webp']);
const STORE = 'point-files';
let dbPromise;

export function safeFileExtension(name) {
  const match = String(name || '').trim().toLowerCase().match(/\.([a-z0-9]+)$/);
  return match?.[1] || '';
}
export function isPointImage(entry) {
  return PHOTO_EXTENSIONS.has(safeFileExtension(entry?.name));
}
export function canPreviewPointImage(entry) {
  return INLINE_PHOTO_EXTENSIONS.has(safeFileExtension(entry?.name));
}
export function checkPointAttachmentSelection(existing, incoming, removedIds = new Set()) {
  const retained = (existing || []).filter(file => !removedIds.has(file.id));
  const all = [...retained, ...(incoming || [])];
  if (all.length > MAX_POINT_FILES) throw new Error(`사진과 파일은 지점당 최대 ${MAX_POINT_FILES}개까지 저장할 수 있습니다.`);
  let total = 0;
  for (const file of all) {
    const extension = safeFileExtension(file.name);
    if (!ACCEPTED_POINT_FILE_EXTENSIONS.has(extension)) throw new Error(`${file.name}: 지원하지 않는 파일 형식입니다.`);
    if (!Number.isFinite(file.size) || file.size <= 0) throw new Error(`${file.name}: 비어 있거나 크기를 확인할 수 없는 파일입니다.`);
    if (file.size > MAX_SINGLE_FILE_BYTES) throw new Error(`${file.name}: 파일 1개는 8MB 이하여야 합니다.`);
    total += file.size;
  }
  if (total > MAX_POINT_TOTAL_BYTES) throw new Error('한 지점의 첨부파일 총크기는 24MB 이하여야 합니다.');
  return all;
}
function database() {
  if (dbPromise) return dbPromise;
  if (typeof indexedDB === 'undefined') return Promise.reject(new Error('이 브라우저는 파일 보관 기능을 지원하지 않습니다.'));
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(ATTACHMENT_DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, {keyPath:'id'});
        store.createIndex('pointId', 'pointId', {unique:false});
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('파일 저장소를 열지 못했습니다.'));
    request.onblocked = () => reject(new Error('다른 창에서 파일 저장소를 사용 중입니다. 창을 닫고 다시 시도하세요.'));
  }).catch(error => { dbPromise = null; throw error; });
  return dbPromise;
}
export async function getPointAttachments(pointId) {
  if (!pointId) return [];
  const db = await database();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE, 'readonly');
    const req = transaction.objectStore(STORE).index('pointId').getAll(pointId);
    req.onsuccess = () => resolve((req.result || []).sort((a,b)=>a.createdAt-b.createdAt));
    req.onerror = () => reject(req.error || new Error('첨부파일 목록을 불러오지 못했습니다.'));
    transaction.onerror = () => reject(transaction.error || new Error('첨부파일 조회에 실패했습니다.'));
  });
}
export async function updatePointAttachments(pointId, incomingFiles = [], removedIds = new Set()) {
  if (!pointId) throw new Error('지점 ID가 없습니다.');
  // Allow text-only point registration even if IndexedDB is unavailable.
  if (!incomingFiles.length && !removedIds.size) return [];
  const existing = await getPointAttachments(pointId);
  checkPointAttachmentSelection(existing, incomingFiles, removedIds);
  const db = await database();
  await new Promise((resolve,reject) => {
    const transaction = db.transaction(STORE, 'readwrite');
    const store = transaction.objectStore(STORE);
    for (const id of removedIds) {
      if (existing.some(entry=>entry.id===id)) store.delete(id);
    }
    for (const file of incomingFiles) {
      store.put({id: `${pointId}:${crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`}`,
        pointId, name: String(file.name).slice(0, 180), size:file.size,
        type:file.type||'application/octet-stream', blob:file,
        createdAt:Date.now()});
    }
    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error || new Error('첨부파일 저장 실패'));
    transaction.onabort = () => reject(transaction.error || new Error('파일 저장이 중단됐습니다.'));
  });
  return getPointAttachments(pointId);
}
export async function deletePointAttachments(pointId) {
  const existing = await getPointAttachments(pointId);
  if (!existing.length) return;
  return updatePointAttachments(pointId, [], new Set(existing.map(entry=>entry.id)));
}
export function pointFileToDataURL(file) {
  return new Promise((resolve,reject)=>{
    const reader=new FileReader();
    reader.onload=()=>resolve(reader.result);
    reader.onerror=()=>reject(new Error('백업용 첨부파일을 읽지 못했습니다.'));
    reader.readAsDataURL(file);
  });
}
