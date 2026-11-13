# -*- coding: utf-8 -*-
"""
界面标注文档生成器
==================
用途：按「界面规格（spec）」批量生成每个界面的三件套文档：
  1) <界面>_坐标记录.csv   —— 图层 / 素材 / 1920×1080 画布坐标 / 1400×788 文档坐标
  2) <界面>_素材路径.md    —— 素材路径表 + 坐标表 + 层级堆放说明
  3) <界面>_堆放示意图.png —— 透明棋盘格底 + 各图层色框 + L## 标签（对应示例的作图方式）
  4) <界面>_标注截图.png   —— 实机截图压暗 + 各图层色框 + L## 标签

数据来源优先级（写在每个图层的 src 字段里）：
  UMG  —— 解包 UMG WidgetBlueprint 反序列化出的 slot 布局（布局坐标/*.json、*.md），1920×1080 基准
  实测 —— 用 tools/measure-shot.py 对实机截图做亮像素投影量出来的边界（±5px）
  推算 —— 由 UMG 锚点 + 容器尺寸推算
  估算 —— 截图目测，待校准（⚠ 不要直接拿来做像素级还原）

用法：
  python tools/gen-interface-doc.py            # 生成全部界面
  python tools/gen-interface-doc.py 01         # 只生成编号以 01 开头的界面
"""

import os
import re
import csv
import sys
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
# 成品根：心忆共鸣（开发版 = 项目根下的它；发行版 = 发行版根下的它）
SIM = os.path.join(ROOT, "心忆共鸣")
# 工具根：心忆奇想工坊/工具（开发版与发行版同构）
TOOL_ROOT = os.path.join(ROOT, "心忆奇想工坊", "工具")
OUT_DIR = os.path.join(ROOT, "布局坐标", "界面标注")
ASSET_ROOT = os.path.join(ROOT, "素材", "朋友分享素材", "UI")

DOC_W, DOC_H = 1400, 788          # 文档画布（示例采用的尺寸）
CAN_W, CAN_H = 1920, 1080         # 游戏设计分辨率
S = DOC_W / CAN_W                 # 1920 → 1400 缩放系数 = 0.7292

FONT_CANDIDATES = [
    r"C:\Windows\Fonts\msyh.ttc",
    r"C:\Windows\Fonts\msyhbd.ttc",
    r"C:\Windows\Fonts\simhei.ttf",
]

# 图层分类配色（示意图中按类别着色，方便一眼看出「背景 / 面板 / 按钮 / 装饰」）
CAT_COLOR = {
    "背景":   (86, 132, 224),
    "光效":   (150, 110, 220),
    "面板":   (60, 178, 176),
    "卡牌":   (226, 168, 87),
    "按钮":   (232, 122, 96),
    "文本":   (240, 214, 130),
    "图标":   (120, 200, 120),
    "装饰":   (196, 132, 190),
}
CAT_ORDER = ["背景", "光效", "面板", "卡牌", "按钮", "文本", "图标", "装饰"]


# ============================================================================
# 一、素材索引（用于自动补全「原 PNG 宽高」）
# ============================================================================
_asset_index = None


def build_asset_index():
    """遍历 素材/朋友分享素材/UI，建立 文件名 → 绝对路径 索引（只索引 png/webp/jpg）。"""
    global _asset_index
    if _asset_index is not None:
        return _asset_index
    idx = {}
    if os.path.isdir(ASSET_ROOT):
        for dirpath, _dirs, files in os.walk(ASSET_ROOT):
            for f in files:
                if f.lower().endswith((".png", ".webp", ".jpg")):
                    idx.setdefault(f, os.path.join(dirpath, f))
    _asset_index = idx
    return idx


def asset_size(fname):
    """按文件名找素材，返回 (宽, 高, 绝对路径)；找不到返回 (None, None, None)。"""
    if not fname:
        return (None, None, None)
    idx = build_asset_index()
    p = idx.get(fname)
    if not p:
        base = os.path.splitext(fname)[0]
        for k, v in idx.items():
            if os.path.splitext(k)[0].lower() == base.lower():
                p = v
                break
    if not p:
        return (None, None, None)
    try:
        with Image.open(p) as im:
            return (im.width, im.height, p)
    except Exception:
        return (None, None, p)


def rel_asset(p):
    if not p:
        return ""
    try:
        return os.path.relpath(p, ROOT).replace("\\", "/")
    except Exception:
        return p


# ============================================================================
# 二、界面规格（SPEC）
#     每个图层字段：
#       i      图层号（L01、L02 …，数字越小越靠底）
#       label  中文说明
#       cat    分类（决定示意图配色）
#       asset  素材文件名（有 PNG 时自动补全尺寸）；材质类写材质名并留空文件名
#       dir    素材所在目录（相对 素材/朋友分享素材/UI）
#       umg    UMG 层级路径
#       x,y,w,h  1920×1080 画布坐标（左上角 + 宽高）
#       src    坐标来源：UMG / 实测 / 推算 / 估算
#       note   备注
# ============================================================================

SPECS = []

