import {uniqueId} from './id.mjs';
import {STANDARD_LIBRARY,LIBRARY_VERSION,materializeTask,snapshotExercises,doseLimits} from './catalog.mjs';
const shift=(key,n)=>{const d=new Date(key+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);};
const weekdays=key=>(new Date(key+'T12:00:00Z').getUTCDay()+6)%7;
const meal={breakfast:'主食搭配鸡蛋、奶类或豆浆和水果；自行核对过敏原。',lunch:'米饭或杂粮饭，搭配肉鱼蛋豆及蔬菜。',dinner:'正常搭配主食、蛋白质和蔬菜，按饥饱感调整。'};
export function emptyCycle(start,index,goal){const first=shift(start,index*7);return{index:index+1,start:first,end:shift(first,6),theme:['找回节奏','稳定动作','巩固习惯','复盘与评估'][index],goal,status:'pending',provisional:true,days:Array.from({length:7},(_,i)=>({date:shift(first,i),title:'待生成本周期计划',kind:'pending',tasks:[],note:'完成上一周期反馈后，再生成并确认本周期安排。',meal:{breakfast:'待生成',lunch:'待生成',dinner:'待生成'}}))};}
export function rulesWeek(start,profile,feedback,notBefore=start){
 if(feedback?.recovery==='有疼痛或不适')throw new Error('反馈有疼痛或不适，暂不自动生成训练安排');
 const cap=doseLimits(profile,feedback).maxSeconds;let lastKind='rest',active=0,daysFirstStrength=false;
 const days=Array.from({length:7},(_,index)=>{
  const date=shift(start,index),canTrain=profile.days.includes(weekdays(date))&&date>=notBefore&&active<6;
  let kind='rest',tasks=[];
  if(canTrain){
   kind=active%3===2?'recovery':lastKind==='strength'?'aerobic':active%2===0?'strength':'aerobic';
   if(kind==='strength'){
    const ids=cap<900?['chair_squat']:['chair_squat','wall_press','bridge'];const each=Math.floor((cap-360)/ids.length);
    tasks=[{id:'prep',role:'warmup',durationSeconds:180},...ids.map(id=>({id,role:'main',sets:1,reps:8,restSeconds:0,estimatedSeconds:Math.min(240,Math.max(60,each))})),{id:'relax',role:'cooldown',durationSeconds:180}];
   }else if(kind==='aerobic'){
    const main=profile.experience==='初学者'?{id:'walk_easy',role:'main',durationSeconds:Math.max(60,cap-360)}:{id:'run_walk',role:'main',rounds:Math.max(1,Math.min(6,Math.floor((cap-360)/150))),workSeconds:60,recoverySeconds:90};
    tasks=[{id:'prep',role:'warmup',durationSeconds:180},main,{id:'relax',role:'cooldown',durationSeconds:180}];
   }else tasks=[{id:'walk_easy',role:'recovery',durationSeconds:Math.min(900,cap)}];
   active++;
  }
  if(index===6&&daysFirstStrength&&kind==='strength'){kind='recovery';tasks=[{id:'walk_easy',role:'recovery',durationSeconds:Math.min(900,cap)}];}
  if(index===0)daysFirstStrength=kind==='strength';lastKind=kind;
  return{date,title:{strength:'全身基础力量',aerobic:'轻松有氧',recovery:'舒适恢复',rest:'休息日'}[kind],kind,tasks,note:kind==='rest'?'按安排休息，记录身体感受。':'按舒适节奏完成，不追求做满；出现不适可停止。',meal:{...meal}};
 });
 return{libraryVersion:LIBRARY_VERSION,title:'28 天'+profile.goal+' · 基础训练',reason:'根据目标、器械、训练日期和可用时间组合标准动作，先建立规律，再结合每周期反馈调整。',cycleGoals:['建立训练节奏','稳定动作质量','巩固执行与恢复','复盘身体趋势和体能感受'],days};
}
export function programFromWeek(start,profile,week,metadata={}){
 const id=uniqueId(),program={schemaVersion:2,id,version:'standard-plan-v1',title:week.title,start,end:shift(start,27),cycleLength:7,cycleCount:4,source:metadata.engine||'deepseek',reason:week.reason,equipment:profile.equipment,profileSnapshot:structuredClone(profile),createdAt:new Date().toISOString(),reviewStatus:'self_training_reference',progression:'已确认周期按计划执行；后续周期等待每 7 天反馈，再生成预览并确认。',ai:metadata.engine==='rules'?null:{model:metadata.model||'deepseek-flash',promptVersion:'deepseek-week-v3',libraryVersion:LIBRARY_VERSION},cycles:week.cycleGoals.map((goal,index)=>emptyCycle(start,index,goal))};
 const cycle=program.cycles[0];cycle.status='confirmed';cycle.provisional=false;cycle.engine=metadata.engine||'deepseek';cycle.profileSnapshot=structuredClone(profile);cycle.days=week.days.map(d=>({...d,tasks:d.tasks.map((t,i)=>materializeTask(t,`${id}:${d.date}:${i}`))}));snapshotExercises(program,week.days.flatMap(d=>d.tasks));return program;
}
export function buildStandardProgram(start,profile){return programFromWeek(start,profile,rulesWeek(start,profile),{engine:'rules'});}
