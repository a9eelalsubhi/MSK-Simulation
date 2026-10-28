import {readdir,readFile,writeFile,mkdir,cp,rm,stat} from 'node:fs/promises';
import path from 'node:path';

// GitHub Pages serves this repository below a subdirectory. Keep the authored
// root-relative URLs for the Worker, and rewrite only the static distribution.
const base='/MSK-Simulation/';
const output=path.resolve('.pages-dist');
if(path.dirname(output)!==process.cwd())throw Error('Unsafe output directory');
await rm(output,{recursive:true,force:true});
await mkdir(output,{recursive:true});
await cp('public',output,{recursive:true});
const rootAsset=/(["'`])\/(?!\/)(?=(?:reference-slides|lectures|models|slides|vendor|branding)\/|[\w.-]+\.(?:js|css)(?:[?"'`])|\?lecture=)/g;
let files=0;
async function visit(folder){
 for(const entry of await readdir(folder,{withFileTypes:true})){
  const file=path.join(folder,entry.name);
  if(entry.isDirectory()){await visit(file);continue;}
  if(!/\.(?:js|mjs|json|html|css)$/.test(entry.name))continue;
  let text=await readFile(file,'utf8');
  if(entry.name==='index.html')text=text.replace(/<script\s+defer\s+src="\/analytics-client\.js"><\/script>\s*/,'');
  text=text.replace(rootAsset,(_,quote)=>quote+base).replace(/url\(\/(?!\/)/g,'url('+base);
  // Lecture 4 uses the root dataset and root model directory. Other lectures
  // use explicit subdirectories. Prefix the EMPTY base as well; rewriting
  // only '/models/' literals misses `${base}/models/...` at runtime.
  if(entry.name==='app.js')text=text.replace("lectureId==='4'?'':'",`lectureId==='4'?'${base.slice(0,-1)}':'`);
  if(entry.name==='lecture-runtime.js')text=text.replace("let base = lower ? `/MSK-Simulation/lectures/l${id}` : '';", "let base = lower ? `/MSK-Simulation/lectures/l${id}` : '/MSK-Simulation';");
  await writeFile(file,text);files++;
 }
}
await visit(output);
await rm(path.join(output,'analytics-client.js'),{force:true});
await writeFile(path.join(output,'.nojekyll'),'');
// Verify every lecture's registered data, source model and slide assets exist.
const local=url=>path.join(output,url.slice(base.length).split('?')[0]);
const {LECTURE_IDS,lectureModelPaths,validateLecture}=await import(new URL('../.pages-dist/lecture-runtime.js',import.meta.url));
for(const id of LECTURE_IDS){
 const prefix=id==='4'?base:base+`lectures/l${id}/`;
 const data=JSON.parse(await readFile(local(prefix+'tour.json'),'utf8'));
 validateLecture(data);
 for(const model of lectureModelPaths(id,data)){if(!model.path.startsWith(base))throw Error('Unprefixed model '+model.path);await stat(local(model.path));}
 if(data.muscleActionCatalog)await stat(local(data.muscleActionCatalog.path));
 for(const step of data.steps)for(const page of step.pages)await stat(local(prefix+`slides/${page}.jpg`));
}
const html=await readFile(path.join(output,'index.html'),'utf8');
const references=JSON.parse(await readFile(path.join(output,'reference-slides/manifest.json'),'utf8'));
for(const book of Object.values(references.lectures))for(const page of book.pages)await stat(local(page.src));
for(const [alias,replacement]of Object.entries(references.aliases)){
 const old=await readFile(local(alias)),approved=await readFile(local(replacement.src));
 if(!old.equals(approved))throw Error('Unapproved legacy reference image: '+alias);
}
if(html.includes('analytics-client.js')||!html.includes(base+'app.js'))throw Error('Invalid Pages entrypoint');
console.log(`GitHub Pages ready: ${LECTURE_IDS.length} lectures, ${files} rewritten text assets, base ${base}`);
