# CHANGELOG

> 说明：下文出现的 `frames/…` 是当时的检查截图/源帧，2026-10-27 项目瘦身时已清理；
> 随仓库保留的成品图统一在 `media/`（见 README 第 9 节）。

## 2026-10-27 (g) — 导出 1080p MP4

交付：`world.execute(me)-matrix-1080p24.mp4`（1920×1080 / 24fps / H.264 High / AAC 192k）。

### 做法
- 新增 `_tools/render-mp4.js`：确定性逐帧导出。每帧 `EM.MV.renderAt(t)` 后等两帧 rAF
  （让代码雨/萤火落到该 t），再用 CDP 截整页 PNG——CSS 皮肤（反相纸面 + 科技蓝 + 扫描线）
  一起进画面；支持断点续渲（已存在的帧跳过）。
- 新增 `_tools/encode-mp4.js`：PNG 序列 + 原曲 mp3 → mp4。BT.709 色域转换（`out_color_matrix=bt709`）、
  `-crf 16`、`-preset medium`、AAC 192k / 48k、`-shortest`、`+faststart`。
- 帧数 5086（211.913s × 24）；实测渲染 962s（5.3 fps），编码 ~1 分钟。

### 验收（实测）
```
video : h264 high, 1920x1080, 24/1 fps
audio : aac, 48000 Hz, stereo, 195 kbps
duration : 211.912875 s
size     : 227,183,400 B（216.7 MB），faststart
decode   : ffmpeg 全片解码无报错
抽帧     : mp4 帧 vs 源 PNG 对照一致（frames/mp4-compare.png：左 mp4 / 右 PNG）
```
文件：`world.execute(me)-matrix-1080p24.mp4`；源帧留在 `frames/video/`（5086 PNG，可重编码）。

---

## 2026-10-27 (f) — 修 2:47 / 3:27 的 EXECUTION 里 I 与 O 重叠

### 根因
`src/10_draw.js` 的 `D.text()` 在带 `tracking` 时是逐字 `fillText` 的，但没有把
`ctx.textAlign` 切成 `left`：于是每个字母都按 `center` 画在游标上，左右各吃掉相邻字母
半个字宽，负/小 tracking 时字距被二次压缩。Bahnschrift 的 O 本身还有负左边距，
"EXECUTION" 里的 I→O 就挤在一起（2:47 的大盖章、3:27 的收尾大字最明显）。

### 修订
- `10_draw.js`：tracking 分支里先把 `ctx.textAlign='left'` 再逐字绘制（`tw` 居中计算不变）。
  这一条修的是所有逐字排版，不只是 EXECUTION。
- `35_motifs.js`：`M.stamp()` 与 `M.type()` 的 light/stamp/ink 模式给大字加"按字号的最小字距"
  （`max(track, size*0.035)`），避免大字号时任何窄字与圆字再次贴合；歌词里的关键词
  （如 EXECUTION）也给最小字距。
- `35_motifs.js` lyric director：`exe.final` 这句不再由 director 重复打字（plate 自己会印两次，
  原来三份不同字号的 EXECUTION 叠在一起也会造成 I/O 错位）。

### 验收
```
node build.js                 → BUILD OK
node _tools/verify.js         → ALL CHECKS PASSED（确定性 12.5/60/150s）
node _tools/verify-browser.js → 100 plates / determinism+shuffle ok / 无空镜 / 无 console error / fps 120
```
对照：`frames/fix-compare2.png`（上排旧 2:47 / 3:27，下排新）；修订后 1920 静帧在
`frames/fix-final/`（`full_167.5.png`、`full_207.2.png` 与两张 I/O 放大图）。

---

## 2026-10-27 (e) — 歌词里点到的物品生成了图，并加入动画

目标：把歌词里的"东西"变成画面里的东西（可抽象、可具体）。

### 图片
- 新增 `_tools/gen-objects.js`：用 Playwright 在 1024×1024 透明画布上程序化画 6 张蓝图线稿——
  茄子、营养向量（液滴 + 分子键 + 箭头）、番茄、抗氧化分子（六元环 + 电子轨道 + 护盾弧）、
  虎斑猫（坐姿 + 尾巴 + 虎斑纹）、神（眼睛 + 光环 + 12 道射线 + `∃!`）。
  白线 + 透明底：皮肤的 `invert` 会把它印成纸上的蓝墨。
