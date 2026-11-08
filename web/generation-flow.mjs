// The waiting screen follows the entire request + validation operation, never an animation timer.
export function createGenerationFlow(view,{slowAfterMs=25000,schedule=setTimeout,unschedule=clearTimeout}={}){
 let pending=null;
 return {
  get busy(){return pending!==null;},
  run(operation){
   if(pending)return pending;
   view.waiting();
   let waiting=true;
   const timer=schedule(()=>{if(waiting)view.slow();},slowAfterMs);
   pending=Promise.resolve().then(operation).then(
    value=>{waiting=false;view.complete();return value;},
    error=>{waiting=false;view.failed(error);return null;}
   ).finally(()=>{waiting=false;unschedule(timer);pending=null;});
   return pending;
  }
 };
}
