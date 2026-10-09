import test from 'node:test';
import assert from 'node:assert/strict';
import {createTabSession} from '../assets/tab-session.js';
function fixture(){let text=null;const storage={getItem:()=>text,setItem:(_,v)=>text=v,removeItem:()=>text=null};return {store:createTabSession(storage,'tab',['sheets','calendar']),get:()=>text,set:v=>text=v};}
test('Reload reuses the original expiry; restoring never extends Google authorization',()=>{
  const f=fixture();f.store.save('client','short-token',3600,100000);assert.deepEqual(f.store.read('client',200000),{token:'short-token',expires:3670000});assert.equal(f.store.read('client',3670000),null);assert.equal(f.get(),null);
});
test('Changed client, partial scopes, corrupt or invalid expiry discard stored credentials',()=>{
  const f=fixture();f.store.save('client','short-token',3600,100000);assert.equal(f.store.read('different',100000),null);
  for(const change of [{scopes:['sheets']},{expires:Infinity},{expires:8000000},{issued:200000}]){f.store.save('client','token',3600,100000);f.set(JSON.stringify({...JSON.parse(f.get()),...change}));assert.equal(f.store.read('client',100000),null);}
  f.set('{broken');assert.equal(f.store.read('client'),null);
});
test('Blocked browser storage leaves a usable memory token; logout removes saved token',()=>{
  const store=createTabSession({getItem(){throw Error();},setItem(){throw Error();},removeItem(){throw Error();}},'key',[]);assert.equal(store.read('client'),null);assert.equal(store.save('client','token',3600).token,'token');store.clear();
  const f=fixture();f.store.save('client','token',3600);f.store.clear();assert.equal(f.store.read('client'),null);assert.throws(()=>f.store.save('client','token','bad'));assert.throws(()=>f.store.save('client','token',10));
});
