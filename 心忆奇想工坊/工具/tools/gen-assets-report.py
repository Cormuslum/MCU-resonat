# -*- coding: utf-8 -*-
"""
gen-assets-report.py —— 生成《素材路径总报告.md》

数据来源（全部只读）：
  1. public/assets/manifest.json          运行时唯一索引（前端真正读的就是它）
  2. tools/collect-assets.py             归集规则（源素材 → 运行时路径的映射表）
  3. public/assets/**                    实际文件（体积 / 缺失 / 孤儿体检）

用法：
  python tools/gen-assets-report.py
  python tools/gen-assets-report.py --out 素材路径总报告.md
"""

from __future__ import annotations

import argparse
import ast
import collections
import importlib.util
import json
import os
import re
import sys
from datetime import datetime

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
# 成品根：心忆共鸣（开发版 = 项目根下的它；发行版 = 发行版根下的它）
SIM = os.path.join(ROOT, "心忆共鸣")
# 工具根：心忆奇想工坊/工具（开发版与发行版同构）
TOOL_ROOT = os.path.join(ROOT, "心忆奇想工坊", "工具")
ASSETS = os.path.join(SIM, "public", "assets")
MANIFEST = os.path.join(ASSETS, "manifest.json")
COLLECT = os.path.join(TOOL_ROOT, "tools", "collect-assets.py")

# manifest 里算“素材引用”的顶层前缀
REF_RE = re.compile(r"^(banners|sets|stars3|milestones|video|sfx|fonts|currency|ui)/")

