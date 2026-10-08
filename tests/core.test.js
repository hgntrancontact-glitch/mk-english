import test from 'node:test';
import assert from 'node:assert/strict';
import {sheetId,calendarId,readSettings,apiError,calendarWindow,importSetup} from '../assets/core.js';

test('Sheet links identify a file and reject unrelated hosts', () => {
  assert.equal(sheetId('https://docs.google.com/spreadsheets/d/EXAMPLE_SHEET_123456/edit?gid=1'),'EXAMPLE_SHEET_123456');
  assert.throws(() => sheetId('https://evil.example/spreadsheets/d/EXAMPLE_SHEET_123456/edit'));
  assert.throws(() => sheetId('javascript:alert(1)'));
});
test('Calendar accepts IDs and Google src/cid links, rejects secret iCal URLs', () => {
  assert.equal(calendarId('teacher@example.com'),'teacher@example.com');
  assert.equal(calendarId('https://calendar.google.com/calendar/embed?src=teacher%40example.com'),'teacher@example.com');
  assert.equal(calendarId(`https://calendar.google.com/calendar/u/0?cid=${btoa('teacher@example.com')}`),'teacher@example.com');
  assert.throws(() => calendarId('https://calendar.google.com/calendar/u/0/r/week'));
  assert.throws(() => calendarId('https://calendar.google.com/calendar/ical/teacher/private-secret/basic.ics'));
});
test('Corrupt settings recover; duplicate sources and unknown secret fields are discarded', () => {
  assert.deepEqual(readSettings({getItem:()=>'{bad'},'key','default'),{clientId:'default',sheets:[],calendars:[]});
  const loaded = readSettings({getItem:()=>JSON.stringify({sheets:['EXAMPLE_SHEET_123456','EXAMPLE_SHEET_123456',null],calendars:['primary'],token:'FAKE-TOKEN'})},'key','default');
  assert.deepEqual(loaded,{clientId:'default',sheets:['EXAMPLE_SHEET_123456'],calendars:['primary']});
});
test('API errors provide recovery without exposing server bodies or tokens', () => {
  assert.match(apiError(403,{error:{details:[{reason:'SERVICE_DISABLED'}]}}),/API chưa được bật/);
  assert.match(apiError(401,{}),/hết hạn/);
  assert(!apiError(500,{error:{message:'SENSITIVE'}}).includes('SENSITIVE'));
});
test('Calendar read window lasts seven days across month boundary', () => {
  const window = calendarWindow(new Date('2026-12-29T17:00:00Z'));
  assert.equal(window.timeMax,'2027-01-05T17:00:00.000Z');
});
test('Launch configuration deduplicates sources and cannot replace authentication settings',()=>{
  const current={clientId:'original',sheets:['EXAMPLE_SHEET_123456'],calendars:[]};
  const next=importSetup(JSON.stringify({sheets:['EXAMPLE_SHEET_123456'],calendars:['teacher@example.com'],clientId:'malicious',token:'SECRET'}),current);
  assert.deepEqual(next,{clientId:'original',sheets:['EXAMPLE_SHEET_123456'],calendars:['teacher@example.com']});
  assert.throws(()=>importSetup(JSON.stringify({sheets:['https://evil.example/file'],calendars:[]}),current));
});
