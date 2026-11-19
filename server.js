'use strict';
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const crypto = require('crypto');
const path = require('path');
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: true, methods: ['GET','POST'] } });
const PORT = Number(process.env.PORT || 3000);
const rooms = new Map();
app.use(express.static(path.join(__dirname, 'public')));
app.get('/health', (_req,res) => res.json({ok:true, service:'nirino-monopoly'}));
const spaces = [
 {name:'MULAI',type:'start',icon:'🚩',color:'#334155'},
 {name:'Kampung Jawa',type:'property',price:60,rent:12,icon:'🏠',color:'#9b6b43'},
 {name:'Kesempatan',type:'chance',icon:'❔',color:'#0f766e'},
 {name:'Pasar Pagi',type:'property',price:80,rent:16,icon:'🏪',color:'#9b6b43'},
 {name:'Pajak Kota',type:'tax',amount:50,icon:'💸',color:'#475569'},
 {name:'Stasiun',type:'property',price:120,rent:25,icon:'🚉',color:'#64748b'},
 {name:'Taman Kota',type:'property',price:100,rent:20,icon:'🌳',color:'#16835d'},
 {name:'Istirahat',type:'rest',icon:'🛋️',color:'#475569'},
 {name:'Mall Sentosa',type:'property',price:140,rent:30,icon:'🏬',color:'#2563eb'},
 {name:'Kesempatan',type:'chance',icon:'❔',color:'#0f766e'},
 {name:'Penjara',type:'jail',icon:'🚔',color:'#334155'},
 {name:'Pantai Indah',type:'property',price:160,rent:35,icon:'🏖️',color:'#0891b2'},
 {name:'Listrik',type:'property',price:150,rent:32,icon:'💡',color:'#d97706'},
 {name:'Hotel Bintang',type:'property',price:180,rent:40,icon:'🏨',color:'#7c3aed'},
 {name:'Pajak Kota',type:'tax',amount:80,icon:'💸',color:'#475569'},
 {name:'Terminal',type:'property',price:190,rent:42,icon:'🚌',color:'#64748b'},
 {name:'Apartemen',type:'property',price:210,rent:48,icon:'🏢',color:'#2563eb'},
 {name:'Kesempatan',type:'chance',icon:'❔',color:'#0f766e'},
 {name:'Pusat Bisnis',type:'property',price:240,rent:55,icon:'🏙️',color:'#7c3aed'},
 {name:'Masuk Penjara',type:'gotojail',icon:'🚨',color:'#991b1b'}
];
const colors=['#ff6b6b','#38bdf8','#fbbf24','#a78bfa'];
function code(){return crypto.randomBytes(3).toString('hex').toUpperCase();}
function cleanName(s){return String(s||'Pemain').trim().replace(/[<>\u0000-\u001f]/g,'').slice(0,18)||'Pemain';}
function pub(room){return {code:room.code,started:room.started,finished:!!room.finished,turn:room.turn,turns:room.turns,maxTurns:40,pending:room.pending,players:room.players.map(p=>({...p})),spaces:spaces.map((s,i)=>({...s,owner:room.owners[i]??null,occupants:room.players.filter(p=>p.active&&p.pos===i).map(p=>({id:p.id,name:p.name,color:p.color}))})),log:room.log.slice(-8),creator:room.creator};}
function emit(room){io.to(room.code).emit('state',pub(room));}
function log(room,msg){room.log.push(msg); if(room.log.length>30)room.log.shift();}
function current(room){return room.players[room.turn];}
function advance(room){room.pending=null; let n=0; do{room.turn=(room.turn+1)%room.players.length;n++;}while(!room.players[room.turn].active&&n<=room.players.length);room.turns++;}
function finishIfNeeded(room){const alive=room.players.filter(p=>p.active); if(room.turns>=40||alive.length<=1){room.started=false;room.finished=true;const ranked=[...room.players].sort((a,b)=>(b.coins+net(room,b.id))-(a.coins+net(room,a.id)));log(room,'🏆 Selesai! Pemenang: '+(ranked[0]?.name||'-'));emit(room);return true;}return false;}
function net(room,id){return Object.entries(room.owners).filter(([,v])=>v===id).reduce((s,[i])=>s+(spaces[+i].price||0),0);}
function player(room,id){return room.players.find(p=>p.id===id);}
function act(room,socketId,action){const p=player(room,socketId);if(!p||!p.active)return {error:'Kamu bukan pemain aktif di room ini.'};if(!room.started)return {error:'Permainan belum dimulai.'};if(current(room)?.id!==socketId)return {error:'Belum giliranmu.'};if(room.pending!==null&& !['buy','skip'].includes(action))return {error:'Pilih Beli atau Lewati dulu.'};
 if(action==='buy'||action==='skip'){const i=room.pending;if(i===null)return {error:'Tidak ada properti yang menunggu.'};const s=spaces[i];if(action==='buy'){if(p.coins<s.price)return {error:'Koin tidak cukup untuk membeli.'};p.coins-=s.price;room.owners[i]=p.id;log(room,`🏠 ${p.name} membeli ${s.name} seharga ${s.price} koin.`);}else log(room,`${p.name} melewati ${s.name}.`);advance(room);finishIfNeeded(room);emit(room);return {};}
 if(action!=='roll')return {error:'Aksi tidak dikenal.'};if(p.jail){p.jail=false;log(room,`🚔 ${p.name} melewatkan giliran dari penjara.`);advance(room);finishIfNeeded(room);emit(room);return {};}
 const dice=1+Math.floor(Math.random()*6),old=p.pos,next=(old+dice)%spaces.length;p.pos=next;let note=`🎲 ${p.name} melempar ${dice}, tiba di ${spaces[next].name}.`;if(old+dice>=spaces.length){p.coins+=100;note+=' Lewat MULAI: +100 koin.';}
 const s=spaces[next];if(s.type==='property'){const owner=room.owners[next];if(!owner){room.pending=next;log(room,note+` Harga ${s.price}, sewa ${s.rent}.`);emit(room);return {};}if(owner!==p.id){const op=player(room,owner),rent=Math.min(p.coins,s.rent);p.coins-=rent;if(op)op.coins+=rent;note+=` Bayar sewa ${rent} koin kepada ${op?.name||'pemain'}.`;}}
 else if(s.type==='tax'){const fee=Math.min(p.coins,s.amount);p.coins-=fee;note+=` Membayar pajak ${fee} koin.`;}
 else if(s.type==='chance'){const n=Math.floor(Math.random()*3);if(n===0){p.coins+=80;note+=' Kesempatan: bonus +80 koin!';}else if(n===1){const loss=Math.min(60,p.coins);p.coins-=loss;note+=` Biaya tak terduga -${loss} koin.`;}else{p.coins+=30;note+=' Hadiah +30 koin!';}}
 else if(s.type==='gotojail'){p.pos=10;p.jail=true;note+=' Masuk penjara dan melewatkan giliran berikutnya.';}else if(s.type==='rest')note+=' Istirahat sejenak.';
 if(p.coins<=0){p.coins=0;p.active=false;note+=' Bangkrut dan keluar dari permainan.';}log(room,note);advance(room);finishIfNeeded(room);emit(room);return {};}
