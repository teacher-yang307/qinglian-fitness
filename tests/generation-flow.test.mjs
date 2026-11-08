import test from 'node:test';
import assert from 'node:assert/strict';
import {createGenerationFlow} from '../web/generation-flow.mjs';

function setup(){
 const events=[],timers=new Map();let sequence=0;
 const flow=createGenerationFlow({waiting:()=>events.push('waiting'),slow:()=>events.push('slow'),complete:()=>events.push('preview'),failed:error=>events.push(error.message)},{schedule:fn=>{timers.set(++sequence,fn);return sequence;},unschedule:id=>timers.delete(id)});
 return {flow,events,timers};
}
function deferred(){let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};}

test('等待完整响应和本地校验，动画提示不能提前结束生成',async()=>{
 const {flow,events,timers}=setup(),response=deferred(),validation=deferred();
 const job=flow.run(async()=>{await response.promise;await validation.promise;return 'validated';});
 assert.equal(flow.busy,true);
 [...timers.values()][0]();
 assert.deepEqual(events,['waiting','slow']);
 response.resolve();await Promise.resolve();
 assert.equal(flow.busy,true);assert.equal(events.includes('preview'),false);
 validation.resolve();assert.equal(await job,'validated');
 assert.deepEqual(events,['waiting','slow','preview']);assert.equal(flow.busy,false);assert.equal(timers.size,0);
});

test('快速返回立即结束，不等待最短动画时间，也不留下延迟提示',async()=>{
 const {flow,events,timers}=setup();
 await flow.run(()=>Promise.resolve('done'));
 assert.deepEqual(events,['waiting','preview']);assert.equal(timers.size,0);
});

test('连续触发只运行一个请求，失败后可以重新尝试',async()=>{
 const {flow,events,timers}=setup(),request=deferred();let calls=0;
 const first=flow.run(()=>{calls++;return request.promise;});
 const second=flow.run(()=>{calls++;return Promise.resolve();});
 assert.equal(first,second);await Promise.resolve();assert.equal(calls,1);
 request.reject(new Error('网络中断'));assert.equal(await first,null);
 assert.deepEqual(events,['waiting','网络中断']);assert.equal(timers.size,0);assert.equal(flow.busy,false);
 await flow.run(()=>{calls++;return Promise.resolve();});
 assert.equal(calls,2);assert.deepEqual(events,['waiting','网络中断','waiting','preview']);
});

test('校验失败或请求超时停在失败页，不进入预览且清理等待定时器',async()=>{
 for(const message of ['方案校验未通过','等待已超时']){
  const {flow,events,timers}=setup();
  await flow.run(async()=>{throw new Error(message);});
  assert.deepEqual(events,['waiting',message]);assert.equal(flow.busy,false);assert.equal(timers.size,0);
 }
});
