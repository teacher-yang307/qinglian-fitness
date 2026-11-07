import {handleApi} from '../worker/api.mjs';
import {freshState,updateProfile,CATALOG,validDate} from './domain.mjs';
export const STORAGE_KEY='qinglian-local-v1';
function empty(){return {schema:1,state:freshState(),history:[],requests:[]};}
export function readStore(storage){const raw=storage.getItem(STORAGE_KEY);return raw?validateBackup(JSON.parse(raw)):empty();}
export function validateBackup(value){
 const bad=()=>{throw new Error('备份格式不正确，原记录未改变');};
 if(!value||value.schema!==1||!value.state||!Array.isArray(value.history)||!Array.isArray(value.requests))bad();
 if(JSON.stringify(value).length>8000000)bad();value=structuredClone(value);
 const check=(v,depth=0)=>{if(depth>45)bad();if(v&&typeof v==='object')for(const[k,x]of Object.entries(v)){if(['__proto__','constructor','prototype'].includes(k))bad();check(x,depth+1);}};check(value);
 const s=value.state;if(!Number.isInteger(s.revision)||s.revision<0||!s.profile)bad();
 const profilePatch={...s.profile};if(profilePatch.background==='')delete profilePatch.background;for(const k of ['age','height','weight'])if(profilePatch[k]===null)delete profilePatch[k];
 s.profile=updateProfile(freshState().profile,profilePatch);
 for(const k of ['logs','reviews','plans','drafts','snapshots','sessions'])if(!s[k]||typeof s[k]!=='object'||Array.isArray(s[k]))bad();
 const tasks=t=>{if(!Array.isArray(t))bad();for(const a of t)if(!a||!CATALOG[a.id]||!Number.isFinite(a.minutes)||a.minutes<0||a.minutes>120)bad();};
 for(const [key,records]of Object.entries(s.logs)){if(!validDate(key)||!records||typeof records!=='object'||Array.isArray(records))bad();for(const[id,r]of Object.entries(records))if(!CATALOG[id]||!r||typeof r.done!=='boolean'||(r.minutes!=null&&(!Number.isFinite(r.minutes)||r.minutes<0)))bad();}
 for(const [key,t]of Object.entries(s.snapshots)){if(!validDate(key))bad();tasks(t);}
 const days=list=>{if(!Array.isArray(list))bad();for(const d of list){if(!d||!validDate(d.date))bad();tasks(d.tasks);}};
 for(const p of [...Object.values(s.plans),...Object.values(s.drafts)]){if(!p||!validDate(p.start))bad();days(p.days);}
 if(s.program){const p=s.program;if(!validDate(p.start)||!validDate(p.end)||typeof p.title!=='string'||!Array.isArray(p.cycles)||p.cycles.length!==4)bad();for(const c of p.cycles){if(!c||!validDate(c.start)||!Array.isArray(c.days)||c.days.length!==7)bad();days(c.days);}}
 for(const r of Object.values(s.reviews))if(!r||typeof r!=='object'||!Number.isFinite(r.weight))bad();
 for(const r of value.history)if(!r||!Number.isInteger(r.revision)||typeof r.operation!=='string'||typeof r.created_at!=='string')bad();
 return structuredClone(value);
}
export function restoreBackup(storage,backup){const checked=validateBackup(backup);const current=readStore(storage);checked.state.revision=Math.max(current.state.revision,checked.state.revision)+1;checked.history.push({revision:checked.state.revision,operation:'import',created_at:new Date().toISOString()});checked.requests=[];storage.setItem(STORAGE_KEY,JSON.stringify(checked));return checked;}
export function createLocalClient(storage){return async function localFetch(path,options={}){
 const db={prepare(sql){let args=[];return{bind(...v){args=v;return this;},async first(){const v=readStore(storage);if(sql.includes('request_id=?'))return v.requests.includes(args[1])?{revision:v.state.revision}:null;return v.state.revision?{revision:v.state.revision,state_json:JSON.stringify(v.state)}:null;},async all(){return {results:readStore(storage).history.slice().reverse().slice(0,30)};},async run(){const v=readStore(storage),expected=args.at(-1);if(v.state.revision!==expected)return {meta:{changes:0}};v.state=JSON.parse(args[4]);v.history.push({revision:args[1],operation:args[3],created_at:args[5]});v.requests.push(args[2]);v.requests=v.requests.slice(-1000);storage.setItem(STORAGE_KEY,JSON.stringify(v));return{meta:{changes:1}};}};}};
 try{const response=await handleApi(new Request('https://local.invalid'+path,{...options,headers:{...options.headers,'oai-authenticated-user-id':'browser-local'}}),{DB:db});if(response.status===500)return new Response(JSON.stringify({error:'本机存储不可用或已满，请先导出备份再重试'}),{status:503});return response;}catch{return new Response(JSON.stringify({error:'无法读取本机记录，请检查备份或浏览器存储权限'}),{status:503});}
};}

export const RESET_BACKUP_KEY='qinglian-before-reset-v1';
export function hasResetBackup(storage){try{return !!storage.getItem(RESET_BACKUP_KEY);}catch{return false;}}
export function resetTrainingPlan(storage,expectedRevision){
 const current=readStore(storage);
 if(current.state.revision!==expectedRevision)throw new Error('记录已在其他页面更新，请刷新后再重置');
 const next={schema:1,state:freshState(),history:[...current.history],requests:[]};
 next.state.profile=structuredClone(current.state.profile);next.state.revision=current.state.revision+1;
 next.history.push({revision:next.state.revision,operation:'reset-program',created_at:new Date().toISOString()});
 // Save a recoverable copy before replacing the active records. A failed write never clears data.
 storage.setItem(RESET_BACKUP_KEY,JSON.stringify(current));
 storage.setItem(STORAGE_KEY,JSON.stringify(next));return next;
}
export function restoreBeforeReset(storage){const raw=storage.getItem(RESET_BACKUP_KEY);if(!raw)throw new Error('没有找到重置前的记录');return restoreBackup(storage,JSON.parse(raw));}
