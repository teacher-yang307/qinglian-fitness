export const timeoutError=()=>Object.assign(new Error('Operation deadline exceeded'),{name:'TimeoutError'});

// Abort alone is not a deadline: a stalled fetch/reader may ignore its signal.
// Settle our own promise and suppress late results even when the transport never settles.
export function withDeadline(operation,{timeoutMs,signal,now=Date.now,schedule=setTimeout,unschedule=clearTimeout}={}){
 if(!Number.isFinite(timeoutMs)||timeoutMs<=0)return Promise.reject(timeoutError());
 return new Promise((resolve,reject)=>{
  const controller=new AbortController(),expiresAt=now()+timeoutMs;let settled=false,timer;
  const finish=(error,value)=>{
   if(settled)return;settled=true;unschedule(timer);signal?.removeEventListener('abort',cancel);
   if(error){controller.abort(error);reject(error);}else resolve(value);
  };
  const cancel=()=>finish(signal.reason||Object.assign(new Error('Aborted'),{name:'AbortError'}));
  if(signal?.aborted){cancel();return;}
  signal?.addEventListener('abort',cancel,{once:true});
  timer=schedule(()=>finish(timeoutError()),timeoutMs);
  Promise.resolve().then(()=>{if(controller.signal.aborted)throw controller.signal.reason;return operation(controller.signal);}).then(
   value=>now()>=expiresAt?finish(timeoutError()):finish(null,value),
   error=>finish(error)
  );
 });
}
