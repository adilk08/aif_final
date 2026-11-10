import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {execFile} from 'node:child_process';
const root=process.cwd(),port=4173;
const open=()=>{if(process.argv.includes('--open')&&process.platform==='win32')execFile('cmd.exe',['/c','start','','http://127.0.0.1:4173']);};
const server=http.createServer((req,res)=>{
  let pathname;
  try{pathname=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname)}catch{res.writeHead(400);return res.end('Invalid URL')}
  const file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
  if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end('Forbidden')}
  fs.readFile(file,(err,data)=>{
    if(err){res.writeHead(404);return res.end('Not found')}
    res.setHeader('Cache-Control','no-store');
    res.setHeader('X-Content-Type-Options','nosniff');
    res.setHeader('Content-Type',({html:'text/html; charset=utf-8',js:'text/javascript; charset=utf-8',css:'text/css; charset=utf-8',svg:'image/svg+xml'})[file.split('.').pop()]||'application/octet-stream');
    res.end(data);
  });
});
server.on('error',e=>{if(e.code==='EADDRINUSE'){console.log('Сервер уже работает: http://127.0.0.1:4173');open();return}console.error('Не удалось запустить сервер:',e.message);process.exitCode=1;});
server.listen(port,'127.0.0.1',()=>{console.log('NEON LABYRINTH: http://127.0.0.1:4173');console.log('Закройте окно или нажмите Ctrl+C для остановки.');open()});