# 关键素材的用途备注（只挑“看名字猜不出用途”的写，其余靠分区说明覆盖）
KEY_NOTES: dict[str, str] = {
    # 主页
    "ui/home/bg.webp": "主页底图（自绘 + 官方 LOGO 烘焙）",
    "ui/home/bg-main.webp": "主页纯背景（无字）",
    "ui/home/textures.webp": "主页绢纹叠加层",
    "ui/home/deco-starlight.webp": "主页右侧星辉装饰",
    "ui/home/deco-halo.webp": "主页光环",
    "ui/home/deco-ribbon.webp": "主页缎带",
    "ui/home/deco-trail.webp": "主页星轨",
    "ui/home/deco-stars.webp": "主页星点（512px 需平铺）",
    "ui/home/deco-spark.webp": "主页闪光粒子",
    "ui/home/deco-glow.webp": "主页辉光",
    "ui/home/deco-goldstar.webp": "主页金星",
    "ui/home/deco-entrance.webp": "主页入口光门",
    "ui/home/deco-beam.webp": "主页竖光柱",
    # 共鸣页
    "ui/banner/list-line.webp": "卡池列表金线（贴缩略图底部）",
    "ui/banner/glow-title.webp": "卡池标题艺术字辉光",
    "ui/banner/tag-standard.webp": "「常驻」类型标签",
    "ui/banner/tag-limited.webp": "「限定」类型标签",
    "ui/banner/tag-collab.webp": "「联动」类型标签",
    "ui/banner/card-frame.webp": "卡池缩略图镂空框（比图大 1px）",
    "ui/banner/long-bar.webp": "货币栏长条底",
    "ui/banner/switch.webp": "视频/静态背景切换键·常态",
    "ui/banner/switch-h.webp": "视频/静态背景切换键·悬停高亮",
    "ui/banner/switch-ico.webp": "切换键图标",
    "ui/banner/golden-edge.webp": "「共鸣详情」按钮金边",
    "ui/banner/divider.webp": "列表分割线",
    "ui/banner/social-bg.webp": "货币栏社交条底",
    "ui/banner/wish-n.webp": "深海回响活动签·常态",
    "ui/banner/wish-h.webp": "深海回响活动签·悬停",
    "ui/banner/pull-white.webp": "单次共鸣按钮（文字已烘焙）",
    "ui/banner/pull-yellow.webp": "十连共鸣按钮（文字已烘焙）",
    "ui/banner/bg-076.webp": "执律的流金静态背景 2560×1440（禁调色）",
    "ui/banner/long-details-n.webp": "货币栏下金线",
    "ui/banner/gift-flower.webp": "礼盒图标（流光频谱）",
    "ui/banner/set-name-01.webp": "通用套名横幅·5★ 粉（332×96，可见 251×54）",
    "ui/banner/set-name-02.webp": "通用套名横幅·4★ 紫",
    "ui/cursor/mouse.webp": "全局自定义鼠标指针",
    # 按钮
    "ui/btn/res-single.webp": "单次共鸣按钮底（296×66 盒子）",
    "ui/btn/res-ten.webp": "十连共鸣按钮底（296×66 盒子）",
    "ui/btn/skip.webp": "跳过按钮 95×96",
    "ui/btn/back-n.webp": "返回按钮 95×96·常态",
    "ui/btn/back-h.webp": "返回按钮·悬停（只有发光环无底，需双 img 叠层）",
    "ui/btn/close-n.webp": "关闭按钮·常态",
    "ui/btn/close-h.webp": "关闭按钮·悬停",
    "ui/btn/golden-n.webp": "金色圆钮·常态",
    "ui/btn/golden-h.webp": "金色圆钮·悬停",
    "ui/btn/stop.webp": "停止/中断键",
    "ui/btn/add.webp": "加号键",
    "ui/btn/mouseclick.webp": "「鼠标左键」键帽图标",
    "ui/btn/key-f.webp": "「F」键帽图标",
    "ui/btn/key-mouse.webp": "左键提示图标",
    # 深海回响 V2
    "ui/deepsea/bg.webp": "全屏背景 2731×1535（源素材库缺失，从素材副本补入）",
    "ui/deepsea/scene.webp": "「万金之上」摆饰展示大图 1264×728（唯一显示大图的档）",
    "ui/deepsea/track.webp": "主进度轨道波形（黑底白线，振幅 99px → 只能当 screen 柔光叠层）",
    "ui/deepsea/track2.webp": "轨道第二层波形（叠在 track 上做双线）",
    "ui/deepsea/arc1.webp": "轨道起段弧线 01",
    "ui/deepsea/arc2.webp": "轨道中段弧线 02",
    "ui/deepsea/arc3.webp": "轨道末段弧线 03",
    "ui/deepsea/nodeArrow.webp": "节点灯泡（尖朝下的水滴 50×37）",
    "ui/deepsea/nodeRing.webp": "节点细环·未达成",
    "ui/deepsea/nodeRingOn.webp": "节点细环·已达成",
    "ui/deepsea/badgeBall.webp": "抽数徽章内球 Ø63.7",
    "ui/deepsea/badgeDial.webp": "抽数徽章外刻度环 Ø89",
    "ui/deepsea/beam.webp": "重点档蓝色光柱（硬边矩形，必须 mask 羽化）",
    "ui/deepsea/ribbon.webp": "顶部紫缎带 380×48（实机实心带 246×44，非等比）",
    "ui/deepsea/divider.webp": "右侧分隔饰线 + 中央菱形（线本体 x 46..566）",
    "ui/deepsea/glowBand.webp": "轨道上方光晕带 = 提示条底板（只当 mask 用；alpha 已拉伸）",
    "ui/deepsea/backN.webp": "返回金钮·常态",
    "ui/deepsea/backH.webp": "返回金钮·悬停（只有发光环）",
    "ui/deepsea/backS.webp": "返回金钮·按下",
    "ui/deepsea/card.webp": "奖励卡金框 96×102",
    "ui/deepsea/cardEmpty.webp": "奖励卡空框（未达成态）",
    "ui/deepsea/numPlate.webp": "抽数胶囊底板 116×44（只当 mask 用；alpha 已拉伸到 255）",
    # 单抽详情
    "ui/detail/bg.webp": "详情页背景（screen 0.62 叠在底板上）",
    "ui/detail/bg-plate.webp": "详情页背景底板（解包 bg+bg_right 拼不出实机，用这张）",
    "ui/detail/bg-right.webp": "详情页右侧背景",
    "ui/detail/frame.webp": "立绘金框 436×600",
    "ui/detail/board-1.webp": "属性面板横条（与属性无关，典雅用 board-3）",
    "ui/detail/board-2.webp": "属性面板横条（清新用这张）",
    "ui/detail/board-3.webp": "属性面板横条（典雅用这张）",
    "ui/detail/board-4.webp": "属性面板横条",
    "ui/detail/orname-1.webp": "卡侧丝带·1",
    "ui/detail/orname-2.webp": "卡侧丝带·2",
    "ui/detail/ring.webp": "面板圆环（ornament_03）",
    "ui/detail/logo.webp": "右侧 LOGO 水印",
    "ui/detail/deco-1.webp": "卡左第一道金弧",
    "ui/detail/deco-2.webp": "卡左第二道金弧",
    "ui/detail/deco-3.webp": "卡左第三道金弧",
    "ui/detail/line-1.webp": "细装饰线",
    "ui/detail/line-2.webp": "装饰线",
    "ui/detail/icon-item.webp": "部件小图标底板",
    "ui/detail/cloth-blank.webp": "立绘占位白底 520×724",
    "ui/detail/orname-3.webp": "卡侧丝带·3",
    "ui/detail/silk-ribbon.webp": "丝绸缎带",
    "ui/detail/orname-text.webp": "文字条",
    "ui/detail/orname-text-2.webp": "文字条下划线",
    "ui/detail/ornament-3.webp": "面板圆环装饰",
    "ui/detail/badge-new.webp": "「NEW」角标",
    "ui/detail/star.webp": "星级金星（禁 hue-rotate 改色）",
    "ui/detail/label-bg.webp": "属性标签胶囊底",
    "ui/detail/tag-1.webp": "语义属性标签·甜美（粉）",
    "ui/detail/tag-2.webp": "语义属性标签·典雅（金）",
    "ui/detail/tag-3.webp": "语义属性标签·清新（绿）",
    "ui/detail/tag-4.webp": "语义属性标签·性感（紫）",
    "ui/detail/tag-5.webp": "语义属性标签·帅气（蓝）",
    # 抽卡卡片
    "ui/card/frame-1.webp": "卡片人物底·1",
    "ui/card/frame-2.webp": "卡片人物底·2",
    "ui/card/frame-3.webp": "卡片人物底·3",
    "ui/card/bg-golden.webp": "卡片底·金（5★）",
    "ui/card/bg-purple.webp": "卡片底·紫（4★）",
    "ui/card/bg-blue.webp": "卡片底·蓝（3★）",
    "ui/card/bg-green.webp": "卡片底·绿",
    "ui/card/digit.webp": "卡片数字底",
    "ui/card/empty.webp": "空卡底",
    "ui/card/pink-h.webp": "粉色卡底·悬停",
    "ui/card/glow-pink.webp": "卡片辉光·粉",
    "ui/card/glow-purple.webp": "卡片辉光·紫",
    # 套装获得展示
    "ui/suit/frame-1.webp": "套装卡外框·1",
    "ui/suit/frame-2.webp": "套装卡外框·2",
    "ui/suit/frame-4.webp": "套装卡装饰框",
    "ui/suit/light.webp": "套装展示光效",
    "ui/suit/img-light.webp": "套装图打光",
    "ui/suit/orn-1.webp": "套装装饰线·1",
    "ui/suit/orn-2.webp": "套装装饰线·2",
    "ui/suit/line-1.webp": "套装线条·1",
    "ui/suit/line-2.webp": "套装线条·2",
    "ui/suit/line-3.webp": "套装线条·3",
    "ui/suit/board-4.webp": "套装名底板",
    "ui/suit/sched-1.webp": "套装进度条·填充",
    "ui/suit/sched-2.webp": "套装进度条·备用（当前未被 manifest 引用）",
    "ui/suit/sched-bg.webp": "套装进度条·底",
    "ui/suit/sched-full.webp": "套装进度条·满",
    "ui/suit/sched-star.webp": "套装进度条·星饰",
    # 套装详情弹层
    "ui/popup/art-elegant.webp": "主属性插画·典雅 416×628",
    "ui/popup/art-fresh.webp": "主属性插画·清新",
    "ui/popup/art-sexy.webp": "主属性插画·性感",
    "ui/popup/art-cool.webp": "主属性插画·帅气",
    "ui/popup/art-sweet.webp": "主属性插画·甜美",
    "ui/popup/plate-elegant.webp": "纸底·典雅 520×252",
    "ui/popup/plate-fresh.webp": "纸底·清新",
    "ui/popup/plate-sexy.webp": "纸底·性感",
    "ui/popup/plate-cool.webp": "纸底·帅气",
    "ui/popup/plate-sweet.webp": "纸底·甜美",
    "ui/popup/slot.webp": "部件格底 160×160",
    "ui/popup/slot-hover.webp": "部件格悬停高光 162×170",
    "ui/popup/bg.webp": "弹层主背景",
    "ui/popup/glow.webp": "弹层辉光（screen）",
    "ui/popup/name-n.webp": "套名底板·常态（border-image 九宫格 slice 36）",
    "ui/popup/name-h.webp": "套名底板·常驻高光（screen）",
    "ui/popup/star.webp": "星级金星",
    "ui/popup/ribbon-1.webp": "顶部装饰缎带·左（已 scaleY 翻转）",
    "ui/popup/ribbon-2.webp": "顶部装饰缎带·右（已 scaleY 翻转）",
    "ui/popup/pocky.webp": "装饰杖",
    "ui/popup/light.webp": "装饰光",
    "ui/popup/line-1.webp": "外框金线·1（内容 1..833）",
    "ui/popup/line-2.webp": "外框金线·2（内容 9..821）",
    "ui/popup/diamond.webp": "中央菱形饰件",
    "ui/popup/band.webp": "底部装饰带 1214×91",
    "ui/popup/slot-frame.webp": "部件格外框",
    "ui/popup/slot-bg.webp": "部件格底（白色圆角板）",
    "ui/popup/form-card.webp": "形态卡粉底",
    "ui/popup/label.webp": "属性标签胶囊",
    "ui/popup/stage-1.webp": "进化等级图标·初始/焕新·置灰",
    "ui/popup/stage-2.webp": "进化等级图标·一进/进化·置灰",
    "ui/popup/stage-3.webp": "进化等级图标·二进·置灰",
    "ui/popup/stage-4.webp": "进化等级图标·满进·置灰",
    "ui/popup/stage-1-on.webp": "进化等级图标·初始/焕新·高亮",
    "ui/popup/stage-2-on.webp": "进化等级图标·一进/进化·高亮",
    "ui/popup/stage-3-on.webp": "进化等级图标·二进·高亮",
    "ui/popup/stage-4-on.webp": "进化等级图标·满进·高亮",
    "ui/popup/label-01.webp": "属性标签·典雅",
    "ui/popup/label-02.webp": "属性标签·清新",
    "ui/popup/label-03.webp": "属性标签·第 3 色",
    "ui/popup/label-04.webp": "属性标签·甜美",
    "ui/popup/label-05.webp": "属性标签·帅气",
    "ui/popup/label-06.webp": "属性标签·第 6 色",
    "ui/popup/label-07.webp": "属性标签·第 7 色",
    "ui/popup/label-08.webp": "属性标签·性感（原素材缺失，用 09 色相 +52 生成）",
    "ui/popup/label-09.webp": "属性标签·第 9 色",
    "ui/popup/label-10.webp": "属性标签·第 10 色",
    # 弹窗外框（共鸣详情）
    "ui/window/bg-01.webp": "共鸣详情羊皮纸底 836×512",
    "ui/window/bg-01-line.webp": "共鸣详情外框金线",
    "ui/window/bg-04-line.webp": "共鸣详情内圈金线",
    "ui/window/bg-03-line.webp": "共鸣详情中圈金线",
    # 套装获得页（新）
    "ui/suit/bg.webp": "套装页背景整图 1920×1080（SysReward.png，1:1）",
    "ui/suit/board-1.webp": "套名底板·5★未集齐（粉）",
    "ui/suit/board-2.webp": "套名底板·4★未集齐（紫）",
    "ui/suit/board-3.webp": "套名底板·4★已集齐（蓝）",
    "ui/suit/board-4.webp": "套名底板·5★已集齐（暗金）",
    "ui/suit/sched-1.webp": "进度圆·盘面（未集齐）",
    "ui/suit/sched-2.webp": "进度圆·空槽（Ø126，比盘面低 2px → 槽上细下粗）",
    "ui/suit/sched-full.webp": "进度圆·盘面（已集齐）",
    "ui/suit/sched-fullbg.webp": "进度圆·集齐高亮动效（0.6s 0%→80%）",
    "ui/suit/sched-step.webp": "进度圆·进度上涨动效（0.4s →50%）",
    "ui/suit/orn-3.webp": "徽章外圈点珠环",
    "ui/suit/spark.webp": "四芒星闪光（徽章顶饰 / 星级）",
    "ui/suit/glow-1.webp": "黑底发光弧线·1（必须 screen）",
    "ui/suit/glow-2.webp": "黑底发光弧线·2（必须 screen）",
    "ui/suit/glow-3.webp": "黑底发光弧线·3（必须 screen）",
    # 十连结果页
    "ui/result/bg.webp": "结果页整图 1920×1080（标题/键位/地面光环已烘焙，别再自己画）",
    "ui/result/char-1.webp": "3★ 卡框 276×444（1:1，object-fit:fill）",
    "ui/result/char-2.webp": "4★ 卡框",
    "ui/result/char-3.webp": "5★ 卡框",
    "ui/result/glow-purple.webp": "4★ 光柱 286×520（父级有 transform，**不能** screen）",
    "ui/result/glow-pink.webp": "5★ 光柱",
    "ui/result/new-badge.webp": "十连「新」角标",
    "ui/result/new-suit.webp": "单抽「新」角标",
    "ui/result/mat-3.webp": "3★ 重复件赠送材料（×10）",
    "ui/result/mat-4.webp": "4★/5★ 重复件赠送材料（4★×4 / 5★×10）",
    "ui/result/soft.webp": "「×n」角标柔层（alpha 峰值仅 153，压不暗亮卡面）",
    "ui/result/line.webp": "「×n」角标下划线（金线）",
    # 版本选择页
    "ui/ver/bg.webp": "版本页背景 2560×1440（T_UI_login_bg）",
    "ui/ver/next-n.webp": "退出/进入键·常态（退出键水平镜像，箭头朝左）",
    "ui/ver/next-h.webp": "退出/进入键·悬停",
    "ui/ver/opt-n.webp": "大版本按钮·常态 437×132（→340×103，1:1 比例）",
    "ui/ver/opt-s.webp": "大版本按钮·展开态",
    "ui/ver/tower-1.webp": "大版本左侧地标·心愿原野",
    "ui/ver/tower-2.webp": "大版本左侧地标·伊赞之土",
    "ui/ver/title-n.webp": "小版本容器·原图（含 42px 透明边距，**别直接用**，用 title-panel-n）",
    "ui/ver/title-h.webp": "小版本容器·原图悬停（同上）",
    "ui/ver/title-panel-n.webp": "小版本容器·常态 473×128（裁 40,10,513,138，与大版本等大）",
    "ui/ver/title-panel-h.webp": "小版本容器·选中/悬停（同框裁切，实体等大）",
    "ui/ver/pic-frame.webp": "版本大图外框 1400×800 → 1280×732，呼吸金光",
    "ui/ver/pink-h.webp": "外框粉光（悬停 30%~90% 呼吸，与外框重合）",
    "ui/ver/name-bg.webp": "旧文案底（已被 descBand 取代，保留未用）",
    "ui/ver/desc-band.webp": "文案条 tuning_txtbg04 616×68，九宫格 slice 20/200 只拉中间，opacity .5",
    "ui/ver/desc-orn.webp": "文案条底边装饰 tuning_txtbg03 668×180（横线在第 114 行、内容中心偏左 22px）",
    "ui/ver/ver-tag.webp": "版本号角标容器 tuning_txtbg01（紫缎带，已裁到实体 335×48）",
}

