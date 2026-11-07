import {planningInput,validateAIWeek,deepSeekMessages,AI_PROMPT_VERSION} from '../src/ai-plan.mjs';
const json=(data,status=200,headers={})=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...headers}});
const hash=async str=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(str)))].map(x=>x.toString(16).padStart(2,'0')).join('');
async function limitedText(request,max){const reader=request.body?.getReader();if(!reader)return '';let length=0,parts=[];while(true){const {value,done}=await reader.read();if(done)break;length+=value.length;if(length>max){await reader.cancel();throw Object.assign(new Error('请求内容过大'),{status:413});}parts.push(value);}const bytes=new Uint8Array(length);let offset=0;for(const p of parts){bytes.set(p,offset);offset+=p.length;}return new TextDecoder().decode(bytes);}
export async function handleGenerate(request,env,fetcher=fetch){
 const origin=request.headers.get('Origin'),allow=env.ALLOWED_ORIGIN;
 const headers=origin===allow?{'Access-Control-Allow-Origin':allow,'Vary':'Origin'}:{};
 try{
  if(!allow||origin!==allow)return json({error:'请求来源不允许'},403);
  const path=new URL(request.url).pathname;
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:{...headers,'Access-Control-Allow-Methods':'POST, GET, OPTIONS','Access-Control-Allow-Headers':'Content-Type, X-Access-Code','Access-Control-Max-Age':'600'}});
  if(path==='/health'&&request.method==='GET'){
   if(new URL(request.url).searchParams.has('probe')){if(!env.GENERATION_ACCESS_CODE||await hash(request.headers.get('X-Access-Code')||'')!==await hash(env.GENERATION_ACCESS_CODE))return json({error:'邀请码不正确'},401,headers);const response=await fetcher('https://api.deepseek.com/models',{headers:{Authorization:'Bearer '+env.DEEPSEEK_API_KEY},redirect:'manual'});let result;try{result=JSON.parse(await limitedText(response,30000));}catch{result={};}return json({status:response.status,models:(result.data||[]).map(x=>x.id),error:result.error?.type||null},200,headers);}
   return json({ready:!!(env.DEEPSEEK_API_KEY&&env.GENERATION_ACCESS_CODE&&env.BUDGET),provider:'DeepSeek'},200,headers);
  }
  if(path!=='/generate'||request.method!=='POST')return json({error:'接口不存在'},404,headers);
  if(!env.DEEPSEEK_API_KEY||!env.GENERATION_ACCESS_CODE||!env.BUDGET)return json({error:'AI 服务尚未配置完成'},503,headers);
  if(await hash(request.headers.get('X-Access-Code')||'')!==await hash(env.GENERATION_ACCESS_CODE))return json({error:'请输入有效的内测邀请码'},401,headers);
  if(!request.headers.get('Content-Type')?.startsWith('application/json'))return json({error:'需要 JSON 请求'},415,headers);
  let data;try{data=JSON.parse(await limitedText(request,20000));}catch(e){return json({error:e.status?e.message:'请求格式不正确'},e.status||400,headers);}
  const input=planningInput(data);
  if(typeof data.requestId!=='string'||!/^[a-zA-Z0-9-]{16,64}$/.test(data.requestId))return json({error:'请求编号不正确'},400,headers);
  const diagnostic=data.diagnostics===true;
  if(diagnostic){const expected={age:35,height:175,weight:75,goal:'保持健康',experience:'初学者',days:[0,2,5],duration:35,equipment:'居家 · 徒手',limits:'暂无',diet:'普通家常菜，无已知忌口'};if(Object.entries(expected).some(([k,v])=>JSON.stringify(input.profile[k])!==JSON.stringify(v)))return json({error:'自测只能使用固定的虚构资料'},400,headers);}
  const client=await hash(env.GENERATION_ACCESS_CODE+'|'+(diagnostic?'diagnostics|':'')+(request.headers.get('CF-Connecting-IP')||'unknown'));
  const gate=env.BUDGET.get(env.BUDGET.idFromName('generation-budget'));
  const reservation=await gate.fetch('https://budget/reserve',{method:'POST',body:JSON.stringify({client,requestId:data.requestId})});
  if(!reservation.ok)return json({error:'生成次数已达上限或请求正在处理中，请稍后重试'},429,{...headers,'Retry-After':'60'});
  const model=env.DEEPSEEK_MODEL||'deepseek-flash';
  let response;try{response=await fetcher('https://api.deepseek.com/chat/completions',{method:'POST',headers:{Authorization:'Bearer '+env.DEEPSEEK_API_KEY,'Content-Type':'application/json'},body:JSON.stringify({model,messages:deepSeekMessages(input),response_format:{type:'json_object'},thinking:{type:'disabled'},max_tokens:5000,stream:false}),signal:AbortSignal.timeout(60000),redirect:'manual'});}catch{return json({error:'DeepSeek 连接失败或超时，原计划保持不变'},502,headers);}
  if(!response.ok)return json({error:response.status===429?'DeepSeek 服务繁忙或额度受限，请稍后重试':'DeepSeek 调用失败，请联系站点维护者检查配置'},502,headers);
  let body;try{body=JSON.parse(await limitedText(response,150000));}catch{return json({error:'DeepSeek 返回无法读取，原计划保持不变'},502,headers);}
  const choice=body.choices?.[0],content=choice?.message?.content;
  if(choice?.finish_reason!=='stop'||typeof content!=='string'||!content.trim())return json({error:'AI 返回为空或不完整，请重试，原计划未改变'},502,headers);
  let raw;const clean=content.trim().replace(/^```(?:json)?\s*([\s\S]*?)\s*```$/i,'$1');try{raw=JSON.parse(clean);}catch{return json({error:'AI 返回格式不正确，原计划未改变',format:{first:clean.slice(0,1),last:clean.slice(-1),length:clean.length,fenced:content.trim().startsWith('```')}},502,headers);}
  // Validate before returning; send raw structured data only, never prompts or secrets.
  validateAIWeek(raw,input.profile,input.start);
  return json({result:raw,model,promptVersion:AI_PROMPT_VERSION,usage:{inputTokens:body.usage?.prompt_tokens||0,outputTokens:body.usage?.completion_tokens||0}},200,headers);
 }catch(e){return json({error:e.status?e.message:'AI 服务暂时不可用'},e.status||500,headers);}
}
export default{fetch(request,env){return handleGenerate(request,env);}};
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
