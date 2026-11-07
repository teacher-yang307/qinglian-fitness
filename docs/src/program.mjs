import {uniqueId} from './id.mjs?v=f48ff9318cb4';
// Reusable home programme content. Personal measurements live only in account data.
export const PROGRAM_VERSION='home-return-2026-11-07-v1';
export const PROGRAM_SOURCES=[
 {title:'NIDDK：从少量运动开始，逐步增加',url:'https://www.niddk.nih.gov/health-information/weight-management/tips-get-active/tips-starting-physical-activity',scope:'总体原则'},
 {title:'NHS：居家基础力量动作',url:'https://www.nhs.uk/live-well/exercise/strength-exercises/',scope:'起立、靠墙推和提踵的动作参考'},
 {title:'CSP：单臂划船动作参考',url:'https://www.csp.org.uk/campaigns-influencing/campaigns/stronger-my-way/i-want-feel-stronger/strengthening-exercises/upper',scope:'划船动作参考'},
 {title:'WHO：均衡与多样化饮食',url:'https://www.who.int/news-room/fact-sheets/detail/healthy-diet',scope:'餐饮总体原则'}
];
export const EXERCISES={
 prep:{id:'prep',name:'动态热身',type:'run',equipment:'none',target:'全身与关节活动',minutes:5,steps:['原地轻松走 2 分钟，让呼吸逐渐加快；不需要跑跳。','肩部绕环、手臂前后摆动各约 30 秒，活动脚踝与髋部。','做 5 次小幅徒手下蹲，接着原地踏步，进入主训练。'],breathing:'全程自然呼吸，不憋气。',errors:['一开始就冲刺或高抬腿猛跳','热身时强压关节、追求大幅度'],alternative:'当天疲劳时只做轻松步行和小幅关节活动。',note:'热身应让身体逐渐暖起来，不应耗尽体力。'},
 chair_squat:{id:'chair_squat',name:'徒手深蹲 / 坐站',type:'dumbbell',equipment:'none',target:'大腿与臀部',minutes:5,steps:['双脚约髋宽，脚掌踩稳。如有不带滚轮、不会滑动的稳固椅子，可放在身后作为下蹲触点。','臀部向后下方移动，膝盖跟随脚尖方向，只蹲到舒适深度；使用椅子时轻触椅面，不向下砸坐。','脚掌均匀发力站起，保持胸口自然抬起；站稳后再做下一次。'],breathing:'坐下吸气，站起呼气。',errors:['膝盖明显内扣','脚跟离地或身体向前扑','一组做到姿势散掉仍硬撑'],alternative:'减小下蹲幅度；没有稳固椅子时可轻扶墙面做浅蹲。无需额外购买器械。',note:'首周期先用自重。4 公斤不是必须加上的负重。'},
 wall_press:{id:'wall_press',name:'靠墙俯卧撑',type:'dumbbell',equipment:'none',target:'胸部、手臂与肩带',minutes:5,steps:['面对结实墙面，双手放在约胸肩高度，略宽于肩。双脚后退到舒适距离。','收紧腹部，让身体从头到脚保持自然直线，屈肘缓慢靠近墙面。','平稳推回起点，肩膀放松，不耸肩；动作幅度以肩腕舒适为准。'],breathing:'靠近墙面吸气，推离时呼气。',errors:['塌腰、探头','耸肩或肘部向两侧完全张开','脚离墙太远以致动作无法控制'],alternative:'双脚靠近墙面，减小倾斜角度。',note:'选择不会移动的墙面，不使用可折叠桌椅当支撑。'},
 row_4kg:{id:'row_4kg',name:'单臂哑铃划船',type:'dumbbell',equipment:'dumbbell',target:'背部与上臂',minutes:6,steps:['前后站稳，一手轻放在前侧大腿辅助，另一手握一只 4 公斤哑铃；髋部后移，上身自然前倾。也可轻扶固定墙面。','保持背部自然平直，肩膀远离耳朵，将肘部向身后带起，让哑铃靠近躯干下侧。','短暂停顿后缓慢放下；先完成一侧，再做另一侧，次数相同。'],breathing:'拉起时呼气，放下时吸气。',errors:['扭腰甩动哑铃','耸肩、含胸或弓背','只追求举高，失去控制'],alternative:'4 公斤无法稳定完成时，改用更轻的装水瓶或徒手肩胛后收。',note:'以姿势稳定为先，结束时应仍能再做约 2–3 次。'},
 bridge:{id:'bridge',name:'自重臀桥',type:'dumbbell',equipment:'mat',target:'臀部与躯干稳定',minutes:4,steps:['仰卧瑜伽垫，双膝弯曲、双脚踩地约髋宽，手臂放在身体两侧。','轻收腹部，脚掌发力抬起臀部，到肩、髋、膝大致成一条自然直线即可。','停顿 1 秒后慢慢落下，不靠腰部后仰来抬高。'],breathing:'抬起呼气，放下吸气。',errors:['用腰过度反弓顶起','膝盖向内并拢','快速弹起、落下'],alternative:'缩小抬起幅度；腰部不适时停下，换轻松步行。',note:'首周期不在腹部叠加哑铃。'},
 dead_bug:{id:'dead_bug',name:'仰卧交替点地',type:'dumbbell',equipment:'mat',target:'核心控制',minutes:3,steps:['仰卧垫上，膝盖弯曲并抬起到舒适位置，手臂自然抬起或放在体侧。','保持躯干稳定，一只脚缓慢向地面点触，再收回，左右交替。','只做到能保持腰背舒适和呼吸顺畅的幅度；动作慢于平时走路节奏。'],breathing:'脚向下时呼气，收回时吸气。',errors:['腰部明显拱起','腿伸得过远导致憋气','追求速度和次数'],alternative:'双脚始终踩地，改为单脚脚跟在地面缓慢前后滑动。',note:'核心训练以稳定为目标，不追求腹部疼痛感。'},
 supported_squat:{id:'supported_squat',name:'徒手浅蹲',type:'dumbbell',equipment:'none',target:'大腿与臀部',minutes:5,steps:['双脚略宽于髋部，脚尖自然略向外；可轻扶固定支撑。','臀部向后下方移动，膝盖随脚尖方向，蹲到能稳定控制的深度。','踩稳脚掌站起，避免膝盖内扣。首周期以徒手完成。'],breathing:'下蹲吸气，起身呼气。',errors:['强求蹲得很深','脚跟浮起','起身时膝盖向内夹'],alternative:'换成椅子坐站；若连续两次动作轻松且恢复良好，反馈后再考虑单只 4 公斤抱胸负重。',note:'本阶段不预设必须使用哑铃深蹲。'},
 calf_raise:{id:'calf_raise',name:'扶稳提踵',type:'dumbbell',equipment:'none',target:'小腿与脚踝控制',minutes:3,steps:['站在平地，双手轻扶固定墙面，双脚约髋宽。','双脚脚跟慢慢抬起，重心稳定，不把脚踝向外翻。','在舒适高度稍停，再缓慢落回地面。'],breathing:'自然呼吸，抬起时轻呼气。',errors:['快速弹跳','脚踝外翻','站在台阶边缘强拉小腿'],alternative:'减小抬起高度，或坐姿双脚提踵。',note:'先不拿哑铃增加负重。'},
 bird_dog:{id:'bird_dog',name:'四点支撑交替伸展',type:'dumbbell',equipment:'mat',target:'核心与背部稳定',minutes:4,steps:['双手与双膝支撑在垫上，手在肩下、膝在髋下，视线看向垫面。','先单独缓慢伸出一条腿，躯干不扭转；稳定后可尝试对侧手臂前伸。','在舒适位置停 1–2 秒，缓慢收回并换侧。'],breathing:'伸展时呼气，收回时吸气。',errors:['抬腿过高导致塌腰','骨盆向一侧旋转','用甩动完成'],alternative:'只移动一条腿，或脚尖沿地面向后滑动。',note:'手腕不适时跳过此动作，可换仰卧交替点地。'},
 run_walk:{id:'run_walk',name:'轻松跑走交替',type:'run',equipment:'none',target:'恢复有氧习惯',minutes:20,steps:['完成动态热身后，选择平坦、安全的路线。按“轻松跑 3 分钟 + 步行 1 分钟”完成 5 轮，共 20 分钟。','跑步时以仍能说完整句子的强度为准，步幅自然，不设配速或 5 公里达标要求。','如果呼吸明显吃力，改成“跑 1 分钟 + 走 1 分钟”，总时长可缩短；结束后继续慢走放缓呼吸。'],breathing:'呼吸自然连贯，不强行规定鼻吸口呼或步频。',errors:['把每轮跑成冲刺','为了凑足距离强撑','不适时仍坚持完成剩余轮次'],alternative:'全程改为舒适快走，按实际完成情况记录。',note:'胸痛、头晕或明显异常气短时立即停止并及时寻求帮助；关节疼痛时停止相关运动。'},
 walk_easy:{id:'walk_easy',name:'舒适步行',type:'run',equipment:'none',target:'日常活动与恢复',minutes:20,steps:['选平坦路线，以舒适、可交流的速度行走。','可拆成两次 10 分钟，双臂自然摆动，肩颈放松。','有疲劳时进一步减慢速度或缩短时间，记录真实时长。'],breathing:'自然呼吸。',errors:['把恢复日走成竞速训练','脚疼时靠意志硬走'],alternative:'在家分段走动，或完全休息。',note:'恢复日无需追求步数纪录。'},
 cool_walk:{id:'cool_walk',name:'慢走恢复',type:'run',equipment:'none',target:'逐渐结束有氧活动',minutes:3,steps:['结束跑走后先继续缓慢行走。','逐渐放慢脚步，让呼吸回到舒适状态。','呼吸平稳后再开始轻柔拉伸。'],breathing:'自然、缓慢地呼吸。',errors:['跑完立即坐下或弯腰憋气'],alternative:'按体感延长慢走，再进行后续动作。',note:'不把放松当成额外冲刺。'},
 mobility:{id:'mobility',name:'轻柔活动度练习',type:'stretch',equipment:'mat',target:'肩背、髋部和脚踝',minutes:10,steps:['站姿做小幅肩部绕环和脚踝活动，各约 1 分钟。','在垫上做舒适幅度的脊柱轻柔活动与髋部活动，动作缓慢。','最后轻松走动或坐姿自然呼吸；不追求压腿幅度。'],breathing:'每个动作保持顺畅呼吸。',errors:['借助反弹强拉','将酸痛或锐痛当成有效'],alternative:'只做舒适步行，或休息。',note:'有明显酸痛时减少幅度和时长，不能用疼痛换活动范围。'},
 relax:{id:'relax',name:'全身拉伸放松',type:'stretch',equipment:'mat',target:'小腿、大腿、臀部和胸肩',minutes:7,steps:['扶墙轻拉小腿，再以坐姿或仰卧姿势轻柔放松大腿后侧和臀部。','每个部位保持舒适牵拉约 15–20 秒，左右各做 1–2 次。','双手自然放松胸肩，结束后正常补水。'],breathing:'缓慢自然呼吸，呼气时放松。',errors:['弹震拉伸','强忍关节疼痛','憋气追求更深幅度'],alternative:'减少保持时间和幅度，或以轻松走动替代。',note:'拉伸不保证预防损伤；身体不适时及时停止。'}
};
export const HOME_MEALS=[
 {breakfast:'燕麦牛奶 + 水煮蛋 + 一份苹果',lunch:'杂粮饭 + 香菇鸡腿肉（去皮）+ 西兰花胡萝卜',dinner:'番茄豆腐虾仁 + 清炒青菜 + 小份米饭'},
 {breakfast:'全麦面包 + 鸡蛋 + 无糖豆浆',lunch:'米饭 + 清蒸鱼 + 菠菜 + 菌菇',dinner:'鸡肉蔬菜面，面、肉和蔬菜一起吃'},
 {breakfast:'原味酸奶 + 燕麦 + 一份水果 + 鸡蛋',lunch:'杂粮饭 + 西芹牛肉 + 清炒时蔬',dinner:'冬瓜虾仁汤 + 豆腐 + 蒸红薯'},
 {breakfast:'杂粮粥 + 鸡蛋 + 牛奶或豆浆',lunch:'米饭 + 番茄炒蛋 + 清蒸鱼 + 青菜',dinner:'鸡肉菌菇炖菜 + 玉米或米饭'},
 {breakfast:'全麦鸡蛋三明治 + 牛奶 + 一份水果',lunch:'杂粮饭 + 豆腐肉末 + 西兰花',dinner:'清蒸鱼 + 番茄青菜汤 + 小份米饭'},
 {breakfast:'燕麦豆浆 + 鸡蛋 + 香蕉',lunch:'米饭 + 彩椒鸡丁 + 菌菇青菜',dinner:'虾仁豆腐蔬菜煲 + 杂粮饭'},
 {breakfast:'杂粮粥 + 鸡蛋 + 原味酸奶',lunch:'米饭 + 清炖瘦肉或鱼 + 两种蔬菜',dinner:'家常蔬菜汤 + 豆腐或鸡蛋 + 薯类主食'}
];
const shift=(key,n)=>{const d=new Date(key+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);};
const exercise=(id,minutes,detail={})=>({id,minutes,...detail});
const strengthA=[exercise('prep',5),exercise('chair_squat',5,{sets:2,reps:'8–10 次',restSeconds:60,load:'自重'}),exercise('wall_press',5,{sets:2,reps:'8–10 次',restSeconds:60,load:'自重'}),exercise('row_4kg',6,{sets:2,reps:'每侧 8 次',restSeconds:60,load:'单只 4kg，可换轻水瓶'}),exercise('bridge',4,{sets:2,reps:'10 次',restSeconds:45,load:'自重'}),exercise('dead_bug',3,{sets:2,reps:'每侧 6 次',restSeconds:45,load:'自重'}),exercise('relax',7)];
const strengthB=[exercise('prep',5),exercise('supported_squat',5,{sets:2,reps:'8–10 次',restSeconds:60,load:'自重'}),exercise('row_4kg',6,{sets:2,reps:'每侧 8 次',restSeconds:60,load:'单只 4kg，可换轻水瓶'}),exercise('wall_press',5,{sets:2,reps:'8–10 次',restSeconds:60,load:'自重'}),exercise('calf_raise',3,{sets:2,reps:'10–12 次',restSeconds:45,load:'自重'}),exercise('bird_dog',4,{sets:2,reps:'每侧 6 次',restSeconds:45,load:'自重'}),exercise('relax',7)];
const aerobic=[exercise('prep',5),exercise('run_walk',20,{reps:'跑 3 分钟 / 走 1 分钟 × 5 轮',load:'可完整交谈的轻松强度'}),exercise('cool_walk',3),exercise('relax',5)];
export function buildHomeProgram(start){const patterns=[
 {title:'全身力量 A',kind:'strength',tasks:strengthA,note:'今天先找回动作控制；每组结束时保留约 2–3 次余力，宁可少做，不硬撑。'},
 {title:'轻松跑走',kind:'aerobic',tasks:aerobic,note:'不测试 5 公里上限。主训练跑走共 20 分钟，吃力时改走路或缩短。'},
 {title:'活动度与恢复',kind:'recovery',tasks:[exercise('mobility',10),exercise('walk_easy',15)],note:'走路可拆成小段；明显疲劳时只做活动度练习或休息。'},
 {title:'全身力量 B',kind:'strength',tasks:strengthB,note:'继续轻量全身训练。哑铃只用于能稳定控制的动作，其他动作先用自重。'},
 {title:'舒适步行',kind:'recovery',tasks:[exercise('walk_easy',20),exercise('relax',5)],note:'这是低强度活动日，给力量训练后的恢复留出空间。'},
 {title:'轻松跑走',kind:'aerobic',tasks:aerobic,note:'保持轻松交谈强度。参考距离不作为任务，记录真实时长即可。'},
 {title:'休息与周期复盘',kind:'rest',tasks:[],note:'今天不安排必须完成的训练。回顾完成情况、疲劳、疼痛和体重趋势，把反馈告诉我。'}
 ];const themes=['找回节奏','稳定动作','巩固习惯','复盘与评估'];return{id:uniqueId(),version:PROGRAM_VERSION,title:'28 天居家减脂 · 回归训练',start,end:shift(start,27),cycleLength:7,cycleCount:4,source:'conversation_prepared',reviewStatus:'self_training_reference',equipment:'2×4kg 哑铃、瑜伽垫',progression:'未来周期先保持基础量。每 7 天反馈后再调整；不根据单次体重或可用时间自动加量。',sources:PROGRAM_SOURCES,cycles:themes.map((theme,index)=>({index:index+1,start:shift(start,index*7),end:shift(start,index*7+6),theme,provisional:index>0,days:patterns.map((p,d)=>({date:shift(start,index*7+d),title:p.title,kind:p.kind,tasks:structuredClone(p.tasks),note:p.note,effort:p.kind==='strength'?'主观用力约 5–6 / 10，保留余力':p.kind==='aerobic'?'轻松交谈，不追配速':'轻松恢复',meal:HOME_MEALS[d],mealNote:'三餐规律；每餐搭配蛋白质、蔬菜和适量主食，少油烹饪。按饥饱感调整份量，先不设精确热量。'}))}))};}