# 报告自身的变更记录（静态，重跑脚本不会漂日期；每次刷新手动追加一行）
REPORT_HISTORY = [
    ("2026-10-26", "首次生成。发现 60 池素材未归集、230 抽奖励覆盖、1 个孤儿文件"),
    ("2026-10-26", "v0.6.00 刷新：新增 `ui/deepsea/` 21 项（§5.3.7）；230 抽奖励改名 `230-1/2/3`"
                   "（旧 `230.webp` 变孤儿）；6 池深忆奖励补齐"),
    ("2026-10-26", "v0.7.06 刷新：新增 `ui/suit/` 底板 4 态 + 进度圆素材、`ui/result/` 12 项、"
                   "`ui/ver/` 12 项 + 23 张缩略图 + 23 张版本大图；补 `result` / `ver` 两个分区说明、"
                   "约 45 条 `KEY_NOTES`、`ui/ver/**` 的源素材反查"),
]

SECTION_DESC = {    "home": "主页（启动后一级页面）。`bg` 是烘焙好 LOGO 的成品图，`bg-main` 是无字底图。装饰件统一用 `mix-blend-mode: screen`。",
    "banner": "共鸣页（卡池主界面）+ 货币栏 + 套名横幅。**本分区是像素级对齐的重点**，坐标见 `MEMORY.md` 共鸣页章节。",
    "popup": "套装详情弹层（1400×820）。五种主属性各有插画与纸底，运行时按 `styles[0]` 选色。",
    "cursor": "全局自定义鼠标指针。由 `App.vue` 写入 CSS 变量 `--nk-cursor`。",
    "btn": "通用圆形/胶囊按钮与键帽图标。圆形按钮 95×96，悬停态 `_h` 只有发光环无底，必须双 `<img>` 叠层。",
    "echo": "深海回响子页面（**旧版**，正待按实机重做，见 `布局坐标/深海回响/`）。",
    "detail": "单抽详情页（抽到部件后的展示）。`board-1~4` 与属性**无对应关系**：典雅→board-3、清新→board-2。",
    "card": "抽卡演出中的卡片底与人物底。",
    "suit": "套装获得展示页。",
    "result": "十连结果页（背景是用户烘焙的整图，标题/键位/地面光环都已在图里）。卡框 276×444 1:1，光柱**不能** `mix-blend-mode`（父级有 transform 会隔离）。",
    "ver": "版本选择页。`cards` 是 672×188 缩略图、`bigCards` 是 1532×860 版本大图，二者靠 `card映射表.md` 按版本号配对。",
}

