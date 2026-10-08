import {EXPECTED_TABS} from './config.js?v=0.4.0';
import {weekWindow,readCalendar} from './calendar-model.js?v=0.4.0';

// Private records live only in this authenticated session, never in browser storage.
export function createDataStore(getGoogle) {
  const books=new Map(),calendars=new Map();let epoch=0;
  const range=name=>`'${name.replaceAll("'","''")}'`;
  const base=source=>`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(source)}/values`;
  function bookFor(source){if(!books.has(source))books.set(source,{tables:new Map(),reads:new Map(),batch:null,single:false});return books.get(source);}
  function cancelled(){throw new Error('Phiên dữ liệu đã thay đổi.');}
  function batch(source,book) {
    if(book.batch)return book.batch;
    const session=epoch,params=new URLSearchParams({valueRenderOption:'FORMATTED_VALUE'});
    for(const name of EXPECTED_TABS)params.append('ranges',range(name));
    const task=getGoogle(`${base(source)}:batchGet?${params}`).then(data=>{
      if(session!==epoch)return cancelled();
      if(data.valueRanges?.length!==EXPECTED_TABS.length)throw new Error('Google trả về bộ bảng chưa đầy đủ. Bấm Tải lại để thử lại.');
      EXPECTED_TABS.forEach((name,i)=>{if(!book.tables.has(name))book.tables.set(name,data.valueRanges[i]);});
    }).catch(error=>{
      if(session!==epoch)return cancelled();
      // A renamed/missing tab must not prevent access to the other valid tabs.
      if(error.status===400){book.single=true;return;}
      throw error;
    }).finally(()=>{if(book.batch===task)book.batch=null;});
    book.batch=task;return task;
  }
  async function table(source,name,refresh=false) {
    const session=epoch,book=bookFor(source);
    if(book.reads.has(name))return book.reads.get(name);
    if(!refresh&&book.tables.has(name))return book.tables.get(name);
    if(!refresh&&!book.single){await batch(source,book);if(session!==epoch)return cancelled();if(book.tables.has(name))return book.tables.get(name);}
    if(book.reads.has(name))return book.reads.get(name);
    const task=getGoogle(`${base(source)}/${encodeURIComponent(range(name))}?valueRenderOption=FORMATTED_VALUE`).then(data=>{
      if(session!==epoch)return cancelled();book.tables.set(name,data);return data;
    }).finally(()=>{if(book.reads.get(name)===task)book.reads.delete(name);});
    book.reads.set(name,task);return task;
  }
  function calendar(source,refresh=false,window=weekWindow()) {
    const key=JSON.stringify([source,window.timeMin,window.timeMax]);
    const current=calendars.get(key);
    if(current?.pending)return current.pending;
    if(!refresh&&current?.data)return Promise.resolve(current.data);
    const session=epoch,entry=current||{};
    const task=readCalendar(getGoogle,source,window).then(data=>{
      if(session!==epoch)return cancelled();entry.data=data;return data;
    }).finally(()=>{if(entry.pending===task)entry.pending=null;});
    entry.pending=task;calendars.set(key,entry);return task;
  }
  return {table,calendar,clearCalendar(){calendars.clear();},clear(){epoch++;books.clear();calendars.clear();}};
}
