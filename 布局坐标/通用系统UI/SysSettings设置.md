# 《无限暖暖》SysSettings 设置界面 UI 布局坐标表

> 数据来源：游戏解包 .uasset（UMG WidgetBlueprint），经 CUE4Parse + usmap 反射反序列化 WidgetTree 获得（工具 WbpLayoutDump）。

> 坐标系：以 1920×1080 为设计分辨率。坐标为绝对像素 (x0,y0,x1,y1,宽,高)，x0,y0 为左上角，x1,y1 为右下角。负值/超出屏幕表示元素延伸到屏幕外（游戏内正常现象）。

> zorder 表示同父级下的叠放顺序（越小越靠底）。未列出的元素 zorder 默认 0。

> 说明：此表为 UI 树中带贴图/材质的 Image 类节点；TextBlock、布局容器等未贴图节点不在表中。Anchors/Offsets/Alignment 为 UMG 原始值（保留 3 位小数），x0/y0/x1/y1 与宽×高为换算后像素（保留 1 位小数）。

## WBP_Setting_Main（设置主界面）

> 源文件：`X6Game/Content/UI/SysSettings/PC/WBP_Setting_Main.uasset`　|　WidgetTree 节点数：51

| 层级路径 | 类名 | 素材 | 素材资源路径 | zorder | Anchors | Offsets | Alignment | x0,y0 | x1,y1 | 宽×高 |
|---|---|---|---|---|---|---|---|---|---|---|
| /CanvasPanel_5/BG/Image_462 | Image | T_UI_common_bg_01 | /Game/UI/Common/Textures/T_UI_common_bg_01.T_UI_common_bg_01 |  | Min(0.000,0.000) Max(1.000,1.000) | L:-24.000 T:-11.000 R:-25.800 B:-5.700 | X:0.000 Y:0.000 | -24.0, -11.0 | 1894.2, 1074.3 | 1918.2×1085.3 |
| /CanvasPanel_5/BG/Image_183 | Image | T_UI_Settings_img_pattern02_PNG | /Game/__ExternalPaper2dAtlas__/SaveAtlas/UI/SysSettings/Texture/__Frames/T_UI_Settings_img_pattern02_PNG.T_UI_Settings_img_pattern02_PNG |  | Min(0.000,1.000) Max(0.000,1.000) | L:-0.500 T:0.000 R:22.500 B:92.000 | X:0.000 Y:1.000 | -0.5, 988.0 | 22.5, 1080.0 | 23.0×92.0 |
| /CanvasPanel_5/BG/Image | Image | T_UI_Settings_img_pattern01 | /Game/UI/SysSettings/Texture/T_UI_Settings_img_pattern01.T_UI_Settings_img_pattern01 |  | Min(1.000,0.000) Max(1.000,0.000) | L:0.000 T:0.000 R:0.000 B:92.000 | X:1.000 Y:0.000 | 1920.0, 0.0 | 1920.0, 92.0 | 0.0×92.0 |
| /CanvasPanel_5/BG/Fx_Img_Deco_1 | Image | MI_UI_Task_Mask_02 | /Game/UI/SysTask/Material/MI_UI_Task_Mask_02.MI_UI_Task_Mask_02 |  | Min(0.000,0.000) Max(0.000,0.000) | L:-242.000 T:-124.000 R:1072.000 B:856.000 | X:0.000 Y:0.000 | -242.0, -124.0 | 1072.0, 856.0 | 1314.0×980.0 |
| /CanvasPanel_5/BG/Fx_Img_Deco | Image | MI_UI_Task_Mask_01 | /Game/UI/SysTask/Material/MI_UI_Task_Mask_01.MI_UI_Task_Mask_01 |  | Min(0.000,0.000) Max(0.000,0.000) | L:-242.000 T:-124.000 R:1072.000 B:856.000 | X:0.000 Y:0.000 | -242.0, -124.0 | 1072.0, 856.0 | 1314.0×980.0 |
| /CanvasPanel_5/BG/Img_Deco | Image | T_UI_common_img_pattern_01 | /Game/UI/Common/Textures/T_UI_common_img_pattern_01.T_UI_common_img_pattern_01 |  | Min(0.000,0.000) Max(0.000,0.000) | L:-242.000 T:-124.000 R:1940.000 B:1100.000 | X:0.000 Y:0.000 | -242.0, -124.0 | 1940.0, 1100.0 | 2182.0×1224.0 |
| /CanvasPanel_5/MainPanel/VerticalBox_1/CP_Load/HorizontalBox_0/Image_290 | Image | T_UI_Settings_point_01_PNG | /Game/__ExternalPaper2dAtlas__/SaveAtlas/UI/SysSettings/Texture/GraphicLoad/__Frames/T_UI_Settings_point_01_PNG.T_UI_Settings_point_01_PNG |  | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 0.0, 0.0 | 0.0×0.0 |
| /CanvasPanel_5/MainPanel/VerticalBox_1/CP_Load/HorizontalBox_0/Image_1 | Image | T_UI_Settings_point_02_PNG | /Game/__ExternalPaper2dAtlas__/SaveAtlas/UI/SysSettings/Texture/GraphicLoad/__Frames/T_UI_Settings_point_02_PNG.T_UI_Settings_point_02_PNG |  | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 0.0, 0.0 | 0.0×0.0 |
| /CanvasPanel_5/MainPanel/VerticalBox_1/CP_Load/Image_line | Image | T_UI_task_img_line_01_PNG | /Game/__ExternalPaper2dAtlas__/SaveAtlas/UI/SysTask/Textures/__Frames/T_UI_task_img_line_01_PNG.T_UI_task_img_line_01_PNG |  | Min(0.000,1.000) Max(1.000,1.000) | L:60.000 T:18.000 R:4.000 B:0.000 | X:0.000 Y:0.500 | 60.0, 1107.0 | 1924.0, 1089.0 | 1864.0×-18.0 |
| /CanvasPanel_5/MainPanel/VerticalBox_1/CP_Load/CP_LoadBar/Image_124 | Image | T_UI_Settings_loadbar_01_PNG | /Game/__ExternalPaper2dAtlas__/SaveAtlas/UI/SysSettings/Texture/GraphicLoad/__Frames/T_UI_Settings_loadbar_01_PNG.T_UI_Settings_loadbar_01_PNG |  | Min(0.000,0.000) Max(1.000,1.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 1920.0, 1080.0 | 1920.0×1080.0 |
| /CanvasPanel_5/MainPanel/VerticalBox_1/CP_Load/CP_LoadBar/Image_WarningPoint | Image | T_UI_Settings_warningvalue_PNG | /Game/__ExternalPaper2dAtlas__/SaveAtlas/UI/SysSettings/Texture/GraphicLoad/__Frames/T_UI_Settings_warningvalue_PNG.T_UI_Settings_warningvalue_PNG |  | Min(0.000,0.500) Max(0.000,0.500) | L:942.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.500 | 942.0, 540.0 | 0.0, 540.0 | -942.0×0.0 |
| /CanvasPanel_5/MainPanel/Option/Image_695 | Image | T_UI_evolution_img_textbase_01 | /Game/UI/SysEvolution/Textures/T_UI_evolution_img_textbase_01.T_UI_evolution_img_textbase_01 |  | Min(0.500,0.500) Max(0.500,0.500) | L:-83.808 T:44.217 R:126.308 B:-60.769 | X:0.000 Y:0.000 | 876.2, 584.2 | 1086.3, 479.2 | 210.1×-105.0 |

> 共 12 个带贴图 Image 节点。

## WBP_SysSettings_RedemptionCode_Wnd（兑换码窗口）

> 源文件：`X6Game/Content/UI/SysSettings/PC/WBP_SysSettings_RedemptionCode_Wnd.uasset`　|　WidgetTree 节点数：14

| 层级路径 | 类名 | 素材 | 素材资源路径 | zorder | Anchors | Offsets | Alignment | x0,y0 | x1,y1 | 宽×高 |
|---|---|---|---|---|---|---|---|---|---|---|
| /CanvasPanel_18/Img_Mask | Image |  |  |  | Min(0.000,0.000) Max(1.000,1.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 1920.0, 1080.0 | 1920.0×1080.0 |
| /CanvasPanel_18/CanvasPanel_26/Content/ScaleBox_3/SearchPanel/Img_Search_Bg_H | Image | T_UI_common_img_inputbox_01_h | /Game/UI/Common/Textures/T_UI_common_img_inputbox_01_h.T_UI_common_img_inputbox_01_h |  | Min(0.500,0.500) Max(0.500,0.500) | L:0.000 T:0.000 R:690.000 B:92.000 | X:0.500 Y:0.500 | 615.0, 494.0 | 1305.0, 586.0 | 690.0×92.0 |

> 共 2 个带贴图 Image 节点。

## WBP_Setting_Tooltip（设置提示气泡）

> 源文件：`X6Game/Content/UI/SysSettings/PC/WBP_Setting_Tooltip.uasset`　|　WidgetTree 节点数：16

| 层级路径 | 类名 | 素材 | 素材资源路径 | zorder | Anchors | Offsets | Alignment | x0,y0 | x1,y1 | 宽×高 |
|---|---|---|---|---|---|---|---|---|---|---|
| /CanvasPanel_1/PanelRoot/Tooltip_BG | Image | T_UI_Settings_bg_tips_01 | /Game/UI/SysSettings/Texture/T_UI_Settings_bg_tips_01.T_UI_Settings_bg_tips_01 |  | Min(0.000,0.000) Max(1.000,1.000) | L:0.000 T:-20.000 R:0.000 B:-48.000 | X:0.000 Y:0.000 | 0.0, -20.0 | 1920.0, 1032.0 | 1920.0×1052.0 |
| /CanvasPanel_1/PanelRoot/VerticalBox_133/Tooltip_Label/Image_227 | Image | T_UI_Settings_bg_tips_03 | /Game/UI/SysSettings/Texture/T_UI_Settings_bg_tips_03.T_UI_Settings_bg_tips_03 |  | Min(0.000,0.000) Max(0.000,0.000) | L:-2.500 T:8.000 R:98.500 B:27.000 | X:1.000 Y:0.000 | -103.5, 8.0 | -2.5, 27.0 | 101.0×19.0 |
| /CanvasPanel_1/PanelRoot/VerticalBox_133/PanelSubInfo/Image_468 | Image | T_UI_Settings_bg_tips_02 | /Game/UI/SysSettings/Texture/T_UI_Settings_bg_tips_02.T_UI_Settings_bg_tips_02 |  | Min(0.000,0.000) Max(0.000,0.000) | L:-34.000 T:0.000 R:10.000 B:4.000 | X:0.000 Y:0.000 | -34.0, 0.0 | 10.0, 4.0 | 44.0×4.0 |
| /CanvasPanel_1/PanelRoot/VerticalBox_133/PanelSubInfo/Image_469 | Image | T_UI_Effect_PlaceName_diamond | /Game/UI/Common/Textures/T_UI_Effect_PlaceName_diamond.T_UI_Effect_PlaceName_diamond |  | Min(0.000,0.000) Max(0.000,0.000) | L:-22.000 T:12.000 R:10.000 B:4.000 | X:0.000 Y:0.000 | -22.0, 12.0 | 10.0, 4.0 | 32.0×-8.0 |
| /CanvasPanel_1/PanelRoot/VerticalBox_133/PanelSubInfo/ScaleBox_1/ImageShow | Image |  |  |  | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 0.0, 0.0 | 0.0×0.0 |

> 共 5 个带贴图 Image 节点。

## WBP_Setting_OptionItem_Key（按键选项项）

> 源文件：`X6Game/Content/UI/SysSettings/PC/WBP_Setting_OptionItem_Key.uasset`　|　WidgetTree 节点数：27

| 层级路径 | 类名 | 素材 | 素材资源路径 | zorder | Anchors | Offsets | Alignment | x0,y0 | x1,y1 | 宽×高 |
|---|---|---|---|---|---|---|---|---|---|---|
| /CanvasPanel_1/Normal/Image_0 | Image | T_UI_Settings_bg_option_01_PNG | /Game/__ExternalPaper2dAtlas__/SaveAtlas/UI/SysSettings/Texture/__Frames/T_UI_Settings_bg_option_01_PNG.T_UI_Settings_bg_option_01_PNG |  | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 0.0, 0.0 | 0.0×0.0 |
| /CanvasPanel_1/Normal/Image_1 | Image | T_UI_Settings_bg_keyset_n | /Game/UI/SysSettings/Texture/T_UI_Settings_bg_keyset_n.T_UI_Settings_bg_keyset_n |  | Min(1.000,0.500) Max(1.000,0.500) | L:3.000 T:-2.500 R:100.600 B:45.000 | X:1.000 Y:0.500 | 1825.4, 513.8 | 1923.0, 561.2 | 97.6×47.5 |
| /CanvasPanel_1/hover/Image | Image | T_UI_Settings_bg_option_01_h_PNG | /Game/__ExternalPaper2dAtlas__/SaveAtlas/UI/SysSettings/Texture/__Frames/T_UI_Settings_bg_option_01_h_PNG.T_UI_Settings_bg_option_01_h_PNG |  | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 0.0, 0.0 | 0.0×0.0 |
| /CanvasPanel_1/hover/Image_2 | Image | T_UI_Settings_bg_keyset_h | /Game/UI/SysSettings/Texture/T_UI_Settings_bg_keyset_h.T_UI_Settings_bg_keyset_h |  | Min(1.000,0.500) Max(1.000,0.500) | L:3.000 T:-2.500 R:100.600 B:45.000 | X:1.000 Y:0.500 | 1825.4, 513.8 | 1923.0, 561.2 | 97.6×47.5 |
| /CanvasPanel_1/Switcher_Key/Icon_Key | Image | T_UI_KeyTips_Space | /Game/UI/Common/Textures/T_UI_KeyTips_Space.T_UI_KeyTips_Space |  | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 0.0, 0.0 | 0.0×0.0 |
| /CanvasPanel_1/Switcher_Key/Empty | Image | T_UI_Settings_bg_keyset_warning | /Game/UI/SysSettings/Texture/T_UI_Settings_bg_keyset_warning.T_UI_Settings_bg_keyset_warning |  | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 0.0, 0.0 | 0.0×0.0 |
| /CanvasPanel_1/Restored/Img_Restored | Image | T_UI_Settings_bg_keyset_replace_PNG | /Game/__ExternalPaper2dAtlas__/SaveAtlas/UI/SysSettings/Texture/__Frames/T_UI_Settings_bg_keyset_replace_PNG.T_UI_Settings_bg_keyset_replace_PNG |  | Min(1.000,0.500) Max(1.000,0.500) | L:4.000 T:-3.000 R:0.000 B:0.000 | X:1.000 Y:0.500 | 1928.0, 535.5 | 1924.0, 538.5 | -4.0×3.0 |
| /CanvasPanel_1/Select/Image_3 | Image | T_UI_Settings_bg_option_01_h_PNG | /Game/__ExternalPaper2dAtlas__/SaveAtlas/UI/SysSettings/Texture/__Frames/T_UI_Settings_bg_option_01_h_PNG.T_UI_Settings_bg_option_01_h_PNG |  | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 0.0, 0.0 | 0.0×0.0 |
| /CanvasPanel_1/Select/Image_4 | Image | T_UI_Settings_bg_keyset_s | /Game/UI/SysSettings/Texture/T_UI_Settings_bg_keyset_s.T_UI_Settings_bg_keyset_s |  | Min(1.000,0.500) Max(1.000,0.500) | L:3.000 T:-2.500 R:100.600 B:45.000 | X:1.000 Y:0.500 | 1825.4, 513.8 | 1923.0, 561.2 | 97.6×47.5 |
| /CanvasPanel_1/Disable/Image_5 | Image | T_UI_Settings_bg_option_01_s_PNG | /Game/__ExternalPaper2dAtlas__/SaveAtlas/UI/SysSettings/Texture/__Frames/T_UI_Settings_bg_option_01_s_PNG.T_UI_Settings_bg_option_01_s_PNG |  | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 0.0, 0.0 | 0.0×0.0 |
| /CanvasPanel_1/Disable/Image_7 | Image | T_UI_Settings_bg_keyset01_n_PNG | /Game/__ExternalPaper2dAtlas__/SaveAtlas/UI/SysSettings/Texture/__Frames/T_UI_Settings_bg_keyset01_n_PNG.T_UI_Settings_bg_keyset01_n_PNG |  | Min(1.000,0.500) Max(1.000,0.500) | L:3.000 T:-2.500 R:100.600 B:45.000 | X:1.000 Y:0.500 | 1825.4, 513.8 | 1923.0, 561.2 | 97.6×47.5 |

> 共 11 个带贴图 Image 节点。

## WBP_Setting_KeyList（按键列表）

> 源文件：`X6Game/Content/UI/SysSettings/PC/WBP_Setting_KeyList.uasset`　|　WidgetTree 节点数：6

| 层级路径 | 类名 | 素材 | 素材资源路径 | zorder | Anchors | Offsets | Alignment | x0,y0 | x1,y1 | 宽×高 |
|---|---|---|---|---|---|---|---|---|---|---|
| /CanvasPanel_0/Title/Image_366 | Image | T_UI_Settings_bg_title | /Game/UI/SysSettings/Texture/T_UI_Settings_bg_title.T_UI_Settings_bg_title |  | Min(0.000,0.000) Max(0.000,0.000) | L:10.929 T:6.071 R:113.071 B:41.929 | X:0.000 Y:0.000 | 10.9, 6.1 | 113.1, 41.9 | 102.1×35.9 |
| /CanvasPanel_0/Title/Image_367 | Image | T_UI_Settings_img_titledec | /Game/UI/SysSettings/Texture/T_UI_Settings_img_titledec.T_UI_Settings_img_titledec |  | Min(0.000,0.000) Max(0.000,0.000) | L:34.786 T:17.000 R:97.214 B:43.000 | X:0.000 Y:0.000 | 34.8, 17.0 | 97.2, 43.0 | 62.4×26.0 |

> 共 2 个带贴图 Image 节点。

## WBP_Setting_KeyPanel（按键面板）

> 源文件：`X6Game/Content/UI/SysSettings/PC/WBP_Setting_KeyPanel.uasset`　|　WidgetTree 节点数：10

| 层级路径 | 类名 | 素材 | 素材资源路径 | zorder | Anchors | Offsets | Alignment | x0,y0 | x1,y1 | 宽×高 |
|---|---|---|---|---|---|---|---|---|---|---|
| /CanvasPanel_5/KeyPanel/RetainerBox_0/ScrollBox_198/Image_324 | Image |  |  |  | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 0.0, 0.0 | 0.0×0.0 |
| /CanvasPanel_5/KeyPanel/RetainerBox_0/ScrollBox_198/Image_1 | Image |  |  |  | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 0.0, 0.0 | 0.0×0.0 |

> 共 2 个带贴图 Image 节点。

## WBP_Setting_HandlePanel（手柄面板）

> 源文件：`X6Game/Content/UI/SysSettings/PC/WBP_Setting_HandlePanel.uasset`　|　WidgetTree 节点数：21

| 层级路径 | 类名 | 素材 | 素材资源路径 | zorder | Anchors | Offsets | Alignment | x0,y0 | x1,y1 | 宽×高 |
|---|---|---|---|---|---|---|---|---|---|---|
| /CanvasPanel_5/HandlePanel/HandleImage | Image | T_UI_control_img_ps5_gamepad | /Game/UI/SysSettings/Texture/handle/T_UI_control_img_ps5_gamepad.T_UI_control_img_ps5_gamepad |  | Min(0.500,0.500) Max(0.500,0.500) | L:0.000 T:14.000 R:48.057 B:40.086 | X:0.500 Y:0.500 | 936.0, 541.0 | 984.0, 567.0 | 48.1×26.1 |

> 共 1 个带贴图 Image 节点。

## WBP_SysSettings_Display_Wnd_PC（显示窗口PC）

> 源文件：`X6Game/Content/UI/SysSettings/PC/WBP_SysSettings_Display_Wnd_PC.uasset`　|　WidgetTree 节点数：12

| 层级路径 | 类名 | 素材 | 素材资源路径 | zorder | Anchors | Offsets | Alignment | x0,y0 | x1,y1 | 宽×高 |
|---|---|---|---|---|---|---|---|---|---|---|
| /CanvasPanel_18/Img_Mask | Image |  |  |  | Min(0.000,0.000) Max(1.000,1.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 1920.0, 1080.0 | 1920.0×1080.0 |

> 共 1 个带贴图 Image 节点。

## WBP_Setting_KeyAdjust_Wnd（按键调整窗口）

> 源文件：`X6Game/Content/UI/SysSettings/PC/WBP_Setting_KeyAdjust_Wnd.uasset`　|　WidgetTree 节点数：10

| 层级路径 | 类名 | 素材 | 素材资源路径 | zorder | Anchors | Offsets | Alignment | x0,y0 | x1,y1 | 宽×高 |
|---|---|---|---|---|---|---|---|---|---|---|

> 共 0 个带贴图 Image 节点。

## WBP_LogUpload（日志上传）

> 源文件：`X6Game/Content/UI/SysSettings/PC/WBP_LogUpload.uasset`　|　WidgetTree 节点数：20

| 层级路径 | 类名 | 素材 | 素材资源路径 | zorder | Anchors | Offsets | Alignment | x0,y0 | x1,y1 | 宽×高 |
|---|---|---|---|---|---|---|---|---|---|---|
| /CanvasPanel_18/Img_Mask | Image |  |  |  | Min(0.000,0.000) Max(1.000,1.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 1920.0, 1080.0 | 1920.0×1080.0 |
| /CanvasPanel_18/CanvasPanel_2/CanvasPanel_3/VerticalBox_1/PanelProgress/ProgressBg_Img_1 | Image | T_UI_login_slider_empty | /PaperLuaFramework/HotUpdate/HotUpdateLevel/Textures/T_UI_login_slider_empty.T_UI_login_slider_empty |  | Min(0.500,0.500) Max(0.500,0.500) | L:-5.180 T:0.000 R:451.641 B:24.000 | X:0.500 Y:0.500 | 726.4, 528.0 | 1183.2, 552.0 | 456.8×24.0 |
| /CanvasPanel_18/CanvasPanel_2/CanvasPanel_3/VerticalBox_1/PanelProgress/CanvasPanel_276/Deco_Img | Image | T_UI_login_img_dec_01 | /PaperLuaFramework/HotUpdate/HotUpdateLevel/Textures/T_UI_login_img_dec_01.T_UI_login_img_dec_01 |  | Min(0.000,0.000) Max(0.000,0.000) | L:-140.602 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | -140.6, 0.0 | 0.0, 0.0 | 140.6×0.0 |
| /CanvasPanel_18/CanvasPanel_2/CanvasPanel_3/VerticalBox_1/PanelProgress/CanvasPanel_276/Deco_Img_1 | Image | T_UI_login_img_dec_01 | /PaperLuaFramework/HotUpdate/HotUpdateLevel/Textures/T_UI_login_img_dec_01.T_UI_login_img_dec_01 | 1 | Min(1.000,0.500) Max(1.000,0.500) | L:12.689 T:0.000 R:249.019 B:23.000 | X:0.500 Y:0.500 | 1814.5, 528.5 | 2050.9, 551.5 | 236.3×23.0 |

> 共 4 个带贴图 Image 节点。

## WBP_Setting_OptionItem_Button（按钮选项项）

> 源文件：`X6Game/Content/UI/SysSettings/PC/WBP_Setting_OptionItem_Button.uasset`　|　WidgetTree 节点数：20

| 层级路径 | 类名 | 素材 | 素材资源路径 | zorder | Anchors | Offsets | Alignment | x0,y0 | x1,y1 | 宽×高 |
|---|---|---|---|---|---|---|---|---|---|---|
| /CanvasPanel_1/Normal/Image_3 | Image | T_UI_Settings_bg_option_01_PNG | /Game/__ExternalPaper2dAtlas__/SaveAtlas/UI/SysSettings/Texture/__Frames/T_UI_Settings_bg_option_01_PNG.T_UI_Settings_bg_option_01_PNG |  | Min(0.000,0.000) Max(0.000,0.000) | L:11.438 T:4.125 R:1203.312 B:56.000 | X:0.000 Y:0.000 | 11.4, 4.1 | 1203.3, 56.0 | 1191.9×51.9 |
| /CanvasPanel_1/Hover/Image_1 | Image | T_UI_Settings_bg_option_01_h_PNG | /Game/__ExternalPaper2dAtlas__/SaveAtlas/UI/SysSettings/Texture/__Frames/T_UI_Settings_bg_option_01_h_PNG.T_UI_Settings_bg_option_01_h_PNG |  | Min(0.000,0.000) Max(0.000,0.000) | L:11.438 T:4.125 R:1203.312 B:56.000 | X:0.000 Y:0.000 | 11.4, 4.1 | 1203.3, 56.0 | 1191.9×51.9 |
| /CanvasPanel_1/CanvasPanel_108/Btn_N | Image | T_UI_Settings_btn_goto_n | /Game/UI/SysSettings/Texture/T_UI_Settings_btn_goto_n.T_UI_Settings_btn_goto_n |  | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 0.0, 0.0 | 0.0×0.0 |
| /CanvasPanel_1/CanvasPanel_108/Btn_H | Image | T_UI_Settings_btn_goto_h | /Game/UI/SysSettings/Texture/T_UI_Settings_btn_goto_h.T_UI_Settings_btn_goto_h |  | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 0.0, 0.0 | 0.0×0.0 |
| /CanvasPanel_1/CanvasPanel_108/HorizontalBox_0/Image_64 | Image | T_UI_Settings_img_arrow_01 | /Game/UI/SysSettings/Texture/T_UI_Settings_img_arrow_01.T_UI_Settings_img_arrow_01 |  | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 0.0, 0.0 | 0.0×0.0 |

> 共 5 个带贴图 Image 节点。

## WBP_SysSettings_LightAdjust_PC（亮度调整PC）

> 源文件：`X6Game/Content/UI/SysSettings/PC/WBP_SysSettings_LightAdjust_PC.uasset`　|　WidgetTree 节点数：10

| 层级路径 | 类名 | 素材 | 素材资源路径 | zorder | Anchors | Offsets | Alignment | x0,y0 | x1,y1 | 宽×高 |
|---|---|---|---|---|---|---|---|---|---|---|
| /CanvasPanel_17/BG/Image_1 | Image | T_UI_common_bg_01 | /Game/UI/Common/Textures/T_UI_common_bg_01.T_UI_common_bg_01 |  | Min(0.000,0.000) Max(1.000,1.000) | L:-24.000 T:-11.000 R:-25.800 B:-5.700 | X:0.000 Y:0.000 | -24.0, -11.0 | 1894.2, 1074.3 | 1918.2×1085.3 |
| /CanvasPanel_17/BG/Image_2 | Image | T_UI_Settings_img_pattern02_PNG | /Game/__ExternalPaper2dAtlas__/SaveAtlas/UI/SysSettings/Texture/__Frames/T_UI_Settings_img_pattern02_PNG.T_UI_Settings_img_pattern02_PNG |  | Min(0.000,1.000) Max(0.000,1.000) | L:-0.500 T:0.000 R:22.500 B:92.000 | X:0.000 Y:1.000 | -0.5, 988.0 | 22.5, 1080.0 | 23.0×92.0 |
| /CanvasPanel_17/BG/Image_3 | Image | T_UI_Settings_img_pattern01 | /Game/UI/SysSettings/Texture/T_UI_Settings_img_pattern01.T_UI_Settings_img_pattern01 |  | Min(1.000,0.000) Max(1.000,0.000) | L:0.000 T:0.000 R:0.000 B:92.000 | X:1.000 Y:0.000 | 1920.0, 0.0 | 1920.0, 92.0 | 0.0×92.0 |

> 共 3 个带贴图 Image 节点。

## WBP_Setting_OptionItem_Switch（开关选项项）

> 源文件：`X6Game/Content/UI/SysSettings/PC/WBP_Setting_OptionItem_Switch.uasset`　|　WidgetTree 节点数：30

| 层级路径 | 类名 | 素材 | 素材资源路径 | zorder | Anchors | Offsets | Alignment | x0,y0 | x1,y1 | 宽×高 |
|---|---|---|---|---|---|---|---|---|---|---|
| /CanvasPanel_1/Normal/Image_3 | Image | T_UI_Settings_bg_option_01_PNG | /Game/__ExternalPaper2dAtlas__/SaveAtlas/UI/SysSettings/Texture/__Frames/T_UI_Settings_bg_option_01_PNG.T_UI_Settings_bg_option_01_PNG |  | Min(0.000,0.000) Max(0.000,0.000) | L:11.438 T:4.125 R:1203.312 B:56.000 | X:0.000 Y:0.000 | 11.4, 4.1 | 1203.3, 56.0 | 1191.9×51.9 |
| /CanvasPanel_1/Hover/Image_1 | Image | T_UI_Settings_bg_option_01_h_PNG | /Game/__ExternalPaper2dAtlas__/SaveAtlas/UI/SysSettings/Texture/__Frames/T_UI_Settings_bg_option_01_h_PNG.T_UI_Settings_bg_option_01_h_PNG |  | Min(0.000,0.000) Max(0.000,0.000) | L:11.438 T:4.125 R:1203.312 B:56.000 | X:0.000 Y:0.000 | 11.4, 4.1 | 1203.3, 56.0 | 1191.9×51.9 |
| /CanvasPanel_1/Switch_OnOff/PanelOn/dark_right_n | Image | T_UI_Settings_btn_toggle_right_off | /Game/UI/SysSettings/Texture/T_UI_Settings_btn_toggle_right_off.T_UI_Settings_btn_toggle_right_off |  | Min(0.000,0.000) Max(0.000,0.000) | L:347.325 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 347.3, 0.0 | 0.0, 0.0 | -347.3×0.0 |
| /CanvasPanel_1/Switch_OnOff/PanelOn/dark_right_h | Image | T_UI_Settings_btn_toggle_rightoff_h_PNG | /Game/__ExternalPaper2dAtlas__/SaveAtlas/UI/SysSettings/Texture/__Frames/T_UI_Settings_btn_toggle_rightoff_h_PNG.T_UI_Settings_btn_toggle_rightoff_h_PNG |  | Min(0.000,0.000) Max(0.000,0.000) | L:347.325 T:0.000 R:-130.833 B:-120.667 | X:0.000 Y:0.000 | 347.3, 0.0 | -130.8, -120.7 | -478.2×-120.7 |
| /CanvasPanel_1/Switch_OnOff/PanelOn/light_left_n | Image | T_UI_Settings_btn_toggle_right_on_PNG | /Game/__ExternalPaper2dAtlas__/SaveAtlas/UI/SysSettings/Texture/__Frames/T_UI_Settings_btn_toggle_right_on_PNG.T_UI_Settings_btn_toggle_right_on_PNG | 1 | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 0.0, 0.0 | 0.0×0.0 |
| /CanvasPanel_1/Switch_OnOff/PanelOn/light_left_h | Image | T_UI_Settings_btn_toggle_left_hovering | /Game/UI/SysSettings/Texture/T_UI_Settings_btn_toggle_left_hovering.T_UI_Settings_btn_toggle_left_hovering | 1 | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:0.000 R:-125.333 B:-120.667 | X:0.000 Y:0.000 | 0.0, 0.0 | -125.3, -120.7 | -125.3×-120.7 |
| /CanvasPanel_1/Switch_OnOff/PanelOff/dark_left_n | Image | T_UI_Settings_btn_toggle_left_off | /Game/UI/SysSettings/Texture/T_UI_Settings_btn_toggle_left_off.T_UI_Settings_btn_toggle_left_off |  | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:0.000 R:-125.333 B:-120.667 | X:0.000 Y:0.000 | 0.0, 0.0 | -125.3, -120.7 | -125.3×-120.7 |
| /CanvasPanel_1/Switch_OnOff/PanelOff/dark_left_h | Image | T_UI_Settings_btn_toggle_leftoff_h_PNG | /Game/__ExternalPaper2dAtlas__/SaveAtlas/UI/SysSettings/Texture/__Frames/T_UI_Settings_btn_toggle_leftoff_h_PNG.T_UI_Settings_btn_toggle_leftoff_h_PNG | 1 | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:0.000 R:-125.333 B:-120.667 | X:0.000 Y:0.000 | 0.0, 0.0 | -125.3, -120.7 | -125.3×-120.7 |
| /CanvasPanel_1/Switch_OnOff/PanelOff/light_right_n | Image | T_UI_Settings_btn_toggle_right_on_PNG | /Game/__ExternalPaper2dAtlas__/SaveAtlas/UI/SysSettings/Texture/__Frames/T_UI_Settings_btn_toggle_right_on_PNG.T_UI_Settings_btn_toggle_right_on_PNG | 1 | Min(0.000,0.000) Max(0.000,0.000) | L:348.468 T:0.000 R:-131.476 B:-120.667 | X:0.000 Y:0.000 | 348.5, 0.0 | -131.5, -120.7 | -479.9×-120.7 |
| /CanvasPanel_1/Switch_OnOff/PanelOff/light_right_h | Image | T_UI_Settings_btn_toggle_left_hovering | /Game/UI/SysSettings/Texture/T_UI_Settings_btn_toggle_left_hovering.T_UI_Settings_btn_toggle_left_hovering |  | Min(0.000,0.000) Max(0.000,0.000) | L:348.468 T:0.000 R:-130.833 B:-120.667 | X:0.000 Y:0.000 | 348.5, 0.0 | -130.8, -120.7 | -479.3×-120.7 |

> 共 10 个带贴图 Image 节点。

## WBP_Setting_OptionItem_Change（切换选项项）

> 源文件：`X6Game/Content/UI/SysSettings/PC/WBP_Setting_OptionItem_Change.uasset`　|　WidgetTree 节点数：23

| 层级路径 | 类名 | 素材 | 素材资源路径 | zorder | Anchors | Offsets | Alignment | x0,y0 | x1,y1 | 宽×高 |
|---|---|---|---|---|---|---|---|---|---|---|
| /CanvasPanel_1/Normal/Image_3 | Image | T_UI_Settings_bg_option_01_PNG | /Game/__ExternalPaper2dAtlas__/SaveAtlas/UI/SysSettings/Texture/__Frames/T_UI_Settings_bg_option_01_PNG.T_UI_Settings_bg_option_01_PNG |  | Min(0.000,0.000) Max(0.000,0.000) | L:11.438 T:4.125 R:1203.312 B:56.000 | X:0.000 Y:0.000 | 11.4, 4.1 | 1203.3, 56.0 | 1191.9×51.9 |
| /CanvasPanel_1/Normal/Image_100 | Image | T_UI_Settings_bg_option_02_PNG | /Game/__ExternalPaper2dAtlas__/SaveAtlas/UI/SysSettings/Texture/__Frames/T_UI_Settings_bg_option_02_PNG.T_UI_Settings_bg_option_02_PNG |  | Min(0.000,0.000) Max(0.000,0.000) | L:511.667 T:1.667 R:-411.667 B:15.333 | X:0.000 Y:0.000 | 511.7, 1.7 | -411.7, 15.3 | -923.3×13.7 |
| /CanvasPanel_1/Normal/Image_227 | Image | T_UI_Settings_btn_switch_n_PNG | /Game/__ExternalPaper2dAtlas__/SaveAtlas/UI/SysSettings/Texture/__Frames/T_UI_Settings_btn_switch_n_PNG.T_UI_Settings_btn_switch_n_PNG |  | Min(0.000,0.000) Max(0.000,0.000) | L:510.125 T:-0.333 R:-451.458 B:21.000 | X:0.000 Y:0.000 | 510.1, -0.3 | -451.5, 21.0 | -961.6×21.3 |
| /CanvasPanel_1/Normal/Image | Image | T_UI_Settings_btn_switch_n_PNG | /Game/__ExternalPaper2dAtlas__/SaveAtlas/UI/SysSettings/Texture/__Frames/T_UI_Settings_btn_switch_n_PNG.T_UI_Settings_btn_switch_n_PNG |  | Min(0.000,0.000) Max(0.000,0.000) | L:1053.717 T:-0.333 R:-887.208 B:21.000 | X:0.000 Y:0.000 | 1053.7, -0.3 | -887.2, 21.0 | -1940.9×21.3 |
| /CanvasPanel_1/Hover/Image_1 | Image | T_UI_Settings_bg_option_01_h_PNG | /Game/__ExternalPaper2dAtlas__/SaveAtlas/UI/SysSettings/Texture/__Frames/T_UI_Settings_bg_option_01_h_PNG.T_UI_Settings_bg_option_01_h_PNG |  | Min(0.000,0.000) Max(0.000,0.000) | L:11.438 T:4.125 R:1203.312 B:56.000 | X:0.000 Y:0.000 | 11.4, 4.1 | 1203.3, 56.0 | 1191.9×51.9 |
| /CanvasPanel_1/Hover/Image_2 | Image | T_UI_Settings_bg_option_02_h_PNG | /Game/__ExternalPaper2dAtlas__/SaveAtlas/UI/SysSettings/Texture/__Frames/T_UI_Settings_bg_option_02_h_PNG.T_UI_Settings_bg_option_02_h_PNG |  | Min(0.000,0.000) Max(0.000,0.000) | L:511.667 T:1.667 R:-411.667 B:15.333 | X:0.000 Y:0.000 | 511.7, 1.7 | -411.7, 15.3 | -923.3×13.7 |
| /CanvasPanel_1/Hover/Image_4 | Image | T_UI_Settings_btn_switch_h_PNG | /Game/__ExternalPaper2dAtlas__/SaveAtlas/UI/SysSettings/Texture/__Frames/T_UI_Settings_btn_switch_h_PNG.T_UI_Settings_btn_switch_h_PNG |  | Min(0.000,0.000) Max(0.000,0.000) | L:510.125 T:-0.333 R:-451.458 B:21.000 | X:0.000 Y:0.000 | 510.1, -0.3 | -451.5, 21.0 | -961.6×21.3 |
| /CanvasPanel_1/Hover/Image_5 | Image | T_UI_Settings_btn_switch_h_PNG | /Game/__ExternalPaper2dAtlas__/SaveAtlas/UI/SysSettings/Texture/__Frames/T_UI_Settings_btn_switch_h_PNG.T_UI_Settings_btn_switch_h_PNG |  | Min(0.000,0.000) Max(0.000,0.000) | L:1053.717 T:-0.333 R:-887.208 B:21.000 | X:0.000 Y:0.000 | 1053.7, -0.3 | -887.2, 21.0 | -1940.9×21.3 |

> 共 8 个带贴图 Image 节点。

## WBP_Setting_OptionList_Item（选项列表项）

> 源文件：`X6Game/Content/UI/SysSettings/PC/WBP_Setting_OptionList_Item.uasset`　|　WidgetTree 节点数：13

| 层级路径 | 类名 | 素材 | 素材资源路径 | zorder | Anchors | Offsets | Alignment | x0,y0 | x1,y1 | 宽×高 |
|---|---|---|---|---|---|---|---|---|---|---|
| /CanvasPanel_0/CanvasPanel_58/Change_Icon | Image | T_UI_Settings_img_reddot | /Game/UI/SysSettings/Texture/T_UI_Settings_img_reddot.T_UI_Settings_img_reddot |  | Min(0.000,0.000) Max(0.000,0.000) | L:1217.667 T:19.000 R:130.333 B:27.000 | X:0.000 Y:0.000 | 1217.7, 19.0 | 130.3, 27.0 | -1087.3×8.0 |
| /CanvasPanel_0/CanvasPanel_Child/Image_SideLine | Image | T_UI_Settings_img_line_01_PNG | /Game/__ExternalPaper2dAtlas__/SaveAtlas/UI/SysSettings/Texture/GraphicLoad/__Frames/T_UI_Settings_img_line_01_PNG.T_UI_Settings_img_line_01_PNG |  | Min(0.000,0.000) Max(0.000,1.000) | L:34.000 T:-6.000 R:2.000 B:36.500 | X:0.000 Y:0.000 | 34.0, -6.0 | 2.0, 1116.5 | -32.0×1122.5 |

> 共 2 个带贴图 Image 节点。

## WBP_Setting_OptionItem_Slider（滑条选项项）

> 源文件：`X6Game/Content/UI/SysSettings/PC/WBP_Setting_OptionItem_Slider.uasset`　|　WidgetTree 节点数：24

| 层级路径 | 类名 | 素材 | 素材资源路径 | zorder | Anchors | Offsets | Alignment | x0,y0 | x1,y1 | 宽×高 |
|---|---|---|---|---|---|---|---|---|---|---|
| /CanvasPanel_1/Normal/Image_3 | Image | T_UI_Settings_bg_option_01_PNG | /Game/__ExternalPaper2dAtlas__/SaveAtlas/UI/SysSettings/Texture/__Frames/T_UI_Settings_bg_option_01_PNG.T_UI_Settings_bg_option_01_PNG |  | Min(0.000,0.000) Max(0.000,0.000) | L:11.438 T:4.125 R:1203.312 B:56.000 | X:0.000 Y:0.000 | 11.4, 4.1 | 1203.3, 56.0 | 1191.9×51.9 |
| /CanvasPanel_1/Normal/Image_100 | Image | T_UI_Settings_bg_option_02_PNG | /Game/__ExternalPaper2dAtlas__/SaveAtlas/UI/SysSettings/Texture/__Frames/T_UI_Settings_bg_option_02_PNG.T_UI_Settings_bg_option_02_PNG |  | Min(0.000,0.000) Max(0.000,0.000) | L:511.667 T:1.667 R:-411.667 B:15.333 | X:0.000 Y:0.000 | 511.7, 1.7 | -411.7, 15.3 | -923.3×13.7 |
| /CanvasPanel_1/Normal/Image_227 | Image | T_UI_Settings_btn_switch_n_PNG | /Game/__ExternalPaper2dAtlas__/SaveAtlas/UI/SysSettings/Texture/__Frames/T_UI_Settings_btn_switch_n_PNG.T_UI_Settings_btn_switch_n_PNG |  | Min(0.000,0.000) Max(0.000,0.000) | L:510.125 T:-0.333 R:-410.125 B:30.333 | X:0.000 Y:0.000 | 510.1, -0.3 | -410.1, 30.3 | -920.3×30.7 |
| /CanvasPanel_1/Normal/Image | Image | T_UI_Settings_btn_switch_n_PNG | /Game/__ExternalPaper2dAtlas__/SaveAtlas/UI/SysSettings/Texture/__Frames/T_UI_Settings_btn_switch_n_PNG.T_UI_Settings_btn_switch_n_PNG |  | Min(0.000,0.000) Max(0.000,0.000) | L:1053.717 T:-0.333 R:-794.661 B:30.333 | X:0.000 Y:0.000 | 1053.7, -0.3 | -794.7, 30.3 | -1848.4×30.7 |
| /CanvasPanel_1/Hover/Image_1 | Image | T_UI_Settings_bg_option_01_h_PNG | /Game/__ExternalPaper2dAtlas__/SaveAtlas/UI/SysSettings/Texture/__Frames/T_UI_Settings_bg_option_01_h_PNG.T_UI_Settings_bg_option_01_h_PNG |  | Min(0.000,0.000) Max(0.000,0.000) | L:11.438 T:4.125 R:1203.312 B:56.000 | X:0.000 Y:0.000 | 11.4, 4.1 | 1203.3, 56.0 | 1191.9×51.9 |
| /CanvasPanel_1/Hover/Image_2 | Image | T_UI_Settings_bg_option_02_h_PNG | /Game/__ExternalPaper2dAtlas__/SaveAtlas/UI/SysSettings/Texture/__Frames/T_UI_Settings_bg_option_02_h_PNG.T_UI_Settings_bg_option_02_h_PNG |  | Min(0.000,0.000) Max(0.000,0.000) | L:511.667 T:1.667 R:-411.667 B:15.333 | X:0.000 Y:0.000 | 511.7, 1.7 | -411.7, 15.3 | -923.3×13.7 |
| /CanvasPanel_1/Hover/Image_4 | Image | T_UI_Settings_btn_switch_h_PNG | /Game/__ExternalPaper2dAtlas__/SaveAtlas/UI/SysSettings/Texture/__Frames/T_UI_Settings_btn_switch_h_PNG.T_UI_Settings_btn_switch_h_PNG |  | Min(0.000,0.000) Max(0.000,0.000) | L:510.125 T:-0.333 R:-409.477 B:30.218 | X:0.000 Y:0.000 | 510.1, -0.3 | -409.5, 30.2 | -919.6×30.6 |
| /CanvasPanel_1/Hover/Image_5 | Image | T_UI_Settings_btn_switch_h_PNG | /Game/__ExternalPaper2dAtlas__/SaveAtlas/UI/SysSettings/Texture/__Frames/T_UI_Settings_btn_switch_h_PNG.T_UI_Settings_btn_switch_h_PNG |  | Min(0.000,0.000) Max(0.000,0.000) | L:1053.717 T:-0.333 R:-889.875 B:17.444 | X:0.000 Y:0.000 | 1053.7, -0.3 | -889.9, 17.4 | -1943.6×17.8 |

> 共 8 个带贴图 Image 节点。

## WBP_Setting_OptionNumber（选项数字）

> 源文件：`X6Game/Content/UI/SysSettings/PC/WBP_Setting_OptionNumber.uasset`　|　WidgetTree 节点数：3

| 层级路径 | 类名 | 素材 | 素材资源路径 | zorder | Anchors | Offsets | Alignment | x0,y0 | x1,y1 | 宽×高 |
|---|---|---|---|---|---|---|---|---|---|---|
| /SwitchState/Normal | Image | T_UI_common_littleCircle_img_01 | /Game/UI/Common/Textures/T_UI_common_littleCircle_img_01.T_UI_common_littleCircle_img_01 |  | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 0.0, 0.0 | 0.0×0.0 |
| /SwitchState/Select | Image | T_UI_common_littleCircle_img_01 | /Game/UI/Common/Textures/T_UI_common_littleCircle_img_01.T_UI_common_littleCircle_img_01 |  | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 0.0, 0.0 | 0.0×0.0 |

> 共 2 个带贴图 Image 节点。

## WBP_SysSettings_StarScene_PC（星幕场景PC）

> 源文件：`X6Game/Content/UI/SysSettings/PC/WBP_SysSettings_StarScene_PC.uasset`　|　WidgetTree 节点数：19

| 层级路径 | 类名 | 素材 | 素材资源路径 | zorder | Anchors | Offsets | Alignment | x0,y0 | x1,y1 | 宽×高 |
|---|---|---|---|---|---|---|---|---|---|---|
| /CanvasPanel_0/BG/Image_1 | Image | T_UI_common_bg_01 | /Game/UI/Common/Textures/T_UI_common_bg_01.T_UI_common_bg_01 |  | Min(0.000,0.000) Max(1.000,1.000) | L:-24.000 T:-11.000 R:-25.800 B:-5.700 | X:0.000 Y:0.000 | -24.0, -11.0 | 1894.2, 1074.3 | 1918.2×1085.3 |
| /CanvasPanel_0/BG/Image_2 | Image | T_UI_Settings_img_pattern02_PNG | /Game/__ExternalPaper2dAtlas__/SaveAtlas/UI/SysSettings/Texture/__Frames/T_UI_Settings_img_pattern02_PNG.T_UI_Settings_img_pattern02_PNG |  | Min(0.000,1.000) Max(0.000,1.000) | L:-0.500 T:0.000 R:22.500 B:92.000 | X:0.000 Y:1.000 | -0.5, 988.0 | 22.5, 1080.0 | 23.0×92.0 |
| /CanvasPanel_0/BG/Image_3 | Image | T_UI_Settings_img_pattern01 | /Game/UI/SysSettings/Texture/T_UI_Settings_img_pattern01.T_UI_Settings_img_pattern01 |  | Min(1.000,0.000) Max(1.000,0.000) | L:0.000 T:0.000 R:0.000 B:92.000 | X:1.000 Y:0.000 | 1920.0, 0.0 | 1920.0, 92.0 | 0.0×92.0 |
| /CanvasPanel_0/CanvasPanel_17/Title/Title_Bg | Image | T_UI_tower_img_buff_title_03 | /Game/UI/SysDressTower/Textures/T_UI_tower_img_buff_title_03.T_UI_tower_img_buff_title_03 |  | Min(0.500,0.500) Max(0.500,0.500) | L:-388.000 T:-72.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 572.0, 468.0 | 960.0, 540.0 | 388.0×72.0 |

> 共 4 个带贴图 Image 节点。

## WBP_Setting_OptionList（选项列表）

> 源文件：`X6Game/Content/UI/SysSettings/PC/WBP_Setting_OptionList.uasset`　|　WidgetTree 节点数：8

| 层级路径 | 类名 | 素材 | 素材资源路径 | zorder | Anchors | Offsets | Alignment | x0,y0 | x1,y1 | 宽×高 |
|---|---|---|---|---|---|---|---|---|---|---|
| /CanvasPanel_0/Title/Image_366 | Image | T_UI_Settings_bg_title | /Game/UI/SysSettings/Texture/T_UI_Settings_bg_title.T_UI_Settings_bg_title |  | Min(0.000,0.000) Max(0.000,0.000) | L:10.929 T:6.071 R:113.071 B:41.929 | X:0.000 Y:0.000 | 10.9, 6.1 | 113.1, 41.9 | 102.1×35.9 |
| /CanvasPanel_0/Title/Image_367 | Image | T_UI_Settings_img_titledec | /Game/UI/SysSettings/Texture/T_UI_Settings_img_titledec.T_UI_Settings_img_titledec |  | Min(0.000,0.000) Max(0.000,0.000) | L:34.786 T:17.000 R:97.214 B:43.000 | X:0.000 Y:0.000 | 34.8, 17.0 | 97.2, 43.0 | 62.4×26.0 |

> 共 2 个带贴图 Image 节点。

## WBP_Setting_OptionItem_DropList（下拉列表选项项）

> 源文件：`X6Game/Content/UI/SysSettings/PC/WBP_Setting_OptionItem_DropList.uasset`　|　WidgetTree 节点数：27

| 层级路径 | 类名 | 素材 | 素材资源路径 | zorder | Anchors | Offsets | Alignment | x0,y0 | x1,y1 | 宽×高 |
|---|---|---|---|---|---|---|---|---|---|---|
| /CanvasPanel_2/CanvasPanel_1/PanelNormal/Image_3 | Image | T_UI_Settings_bg_option_01_PNG | /Game/__ExternalPaper2dAtlas__/SaveAtlas/UI/SysSettings/Texture/__Frames/T_UI_Settings_bg_option_01_PNG.T_UI_Settings_bg_option_01_PNG |  | Min(0.000,0.000) Max(0.000,0.000) | L:11.438 T:4.125 R:1203.312 B:56.000 | X:0.000 Y:0.000 | 11.4, 4.1 | 1203.3, 56.0 | 1191.9×51.9 |
| /CanvasPanel_2/CanvasPanel_1/Hover/Image_1 | Image | T_UI_Settings_bg_option_01_h_PNG | /Game/__ExternalPaper2dAtlas__/SaveAtlas/UI/SysSettings/Texture/__Frames/T_UI_Settings_bg_option_01_h_PNG.T_UI_Settings_bg_option_01_h_PNG |  | Min(0.000,0.000) Max(0.000,0.000) | L:11.438 T:4.125 R:1203.312 B:56.000 | X:0.000 Y:0.000 | 11.4, 4.1 | 1203.3, 56.0 | 1191.9×51.9 |
| /CanvasPanel_2/CanvasPanel_1/CanvasPanel_108/Btn_N | Image | T_UI_Settings_btn_goto_n | /Game/UI/SysSettings/Texture/T_UI_Settings_btn_goto_n.T_UI_Settings_btn_goto_n |  | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 0.0, 0.0 | 0.0×0.0 |
| /CanvasPanel_2/CanvasPanel_1/CanvasPanel_108/Btn_H | Image | T_UI_Settings_btn_goto_h | /Game/UI/SysSettings/Texture/T_UI_Settings_btn_goto_h.T_UI_Settings_btn_goto_h |  | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 0.0, 0.0 | 0.0×0.0 |
| /CanvasPanel_2/CanvasPanel_1/CanvasPanel_108/Img_Arrow | Image | T_UI_Settings_img_Mobile_arrow_02_PNG | /Game/__ExternalPaper2dAtlas__/SaveAtlas/UI/SysSettings/Texture/__Frames/T_UI_Settings_img_Mobile_arrow_02_PNG.T_UI_Settings_img_Mobile_arrow_02_PNG | 1 | Min(1.000,0.500) Max(1.000,0.500) | L:-34.000 T:0.000 R:0.000 B:0.000 | X:1.000 Y:0.500 | 1852.0, 540.0 | 1886.0, 540.0 | 34.0×0.0 |
| /CanvasPanel_2/CanvasPanel_1/PanelSelect/Image_6 | Image | T_UI_Settings_btn_goto_h | /Game/UI/SysSettings/Texture/T_UI_Settings_btn_goto_h.T_UI_Settings_btn_goto_h |  | Min(0.000,0.000) Max(1.000,1.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 1920.0, 1080.0 | 1920.0×1080.0 |
| /CanvasPanel_2/CanvasPanel_1/PanelSelect/Img_Arrow_s | Image | T_UI_Settings_img_Mobile_arrow_02_PNG | /Game/__ExternalPaper2dAtlas__/SaveAtlas/UI/SysSettings/Texture/__Frames/T_UI_Settings_img_Mobile_arrow_02_PNG.T_UI_Settings_img_Mobile_arrow_02_PNG | 1 | Min(1.000,0.500) Max(1.000,0.500) | L:-34.000 T:0.000 R:0.000 B:0.000 | X:1.000 Y:0.500 | 1852.0, 540.0 | 1886.0, 540.0 | 34.0×0.0 |

> 共 7 个带贴图 Image 节点。

## WBP_SysSettings_SoundResource_Change（语音资源切换）

> 源文件：`X6Game/Content/UI/SysSettings/PC/LanguageResource/WBP_SysSettings_SoundResource_Change.uasset`　|　WidgetTree 节点数：7

| 层级路径 | 类名 | 素材 | 素材资源路径 | zorder | Anchors | Offsets | Alignment | x0,y0 | x1,y1 | 宽×高 |
|---|---|---|---|---|---|---|---|---|---|---|
| /CanvasPanel_18/Img_Mask | Image |  |  |  | Min(0.000,0.000) Max(1.000,1.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 1920.0, 1080.0 | 1920.0×1080.0 |

> 共 1 个带贴图 Image 节点。

## WBP_SysSettings_SoundResource_Download（语音资源下载）

> 源文件：`X6Game/Content/UI/SysSettings/PC/LanguageResource/WBP_SysSettings_SoundResource_Download.uasset`　|　WidgetTree 节点数：27

| 层级路径 | 类名 | 素材 | 素材资源路径 | zorder | Anchors | Offsets | Alignment | x0,y0 | x1,y1 | 宽×高 |
|---|---|---|---|---|---|---|---|---|---|---|
| /CanvasPanel_18/Img_Mask | Image |  |  |  | Min(0.000,0.000) Max(1.000,1.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 1920.0, 1080.0 | 1920.0×1080.0 |
| /CanvasPanel_18/CanvasPanel_2/CanvasPanel_3/VerticalBox_1/PanelProgress/ProgressBg_Img_1 | Image | T_UI_login_slider_empty | /PaperLuaFramework/HotUpdate/HotUpdateLevel/Textures/T_UI_login_slider_empty.T_UI_login_slider_empty |  | Min(0.500,0.500) Max(0.500,0.500) | L:-5.180 T:0.000 R:451.641 B:24.000 | X:0.500 Y:0.500 | 726.4, 528.0 | 1183.2, 552.0 | 456.8×24.0 |
| /CanvasPanel_18/CanvasPanel_2/CanvasPanel_3/VerticalBox_1/PanelProgress/CanvasPanel_276/Deco_Img | Image | T_UI_login_img_dec_01 | /PaperLuaFramework/HotUpdate/HotUpdateLevel/Textures/T_UI_login_img_dec_01.T_UI_login_img_dec_01 |  | Min(0.000,0.000) Max(0.000,0.000) | L:-140.602 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | -140.6, 0.0 | 0.0, 0.0 | 140.6×0.0 |
| /CanvasPanel_18/CanvasPanel_2/CanvasPanel_3/VerticalBox_1/PanelProgress/CanvasPanel_276/Deco_Img_1 | Image | T_UI_login_img_dec_01 | /PaperLuaFramework/HotUpdate/HotUpdateLevel/Textures/T_UI_login_img_dec_01.T_UI_login_img_dec_01 | 1 | Min(1.000,0.500) Max(1.000,0.500) | L:12.689 T:0.000 R:249.019 B:23.000 | X:0.500 Y:0.500 | 1814.5, 528.5 | 2050.9, 551.5 | 236.3×23.0 |

> 共 4 个带贴图 Image 节点。

## WBP_Setting_Child_OptionItem_Slider（子选项滑条）

> 源文件：`X6Game/Content/UI/SysSettings/PC/ChildOption/WBP_Setting_Child_OptionItem_Slider.uasset`　|　WidgetTree 节点数：25

| 层级路径 | 类名 | 素材 | 素材资源路径 | zorder | Anchors | Offsets | Alignment | x0,y0 | x1,y1 | 宽×高 |
|---|---|---|---|---|---|---|---|---|---|---|
| /CanvasPanel_1/Image_child | Image | T_UI_Settings_img_line_02 | /Game/UI/SysSettings/Texture/GraphicLoad/T_UI_Settings_img_line_02.T_UI_Settings_img_line_02 |  | Min(0.000,0.000) Max(0.000,0.000) | L:36.000 T:32.000 R:0.000 B:0.000 | X:0.000 Y:0.500 | 36.0, 48.0 | 0.0, 16.0 | -36.0×-32.0 |
| /CanvasPanel_1/Normal/Image_3 | Image | T_UI_Settings_bg_option_01_PNG | /Game/__ExternalPaper2dAtlas__/SaveAtlas/UI/SysSettings/Texture/__Frames/T_UI_Settings_bg_option_01_PNG.T_UI_Settings_bg_option_01_PNG |  | Min(0.000,0.000) Max(0.000,0.000) | L:84.000 T:4.125 R:1128.000 B:56.000 | X:0.000 Y:0.000 | 84.0, 4.1 | 1128.0, 56.0 | 1044.0×51.9 |
| /CanvasPanel_1/Normal/Image_100 | Image | T_UI_Settings_bg_option_02_PNG | /Game/__ExternalPaper2dAtlas__/SaveAtlas/UI/SysSettings/Texture/__Frames/T_UI_Settings_bg_option_02_PNG.T_UI_Settings_bg_option_02_PNG |  | Min(0.000,0.000) Max(0.000,0.000) | L:511.667 T:1.667 R:-411.667 B:15.333 | X:0.000 Y:0.000 | 511.7, 1.7 | -411.7, 15.3 | -923.3×13.7 |
| /CanvasPanel_1/Normal/Image_227 | Image | T_UI_Settings_btn_switch_n_PNG | /Game/__ExternalPaper2dAtlas__/SaveAtlas/UI/SysSettings/Texture/__Frames/T_UI_Settings_btn_switch_n_PNG.T_UI_Settings_btn_switch_n_PNG |  | Min(0.000,0.000) Max(0.000,0.000) | L:510.125 T:-0.333 R:-410.125 B:30.333 | X:0.000 Y:0.000 | 510.1, -0.3 | -410.1, 30.3 | -920.3×30.7 |
| /CanvasPanel_1/Normal/Image | Image | T_UI_Settings_btn_switch_n_PNG | /Game/__ExternalPaper2dAtlas__/SaveAtlas/UI/SysSettings/Texture/__Frames/T_UI_Settings_btn_switch_n_PNG.T_UI_Settings_btn_switch_n_PNG |  | Min(0.000,0.000) Max(0.000,0.000) | L:1053.717 T:-0.333 R:-794.661 B:30.333 | X:0.000 Y:0.000 | 1053.7, -0.3 | -794.7, 30.3 | -1848.4×30.7 |
| /CanvasPanel_1/Hover/Image_1 | Image | T_UI_Settings_bg_option_01_h_PNG | /Game/__ExternalPaper2dAtlas__/SaveAtlas/UI/SysSettings/Texture/__Frames/T_UI_Settings_bg_option_01_h_PNG.T_UI_Settings_bg_option_01_h_PNG |  | Min(0.000,0.000) Max(0.000,0.000) | L:84.000 T:4.125 R:1128.000 B:56.000 | X:0.000 Y:0.000 | 84.0, 4.1 | 1128.0, 56.0 | 1044.0×51.9 |
| /CanvasPanel_1/Hover/Image_2 | Image | T_UI_Settings_bg_option_02_h_PNG | /Game/__ExternalPaper2dAtlas__/SaveAtlas/UI/SysSettings/Texture/__Frames/T_UI_Settings_bg_option_02_h_PNG.T_UI_Settings_bg_option_02_h_PNG |  | Min(0.000,0.000) Max(0.000,0.000) | L:511.667 T:1.667 R:-411.667 B:15.333 | X:0.000 Y:0.000 | 511.7, 1.7 | -411.7, 15.3 | -923.3×13.7 |
| /CanvasPanel_1/Hover/Image_4 | Image | T_UI_Settings_btn_switch_h_PNG | /Game/__ExternalPaper2dAtlas__/SaveAtlas/UI/SysSettings/Texture/__Frames/T_UI_Settings_btn_switch_h_PNG.T_UI_Settings_btn_switch_h_PNG |  | Min(0.000,0.000) Max(0.000,0.000) | L:510.125 T:-0.333 R:-409.477 B:30.218 | X:0.000 Y:0.000 | 510.1, -0.3 | -409.5, 30.2 | -919.6×30.6 |
| /CanvasPanel_1/Hover/Image_5 | Image | T_UI_Settings_btn_switch_h_PNG | /Game/__ExternalPaper2dAtlas__/SaveAtlas/UI/SysSettings/Texture/__Frames/T_UI_Settings_btn_switch_h_PNG.T_UI_Settings_btn_switch_h_PNG |  | Min(0.000,0.000) Max(0.000,0.000) | L:1053.717 T:-0.333 R:-889.875 B:17.444 | X:0.000 Y:0.000 | 1053.7, -0.3 | -889.9, 17.4 | -1943.6×17.8 |

> 共 9 个带贴图 Image 节点。

## WBP_Setting_Child_OptionItem_Change（子选项切换）

> 源文件：`X6Game/Content/UI/SysSettings/PC/ChildOption/WBP_Setting_Child_OptionItem_Change.uasset`　|　WidgetTree 节点数：24

| 层级路径 | 类名 | 素材 | 素材资源路径 | zorder | Anchors | Offsets | Alignment | x0,y0 | x1,y1 | 宽×高 |
|---|---|---|---|---|---|---|---|---|---|---|
| /CanvasPanel_1/Image_child | Image | T_UI_Settings_img_line_02 | /Game/UI/SysSettings/Texture/GraphicLoad/T_UI_Settings_img_line_02.T_UI_Settings_img_line_02 |  | Min(0.000,0.000) Max(0.000,0.000) | L:36.000 T:32.000 R:0.000 B:0.000 | X:0.000 Y:0.500 | 36.0, 48.0 | 0.0, 16.0 | -36.0×-32.0 |
| /CanvasPanel_1/Normal/Image_3 | Image | T_UI_Settings_bg_option_01_PNG | /Game/__ExternalPaper2dAtlas__/SaveAtlas/UI/SysSettings/Texture/__Frames/T_UI_Settings_bg_option_01_PNG.T_UI_Settings_bg_option_01_PNG |  | Min(0.000,0.000) Max(0.000,0.000) | L:84.000 T:4.125 R:1128.000 B:56.000 | X:0.000 Y:0.000 | 84.0, 4.1 | 1128.0, 56.0 | 1044.0×51.9 |
| /CanvasPanel_1/Normal/Image_100 | Image | T_UI_Settings_bg_option_02_PNG | /Game/__ExternalPaper2dAtlas__/SaveAtlas/UI/SysSettings/Texture/__Frames/T_UI_Settings_bg_option_02_PNG.T_UI_Settings_bg_option_02_PNG |  | Min(0.000,0.000) Max(0.000,0.000) | L:511.667 T:1.667 R:-411.667 B:15.333 | X:0.000 Y:0.000 | 511.7, 1.7 | -411.7, 15.3 | -923.3×13.7 |
| /CanvasPanel_1/Normal/Image_227 | Image | T_UI_Settings_btn_switch_n_PNG | /Game/__ExternalPaper2dAtlas__/SaveAtlas/UI/SysSettings/Texture/__Frames/T_UI_Settings_btn_switch_n_PNG.T_UI_Settings_btn_switch_n_PNG |  | Min(0.000,0.000) Max(0.000,0.000) | L:510.125 T:-0.333 R:-451.458 B:21.000 | X:0.000 Y:0.000 | 510.1, -0.3 | -451.5, 21.0 | -961.6×21.3 |
| /CanvasPanel_1/Normal/Image | Image | T_UI_Settings_btn_switch_n_PNG | /Game/__ExternalPaper2dAtlas__/SaveAtlas/UI/SysSettings/Texture/__Frames/T_UI_Settings_btn_switch_n_PNG.T_UI_Settings_btn_switch_n_PNG |  | Min(0.000,0.000) Max(0.000,0.000) | L:1053.717 T:-0.333 R:-887.208 B:21.000 | X:0.000 Y:0.000 | 1053.7, -0.3 | -887.2, 21.0 | -1940.9×21.3 |
| /CanvasPanel_1/Hover/Image_1 | Image | T_UI_Settings_bg_option_01_h_PNG | /Game/__ExternalPaper2dAtlas__/SaveAtlas/UI/SysSettings/Texture/__Frames/T_UI_Settings_bg_option_01_h_PNG.T_UI_Settings_bg_option_01_h_PNG |  | Min(0.000,0.000) Max(0.000,0.000) | L:84.000 T:4.125 R:1128.000 B:56.000 | X:0.000 Y:0.000 | 84.0, 4.1 | 1128.0, 56.0 | 1044.0×51.9 |
| /CanvasPanel_1/Hover/Image_2 | Image | T_UI_Settings_bg_option_02_h_PNG | /Game/__ExternalPaper2dAtlas__/SaveAtlas/UI/SysSettings/Texture/__Frames/T_UI_Settings_bg_option_02_h_PNG.T_UI_Settings_bg_option_02_h_PNG |  | Min(0.000,0.000) Max(0.000,0.000) | L:511.667 T:1.667 R:-411.667 B:15.333 | X:0.000 Y:0.000 | 511.7, 1.7 | -411.7, 15.3 | -923.3×13.7 |
| /CanvasPanel_1/Hover/Image_4 | Image | T_UI_Settings_btn_switch_h_PNG | /Game/__ExternalPaper2dAtlas__/SaveAtlas/UI/SysSettings/Texture/__Frames/T_UI_Settings_btn_switch_h_PNG.T_UI_Settings_btn_switch_h_PNG |  | Min(0.000,0.000) Max(0.000,0.000) | L:510.125 T:-0.333 R:-451.458 B:21.000 | X:0.000 Y:0.000 | 510.1, -0.3 | -451.5, 21.0 | -961.6×21.3 |
| /CanvasPanel_1/Hover/Image_5 | Image | T_UI_Settings_btn_switch_h_PNG | /Game/__ExternalPaper2dAtlas__/SaveAtlas/UI/SysSettings/Texture/__Frames/T_UI_Settings_btn_switch_h_PNG.T_UI_Settings_btn_switch_h_PNG |  | Min(0.000,0.000) Max(0.000,0.000) | L:1053.717 T:-0.333 R:-887.208 B:21.000 | X:0.000 Y:0.000 | 1053.7, -0.3 | -887.2, 21.0 | -1940.9×21.3 |

> 共 9 个带贴图 Image 节点。

## WBP_Setting_Child_OptionItem_Button（子选项按钮）

> 源文件：`X6Game/Content/UI/SysSettings/PC/ChildOption/WBP_Setting_Child_OptionItem_Button.uasset`　|　WidgetTree 节点数：21

| 层级路径 | 类名 | 素材 | 素材资源路径 | zorder | Anchors | Offsets | Alignment | x0,y0 | x1,y1 | 宽×高 |
|---|---|---|---|---|---|---|---|---|---|---|
| /CanvasPanel_1/Image_child | Image | T_UI_Settings_img_line_02 | /Game/UI/SysSettings/Texture/GraphicLoad/T_UI_Settings_img_line_02.T_UI_Settings_img_line_02 |  | Min(0.000,0.000) Max(0.000,0.000) | L:36.000 T:32.000 R:0.000 B:0.000 | X:0.000 Y:0.500 | 36.0, 48.0 | 0.0, 16.0 | -36.0×-32.0 |
| /CanvasPanel_1/Normal/Image_3 | Image | T_UI_Settings_bg_option_01_PNG | /Game/__ExternalPaper2dAtlas__/SaveAtlas/UI/SysSettings/Texture/__Frames/T_UI_Settings_bg_option_01_PNG.T_UI_Settings_bg_option_01_PNG |  | Min(0.000,0.000) Max(0.000,0.000) | L:84.000 T:4.125 R:1128.000 B:56.000 | X:0.000 Y:0.000 | 84.0, 4.1 | 1128.0, 56.0 | 1044.0×51.9 |
| /CanvasPanel_1/Hover/Image_1 | Image | T_UI_Settings_bg_option_01_h_PNG | /Game/__ExternalPaper2dAtlas__/SaveAtlas/UI/SysSettings/Texture/__Frames/T_UI_Settings_bg_option_01_h_PNG.T_UI_Settings_bg_option_01_h_PNG |  | Min(0.000,0.000) Max(0.000,0.000) | L:84.000 T:4.125 R:1128.000 B:56.000 | X:0.000 Y:0.000 | 84.0, 4.1 | 1128.0, 56.0 | 1044.0×51.9 |
| /CanvasPanel_1/CanvasPanel_108/Btn_N | Image | T_UI_Settings_btn_goto_n | /Game/UI/SysSettings/Texture/T_UI_Settings_btn_goto_n.T_UI_Settings_btn_goto_n |  | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 0.0, 0.0 | 0.0×0.0 |
| /CanvasPanel_1/CanvasPanel_108/Btn_H | Image | T_UI_Settings_btn_goto_h | /Game/UI/SysSettings/Texture/T_UI_Settings_btn_goto_h.T_UI_Settings_btn_goto_h |  | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 0.0, 0.0 | 0.0×0.0 |
| /CanvasPanel_1/CanvasPanel_108/HorizontalBox_0/Image_64 | Image | T_UI_Settings_img_arrow_01 | /Game/UI/SysSettings/Texture/T_UI_Settings_img_arrow_01.T_UI_Settings_img_arrow_01 |  | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 0.0, 0.0 | 0.0×0.0 |

> 共 6 个带贴图 Image 节点。

## WBP_Setting_Child_OptionItem_DropList（子选项下拉）

> 源文件：`X6Game/Content/UI/SysSettings/PC/ChildOption/WBP_Setting_Child_OptionItem_DropList.uasset`　|　WidgetTree 节点数：28

| 层级路径 | 类名 | 素材 | 素材资源路径 | zorder | Anchors | Offsets | Alignment | x0,y0 | x1,y1 | 宽×高 |
|---|---|---|---|---|---|---|---|---|---|---|
| /CanvasPanel_2/CanvasPanel_1/Image_child | Image | T_UI_Settings_img_line_02 | /Game/UI/SysSettings/Texture/GraphicLoad/T_UI_Settings_img_line_02.T_UI_Settings_img_line_02 |  | Min(0.000,0.000) Max(0.000,0.000) | L:36.000 T:32.000 R:0.000 B:0.000 | X:0.000 Y:0.500 | 36.0, 48.0 | 0.0, 16.0 | -36.0×-32.0 |
| /CanvasPanel_2/CanvasPanel_1/PanelNormal/Image_3 | Image | T_UI_Settings_bg_option_01_PNG | /Game/__ExternalPaper2dAtlas__/SaveAtlas/UI/SysSettings/Texture/__Frames/T_UI_Settings_bg_option_01_PNG.T_UI_Settings_bg_option_01_PNG |  | Min(0.000,0.000) Max(0.000,0.000) | L:84.000 T:4.125 R:1128.000 B:56.000 | X:0.000 Y:0.000 | 84.0, 4.1 | 1128.0, 56.0 | 1044.0×51.9 |
| /CanvasPanel_2/CanvasPanel_1/Hover/Image_1 | Image | T_UI_Settings_bg_option_01_h_PNG | /Game/__ExternalPaper2dAtlas__/SaveAtlas/UI/SysSettings/Texture/__Frames/T_UI_Settings_bg_option_01_h_PNG.T_UI_Settings_bg_option_01_h_PNG |  | Min(0.000,0.000) Max(0.000,0.000) | L:84.000 T:4.125 R:1128.000 B:56.000 | X:0.000 Y:0.000 | 84.0, 4.1 | 1128.0, 56.0 | 1044.0×51.9 |
| /CanvasPanel_2/CanvasPanel_1/CanvasPanel_108/Btn_N | Image | T_UI_Settings_btn_goto_n | /Game/UI/SysSettings/Texture/T_UI_Settings_btn_goto_n.T_UI_Settings_btn_goto_n |  | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 0.0, 0.0 | 0.0×0.0 |
| /CanvasPanel_2/CanvasPanel_1/CanvasPanel_108/Btn_H | Image | T_UI_Settings_btn_goto_h | /Game/UI/SysSettings/Texture/T_UI_Settings_btn_goto_h.T_UI_Settings_btn_goto_h |  | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 0.0, 0.0 | 0.0×0.0 |
| /CanvasPanel_2/CanvasPanel_1/CanvasPanel_108/Img_Arrow | Image | T_UI_Settings_img_Mobile_arrow_02_PNG | /Game/__ExternalPaper2dAtlas__/SaveAtlas/UI/SysSettings/Texture/__Frames/T_UI_Settings_img_Mobile_arrow_02_PNG.T_UI_Settings_img_Mobile_arrow_02_PNG | 1 | Min(1.000,0.500) Max(1.000,0.500) | L:-34.000 T:0.000 R:0.000 B:0.000 | X:1.000 Y:0.500 | 1852.0, 540.0 | 1886.0, 540.0 | 34.0×0.0 |
| /CanvasPanel_2/CanvasPanel_1/PanelSelect/Image_6 | Image | T_UI_Settings_btn_goto_h | /Game/UI/SysSettings/Texture/T_UI_Settings_btn_goto_h.T_UI_Settings_btn_goto_h |  | Min(0.000,0.000) Max(1.000,1.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 1920.0, 1080.0 | 1920.0×1080.0 |
| /CanvasPanel_2/CanvasPanel_1/PanelSelect/Img_Arrow_s | Image | T_UI_Settings_img_Mobile_arrow_02_PNG | /Game/__ExternalPaper2dAtlas__/SaveAtlas/UI/SysSettings/Texture/__Frames/T_UI_Settings_img_Mobile_arrow_02_PNG.T_UI_Settings_img_Mobile_arrow_02_PNG | 1 | Min(1.000,0.500) Max(1.000,0.500) | L:-34.000 T:0.000 R:0.000 B:0.000 | X:1.000 Y:0.500 | 1852.0, 540.0 | 1886.0, 540.0 | 34.0×0.0 |

> 共 8 个带贴图 Image 节点。

## WBP_Setting_Child_OptionItem_Switch（子选项开关）

> 源文件：`X6Game/Content/UI/SysSettings/PC/ChildOption/WBP_Setting_Child_OptionItem_Switch.uasset`　|　WidgetTree 节点数：31

| 层级路径 | 类名 | 素材 | 素材资源路径 | zorder | Anchors | Offsets | Alignment | x0,y0 | x1,y1 | 宽×高 |
|---|---|---|---|---|---|---|---|---|---|---|
| /CanvasPanel_1/Image_child | Image | T_UI_Settings_img_line_02 | /Game/UI/SysSettings/Texture/GraphicLoad/T_UI_Settings_img_line_02.T_UI_Settings_img_line_02 |  | Min(0.000,0.000) Max(0.000,0.000) | L:36.000 T:32.000 R:0.000 B:0.000 | X:0.000 Y:0.500 | 36.0, 48.0 | 0.0, 16.0 | -36.0×-32.0 |
| /CanvasPanel_1/Normal/Image_3 | Image | T_UI_Settings_bg_option_01_PNG | /Game/__ExternalPaper2dAtlas__/SaveAtlas/UI/SysSettings/Texture/__Frames/T_UI_Settings_bg_option_01_PNG.T_UI_Settings_bg_option_01_PNG |  | Min(0.000,0.000) Max(0.000,0.000) | L:84.000 T:4.125 R:1128.000 B:56.000 | X:0.000 Y:0.000 | 84.0, 4.1 | 1128.0, 56.0 | 1044.0×51.9 |
| /CanvasPanel_1/Hover/Image_1 | Image | T_UI_Settings_bg_option_01_h_PNG | /Game/__ExternalPaper2dAtlas__/SaveAtlas/UI/SysSettings/Texture/__Frames/T_UI_Settings_bg_option_01_h_PNG.T_UI_Settings_bg_option_01_h_PNG |  | Min(0.000,0.000) Max(0.000,0.000) | L:84.000 T:4.125 R:1128.000 B:56.000 | X:0.000 Y:0.000 | 84.0, 4.1 | 1128.0, 56.0 | 1044.0×51.9 |
| /CanvasPanel_1/Switch_OnOff/PanelOn/dark_right_n | Image | T_UI_Settings_btn_toggle_right_off | /Game/UI/SysSettings/Texture/T_UI_Settings_btn_toggle_right_off.T_UI_Settings_btn_toggle_right_off |  | Min(0.000,0.000) Max(0.000,0.000) | L:347.325 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 347.3, 0.0 | 0.0, 0.0 | -347.3×0.0 |
| /CanvasPanel_1/Switch_OnOff/PanelOn/dark_right_h | Image | T_UI_Settings_btn_toggle_rightoff_h_PNG | /Game/__ExternalPaper2dAtlas__/SaveAtlas/UI/SysSettings/Texture/__Frames/T_UI_Settings_btn_toggle_rightoff_h_PNG.T_UI_Settings_btn_toggle_rightoff_h_PNG |  | Min(0.000,0.000) Max(0.000,0.000) | L:347.325 T:0.000 R:-130.833 B:-120.667 | X:0.000 Y:0.000 | 347.3, 0.0 | -130.8, -120.7 | -478.2×-120.7 |
| /CanvasPanel_1/Switch_OnOff/PanelOn/light_left_n | Image | T_UI_Settings_btn_toggle_right_on_PNG | /Game/__ExternalPaper2dAtlas__/SaveAtlas/UI/SysSettings/Texture/__Frames/T_UI_Settings_btn_toggle_right_on_PNG.T_UI_Settings_btn_toggle_right_on_PNG | 1 | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 0.0, 0.0 | 0.0×0.0 |
| /CanvasPanel_1/Switch_OnOff/PanelOn/light_left_h | Image | T_UI_Settings_btn_toggle_left_hovering | /Game/UI/SysSettings/Texture/T_UI_Settings_btn_toggle_left_hovering.T_UI_Settings_btn_toggle_left_hovering | 1 | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:0.000 R:-125.333 B:-120.667 | X:0.000 Y:0.000 | 0.0, 0.0 | -125.3, -120.7 | -125.3×-120.7 |
| /CanvasPanel_1/Switch_OnOff/PanelOff/dark_left_n | Image | T_UI_Settings_btn_toggle_left_off | /Game/UI/SysSettings/Texture/T_UI_Settings_btn_toggle_left_off.T_UI_Settings_btn_toggle_left_off |  | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:0.000 R:-125.333 B:-120.667 | X:0.000 Y:0.000 | 0.0, 0.0 | -125.3, -120.7 | -125.3×-120.7 |
| /CanvasPanel_1/Switch_OnOff/PanelOff/dark_left_h | Image | T_UI_Settings_btn_toggle_leftoff_h_PNG | /Game/__ExternalPaper2dAtlas__/SaveAtlas/UI/SysSettings/Texture/__Frames/T_UI_Settings_btn_toggle_leftoff_h_PNG.T_UI_Settings_btn_toggle_leftoff_h_PNG | 1 | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:0.000 R:-125.333 B:-120.667 | X:0.000 Y:0.000 | 0.0, 0.0 | -125.3, -120.7 | -125.3×-120.7 |
| /CanvasPanel_1/Switch_OnOff/PanelOff/light_right_n | Image | T_UI_Settings_btn_toggle_right_on_PNG | /Game/__ExternalPaper2dAtlas__/SaveAtlas/UI/SysSettings/Texture/__Frames/T_UI_Settings_btn_toggle_right_on_PNG.T_UI_Settings_btn_toggle_right_on_PNG | 1 | Min(0.000,0.000) Max(0.000,0.000) | L:348.468 T:0.000 R:-131.476 B:-120.667 | X:0.000 Y:0.000 | 348.5, 0.0 | -131.5, -120.7 | -479.9×-120.7 |
| /CanvasPanel_1/Switch_OnOff/PanelOff/light_right_h | Image | T_UI_Settings_btn_toggle_left_hovering | /Game/UI/SysSettings/Texture/T_UI_Settings_btn_toggle_left_hovering.T_UI_Settings_btn_toggle_left_hovering |  | Min(0.000,0.000) Max(0.000,0.000) | L:348.468 T:0.000 R:-130.833 B:-120.667 | X:0.000 Y:0.000 | 348.5, 0.0 | -130.8, -120.7 | -479.3×-120.7 |

> 共 11 个带贴图 Image 节点。

## WBP_Setting_Child_OptionList_Item（子选项列表项）

> 源文件：`X6Game/Content/UI/SysSettings/PC/ChildOption/WBP_Setting_Child_OptionList_Item.uasset`　|　WidgetTree 节点数：10

| 层级路径 | 类名 | 素材 | 素材资源路径 | zorder | Anchors | Offsets | Alignment | x0,y0 | x1,y1 | 宽×高 |
|---|---|---|---|---|---|---|---|---|---|---|
| /CanvasPanel_0/CanvasPanel_58/Change_Icon | Image | T_UI_Settings_img_reddot | /Game/UI/SysSettings/Texture/T_UI_Settings_img_reddot.T_UI_Settings_img_reddot |  | Min(0.000,0.000) Max(0.000,0.000) | L:1217.667 T:19.000 R:130.333 B:27.000 | X:0.000 Y:0.000 | 1217.7, 19.0 | 130.3, 27.0 | -1087.3×8.0 |

> 共 1 个带贴图 Image 节点。

## WBP_SysSettings_pakDownload（资源包下载）

> 源文件：`X6Game/Content/UI/SysSettings/WidgetBp/WBP_SysSettings_pakDownload.uasset`　|　WidgetTree 节点数：8

| 层级路径 | 类名 | 素材 | 素材资源路径 | zorder | Anchors | Offsets | Alignment | x0,y0 | x1,y1 | 宽×高 |
|---|---|---|---|---|---|---|---|---|---|---|

> 共 0 个带贴图 Image 节点。

## WBP_SysSettings_pakDownload_Popup（资源包下载弹窗）

> 源文件：`X6Game/Content/UI/SysSettings/WidgetBp/WBP_SysSettings_pakDownload_Popup.uasset`　|　WidgetTree 节点数：6

| 层级路径 | 类名 | 素材 | 素材资源路径 | zorder | Anchors | Offsets | Alignment | x0,y0 | x1,y1 | 宽×高 |
|---|---|---|---|---|---|---|---|---|---|---|

> 共 0 个带贴图 Image 节点。

## WBP_SysSettings_pakDownload_LeftItem（资源包下载左项）

> 源文件：`X6Game/Content/UI/SysSettings/WidgetBp/WBP_SysSettings_pakDownload_LeftItem.uasset`　|　WidgetTree 节点数：29

| 层级路径 | 类名 | 素材 | 素材资源路径 | zorder | Anchors | Offsets | Alignment | x0,y0 | x1,y1 | 宽×高 |
|---|---|---|---|---|---|---|---|---|---|---|
| /CanvasPanel_31/CanvasPanel_Bg/Normal_Img | Image | T_UI_task_btn_list_item_xy_n_PNG | /Game/__ExternalPaper2dAtlas__/SaveAtlas/UI/SysChallenge/Textures/Entrance_2_0/__Frames/T_UI_task_btn_list_item_xy_n_PNG.T_UI_task_btn_list_item_xy_n_PNG | 1 | Min(0.500,0.500) Max(0.500,0.500) | L:0.000 T:0.000 R:772.840 B:132.000 | X:0.500 Y:0.500 | 573.6, 474.0 | 1346.4, 606.0 | 772.8×132.0 |
| /CanvasPanel_31/CanvasPanel_Bg/Normal_Img_1 | Image | T_UI_task_btn_list_item_xy_n_PNG | /Game/__ExternalPaper2dAtlas__/SaveAtlas/UI/SysChallenge/Textures/Entrance_2_0/__Frames/T_UI_task_btn_list_item_xy_n_PNG.T_UI_task_btn_list_item_xy_n_PNG | 1 | Min(0.500,0.500) Max(0.500,0.500) | L:0.000 T:0.000 R:772.840 B:132.000 | X:0.500 Y:0.500 | 573.6, 474.0 | 1346.4, 606.0 | 772.8×132.0 |
| /CanvasPanel_31/CanvasPanel_Bg/Normal_Img_2 | Image | T_UI_task_btn_list_item_xy_n_PNG | /Game/__ExternalPaper2dAtlas__/SaveAtlas/UI/SysChallenge/Textures/Entrance_2_0/__Frames/T_UI_task_btn_list_item_xy_n_PNG.T_UI_task_btn_list_item_xy_n_PNG | 1 | Min(0.500,0.500) Max(0.500,0.500) | L:0.000 T:0.000 R:772.840 B:132.000 | X:0.500 Y:0.500 | 573.6, 474.0 | 1346.4, 606.0 | 772.8×132.0 |
| /CanvasPanel_31/CanvasPanel_Bg/Select_Img | Image | T_UI_task_btn_list_item_xy_s_PNG | /Game/__ExternalPaper2dAtlas__/SaveAtlas/UI/SysChallenge/Textures/Entrance_2_0/__Frames/T_UI_task_btn_list_item_xy_s_PNG.T_UI_task_btn_list_item_xy_s_PNG | 1 | Min(0.500,0.500) Max(0.500,0.500) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.500 Y:0.500 | 960.0, 540.0 | 960.0, 540.0 | 0.0×0.0 |
| /CanvasPanel_31/CanvasPanel_Bg/Press_Img | Image | T_UI_task_btn_list_item_xy_n_PNG | /Game/__ExternalPaper2dAtlas__/SaveAtlas/UI/SysChallenge/Textures/Entrance_2_0/__Frames/T_UI_task_btn_list_item_xy_n_PNG.T_UI_task_btn_list_item_xy_n_PNG | 2 | Min(0.500,0.500) Max(0.500,0.500) | L:0.000 T:0.000 R:772.840 B:132.000 | X:0.500 Y:0.500 | 573.6, 474.0 | 1346.4, 606.0 | 772.8×132.0 |
| /CanvasPanel_31/CanvasPanel_Bg/Hover_Img | Image | T_UI_common_btn_option_h | /Game/UI/Common/Textures/T_UI_common_btn_option_h.T_UI_common_btn_option_h | 3 | Min(0.000,0.000) Max(1.000,1.000) | L:-11.900 T:-13.333 R:-12.467 B:-13.000 | X:0.000 Y:0.000 | -11.9, -13.3 | 1907.5, 1067.0 | 1919.4×1080.3 |
| /CanvasPanel_31/VerticalBox_Info/SizeBox_Tips/WidgetSwitcher_0/HorizontalBox_DownLoad/WidgetSwitcher_Icon/Image_Paush | Image | T_UI_login_Card_icon_pause | /Game/UI/SysSettings/Texture/T_UI_login_Card_icon_pause.T_UI_login_Card_icon_pause |  | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 0.0, 0.0 | 0.0×0.0 |
| /CanvasPanel_31/VerticalBox_Info/SizeBox_Tips/WidgetSwitcher_0/HorizontalBox_DownLoad/WidgetSwitcher_Icon/Image_Continue | Image | T_UI_login_Card_icon_start | /Game/UI/SysSettings/Texture/T_UI_login_Card_icon_start.T_UI_login_Card_icon_start |  | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 0.0, 0.0 | 0.0×0.0 |
| /CanvasPanel_31/VerticalBox_Info/SizeBox_Tips/WidgetSwitcher_0/HorizontalBox_DownLoad/WidgetSwitcher_Icon/Image_Wait | Image | T_UI_login_Card_icon_wait | /Game/UI/SysSettings/Texture/T_UI_login_Card_icon_wait.T_UI_login_Card_icon_wait |  | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 0.0, 0.0 | 0.0×0.0 |
| /CanvasPanel_31/VerticalBox_Info/SizeBox_Tips/WidgetSwitcher_0/HorizontalBox_Finish/Image_Icon_Finish | Image | T_UI_login_Card_icon_Finish | /Game/UI/SysSettings/Texture/T_UI_login_Card_icon_Finish.T_UI_login_Card_icon_Finish |  | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 0.0, 0.0 | 0.0×0.0 |
| /CanvasPanel_31/VerticalBox_Info/SizeBox_Tips/WidgetSwitcher_0/HorizontalBox_Relogin/Image_Icon_Relogin | Image | T_UI_login_Card_icon_Failure | /Game/UI/SysSettings/Texture/T_UI_login_Card_icon_Failure.T_UI_login_Card_icon_Failure |  | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 0.0, 0.0 | 0.0×0.0 |

> 共 11 个带贴图 Image 节点。

## WBP_SysSettings_pakDownload_RightItem（资源包下载右项）

> 源文件：`X6Game/Content/UI/SysSettings/WidgetBp/WBP_SysSettings_pakDownload_RightItem.uasset`　|　WidgetTree 节点数：46

| 层级路径 | 类名 | 素材 | 素材资源路径 | zorder | Anchors | Offsets | Alignment | x0,y0 | x1,y1 | 宽×高 |
|---|---|---|---|---|---|---|---|---|---|---|
| /CanvasPanel_0/Resource/VerticalBox_6/Overlay_1/Image_bg | Image | T_UI_login_bg_01_PNG | /Game/__ExternalPaper2dAtlas__/SaveAtlas/UI/SysSettings/Texture/__Frames/T_UI_login_bg_01_PNG.T_UI_login_bg_01_PNG |  | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 0.0, 0.0 | 0.0×0.0 |
| /CanvasPanel_0/Resource/VerticalBox_6/Content_Bottom/Image_bg_bottom | Image | T_UI_login_bg_02_PNG | /Game/__ExternalPaper2dAtlas__/SaveAtlas/UI/SysSettings/Texture/__Frames/T_UI_login_bg_02_PNG.T_UI_login_bg_02_PNG |  | Min(0.000,1.000) Max(0.000,1.000) | L:336.378 T:3.455 R:675.000 B:79.002 | X:0.500 Y:1.000 | 167.1, 1007.9 | 505.7, 1083.5 | 338.6×75.5 |
| /CanvasPanel_0/Resource/VerticalBox_6/Content_Bottom/VerticalBox_0/CanvasPanel_Progress/Canvas_content/PanelContent/ProgressBg_Img | Image | T_UI_login_slider_empty | /PaperLuaFramework/HotUpdate/HotUpdateLevel/Textures/T_UI_login_slider_empty.T_UI_login_slider_empty |  | Min(0.500,0.500) Max(0.500,0.500) | L:-1.591 T:0.000 R:628.208 B:24.000 | X:0.500 Y:0.500 | 643.5, 528.0 | 1273.3, 552.0 | 629.8×24.0 |
| /CanvasPanel_0/Resource/Image_Chapter | Image | T_UI_login_Card_img_01_item | /Game/UI/SysSettings/Texture/T_UI_login_Card_img_01_item.T_UI_login_Card_img_01_item |  | Min(0.500,0.500) Max(0.500,0.500) | L:0.000 T:-318.000 R:675.000 B:294.400 | X:0.500 Y:0.000 | 622.5, 222.0 | 1297.5, 834.4 | 675.0×612.4 |

> 共 4 个带贴图 Image 节点。

## WBP_Set_DownloadSource_PopupMain（下载源选择弹窗）

> 源文件：`X6Game/Content/UI/SysSettings/WidgetBp/WBP_Set_DownloadSource_PopupMain.uasset`　|　WidgetTree 节点数：11

| 层级路径 | 类名 | 素材 | 素材资源路径 | zorder | Anchors | Offsets | Alignment | x0,y0 | x1,y1 | 宽×高 |
|---|---|---|---|---|---|---|---|---|---|---|
| /CanvasPanel_16/Image_Visibility | Image |  |  |  | Min(0.000,0.000) Max(1.000,1.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 1920.0, 1080.0 | 1920.0×1080.0 |
| /CanvasPanel_16/X6ScaleBox_Content/Canvas_Content/Canvas_Empty/Image_Bg | Image | T_UI_common_empty | /Game/UI/Common/Textures/T_UI_common_empty.T_UI_common_empty |  | Min(0.500,0.500) Max(0.500,0.500) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.500 Y:0.500 | 960.0, 540.0 | 960.0, 540.0 | 0.0×0.0 |

> 共 2 个带贴图 Image 节点。

## WBP_Set_DownSour_Item（下载源项）

> 源文件：`X6Game/Content/UI/SysSettings/WidgetBp/Element/WBP_Set_DownSour_Item.uasset`　|　WidgetTree 节点数：10

| 层级路径 | 类名 | 素材 | 素材资源路径 | zorder | Anchors | Offsets | Alignment | x0,y0 | x1,y1 | 宽×高 |
|---|---|---|---|---|---|---|---|---|---|---|
| /CanvasPanel_16/Image_Bg | Image | T_UI_download_img_sort | /Game/UI/SysSettings/Texture/T_UI_download_img_sort.T_UI_download_img_sort |  | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 0.0, 0.0 | 0.0×0.0 |
| /CanvasPanel_16/ProgressBg_Img | Image | T_UI_login_slider_empty | /PaperLuaFramework/HotUpdate/HotUpdateLevel/Textures/T_UI_login_slider_empty.T_UI_login_slider_empty |  | Min(0.000,0.000) Max(0.000,0.000) | L:67.000 T:81.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 67.0, 81.0 | 0.0, 0.0 | -67.0×-81.0 |

> 共 2 个带贴图 Image 节点。

## WBP_SysSettings_Busy_Popup（忙碌弹窗）

> 源文件：`X6Game/Content/UI/SysSettings/WidgetBp/WBP_SysSettings_Busy_Popup.uasset`　|　WidgetTree 节点数：18

| 层级路径 | 类名 | 素材 | 素材资源路径 | zorder | Anchors | Offsets | Alignment | x0,y0 | x1,y1 | 宽×高 |
|---|---|---|---|---|---|---|---|---|---|---|
| /CanvasPanel_27/CanvasPanel_84/Filter_Img | Image |  |  |  | Min(0.000,0.000) Max(1.000,1.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 1920.0, 1080.0 | 1920.0×1080.0 |

> 共 1 个带贴图 Image 节点。

## WBP_SysSettings_Busy_Popup_Item（忙碌弹窗项）

> 源文件：`X6Game/Content/UI/SysSettings/WidgetBp/Element/WBP_SysSettings_Busy_Popup_Item.uasset`　|　WidgetTree 节点数：10

| 层级路径 | 类名 | 素材 | 素材资源路径 | zorder | Anchors | Offsets | Alignment | x0,y0 | x1,y1 | 宽×高 |
|---|---|---|---|---|---|---|---|---|---|---|
| /CanvasPanel_27/CanvasPanel_85/Img_n | Image | T_UI_Settings_common_bg_n | /Game/UI/SysSettings/Texture/T_UI_Settings_common_bg_n.T_UI_Settings_common_bg_n |  | Min(0.000,0.500) Max(1.000,0.500) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.500 Y:0.500 | -960.0, 540.0 | 960.0, 540.0 | 1920.0×0.0 |
| /CanvasPanel_27/CanvasPanel_85/Img_s | Image | T_UI_Settings_common_bg_s | /Game/UI/SysSettings/Texture/T_UI_Settings_common_bg_s.T_UI_Settings_common_bg_s |  | Min(0.000,0.500) Max(1.000,0.500) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.500 Y:0.500 | -960.0, 540.0 | 960.0, 540.0 | 1920.0×0.0 |
| /CanvasPanel_27/CanvasPanel_85/Img_h | Image | T_UI_Settings_common_bg_h | /Game/UI/SysSettings/Texture/T_UI_Settings_common_bg_h.T_UI_Settings_common_bg_h |  | Min(0.000,0.500) Max(1.000,0.500) | L:-4.000 T:0.000 R:-18.000 B:46.000 | X:0.500 Y:0.500 | -957.0, 517.0 | 949.0, 563.0 | 1906.0×46.0 |
| /CanvasPanel_27/CanvasPanel_85/Img_p | Image | T_UI_Settings_common_bg_s | /Game/UI/SysSettings/Texture/T_UI_Settings_common_bg_s.T_UI_Settings_common_bg_s | 1 | Min(0.000,0.500) Max(1.000,0.500) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.500 Y:0.500 | -960.0, 540.0 | 960.0, 540.0 | 1920.0×0.0 |

> 共 4 个带贴图 Image 节点。

## WBP_Setting_KeyAdjust_Item（按键调整项）

> 源文件：`X6Game/Content/UI/SysSettings/WidgetBp/WBP_Setting_KeyAdjust_Item.uasset`　|　WidgetTree 节点数：18

| 层级路径 | 类名 | 素材 | 素材资源路径 | zorder | Anchors | Offsets | Alignment | x0,y0 | x1,y1 | 宽×高 |
|---|---|---|---|---|---|---|---|---|---|---|
| /CanvasPanel_22/CanvasPanel_56/BG | Image | T_UI_Settings_bg_option_01_h_PNG | /Game/__ExternalPaper2dAtlas__/SaveAtlas/UI/SysSettings/Texture/__Frames/T_UI_Settings_bg_option_01_h_PNG.T_UI_Settings_bg_option_01_h_PNG |  | Min(0.000,0.000) Max(0.000,0.000) | L:3.000 T:2.000 R:844.000 B:56.000 | X:0.000 Y:0.000 | 3.0, 2.0 | 844.0, 56.0 | 841.0×54.0 |
| /CanvasPanel_22/CanvasPanel_56/SwitchLeftKey/Durk/Img_Durk | Image | T_UI_Settings_btn_keyset_short_01_PNG | /Game/__ExternalPaper2dAtlas__/SaveAtlas/UI/SysSettings/Texture/__Frames/T_UI_Settings_btn_keyset_short_01_PNG.T_UI_Settings_btn_keyset_short_01_PNG |  | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 0.0, 0.0 | 0.0×0.0 |
| /CanvasPanel_22/CanvasPanel_56/SwitchLeftKey/Light/Img_Light | Image | T_UI_Settings_btn_keyset_short_02_PNG | /Game/__ExternalPaper2dAtlas__/SaveAtlas/UI/SysSettings/Texture/__Frames/T_UI_Settings_btn_keyset_short_02_PNG.T_UI_Settings_btn_keyset_short_02_PNG |  | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 0.0, 0.0 | 0.0×0.0 |
| /CanvasPanel_22/CanvasPanel_56/SwitchIcon/Image_228 | Image | T_UI_common_arrowhead_white_small_n | /Game/UI/Common/Textures/T_UI_common_arrowhead_white_small_n.T_UI_common_arrowhead_white_small_n |  | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 0.0, 0.0 | 0.0×0.0 |
| /CanvasPanel_22/CanvasPanel_56/RightKey/Img_RIght | Image | T_UI_Settings_btn_keyset_short_01_PNG | /Game/__ExternalPaper2dAtlas__/SaveAtlas/UI/SysSettings/Texture/__Frames/T_UI_Settings_btn_keyset_short_01_PNG.T_UI_Settings_btn_keyset_short_01_PNG |  | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 0.0, 0.0 | 0.0×0.0 |

> 共 5 个带贴图 Image 节点。

## WBP_SysSetting_StarScenePic（星幕场景图）

> 源文件：`X6Game/Content/UI/SysSettings/WidgetBp/WBP_SysSetting_StarScenePic.uasset`　|　WidgetTree 节点数：16

| 层级路径 | 类名 | 素材 | 素材资源路径 | zorder | Anchors | Offsets | Alignment | x0,y0 | x1,y1 | 宽×高 |
|---|---|---|---|---|---|---|---|---|---|---|
| /CanvasPanel_38/VerticalBox_0/CanvasPanel_2/ScaleBox_0/CanvasPanel_98/SizeBox_1/Image_Content | Image | T_UI_Settings_img_Mobile_operate_1_PNG | /Game/__ExternalPaper2dAtlas__/SaveAtlas/UI/SysSettings/Texture/__Frames/T_UI_Settings_img_Mobile_operate_1_PNG.T_UI_Settings_img_Mobile_operate_1_PNG |  | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 0.0, 0.0 | 0.0×0.0 |
| /CanvasPanel_38/VerticalBox_0/CanvasPanel_2/ScaleBox_0/CanvasPanel_98/Frame | Image | T_UI_Settings_img_Mobile_kuang_PNG | /Game/__ExternalPaper2dAtlas__/SaveAtlas/UI/SysSettings/Texture/__Frames/T_UI_Settings_img_Mobile_kuang_PNG.T_UI_Settings_img_Mobile_kuang_PNG | 1 | Min(0.500,0.500) Max(0.500,0.500) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.500 Y:0.500 | 960.0, 540.0 | 960.0, 540.0 | 0.0×0.0 |
| /CanvasPanel_38/VerticalBox_0/CanvasPanel_2/ScaleBox_0/CanvasPanel_98/Selected | Image | T_UI_Settings_img_Mobile_selected_PNG | /Game/__ExternalPaper2dAtlas__/SaveAtlas/UI/SysSettings/Texture/__Frames/T_UI_Settings_img_Mobile_selected_PNG.T_UI_Settings_img_Mobile_selected_PNG | 2 | Min(0.000,0.000) Max(1.000,1.000) | L:-14.000 T:-13.000 R:-14.000 B:-14.000 | X:0.000 Y:0.000 | -14.0, -13.0 | 1906.0, 1066.0 | 1920.0×1079.0 |
| /CanvasPanel_38/VerticalBox_0/CanvasPanel_2/ScaleBox_0/CanvasPanel_98/Hover | Image | T_UI_Settings_img_Mobile_hover_PNG | /Game/__ExternalPaper2dAtlas__/SaveAtlas/UI/SysSettings/Texture/__Frames/T_UI_Settings_img_Mobile_hover_PNG.T_UI_Settings_img_Mobile_hover_PNG | 3 | Min(0.000,0.000) Max(1.000,1.000) | L:-14.000 T:-13.000 R:-14.000 B:-14.000 | X:0.000 Y:0.000 | -14.0, -13.0 | 1906.0, 1066.0 | 1920.0×1079.0 |

> 共 4 个带贴图 Image 节点。

## WBP_SysSettings_LanguageResource_Item（语言资源项）

> 源文件：`X6Game/Content/UI/SysSettings/WidgetBp/WBP_SysSettings_LanguageResource_Item.uasset`　|　WidgetTree 节点数：17

| 层级路径 | 类名 | 素材 | 素材资源路径 | zorder | Anchors | Offsets | Alignment | x0,y0 | x1,y1 | 宽×高 |
|---|---|---|---|---|---|---|---|---|---|---|
| /CanvasPanel_1/Normal/Image_0 | Image | T_UI_Settings_bg_option_01_PNG | /Game/__ExternalPaper2dAtlas__/SaveAtlas/UI/SysSettings/Texture/__Frames/T_UI_Settings_bg_option_01_PNG.T_UI_Settings_bg_option_01_PNG |  | Min(0.000,0.000) Max(1.000,1.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 1920.0, 1080.0 | 1920.0×1080.0 |
| /CanvasPanel_1/Select/Image | Image | T_UI_Settings_bg_option_01_h_PNG | /Game/__ExternalPaper2dAtlas__/SaveAtlas/UI/SysSettings/Texture/__Frames/T_UI_Settings_bg_option_01_h_PNG.T_UI_Settings_bg_option_01_h_PNG |  | Min(0.000,0.000) Max(1.000,1.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 1920.0, 1080.0 | 1920.0×1080.0 |
| /CanvasPanel_1/Select/In_Use | Image | T_UI_common_icon_hook_01 | /Game/UI/Common/Textures/T_UI_common_icon_hook_01.T_UI_common_icon_hook_01 |  | Min(0.000,0.500) Max(0.000,0.500) | L:24.266 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.500 | 24.3, 540.0 | 0.0, 540.0 | -24.3×0.0 |
| /CanvasPanel_1/Hover/Img_Hover | Image | T_UI_common_btn_option_h | /Game/UI/Common/Textures/T_UI_common_btn_option_h.T_UI_common_btn_option_h |  | Min(0.000,0.000) Max(1.000,1.000) | L:-1.000 T:2.000 R:-7.000 B:2.000 | X:0.000 Y:0.000 | -1.0, 2.0 | 1913.0, 1082.0 | 1914.0×1080.0 |
| /CanvasPanel_1/Btn_hover | Image | T_UI_common_btn_back_h | /Game/UI/Common/Textures/T_UI_common_btn_back_h.T_UI_common_btn_back_h | 3 | Min(1.000,0.500) Max(1.000,0.500) | L:-12.381 T:-0.184 R:82.000 B:82.000 | X:1.000 Y:0.500 | 1813.2, 498.7 | 1907.6, 580.9 | 94.4×82.2 |

> 共 5 个带贴图 Image 节点。

## WBP_SysSettings_LightAdjust（亮度调整）

> 源文件：`X6Game/Content/UI/SysSettings/WidgetBp/WBP_SysSettings_LightAdjust.uasset`　|　WidgetTree 节点数：24

| 层级路径 | 类名 | 素材 | 素材资源路径 | zorder | Anchors | Offsets | Alignment | x0,y0 | x1,y1 | 宽×高 |
|---|---|---|---|---|---|---|---|---|---|---|
| /CanvasPanel_86/ScaleBox_0/HorizontalBox_39/Image_Left | Image | MI_UI_ColorGradingLUT | /DynamicEnvironmentSystem/Effects/ColorCorrectionRegion/Materials/MI_UI_ColorGradingLUT.MI_UI_ColorGradingLUT |  | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 0.0, 0.0 | 0.0×0.0 |
| /CanvasPanel_86/ScaleBox_0/HorizontalBox_39/Image_Middle | Image | MI_UI_ColorGradingLUT | /DynamicEnvironmentSystem/Effects/ColorCorrectionRegion/Materials/MI_UI_ColorGradingLUT.MI_UI_ColorGradingLUT |  | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 0.0, 0.0 | 0.0×0.0 |
| /CanvasPanel_86/ScaleBox_0/HorizontalBox_39/Image_Right | Image | MI_UI_ColorGradingLUT | /DynamicEnvironmentSystem/Effects/ColorCorrectionRegion/Materials/MI_UI_ColorGradingLUT.MI_UI_ColorGradingLUT |  | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 0.0, 0.0 | 0.0×0.0 |
| /CanvasPanel_86/Title/Title_Bg | Image | T_UI_tower_img_buff_title_03 | /Game/UI/SysDressTower/Textures/T_UI_tower_img_buff_title_03.T_UI_tower_img_buff_title_03 |  | Min(0.500,0.500) Max(0.500,0.500) | L:-388.000 T:-72.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 572.0, 468.0 | 960.0, 540.0 | 388.0×72.0 |
| /CanvasPanel_86/HorizontalBox_163/Image_LineLeft | Image | T_UI_goods_img_ornament_PNG | /Game/__ExternalPaper2dAtlas__/SaveAtlas/UI/SysSettings/Texture/__Frames/T_UI_goods_img_ornament_PNG.T_UI_goods_img_ornament_PNG |  | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 0.0, 0.0 | 0.0×0.0 |
| /CanvasPanel_86/HorizontalBox_163/Image_LineRight | Image | T_UI_goods_img_ornament_PNG | /Game/__ExternalPaper2dAtlas__/SaveAtlas/UI/SysSettings/Texture/__Frames/T_UI_goods_img_ornament_PNG.T_UI_goods_img_ornament_PNG |  | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 0.0, 0.0 | 0.0×0.0 |
| /CanvasPanel_86/Progressbar/BG_Img | Image | T_UI_mball_slider_line_01 | /Game/UI/SysEffectBall/Texture/T_UI_mball_slider_line_01.T_UI_mball_slider_line_01 |  | Min(0.000,0.000) Max(1.000,0.000) | L:27.000 T:27.644 R:27.000 B:10.000 | X:0.500 Y:0.500 | -933.0, 36.5 | 987.0, 18.8 | 1920.0×-17.6 |
| /CanvasPanel_86/Progressbar/Image_MiddleLine | Image | T_UI_bright_img_line | /Game/UI/SysSettings/Texture/T_UI_bright_img_line.T_UI_bright_img_line |  | Min(0.500,0.500) Max(0.500,0.500) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.500 Y:0.500 | 960.0, 540.0 | 960.0, 540.0 | 0.0×0.0 |

> 共 8 个带贴图 Image 节点。

## WBP_Setting_DropList（下拉列表）

> 源文件：`X6Game/Content/UI/SysSettings/WidgetBp/WBP_Setting_DropList.uasset`　|　WidgetTree 节点数：7

| 层级路径 | 类名 | 素材 | 素材资源路径 | zorder | Anchors | Offsets | Alignment | x0,y0 | x1,y1 | 宽×高 |
|---|---|---|---|---|---|---|---|---|---|---|
| /CanvasPanel_24/PanelList/bg | Image | T_UI_Common_OrderBg | /Game/UI/Common/Textures/T_UI_Common_OrderBg.T_UI_Common_OrderBg |  | Min(0.000,0.000) Max(1.000,1.000) | L:0.000 T:0.000 R:0.000 B:-20.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 1920.0, 1060.0 | 1920.0×1060.0 |

> 共 1 个带贴图 Image 节点。

## WBP_Setting_DropList_Item（下拉列表项）

> 源文件：`X6Game/Content/UI/SysSettings/WidgetBp/WBP_Setting_DropList_Item.uasset`　|　WidgetTree 节点数：9

| 层级路径 | 类名 | 素材 | 素材资源路径 | zorder | Anchors | Offsets | Alignment | x0,y0 | x1,y1 | 宽×高 |
|---|---|---|---|---|---|---|---|---|---|---|
| /CanvasPanel_0/BtnSelect/CanvasPanel_2/PanelSelect/SelectBg | Image | T_UI_Settings_btn_Mobile_options | /Game/UI/SysSettings/Texture/T_UI_Settings_btn_Mobile_options.T_UI_Settings_btn_Mobile_options |  | Min(0.000,0.000) Max(1.000,1.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 1920.0, 1080.0 | 1920.0×1080.0 |
| /CanvasPanel_0/Image_Hover | Image | T_UI_sort_btn_content_h | /Game/UI/Common/Textures/T_UI_sort_btn_content_h.T_UI_sort_btn_content_h |  | Min(0.000,0.000) Max(1.000,0.000) | L:0.000 T:0.000 R:0.000 B:62.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 1920.0, 62.0 | 1920.0×62.0 |

> 共 2 个带贴图 Image 节点。

