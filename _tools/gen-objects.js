'use strict';
/* gen-objects.js — draw the lyric objects as blueprint line art (transparent PNG).
   Bright white/cyan strokes on transparency: the film's skin inverts them into
   blue ink on paper. Deterministic: no random, only fixed geometry. */
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');

const OBJ = [
  { id: 'eggplant', label: 'OBJ-01 / SOLANUM MELONGENA' },
  { id: 'nutrients', label: 'OBJ-02 / NUTRIENT VECTOR' },
  { id: 'tomato', label: 'OBJ-03 / SOLANUM LYCOPERSICUM' },
  { id: 'antiox', label: 'OBJ-04 / ANTIOXIDANT' },
  { id: 'cat', label: 'OBJ-05 / FELIS CATUS' },
  { id: 'god', label: 'OBJ-06 / DEUS EX MACHINA' }
];

const PAINT = `function paint(ctx){
  const INK='rgba(236,250,255,0.96)', INK2='rgba(236,250,255,0.55)', INK3='rgba(236,250,255,0.28)';
  function line(x1,y1,x2,y2,w,a){ctx.save();ctx.strokeStyle=a?('rgba(236,250,255,'+a+')'):INK;ctx.lineWidth=w||6;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();ctx.restore();}
  function path(pts,closed,w,a,fill){ctx.save();ctx.strokeStyle=a?('rgba(236,250,255,'+a+')'):INK;if(fill)ctx.fillStyle=fill;ctx.lineWidth=w||6;ctx.lineJoin='round';ctx.lineCap='round';ctx.beginPath();ctx.moveTo(pts[0][0],pts[0][1]);for(let i=1;i<pts.length;i++)ctx.lineTo(pts[i][0],pts[i][1]);if(closed)ctx.closePath();if(fill&&closed)ctx.fill();ctx.stroke();ctx.restore();}
  function curve(pts,closed,w,a,fill){ctx.save();ctx.strokeStyle=a?('rgba(236,250,255,'+a+')'):INK;if(fill){ctx.fillStyle=fill;}ctx.lineWidth=w||6;ctx.lineJoin='round';ctx.lineCap='round';ctx.beginPath();ctx.moveTo(pts[0][0],pts[0][1]);for(let i=1;i<pts.length-1;i++){const mx=(pts[i][0]+pts[i+1][0])/2,my=(pts[i][1]+pts[i+1][1])/2;ctx.quadraticCurveTo(pts[i][0],pts[i][1],mx,my);}const last=pts[pts.length-1];ctx.lineTo(last[0],last[1]);if(closed)ctx.closePath();if(fill&&closed)ctx.fill();ctx.stroke();ctx.restore();}
  function ring(x,y,r,w,a){ctx.save();ctx.strokeStyle=a?('rgba(236,250,255,'+a+')'):INK;ctx.lineWidth=w||5;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.stroke();ctx.restore();}
  function dot(x,y,r,a){ctx.save();ctx.fillStyle=a?('rgba(236,250,255,'+a+')'):INK;ctx.beginPath();ctx.arc(x,y,r||5,0,Math.PI*2);ctx.fill();ctx.restore();}
  function hatch(x,y,w,h,gap,ang,a){ctx.save();ctx.beginPath();ctx.rect(x,y,w,h);ctx.clip();ctx.strokeStyle='rgba(236,250,255,'+(a||0.18)+')';ctx.lineWidth=3;const diag=Math.hypot(w,h);ctx.translate(x+w/2,y+h/2);ctx.rotate(ang||0.6);for(let i=-diag;i<=diag;i+=gap||18){ctx.beginPath();ctx.moveTo(i,-diag);ctx.lineTo(i,diag);ctx.stroke();}ctx.restore();}
  function annotate(txt){ctx.save();ctx.fillStyle='rgba(236,250,255,0.6)';ctx.font='500 20px "Cascadia Mono", Consolas, monospace';ctx.textAlign='left';ctx.fillText(txt,64,984);ctx.restore();}
  function tnode(x,y,r){ring(x,y,r||10,3,0.7);dot(x,y,3,0.9);}
  return {line,path,curve,ring,dot,hatch,annotate,tnode,INK,INK2,INK3};
}`;