# ---------------------------------------------------------------- 01 共鸣主界面
SPECS.append({
    "key": "01-共鸣主界面",
    "name": "共鸣主界面",
    "widget": "WBP_Resonance_Main_New（+ WBP_Resonance_Tab / TabItem_PX / Main_SuitInfo_V2）",
    "shot": r"D:\电脑美化\图片\游戏实机\屏幕截图 2026-10-19 151231.png",
    "shot_desc": "实机截图「执律的流金」卡池（1920×1080，截图实际 1918×1078）",
    "summary": [
        "整屏以「深蓝星空底图 + 底部光束 + 底部黑条」三件套打底，所有交互件都挂在 SafeZone 下的两级 ScaleBox 里。",
        "左侧 342px 宽的竖列是卡池缩略图列表（RetainerBox_TabItem，11~353），列表底部接套装信息条。",
        "右上角是货币栏（ScaleBox_Money，右缘内缩 55px、顶部内缩 23px）。",
        "右下角是动作区（ScaleBox_Roll，右缘内缩 40px、底部内缩 19px），内含两个 356×112 的共鸣按钮。",
        "底部黑条（0,600→1920,760）是承托底部信息条的暗场，实机里它压在背景光带之上、所有 UI 之下。",
    ],
    "notes": [
        "**坐标基准**：本界面 UMG 设计分辨率即 1920×1080，实测截图与 UMG 值 1:1 对应（截图 1918×1078 为 Windows 截图裁边，误差 ±1px）。",
        "**易错点 1**：主背景 Image_Bg_1 的 UMG 名义坐标是 -1280,-720→640,360（因为对齐点 0.5 且左侧/顶部各外扩 320/180），实机渲染是铺满整屏，按 0,0,1920,1080 处理即可。",
        "**易错点 2**：两个共鸣按钮的**素材原始比例不同**（单抽 360×116、十连 352×97），要等大必须固定 356×112 + 拉伸填充，不能各自按原比例。",
        "**易错点 3**：底部黑条高度 160px（y 600→760），只占屏幕下方 14.8%；它下面是云海光带，不要把整屏压暗。",
    ],
    "layers": [
        dict(i=1, cat="背景", label="主背景·深蓝星空", asset="T_UI_resonance_bg_textures_01.png",
             dir="SysResonance/Texture", umg="/CanvasPanel_Main/BG/Image_Bg_1",
             x=0, y=0, w=1920, h=1080, src="UMG+实测",
             note="UMG 名义 -1280,-720→640,360（外扩对齐），实机铺满整屏"),
        dict(i=2, cat="光效", label="天光·下（宽光带）", asset="", dir="",
             umg="/CanvasPanel_Main/BG/Fx_Glow_01", x=152, y=422, w=1963, h=178, src="UMG",
             note="材质 MI_UI_SkyLight_01，zorder=2"),
        dict(i=3, cat="光效", label="天光·上（窄光带）", asset="", dir="",
             umg="/CanvasPanel_Main/BG/Fx_Glow_02", x=203, y=365, w=1783, h=173, src="UMG",
             note="材质 MI_UI_SkyLight_02，zorder=2"),
        dict(i=4, cat="光效", label="底部光束带", asset="", dir="",
             umg="/CanvasPanel_Main/BG/Image_Bg_2", x=189, y=789, w=2135, h=418, src="UMG",
             note="材质 MI_UI_Resonance_Gacha_Bg_Line_01，横向溢出屏幕"),
        dict(i=5, cat="光效", label="中央竖向光柱", asset="T_UI_resonance_bg_Light_01.png",
             dir="SysResonance/Texture", umg="/CanvasPanel_Main/BG/Image_Bg_3",
             x=640, y=770, w=640, h=243, src="推算",
             note="UMG 只给了 Top/Bottom 偏移（770→1013），宽度按贴图比例回填，居中于 x=960"),
        dict(i=6, cat="背景", label="底部黑条（暗场）", asset="", dir="",
             umg="/CanvasPanel_Main/BG/Fx_Bg_Black", x=0, y=600, w=1920, h=160, src="UMG",
             note="材质 MI_UI_Resonance_Main_Bottom_Black；锚点 Min(0,0.6) Max(1,1)"),
        dict(i=7, cat="光效", label="卡池标题背光", asset="T_UI_Glow_23.png", dir="UI/UIParticle/Texture",
             umg="/CanvasPanel_Main/Effect/img_titleBg", x=478, y=-768, w=363, h=1176, src="UMG",
             note="大部分在屏外，仅 y 0→408 段可见，叠在艺术字后面"),
        dict(i=8, cat="面板", label="卡池缩略图列表容器", asset="", dir="",
             umg="/…/CanvasPanel_Features/RetainerBox_TabItem", x=11, y=75, w=342, h=1230, src="UMG",
             note="L:11 T:75 R:353 B:225；列表可滚动，实机可视区约 y 75→1000"),
        dict(i=9, cat="面板", label="列表条目·缩略图", asset="T_UI_resonance_gacha_048_list_PNG.png",
             dir="SysResonance/Texture/Pic/048", umg="/CanvasPanel_Tab/CanvasPanel_TabItem/N/Image_0",
             x=11, y=75, w=256, h=172, src="UMG", note="条目内 384×172 的设计尺寸，列表内按 342 宽缩放"),
        dict(i=10, cat="文本", label="列表条目·名称条", asset="T_UI_resonance_bg_list_line.png",
             dir="SysResonance/Texture/V2", umg="/CanvasPanel_Tab/CanvasPanel_TabItem/N/Name/Bg_Name",
             x=11, y=227, w=256, h=48, src="UMG", note="压在缩略图下沿"),
        dict(i=11, cat="文本", label="套装信息条（星级/套装名/进度）", asset="T_UI_resonance_gacha_clothesinfo_PNG.png",
             dir="SysResonance/Texture", umg="/CanvasPanel_18/Suit_Name/…", x=40, y=830, w=300, h=70, src="实测",
             note="实测亮块 x≈50→340、y≈830→900；位于列表列底部"),
        dict(i=12, cat="图标", label="共鸣概率胶囊", asset="", dir="",
             umg="（文字 + 通用底板）", x=100, y=940, w=600, h=75, src="实测",
             note="实测亮块 x≈100→700、y≈940→1015，左下角"),
        dict(i=13, cat="图标", label="货币栏", asset="", dir="",
             umg="/…/CanvasPanel_Panel/ScaleBox_Money", x=1620, y=23, w=245, h=52, src="UMG",
             note="锚点右上：右缘内缩 55（→1865）、顶部内缩 23；含无垠星石/钻石/启示水晶三格"),
        dict(i=14, cat="按钮", label="深海回响入口按钮", asset="", dir="",
             umg="/…/Right_Btn（VerticalBox_WishBtn 同侧）", x=1500, y=815, w=370, h=90, src="实测",
             note="实测亮块 x≈1400→1870、y≈815→905；右对齐于货币栏下方"),
        dict(i=15, cat="按钮", label="动作区容器", asset="", dir="",
             umg="/…/CanvasPanel_Features/ScaleBox_Roll", x=1144, y=949, w=736, h=112, src="UMG+推算",
             note="锚点右下：右缘内缩 40（→1880）、底缘内缩 19（→1061）"),
        dict(i=16, cat="按钮", label="共鸣一次按钮", asset="T_UI_resonance_btn_roll_n.png",
             dir="SysResonance/Texture", umg="/…/ScaleBox_Roll/Bottom/Resonance_OneRoll/Btn_OneRoll",
             x=1144, y=949, w=356, h=112, src="UMG", note="UMG 尺寸 356×112；素材原图 360×116，需固定尺寸拉伸"),
        dict(i=17, cat="按钮", label="共鸣十次按钮", asset="T_UI_resonance_btn_roll_n.png",
             dir="SysResonance/Texture", umg="/…/ScaleBox_Roll/Bottom/Resonance_TenRolls/Btn_TenRolls",
             x=1524, y=949, w=356, h=112, src="UMG", note="与单抽按钮等大；素材原图 352×97，比例不同"),
        dict(i=18, cat="图标", label="按钮内消耗行（水晶图标+数量）", asset="T_UI_icon_003_PNG.png",
             dir="Common/Textures/Material_Icon", umg="/…/Cost_OneRoll、/Cost_TenRolls",
             x=1240, y=971, w=80, h=52, src="UMG", note="按钮内顶部 T:22→B:74.7，居中"),
        dict(i=19, cat="文本", label="底部键位提示条", asset="", dir="",
             umg="/CanvasPanel_Main/Switcher_Console/CanvasPanel_KeyTips/HorizontaBox_Hint",
             x=1300, y=1048, w=565, h=20, src="UMG", note="锚点右下：右缘内缩 55、底部内缩 12"),
    ],
})

