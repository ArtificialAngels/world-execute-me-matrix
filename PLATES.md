# PLATES.md — 画板写作手册（给协作者）

> 2026-10-27 改版：本片已**删除点光源与皮影戏风格**。没有灯、没有墙、没有投影、没有影子。
> 画面内部是自发光磷光绿，**皮肤层把它反相成灰白纸面上的科技蓝墨迹**；
> 所以你只需要用 `w.pal`，不要自己写颜色——颜色由皮肤统一印。历史版本见 DESIGN.md 顶部说明。

## 先读
1. `DESIGN.md` — 为什么是矩阵、硬规则
2. `src/40_plates_boot.js` — 9 块范例，照它的口气写
3. `src/10_draw.js` `src/35_motifs.js` — 你能用的全部函数
4. `src/01_world.js` — 世界参数（lamp 已是常量占位，不再有光的位置/亮度）

## 坐标系
1920×1080，原点在画面中心，y 向下。左上 (-960,-540)，右下 (960,540)。
歌词行默认放在 y≈330（caption 中文在 y≈474，别压）。画面没有光斑可避，
但**中间偏上留出主体，四周大片留黑**——黑是这部电影的一半。

## 你会反复用到的
```
var D = EM.D, M = EM.M, L = EM.Life, W = 1920, H = 1080;
var E = EM.E, clamp = EM.clamp, lerp = EM.lerp, hash = EM.hash, TAU = EM.TAU;

// 主体：整幅构图一次平面直绘（无投影；线是亮绿，块是暗玻璃）
M.shadow(function () {
  D.lw(2.4);                       // 线宽
  D.line(x1, y1, x2, y2);          // 立即描边
  D.circle(x, y, r); D.stroke();   // 先建路径再描边（和 canvas 一样）
  D.rect(x, y, w, h); D.fill();    // 填充（会被画成半透明暗绿块）
  D.polyline([[x,y],...], false);  // 折线（true = 闭合）
  D.spine([[x,y],...]); D.stroke();// 平滑曲线
}, { z: 0.32 });                   // z 只是历史参数，已不缩放、不模糊

// 第二层：更亮的轮廓（"高光"线）
M.rim(function () { D.lw(1); D.circle(x, y, r); D.stroke(); }, { alpha: 0.2 });

// 歌词：只传 cue 和 p 就够了——版式由 director 决定（位置/方向/尺度逐句不同）
M.lyric(cue, p);                    // 大多数画板就这样写
M.lyric(cue, p, { alpha: 0.9 });    // 只调不透明度；不要指望 y/size 决定位置
// 注：没有中文歌词；纯音乐句只出 mono 小注，不占画面主体。

// 机器自己的笔迹（冷青）——只用在这些地方：测量、坐标、编号、读数
M.measure(x1, y1, x2, y2, { label: 'dimension' });
M.crosshair(x, y, 120, { label: 'origin', ticks: true });
M.type('n = 12', { x: -760, y: -380, size: 16, mode: 'light', kind: 'mono', align: 'left', alpha: 0.4 });

// 其他母题
M.rig({ x0:-700, x1:700, y:-250, drop:120 });   // 横梁+吊线（旧语言，尽量别用）
M.constel({ n:9, r:240 });                      // 点阵
M.lattice({ cols:12, rows:7, step:90 });        // 格子
M.waves({ n:3, amp:60, per:260, cy:0 });        // 正弦带
M.tangents({ n:9, amp:80, per:300 });           // 切线
M.grow({ x:0, y:260, len:110, depth:5 });       // 生长枝条
M.stack({ n:6, w:420, h:260 });                 // 嵌套框
M.shard({ n:24, r0:60, r1:420 });               // 碎裂线
M.pierce(x, y, r, { alpha: .8 });               // 发光孔（emission，不是灯）
M.hand('LO-O-OVE', 0, 0, { size: 120 });        // 手写光（只用于爱幕）
M.stamp('EXECUTION', x, y, { size: 140 });      // 印章（只用于处决幕）
```

## 世界状态 w
`w.t` 时间；`w.lamp` 只是常量占位 `{x:0,y:0,z:900,lux:.8,k:.3}`（**没有点光源，别拿它当灯用**）；
`w.order/chaos/warm/love/trace/dust/burn/voidSize/wallAge` 0..1；
`w.pal` 调色板：`wallHi/wallMid/wallLo/shadow/hot/glow/trace/red/paper/ink` 与 `pal.tr(a)/pal.sh(a)`。
**不要自己写 rgba 常量当主色**，用 w.pal；`pal.shadow` 是发光主色（不是暗色）。冷青只能用 trace。

## 六条硬规则
1. 一切是**纸 + 墨**：内部用自发光渲染，皮肤印成灰白纸面 + 科技蓝墨；不画墙、不画灯、不画影子、不画仪表盘/边框/UI。
2. 不画"被照亮"：没有明暗面、没有投影方向、没有烛光。
3. 每块画板必须有**一个明确的主体**和**一处空**；不要铺满。
4. 动画必须来自 p（句内进度）或 w.t（绝对时间），**禁止跨帧状态、禁止 Math.random**。
5. 歌词只出现一次、放在约定位置（除非这块画板的构思就是"词即画面"）。
6. 画板内 save/restore 要成对；不要留 globalAlpha/filter/composite 给下一块。
7. **不要在画板里自己画转场/淡入淡出**：句与句之间的过渡由 `15_sceneapi.js` 统一做
   （10 种效果、按幕与节奏定时长），画板只负责"这一句本身的画面"。

## 预览与自查（必须做）
```
node _tools/render.js --scenes thm.sine --p 0.5 --t 37.15 --text "If I'm a sine wave" --out frames/r_thm
```
然后用 read_image 看 `frames/r_thm/thm.sine.png`。至少看 p=0.2 / 0.55 / 0.9 三张。
必须满足：有图元、构图不空、字不糊、四周留黑、与相邻幕的差别看得出来。
最后跑 `node build.js 2>&1 | tail -6` 确认 "no plate for" 里没有你的 scene。
（build 会重生成 index.html，别手动改 index.html。）

## 写文件
只改分配给你的那一个文件；不要改 src/00..60、assets、_build、_tools、index.html。
结构：`(function (EM) { 'use strict'; var D = EM.D, M = EM.M, L = EM.Life; ... EM.Scenes('id', function (w, p, cue) { ... }); })(window.EM);`

## 报告
完成后给 lead 发消息：文件、scene 数、你检查过的 p 值、遇到什么拿不准的地方（不要贴整段代码）。
