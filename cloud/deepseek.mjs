import {deepSeekMessages,validateAIWeek,AI_PROMPT_VERSION} from '../src/ai-plan.mjs';
import {GENERATION_POLICY,EXERCISE_CONTRACT_VERSION} from '../src/exercise-contract.mjs';
import {withDeadline} from '../src/deadline.mjs';

const generationError=(message,details={})=>Object.assign(new Error(message),{status:502,code:'AI_GENERATION_FAILED',retryable:true,...details});
async function limitedResponse(response,max,signal){
 const reader=response.body?.getReader();if(!reader)return '';
 const cancel=()=>{reader.cancel().catch(()=>{});};
 if(signal?.aborted){cancel();throw signal.reason;}
 signal?.addEventListener('abort',cancel,{once:true});
 let length=0;const parts=[];
 try{while(true){const {value,done}=await reader.read();if(done)break;length+=value.length;if(length>max){await reader.cancel();throw generationError('模型回答过长，请精简后返回完整 JSON');}parts.push(value);}}
 finally{signal?.removeEventListener('abort',cancel);reader.releaseLock();}
 const bytes=new Uint8Array(length);let offset=0;for(const p of parts){bytes.set(p,offset);offset+=p.length;}return new TextDecoder().decode(bytes);
}
function wait(ms,signal){return new Promise((resolve,reject)=>{
 if(signal.aborted){reject(generationError('生成已取消'));return;}
 const abort=()=>{clearTimeout(timer);reject(generationError('生成已取消'));};
 const timer=setTimeout(()=>{signal.removeEventListener('abort',abort);resolve();},ms);
 signal.addEventListener('abort',abort,{once:true});
});}
function providerError(response){
 const status=response.status;
 if(status===401||status===403)return generationError('DeepSeek 密钥或访问权限不可用，请联系站点维护者检查配置',{retryable:false});
 if(status===402)return generationError('DeepSeek 调用余额不足，请联系站点维护者充值',{retryable:false});
 if(status===429||status>=500)return generationError(status===429?'DeepSeek 服务繁忙，请稍后重试':'DeepSeek 服务暂时不可用',{transient:true,retryAfterSeconds:Number(response.headers.get('Retry-After'))||0});
 return generationError('DeepSeek 请求配置不被接受，请联系站点维护者检查配置',{retryable:false});
}
export async function generateValidatedWeek(input,env,fetcher=fetch,requestSignal,options={}){
 const {maxAttempts,attemptTimeoutMs,totalTimeoutMs}={...GENERATION_POLICY,...options.policy};
 const sleep=options.sleep||wait,now=options.now||Date.now,deadline=now()+totalTimeoutMs;
 const overallSignal=AbortSignal.any([AbortSignal.timeout(totalTimeoutMs),...(requestSignal?[requestSignal]:[])]);
 const baseMessages=deepSeekMessages(input),model=env.DEEPSEEK_MODEL||'deepseek-flash';
 let messages=baseMessages,lastError,attempts=0;
 const usage={inputTokens:0,outputTokens:0};
 for(let index=0;index<maxAttempts;index++){
  if(requestSignal?.aborted)throw generationError('生成已取消，原计划未改变',{status:499,retryable:false,attempts});
  if(overallSignal.aborted||now()>=deadline){lastError=generationError('生成等待超时，请稍后重试',{status:504});break;}
  attempts++;let content='';
  try{
   const envelope=await withDeadline(async callSignal=>{
    let response;
    try{response=await fetcher('https://api.deepseek.com/chat/completions',{method:'POST',headers:{Authorization:'Bearer '+env.DEEPSEEK_API_KEY,'Content-Type':'application/json'},body:JSON.stringify({model,messages,response_format:{type:'json_object'},thinking:{type:'disabled'},max_tokens:5000,stream:false}),signal:callSignal,redirect:'manual'});}
    catch{throw generationError('DeepSeek 连接失败或超时',{transient:true});}
    if(!response.ok){const error=providerError(response);response.body?.cancel().catch(()=>{});throw error;}
    try{return JSON.parse(await limitedResponse(response,150000,callSignal));}catch(error){if(error.code==='AI_GENERATION_FAILED')throw error;if(callSignal.aborted)throw callSignal.reason;throw generationError('模型响应无法读取，请返回完整 JSON');}
   },{timeoutMs:Math.max(1,Math.min(attemptTimeoutMs,deadline-now())),signal:overallSignal});
   for(const [key,source] of [['inputTokens','prompt_tokens'],['outputTokens','completion_tokens']]){const value=envelope.usage?.[source];if(Number.isFinite(value)&&value>=0)usage[key]+=value;}
   const choice=envelope.choices?.[0];content=typeof choice?.message?.content==='string'?choice.message.content:'';
   if(choice?.finish_reason!=='stop'||!content.trim())throw generationError('模型回答为空或被截断，请精简内容并返回完整七天 JSON');
   const clean=content.trim().replace(/^```(?:json)?\s*([\s\S]*?)\s*```$/i,'$1');
   let raw;try{raw=JSON.parse(clean);}catch{throw generationError('JSON 格式不正确，请检查引号、逗号、括号并返回完整七天 JSON');}
   validateAIWeek(raw,input.profile,input.start,input);
   if(overallSignal.aborted)throw generationError('生成等待超时，请稍后重试',{status:504});
   return{result:raw,model,promptVersion:AI_PROMPT_VERSION,exerciseContractVersion:EXERCISE_CONTRACT_VERSION,usage,generation:{attempts,maxAttempts}};
  }catch(error){
   if(requestSignal?.aborted)throw generationError('生成已取消，原计划未改变',{status:499,retryable:false,attempts});
   lastError=error.code==='AI_INVALID_OUTPUT'||error.code==='AI_GENERATION_FAILED'?error:generationError(error.name==='TimeoutError'?'DeepSeek 连接或回答读取超时':'模型响应读取失败',{transient:true});
   if(overallSignal.aborted||now()>=deadline){lastError=generationError('生成等待超时，请稍后重试',{status:504});break;}
   if(lastError.retryable===false||attempts>=maxAttempts)break;
   // Each repair gets the original contract plus only the latest failed answer.
   // Raw answers remain in request memory and are never logged or returned on failure.
   const feedback={task:'修正错误，重新返回完整七天 JSON。不可只返回修改片段。',error:lastError.issue||{message:lastError.message},requirements:'保持原用户资料、calendar、固定动作库及 allowedKinds 不变。tasks 仅可含 id、role 及对应 measurement 声明的处方字段，不得含 minutes、名称或讲解；检查全部日期、场景角色、计量类型和总秒数。'};
   messages=[...baseMessages,...(content.trim()&&content.length<=20000?[{role:'assistant',content}]:[]),{role:'user',content:JSON.stringify(feedback)}];
   if(lastError.transient){
    const delay=Math.max(1000*2**index,lastError.retryAfterSeconds*1000||0);
    if(delay>=deadline-now())break;
    try{await sleep(delay,overallSignal);}catch{lastError=generationError('生成已取消或等待超时',{status:requestSignal?.aborted?499:504});break;}
   }
  }
 }
 throw generationError((attempts>1?'已自动尝试 '+attempts+' 次，仍未生成可用方案。':'')+(lastError?.message||'生成失败')+'；原计划未改变',{status:lastError?.status||502,attempts,issue:lastError?.issue,retryable:false});
}
