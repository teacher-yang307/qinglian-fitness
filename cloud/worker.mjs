import {planningInput,PLAN_CONTRACT_VERSION} from '../src/ai-plan.mjs';
import {generateValidatedWeek} from './deepseek.mjs';
import {LIBRARY_VERSION} from '../src/catalog.mjs';
const json=(data,status=200,headers={})=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...headers}});
const hash=async str=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(str)))].map(x=>x.toString(16).padStart(2,'0')).join('');
async function limitedText(request,max){const reader=request.body?.getReader();if(!reader)return '';let length=0,parts=[];while(true){const {value,done}=await reader.read();if(done)break;length+=value.length;if(length>max){await reader.cancel();throw Object.assign(new Error('请求内容过大'),{status:413});}parts.push(value);}const bytes=new Uint8Array(length);let offset=0;for(const p of parts){bytes.set(p,offset);offset+=p.length;}return new TextDecoder().decode(bytes);}
export async function handleGenerate(request,env,fetcher=fetch,options={}){
 const origin=request.headers.get('Origin'),allow=env.ALLOWED_ORIGIN;
 const headers=origin===allow?{'Access-Control-Allow-Origin':allow,'Vary':'Origin'}:{};
 try{
  if(!allow||origin!==allow)return json({error:'请求来源不允许'},403);
  const path=new URL(request.url).pathname;
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:{...headers,'Access-Control-Allow-Methods':'POST, GET, OPTIONS','Access-Control-Allow-Headers':'Content-Type, X-Access-Code','Access-Control-Max-Age':'600'}});
  if(path==='/health'&&request.method==='GET'){
   if(new URL(request.url).searchParams.has('probe')){if(!env.GENERATION_ACCESS_CODE||await hash(request.headers.get('X-Access-Code')||'')!==await hash(env.GENERATION_ACCESS_CODE))return json({error:'邀请码不正确'},401,headers);const response=await fetcher('https://api.deepseek.com/models',{headers:{Authorization:'Bearer '+env.DEEPSEEK_API_KEY},redirect:'manual'});let result;try{result=JSON.parse(await limitedText(response,30000));}catch{result={};}return json({status:response.status,models:(result.data||[]).map(x=>x.id),error:result.error?.type||null},200,headers);}
   return json({ready:!!(env.DEEPSEEK_API_KEY&&env.GENERATION_ACCESS_CODE),provider:'DeepSeek',generationLimitsEnabled:false,libraryVersion:LIBRARY_VERSION,contractVersion:PLAN_CONTRACT_VERSION},200,headers);
  }
  if(path!=='/generate'||request.method!=='POST')return json({error:'接口不存在'},404,headers);
  if(!env.DEEPSEEK_API_KEY||!env.GENERATION_ACCESS_CODE)return json({error:'AI 服务尚未配置完成'},503,headers);
  if(await hash(request.headers.get('X-Access-Code')||'')!==await hash(env.GENERATION_ACCESS_CODE))return json({error:'请输入有效的内测邀请码'},401,headers);
  if(!request.headers.get('Content-Type')?.startsWith('application/json'))return json({error:'需要 JSON 请求'},415,headers);
  let data;try{data=JSON.parse(await limitedText(request,20000));}catch(e){return json({error:e.status?e.message:'请求格式不正确'},e.status||400,headers);}
  if(data.contractVersion!==PLAN_CONTRACT_VERSION||data.libraryVersion!==LIBRARY_VERSION)return json({error:'页面和动作库已更新，请刷新后重新生成',code:'CLIENT_UPDATE_REQUIRED'},409,headers);
  const input=planningInput(data);
  if(typeof data.requestId!=='string'||!/^[a-zA-Z0-9-]{16,64}$/.test(data.requestId))return json({error:'请求编号不正确'},400,headers);
  const diagnostic=data.diagnostics===true;
  if(diagnostic){const expected={age:35,height:175,weight:75,goal:'保持健康',experience:'初学者',days:[0,2,5],duration:35,equipment:'居家 · 徒手',limits:'暂无',diet:'普通家常菜，无已知忌口'};if(Object.entries(expected).some(([k,v])=>JSON.stringify(input.profile[k])!==JSON.stringify(v)))return json({error:'自测只能使用固定的虚构资料'},400,headers);}
  return json(await generateValidatedWeek(input,env,fetcher,request.signal,options),200,headers);
 }catch(e){return json({error:e.status?e.message:'AI 服务暂时不可用',...(e.attempts?{generation:{attempts:e.attempts}}:{}),...(e.issue?{issue:e.issue}:{})},e.status||500,headers);}
}
export default{fetch(request,env){return handleGenerate(request,env);}};
// Retain the previously deployed Durable Object class for migration compatibility.
// Generation no longer calls this object or uses its stored counters.
export class BudgetGate{
 constructor(ctx,env){this.ctx=ctx;this.env=env;}
 async fetch(request){
  const {client,requestId}=await request.json();if(!/^[0-9a-f]{64}$/.test(client)||typeof requestId!=='string')return json({},400);
  const day=new Date().toISOString().slice(0,10),now=Date.now();
  const globalLimit=Math.max(1,Math.min(200,Number(this.env.DAILY_CALL_LIMIT)||30)),perIP=Math.max(1,Math.min(10,Number(this.env.PER_IP_DAILY_LIMIT)||3));
  const allowed=await this.ctx.storage.transaction(async tx=>{let v=await tx.get('usage');if(!v||v.day!==day)v={day,total:0,clients:{},requests:{}};const c=v.clients[client]||{count:0,last:0};if(v.total>=globalLimit||c.count>=perIP||now-c.last<60000||v.requests[requestId])return false;v.total++;v.clients[client]={count:c.count+1,last:now};v.requests[requestId]=true;await tx.put('usage',v);return true;});
  return json({allowed},allowed?200:429);
 }
}