# ---------------------------------------------------------------- 02 十连结果
SPECS.append({
    "key": "02-十连结果",
    "name": "十连结果（共鸣结果）",
    "widget": "WBP_Resonance_RewarPanel_PC_V2（+ WBP_Resonance_RewardItem_PC_V2）",
    "shot": r"D:\电脑美化\图片\游戏实机\屏幕截图 2026-10-19 145930.png",
    "shot_desc": "实机截图：两行五列共 10 件部件卡片",
    "summary": [
        "⚠ **本界面 UMG 设计基准不是 1920×1080**：RewardItem 设计尺寸 276×444，实测渲染只有 218×355，比值 0.79~0.80。",
        "  → 结论：该面板设计分辨率约为 **2400×1350**，在 1920×1080 屏上整体按 **×0.8** 渲染。UMG 表里的坐标都要乘 0.8 才是实机坐标。",
        "卡片网格：5 列 × 2 行，列间距约 270px（卡 218 + 缝 52），行间距约 400px（卡 355 + 缝 45）。",
        "网格整体居中偏上：实测第 1 行卡顶 y≈150、第 2 行卡底 y≈905，横向 x≈311→1607（中心 959）。",
        "卡片内部：照片区（设计 168×243 @36,47）→ ×0.8 后为 134×194 @29,38；底部 34.68% 是星级条 + 名称条。",
    ],
    "notes": [
        "**还原要点**：卡框素材 T_UI_resonance_bg_character_01/02/03（蓝/紫/粉）按 276×444 出图，放到 218×355 的格子里（整体缩放，不要改内部比例）。",
        "**照片区比例**：照片区占卡面高度的 55%（设计 243/444），但卡面下方还有 34.68% 的名称/星级条 —— 图片若只留 24.5% 底部留白就会被卡片内容压住，这是之前「图片过大」的根因。",
        "**新卡高亮**：第 1 张（左上角）带红色「新」角标并略微放大，实测其框线比其它卡宽约 6~13px，属于高亮态自适应。",
        "**顶部标题**：Ten_Rewards/Title 组（设计 660,452→1260,657）×0.8 → 528,362→1008,526，标题文字居中于 x=960。",
    ],
    "layers": [
        dict(i=1, cat="背景", label="结果页背景（复用池背景压暗）", asset="T_UI_resonance_bg_textures_01.png",
             dir="SysResonance/Texture", umg="/CanvasPanel_22/…", x=0, y=0, w=1920, h=1080, src="实测",
             note="整屏压暗 + 高斯感模糊，非独立贴图"),
        dict(i=2, cat="光效", label="中心圆环光晕", asset="", dir="",
             umg="/CanvasPanel_22/Fx_Deco_Lines/Fx_Group_Cir_Center/Fx_Bg_Cir_Center",
             x=144, y=-192, w=1248, h=1248, src="UMG×0.8",
             note="材质 MI_UI_Resonance_Bg_Cir_03；设计 180,-240→1740,1320（1560²）"),
        dict(i=3, cat="光效", label="左右装饰弧线", asset="", dir="",
             umg="/CanvasPanel_22/Fx_Deco_Lines/Fx_Bg_Line_L、Fx_Bg_Line_R",
             x=1000, y=10, w=538, h=814, src="UMG×0.8", note="设计 1250,13→1923,1031"),
        dict(i=4, cat="文本", label="顶部标题「共鸣结果」", asset="", dir="",
             umg="/CanvasPanel_22/Ten_Rewards/Title/…", x=528, y=362, w=480, h=164, src="UMG×0.8",
             note="设计 660,452→1260,657；左右各一串装饰点与圆环"),
        dict(i=5, cat="卡牌", label="卡片 1（左上，新卡高亮）", asset="T_UI_resonance_bg_character_03.png",
             dir="SysResonance/Texture/V2", umg="/CanvasPanel_39/…/WidgetSwitcher_Quality/Pink/Image_Frame_Pink",
             x=311, y=150, w=218, h=355, src="实测", note="带红色「新」角标，框线略宽"),
        dict(i=6, cat="卡牌", label="卡片 2", asset="T_UI_resonance_bg_character_01.png",
             dir="SysResonance/Texture/V2", umg="/…/Image_Frame_Blue", x=581, y=150, w=218, h=355, src="实测",
             note="3★ 蓝框（蓝条名栏）"),
        dict(i=7, cat="卡牌", label="卡片 3", asset="T_UI_resonance_bg_character_01.png",
             dir="SysResonance/Texture/V2", umg="/…/Image_Frame_Blue", x=851, y=150, w=218, h=355, src="实测", note=""),
        dict(i=8, cat="卡牌", label="卡片 4", asset="T_UI_resonance_bg_character_01.png",
             dir="SysResonance/Texture/V2", umg="/…/Image_Frame_Blue", x=1121, y=150, w=218, h=355, src="实测", note=""),
        dict(i=9, cat="卡牌", label="卡片 5（右上）", asset="T_UI_resonance_bg_character_01.png",
             dir="SysResonance/Texture/V2", umg="/…/Image_Frame_Blue", x=1391, y=150, w=218, h=355, src="实测", note=""),
        dict(i=10, cat="卡牌", label="卡片 6（左下）", asset="T_UI_resonance_bg_character_02.png",
             dir="SysResonance/Texture/V2", umg="/…/Image_Frame_Purple", x=311, y=550, w=218, h=355, src="实测",
             note="4★ 紫框（紫条名栏）"),
        dict(i=11, cat="卡牌", label="卡片 7", asset="T_UI_resonance_bg_character_01.png",
             dir="SysResonance/Texture/V2", umg="/…/Image_Frame_Blue", x=581, y=550, w=218, h=355, src="实测", note=""),
        dict(i=12, cat="卡牌", label="卡片 8", asset="T_UI_resonance_bg_character_01.png",
             dir="SysResonance/Texture/V2", umg="/…/Image_Frame_Blue", x=851, y=550, w=218, h=355, src="实测", note=""),
        dict(i=13, cat="卡牌", label="卡片 9", asset="T_UI_resonance_bg_character_01.png",
             dir="SysResonance/Texture/V2", umg="/…/Image_Frame_Blue", x=1121, y=550, w=218, h=355, src="实测", note=""),
        dict(i=14, cat="卡牌", label="卡片 10（右下）", asset="T_UI_resonance_bg_character_01.png",
             dir="SysResonance/Texture/V2", umg="/…/Image_Frame_Blue", x=1391, y=550, w=218, h=355, src="实测", note=""),
        dict(i=15, cat="面板", label="卡内照片区（示意，第 1 张）", asset="", dir="",
             umg="/…/Image_ShowPic_Pink（设计 36,47→204,290）", x=340, y=180, w=134, h=194, src="UMG×0.8",
             note="占卡面 61% 宽 / 55% 高；卡内相对坐标 (29,38)"),
        dict(i=16, cat="文本", label="卡内名称条 + 星级（示意，第 1 张）", asset="", dir="",
             umg="（卡框自带底栏）", x=311, y=382, w=218, h=123, src="实测",
             note="底部 34.68%（123/355）：名称条 + 星级条，绝不能被照片盖住"),
        dict(i=17, cat="图标", label="重复/转化提示条（ExtraReward）", asset="T_showpic_clothes_img_tips_01_PNG.png",
             dir="SysReward/Textures", umg="/CanvasPanel_22/CanvasPanel_67/Bg_ExtraReward",
             x=0, y=874, w=454, h=118, src="UMG×0.8", note="设计 568×148；出现在左下，仅在有额外获得时显示"),
        dict(i=18, cat="文本", label="底部提示条（点击卡片查看详情 / 空白区域继续）", asset="", dir="",
             umg="（通用提示条）", x=600, y=1000, w=720, h=44, src="实测", note="实测亮带 y≈1004→1078"),
        dict(i=19, cat="按钮", label="返回共鸣按钮", asset="", dir="",
             umg="（通用按钮）", x=1600, y=995, w=200, h=52, src="实测", note="右下角，与提示条同排"),
    ],
})

