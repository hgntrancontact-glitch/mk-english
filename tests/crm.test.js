import test from 'node:test';
import assert from 'node:assert/strict';
import {compareCells,visibleColumns,groupFields,displayValue} from '../assets/crm-model.js';

test('CRM sorting compares Vietnamese money and dates by value, and preserves class-code ordering',()=>{
  assert(compareCells('900.000 đ','1.800.000 đ')<0);
  assert(compareCells('1.800.000,50 ₫',1800000)>0);
  assert(compareCells('31/12/2025','01/01/2026')<0);
  assert(compareCells('TA2','TA10')<0);
  assert(compareCells('',0)<0);
});
test('Compact columns tolerate changed schemas; full view and record sections retain all fields',()=>{
  const headers=['Stt','Lớp học','Mã nhóm lớp','Tình trạng','Note','Trường mới'];
  assert.deepEqual(visibleColumns(headers,'Lớp học'),[1,2,3]);
  assert.deepEqual(visibleColumns(headers,'Lớp học',true),[0,1,2,3,4,5]);
  assert.deepEqual([...groupFields(headers).values()].flat().sort(),[...headers].sort());
  assert.equal(displayValue(false),'Chưa');assert.equal(displayValue(0),'0');assert.equal(displayValue(''),'—');
});
