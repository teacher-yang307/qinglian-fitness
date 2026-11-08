import {readFile,writeFile,mkdir,copyFile} from 'node:fs/promises';
const root=new URL('../',import.meta.url),lib=JSON.parse(await readFile(new URL('library/exercise-library.json',root),'utf8'));
const ids=new Set();for(const x of lib.exercises){if(ids.has(x.id)||!Object.keys(x.allowedUses).length)throw new Error('Invalid library');ids.add(x.id);}
await writeFile(new URL('src/library-data.mjs',root),'// Generated from library/exercise-library.json. Do not edit.\nexport const STANDARD_LIBRARY='+JSON.stringify(lib)+';\n');
if(process.argv.includes('--import-assets')){
 const source=new URL('../../exercise-library-pack/',import.meta.url),target=new URL('web/assets/library-'+lib.version+'/',root);await mkdir(target,{recursive:true});
 for(const x of lib.exercises){const name=x.image.split('/').at(-1);if(!/^[\w-]+\.(png|svg)$/.test(name))throw new Error('Invalid image path');await copyFile(new URL(x.image,source),new URL(name,target));}
}
console.log('Standard library '+lib.version+': '+ids.size+' exercises');
