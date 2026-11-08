import test from 'node:test';import assert from 'node:assert/strict';
import {dayKey,addDate,freshState,taskList} from '../src/domain.mjs';import {EXERCISE_RULES} from '../src/exercise-contract.mjs';
import {STANDARD_BY_ID as EXERCISES,LIBRARY_VERSION} from '../src/catalog.mjs';
import {rulesWeek} from '../src/standard-plan.mjs';import {planningInput,validateAIWeek,buildAIProgram,deepSeekMessages}from '../src/ai-plan.mjs';import worker,{handleGenerate as realHandleGenerate,BudgetGate}from '../cloud/worker.mjs';import {approveAIProgram,readStore,STORAGE_KEY}from '../src/local-store.mjs';
const handleGenerate=(req,env,fetcher)=>realHandleGenerate(req,env,fetcher,{sleep:async()=>{}});
const profile={age:30,height:170,weight:70,goal:'保持健康',experience:'有一定基础',duration:35,equipment:'居家 · 徒手',days:[0,1,2,3,4,5,6],limits:'暂无',diet:'普通家常菜',name:'PRIVATE-NAME',background:'PRIVATE-TEXT'},start=dayKey();
function rawWeek(){return rulesWeek(start,profile);}
const data=()=>({contractVersion:'standard-plan-v1',libraryVersion:LIBRARY_VERSION,start,profile,consent:true,requestId:crypto.randomUUID()});
function environment(){return{ALLOWED_ORIGIN:'https://teacher-yang307.github.io',DEEPSEEK_API_KEY:'test-not-a-real-key',GENERATION_ACCESS_CODE:'test-invitation-code',BUDGET:{idFromName:x=>x,get:()=>({fetch:async()=>new Response('{}')})}};}
const request=(d=data(),headers={})=>new Request('https://backend.test/generate',{method:'POST',headers:{Origin:'https://teacher-yang307.github.io','Content-Type':'application/json','X-Access-Code':'test-invitation-code',...headers},body:JSON.stringify(d)});
test('仅发送规划必要资料，首周期 AI、后续周期保留预备状态',()=>{const input=planningInput(data());assert.equal(input.profile.name,undefined);assert.equal(input.calendar.length,7);for(const d of input.calendar){const weekday=(new Date(d.date+'T12:00:00Z').getUTCDay()+6)%7;assert.equal(d.canTrain,profile.days.includes(weekday));}assert.equal(input.profile.background,undefined);const p=buildAIProgram(data(),rawWeek()).program;assert.equal(p.source,'deepseek');assert.equal(p.cycles[0].engine,'deepseek');assert.equal(p.cycles[1].provisional,true);});
test('未知动作、过量、缺日、器械不符及不可训练日被拒绝',()=>{for(const mutate of [w=>w.days.pop(),w=>w.days[0].tasks[1].id='made_up',w=>w.days[0].tasks[1].id='__proto__',w=>w.days[0].tasks[1].id='constructor',w=>w.days[0].tasks[1].minutes=120,w=>w.days[0].tasks[1].sets=99,w=>w.days[0].tasks[1].id='row_4kg',w=>w.days[0].tasks.shift()]){const w=rawWeek();mutate(w);assert.throws(()=>validateAIWeek(w,profile,start));}const w=rawWeek();assert.throws(()=>validateAIWeek(w,{...profile,days:[]},start));});
test('没有同意、邀请码错误和来源错误均不调用模型',async()=>{let calls=0;const fetcher=async()=>{calls++;throw new Error('must not call');};for(const req of [request({...data(),consent:false}),request(data(),{'X-Access-Code':'wrong'}),request(data(),{Origin:'https://evil.test'})]){assert.ok((await handleGenerate(req,environment(),fetcher)).status>=400);}assert.equal(calls,0);});
test('真实协议替身可生成，网络/空白/截断/非法 JSON 不伪装成功',async()=>{const success=await handleGenerate(request(),environment(),async(url,opts)=>{assert.equal(url,'https://api.deepseek.com/chat/completions');assert.equal(opts.redirect,'manual');const payload=JSON.parse(opts.body);assert.equal(payload.response_format.type,'json_object');assert.ok(!JSON.stringify(payload).includes('PRIVATE-'));return Response.json({choices:[{finish_reason:'stop',message:{content:JSON.stringify(rawWeek())}}]});});assert.equal(success.status,200);for(const mock of [async()=>{throw new Error('network');},async()=>Response.json({choices:[{finish_reason:'stop',message:{content:' '}}]}),async()=>Response.json({choices:[{finish_reason:'length',message:{content:'{}'}}]}),async()=>Response.json({choices:[{finish_reason:'stop',message:{content:'invalid'}}]})])assert.equal((await handleGenerate(request(),environment(),mock)).status,502);});
test('拒绝未配置的请求',async()=>{assert.equal((await handleGenerate(request(),{})).status,403);const e=environment();delete e.DEEPSEEK_API_KEY;assert.equal((await handleGenerate(request(),e)).status,503);});
test('移除次数和间隔限制，连续失败后仍可生成且不读取旧配额',async()=>{
 const e=environment();e.DAILY_CALL_LIMIT='1';e.PER_IP_DAILY_LIMIT='1';e.BUDGET.get=()=>{throw new Error('must not read old quota');};
 let calls=0;const fetcher=async()=>{calls++;return Response.json({choices:[{finish_reason:'stop',message:{content:'invalid'}}]});};
 for(let i=0;i<31;i++)assert.equal((await handleGenerate(request(),e,fetcher)).status,502);
 const good=async()=>Response.json({choices:[{finish_reason:'stop',message:{content:JSON.stringify(rawWeek())}}]});
 assert.equal((await handleGenerate(request(),e,good)).status,200);assert.equal(calls,124);
 delete e.BUDGET;assert.equal((await handleGenerate(request(),e,good)).status,200);
 const health=await handleGenerate(new Request('https://backend.test/health',{headers:{Origin:e.ALLOWED_ORIGIN}}),e);assert.deepEqual(await health.json(),{ready:true,provider:'DeepSeek',generationLimitsEnabled:false,libraryVersion:LIBRARY_VERSION,contractVersion:'standard-plan-v1'});
});
test('仅确认时保存，校验失败、已有计划或过期版本均不覆盖',async()=>{const map=new Map(),storage={getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v)};assert.equal(readStore(storage).state.program,undefined);const bad=rawWeek();bad.days=[];await assert.rejects(()=>approveAIProgram(storage,{...data(),raw:bad},0));assert.equal(storage.getItem(STORAGE_KEY),null);await approveAIProgram(storage,{...data(),raw:rawWeek()},0);const saved=storage.getItem(STORAGE_KEY);assert.equal(readStore(storage).state.program.source,'deepseek');await assert.rejects(()=>approveAIProgram(storage,{...data(),raw:rawWeek()},0));assert.equal(storage.getItem(STORAGE_KEY),saved);});
test('配额计数串行事务、重复请求和每日总量受限',async()=>{const map=new Map(),ctx={storage:{get:async k=>structuredClone(map.get(k)),put:async(k,v)=>map.set(k,structuredClone(v)),transaction:async f=>f(ctx.storage)}};const gate=new BudgetGate(ctx,{DAILY_CALL_LIMIT:1});const req=()=>new Request('https://budget/reserve',{method:'POST',body:JSON.stringify({client:'a'.repeat(64),requestId:crypto.randomUUID()})});assert.equal((await gate.fetch(req())).status,200);assert.equal((await gate.fetch(req())).status,429);});

