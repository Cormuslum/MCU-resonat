# 《无限暖暖》通用系统 UI 布局坐标表（汇总索引）

> 数据来源：游戏解包 .uasset（UMG WidgetBlueprint），经 CUE4Parse + usmap 反射反序列化 WidgetTree 获得。
>
> 坐标系：以 1920×1080 为设计分辨率。坐标为绝对像素 (x0,y0,x1,y1,宽,高)，x0,y0 为左上角，x1,y1 为右下角。负值/超出屏幕表示元素延伸到屏幕外（游戏内正常现象）。
>
> zorder 表示同父级下的叠放顺序（越小越靠底）。
>
> 本目录（`布局坐标\通用系统UI\`）为本次会话新增产出：102 个 WBP 的布局 JSON（`layout_*.json`）+ 3 份坐标表 md。前序会话已有 5 个 WBP 的产出见 `布局坐标\UI布局坐标表.md` 与 `素材\抽卡奖励界面\_layout_wbp\layout_*.json`。

---

## 一、分表索引

| 分表 | 路径 | 覆盖系统 | WBP 数 | 带贴图 Image 节点 |
|---|---|---|---|---|
| Common通用弹窗与按钮.md | `布局坐标\通用系统UI\Common通用弹窗与按钮.md` | 弹窗/遮罩/提示/通用按钮（Common） | 34 | 159 |
| SysSettings设置.md | `布局坐标\通用系统UI\SysSettings设置.md` | 设置（SysSettings PC/通用版） | 42 | 197 |
| SysResonance共鸣与商店邮件公告.md | `布局坐标\通用系统UI\SysResonance共鸣与商店邮件公告.md` | 共鸣（SysResonance）/商店/邮件/公告 | 26 | 285 |
| **合计** | | | **102** | **641** |

## 二、本次解析 WBP 清单（102 个）

### 2.1 Common 通用弹窗与按钮（34 个，见 Common通用弹窗与按钮.md）

| WBP 短名 | 节点数 | 带贴图 | WBP 短名 | 节点数 | 带贴图 |
|---|---|---|---|---|---|
| ClickClose_Tip | 7 | 2 | Common_Button_Secondary_Dis | 23 | 4 |
| Common_Backbtn_Base | - | 0* | Common_Button_Third | 23 | 4 |
| Common_BlackScreen_Mask | 2 | 1 | Common_IconBtn | 17 | 5 |
| Common_BlockMask | 1 | 0 | Common_Jump_Btn | 15 | 4 |
| Common_Button_Cancel | 22 | 4 | Common_MessageBox_Wnd | 18 | 0 |
| Common_Button_Close | 5 | 3 | Common_Page_Btn | 4 | 0 |
| Common_Button_Close_02 | 5 | 3 | Common_Round_Btn | 9 | 5 |
| Common_Button_Close_Circle | 5 | 3 | Common_SmallButton | 12 | 5 |
| Common_Button_Close_Dark | 5 | 3 | Common_Tooltip | 43 | 20 |
| Common_Button_Confirm | 30 | 10 | Common_Wnd_Bg_Base | - | 0* |
| Common_Button_Grey | 24 | 4 | Common_Wnd_Bg_L | 11 | 5 |
| Common_Button_Next | 4 | 2 | Common_Wnd_Bg_S | 18 | 5 |
| Common_Button_Secondary | 23 | 4 | Common_Wnd_ScaleLocate_Large | 5 | 0 |
| Common_backbtn | 31 | 9 | Common_Wnd_ScaleLocate_Middle | 5 | 0 |
| UI_Common_KeyTips | 6 | 0 | UI_Common_KeyTips_Entry | 2 | 0 |
| UI_Common_KeyTips_PC | 11 | 5 | UI_Common_MultiKeyTips_PC | 2 | 0 |
| UI_InfoTooltip | 220 | 74 | UI_ToolTips | 2 | 0 |

\* 标记为 0 且节点数显示 - 的两个 WBP（Common_Backbtn_Base / Common_Wnd_Bg_Base）为纯容器基座，WidgetTree 内无内联树/贴图，可视外观由嵌套子蓝图提供。

### 2.2 SysSettings 设置（42 个，见 SysSettings设置.md）

| WBP 短名 | 节点数 | 带贴图 | WBP 短名 | 节点数 | 带贴图 |
|---|---|---|---|---|---|
| Setting_Main | 51 | 12 | Setting_OptionItem_DropList | 27 | 7 |
| SysSettings_RedemptionCode_Wnd | 14 | 2 | Setting_OptionItem_Key | 27 | 11 |
| Setting_Tooltip | 16 | 5 | Setting_OptionItem_Slider | 24 | 8 |
| Setting_OptionItem_Button | 20 | 5 | Setting_OptionItem_Switch | 30 | 10 |
| Setting_OptionItem_Change | 23 | 8 | Setting_OptionList | 8 | 2 |
| Setting_OptionList_Item | 13 | 2 | Setting_OptionNumber | 3 | 2 |
| Setting_KeyList | 6 | 2 | Setting_KeyPanel | 10 | 2 |
| Setting_HandlePanel | 21 | 1 | Setting_KeyAdjust_Wnd | 10 | 0 |
| Setting_KeyAdjust_Item | 18 | 5 | SysSettings_Display_Wnd_PC | 12 | 1 |
| SysSettings_LightAdjust_PC | 10 | 3 | SysSettings_StarScene_PC | 19 | 4 |
| SysSettings_LightAdjust | 24 | 8 | SysSetting_StarScenePic | 16 | 4 |
| LogUpload | 20 | 4 | SysSettings_LanguageResource_Item | 17 | 5 |
| SysSettings_SoundResource_Change | 7 | 1 | SysSettings_SoundResource_Download | 27 | 4 |
| Setting_Child_OptionItem_Button | 21 | 6 | Setting_Child_OptionItem_Change | 24 | 9 |
| Setting_Child_OptionItem_DropList | 28 | 8 | Setting_Child_OptionItem_Slider | 25 | 9 |
| Setting_Child_OptionItem_Switch | 31 | 11 | Setting_Child_OptionList_Item | 10 | 1 |
| SysSettings_pakDownload | 8 | 0 | SysSettings_pakDownload_Popup | 6 | 0 |
| SysSettings_pakDownload_LeftItem | 29 | 11 | SysSettings_pakDownload_RightItem | 46 | 4 |
| Set_DownloadSource_PopupMain | 11 | 2 | Set_DownSour_Item | 10 | 2 |
| SysSettings_Busy_Popup | 18 | 1 | SysSettings_Busy_Popup_Item | 10 | 4 |
| Setting_DropList | 7 | 1 | Setting_DropList_Item | 9 | 2 |

### 2.3 SysResonance 共鸣与商店/邮件/公告（26 个，见 SysResonance共鸣与商店邮件公告.md）

| WBP 短名 | 节点数 | 带贴图 | WBP 短名 | 节点数 | 带贴图 |
|---|---|---|---|---|---|
| Resonance_Main_New | 84 | 10 | Resonance_RewardItem_PC_V2 | 48 | 23 |
| Resonance_Btn_Mall | 17 | 4 | Resonance_ExtraReward_Item | 15 | 6 |
| Resonance_Wants_Btn | 10 | 0 | Resonance_Bonus_List | 27 | 6 |
| Resonance_Tab | 33 | 8 | Resonance_Bonus_Item | 38 | 17 |
| Resonance_TabItem_PX | 30 | 8 | Resonance_Wish_Clothes_Main | 75 | 29 |
| Resonance_FullScreenPanel | 43 | 4 | Resonance_Main_SuitInfo_V2 | 40 | 13 |
| Resonance_More_New | 88 | 18 | Resonance_Prompt_Gift | 19 | 5 |
| Resonance_Bouns_Jump_Btn | 15 | 4 | Resonance_Bouns_Reward | 28 | 11 |
| Resonance_Bonus_Preview | 10 | 4 | Resonance_Bonus_Preview_Item | 23 | 9 |
| UI_ClothShop_Main_PC | 42 | 6 | UI_ClothShopItem_v2 | 42 | 23 |
| Shop_ShoppingCart | 22 | 5 | Mail_Main | 71 | 17 |
| Mail_RightPanel | 40 | 8 | Mail_Explain_Popup | 7 | 1 |
| Notice_Main_PC | 63 | 29 | Notice_List_Item | 13 | 0 |

## 三、前序会话已有产出（5 个 WBP，另见 `布局坐标\UI布局坐标表.md`）

| WBP | 系统 | 坐标表小节 | layout JSON |
|---|---|---|---|
| WBP_Reward_NewClothes | SysReward（单件衣服展示） | UI布局坐标表.md §WBP_Reward_NewClothes | `素材\抽卡奖励界面\_layout_wbp\layout_NewClothes.json` |
| WBP_SuitCollect_Main_PC | SysReward（套装收集） | §WBP_SuitCollect_Main_PC | layout_SuitCollect.json |
| WBP_Resonance_Main | SysResonance（共鸣主界面） | §WBP_Resonance_Main | layout_ResonanceMain.json |
| WBP_Resonance_Bouns_Main | SysResonance（奖励轨道） | §WBP_Resonance_Bouns_Main | layout_BonusMain.json |
| WBP_Resonance_RewarPanel_PC_V2 | SysResonance（奖励面板 V2） | §WBP_Resonance_RewarPanel_PC_V2 | layout_RewardPanelV2.json |

## 四、坐标换算说明

UMG CanvasPanelSlot 布局由三部分决定（md 表中为原始数据）：

1. **Anchors（锚点）**：归一化 0~1 的 Min/Max 两个点，相对父容器尺寸。
2. **Offsets（偏移）**：像素 Left/Top/Right/Bottom，叠加在锚点上。
3. **Alignment（对齐）**：归一化，表示控件自身对齐点（0,0 左上 / 0.5,0.5 中心 / 1,1 右下）。

换算公式（W=1920、H=1080，已在各分表完成）：

```
rawW = Right-Left + (MaxX-MinX)×W
rawH = Bottom-Top + (MaxY-MinY)×H
x0 = MinX×W + Left - rawW×AlignX ; y0 = MinY×H + Top - rawH×AlignY
x1 = x0 + rawW ; y1 = y0 + rawH
```

字段缺失默认值：Anchors 视作 Min(0,0) Max(0,0)；Alignment 视作 (0,0)；Offsets 缺失字段视作 0。完全无 layout 的节点无坐标数据。

## 五、模拟器 1:1 还原重点索引（供抽卡模拟器优化引用）

| 还原目标 | 首选坐标来源 | 补充来源 |
|---|---|---|
| 共鸣主界面元素（货币栏/艺术字/深海回响入口/共鸣按钮/退出/卡池缩略图/套装卡） | UI布局坐标表.md §WBP_Resonance_Main（108 节点） | layout_Resonance_Main_New.json、layout_Resonance_Btn_Mall.json、layout_Resonance_Wants_Btn.json、layout_Resonance_Tab.json、layout_Resonance_TabItem_PX.json、layout_Resonance_FullScreenPanel.json |
| 十连/单抽结果面板（5×2 卡位、结果卡片、新装标记、标题装饰） | UI布局坐标表.md §WBP_Resonance_RewarPanel_PC_V2（63 节点） | layout_Resonance_RewardItem_PC_V2.json（23 图）、layout_Resonance_ExtraReward_Item.json（6 图）、layout_Resonance_Bonus_List.json、layout_Resonance_Bonus_Item.json（17 图） |
| 单件衣服展示 | UI布局坐标表.md §WBP_Reward_NewClothes（215 节点） | layout_Resonance_Main_SuitInfo_V2.json（13 图） |
| 通用按钮（关闭/确认/取消/次级/小按钮/返回/分页） | Common通用弹窗与按钮.md §WBP_Common_Button_* 各节 | 对应 layout_Common_Button_*.json |
| 通用弹窗与遮罩（窗口背景/黑屏遮罩/点击关闭提示/消息框） | Common通用弹窗与按钮.md §WBP_Common_Wnd_Bg_L / Wnd_Bg_S / BlackScreen_Mask / ClickClose_Tip | layout_Common_Wnd_Bg_L.json、layout_Common_MessageBox_Wnd.json |
| 设置页 | SysSettings设置.md §WBP_Setting_Main（12 图）及各 OptionItem 节 | layout_Setting_OptionItem_*.json |

> 注：坐标表中「素材资源路径」为游戏内资产路径（/Game/UI/...），模拟器对应素材已在 `public/assets/` 归集，两者按名称对应使用。
