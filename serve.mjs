import http from 'node:http';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';
import {createGzip} from 'node:zlib';
const root=path.resolve(fileURLToPath(new URL('./dist/',import.meta.url)));
const port=Number(process.env.RAIL_PORT||5190);
const url=`http://127.0.0.1:${port}/`;
export function openBrowser(){
 const command=process.platform==='win32'?'rundll32.exe':process.platform==='darwin'?'open':'xdg-open';
 const args=process.platform==='win32'?['url.dll,FileProtocolHandler',url]:[url];
 const child=spawn(command,args,{detached:true,stdio:'ignore',windowsHide:true});child.on('error',()=>{});child.unref();
}
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml','.hdr':'application/octet-stream','.glb':'model/gltf-binary','.gltf':'model/gltf+json','.bin':'application/octet-stream','.woff2':'font/woff2'};
const server=http.createServer(async(req,res)=>{
 try{
  const pathname=decodeURIComponent(new URL(req.url,url).pathname);
  if(pathname==='/__health'){res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify({app:'hours-between',version:'1.0.0',ready:true}));return;}
  const file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
  if(file!==root&&!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
  const stat=await fsp.stat(file);if(!stat.isFile())throw Error('Not a file');const ext=path.extname(file);
  const headers={'Content-Type':mime[ext]||'application/octet-stream','Cache-Control':ext==='.html'?'no-cache':'public, max-age=3600','X-Content-Type-Options':'nosniff'};
  if(/gzip/.test(req.headers['accept-encoding']||'')&&['.js','.css','.html','.json','.svg'].includes(ext)){headers['Content-Encoding']='gzip';headers.Vary='Accept-Encoding';res.writeHead(200,headers);fs.createReadStream(file).pipe(createGzip()).pipe(res);}
  else{headers['Content-Length']=stat.size;res.writeHead(200,headers);fs.createReadStream(file).pipe(res);}
 }catch{res.writeHead(404,{'Content-Type':'text/plain; charset=utf-8'});res.end('旅程文件未找到。请确认 dist 文件夹完整。');}
});
server.on('error',async error=>{
 if(error.code==='EADDRINUSE'){
  try{const response=await fetch(url+'__health');const health=await response.json();if(health.app==='hours-between'){if(process.argv.includes('--open'))openBrowser();process.exit(0);}}catch{}
  console.error(`端口 ${port} 已被占用。可设置 RAIL_PORT 使用其他端口。`);
 }else console.error(error);
 process.exit(1);
});
server.listen(port,'127.0.0.1',()=>{console.log(`晚点之前 · ${url}`);if(process.argv.includes('--open'))openBrowser();});