BANNER_SUBDIR_DESC = {
    "banners/bg": "卡池静态背景（原尺寸，含艺术字）",
    "banners/bg-clean": "卡池静态背景（去艺术字版，页面实际用这个）",
    "banners/thumb": "卡池列表缩略图（共鸣页左侧列表）",
    "banners/title-banner": "卡池标题横幅（原始素材）",
    "banners/title": "标题艺术字（按 gachaKey 命名，单独叠在 bg-clean 上）",
    "banners/layers": "分层背景（按 gachaKey 分目录，供视差/动效拆层用）",
}


# ---------------------------------------------------------------- 工具
def load_collect_module():
    """安全加载 tools/collect-assets.py（有 __main__ 保护，import 无副作用）。"""
    spec = importlib.util.spec_from_file_location("collect_assets", COLLECT)
    mod = importlib.util.module_from_spec(spec)
    old = sys.stdout
    sys.stdout = open(os.devnull, "w", encoding="utf-8")
    try:
        spec.loader.exec_module(mod)
    finally:
        sys.stdout.close()
        sys.stdout = old
    return mod


def human(n: int) -> str:
    for unit in ("B", "KB", "MB", "GB"):
        if n < 1024 or unit == "GB":
            return f"{n:.0f} {unit}" if unit == "B" else f"{n:.1f} {unit}"
        n /= 1024.0
    return f"{n:.1f} GB"


def size_of(rel: str) -> int:
    p = os.path.join(ASSETS, rel)
    return os.path.getsize(p) if os.path.exists(p) else 0


def flat_paths(node, prefix="") -> list[tuple[str, str]]:
    """把 manifest 的嵌套结构拍平成 (键路径, 素材相对路径)。"""
    out: list[tuple[str, str]] = []
    if isinstance(node, dict):
        for k, v in node.items():
            out += flat_paths(v, f"{prefix}.{k}" if prefix else k)
    elif isinstance(node, list):
        for i, v in enumerate(node):
            out += flat_paths(v, f"{prefix}[{i}]")
    elif isinstance(node, str) and REF_RE.match(node):
        out.append((prefix, node))
    return out


def collect_all_refs(node, bucket: set[str]) -> None:
    if isinstance(node, dict):
        for v in node.values():
            collect_all_refs(v, bucket)
    elif isinstance(node, list):
        for v in node:
            collect_all_refs(v, bucket)
    elif isinstance(node, str) and REF_RE.match(node):
        bucket.add(node)


def note(path: str) -> str:
    return KEY_NOTES.get(path, "")


