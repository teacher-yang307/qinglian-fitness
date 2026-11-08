// Shared data contract only. Importing this module does not activate or change any app plan.
export function validatePrescription(library,task,context={}){
 if(!task||typeof task!=='object'||Array.isArray(task)||typeof task.id!=='string')throw new Error('处方必须包含动作编号 id');
 const exercise=library.exercises.find(x=>x.id===task.id);if(!exercise)throw new Error('未知动作编号：'+task.id);
 const measure=exercise.measurement,fields=['id',...measure.requiredFields,...measure.optionalFields];
 if(Object.keys(task).some(k=>!fields.includes(k)))throw new Error('包含不允许的字段；动作名称、类别和要求不可由模型修改');
 for(const key of measure.requiredFields)if(!Object.hasOwn(task,key))throw new Error('缺少处方字段：'+key);
 for(const key of Object.keys(task).filter(k=>k!=='id')){
  const decimal=library.prescriptionRules.decimalFields?.[key];
  if(decimal){
   const value=task[key],scaled=value*10**decimal.decimalPlaces;
   if(typeof value!=='number'||!Number.isFinite(value)||value<=decimal.minExclusive||!Number.isSafeInteger(Math.round(scaled))||Math.abs(scaled-Math.round(scaled))>1e-7)throw new Error('距离必须为有效的正数公里数，最多三位小数：'+key);
   continue;
  }
  const min=Math.max(library.prescriptionRules.zeroAllowedFields.includes(key)?0:1,measure.minimums?.[key]||0);
  if(!Number.isSafeInteger(task[key])||task[key]<min)throw new Error('处方字段必须使用有效整数：'+key);
 }
 if(context.role&&!context.dayType)throw new Error('指定训练角色时必须同时指定训练日类型');
 if(context.dayType){
  const allowed=exercise.allowedUses[context.dayType];
  if(!allowed||context.role&&!allowed.includes(context.role))throw new Error('该动作不允许用于所选训练日或角色');
 }
 return exercise;
}
export function estimateTaskSeconds(library,task){
 const x=validatePrescription(library,task),m=x.measurement;let seconds;
 if(m.type==='repetitions'||m.type==='distance')seconds=task.estimatedSeconds??null;
 else if(m.type==='hold')seconds=task.sets*task.holdSeconds*m.sides+(task.sets-1)*(task.restSeconds||0);
 else if(m.type==='duration')seconds=task.durationSeconds;
 else if(m.type==='intervals')seconds=task.rounds*(task.workSeconds+task.recoverySeconds);
 if(seconds!==null&&!Number.isSafeInteger(seconds))throw new Error('合计时长超出有效整数范围');
 return seconds;
}
export function formatPrescription(library,task){
 const x=validatePrescription(library,task),m=x.measurement;
 const time=seconds=>seconds<60?seconds+' 秒':Math.floor(seconds/60)+' 分钟'+(seconds%60?' '+seconds%60+' 秒':'');
 const side=m.sides===2?'每侧 ':'';
 if(m.type==='repetitions')return task.sets+' 组 × '+side+task.reps+' 次';
 if(m.type==='hold')return task.sets+' 组 × '+side+time(task.holdSeconds);
 if(m.type==='duration')return time(task.durationSeconds);
 if(m.type==='distance')return task.distanceKm+' 公里';
 return task.rounds+' 轮 · '+(m.workMode==='easy_run'?'轻松跑':'运动')+' '+time(task.workSeconds)+' / '+(m.recoveryMode==='walk_easy'?'步行':'休息')+' '+time(task.recoverySeconds);
}
