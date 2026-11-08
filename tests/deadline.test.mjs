import test from 'node:test';
import assert from 'node:assert/strict';
import {withDeadline,timeoutError} from '../src/deadline.mjs';

function clock(){let time=0,callback,cleared=false;return{now:()=>time,schedule:fn=>{callback=fn;return 1;},unschedule:()=>{cleared=true;},expire:()=>{time=101;callback();},jump:()=>{time=101;},get cleared(){return cleared;}};}
function deferred(){let resolve;const promise=new Promise(r=>{resolve=r;});return{promise,resolve};}

test('网络完全不理会取消时，独立超时仍结束等待且迟到结果不会变成成功',async()=>{
 const request=deferred(),timer=clock();let signal,success=0;
 const result=withDeadline(s=>{signal=s;return request.promise;},{timeoutMs:100,...timer});
 result.then(()=>success++,()=>{});await Promise.resolve();timer.expire();
 await assert.rejects(result,{name:'TimeoutError'});assert.equal(signal.aborted,true);assert.equal(timer.cleared,true);
 request.resolve('late');await Promise.resolve();await Promise.resolve();assert.equal(success,0);
 assert.equal(await withDeadline(()=>Promise.resolve('retry'),{timeoutMs:100}),'retry');
});
test('收到响应头后正文持续不结束，也受同一等待上限约束',async()=>{
 const timer=clock(),body=deferred();let headers=false;
 const result=withDeadline(async()=>{headers=true;return await body.promise;},{timeoutMs:100,...timer});
 await Promise.resolve();assert.equal(headers,true);timer.expire();await assert.rejects(result,{name:'TimeoutError'});
 body.resolve({result:'too late'});
});
test('页面恢复时即使原定时器尚未运行，墙上时钟超过截止时间也拒绝迟到结果',async()=>{
 const timer=clock(),request=deferred();const result=withDeadline(()=>request.promise,{timeoutMs:100,...timer});
 await Promise.resolve();timer.jump();request.resolve('late');await assert.rejects(result,{name:'TimeoutError'});assert.equal(timer.cleared,true);
});
test('外部截止检查可以立即结束卡住的请求，正常结束会清理定时器',async()=>{
 const controller=new AbortController(),timer=clock();const result=withDeadline(()=>new Promise(()=>{}),{timeoutMs:100,signal:controller.signal,...timer});
 controller.abort(timeoutError());await assert.rejects(result,{name:'TimeoutError'});assert.equal(timer.cleared,true);
 const done=clock();assert.equal(await withDeadline(()=>Promise.resolve(7),{timeoutMs:100,...done}),7);assert.equal(done.cleared,true);
});