test('Cloudflare 运行上下文不会被当成 fetch 请求函数',async()=>{const previous=globalThis.fetch;globalThis.fetch=async()=>Response.json({choices:[{finish_reason:'stop',message:{content:JSON.stringify(rawWeek())}}]});try{const response=await worker.fetch(request(),environment(),{waitUntil(){}});assert.equal(response.status,200);}finally{globalThis.fetch=previous;}});

test('完整 JSON 代码块可规范化，重定向响应不会继续传递密钥',async()=>{const good=await handleGenerate(request(),environment(),async()=>Response.json({choices:[{finish_reason:'stop',message:{content:'```json\n'+JSON.stringify(rawWeek())+'\n```'}}]}));assert.equal(good.status,200);const redirected=await handleGenerate(request(),environment(),async()=>new Response(null,{status:302,headers:{Location:'https://elsewhere.invalid'}}));assert.equal(redirected.status,502);});
test('自测标记仅接受固定虚构资料',async()=>{let called=false;const response=await handleGenerate(request({...data(),diagnostics:true}),environment(),async()=>{called=true;return Response.json({});});assert.equal(response.status,400);assert.equal(called,false);});

test('模型收到原版名称与完整讲解，分类与校验使用同一份规则',()=>{
 const input=planningInput(data()),messages=deepSeekMessages(input),sent=JSON.parse(messages[1].content);
 assert.equal(messages[0].role,'system');
 for(const entry of sent.catalog){
  const fixed=EXERCISES[entry.id];
  for(const field of ['name','steps','keyPoints','commonErrors','safetyNotes','equipment','primaryMuscles'])assert.deepEqual(entry[field],fixed[field]);
  assert.deepEqual(Object.keys(entry.allowedUses),EXERCISE_RULES[entry.id].allowedKinds);
 }
 assert.ok(sent.catalog.find(t=>t.id==='cool_walk').allowedUses.recovery.includes('recovery'));
 assert.equal(sent.catalog.some(t=>t.id==='row_4kg'),false);
});
test('固定属性不能由模型覆盖，组次时长可变而动作讲解保持原版',()=>{
 for(const field of ['name','steps','breathing','errors','alternative','note','load','type','equipment','target','allowedKinds']){
  const raw=rawWeek(),day=raw.days.find(d=>d.kind==='strength');day.tasks[1][field]='模型修改';
  assert.throws(()=>validateAIWeek(raw,profile,start),error=>error.issue.exerciseId===day.tasks[1].id&&error.issue.date===day.date);
 }
 const raw=rawWeek(),day=raw.days.find(d=>d.kind==='strength');day.tasks[1].sets=1;day.tasks[1].reps=6;day.tasks[1].estimatedSeconds=120;
 const built=buildAIProgram(data(),raw),task=taskList({...freshState(),program:built.program},day.date).find(t=>t.id===day.tasks[1].id);
 assert.equal(task.prescription.sets,1);assert.equal(task.prescription.reps,6);assert.equal(task.minutes,2);
 assert.equal(task.name,EXERCISES[task.id].name);assert.deepEqual(task.steps,EXERCISES[task.id].steps);
});
test('恢复日接受统一规则中的慢走与拉伸，拒绝力量及跑步并指出日期动作',()=>{
 const raw=rawWeek();for(const d of raw.days){d.kind='rest';d.tasks=[];}
 raw.days[0].kind='recovery';
 for(const id of ['walk_easy','cool_walk','mobility','relax']){raw.days[0].tasks=[{id,role:'recovery',durationSeconds:300}];assert.doesNotThrow(()=>validateAIWeek(raw,profile,start));}
 for(const id of ['prep','chair_squat','run_walk']){raw.days[0].tasks=[id==='chair_squat'?{id,role:'recovery',sets:1,reps:8,estimatedSeconds:300}:id==='run_walk'?{id,role:'recovery',rounds:1,workSeconds:60,recoverySeconds:90}:{id,role:'recovery',durationSeconds:300}];assert.throws(()=>validateAIWeek(raw,profile,start),error=>error.issue.exerciseId===id&&error.issue.date===start);}
});
test('非法 JSON、分类错误后携带原答与明确错误修正，成功即停止并汇总用量',async()=>{
 const bad=rawWeek();bad.days[0].kind='recovery';bad.days[0].tasks=[{id:'chair_squat',role:'recovery',sets:1,reps:8,estimatedSeconds:300}];
 const answers=['invalid-json',JSON.stringify(bad),JSON.stringify(rawWeek())],sent=[];
 const response=await handleGenerate(request(),environment(),async(url,options)=>{sent.push(JSON.parse(options.body));return Response.json({choices:[{finish_reason:'stop',message:{content:answers[sent.length-1]}}],usage:{prompt_tokens:10,completion_tokens:20}});});
 const result=await response.json();assert.equal(response.status,200);assert.equal(sent.length,3);assert.equal(result.generation.attempts,3);assert.deepEqual(result.usage,{inputTokens:30,outputTokens:60});
 assert.equal(sent[1].messages[2].content,'invalid-json');assert.ok(sent[1].messages.at(-1).content.includes('JSON 格式不正确'));
 const feedback=JSON.parse(sent[2].messages.at(-1).content);assert.equal(feedback.error.date,start);assert.equal(feedback.error.exerciseId,'chair_squat');assert.ok(feedback.error.message.includes('不允许用于所选训练日或角色'));
 assert.deepEqual(sent[0].messages.slice(0,2),sent[2].messages.slice(0,2));
});
test('固定属性被改写会重试，只有修正后的完整方案才能返回',async()=>{
 const bad=rawWeek();bad.days[0].tasks[1].name='改名动作';let calls=0;
 const response=await handleGenerate(request(),environment(),async()=>{calls++;return Response.json({choices:[{finish_reason:'stop',message:{content:JSON.stringify(calls===1?bad:rawWeek())}}]});});
 const result=await response.json();assert.equal(response.status,200);assert.equal(calls,2);assert.equal(result.result.days[0].tasks[1].name,undefined);
});
test('空白或截断回答可自动恢复，最多四次且不泄露失败原文',async()=>{
 let calls=0;const response=await handleGenerate(request(),environment(),async()=>{calls++;return Response.json({choices:[{finish_reason:calls===2?'length':'stop',message:{content:calls===1?'   ':calls===2?'{':JSON.stringify(rawWeek())}}]});});
 assert.equal(response.status,200);assert.equal(calls,3);
 calls=0;const failed=await handleGenerate(request(),environment(),async()=>{calls++;return Response.json({choices:[{finish_reason:'stop',message:{content:'PRIVATE-RAW-RESPONSE'}}]});});
 const body=await failed.text();assert.equal(failed.status,502);assert.equal(calls,4);assert.ok(body.includes('已自动尝试 4 次'));assert.ok(!body.includes('PRIVATE-RAW-RESPONSE'));
});
test('网络与暂时服务错误重试并退避，密钥余额和配置错误立即停止',async()=>{
 let calls=0;const delays=[];
 const response=await realHandleGenerate(request(),environment(),async()=>{calls++;if(calls===1)throw new Error('network');if(calls===2)return new Response('',{status:503});return Response.json({choices:[{finish_reason:'stop',message:{content:JSON.stringify(rawWeek())}}]});},{sleep:async ms=>delays.push(ms)});
 assert.equal(response.status,200);assert.equal(calls,3);assert.deepEqual(delays,[1000,2000]);
 for(const status of [400,401,402,403,404,422,302]){let count=0;const failed=await handleGenerate(request(),environment(),async()=>{count++;return new Response('PRIVATE-UPSTREAM-ERROR',{status});});assert.equal(failed.status,502);assert.equal(count,1);assert.ok(!(await failed.text()).includes('PRIVATE-UPSTREAM-ERROR'));}
 const rateDelays=[];let rateCalls=0;const rate=await realHandleGenerate(request(),environment(),async()=>{rateCalls++;return rateCalls===1?new Response('',{status:429,headers:{'Retry-After':'3'}}):Response.json({choices:[{finish_reason:'stop',message:{content:JSON.stringify(rawWeek())}}]});},{sleep:async ms=>rateDelays.push(ms)});assert.equal(rate.status,200);assert.deepEqual(rateDelays,[3000]);
});
test('取消或达到总等待预算后停止调用，过长 Retry-After 不盲目重试',async()=>{
 const controller=new AbortController();controller.abort();let calls=0;
 const canceled=new Request(request(),{signal:controller.signal});const result=await handleGenerate(canceled,environment(),async()=>{calls++;throw new Error('must not call');});assert.equal(result.status,499);assert.equal(calls,0);
 let clock=0;const timed=await realHandleGenerate(request(),environment(),async()=>{calls++;clock=200000;throw new Error('network');},{now:()=>clock,sleep:async()=>{}});assert.equal(timed.status,504);assert.equal(calls,1);
 calls=0;const limited=await handleGenerate(request(),environment(),async()=>{calls++;return new Response('',{status:429,headers:{'Retry-After':'300'}});});assert.equal(limited.status,502);assert.equal(calls,1);
});
