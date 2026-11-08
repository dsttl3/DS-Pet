# DeepSeek 网页桌宠

> 把 106 个鲸鱼娘动画，变成一只住在网页里的桌宠。纯前端、零依赖、单文件脚本。

<p align="center">
  <img src="deepseek_webp/优雅女仆舞.webp" alt="优雅女仆舞" width="200">
  <img src="deepseek_webp/写代码.webp" alt="写代码" width="200">
  <img src="deepseek_webp/吃Token.webp" alt="吃Token" width="200">
</p>

<p align="center">
  <img src="https://img.shields.io/badge/前端-原生JS-3178c6" alt="原生 JS">
  <img src="https://img.shields.io/badge/依赖-0-3fb950" alt="零依赖">
  <img src="https://img.shields.io/badge/动画-106%20个-ff69b4" alt="106 个动画">
  <img src="https://img.shields.io/badge/License-MIT-yellow" alt="MIT">
</p>

## 项目简介

**DeepSeek 网页桌宠**是一段可以直接嵌进任意网页的 JS 脚本。它会在页面右下角（位置可配）放一只鲸鱼娘，素材来自仓库内的 106 个动画 WebP：写代码、吃 Token、深度思考碎碎念、节日限定、点击回应……拖动它可以在页面里四处移动，单击一下就会随机换一个动作，也可以开启定时轮播，让它自己玩耍。

整个项目没有构建步骤、没有 npm 依赖、不需要框架，把 `js/deepseek-pet.js` 和素材目录拷走即可使用。脚本会按设备自动选择尺寸：演示页配置为电脑端 320px、移动端 160px，并自动识别触屏设备。

## 效果预览

| 日常 | 工作 | 干饭 |
| :---: | :---: | :---: |
| <img src="deepseek_webp/优雅女仆舞.webp" width="220"> | <img src="deepseek_webp/写代码.webp" width="220"> | <img src="deepseek_webp/吃Token.webp" width="220"> |
| <img src="deepseek_webp/撸猫.webp" width="220"> | <img src="deepseek_webp/深度思考碎碎念.webp" width="220"> | <img src="deepseek_webp/涮火锅.webp" width="220"> |

## 功能特性

- **开箱即用**：一个 `<script>` 标签接入，无构建、无依赖、无框架。
- **三种素材加载方式**：`manifest`（推荐）、目录扫描、手写图片列表。
- **拖拽移动**：基于 Pointer Events，鼠标、触屏、触控笔通用；自动限制在视口内，窗口缩放时也会重新吸附。
- **单击换动作**：移动超过 3px 视为拖拽，不会误触发；单击则随机切换，并排除当前动作避免"换了又好像没换"。
- **自动轮播**：`data-autoswitch` 设置间隔，拖拽时自动暂停，松手后恢复。
- **淡入淡出**：切换前预加载下一张，避免白屏；加载失败或超时也有兜底。
- **响应式尺寸**：`data-size-pc` / `data-size-mobile` 按设备自动选择。
- **可编程**：暴露 `window.WebpPet` API 与 `webp-pet:ready`、`webp-pet:error` 事件，方便接入状态机或游戏逻辑。
- **不打扰页面**：初始淡入、悬停轻微提亮，提示条数秒后自动消失。

## 目录结构

```text
deepseek_pet/
├── index.html              # 演示页，接入脚本的最小示例
├── js/
│   └── deepseek-pet.js     # 桌宠脚本（单文件，约 500 行，无依赖）
└── deepseek_webp/
    ├── manifest.json       # 素材清单（106 个文件名）
    └── *.webp              # 动画素材
```

## 快速开始

### 1. 本地预览

由于脚本通过 `fetch` 读取 `manifest.json`，**不能直接双击 `index.html`**（`file://` 协议会被浏览器拦截）。启动一个静态服务器即可：

```bash
cd deepseek_pet
python3 -m http.server 8000
# 浏览器打开 http://localhost:8000
```

也可以使用 `npx serve`、VS Code Live Server 等任意静态服务器。

### 2. 接入自己的网页

把 `js/deepseek-pet.js` 与素材目录放到站点中，在 `<body>` 末尾加入：

```html
<script
  src="js/deepseek-pet.js"
  data-manifest="deepseek_webp/manifest.json"
  data-size-pc="320"
  data-size-mobile="160"
  data-start="bl"
  data-autoswitch="10000"></script>
```