# ---------------------------------------------------------------- 03 部件详情
SPECS.append({
    "key": "03-部件详情",
    "name": "部件详情（单抽展示）",
    "widget": "WBP_Reward_NewClothes（Switcher_Sort/Cloth 分支）",
    "shot": r"D:\电脑美化\图片\游戏实机\屏幕截图 2026-10-19 145641.png",
    "shot_desc": "实机截图「俏皮黑桃」单件部件获得（示例图同款）",
    "summary": [
        "整体是「左侧卡面 + 右侧信息面板」的两分结构：卡面在 x 431~1166 一带，右侧面板 x 971~1623。",
        "立绘图（ClothImg）设计坐标 700,178→1220,902，即 **520×724**，是本页唯一的大图。",
        "右侧信息面板按属性换配色：board_01 甜美粉 / 02 性感紫 / 03 帅气蓝 / 04 典雅棕金。",
        "右上「跳过全部」圆形按钮 95×96（素材 T_UI_btn_common_skip_n，95×96），实机渲染 99×102 @1667,12。",
    ],
    "notes": [
        "**基准**：本页 UMG 即 1920×1080，与示例 CSV 的「画布坐标」同源；示例 CSV 里的坐标是人工在 PS 里框的，与 UMG 有 10~30px 级误差，本表以 UMG 为准、示例值标注为「人工实测」。",
        "**属性面板**：board_02（紫，性感）在示例中人工实测为 971,347,652×301；UMG 未单独给出 board 节点坐标，按截图回填。",
        "**罗盘徽记**：T_showpic_clothes_img_logo_right 的 UMG 坐标 1080,61→2724,967（1644×906），**右半溢出屏幕**，只显示左半部分；示例人工实测 1095,90,784×854 与之不符，以 UMG 为准。",
        "**提示条**：T_showpic_clothes_img_tips_01（568×148）压在左下角，示例实测 0,874,387×114（被裁切）。",
    ],
    "layers": [
        dict(i=1, cat="背景", label="主背景（深棕渐变+底部暖光）", asset="T_showpic_clothes_bg.png",
             dir="SysReward/Textures", umg="（BgPanel 根节点）", x=0, y=0, w=1920, h=1080, src="UMG",
             note="全屏底图"),
        dict(i=2, cat="背景", label="右侧背景（棕褐网点）", asset="T_showpic_clothes_bg_right.png",
             dir="SysReward/Textures", umg="/NewClothes/BgPanel/Bg_Right", x=731, y=0, w=1189, h=1080, src="UMG",
             note="与 SysResonance 下的 T_resonance_clothes_bg_right（紫灰）是两套，本页用棕褐这套"),
        dict(i=3, cat="装饰", label="右下圆环装饰", asset="", dir="",
             umg="/NewClothes/BgPanel/Bg_Dec_Circle", x=1497, y=753, w=353, h=610, src="UMG",
             note="材质 MI_UI_Suit_Cir_01"),
        dict(i=4, cat="装饰", label="罗盘徽记（右侧大纹样）", asset="T_showpic_clothes_img_logo_right.png",
             dir="SysReward/Textures", umg="/…/BgDec_SingleCloth/Img_clothes_logo",
             x=1080, y=61, w=1644, h=906, src="UMG", note="右半溢出屏幕，只显示左半"),
        dict(i=5, cat="装饰", label="虚线圆点圆环（右下）", asset="T_showpic_clothes_bg_right_orname_01.png",
             dir="SysReward/Textures", umg="（示例人工实测）", x=1573, y=757, w=286, h=280, src="实测",
             note="示例 CSV L04"),
        dict(i=6, cat="面板", label="卡面金框", asset="T_showpic_clothes_img_frame.png",
             dir="SysReward/Textures", umg="（示例人工实测 L08）", x=431, y=259, w=429, h=589, src="实测",
             note="四角深色三角胶片装饰；示例实测值，与 UMG 卡面图（520×724）不同源，需再校准"),
        dict(i=7, cat="卡牌", label="立绘 / 试穿图（大图）", asset="T_showpic_clothes_blank.png",
             dir="UI/Image/Showpic", umg="/…/SingleCloth/Img_Cloth/ClothImg", x=700, y=178, w=520, h=724, src="UMG",
             note="本页核心大图 520×724；3★ 散件用 520×724 试穿图，4★/5★ 用 256×256 单品图"),
        dict(i=8, cat="装饰", label="圆环装饰·左半环", asset="T_showpic_clothes_img_card_deco_01.png",
             dir="SysReward/Textures", umg="/…/SingleCloth/Deco_Circle_01", x=656, y=302, w=510, h=356, src="UMG",
             note="金色圆环 + 圆珠"),
        dict(i=9, cat="装饰", label="圆环装饰·右半环", asset="T_showpic_clothes_img_card_deco_02.png",
             dir="SysReward/Textures", umg="/…/SingleCloth/Deco_Circle_02", x=706, y=535, w=460, h=123, src="UMG", note=""),
        dict(i=10, cat="装饰", label="圆环装饰·圆珠特写", asset="T_showpic_clothes_img_card_deco_03.png",
             dir="SysReward/Textures", umg="/…/SingleCloth/Deco_Circle_03", x=712, y=367, w=454, h=291, src="UMG", note=""),
        dict(i=11, cat="装饰", label="分割线·细", asset="T_showpic_clothes_img_line_01.png",
             dir="SysReward/Textures", umg="/…/Image_319", x=1053, y=640, w=654, h=3, src="实测",
             note="示例 CSV L17"),
        dict(i=12, cat="装饰", label="分割线·粗（浅棕黄）", asset="T_showpic_clothes_img_line_02.png",
             dir="SysReward/Textures", umg="（示例人工实测 L16）", x=415, y=231, w=329, h=55, src="实测", note=""),
        dict(i=13, cat="面板", label="属性信息面板（按属性换色）", asset="T_showpic_clothes_img_board_02.png",
             dir="SysReward/Textures", umg="（WidgetSwitcher 分支）", x=971, y=347, w=652, h=301, src="实测",
             note="截图为性感紫 board_02；另有 01 粉 / 03 蓝 / 04 典雅棕金"),
        dict(i=14, cat="装饰", label="面板侧丝带", asset="T_showpic_clothes_img_boardorname_03.png",
             dir="SysReward/Textures", umg="（示例人工实测 L06）", x=800, y=229, w=129, h=331, src="实测",
             note="蓝白渐变竖光带"),
        dict(i=15, cat="装饰", label="丝绸吊牌", asset="T_showpic_clothes_img_orname_silk_ribbon.png",
             dir="SysReward/Textures", umg="（示例人工实测 L07）", x=634, y=753, w=249, h=144, src="实测", note=""),
        dict(i=16, cat="文本", label="文字装饰条 + 下划线", asset="T_showpic_clothes_img_orname_text_01.png",
             dir="SysReward/Textures", umg="（示例人工实测 L12/L13）", x=1566, y=540, w=329, h=42, src="实测",
             note="浅棕纹理横条，下面跟一条 300×18 细下划线"),
        dict(i=17, cat="图标", label="新部件角标", asset="T_UI_reward_new_img_new.png",
             dir="Common/Textures", umg="/…/SingleCloth/Image_New", x=1132, y=37, w=64, h=429, src="UMG",
             note="zorder=5；UMG 中宽度为负（镜像翻转），实机贴在卡面右上"),
        dict(i=18, cat="面板", label="额外获得条（重复/转化时）", asset="T_showpic_clothes_img_tips_01_PNG.png",
             dir="SysReward/Textures", umg="/CanvasPanel_22/CanvasPanel_67/Bg_ExtraReward",
             x=0, y=874, w=568, h=148, src="UMG", note="仅在「重复部件」态出现，左下角"),
        dict(i=19, cat="面板", label="底部提示条（ESC 跳过全部 / F 继续）", asset="T_showpic_clothes_img_tips_01.png",
             dir="SysReward/Textures", umg="（示例人工实测 L15）", x=0, y=874, w=387, h=114, src="实测",
             note="与上一行同源，示例实测被裁切为 387×114"),
        dict(i=20, cat="按钮", label="跳过全部按钮", asset="T_UI_btn_common_skip_n.png",
             dir="Common/Textures", umg="（通用圆形按钮）", x=1667, y=12, w=99, h=102, src="实测",
             note="素材原图 95×96；悬停态只有一圈发光环、没有底，需双 img 叠层"),
        dict(i=21, cat="图标", label="鼠标点击图标", asset="T_UI_KeyTips_Left_Mouse.png",
             dir="Common/Textures", umg="（示例人工实测 L02）", x=1615, y=1012, w=33, h=32, src="实测", note=""),
        dict(i=22, cat="图标", label="F 键提示", asset="T_UI_KeyTips_key_f.png",
             dir="Common/Textures/KeyTips", umg="（示例人工实测 L18）", x=1566, y=1013, w=36, h=30, src="实测", note=""),
    ],
})