# ---------------------------------------------------------------- 报告
def build(out_path: str) -> str:
    manifest = json.load(open(MANIFEST, encoding="utf-8"))
    ca = load_collect_module()

    all_refs: set[str] = set()
    collect_all_refs(manifest, all_refs)

    on_disk: set[str] = set()
    for root, _, files in os.walk(ASSETS):
        for f in files:
            rel = os.path.relpath(os.path.join(root, f), ASSETS).replace("\\", "/")
            if rel != "manifest.json":
                on_disk.add(rel)

    missing = sorted(all_refs - on_disk)
    orphan = sorted(on_disk - all_refs)
    total_bytes = sum(size_of(p) for p in on_disk)

    L: list[str] = []
    w = L.append

    # ---------------- 头部
    w("# 抽卡模拟器 · 素材路径总报告")
    w("")
    w("> 本文件由 `tools/gen-assets-report.py` 自动生成，**请勿手改**。改完素材后重跑脚本即可刷新。")
    w(">")
    w(f"> 生成时间：{datetime.now().strftime('%Y-%m-%d %H:%M')}　|　"
      f"manifest 生成于：{manifest.get('generatedAt', '—')}")
    w("")
    w("## 0. 口径与速览")
    w("")
    w("| 项 | 值 |")
    w("|---|---|")
    w("| 运行时素材根 | `public/assets/`（构建后为 `dist/assets/`，Web 根路径 `/assets/`） |")
    w("| 唯一索引 | `public/assets/manifest.json` |")
    w(f"| manifest 声明引用（去重） | **{len(all_refs)}** 条 |")
    w(f"| 磁盘实际文件 | **{len(on_disk)}** 个，合计 **{human(total_bytes)}** |")
    w(f"| 声明但缺失 | **{len(missing)}** 条（详见 §7） |")
    w(f"| 有文件但未引用 | **{len(orphan)}** 个（详见 §7） |")
    w("")
    w("| 分类 | 目录 | 磁盘文件 | 磁盘体积 | 格式 |")
    w("|---|---|---|---|---|")
    groups = [
        ("视频", "video", "webm（VP9）"),
        ("音频", "sfx", "ogg（Vorbis）"),
        ("字体", "fonts", "ttf"),
        ("货币图标", "currency", "webp"),
        ("3★ 散件", "stars3", "webp"),
        ("界面图片", "ui", "webp"),
        ("卡池背景/缩略图", "banners", "webp"),
        ("套装图片", "sets", "webp"),
        ("深忆奖励", "milestones", "webp"),
    ]
    for label, d, fmt in groups:
        files = [p for p in on_disk if p.startswith(d + "/")]
        b = sum(size_of(p) for p in files)
        w(f"| {label} | `{d}/` | {len(files)} | {human(b)} | {fmt} |")
    w(f"| **合计** | `public/assets/` | **{len(on_disk)}** | **{human(total_bytes)}** | — |")
    w("")

    # ---------------- 路径解析
    w("## 1. 路径解析规则（改素材前必读）")
    w("")
    w("manifest 里存的全是**相对 `public/assets/` 的路径**，前端统一走两个入口，不要在组件里硬编码：")
    w("")
    w("```ts")
    w("// src/stores/game.ts")
    w("const ASSET_BASE = '/assets/'")
    w("function asset(rel: string | null | undefined): string   // rel 为空时返回 ''")
    w("")
    w("// src/composables/useAudio.ts")
    w("const SFX_BASE = '/assets/'")
    w("```")
    w("")
    w("唯一例外是 `src/styles/global.css` 的 6 条 `@font-face`，直接写 `/assets/fonts/*.ttf`。")
    w("")
    w("**构建与部署注意**")
    w("")
    w("| 项 | 说明 |")
    w("|---|---|")
    w("| dev server | `vite.config.ts` 里 `watch.ignored` **忽略了 `public/assets/**`** → 改完素材浏览器不会热更新，**必须重启 dev server** |")
    w("| build 输出 | `public/assets/` 原样复制到 `dist/assets/`（`assetsInlineLimit: 0`，不做内联） |")
    w("| base 路径 | 未配 `base`，默认 `/`。当前只跑 `http://localhost:5178` 没问题；**将来 Electron 用 `file://` 加载时必须改成 `base: './'`**，否则所有 `/assets/...` 都会 404 |")
    w("")
    w("**manifest 顶层结构**")
    w("")
    w("| 键 | 内容 |")
    w("|---|---|")
    for k, v in manifest.items():
        kind = type(v).__name__
        if isinstance(v, list):
            desc = f"数组，{len(v)} 项"
        elif isinstance(v, dict):
            desc = f"对象，{len(v)} 个键"
        else:
            desc = f"`{v}`" if isinstance(v, str) else str(v)
        w(f"| `{k}` | {kind} · {desc} |")
    w("")

    # ---------------- 视频
    w("## 2. 视频（6 个）")
    w("")
    w("全部为 **VP9 / webm**，Chromium 原生解码。抽卡动画 4 段**无音轨**，音效另配（见 §3）。")
    w("")
    w("| 键 | 运行时路径 | 体积 | 用途 / 说明 |")
    w("|---|---|---|---|")
    vid_notes = {
        "video/login.webm": "开机动画 5.001s，**唯一带音轨**（VP9 + opus）",
        "video/RPs-1-N.webm": "单抽·未出 5★（2560×1440 / 30fps / 10s，无音轨）",
        "video/RPs-1-Y.webm": "单抽·出 5★（同上）",
        "video/RPm-10-N.webm": "十连·未出 5★（同上）",
        "video/RPm-10-Y.webm": "十连·出 5★（同上）",
        "video/banner-2.10-02.webm": "执律的流金卡池动态背景（VP9 去音轨，由 `06.mp4` 转出）",
    }
    for key, rel in flat_paths({"loginVideo": manifest.get("loginVideo"), "video": manifest.get("video")}):
        w(f"| `{key}` | `{rel}` | {human(size_of(rel))} | {vid_notes.get(rel, '')} |")
    for b in manifest["banners"]:
        bv = b["assets"].get("bgVideo")
        if bv:
            w(f"| `banners[{b['id']}].assets.bgVideo` | `{bv}` | {human(size_of(bv))} | {vid_notes.get(bv, '')} |")
    w("")
    w("源文件：`素材/视频素材/RPs-1-N.webm` 等 4 段直接拷贝；"
      "`素材/视频素材/Login_Title_ShowUp_Onlylogo_带配音.webm` → `video/login.webm`；"
      "`banner-2.10-02.webm` 为手动转码产物，不在 `collect-assets.py` 里。")
    w("")

    # ---------------- 音频
    w("## 3. 音频（38 个）")
    w("")
    w("全部 **ogg / Vorbis**。键名与 `src/composables/useAudio.ts` 的 `SfxName` 一一对应，"
      "**加音效必须两边同时改**。源文件来自 `素材/卡池音频/索引.csv`（按「原始事件名」精确匹配）。")
    w("")
    direct = {
        "sfx/bgm.ogg": ("音频素材/96/968622297.mp3", "卡池 BGM1（主循环）"),
        "sfx/bgm-egg.ogg": ("音频素材/99/994516521.mp3", "BGM2 彩蛋（BGM1 结束后 30% 概率插播，40s 兜底切回）"),
        "sfx/draw-normal.ogg": ("音频素材/81/810555521.mp3", "抽卡动画·普通"),
        "sfx/draw-gold.ogg": ("音频素材/39/393569930.mp3", "抽卡动画·出金"),
        "sfx/settings-open.ogg": ("卡池音频/游戏录屏音频分割/open1.mp3", "进入设置页"),
    }
    ev_items = [(k, rel) for k, rel in manifest["sfx"].items()
                if not rel.startswith("sfx/banner-enter") and rel not in direct]
    w(f"### 3.1 事件音效（{len(ev_items)} 个）")
    w("")
    w("| 键名 | 运行时路径 | 原始事件名 | 体积 |")
    w("|---|---|---|---|")
    ev_map = {name: ev for ev, name in ca.SFX_EVENTS}
    for k, rel in ev_items:
        w(f"| `{k}` | `{rel}` | `{ev_map.get(k, '—')}` | {human(size_of(rel))} |")
    w("")
    w(f"### 3.2 直接路径音效（{len(direct)} 个）")
    w("")
    w("| 键名 | 运行时路径 | 源 mp3 | 用途 |")
    w("|---|---|---|---|")
    for k, rel in manifest["sfx"].items():
        if rel in direct:
            src, use = direct[rel]
            w(f"| `{k}` | `{rel}` | `{src}` | {use} |")
    w("")
    w("### 3.3 卡池进入音（按 banner 独立，2 个）")
    w("")
    w("| banner | 运行时路径 | 体积 |")
    w("|---|---|---|")
    for bid, rel in manifest.get("bannerEnter", {}).items():
        w(f"| `{bid}` | `{rel}` | {human(size_of(rel))} |")
    w("")
    w("> 未配置的池回落通用逻辑；配置了就叠 1/3 音量再播一次赠送弹窗音。")
    w("")

    # ---------------- 字体
    w("## 4. 字体库（6 个）")
    w("")
    w("| CSS font-family | 字重 | 运行时路径 | 源文件（`素材/字体库/`） | 体积 |")
    w("|---|---|---|---|---|")
    font_rows = {
        "fonts/yahei-bold.ttf": ("NikkiYaHei", "700", "FZYASHJW_Cu.ttf（方正雅士黑·粗）"),
        "fonts/yahei-medium.ttf": ("NikkiYaHei", "400", "FZYASHJW_Zhong.ttf（方正雅士黑·中）"),
        "fonts/body.ttf": ("NikkiBody", "400", "NotoSansSC-Regular.ttf"),
        "fonts/body-bold.ttf": ("NikkiBodyBold", "400", "NotoSansSC-SemiBold.ttf"),
        "fonts/number.ttf": ("NikkiNumber", "400", "DIN_Alternate_Bold.ttf"),
        "fonts/currency.ttf": ("NikkiCurrency", "400", "X6FontCurrency-Regular.ttf"),
    }
    for rel, (fam, wt, src) in font_rows.items():
        w(f"| `{fam}` | {wt} | `{rel}` | {src} | {human(size_of(rel))} |")
    w("")
    w("> 字体栈首位是 `NikkiYaHei`（游戏原字体，覆盖 3076 汉字，只缺「翙、蹚」，靠 Noto 兜底）。"
      "换字体后文字整体偏高 4~7px，需按实机墨迹 bbox 逐个调 `top`。")
    w("")

    # ---------------- 图片
    w("## 5. 图片素材")
    w("")

    # 5.1 currency
    cur_files = sorted({i["icon"] for i in manifest["currency"].values()})
    w(f"### 5.1 货币图标（{len(manifest['currency'])} 种货币 / {len(cur_files)} 个文件）")
    w("")
    w("| 货币 | 运行时路径 | 体积 |")
    w("|---|---|---|")
    for name, info in manifest["currency"].items():
        w(f"| {name} | `{info['icon']}` | {human(size_of(info['icon']))} |")
    w("")
    w("> 「共鸣水晶」与「启示水晶」共用 `crystal.webp`。所有货币均为无限，不随抽卡变化。")
    w("")

    # 5.2 stars3
    w("### 5.2 3★ 散件试穿图（30 个）")
    w("")
    w("目录 `stars3/`，命名 `<部位>-<部件名>.webp`，均为 **520×724** 试穿图。")
    w("")
    w("源文件：`素材/图片素材/<版本>/3星-<来源>-《套装》/<形态> l <形态名>/<部位>-<部件名>.webp`，"
      "由 `collect-assets.py` 平铺到 `stars3/`（3★ 不参与套装弹层，只需要单张试穿图）。")
    w("")
    w("| 文件名 | 部位 | 主属性 | 体积 |")
    w("|---|---|---|---|")
    for it in manifest["stars3"]:
        rel = it["src"]
        w(f"| `{rel.split('/', 1)[1]}` | {it['slot']} | {it['style']} | {human(size_of(rel))} |")
    w("")

    # 5.3 ui
    ui = manifest["ui"]
    ui_flat: list[tuple[str, str]] = []
    for sec, val in ui.items():
        if isinstance(val, str):
            ui_flat.append((sec, val))
        else:
            ui_flat += flat_paths(val, sec)
    ui_bytes = sum(size_of(p) for _, p in ui_flat)
    w(f"### 5.3 界面图片（`ui/`，manifest 引用 {len(ui_flat)} 条）")
    w("")
    w("按功能分 10 个分区。**这张表是改界面时查素材的第一入口**：左列是 manifest 键路径，"
      "代码里 `asset(ui.<键>)` 取到的就是中列的路径。")
    w("")
    # 源素材反查表：UI_ASSETS 是 (src, out, q)，DEEPSEA_ASSETS 是 {键: (src, q)}
    src_map = {out: src for src, out, _q in ca.UI_ASSETS}
    for _k, (_src, _q) in getattr(ca, "DEEPSEA_ASSETS", {}).items():
        src_map[f"ui/deepsea/{_k}.webp"] = _src
    # 版本选择页：这几项由脚本内联裁切/改名，UI_ASSETS 里没有直接对应项
    _card_dir = "朋友分享素材/UI/Image/Card"
    for _v, _n in ca.VERSION_CARDS:
        src_map[f"ui/ver/card/{_v}.webp"] = f"{_card_dir}/T_UI_Friends_Card_img_{_n}.png"
        src_map[f"ui/ver/big/{_v}.webp"] = (
            f"{_card_dir}/T_UI_Pear_Card_img_{_n}_M.png"
            "（缺 M 退 _L / _L1，均 1532×860）")
    src_map["ui/ver/title-panel-n.webp"] = (
        "朋友分享素材/UI/Common/Textures/T_UI_common_btn_title_l.png（裁 40,10,513,138）")
    src_map["ui/ver/title-panel-h.webp"] = (
        "朋友分享素材/UI/Common/Textures/T_UI_common_btn_title_h.png（同框裁切）")
    src_map["ui/ver/desc-band.webp"] = (
        "朋友分享素材/UI/SysResonance/texture/V2/T_UI_resonance_reward_tuning_txtbg04.png"
        "（alpha 119→255，ffmpeg yuva420p）")
    src_map["ui/ver/ver-tag.webp"] = (
        "朋友分享素材/UI/SysResonance/texture/V2/T_UI_resonance_reward_tuning_txtbg01.png"
        "（裁到实体 335×48）")
    for sec in ui:
        rows = [(k, p) for k, p in ui_flat if k == sec or k.startswith(sec + ".") or k.startswith(sec + "[")]
        if not rows:
            continue
        b = sum(size_of(p) for _, p in rows)
        w(f"#### 5.3.{list(ui.keys()).index(sec) + 1} `ui/{sec}/` —— {len(rows)} 项 · {human(b)}")
        w("")
        w(SECTION_DESC.get(sec, ""))
        w("")
        w("| manifest 键 | 运行时路径 | 源素材（`素材/` 下） | 体积 | 备注 |")
        w("|---|---|---|---|---|")
        for k, p in rows:
            src = src_map.get(p) or "—"
            nt = ""
            m = re.match(r"banner\.namePlates\.(\d+)$", k)
            if m:
                nt = f"专属套名横幅（gachaKey {m.group(1)}，332×96 右侧渐隐）"
            elif re.match(r"banner\.thumbs\[\d+\]$", k):
                nt = "卡池列表缩略图（手绘精修版，与 banners/thumb 二选一）"
            elif k.startswith("ver.cards."):
                nt = "版本缩略图 672×188（页面里 opacity .7）"
            elif k.startswith("ver.bigCards."):
                nt = "版本大图 1532×860（页面里 1184×640 cover）"
            else:
                nt = note(p)
            w(f"| `{k}` | `{p}` | `{src}` | {human(size_of(p))} | {nt} |")
        w("")
    w(f"`ui/` 分区合计：**{len(ui_flat)} 条引用 / {human(ui_bytes)}**。"
      f"其中 {len(ca.UI_ASSETS)} 条来自 `collect-assets.py` 的 `UI_ASSETS` 常量表、"
      f"{len(getattr(ca, 'DEEPSEA_ASSETS', {}))} 条来自 `DEEPSEA_ASSETS`（深海回响 V2），"
      "其余（`banner.namePlates`、`banner.thumbs`、`window.*` 等）由脚本按目录扫描动态生成。")
    w("")

    # 5.4 banners
    w("### 5.4 卡池背景与缩略图（`banners/`）")
    w("")
    w("| 子目录 | 磁盘文件 | 命名规则 | 说明 |")
    w("|---|---|---|---|")
    for d, desc in BANNER_SUBDIR_DESC.items():
        files = [p for p in on_disk if p.startswith(d + "/")]
        rule = "`<gachaKey>/<层名>.webp`" if d.endswith("layers") else (
            "`<gachaKey>.webp`" if d.endswith("/title") else "`<listKey>.webp`")
        w(f"| `{d}/` | {len(files)} | {rule} | {desc} |")
    w("")
    has_banner = [b for b in manifest["banners"]
                  if any(os.path.exists(os.path.join(ASSETS, p))
                         for p in [b["assets"].get("bg"), b["assets"].get("bgClean"),
                                   b["assets"].get("thumb"), b["assets"].get("titleBanner"),
                                   b["assets"].get("title")] if p)
                  or (b["assets"].get("layers") or [])]
    w(f"**已归集横幅/缩略图的 {len(has_banner)} 个卡池**"
      f"（其余 {len(manifest['banners']) - len(has_banner)} 池的 `banners/` 目录为空，见 §7）：")
    w("")
    w("| listKey | 卡池 | gachaKey | bg | bg-clean | thumb | title-banner | title | layers |")
    w("|---|---|---|---|---|---|---|---|---|")
    for b in has_banner:
        a = b["assets"]
        mark = lambda p: "✓" if p and os.path.exists(os.path.join(ASSETS, p)) else "—"
        w(f"| `{b['listKey']}` | {b['name']} | {b['gachaKey'] or '—'} | "
          f"{mark(a.get('bg'))} | {mark(a.get('bgClean'))} | {mark(a.get('thumb'))} | "
          f"{mark(a.get('titleBanner'))} | {mark(a.get('title'))} | "
          f"{len(a.get('layers') or [])} 层 |")
    w("")

    # 5.5 sets
    set_dirs = sorted(p for p in os.listdir(os.path.join(ASSETS, "sets"))
                      if os.path.isdir(os.path.join(ASSETS, "sets", p)))
    set_files = [p for p in on_disk if p.startswith("sets/")]
    set_bytes = sum(size_of(p) for p in set_files)
    w(f"### 5.5 套装图片（`sets/`，磁盘 {len(set_dirs)} 套 / {len(set_files)} 个文件 / {human(set_bytes)}）")
    w("")
    w("**单套目录结构**（以 `S0001` 为例，标准套约 70 个文件）：")
    w("")
    w("```")
    w("sets/<套装ID>/")
    w("├── portrait.webp                套装主立绘（弹层左侧，原尺寸不缩放）")
    w("├── awaken-1.webp ~ awaken-4.webp  觉醒 LV1~LV4")
    w("├── icons/<部件名>.webp          部件图标 256×256 透明底（图鉴/部件格）")
    w("└── cards/<形态>/")
    w("    ├── 整体-<形态>.webp          整套立绘 448×656 透明底")
    w("    └── <部位>-<部件名>.webp      单部件试穿图 520×724")
    w("```")
    w("")
    w("形态目录名：`初始` / `焕新` / `一进` / `二进` / `满进` / `进化`（4★ 套只有 `初始/焕新/进化`）。")
    w("")
    w("**manifest 里的键路径**")
    w("")
    w("```")
    w("banners[].sets[].assets.portrait             → sets/<id>/portrait.webp")
    w("banners[].sets[].assets.awaken[]             → sets/<id>/awaken-<N>.webp")
    w("banners[].sets[].assets.icons[].src          → sets/<id>/icons/<部件名>.webp")
    w("banners[].sets[].assets.stages[].cards[].src → sets/<id>/cards/<形态>/<部位>-<部件名>.webp")
    w("```")
    w("")
    w(f"**已归集的 {len(set_dirs)} 套**：" + "、".join(f"`{d}`" for d in set_dirs))
    w("")
    w("> manifest 声明 116 套（5622 条引用），磁盘只有 32 套 —— 其余 84 套未归集，见 §7。")
    w("")

    # 5.6 milestones
    ms_files = [p for p in on_disk if p.startswith("milestones/")]
    ms_banners = sorted({p.split("/")[1] for p in ms_files})
    w(f"### 5.6 深忆奖励（`milestones/`，磁盘 {len(ms_files)} 个文件 / {len(ms_banners)} 个池）")
    w("")
    w("| 项 | 说明 |")
    w("|---|---|")
    w("| 命名 | `milestones/<banner-id>/<抽数>.webp` |")
    w("| 档位 | 20 / 40 / 60 / 80 / 100 / 120 / 140 / 160 / 180 / 230 |")
    w("| 尺寸 | 256×256 透明底 |")
    w("| 源文件 | `素材/source/<版本>/<卡池>/深忆奖励/<抽数>-<英文名>.png` |")
    w("| 键路径 | `banners[].milestones[].img` |")
    w("")
    w("> ⚠️ **已知缺陷**：230 抽实际有 3 件奖励，但 `collect-assets.py` 按 `f\"{pulls}.webp\"` 命名 → "
      "三件互相覆盖，只剩最后一件。`banner-2.10-02` 应 12 件，磁盘只有 10 件。"
      "修法：改为 `230-1 / 230-2 / 230-3`。")
    w("")

    # ---------------- 管线
    w("## 6. 源素材 → 运行时 归集管线")
    w("")
    w("**唯一入口**：`tools/collect-assets.py`。不要手工往 `public/assets/` 里丢文件 —— "
      "下次跑脚本会被覆盖或对不上 manifest。")
    w("")
    w("| 步骤 | 函数 / 常量 | 输入 | 输出 |")
    w("|---|---|---|---|")
    w("| 1 | `素材/pool-map.json`（由 `build-pool-map.py` 生成） | 解包素材 + 文案 + yaml | 77 池 / 116 套 / 三套编号 / 资产路径 |")
    w("| 2 | `UI_ASSETS` | `素材/朋友分享素材/UI/**` | `ui/**`（webp，按表给质量） |")
    w("| 3 | `SFX_EVENTS` + `AUDIO_FILES` | `素材/卡池音频/索引.csv`、`素材/音频素材/**` | `sfx/**`（ogg） |")
    w("| 4 | `FONT_MAP` | `素材/字体库/*.ttf` | `fonts/**` |")
    w("| 5 | `VIDEO_FILES` | `素材/视频素材/*.webm` | `video/*.webm` |")
    w("| 6 | 卡池循环 | `素材/source/<版本>/<卡池>/**` | `banners/**`、`sets/**`、`milestones/**` |")
    w("| 7 | `build_manifest()` | 以上全部 | `manifest.json` |")
    w("")
    w("常用命令：")
    w("")
    w("```bash")
    w("# 归集单个卡池的全部素材（含套装/横幅/深忆奖励）")
    w("python tools/collect-assets.py --pool banner-2.10-02 --force")
    w("")
    w("# 全量归集（77 池，耗时长）")
    w("python tools/collect-assets.py --all")
    w("")
    w("# 只重建 manifest（不拷文件）—— 改完数据后必跑，否则 manifest 还是旧的")
    w("python tools/collect-assets.py --all --manifest-only")
    w("```")
    w("")
    w("> ⚠️ 只跑 `--pool` 会把 manifest 重建成**只有那一个池**。改完必须补一次 `--all --manifest-only`。")
    w("")

    # ---------------- 体检
    w("## 7. 完整性体检")
    w("")
    rows = []
    for b in manifest["banners"]:
        s: set[str] = set()
        collect_all_refs(b["assets"], s)
        collect_all_refs(b.get("milestones") or [], s)
        collect_all_refs(b.get("sets") or [], s)
        miss = [p for p in s if not os.path.exists(os.path.join(ASSETS, p))]
        rows.append((b["id"], b["name"], len(s), len(miss)))
    ok = [r for r in rows if r[3] == 0]
    bad = [r for r in rows if r[3] > 0]
    full_miss = [r for r in bad if r[3] == r[2]]
    partial = [r for r in bad if r[3] < r[2]]

    w(f"### 7.1 卡池素材完整度：**{len(ok)} / {len(rows)} 完整，{len(bad)} 池有缺失**")
    w("")
    w("| 状态 | 池数 | 说明 |")
    w("|---|---|---|")
    w(f"| 完整 | {len(ok)} | 全部引用路径都能在磁盘找到 |")
    w(f"| 部分缺失 | {len(partial)} | " +
      ("、".join(f"`{r[0]}` 缺 {r[3]} 条" for r in partial) if partial else "无") + " |")
    w(f"| 完全未归集 | {len(full_miss)} | 引用 100% 找不到 |")
    w("")
    w(f"**完整的 {len(ok)} 池**（当前可正常游玩）：")
    w("")
    w("| banner id | 卡池 | 引用条数 |")
    w("|---|---|---|")
    for bid, name, n, m in ok:
        w(f"| `{bid}` | {name} | {n} |")
    w("")
    w(f"**素材不完整的 {len(bad)} 池**（要玩必须先补素材）：")
    w("")
    for i in range(0, len(bad), 3):
        chunk = bad[i:i + 3]
        w("　".join(f"`{bid}` {name}" for bid, name, _n, _m in chunk) + "  ")
    w("")
    w(f"### 7.2 缺失明细：共 **{len(missing)}** 条")
    w("")
    c = collections.Counter("/".join(p.split("/")[:2]) for p in missing)
    w("| 目录 | 缺失条数 |")
    w("|---|---|")
    for k, v in c.most_common(12):
        w(f"| `{k}/` | {v} |")
    if len(c) > 12:
        w(f"| …其余 {len(c) - 12} 个目录 | {sum(list(c.values())[12:])} |")
    w("")
    w("### 7.3 孤儿文件（有文件、manifest 未引用）：**%d** 个" % len(orphan))
    w("")
    if orphan:
        w("| 运行时路径 | 体积 | 处置建议 |")
        w("|---|---|---|")
        for p in orphan:
            w(f"| `{p}` | {human(size_of(p))} | 可删，或补进 `UI_ASSETS` 表 |")
    else:
        w("无。")
    w("")
    w("### 7.4 补齐命令")
    w("")
    w("```bash")
    w("# 补齐某个池（会同时重建该池的套装/横幅/深忆奖励）")
    w("python tools/collect-assets.py --pool <banner-id> --force")
    w("")
    w("# 全量补齐后重建 manifest")
    w("python tools/collect-assets.py --all --force && python tools/collect-assets.py --all --manifest-only")
    w("```")
    w("")

    # ---------------- 附录
    w("## 8. 附录：按使用场景速查")
    w("")
    w("| 我想改… | 去改哪里 |")
    w("|---|---|")
    w("| 主页背景 / LOGO / 装饰 | `ui/home/*.webp`（源：`素材/主页/主页面素材/`） |")
    w("| 共鸣页卡池背景 | `banners/bg-clean/<listKey>.webp` + `banners/title/<gachaKey>.webp` |")
    w("| 卡池列表缩略图 | `banners/thumb/<listKey>.webp` |")
    w("| 共鸣按钮 / 货币栏 | `ui/banner/pull-*.webp`、`ui/banner/long-bar.webp`、`ui/banner/social-bg.webp` |")
    w("| 套名横幅 | `banners/name/<NNN>.webp`（专属，19 池）/ `ui/banner/set-name-01,02.webp`（通用） |")
    w("| 套装详情弹层皮肤 | `ui/popup/art-*.webp` + `ui/popup/plate-*.webp` |")
    w("| 部件图标 | `sets/<套装ID>/icons/<部件名>.webp` |")
    w("| 部件试穿图（十连卡 / 详情） | `sets/<套装ID>/cards/<形态>/<部位>-<部件名>.webp` |")
    w("| 抽卡动画视频 | `video/RP*-*.webm` |")
    w("| 抽卡音效 | `sfx/*.ogg` + `useAudio.ts` 的 `SfxName` |")
    w("| 深忆奖励图标 | `milestones/<banner-id>/<抽数>.webp` |")
    w("| 字体 | `fonts/*.ttf` + `global.css` 的 6 条 `@font-face` |")
    w("| 深海回响界面 | `ui/deepsea/*.webp`（21 个，源：`朋友分享素材/UI/SysResonance/texture/V2/` + `DXT5/bg-SHHX.png`） |")
    w("| 鼠标指针 | `ui/cursor/mouse.webp` |")
    w("")
    w("---")
    w("")
    w("### 变更记录")
    w("")
    w("| 时间 | 变更 |")
    w("|---|---|")
    for _d, _txt in REPORT_HISTORY:
        w(f"| {_d} | {_txt} |")
    w("")

    text = "\n".join(L)
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(text)
    return text


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default=os.path.join(ROOT, "素材路径总报告.md"))
    args = ap.parse_args()
    if not os.path.exists(MANIFEST):
        print(f"[ERROR] 找不到 {MANIFEST}", file=sys.stderr)
        return 1
    text = build(args.out)
    print(f"[OK] 已生成 {args.out}（{len(text)} 字符 / {text.count(chr(10)) + 1} 行）")
    return 0


if __name__ == "__main__":
    sys.exit(main())