> 路径以**当前页面**为基准解析，而不是以脚本文件为基准。

### 3. 素材来源的三种写法

```html
<!-- 方式一：manifest（推荐，一次请求拿到清单） -->
<script src="js/deepseek-pet.js" data-manifest="deepseek_webp/manifest.json"></script>

<!-- 方式二：目录（会先找目录下的 manifest.json，再尝试解析目录索引） -->
<script src="js/deepseek-pet.js" data-dir="deepseek_webp"></script>

<!-- 方式三：直接列出图片 -->
<script src="js/deepseek-pet.js"
        data-images="a.webp, b.webp, https://cdn.example.com/c.webp"></script>
```

`manifest.json` 支持两种格式：

```json
["写代码.webp", "吃Token.webp"]
```

```json
{ "images": ["写代码.webp", "吃Token.webp"] }
```

新增素材后重新生成清单：

```bash
cd deepseek_pet
python3 - <<'PY'
import json, os

d = 'deepseek_webp'
files = sorted(f for f in os.listdir(d) if f.lower().endswith('.webp'))
with open(os.path.join(d, 'manifest.json'), 'w', encoding='utf-8') as fp:
    json.dump(files, fp, ensure_ascii=False, indent=4)
print(f'{len(files)} images written')
PY
```

## 配置项

大多数配置都可以写成 `data-*` 属性，也可以提前定义 `window.WebpPetConfig`（驼峰命名）。优先级：**默认值 < `WebpPetConfig` < `data-*` 属性**；同时配置多种素材来源时，优先级为 `data-images` > `data-manifest` > `data-dir`。

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `data-manifest` | string | — | 素材清单 JSON 地址（推荐） |
| `data-dir` | string | — | 素材目录，脚本会尝试目录内的 `manifest.json` 或目录索引 |
| `data-images` | string | — | 逗号分隔的图片地址列表 |
| `data-size` | number | `160` | 基础尺寸（px），正方形显示区域 |
| `data-size-pc` | number | — | 电脑端尺寸，覆盖 `data-size` |
| `data-size-mobile` | number | — | 移动端尺寸，覆盖 `data-size` |
| `data-margin` | number | `36` | 初始位置距视口边缘的距离（px） |
| `data-start` | string | `br` | 初始角落：`br` 右下、`bl` 左下、`tr` 右上、`tl` 左上 |
| `data-zindex` | number | `2147483647` | 层级，默认置顶 |
| `data-tip` | boolean | `true` | 传 `"false"` 关闭底部操作提示 |
| `data-tiptext` | string | `拖拽宠物可以移动 · 单击更换一个动作` | 提示文案 |
| `data-tipduration` | number | `10000` | 提示停留时间（ms） |
| `data-autoswitch` | number | `0` | 自动切换间隔（ms），`0` 表示关闭；拖拽时暂停 |

仅能通过 `window.WebpPetConfig` 配置的项：

| 字段 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `manifestNames` | string[] | `["manifest.json"]` | `data-dir` 模式下尝试的清单文件名 |
| `switchFade` | boolean | `true` | 是否使用淡入淡出切换 |

示例：

```html
<script>
  window.WebpPetConfig = {
    manifest: 'deepseek_webp/manifest.json',
    autoSwitch: 8000,
    switchFade: true,
    start: 'br'
  };
</script>
<script src="js/deepseek-pet.js"></script>
```

## 交互说明

| 操作 | 行为 |
| --- | --- |
| 按住拖动 | 跟随指针移动，超出视口会被限制在边界内；拖拽期间暂停自动轮播 |
| 单击 / 轻触 | 随机切换到另一个动作（带淡入淡出） |
| 悬停 | 阴影加深、轻微提亮 |
| 窗口缩放 | 自动重新吸附到可视区域内 |
| 右键 | 屏蔽默认菜单，避免误操作打断拖拽 |

## JavaScript API

脚本就绪后可通过 `window.WebpPet` 控制：

```js
const pet = await window.WebpPet.ready; // 失败时 resolve(null)

pet.size;       // 当前尺寸（px）
pet.isMobile;   // 是否识别为移动端
pet.index;      // 当前动作下标
pet.images;     // 素材地址数组副本
pet.el;         // 根元素
pet.img;        // <img> 元素

pet.next();        // 随机切换下一个动作
pet.show(3);       // 显示指定下标的动作
pet.moveTo(120, 80); // 移动到视口坐标（自动限制边界）
pet.reload();      // 重新读取素材列表，返回 Promise<number>
pet.destroy();     // 移除桌宠、样式与提示，并清理 window.WebpPet
```