# ---------------------------------------------------------------- 04 深海回响
SPECS.append({
    "key": "04-深海回响",
    "name": "深海回响（累计奖励轨道）",
    "widget": "WBP_Resonance_Bouns_Main（+ WBP_Resonance_Bonus_List / Bonus_Item / Bouns_Reward）",
    "shot": r"D:\电脑美化\图片\游戏实机\深海回响3.png",
    "shot_desc": "实机截图：9~10 个节点的奖励轨道（深海回响3.png 为无详情弹窗的干净版）",
    "summary": [
        "轨道横贯屏幕中部：实测节点中心 y≈655（节点本体 y 600→710），次数标签在节点上方 y≈470→500。",
        "节点等距排布：**间距 188px**，实测中心 x = 258、446、634、822、1010、1198、1386、1574、1761（共 9 个可见）。",
        "节点可视宽度约 108px；最左端推测还有 1 个节点位于 x≈70（被左侧进度信息遮挡或因已领取而变暗，实测未检出）。",
        "整条轨道线（MI_UI_Resonance_Bonos_Line_Main）设计尺寸 2000×257，横向铺满并溢出。",
        "大奖节点（180/230 次礼盒）用 T_UI_resonance_reward_giftbox + giftbg，比普通节点大一圈。",
    ],
    "notes": [
        "**坐标基准**：轨道相关 UMG 未给出屏幕级绝对坐标（多为容器内相对值），本表以「截图实测」为准，误差 ±5px。",
        "**⚠ 待校准项**：轨道左右端点的精确位置、节点在 10 节点池下的间距（188px 是在 9 节点池下测得的，10 节点时间距可能不同）。",
        "**层次**：背景 → 轨道底线（已获得段高亮）→ 节点光柱 → 礼盒 → 次数文字 → 悬停/选中光效 → 顶部标题 → 底部提示。",
    ],
    "layers": [
        dict(i=1, cat="背景", label="轨道页背景（复用池背景）", asset="T_UI_resonance_bg_textures_01.png",
             dir="SysResonance/Texture", umg="/CanvasPanel_0/BG/Image_381", x=0, y=0, w=1920, h=1080, src="UMG",
             note="与主界面同源底图"),
        dict(i=2, cat="光效", label="入场扫光（两层）", asset="", dir="",
             umg="/CanvasPanel_11/Fx_Effect/Fx_FadeIn_Sweep_01/02", x=0, y=0, w=1920, h=1080, src="UMG",
             note="材质 MI_UI_Resonance_Bouns_FadeIn_Sweep_01/02，覆盖 0,-488→1920,1052"),
        dict(i=3, cat="光效", label="轨道底线（未达成段）", asset="", dir="",
             umg="/CanvasPanel_20/…/Group_Base/Fx_Line_main_1", x=-40, y=590, w=2000, h=206, src="UMG×实测",
             note="材质 MI_UI_Resonance_Bonos_Line_Main；设计 2000×257，实机压到 y≈590→796"),
        dict(i=4, cat="光效", label="轨道底线（已达成高亮段）", asset="", dir="",
             umg="/CanvasPanel_20/…/Group_Highlight/Fx_Line_main_2", x=-40, y=590, w=1200, h=206, src="实测",
             note="与底线同位置，宽度按已领取进度裁剪"),
        dict(i=5, cat="装饰", label="轨道装饰线（上下各一）", asset="", dir="",
             umg="/CanvasPanel_20/…/Fx_Line_deco、Fx_Line_deco_1", x=-40, y=600, w=2000, h=160, src="UMG",
             note="材质 Deco_01（2000×200）/ Deco_02（2000×240）"),
        dict(i=6, cat="图标", label="节点 1（20 次）", asset="", dir="",
             umg="/CanvasPanel_15/Bonus_Item/…", x=204, y=600, w=108, h=110, src="实测", note="中心 x=258"),
        dict(i=7, cat="图标", label="节点 2（40 次）", asset="", dir="",
             umg="/CanvasPanel_15/Bonus_Item/…", x=392, y=600, w=108, h=110, src="实测", note="中心 x=446"),
        dict(i=8, cat="图标", label="节点 3（60 次）", asset="", dir="",
             umg="/CanvasPanel_15/Bonus_Item/…", x=580, y=600, w=108, h=110, src="实测", note="中心 x=634"),
        dict(i=9, cat="图标", label="节点 4（80 次）", asset="", dir="",
             umg="/CanvasPanel_15/Bonus_Item/…", x=768, y=600, w=108, h=110, src="实测", note="中心 x=822"),
        dict(i=10, cat="图标", label="节点 5（100 次）", asset="", dir="",
             umg="/CanvasPanel_15/Bonus_Item/…", x=956, y=600, w=108, h=110, src="实测", note="中心 x=1010"),
        dict(i=11, cat="图标", label="节点 6（120 次）", asset="", dir="",
             umg="/CanvasPanel_15/Bonus_Item/…", x=1144, y=600, w=108, h=110, src="实测", note="中心 x=1198"),
        dict(i=12, cat="图标", label="节点 7（140 次）", asset="", dir="",
             umg="/CanvasPanel_15/Bonus_Item/…", x=1332, y=600, w=108, h=110, src="实测", note="中心 x=1386"),
        dict(i=13, cat="图标", label="节点 8（160 次）", asset="", dir="",
             umg="/CanvasPanel_15/Bonus_Item/…", x=1520, y=600, w=108, h=110, src="实测", note="中心 x=1574"),
        dict(i=14, cat="卡牌", label="大奖节点（180/230 次礼盒）", asset="T_UI_resonance_reward_giftbox.png",
             dir="SysResonance/Texture/Bonus", umg="/CanvasPanel_15/Bonus_Item/Image_Special",
             x=1650, y=560, w=180, h=300, src="实测+UMG", note="礼盒比普通节点大；设计 Image_Special 378×660"),
        dict(i=15, cat="图标", label="礼盒圆形光晕底", asset="T_UI_resonance_reward_giftbg.png",
             dir="SysResonance/Texture/Bonus", umg="/CanvasPanel_25/CanvasPanel_90/Overlay_0/Image",
             x=1640, y=550, w=200, h=320, src="UMG", note="giftbg 垫在 giftbox 下"),
        dict(i=16, cat="文本", label="次数标签（20/40/…次）", asset="", dir="",
             umg="/CanvasPanel_15/Bonus_Item/Title/…", x=204, y=468, w=108, h=34, src="实测",
             note="每个节点上方 y≈470→500"),
        dict(i=17, cat="文本", label="顶部标题「深海回响」", asset="", dir="",
             umg="（文字渲染 + 圆形返回图标）", x=60, y=40, w=300, h=40, src="实测", note="左上角，实测亮块 y≈40→60"),
        dict(i=18, cat="图标", label="已领取对勾徽章", asset="T_UI_resonance_reward_tuning_hook_PNG.png",
             dir="SysResonance/Texture/V2", umg="/CanvasPanel_25/CanvasPanel_90/Img_Done",
             x=924, y=563, w=24, h=46, src="UMG", note="zorder=5，盖在已领取节点上"),
        dict(i=19, cat="按钮", label="前往/跳转按钮", asset="T_UI_resonance_reward_btn_go_n_PNG.png",
             dir="SysResonance/Texture/Bonus", umg="/CanvasPanel_0/CanvasPanel_12/BG_Normal",
             x=760, y=880, w=400, h=90, src="估算", note="⚠ 位置待校准；素材有 n/h/dwn 三态"),
        dict(i=20, cat="文本", label="底部提示条（空白区域继续）", asset="", dir="",
             umg="（通用提示条）", x=700, y=1000, w=520, h=44, src="估算", note="⚠ 位置待校准"),
    ],
})

