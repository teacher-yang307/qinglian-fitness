import {mkdir,cp,writeFile,readFile,rm} from 'node:fs/promises';
const root=new URL('../',import.meta.url);await rm(new URL('docs/',root),{recursive:true,force:true});await mkdir(new URL('docs/',root));
for(const folder of ['web','src','worker'])await cp(new URL(folder+'/',root),new URL('docs/'+(folder==='web'?'':folder+'/'),root),{recursive:true});
await writeFile(new URL('docs/.nojekyll',root),'');
console.log('Built GitHub Pages at docs/ (no credentials or personal data)');
