import http from 'node:http';
import { stat } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import path from 'node:path';
const root = path.resolve(import.meta.dirname);
const port = Number(process.env.PORT || 4173);
const types = { '.glb':'model/gltf-binary', '.html':'text/html; charset=utf-8', '.css':'text/css; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.json':'application/json', '.png':'image/png', '.jpg':'image/jpeg', '.webp':'image/webp', '.svg':'image/svg+xml', '.mp4':'video/mp4', '.mov':'video/quicktime', '.woff2':'font/woff2', '.md':'text/plain; charset=utf-8' };
http.createServer(async (req,res) => {
  try {
    const name = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const file = path.resolve(root, '.' + (name === '/' ? '/index.html' : name));
    if (!file.startsWith(root + path.sep) || name.split('/').some(p=>p.startsWith('.'))) { res.writeHead(403).end(); return; }
    const s = await stat(file);
    if (!s.isFile()) throw new Error('not a file');
    const ext=path.extname(file).toLowerCase();
    const headers = { 'Content-Type': types[ext] || 'application/octet-stream', 'Accept-Ranges':'bytes', 'Cache-Control':['.html','.css','.js'].includes(ext)?'no-cache':'public, max-age=60', 'X-Content-Type-Options':'nosniff' };
    let start=0,end=s.size-1,status=200;
    if (req.headers.range) {
      const m=/^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
      if (!m) {res.writeHead(416,{'Content-Range':`bytes */${s.size}`}).end();return;}
      if (!m[1]) start=Math.max(0,s.size-Number(m[2]));
      else {start=Number(m[1]); if(m[2]) end=Math.min(end,Number(m[2]));}
      if(start>end||start>=s.size) {res.writeHead(416,{'Content-Range':`bytes */${s.size}`}).end();return;}
      status=206;headers['Content-Range']=`bytes ${start}-${end}/${s.size}`;
    }
    headers['Content-Length']=end-start+1;
    res.writeHead(status,headers);
    if(req.method==='HEAD') res.end(); else createReadStream(file,{start,end}).pipe(res);
  } catch {res.writeHead(404,{'Content-Type':'text/plain; charset=utf-8'}).end('文件未找到');}
}).listen(port,'127.0.0.1',()=>console.log(`入史 · http://127.0.0.1:${port}`));