# ---------------------------------------------------------------- 05 单抽·重复部件
SPECS.append({
    "key": "05-单抽-重复部件",
    "name": "单抽·重复部件态",
    "widget": "WBP_Reward_NewClothes（重复部件分支）+ WBP_Resonance_ExtraReward_Item",
    "shot": r"D:\电脑美化\文档\无限暖暖\素材\游戏内实机展示\抽卡-单抽-重复部件.png",
    "shot_desc": "实机展示图：抽到已有部件时的展示态",
    "summary": [
        "与 03 部件详情共用同一套骨架（左侧卡面 + 右侧信息面板），差别在于左下角多出「额外获得」条。",
        "「额外获得」条用 T_showpic_clothes_img_tips_01（568×148），UMG 中位于 ExtraReward_Item 根节点。",
        "条内左侧是转化后的素材图标（62×76 @28,14），右侧是数量文字，条下有一条 166×52 的细分割线。",
        "重复部件不再显示「新」角标（Image_New 隐藏），取而代之的是重复提示文案。",
    ],
    "notes": [
        "**与 03 的差异只在 3 处**：① 隐藏 Image_New；② 左下显示额外获得条；③ 名称区标注「重复 / 已转化为 ○○」。",
        "**额外获得条**设计尺寸 568×148，实机在 1920×1080 下按 1:1 渲染于左下角（0,874 附近）。",
        "**⚠ 待校准**：本界面缺少 1920×1080 的干净实机截图，坐标沿用 03 + UMG，截图尺寸未核实。",
    ],
    "layers": [
        dict(i=1, cat="背景", label="主背景 + 右侧背景（同 03）", asset="T_showpic_clothes_bg.png",
             dir="SysReward/Textures", umg="（同 03 L01/L02）", x=0, y=0, w=1920, h=1080, src="UMG", note=""),
        dict(i=2, cat="卡牌", label="立绘 / 试穿图（同 03）", asset="T_showpic_clothes_blank.png",
             dir="UI/Image/Showpic", umg="/…/SingleCloth/Img_Cloth/ClothImg", x=700, y=178, w=520, h=724, src="UMG",
             note="重复部件沿用同一张大图"),
        dict(i=3, cat="面板", label="属性信息面板（同 03）", asset="T_showpic_clothes_img_board_02.png",
             dir="SysReward/Textures", umg="（WidgetSwitcher 分支）", x=971, y=347, w=652, h=301, src="实测", note=""),
        dict(i=4, cat="面板", label="额外获得条（重复转化产物）", asset="T_showpic_clothes_img_tips_01_PNG.png",
             dir="SysReward/Textures", umg="/CanvasPanel_22/CanvasPanel_67/Bg_ExtraReward",
             x=0, y=874, w=568, h=148, src="UMG", note="本界面独有；左下角"),
        dict(i=5, cat="图标", label="条内素材图标", asset="T_UI_123.png", dir="Common/Textures",
             umg="/CanvasPanel_22/CanvasPanel_67/Image_Icon", x=28, y=888, w=62, h=76, src="UMG",
             note="相对条内 (28,14)"),
        dict(i=6, cat="装饰", label="条内细分割线", asset="T_showpic_clothes_img_line_01.png",
             dir="SysReward/Textures", umg="/CanvasPanel_22/CanvasPanel_67/Image_319", x=120, y=928, w=166, h=2, src="UMG",
             note="相对条内 (120,54)"),
        dict(i=7, cat="光效", label="条边缘流光（选中态）", asset="", dir="",
             umg="/CanvasPanel_22/CanvasPanel_67/Fx_Select_Img_Edge", x=0, y=874, w=568, h=148, src="UMG",
             note="材质 MI_UI_ExtraReward_Edge_01"),
        dict(i=8, cat="光效", label="条外发光", asset="", dir="",
             umg="/CanvasPanel_22/CanvasPanel_67/Fx_Select_Img_Glow", x=5, y=872, w=561, h=157, src="UMG",
             note="材质 MI_UI_ExtarReward_Bg_Glow"),
        dict(i=9, cat="按钮", label="跳过全部按钮（同 03）", asset="T_UI_btn_common_skip_n.png",
             dir="Common/Textures", umg="（通用圆形按钮）", x=1667, y=12, w=99, h=102, src="实测", note=""),
        dict(i=10, cat="面板", label="底部提示条（同 03）", asset="T_showpic_clothes_img_tips_01.png",
             dir="SysReward/Textures", umg="（示例人工实测 L15）", x=0, y=874, w=387, h=114, src="实测",
             note="与额外获得条同高，实际两者互斥/上下错开，⚠ 待校准"),
    ],
})


