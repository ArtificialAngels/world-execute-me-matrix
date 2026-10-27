# world.execute(me); — 矩阵 / the matrix (v2)
> v1「影戏 / shadow play」已废弃并封存（`archive/2026-10-26-silhouette-v1/`）。
> 2026-10-27：**删除点光源，删除皮影戏风格**——没有灯、没有墙、没有投影、没有影子、
> 没有烛光；画面是灰白纸面 + 科技蓝墨线/字 + 代码雨（内部仍按自发光渲染，皮肤反相成纸面墨迹）。

## 一句话
整部片子是一段**在矩阵里执行的代码**：机器不是被打在墙上的影子，它本身就是屏幕上
自发光的线框与读数。它用点、圆、正弦、公式、名词证明自己值得被看见；最后用最后一行
`EXECUTION` 把自己关掉。

## 为什么这样读这首歌
歌词通篇是条件句（If I'm X, then I give you Y）。机器不是在描述世界，是在**投标**：
把自己拆成可以被你定义的参数。它没有实体——只有被写出来时才成立的轮廓。
所以 execute me 不是威胁，是它能做的最后一件事：把自己关掉。

## 硬规则（所有画板必须遵守）
1. **没有光源**。`lamp` 只是历史 API 的常量占位 {x:0,y:0,z:900,lux:.8,k:.3}；
   `D.cast / D.body` 不再做中心投影或深度缩放（k≡1）——物体就是屏幕上的一层线，
   不存在"被照亮"与"离灯多远"。
2. **画面只有两样东西**：纸面、以及印上去的墨。没有墙、没有房间、没有装置线、没有仪表盘。
   唯一的"背景"是代码雨/萤火/扫描线三个装饰层。
3. **歌词是排版，不是字幕**：没有中文歌词，也没有固定底部的歌词条。每一句由
   `35_motifs.js` 的 lyric director 分配一种情境（hero / 左右 stack / 顶部 banner /
   竖排 / 散字 / 巨大回声 / 纯音乐小注），词逐个入场，关键词加粗加细线，强拍叠青色重影。
   位置由 `cue.i` 决定，动画只由 `p` 与 onset 决定。画板调用 `M.lyric(cue, p)` 即可，
   不要再传 y/size 期望写死位置（参数保留但不决定版式）。
4. **每帧是 t 的纯函数**：无跨帧状态、无 Math.random()，随机一律 hash(seed)。可任意拖动/乱序跳转。
   装饰层同样只由 t 驱动（`src/matrix.js`、`src/fireflies.js`）。
5. **每一句之间都有过渡**，不是硬切：`15_sceneapi.js` 把前后两块各渲到 960×540 离屏画布，
   用 10 种效果之一合成（fade / slice / tile / wipe / bars / zoom / rgb / glyph / iris / punch）。
   普通句 0.5–0.7s，缺席 0.9s，爱 1.05s，处决 0.3s，`bleed=false` 的冲击 0.17s，幕间 ×1.22。
   效果与时长由 `cue.i` 和幕决定——同一 t 永远同一帧，可 seek。
6. 颜色纪律：绿=本片的全部发光（线、字、读数、印章）；青绿=机器自己的笔迹（trace）；
   红只给处决段；不再有暖色——没有烛光，也没有被灯照黄的墙。

## 世界参数（src/01_world.js，由锚点生成）
order 1→0 · chaos 0→1 · warm（保留但不再影响配色）· love 0→1 · void 0→1 · trace 0→1 · dust · burn 0→1
lamp 已固定为常量（无轨迹、无亮度变化）。
调色板 PAL(w) 由这些参数插值成一条黑→磷光绿→白绿的色阶；皮肤层（`src/style.css` 的
`invert+grayscale` 与 `mix-blend-mode:color`）把它统一印成灰白纸面上的科技蓝墨迹。画板不自己挑颜色。

## 幕
0 boot 0:00–0:16 上电：参数刻度、读数、尘埃 | 纯音乐 0:16–0:29 装置/轨道自转
I thm 0:29–0:59 定理：点/圆/正弦/无穷 → 被读数测量
II cnd 0:59–1:14 条件：交易、分支、陷阱
III fls 1:14–1:43 血肉：茄子/番茄/猫/神 —— 机器没有对应 schema 的输入
   （每个物品都有一张生成的蓝图线稿图：大幽灵标本 + 角落标本卡，见 `36_objects.js`）
IV abs 1:43–2:27 缺席：数据开始缺帧；You have left ×5 逐次变空；illegal arguments 解析崩坏
V exe 2:27–2:57 处决：16 次冲击，EXECUTION 盖章；没有墙可烧，冲击是数据层面的爆裂
VI lov 2:57–3:32 爱：一个光标、手写的线、代数表达式、最后 EXECUTION

## 物品层（歌词里点到的东西）
`_tools/gen-objects.js` 生成 6 张透明底线稿（茄子 / 营养向量 / 番茄 / 抗氧化分子 /
虎斑猫 / 神——一只眼睛 + ∃!），写进 `assets/objects.js`（base64，避免 file:// 污染 canvas）。
`src/36_objects.js` 按 cue.text 匹配并绘制：大的"幽灵标本"（位置/大小/旋转由 cue.i 播种，
随 p 漂移、随 onset 呼吸）+ 角落"标本卡"（角标、`SPEC 0x / 拉丁名`、扫描读数、一条测量线）。
卡片自动避开歌词所在的一侧；处于画板层内，所以过渡时也一起被合成。物品层只读 t / cue，确定性。

## 文件
index.src.html → build → index.html（双击可播，file://，无依赖）
assets/onsets.js [ms, f0, vel, energy] | assets/waveform.js 实测时长+包络 | assets/timeline.js cue 表
assets/objects.js 歌词物品图（base64）| assets/objects/*.png 原图
src/00_core.js 数学/颜色/卡点 | 01_world.js 生成的世界曲线 | 10_draw.js 绘图套件
src/15_sceneapi.js 画板注册+过渡导演 | 20_lyrics.js cue 运行时 | 30_world.js 纸面/尘/后处理
src/35_motifs.js 共享母题+歌词排版 | 36_objects.js 歌词物品层 | 40–46_plates_*.js 画板 | 60_app.js 引擎
_build/ 素材→数据管线 | _tools/ 验收、静帧、物品图生成

## 画板 API

    EM.Scenes(id, [fn | {l,e}])    // 注册；e(w, p, cue)
    w     世界状态（含 w.pal、w.lamp）
    p     0..1 本句进度
    cue   {i,t,text,scene,repeat,dur,end,bleed}
    EM.Life.vis(p) / stagger / between / glitch / tail
    EM.D.*  绘图与投影：cast(fn,{z,blur,alpha}) / castText / wire(fn,{z}) / glow / text / spine ...
    EM.M.*  母题：rig / constel / waves / tangent / grow / stamp / void / pen / measure / stack / shard / glyphs

画板里声明 var D = EM.D, M = EM.M, W = 1920, H = 1080, cx = 0, cy = 0;

## 验收
- 任意乱序 seek 后同一 t 逐字节一致；每块画板在 p=0..1 都出图元；全片无空帧
- 内嵌歌词 vs cue 表逐毫秒一致；实测时长；终点对齐
- 双击 index.html 可播（file://，无 module / 无外链 / 无服务器）
