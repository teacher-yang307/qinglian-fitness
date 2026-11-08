import {dayKey,addDate,taskList,fail} from './domain.mjs?v=5cf8bb297927';
import {planningInput,validateAIWeek} from './ai-plan.mjs?v=5cf8bb297927';
import {materializeTask,snapshotExercises,LIBRARY_VERSION} from './catalog.mjs?v=5cf8bb297927';
import {rulesWeek} from './standard-plan.mjs?v=5cf8bb297927';
export function cyclePlanningData(state,index,consent=true,now=Date.now()){
 const program=state.program,today=dayKey(now);
 if(!program||!Number.isInteger(index)||index<1||index>3)fail('请选择本阶段下一周期');
 const cycle=program.cycles[index];if(!cycle||cycle.end<today||cycle.start>addDate(today,7))fail('请在该周期开始前 7 天至周期结束前生成');
 if(cycle.status==='confirmed'&&cycle.start<today)fail('已开始的正式计划保留，请调整未来周期');
 const feedback=state.reviews[cycle.start];if(!feedback)fail('请先填写上一周期的身体反馈');
 const summary={plannedTasks:0,completedTasks:0,actualMinutes:0,missingMinutes:0,actualDistanceKm:0};
 for(const day of program.cycles[index-1].days){for(const task of taskList(state,day.date)){
  summary.plannedTasks++;const record=state.logs[day.date]?.[task.id];if(!record?.done)continue;
  summary.completedTasks++;if(record.minutes==null)summary.missingMinutes++;else summary.actualMinutes+=record.minutes;
  if(Number.isFinite(record.actual?.distanceKm))summary.actualDistanceKm+=record.actual.distanceKm;
 }}
 summary.actualMinutes=Math.round(summary.actualMinutes*10)/10;summary.actualDistanceKm=Math.round(summary.actualDistanceKm*1000)/1000;
 const data={purpose:'cycle',programId:program.id,phaseStart:program.start,cycleIndex:index,start:cycle.start,profile:state.profile,consent,feedback:{difficulty:feedback.difficulty,recovery:feedback.recovery},trainingSummary:summary,previousKind:program.cycles[index-1].days.at(-1)?.kind||'rest'};
 return{...data,...planningInput(data,now),programId:program.id};
}
export function localCycleDraft(state,index,now=Date.now()){
 const data=cyclePlanningData(state,index,true,now);const raw=rulesWeek(data.start,data.profile,data.feedback,dayKey(now));
 raw.title=state.program.title;raw.cycleGoals=state.program.cycles.map(c=>c.goal||c.theme);
 // If the boundary needs recovery, use a recovery-only first day.
 if(data.previousKind==='strength'&&raw.days[0].kind==='strength'){raw.days[0].kind='recovery';raw.days[0].title='周期衔接恢复';raw.days[0].tasks=[{id:'walk_easy',role:'recovery',durationSeconds:Math.min(600,data.doseLimits.maxSeconds)}];}
 validateAIWeek(raw,data.profile,data.start,data);return{data,raw,engine:'rules'};
}
export function applyCycleDraft(state,data,raw,metadata={},now=Date.now()){
 if(state.program?.id!==data.programId)fail('阶段已改变，请重新生成',409,'STALE_DRAFT');
 const input=cyclePlanningData(state,data.cycleIndex,true,now),week=validateAIWeek(raw,input.profile,input.start,input),program=structuredClone(state.program),cycle=program.cycles[data.cycleIndex];
 for(const day of cycle.days){if(Object.keys(state.logs[day.date]||{}).length||state.snapshots[day.date]?.length)fail('该周期已有训练记录，原安排保持不变',409,'EXISTING_RECORDS');}
 if(Object.values(state.sessions).some(s=>!s.endedAt&&s.date>=cycle.start&&s.date<=cycle.end))fail('请先结束该周期正在进行的计时');
 if(program.schemaVersion!==2)program.migratedFromLegacy=true;program.schemaVersion=2;program.cycleHistory??=[];
 if(cycle.days.some(d=>d.tasks.length))program.cycleHistory.push(structuredClone(cycle));
 cycle.days=week.days.map(d=>({...d,tasks:d.tasks.map((t,i)=>materializeTask(t,`${program.id}:${d.date}:${i}`))}));
 Object.assign(cycle,{goal:week.cycleGoals[data.cycleIndex],status:'confirmed',provisional:false,libraryVersion:LIBRARY_VERSION,engine:metadata.engine||'deepseek',profileSnapshot:structuredClone(state.profile),feedbackSnapshot:structuredClone(state.reviews[cycle.start]),reason:week.reason,confirmedAt:new Date(now).toISOString()});
 snapshotExercises(program,week.days.flatMap(d=>d.tasks));return program;
}