const DRAW = {
  eggplant: `(function(g){
    const {line,path,curve,ring,dot,hatch,annotate,tnode}=g;
    // body: a bent ovoid, drawn twice (outline + inner contour)
    const body=[[470,250],[380,360],[360,520],[400,690],[500,780],[610,760],[680,650],[690,500],[650,360],[560,270]];
    curve(body,true,9,0.95,'rgba(236,250,255,0.05)');
    curve([[500,300],[440,420],[440,600],[500,720],[600,730],[650,620],[650,470],[590,330]],true,4,0.35);
    // calyx: five pointed leaves + stem
    line(560,270,548,170,8,0.95); line(548,170,566,120,8,0.95);
    const leaves=[[560,270],[470,225],[500,300],[560,300],[620,300],[650,225]];
    curve(leaves,true,6,0.8);
    line(560,270,470,225,5,0.6); line(560,270,650,225,5,0.6); line(560,270,500,330,5,0.5);
    // seeds / nodes
    for(let i=0;i<5;i++){tnode(500+ (i%3)*70, 430+Math.floor(i/3)*110, 8);}
    // dimension line + ticks
    line(300,760,300,300,3,0.3); line(282,300,318,300,3,0.5); line(282,760,318,760,3,0.5);
    line(330,650,700,650,3,0.18); line(330,650,342,638,3,0.4); line(700,650,688,638,3,0.4);
    // hatch near the bottom
    hatch(430,690,220,80,16,0.5,0.16);
    annotate('OBJ-01 / SOLANUM MELONGENA');
  })`,
  nutrients: `(function(g){
    const {line,path,curve,ring,dot,hatch,annotate,tnode}=g;
    // three droplets + molecular bonds
    function drop(cx,cy,r,rot){
      const pts=[];for(let i=0;i<24;i++){const a=i/24*Math.PI*2;const rr=r*(1+0.10*Math.sin(a*3+rot));pts.push([cx+Math.cos(a)*rr,cy+Math.sin(a)*rr]);}
      pts.push([cx,cy-r*1.65]); curve(pts,true,7,0.85,'rgba(236,250,255,0.04)');
      ring(cx,cy,r*0.55,3,0.35);
    }
    drop(430,470,120,0.3); drop(600,380,78,1.1); drop(620,620,64,2.0);
    // bonds
    const nodes=[[430,470],[600,380],[620,620],[740,470],[350,640],[520,760]];
    for(let i=0;i<nodes.length;i++)for(let j=i+1;j<nodes.length;j++){
      const d=Math.hypot(nodes[i][0]-nodes[j][0],nodes[i][1]-nodes[j][1]);
      if(d<290){line(nodes[i][0],nodes[i][1],nodes[j][0],nodes[j][1],3,0.22);}
    }
    nodes.forEach(function(n){tnode(n[0],n[1],9);});
    // little arrows: "give you"
    line(300,830,520,830,4,0.5); line(520,830,498,812,4,0.5); line(520,830,498,848,4,0.5);
    line(560,830,760,830,4,0.35); line(760,830,738,812,4,0.35); line(760,830,738,848,4,0.35);
    annotate('OBJ-02 / NUTRIENT VECTOR');
  })`,
  tomato: `(function(g){
    const {line,path,curve,ring,dot,hatch,annotate,tnode}=g;
    // lobed body
    const b=[];for(let i=0;i<48;i++){const a=i/48*Math.PI*2;const r=230*(1+0.045*Math.cos(a*5)+0.02*Math.sin(a*9));b.push([540+Math.cos(a)*r,560+Math.sin(a)*r*0.94]);}
    curve(b,true,9,0.95,'rgba(236,250,255,0.05)');
    // cross-section radii (abstract segments)
    for(let i=0;i<5;i++){const a=i/5*Math.PI*2-0.3;line(540,560,540+Math.cos(a)*205,560+Math.sin(a)*192,4,0.30);}
    ring(540,560,96,3,0.35); ring(540,560,40,3,0.45);
    // calyx: five sepals + stem
    line(540,330,532,240,9,0.95); line(532,240,556,200,8,0.9);
    const sepals=[[540,330],[430,300],[470,370],[540,380],[610,370],[650,300]];
    curve(sepals,true,6,0.85);
    for(let i=0;i<5;i++){const a=i/5*Math.PI*2;line(540,330,540+Math.cos(a)*120,330+Math.sin(a)*62,4,0.45);}
    // highlight
    curve([[420,470],[380,540],[400,640]],false,5,0.35);
    hatch(430,700,220,90,18,0.4,0.14);
    annotate('OBJ-03 / SOLANUM LYCOPERSICUM');
  })`,
  antiox: `(function(g){
    const {line,path,curve,ring,dot,hatch,annotate,tnode}=g;
    // hexagon molecule + electron orbits + shield arc
    const cx=520,cy=520,R=210;
    const hex=[];for(let i=0;i<6;i++){const a=i/6*Math.PI*2-Math.PI/2;hex.push([cx+Math.cos(a)*R,cy+Math.sin(a)*R]);}
    curve(hex,true,7,0.9);
    hex.forEach(function(p){tnode(p[0],p[1],14);});
    // bonds through the middle
    for(let i=0;i<3;i++){line(hex[i][0],hex[i][1],hex[(i+3)%6][0],hex[(i+3)%6][1],4,0.25);}
    ring(cx,cy,96,3,0.35); ring(cx,cy,150,2,0.18);
    // electron orbits
    ctx.save();ctx.strokeStyle='rgba(236,250,255,0.5)';ctx.lineWidth=4;
    for(let k=0;k<3;k++){ctx.beginPath();ctx.ellipse(cx,cy,300,140,k*Math.PI/3,0,Math.PI*2);ctx.stroke();}
    ctx.restore();
    // shield arc
    ctx.save();ctx.strokeStyle='rgba(236,250,255,0.28)';ctx.lineWidth=8;ctx.beginPath();ctx.arc(cx,cy,330,-1.1,1.1);ctx.stroke();ctx.restore();
    annotate('OBJ-04 / ANTIOXIDANT');
  })`,
  cat: `(function(g){
    const {line,path,curve,ring,dot,hatch,annotate,tnode}=g;
    // sitting cat, side view, line art
    // body
    curve([[560,760],[470,720],[430,600],[450,500],[520,470],[600,500],[650,600],[680,720]],true,9,0.95,'rgba(236,250,255,0.04)');
    // head
    ring(560,380,130,9,0.95);
    // ears
    line(470,300,430,170,9,0.9); line(430,170,520,250,9,0.9);
    line(650,300,700,170,9,0.9); line(700,170,600,250,9,0.9);
    // face
    dot(510,370,9,0.95); dot(610,370,9,0.95);
    line(560,410,548,438,4,0.6); line(548,438,580,442,4,0.6);
    // whiskers
    for(let i=0;i<3;i++){line(470,420+i*18,330,400+i*26,3,0.45);line(650,420+i*18,790,400+i*26,3,0.45);}
    // tabby stripes
    for(let i=0;i<4;i++){curve([[500+i*30,250],[540+i*30,270],[575+i*30,255]],false,4,0.35);}
    for(let i=0;i<3;i++){line(480,560+i*46,660,540+i*46,4,0.30);}
    // tail
    curve([[680,720],[780,700],[820,610],[790,540],[750,560]],false,8,0.85);
    // paws
    line(470,760,560,760,6,0.8); line(590,760,680,760,6,0.8);
    // sight line + target
    line(560,380,860,300,3,0.25); ring(860,300,16,3,0.5); line(860,286,860,314,2,0.5);
    annotate('OBJ-05 / FELIS CATUS');
  })`,
  god: `(function(g){
    const {line,path,curve,ring,dot,hatch,annotate,tnode}=g;
    const cx=512,cy=500;
    // eye
    curve([[180,500],[320,380],[512,350],[704,380],[844,500],[704,620],[512,650],[320,620]],true,9,0.95,'rgba(236,250,255,0.03)');
    ring(cx,cy,128,8,0.9); ring(cx,cy,72,5,0.7); dot(cx,cy,34,0.9);
    ring(cx,cy,34,3,0.9);
    // rays
    for(let i=0;i<12;i++){const a=i/12*Math.PI*2;line(cx+Math.cos(a)*300,cy+Math.sin(a)*300,cx+Math.cos(a)*380,cy+Math.sin(a)*380,4,0.35);}
    ring(cx,cy,340,3,0.25);
    // halo
    ring(cx,cy,250,4,0.3);
    // glyph: existence
    ctx.save();ctx.fillStyle='rgba(236,250,255,0.8)';ctx.font='600 64px "Cascadia Mono", Consolas, monospace';ctx.textAlign='center';ctx.fillText('\\u2203!', cx, 860);ctx.restore();
    // nodes
    tnode(180,500,10); tnode(844,500,10); tnode(512,350,10); tnode(512,650,10);
    annotate('OBJ-06 / DEUS EX MACHINA');
  })`
};

