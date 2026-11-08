import {STANDARD_LIBRARY,LIBRARY_VERSION,availableExercises,doseLimits} from './catalog.mjs?v=5cf8bb297927';
export const EXERCISE_CONTRACT_VERSION='standard-library-'+LIBRARY_VERSION;
export const GENERATION_POLICY=Object.freeze({maxAttempts:4,attemptTimeoutMs:40000,totalTimeoutMs:135000,clientTimeoutMs:150000});
export const EXERCISE_RULES=Object.fromEntries(STANDARD_LIBRARY.exercises.map(x=>[x.id,{category:x.category,allowedKinds:Object.keys(x.allowedUses)}]));
export function exerciseAvailable(id,profile){return availableExercises(profile).some(x=>x.id===id);}
export const fixedExerciseCatalog=availableExercises;
export const exerciseDoseLimits=doseLimits;
