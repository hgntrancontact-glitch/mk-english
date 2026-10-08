import test from 'node:test';
import assert from 'node:assert/strict';
import {createDataStore} from '../assets/data-store.js';
import {EXPECTED_TABS} from '../assets/config.js';

const snapshot=()=>({valueRanges:EXPECTED_TABS.map(name=>({values:[['Tên'],[name]]}))});
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};

test('All eight tabs share one batch, including concurrent first clicks; source IDs stay isolated',async()=>{
  const calls=[],held=deferred(),store=createDataStore(url=>{calls.push(new URL(url));return calls.length===1?held.promise:Promise.resolve(snapshot());});
  const first=store.table('book-a','Lớp học'),second=store.table('book-a','Học phí');
  assert.equal(calls.length,1);assert.deepEqual(calls[0].searchParams.getAll('ranges'),EXPECTED_TABS.map(name=>`'${name}'`));
  held.resolve(snapshot());await Promise.all([first,second]);
  for(const name of EXPECTED_TABS)assert.equal((await store.table('book-a',name)).values[1][0],name);
  assert.equal(calls.length,1);await store.table('book-b','Lớp học');assert.equal(calls.length,2);
});

test('Single-tab refresh survives older batch completion; refresh errors remain retryable',async()=>{
  const held=deferred();let reads=0;
  const fresh={values:[['Tên'],['Mới']]};
  const store=createDataStore(url=>{if(url.includes('batchGet'))return held.promise;reads++;return reads===2?Promise.reject(new Error('offline')):Promise.resolve(fresh);});
  const initial=store.table('book','Lớp học');
  assert.deepEqual(await store.table('book','Học phí',true),fresh);
  held.resolve(snapshot());await initial;assert.deepEqual(await store.table('book','Học phí'),fresh);
  await assert.rejects(store.table('book','Học phí',true),/offline/);
  assert.deepEqual(await store.table('book','Học phí',true),fresh);assert.equal(reads,3);
});

test('Missing tab falls back to individual reads; authorization failure never fans out',async()=>{
  const calls=[],store=createDataStore(async url=>{calls.push(url);if(url.includes('batchGet'))throw Object.assign(new Error('bad range'),{status:400});return {values:[['valid']]};});
  await store.table('book','Lớp học');await store.table('book','Học phí');assert.equal(calls.length,3);
  let authCalls=0;const denied=createDataStore(async()=>{authCalls++;throw Object.assign(new Error('denied'),{status:403});});
  await assert.rejects(denied.table('book','Lớp học'),/denied/);assert.equal(authCalls,1);
});

test('Failed/incomplete batches can retry and never map one tab to another',async()=>{
  let calls=0;const store=createDataStore(async()=>++calls===1?{valueRanges:[]}:snapshot());
  await assert.rejects(store.table('book','Lớp học'),/chưa đầy đủ/);
  assert.equal((await store.table('book','Học phí')).values[1][0],'Học phí');assert.equal(calls,2);
});

test('Logout clears snapshots and rejects old batch/calendar responses',async()=>{
  const sheet=deferred(),cal=deferred();let calls=0;
  const store=createDataStore(url=>{calls++;return url.includes('calendar/v3')?cal.promise:sheet.promise;});
  const first=store.table('book','Lớp học'),calendar=store.calendar('calendar');
  const checked=Promise.all([assert.rejects(first,/Phiên dữ liệu/),assert.rejects(calendar,/Phiên dữ liệu/)]);
  store.clear();sheet.resolve(snapshot());cal.resolve({items:[]});await checked;
  await store.table('book','Học phí');await store.calendar('calendar');assert.equal(calls,4);
});

test('Calendar warmup shares the first click, caches success, and retries failure',async()=>{
  const held=deferred();let calls=0;const store=createDataStore(()=>{calls++;return calls===1?held.promise:Promise.resolve({items:[]});});
  const a=store.calendar('cal'),b=store.calendar('cal');assert.equal(a,b);held.reject(new Error('offline'));
  await assert.rejects(a,/offline/);await assert.rejects(b,/offline/);
  await store.calendar('cal');await store.calendar('cal');assert.equal(calls,2);
  await store.calendar('cal',true);assert.equal(calls,3);
});