(async () => {
  const root = path.resolve(__dirname, '..');
  const out = path.join(root, 'assets', 'objects');
  fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch({ channel: 'chrome', headless: true });
  const p = await b.newPage({ viewport: { width: 1024, height: 1024 } });
  await p.goto('data:text/html,<html><body style="margin:0;background:transparent"></body></html>');
  for (const o of OBJ) {
    const data = await p.evaluate(({ id, code, paint }) => {
      const c = document.createElement('canvas'); c.width = 1024; c.height = 1024;
      const ctx = c.getContext('2d');
      const g = new Function('ctx', paint + ';return paint(ctx);')(ctx);
      new Function('ctx', 'g', 'const {' + Object.keys(g).filter(k => k !== 'paint').join(',') + '}=g;' + code + '(g);')(ctx, g);
      return c.toDataURL('image/png');
    }, { id: o.id, code: DRAW[o.id], paint: PAINT });
    fs.writeFileSync(path.join(out, o.id + '.png'), Buffer.from(data.split(',')[1], 'base64'));
    console.log('wrote assets/objects/' + o.id + '.png');
  }
  /* also emit a base64 bundle: file:// images taint the canvas, data URIs do not */
  const lines = ['/* GENERATED by _tools/gen-objects.js — the lyric objects as transparent PNG data URIs */',
    'window.EM_OBJECTS = {'];
  for (let i = 0; i < OBJ.length; i++) {
    const o = OBJ[i];
    const buf = fs.readFileSync(path.join(out, o.id + '.png'));
    lines.push('  ' + JSON.stringify(o.id) + ': ' + JSON.stringify('data:image/png;base64,' + buf.toString('base64')) + (i < OBJ.length - 1 ? ',' : ''));
  }
  lines.push('};');
  fs.writeFileSync(path.join(root, 'assets', 'objects.js'), lines.join('\n') + '\n');
  console.log('wrote assets/objects.js');
  await b.close();
})().catch(e => { console.error('FAILED', e.message); process.exit(1); });
