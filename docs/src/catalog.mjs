import {STANDARD_LIBRARY} from './library-data.mjs?v=2ffd2dd33c55';
import {validatePrescription,estimateTaskSeconds,formatPrescription} from './prescriptions.mjs?v=2ffd2dd33c55';
export {STANDARD_LIBRARY,validatePrescription,estimateTaskSeconds,formatPrescription};
export const EQUIPMENT_OPTIONS=['居家 · 徒手','居家 · 哑铃','居家 · 2×4kg 哑铃 / 瑜伽垫','居家 · 壶铃','居家 · 弹力带','户外 · 单杠','户外 · 跳绳','健身房 · 综合器械'];
export const LIBRARY_VERSION=STANDARD_LIBRARY.version;
export const STANDARD_BY_ID=Object.fromEntries(STANDARD_LIBRARY.exercises.map(x=>[x.id,x]));
export function libraryForProgram(program,version=program?.libraryVersion){
 const snapshot=program?.librarySnapshots?.[version];
 if(snapshot)return{...STANDARD_LIBRARY,...snapshot.contract,version,exercises:Object.values(snapshot.exercises)};
 if(program?.exerciseSnapshot)return{...STANDARD_LIBRARY,...program.libraryContractSnapshot,version:program.libraryVersion,exercises:Object.values(program.exerciseSnapshot)};
 return STANDARD_LIBRARY;
}
export function exerciseView(x,version=LIBRARY_VERSION){return{id:x.id,name:x.name,type:['prep','aerobic','recovery'].includes(x.category)?'run':x.category==='strength'?'dumbbell':'stretch',target:x.primaryMuscles,equipment:x.equipment,steps:[...x.steps],keyPoints:x.keyPoints,errors:x.commonErrors.split(/[；;]/).filter(Boolean),note:x.safetyNotes,image:`./assets/library-${version}/${x.image.split('/').at(-1)}`,measurement:x.measurement,allowedUses:x.allowedUses};}
export const STANDARD_VIEWS=Object.fromEntries(STANDARD_LIBRARY.exercises.map(x=>[x.id,exerciseView(x)]));
export function availableExercises(profile){return STANDARD_LIBRARY.exercises.filter(x=>{
 const equipment=profile.equipment||'',gear=x.equipment;
 const equipmentOK=equipment.includes('健身房')||gear==='徒手'||['哑铃','壶铃','弹力带','单杠','跳绳'].some(k=>equipment.includes(k)&&gear.includes(k));
 const levelOK=profile.experience==='规律训练'?true:profile.experience==='初学者'?x.difficulty==='初级':x.difficulty!=='高级';
 return equipmentOK&&levelOK&&!(x.id==='easy_run'&&profile.runningKm===0);
});}
export function doseLimits(profile,feedback){
 const cap=Math.min(profile.duration,profile.experience==='初学者'?30:40)-(feedback?.recovery==='疲劳较明显'||feedback?.difficulty==='有些吃力'?5:0);
 return{maxSeconds:Math.max(600,cap*60),maxSets:profile.experience==='初学者'?2:profile.experience==='规律训练'?5:3,maxReps:20,maxHoldSeconds:90,maxDistanceKm:profile.runningKm>0?Math.min(10,profile.runningKm):profile.experience==='初学者'?1:profile.experience==='规律训练'?10:5};
}
export function snapshotExercises(program,tasks){
 program.libraryVersion??=LIBRARY_VERSION;program.librarySnapshots??={};
 program.librarySnapshots[LIBRARY_VERSION]??={contract:{schemaVersion:STANDARD_LIBRARY.schemaVersion,measurementTypes:structuredClone(STANDARD_LIBRARY.measurementTypes),prescriptionRules:structuredClone(STANDARD_LIBRARY.prescriptionRules)},exercises:{}};
 const snapshot=program.librarySnapshots[LIBRARY_VERSION];
 for(const task of tasks){const x=STANDARD_BY_ID[task.id];if(!x)throw new Error('找不到标准动作');snapshot.exercises[x.id]??=structuredClone(x);}
}
export function materializeTask(raw,taskId,library=STANDARD_LIBRARY){
 const {role,...prescription}=raw;const x=validatePrescription(library,prescription);
 const seconds=estimateTaskSeconds(library,prescription);
 return{id:x.id,taskId,libraryVersion:library.version,role,prescription:structuredClone(prescription),minutes:seconds===null?null:seconds/60};
}
export function resolveStandardTask(task,program){
 const library=libraryForProgram(program,task.libraryVersion),x=library.exercises.find(x=>x.id===task.id);if(!x)throw new Error('动作版本缺失，请核对备份');
 validatePrescription(library,task.prescription);const seconds=estimateTaskSeconds(library,task.prescription);
 return{...task,...exerciseView(x,task.libraryVersion||library.version),prescription:structuredClone(task.prescription),minutes:seconds===null?null:seconds/60,restSeconds:task.prescription.restSeconds||0};
}
export function taskPrescription(task,program){return task.prescription?formatPrescription(libraryForProgram(program,task.libraryVersion),task.prescription):task.sets?`${task.sets} 组 × ${task.reps} · 组间休息 ${task.restSeconds||60} 秒`:task.reps||`计划 ${task.minutes} 分钟`;}
export function validateActual(task,actual){
 if(actual==null)return null;if(!actual||typeof actual!=='object'||Array.isArray(actual))throw new Error('实际完成数据格式不正确');
 const allowed=task.prescription?Object.keys(task.prescription).filter(k=>!['id','estimatedSeconds','restSeconds'].includes(k)):[];
 for(const [key,value]of Object.entries(actual)){
  if(!allowed.includes(key))throw new Error('实际记录包含不支持的计量字段');
  if(typeof value!=='number'||!Number.isFinite(value)||value<(key==='recoverySeconds'?0:1e-12)||(key!=='distanceKm'&&!Number.isSafeInteger(value)))throw new Error('请填写有效的实际次数、秒数或公里数');
  if(key==='distanceKm'&&Math.abs(value*1000-Math.round(value*1000))>1e-7)throw new Error('公里数最多三位小数');
 }
 return Object.keys(actual).length?{...actual}:null;
}