- 输出 `assets/objects/*.png` 与 `assets/objects.js`（base64 data URI）。
  用 data URI 而不是外链 PNG：`file://` 的外链图片会污染 canvas，导致 `toDataURL/getImageData`
  与验收工具失效；data URI 不会。
- `index.src.html` 增加 `assets/objects.js` 与 `src/36_objects.js`（build 已重生成 index.html）。

### 动画集成（`src/36_objects.js`）
- 按 `cue.text` 匹配：eggplant / nutrients / tomato / antioxidants / tabby cat|purr / god。
- 每条相关歌词给两件东西：
  1. **幽灵标本**：820–1010px，位置/旋转/明度由 `cue.i` 播种，缓慢呼吸 + 随 p 漂移 + 随 onset 涨落；
  2. **角落标本卡**：238px 线稿 + 细角标 + `SPEC 0x / 拉丁名` + 扫描读数 + 一条连向幽灵的测量线。
- 卡片位置会避开该句歌词所在的一侧（读 `EM.M.lyricFamily(cue)`），并避开左下角的矩阵读数。
- `god` 在缺席幕 "Challenging your God"（2:05.7）再次出现。
- 物品层挂在画板层内部（`15_sceneapi` 的普通渲染与过渡离屏渲染都会调用），
  所以过渡时物品一起被合成，不会在交界处跳出来；仍然只由 t / p / cue 决定。

### 验收
```
node build.js                 → BUILD OK（含新脚本）
node _tools/verify.js         → ALL CHECKS PASSED（确定性 12.5/60/150s）
node _tools/verify-browser.js → 100 plates / determinism+shuffle ok / 无空镜 / 无 console error
node _tools/bench-xf.js 74    → 120 fps（血肉幕、物品 + 幽灵同时在场，过渡密集段）
```
静帧：`frames/objects3/`（9 个物品时刻）、`frames/objects_sheet.png`（6 张原图对照）。

---

## 2026-10-27 (d) — 主题改成科技蓝，背景由黑改为灰白（blueprint skin）

目标：不再"黑底绿光"，改成"灰白纸面 + 科技蓝墨"的蓝图感，同时不重画 100 块画板。

### 做法（皮肤层，不改画板）
- 影片内部仍按"自发光 on 黑"渲染（100 块画板、歌词、过渡全部不动）。
- `src/style.css`：`#view { filter: invert(1) grayscale(1) brightness(.89) contrast(1.04) }`
  —— 黑底翻成灰白纸、亮线翻成深灰墨；
- `#stage::after { background:#2c6db2; mix-blend-mode:color; opacity:.55 }`：只改色相不改明度，
  把灰墨统一印成科技蓝，纸面保持灰白；
  `#stage::before` 再叠一层淡淡的 `multiply` 蓝，让纸面有重量；`#shell` 背景改成灰白渐变。
- 代码雨 `src/matrix.js`：绿→深蓝（10,44,96 / 20,70,140），`#matrix` 由 `screen` 改 `multiply`，
  像蓝油墨印在纸上；浮尘 `src/fireflies.js` 从大光斑改成 1–4px 小点、深蓝 + `multiply`
  （原来反相后会变成大块粉色晕染）；`#flies` 同步。
- `#crt` 扫描线改成淡蓝黑细线；HUD/控制条/开始层/波形全部换成深蓝 + 灰白面板（`src/style.css`、
  `src/60_app.js` 的波形颜色）。
- 调色板 / 歌词 / 过渡不需要改：过渡仍在影片层合成，反相后自动是"蓝墨转场"。

### 验收
```
node _tools/verify.js         → ALL CHECKS PASSED（确定性 12.5/60/150s）
node _tools/verify-browser.js → 100 plates / determinism+shuffle ok / 无空镜 / 无 console error
NODE_PATH=... node _tools/bench-xf.js → 117.6 fps（过渡密集段），p95 8.5ms
```
配色对照：`frames/tint/`（4 种染色配方）、`frames/palette/`（滤镜阶段拆解）；
成品静帧：`frames/blue-final/`、`frames/hero/`（1920）。

---

## 2026-10-27 (c) — 每一句之间加连续过渡（10 种，按时长与幕自动选）

目标：不再有硬切；段与段之间用自然、连续、多样的过渡接起来。

### 做法
- `src/15_sceneapi.js` 重写 `drawSequence`：每个 cue 边界开一个过渡窗口
  `[next.t − 0.26T, next.t + 0.74T]`；把「上一块」和「下一块」分别渲染到两张
  960×540 离屏画布（`renderTo`，用 `D.bind` 临时切上下文），再用一种效果合成到主画布。
