import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=fileURLToPath(new URL('.',import.meta.url));
try{const response=await fetch('http://127.0.0.1:5190/__health',{signal:AbortSignal.timeout(900)});const j=await response.json();if(j.app==='hours-between'){const opener=spawn(process.execPath,[path.join(root,'serve.mjs'),'--open'],{cwd:root,detached:true,stdio:'ignore',windowsHide:true});opener.unref();process.exit(0);}}catch{}
const child=spawn(process.execPath,[path.join(root,'serve.mjs'),'--open'],{cwd:root,detached:true,stdio:'ignore',windowsHide:true});child.unref();