io.on('connection',socket=>{
 socket.on('create',({name}={})=>{let c=code();while(rooms.has(c))c=code();const p={id:socket.id,name:cleanName(name),coins:1500,pos:0,active:true,jail:false,color:colors[0]};const r={code:c,creator:socket.id,players:[p],owners:{},started:false,finished:false,turn:0,turns:0,pending:null,log:['Lobby dibuat. Bagikan kode room kepada temanmu.']};rooms.set(c,r);socket.join(c);socket.data.room=c;socket.emit('created',{code:c});emit(r);});
 socket.on('join',({code,name}={})=>{const c=String(code||'').toUpperCase().trim(),r=rooms.get(c);if(!r)return socket.emit('errorMsg','Room tidak ditemukan.');if(r.started||r.finished)return socket.emit('errorMsg','Permainan sudah dimulai atau selesai.');if(r.players.length>=4)return socket.emit('errorMsg','Room sudah penuh (maksimal 4 pemain).');if(r.players.some(p=>p.id===socket.id))return socket.emit('errorMsg','Kamu sudah bergabung.');const p={id:socket.id,name:cleanName(name),coins:1500,pos:0,active:true,jail:false,color:colors[r.players.length]};r.players.push(p);socket.join(c);socket.data.room=c;log(r,p.name+' bergabung.');socket.emit('joined',{code:c});emit(r);});
 socket.on('start',()=>{const r=rooms.get(socket.data.room);if(!r)return;if(r.creator!==socket.id)return socket.emit('errorMsg','Hanya pembuat room yang bisa memulai.');if(r.players.length<2)return socket.emit('errorMsg','Butuh minimal 2 pemain.');if(r.started)return;r.started=true;r.turn=Math.floor(Math.random()*r.players.length);log(r,'Permainan dimulai! Giliran pertama: '+current(r).name+'.');emit(r);});
 socket.on('action',({action}={})=>{const r=rooms.get(socket.data.room);if(!r)return socket.emit('errorMsg','Room tidak ditemukan.');const out=act(r,socket.id,String(action||''));if(out.error)socket.emit('errorMsg',out.error);});
 socket.on('disconnect',()=>{const c=socket.data.room,r=rooms.get(c);if(!r)return;const p=player(r,socket.id);if(p&&!r.started){r.players=r.players.filter(x=>x.id!==socket.id);if(r.creator===socket.id)r.creator=r.players[0]?.id||null;log(r,p.name+' keluar dari lobby.');emit(r);}else if(p&&r.started){p.active=false;log(r,p.name+' terputus dan dianggap keluar.');if(finishIfNeeded(r))return; if(current(r)?.id===socket.id)advance(r);finishIfNeeded(r);emit(r);}if(!r.players.length)rooms.delete(c);});
});
server.listen(PORT,'0.0.0.0',()=>console.log(`NIRINO Monopoly listening on ${PORT}`));