export function buildPersonalProgram(start,p){
 const program=buildHomeProgram(start),base=structuredClone(program.cycles[0].days);
 const pattern=p.goal==='增肌力量'?[0,4,3,2,0,1,6]:p.goal==='提升体能'?[1,0,2,1,3,1,6]:[0,1,2,3,4,5,6];
 program.title=`28 天${p.goal} · ${p.equipment==='居家 · 徒手'?'徒手':'基础'}训练`;program.source='profile_rules';program.equipment=p.equipment;
 program.reason=`根据目标、运动基础、器械、每周可训练日期和单次 ${p.duration} 分钟上限编排。身高体重用于记录趋势，不用于推算运动消耗。`;
 program.cycles.forEach((cycle,c)=>{let slot=0;cycle.days=pattern.map((index,d)=>{
  const day=structuredClone(base[index]);day.date=shift(start,c*7+d);const weekday=(new Date(day.date+'T12:00:00Z').getUTCDay()+6)%7;
  if(!p.days.includes(weekday)){day.tasks=[];day.kind='rest';day.title='休息与恢复';day.note='按你选择的训练日期安排休息，可记录身体感受。';return day;}
  if(p.days.length<7){const order=p.days.length<=3?(p.goal==='增肌力量'?[0,3,1]:[0,1,3]):pattern.filter(n=>n!==6);const chosen=structuredClone(base[order[slot++%order.length]]);Object.assign(day,chosen,{date:day.date});}
  if(p.equipment!=='居家 · 2×4kg 哑铃 / 瑜伽垫'){
   day.tasks=day.tasks.map(t=>t.id==='row_4kg'?{id:'bird_dog',minutes:4,sets:2,reps:'每侧 6 次',restSeconds:45,load:'自重，舒适幅度'}:t).filter((t,i,a)=>a.findIndex(x=>x.id===t.id)===i);
  }
  if(day.kind==='strength'&&p.duration<30){const keep=new Set(['prep','chair_squat','supported_squat','wall_press','bridge','relax']);day.tasks=day.tasks.filter(t=>keep.has(t.id));for(const t of day.tasks)if(t.sets)t.sets=1;}
  if(day.kind==='aerobic')for(const t of day.tasks)if(t.id==='run_walk'){if(p.experience==='初学者'){t.id='walk_easy';delete t.reps;day.title='轻松步行';}else t.reps='按任务分钟跑走交替，吃力时改为步行';}
  const total=day.tasks.reduce((n,t)=>n+t.minutes,0),cap=Math.min(p.duration,p.experience==='初学者'?30:40);
  if(total>cap){const mins=day.tasks.map(t=>t.id==='prep'||t.id==='relax'?3:t.id==='cool_walk'?2:1),weights=day.tasks.map((t,i)=>Math.max(0,t.minutes-mins[i])),weight=weights.reduce((a,b)=>a+b,0),budget=cap-mins.reduce((a,b)=>a+b,0);const extras=weights.map(w=>Math.floor(budget*w/weight));let left=budget-extras.reduce((a,b)=>a+b,0);for(let i=0;left>0;i=(i+1)%extras.length){if(extras[i]<weights[i]){extras[i]++;left--;}}day.tasks.forEach((t,i)=>t.minutes=mins[i]+extras[i]);}
  day.note=day.kind==='rest'?'休息并回顾本周期身体感受。':`按自己的状态完成，计划分钟是参考上限；组数和次数可减少，不追求做满。${day.kind==='aerobic'?'保持可交谈的轻松强度。':''}`;
  day.mealNote='通用均衡餐饮参考，不按个人忌口自动筛选；含过敏原或不适合的食物请替换。';return day;
 });});return program;
}
