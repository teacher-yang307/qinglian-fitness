import {mkdir,cp,writeFile,readFile,rm,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const root=new URL('../',import.meta.url);
async function files(dir){const list=[];for(const x of await readdir(new URL(dir,root),{withFileTypes:true})){const path=dir+x.name;if(x.isDirectory())list.push(...await files(path+'/'));else list.push(path);}return list.sort();}
const inputs=[...await files('web/'),...await files('src/'),...await files('worker/')];
const hash=createHash('sha256');for(const path of inputs){hash.update(path);hash.update(await readFile(new URL(path,root)));}const version=hash.digest('hex').slice(0,12);
await rm(new URL('docs/',root),{recursive:true,force:true});await mkdir(new URL('docs/',root));
for(const folder of ['web','src','worker'])await cp(new URL(folder+'/',root),new URL('docs/'+(folder==='web'?'':folder+'/'),root),{recursive:true});
for(const path of await files('docs/'))if(/\.(?:mjs|js)$/.test(path)){const url=new URL(path,root);let text=await readFile(url,'utf8');text=text.replace(/(['"])(\.{1,2}\/[^'"?]+\.mjs)\1/g,(_,quote,src)=>quote+src+'?v='+version+quote);await writeFile(url,text);}
const index=new URL('docs/index.html',root);await writeFile(index,(await readFile(index,'utf8')).replace('src="./app.js"','src="./app.js?v='+version+'"').replace('href="./styles.css"','href="./styles.css?v='+version+'"'));
for(const path of await files('docs/'))if(path.endsWith('.html')){const url=new URL(path,root);await writeFile(url,(await readFile(url,'utf8')).replace(/(src|href)="(\.\/[^"?]+\.(?:mjs|js|css))"/g,(_,attr,src)=>attr+'="'+src+'?v='+version+'"'));}
await writeFile(new URL('docs/.nojekyll',root),'');console.log('Built versioned GitHub Pages at docs/: '+version);
