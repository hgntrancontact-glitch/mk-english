// Keep a short-lived Google token in this tab so reloading does not lose it.
// Never extend Google's expiry or store refresh tokens/client secrets.
export function createTabSession(storage,key,requiredScopes){
  function clear(){try{storage.removeItem(key);}catch{}}
  function read(clientId,now=Date.now()){
    try{
      const value=JSON.parse(storage.getItem(key)||'null');
      if(!value)return null;
      if(value.clientId!==clientId||typeof value.token!=='string'||!value.token||value.token.length>8192||!Number.isFinite(value.expires)||!Number.isFinite(value.issued)||value.issued>now+1000||value.expires<=now||value.expires>value.issued+3600000||!Array.isArray(value.scopes)||!requiredScopes.every(s=>value.scopes.includes(s))){clear();return null;}
      return {token:value.token,expires:value.expires};
    }catch{clear();return null;}
  }
  function save(clientId,token,lifetime,now=Date.now()){
    const seconds=Number(lifetime);if(typeof token!=='string'||!token||token.length>8192||!Number.isFinite(seconds)||seconds<=30)throw new Error('Phiên Google không hợp lệ. Hãy kết nối lại.');
    const expires=now+(Math.min(seconds,3600)-30)*1000;
    try{storage.setItem(key,JSON.stringify({clientId,token,issued:now,expires,scopes:requiredScopes}));}catch{/* Storage can be blocked; current page still works in memory. */}
    return {token,expires};
  }
  return {read,save,clear};
}