# ============================================================================
# 三、绘图 & 输出
# ============================================================================
def get_font(size):
    for p in FONT_CANDIDATES:
        if os.path.exists(p):
            try:
                return ImageFont.truetype(p, size)
            except Exception:
                continue
    return ImageFont.load_default()


def checkerboard(w, h, cell=20, c1=(58, 62, 74), c2=(74, 78, 92)):
    im = Image.new("RGB", (w, h), c1)
    d = ImageDraw.Draw(im)
    for y in range(0, h, cell):
        for x in range(0, w, cell):
            if ((x // cell) + (y // cell)) % 2 == 0:
                d.rectangle([x, y, x + cell - 1, y + cell - 1], fill=c2)
    return im


def draw_box(d, box, color, label, alpha_img=None, font=None, scale=1.0):
    x, y, w, h = box
    x0, y0 = int(x * scale), int(y * scale)
    x1, y1 = int((x + w) * scale), int((y + h) * scale)
    # 限制在画布内，但保留 2px 边框可见
    d.rectangle([x0, y0, x1, y1], outline=color, width=2)
    d.rectangle([x0, y0, x1, y1], fill=None)
    if alpha_img is not None:
        ad = ImageDraw.Draw(alpha_img)
        ad.rectangle([x0, y0, x1, y1], fill=color + (70,))
    # 标签
    if font:
        tw = d.textlength(label, font=font)
        pad = 3
        bx0, by0 = x0, y0
        by1 = by0 + 16
        d.rectangle([bx0, by0, bx0 + tw + pad * 2, by1], fill=color)
        d.text((bx0 + pad, by0 + 1), label, fill=(16, 18, 24), font=font)


def render_diagram(spec, out_png):
    """堆放示意图：棋盘格底 + 图层色框 + L## 标签"""
    W, H = DOC_W, DOC_H
    im = checkerboard(W, H)
    alpha = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    f = get_font(11)
    for L in spec["layers"]:
        color = CAT_COLOR.get(L["cat"], (180, 180, 180))
        draw_box(d, (L["x"], L["y"], L["w"], L["h"]), color, "L%02d" % L["i"],
                 alpha_img=alpha, font=f, scale=S)
    im = Image.alpha_composite(im.convert("RGBA"), alpha).convert("RGB")
    d = ImageDraw.Draw(im)
    # 屏框
    d.rectangle([0, 0, W - 1, H - 1], outline=(120, 200, 255), width=2)
    # 标题条
    ft = get_font(16)
    title = "%s · 素材堆放示意图（1400×788 = 1920×1080 ×0.729）" % spec["name"]
    d.rectangle([0, 0, W, 26], fill=(20, 22, 30))
    d.text((10, 4), title, fill=(235, 240, 250), font=ft)
    # 图例
    fy = H - 22
    d.rectangle([0, fy - 4, W, H], fill=(20, 22, 30))
    lx = 10
    for cat in CAT_ORDER:
        c = CAT_COLOR[cat]
        d.rectangle([lx, fy + 4, lx + 12, fy + 14], fill=c)
        d.text((lx + 16, fy + 2), cat, fill=(220, 226, 238), font=f)
        lx += 70
    im.save(out_png)
    return out_png


def render_annotated(spec, out_png):
    """标注截图：实机截图压暗 + 图层色框 + L## 标签"""
    shot = spec.get("shot", "")
    if not shot or not os.path.exists(shot):
        return None
    im = Image.open(shot).convert("RGB").resize((DOC_W, DOC_H), Image.LANCZOS)
    dark = Image.new("RGB", (DOC_W, DOC_H), (10, 12, 18))
    im = Image.blend(im, dark, 0.42)
    alpha = Image.new("RGBA", (DOC_W, DOC_H), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    f = get_font(11)
    for L in spec["layers"]:
        color = CAT_COLOR.get(L["cat"], (180, 180, 180))
        draw_box(d, (L["x"], L["y"], L["w"], L["h"]), color, "L%02d" % L["i"],
                 alpha_img=alpha, font=f, scale=S)
    im = Image.alpha_composite(im.convert("RGBA"), alpha).convert("RGB")
    d = ImageDraw.Draw(im)
    ft = get_font(16)
    d.rectangle([0, 0, DOC_W, 26], fill=(20, 22, 30))
    d.text((10, 4), "%s · 截图标注（%s）" % (spec["name"], os.path.basename(shot)),
           fill=(235, 240, 250), font=ft)
    im.save(out_png)
    return out_png


def write_csv(spec, out_csv):
    header = ["图层", "可见", "素材说明", "分类", "素材文件", "原PNG宽", "原PNG高",
              "画布x(1920)", "画布y(1080)", "画布宽", "画布高",
              "文档x(1400)", "文档y(788)", "文档宽", "文档高",
              "旋转", "不透明度", "坐标来源", "UMG层级", "素材目录", "备注"]
    with open(out_csv, "w", newline="", encoding="utf-8-sig") as f:
        w = csv.writer(f)
        w.writerow(header)
        for L in spec["layers"]:
            aw, ah, ap = asset_size(L["asset"]) if L["asset"] else (None, None, None)
            if L["asset"] and aw is None and L["dir"]:
                aw, ah, ap = asset_size(os.path.basename(L["asset"]))
            w.writerow([
                "L%02d" % L["i"], "是", L["label"], L["cat"], L["asset"] or "（材质/文字渲染）",
                aw if aw else "", ah if ah else "",
                round(L["x"]), round(L["y"]), round(L["w"]), round(L["h"]),
                round(L["x"] * S, 2), round(L["y"] * S, 2), round(L["w"] * S, 2), round(L["h"] * S, 2),
                0, 1, L["src"], L["umg"], L["dir"], L["note"],
            ])


def write_md(spec, out_md, csv_name, png_name, anno_name):
    lines = []
    A = lines.append
    A("# 无限暖暖 · %s — 素材路径 & 坐标记录" % spec["name"])
    A("")
    A("> 生成脚本：`tools/gen-interface-doc.py`（改 spec 后重跑即可刷新本文件）")
    A("> 对应 UMG：`%s`" % spec["widget"])
    A("> 实机参考图：`%s`" % spec.get("shot", "（无）"))
    A("> 素材根目录：`D:\\电脑美化\\文档\\无限暖暖\\素材\\朋友分享素材\\UI\\`")
    A("")
    A("## 一、版面要点")
    A("")
    for s in spec["summary"]:
        A("- " + s)
    A("")
    A("## 二、图层总表（%d 层，L01 最底 → L%02d 最顶）" % (len(spec["layers"]), len(spec["layers"])))
    A("")
    A("| 图层 | 分类 | 素材说明 | 素材文件 | 原图尺寸 | 画布坐标 x,y | 画布 w×h | 文档坐标 x,y | 文档 w×h | 来源 |")
    A("|---|---|---|---|---|---|---|---|---|---|")
    for L in spec["layers"]:
        aw, ah, ap = asset_size(L["asset"]) if L["asset"] else (None, None, None)
        size = ("%d×%d" % (aw, ah)) if aw else "—"
        A("| L%02d | %s | %s | `%s` | %s | %d,%d | %d×%d | %.0f,%.0f | %.0f×%.0f | %s |" % (
            L["i"], L["cat"], L["label"], L["asset"] or "（材质/文字）", size,
            round(L["x"]), round(L["y"]), round(L["w"]), round(L["h"]),
            L["x"] * S, L["y"] * S, L["w"] * S, L["h"] * S, L["src"]))
    A("")
    A("## 三、素材完整路径")
    A("")
    A("| 图层 | 素材文件 | 相对路径（相对 素材/朋友分享素材/UI） | UMG 层级 |")
    A("|---|---|---|---|")
    for L in spec["layers"]:
        p = L["dir"] + ("/" + L["asset"] if L["asset"] else "")
        A("| L%02d | `%s` | `%s` | `%s` |" % (L["i"], L["asset"] or "（材质/文字）", p or "—", L["umg"]))
    A("")
    A("## 四、坐标来源说明")
    A("")
    A("| 标记 | 含义 | 误差 |")
    A("|---|---|---|")
    A("| UMG | 解包 UMG WidgetBlueprint 的 slot 布局直接换算（1920×1080 基准） | 0（权威） |")
    A("| UMG×0.8 | UMG 值 ×0.8（该面板设计基准为 2400×1350，见十连结果） | ±2px |")
    A("| 实测 | 对实机截图做亮像素投影量出边界（tools/measure-shot.py） | ±5px |")
    A("| 推算 | 由 UMG 锚点 + 容器尺寸推算 | ±10px |")
    A("| 估算 | 截图目测，**未做像素级校准**，不可直接用于还原 | ±30px |")
    A("")
    A("## 五、还原注意事项")
    A("")
    for n in spec["notes"]:
        A("- " + n)
    A("")
    A("## 六、配套文件")
    A("")
    A("- 坐标记录 CSV：`%s` （含 1920 画布坐标与 1400 文档坐标两套）" % csv_name)
    A("- 堆放示意图：`%s`" % png_name)
    if anno_name:
        A("- 截图标注：`%s`" % anno_name)
    A("")
    with open(out_md, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))


def gen(spec):
    folder = os.path.join(OUT_DIR, spec["key"])
    os.makedirs(folder, exist_ok=True)
    base = spec["name"]
    csv_name = "%s_坐标记录.csv" % base
    md_name = "%s_素材路径.md" % base
    png_name = "%s_堆放示意图.png" % base
    anno_name = "%s_标注截图.png" % base
    write_csv(spec, os.path.join(folder, csv_name))
    render_diagram(spec, os.path.join(folder, png_name))
    anno = render_annotated(spec, os.path.join(folder, anno_name))
    write_md(spec, os.path.join(folder, md_name), csv_name, png_name, anno_name if anno else "")
    print("[OK] %s  →  %d 层" % (spec["key"], len(spec["layers"])))
    print("     %s" % os.path.join(folder, md_name))
    print("     %s" % os.path.join(folder, csv_name))
    print("     %s" % os.path.join(folder, png_name))
    if anno:
        print("     %s" % anno)


def main():
    filt = sys.argv[1] if len(sys.argv) > 1 else ""
    os.makedirs(OUT_DIR, exist_ok=True)
    for spec in SPECS:
        if filt and not spec["key"].startswith(filt):
            continue
        gen(spec)


if __name__ == "__main__":
    main()
