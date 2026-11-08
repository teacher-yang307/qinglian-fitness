import test from 'node:test';import assert from 'node:assert/strict';
import{freshState,dayKey,addDate,updateProfile,taskList,setRecord}from'../src/domain.mjs';
import{STANDARD_LIBRARY,LIBRARY_VERSION,libraryForProgram,taskPrescription}from'../src/catalog.mjs';
import{rulesWeek,programFromWeek}from'../src/standard-plan.mjs';
import{buildHomeProgram}from'../src/program.mjs';
import{planningInput,validateAIWeek}from'../src/ai-plan.mjs';
import{cyclePlanningData,localCycleDraft}from'../src/cycle-plan.mjs';
import{readStore,validateBackup,restoreBackup,approveAIProgram,STORAGE_KEY,UPGRADE_BACKUP_KEY,resetTrainingPlan,restoreBeforeReset}from'../src/local-store.mjs';
import{programmeMetrics}from'../src/ui-metrics.mjs';
const today=dayKey(),profile=updateProfile(freshState().profile,{age:30,height:171,weight:70,experience:'有一定基础',duration:35,days:[0,1,2,3,4,5,6],equipment:'居家 · 哑铃',name:'PRIVATE-NAME',background:'PRIVATE-TEXT'});
function memory(state){const values=new Map();if(state)values.set(STORAGE_KEY,JSON.stringify({schema:1,state,history:[],requests:[]}));return{getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v),values};}
function currentState(legacy=false){const s=freshState();s.profile=structuredClone(profile);const start=addDate(today,-7);s.program=legacy?buildHomeProgram(start):programFromWeek(start,s.profile,rulesWeek(start,s.profile),{engine:'rules'});s.reviews[today]={weight:70,difficulty:'强度合适',recovery:'恢复良好',note:'PRIVATE-REVIEW',recordedAt:new Date().toISOString()};return s;}
function distanceWeek(){const raw=rulesWeek(today,profile);raw.days[0].kind='aerobic';raw.days[0].tasks=[{id:'prep',role:'warmup',durationSeconds:180},{id:'easy_run',role:'main',distanceKm:2.5,estimatedSeconds:1200},{id:'relax',role:'cooldown',durationSeconds:180}];return raw;}
test('单一动作库包含62项、距离跑步和每侧保持计量',()=>{
 assert.equal(STANDARD_LIBRARY.exercises.length,62);const raw=distanceWeek();assert.doesNotThrow(()=>validateAIWeek(raw,profile,today));
 const p=programFromWeek(today,profile,raw),t=taskList({...freshState(),program:p},today).find(t=>t.id==='easy_run');assert.equal(t.name,'跑步');assert.equal(taskPrescription(t,p),'2.5 公里');assert.equal(t.minutes,20);
 const bad=structuredClone(raw);bad.days[0].tasks[1].distanceKm='2.5';assert.throws(()=>validateAIWeek(bad,profile,today));
 const hold=structuredClone(raw);hold.days[0]= {...hold.days[0],kind:'strength',tasks:[{id:'prep',role:'warmup',durationSeconds:180},{id:'side-plank',role:'main',sets:2,holdSeconds:20,restSeconds:60},{id:'relax',role:'cooldown',durationSeconds:180}]};assert.doesNotThrow(()=>validateAIWeek(hold,profile,today));
 const h=programFromWeek(today,profile,hold),view=taskList({...freshState(),program:h},today)[1];assert.equal(taskPrescription(view,h),'2 组 × 每侧 20 秒');assert.equal(view.minutes,140/60);
});
test('新阶段只展开首周，后3周期不伪造训练量或休息日',()=>{
 const p=programFromWeek(today,profile,rulesWeek(today,profile)),m=programmeMetrics(p);assert.equal(m.pendingCycles,3);assert.equal(m.confirmedCycles,1);assert.equal(m.knownDays,7);assert.equal(m.tasks,p.cycles[0].days.reduce((n,d)=>n+d.tasks.length,0));assert.ok(p.cycles.slice(1).every(c=>c.days.length===7&&c.days.every(d=>d.kind==='pending'&&!d.tasks.length)));
});
test('资料、动作库版本和固定定义在确认时快照保存，计量通过备份保留',async()=>{
 const storage=memory();await approveAIProgram(storage,{start:today,profile,consent:true,raw:distanceWeek(),engine:'rules'},0);
 const saved=readStore(storage);assert.equal(saved.state.program.profileSnapshot.weight,70);assert.equal(saved.state.program.libraryVersion,LIBRARY_VERSION);assert.equal(saved.state.program.librarySnapshots[LIBRARY_VERSION].exercises.easy_run.name,'跑步');
 const imported=memory();restoreBackup(imported,JSON.parse(JSON.stringify(saved)));const restored=readStore(imported);assert.equal(taskList(restored.state,today)[1].prescription.distanceKm,2.5);assert.equal(restored.state.program.libraryVersion,LIBRARY_VERSION);assert.deepEqual(restored.state.logs,{});
});
test('快捷打卡不推算公里或时长，实际值独立于目标并能导出恢复',()=>{
 const s=freshState();s.profile=profile;s.program=programFromWeek(today,profile,distanceWeek());
 setRecord(s,{date:today,id:'easy_run',done:true,minutes:null,source:'checkin'});assert.equal(s.logs[today].easy_run.actual,null);assert.equal(s.logs[today].easy_run.minutes,null);
 setRecord(s,{date:today,id:'easy_run',done:true,minutes:18,actual:{distanceKm:2.1},source:'manual'});assert.equal(taskList(s,today)[1].prescription.distanceKm,2.5);assert.equal(programmeMetrics(s.program,s.logs,s.snapshots).actualDistanceKm,2.1);
 assert.throws(()=>setRecord(s,{date:today,id:'easy_run',done:true,minutes:null,actual:{distanceKm:2.5},source:'checkin'}));
 assert.throws(()=>setRecord(s,{date:today,id:'easy_run',done:true,minutes:18,actual:{distanceKm:2.1234},source:'manual'}));
 const stored=validateBackup({schema:1,state:s,history:[],requests:[]});assert.equal(stored.state.logs[today].easy_run.actual.distanceKm,2.1);
});
test('每周请求仅发送同意的反馈枚举和摘要，备注姓名逐项历史不发送',()=>{
 const s=currentState();setRecord(s,{date:s.program.start,id:'chair_squat',done:true,minutes:3,actual:{sets:1,reps:6},source:'manual'});
 const data=cyclePlanningData(s,1),input=planningInput(data),json=JSON.stringify(input);for(const text of ['PRIVATE-NAME','PRIVATE-TEXT','PRIVATE-REVIEW','recordedAt'])assert.ok(!json.includes(text));assert.equal(input.trainingSummary.completedTasks,1);assert.equal(input.trainingSummary.actualMinutes,3);assert.equal(input.feedback.difficulty,'强度合适');assert.equal(input.purpose,'cycle');
 s.reviews[today].recovery='有疼痛或不适';assert.throws(()=>cyclePlanningData(s,1),/疼痛/);
});
test('周期草稿不写正式数据，确认只替换目标周期并冻结历史',async()=>{
 const s=currentState();setRecord(s,{date:s.program.start,id:'chair_squat',done:true,minutes:3,source:'manual'});const storage=memory(s),before=JSON.stringify(readStore(storage).state);
 const draft=localCycleDraft(s,1);assert.equal(JSON.stringify(readStore(storage).state),before);
 await approveAIProgram(storage,{...draft.data,raw:draft.raw,engine:'rules'},0);const saved=readStore(storage).state;
 assert.deepEqual(saved.program.cycles[0],s.program.cycles[0]);assert.deepEqual(saved.logs,s.logs);assert.deepEqual(saved.snapshots,s.snapshots);assert.equal(saved.program.cycles[1].status,'confirmed');assert.equal(saved.program.cycles[2].status,'pending');assert.equal(saved.program.id,s.program.id);
});
test('有实际记录、活动计时、版本冲突或阶段改变时拒绝覆盖',async()=>{
 const s=currentState(),draft=localCycleDraft(s,1),raw=draft.raw;s.program.cycles[1]={...s.program.cycles[1],...programFromWeek(today,profile,raw).cycles[0]};setRecord(s,{date:today,id:'chair_squat',done:true,minutes:3,source:'manual'});
 const storage=memory(s),before=storage.getItem(STORAGE_KEY);await assert.rejects(()=>approveAIProgram(storage,{...draft.data,raw,engine:'rules'},0),/已有训练记录/);assert.equal(storage.getItem(STORAGE_KEY),before);
 const fresh=currentState(),other=memory(fresh);await assert.rejects(()=>approveAIProgram(other,{...draft.data,programId:'changed',raw},0),/阶段已改变/);await assert.rejects(()=>approveAIProgram(other,{...draft.data,raw},1),/已改变/);
 fresh.sessions.x={date:today,endedAt:null};const running=memory(fresh);await assert.rejects(()=>approveAIProgram(running,{...cyclePlanningData(fresh,1),raw},0),/计时/);
});
test('旧版计划与记录原样读取，调整未来周期前保存可恢复升级备份',async()=>{
 const s=currentState(true),beforeFirst=structuredClone(s.program.cycles[0]),storage=memory(s);const draft=localCycleDraft(s,1);await approveAIProgram(storage,{...draft.data,raw:draft.raw,engine:'rules'},0);
 assert.ok(storage.getItem(UPGRADE_BACKUP_KEY));const saved=readStore(storage).state;assert.deepEqual(saved.program.cycles[0],beforeFirst);assert.equal(taskList(saved,s.program.start)[3].name,'单臂哑铃划船');assert.equal(saved.program.cycles[1].libraryVersion,LIBRARY_VERSION);
});
test('不同动作库版本的快照独立保存，不被后续周期覆盖',async()=>{
 const s=currentState(),v='2.1.0';s.program.librarySnapshots[v]=structuredClone(s.program.librarySnapshots[LIBRARY_VERSION]);s.program.librarySnapshots[v].exercises.chair_squat.name='旧版标准深蹲';s.program.libraryVersion=v;for(const d of s.program.cycles[0].days)for(const t of d.tasks)t.libraryVersion=v;
 const storage=memory(s),draft=localCycleDraft(s,1);await approveAIProgram(storage,{...draft.data,raw:draft.raw,engine:'rules'},0);const saved=readStore(storage).state;
 assert.equal(taskList(saved,s.program.start).find(t=>t.id==='chair_squat').name,'旧版标准深蹲');assert.equal(taskList(saved,today).find(t=>t.id==='chair_squat').name,'徒手深蹲 / 坐站');
});
test('标准计划仍支持重置和恢复，备份固定属性不能被任务字段覆盖',async()=>{
 const storage=memory();await approveAIProgram(storage,{start:today,profile,raw:distanceWeek(),engine:'rules'},0);const before=readStore(storage).state.program.id;
 const malicious=readStore(storage);malicious.state.program.cycles[0].days[0].tasks[1].name='模型另起的名字';storage.setItem(STORAGE_KEY,JSON.stringify(malicious));assert.equal(taskList(readStore(storage).state,today)[1].name,'跑步');
 resetTrainingPlan(storage,1);assert.equal(readStore(storage).state.program,undefined);restoreBeforeReset(storage);assert.equal(readStore(storage).state.program.id,before);
});