- 10 种效果：fade / slice(18 横带) / tile(12×7 网格) / wipe(四向+扫描边) / bars(14 竖条) /
  zoom(推镜) / rgb(重影+撕裂带) / glyph(代码雨幕+暗场) / iris(圆形展开+绿环) / punch(冲击曝光)。
- 效果选择：普通边界走 19 步 CYCLE；幕间优先 glyph/iris/zoom/wipe/tile；同镜头重复走
  punch/blink/push；`bleed=false` 的 16 次处决冲击走 punch/slice/tile/rgb/zoom（0.17s）。
- 时长：普通 0.5–0.7s、缺席 0.92s、爱 1.05s、血肉 0.66s、处决 0.30s、幕间 ×1.22，
  再按下一句的 cue 时长 ×0.7–1.3；总过渡 99 条边界全覆盖（i=1..99），0.17–1.37s。
- 为了"不进黑"：过渡只替换**画板层**，黑场/数据网格/尘/片尾/post 由外层保持不动。

### 性能修正（重要）
- 第一版 tile/slice/bars 用 clip + 整幅 drawImage，单帧要重复合成 84/18/14 次全屏像素
  （约 1.7 亿像素/帧）。改成 `sub()` 按源矩形只拷该块（实际像素≈2M/帧），
  过渡期帧率从不可用恢复到与正常播放一致。
- glyph 幕减列数并加暗场，保证能"看见幕"而不是糊一层绿。

### 验收
```
node _tools/verify.js         → ALL CHECKS PASSED（确定性 12.5/60/150s 含过渡帧）
node _tools/verify-browser.js → 100 plates / determinism+shuffle ok / 无空镜 / 无 console error
NODE_PATH=... node _tools/bench-xf.js → 118.4 fps（播放 56–63s，含 5 个连续边界），p95 8.4ms
```
工具：`_tools/shot-xf.js`（每种效果出图，见 `frames/xf3/sheet.png`）、
`_tools/shot-xf-seq.js`（单条过渡按 u 采样，见 `frames/seq33b/`）。

---

## 2026-10-27 (b) — 歌词改成高级 MV 排版；删除中文歌词

目标：不做"底部字幕条"，歌词成为画面排版的一部分（kinetic typography）。

### 1. 删除中文歌词
- `src/30_world.js`：`caption()` 置空（中文行不再绘制）。
- `src/60_app.js`：不再调用 `EM.W.caption`，删除 `C` 键字幕开关。
- `index.src.html`：快捷键说明去掉"C 中文字幕"（触发 `node build.js` 重生成 index.html）。
- 歌词数据里的中文列仍保留在 `assets/timeline.js` / 内嵌 LRC（验收要比对），只是**不上屏**。

### 2. 新的 lyric director（`src/35_motifs.js`）
- 没有固定基线：按 `cue.i % 7` 分配 7 种版式——hero / 左 stack / 右 stack / 顶部 banner /
  竖排边缘 / 散字海报 / 巨大回声；纯音乐句走第 8 种（mono 小注 + 双细线 + 时间码）。
- 逐词入场：alpha + 位移 + letter-spacing（从宽收拢）easing；强 onset 叠青色重影并把 tracking 推大。
- 关键词（eggplant / cat / love / EXECUTION…）自动加粗、用高光色、词下加 1px 细线；处决幕混入红色。
- 每句带"编辑标记"：细线 + `时间 / 幕` mono 小字，跟随版式走。
- 全部由 cue.i 选版式、p/onset 驱动动画；仍然确定性（same t → same frame）。
- 画板原来传的 `y/size/fit/mode` 不再决定版式（参数保留兼容，只读到 `alpha` / `text`）。

### 3. 验收
```
node build.js                 → BUILD OK
node _tools/verify.js         → ALL CHECKS PASSED（确定性 / 无黑帧）
node _tools/verify-browser.js → plates 100 / 无空镜 / 无异常 / fps ≈120 / 无 console error
```

---

## 2026-10-27 — 删除点光源 / 删除皮影戏风格（矩阵改版）

目标：根目录 MV（`index.src.html` → `index.html` + `src/*`）不再使用"灯 → 墙 → 影子"的
皮影戏语言，也不保留任何可见点光源；画面改为黑底 + 自发光磷光绿线/字，配代码雨/扫描线/萤火。

