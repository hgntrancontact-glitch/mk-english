import {$,el} from './dom.js?v=0.5.0';
export function editing(){return Boolean($('entry-host').querySelector('[data-kind="edit"]'));}
export function closePanel(force=false){
  const host=$('entry-host'),panel=host.firstElementChild;
  if(!force&&panel?.dataset.busy==='true')return false;
  panel?.dispatchEvent(new Event('panel-close'));host.replaceChildren();host.hidden=true;$('workspace-body').classList.remove('has-panel');window.dispatchEvent(new Event('resize'));return true;
}
export function openPanel(title,{kind='edit',subtitle=''}={}){
  if(editing())throw new Error('Hoàn tất hoặc đóng biểu mẫu đang mở trước khi chuyển hồ sơ.');
  closePanel();const host=$('entry-host'),panel=el('section',undefined,'entry-panel'),heading=el('div',undefined,'panel-heading'),copy=el('div'),h=el('h2',title),close=el('button','Đóng'),body=el('div',undefined,'entry-body'),actions=el('div',undefined,'panel-actions');
  const previous=document.activeElement;panel.dataset.kind=kind;panel.setAttribute('aria-label',title);h.tabIndex=-1;copy.append(el('p',kind==='edit'?'NHẬP LIỆU':'HỒ SƠ', 'eyebrow'),h);if(subtitle)copy.append(el('p',subtitle,'panel-subtitle'));heading.append(copy,close);panel.append(heading,body,actions);host.append(panel);host.hidden=false;$('workspace-body').classList.add('has-panel');
  panel.close=()=>{if(closePanel()){if(previous?.isConnected)previous.focus();}};
  close.onclick=()=>panel.close();panel.addEventListener('keydown',event=>{if(event.key==='Escape'&&panel.dataset.busy!=='true'){event.preventDefault();panel.close();}});
  requestAnimationFrame(()=>{if(panel.isConnected){h.focus({preventScroll:true});window.dispatchEvent(new Event('resize'));}});
  return {panel,body,actions,setBusy(value){panel.dataset.busy=String(value);close.disabled=value;}};
}