事件：

```js
window.addEventListener('webp-pet:ready', (e) => {
  console.log('已加载', e.detail.count, '张素材', e.detail.size, e.detail.mobile);
});

window.addEventListener('webp-pet:error', (e) => {
  console.error('桌宠初始化失败', e.detail);
});
```

## 素材说明

| 项目 | 说明 |
| --- | --- |
| 数量 | 106 个动画 |
| 格式 | 动画 WebP（`RIFF/WebP`） |
| 尺寸 | 640 × 360 |
| 帧数 | 59 – 120 帧 |
| 单张体积 | 约 1.1 – 4.7 MB，平均约 2.2 MB |
| 总体积 | 约 238 MB |

素材覆盖日常起居、工作状态（思考 / 忙碌 / 庆祝）、节日限定（春节、中秋、端午、圣诞等）、美食、魔术、点击回应、碎碎念等主题，文件名即动作描述，可直接在 `manifest.json` 中按需裁剪。

> 素材体积较大，建议只保留需要的动作，或在部署前用 `ffmpeg` / `cwebp` 压缩帧数与分辨率，避免拖慢首屏与流量消耗。脚本按需加载：只请求当前动作和即将切换的下一张，不会一次性拉取全部素材。

## 常见问题

**打开后没有桌宠？**
先看浏览器控制台是否有 `[WebpPet] 初始化失败`。最常见的原因是直接用 `file://` 打开页面导致 `fetch` 被拦截，请用本地静态服务器访问。

**图片 404 或路径错误？**
`data-manifest`、`data-dir` 都相对**页面地址**解析；若页面在子路径下部署，请写绝对路径或以页面为基准的相对路径。中文文件名无需手动编码，浏览器会自动处理。

**想关闭底部提示？**
设置 `data-tip="false"`，或用 `data-tiptext` 自定义文案、`data-tipduration` 调整停留时间。

**桌宠挡住了弹窗 / 按钮？**
默认 `z-index` 为 `2147483647`，可通过 `data-zindex` 调低；也可以把 `data-start` 改到不遮挡的角落。

**移动端识别不准？**
脚本优先使用 `pointer: coarse` 判断触屏，其次参考 `maxTouchPoints`、屏幕宽度和 UA。一般无需干预；如需固定尺寸，直接只设置 `data-size` 即可。

**会自动保存位置吗？**
不会。当前版本不持久化位置，刷新后回到 `data-start` 指定的角落；需要记忆位置可在 `pointerup` 后自行写入 `localStorage`，再用 `moveTo()` 恢复。

## 自定义与扩展

- **换素材**：替换 `deepseek_webp/` 中的文件并重新生成 `manifest.json` 即可，脚本无需改动。
- **多套皮肤 / 动作分组**：准备多份清单，切换时先 `pet.destroy()`，再重新注入带新 `data-manifest` 的脚本（配置在初始化时读取，运行中修改不会生效）。
- **状态联动**：监听 `webp-pet:ready` 后用 `pet.show(index)` 把动作和业务状态绑定，例如"思考中""加载完成"。
- **可扩展方向**：位置记忆、右键菜单、关闭 / 收起按钮、点击音效、按主题分组的权重随机。

## 已知限制

- 必须运行在 HTTP(S) 环境下，`file://` 无法读取清单。
- 素材以动画 WebP 为主；`manifest` 或图片列表也可指向浏览器支持的其它图片格式，但不支持视频。
- 没有键盘操作与关闭按钮，需要移除时调用 `WebpPet.destroy()`。
- 素材总量约 238 MB，不适合一次性全量加载（脚本已按需加载单张）。

## 致谢与许可

- 素材原作者：[PC2005-cloud/dsh-pet](https://github.com/PC2005-cloud/dsh-pet)，使用与二次分发请遵循原仓库授权。
- 角色形象为 DeepSeek 鲸鱼娘，相关版权归 DeepSeek 所有。
- 本仓库代码基于 [MIT License](../LICENSE) 开源，Copyright (c) 2026 dsttl3。