### 1. 点光源（point light）
- `_build/world-anchors.js`：`lamp.x/y/z/lux/k` 轨迹全部删掉，固定为常量
  `x=0, y=0, z=900, lux=.8, k=.3`；`src/01_world.js` 已用 `node _build/gen-world.js` 重生。
- `src/30_world.js`：`light()` 变成空函数（不再画灯芯/光晕/曝光）；
  `dust()/dustNear()` 不再被灯照亮，只按 t 漂移；`wall()` 中的灯光环境项删除。
- `src/40_plates_boot.js`：删除灯丝点亮（`M.pierce(w.lamp…)`）。
- `src/42_plates_condition.js`：删除盖章瞬间的灯闪烁光斑。
- `src/45_plates_execution.js`：删除"灯过载"flare、`darkenFrame(灯)`、exe.back 的灯回光。
- `src/46_plates_love.js`：蜡烛/灯焰 `flame()` 改写为磷光光标（只发光，不照明）；删除烛芯与暖色渐变。
- `src/fireflies.js`：去掉暖黄色，萤火只保留冷绿/青绿；`style.css` 里 `#flies` 透明度 0.9 → 0.55。
- `src/60_app.js`：调试叠层不再显示 lamp，改为 `light none`。

### 2. 皮影戏风格（shadow play）
- `src/10_draw.js`：删除中心投影——`proj()` 改为恒等（k≡1），`cast()`/`body()` 不再平移缩放、
  不再给影子加 blur；注释与文件头同步。
- `src/00_core.js`：`PAL()` 换成"黑场 + 磷光绿"色阶；旧的热墙/纸/暗影配色删除；
  `shadow`（原来的墨色）现在是发光主色，`paper` 是浅绿字色，`red` 只留处决。
- `src/30_world.js`：整个"房间"删除——墙纹理、灰泥、水渍、地脚线、暗角改为黑场 + 极淡数据网格；
  `rig()`（横梁吊线）、`burns()`（墙上灼痕）置空。
- `src/35_motifs.js`：`ink()` 改为发光主色描边 + 暗绿玻璃填充；`type('ink')` 从"暗字"改为磷光字；
  `localLight/autoMode` 删除局部受光判断；`inv()` 恒等。
- `src/43_plates_flesh.js`：46 处硬编码的暗墨色（[6,5,4]/[7,5,4]/[8,6,5]/[9,7,6]）改为
  绿色线稿/暗玻璃两档，血肉幕不再是一团黑。
- `src/10_draw.js` / 各画板：`M.shadow()` 仍保留 API，但只是平面直绘（历史参数 z/blur 不再生效）。

### 3. 确定性（全片仍满足"同一 t 逐字节一致"）
- `src/matrix.js` 重写：代码雨/公式/HUD 全部由 `EM.cur.t`（本片时钟）驱动，
  `Math.random()` 换成 `hash()`；不再用自身累加时钟。
- `src/fireflies.js` 重写：位置/闪烁/坠落全部由 t 驱动（原为 `performance.now()`）。
- `src/style.css`：去掉 CRT 的 CSS 闪烁动画（会引入墙钟随机性），扫描线保留为静态。
- `src/60_app.js`：`?still=1` 时立即隐藏 `#start/#hud/#ctrl`，避免过渡动画影响截图确定性。
- `_tools/verify.js`：补上 `EM.Scenes('prefix' + …)` 动态注册的覆盖检查（exe.hit01–16）。

### 4. 文档与工具
- `README.md` / `DESIGN.md` / `PLATES.md`：改为矩阵语言；顶部标注 v1 影戏已封存。
- `HANDOFF.md`：加"历史文档（影戏 v1）"提示。
- 新增 `_tools/shot-mx.js`（按时刻出矩阵版静帧）与 `_tools/shot-hero.js`（1920 主视觉 + 开场）。

### 5. 验收（2026-10-27 全绿）
```
node build.js                → BUILD OK（100 cues / 88 注册画板 / 100 cue 全覆盖）
node _tools/verify.js        → ALL CHECKS PASSED（确定性 12.5/60/150s、21 帧无黑帧）
node _tools/verify-browser.js→ 100 plates / determinism+shuffle ok / 无空镜 / 无异常
                               fps 120 / audio dur 211.91 / console errors none
```
静帧：`frames/final/`（16 时刻 + 4×4 sheet）、`frames/hero/`（1920 八张 + 2×4 sheet + opening）。