test('跑步基础可选、保留旧资料并限制新阶段公里目标，不发送自由描述',()=>{
 const p=updateProfile(profile,{runningKm:3});const input=planningInput({start:today,profile:p,consent:true});assert.equal(input.profile.runningKm,3);assert.equal(input.doseLimits.maxDistanceKm,3);assert.ok(!JSON.stringify(input).includes('PRIVATE-TEXT'));assert.equal(updateProfile(p,{runningKm:null}).runningKm,null);assert.equal(updateProfile(p,{runningKm:0}).runningKm,0);assert.throws(()=>updateProfile(p,{runningKm:'3'}));
 const raw=distanceWeek();raw.days[0].tasks[1].distanceKm=3.5;assert.throws(()=>validateAIWeek(raw,p,today));
});

test('异步确认期间发生版本变化时仍拒绝覆盖较新的记录',async()=>{
 const storage=memory(),raw=distanceWeek();let first=true;const wrapped={...storage,getItem(key){const result=storage.getItem(key);if(key===STORAGE_KEY&&first){first=false;queueMicrotask(()=>{const updated=freshState();updated.profile=profile;updated.revision=1;storage.setItem(STORAGE_KEY,JSON.stringify({schema:1,state:updated,history:[],requests:[]}));});}return result;}};
 await assert.rejects(()=>approveAIProgram(wrapped,{start:today,profile,raw,engine:'rules'},0),/已改变/);assert.equal(readStore(storage).state.revision,1);assert.equal(readStore(storage).state.program,undefined);
});
