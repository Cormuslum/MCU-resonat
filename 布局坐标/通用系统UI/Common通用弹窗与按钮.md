# 《无限暖暖》通用系统 UI 布局坐标表（通用弹窗与按钮）

> 数据来源：游戏解包 .uasset（UMG WidgetBlueprint），经 CUE4Parse + usmap 反射反序列化 WidgetTree 获得。

> 坐标系：以 1920×1080 为设计分辨率。坐标为绝对像素 (x0,y0,x1,y1,宽,高)，x0,y0 为左上角，x1,y1 为右下角。负值/超出屏幕表示元素延伸到屏幕外（游戏内正常现象）。

> zorder 表示同父级下的叠放顺序（越小越靠底）。未列出的元素 zorder 默认 0。

> 说明：此表为 UI 树中带贴图/材质的 Image 类节点；TextBlock、布局容器等未贴图节点不在表中。Anchors/Offsets/Alignment 为原始布局参数（3 位小数），x0,y0/x1,y1/宽×高 为换算后像素（1 位小数）。


## WBP_Common_BlackScreen_Mask（黑屏遮罩）

> 源文件：`X6Game/Content/UI/Common/WidgetBp/Wnd/WBP_Common_BlackScreen_Mask.uasset`　|　WidgetTree 节点数：2

| 层级路径 | 类名 | 素材 | 素材资源路径 | zorder | Anchors | Offsets | Alignment | x0,y0 | x1,y1 | 宽×高 |
|---|---|---|---|---|---|---|---|---|---|---|
| /CanvasPanel_1/Image_BgMask_Black | Image |  |  | 1 | Min(0.000,0.000) Max(1.000,1.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 1920.0, 1080.0 | 1920.0×1080.0 |

> 共 1 个带贴图 Image 节点。

## WBP_ClickClose_Tip（点击关闭提示）

> 源文件：`X6Game/Content/UI/Common/WidgetBp/Wnd/WBP_ClickClose_Tip.uasset`　|　WidgetTree 节点数：7

| 层级路径 | 类名 | 素材 | 素材资源路径 | zorder | Anchors | Offsets | Alignment | x0,y0 | x1,y1 | 宽×高 |
|---|---|---|---|---|---|---|---|---|---|---|
| /CanvasPanel_1/Image_BgMask_Black | Image |  |  | 1 | Min(0.000,0.000) Max(1.000,1.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 1920.0, 1080.0 | 1920.0×1080.0 |
| /CanvasPanel_1/CanvasPanel_ClickClose/CanvasPanel_Text/Image_TextBg | Image | T_UI_common_img_textbase_01 | /Game/UI/Common/Textures/T_UI_common_img_textbase_01.T_UI_common_img_textbase_01 |  | Min(0.000,0.500) Max(1.000,0.500) | L:-24.000 T:0.000 R:-24.000 B:56.000 | X:0.000 Y:0.500 | -24.0, 512.0 | 1896.0, 568.0 | 1920.0×56.0 |

> 共 2 个带贴图 Image 节点。

## WBP_Common_MessageBox_Wnd（通用消息弹窗）

> 源文件：`X6Game/Content/UI/Common/WidgetBp/Wnd/WBP_Common_MessageBox_Wnd.uasset`　|　WidgetTree 节点数：18

| 层级路径 | 类名 | 素材 | 素材资源路径 | zorder | Anchors | Offsets | Alignment | x0,y0 | x1,y1 | 宽×高 |
|---|---|---|---|---|---|---|---|---|---|---|

> 共 0 个带贴图 Image 节点。

## WBP_Common_Wnd_Bg_L（大窗口背景）

> 源文件：`X6Game/Content/UI/Common/WidgetBp/Wnd/WBP_Common_Wnd_Bg_L.uasset`　|　WidgetTree 节点数：11

| 层级路径 | 类名 | 素材 | 素材资源路径 | zorder | Anchors | Offsets | Alignment | x0,y0 | x1,y1 | 宽×高 |
|---|---|---|---|---|---|---|---|---|---|---|
| /CanvasPanel_40/Fx_Bg_1 | Image | T_UI_common_img_window_bg_02_line | /Game/UI/Common/Textures/T_UI_common_img_window_bg_02_line.T_UI_common_img_window_bg_02_line |  | Min(0.000,0.000) Max(1.000,1.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 1920.0, 1080.0 | 1920.0×1080.0 |
| /CanvasPanel_40/Fx_Bg | Image | MI_UI_Wnd_Edge_01 | /Game/UI/Common/Material/MI_UI_Wnd_Edge_01.MI_UI_Wnd_Edge_01 |  | Min(0.000,0.000) Max(1.000,1.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 1920.0, 1080.0 | 1920.0×1080.0 |
| /CanvasPanel_40/Bg | Image | T_UI_common_img_window_bg_02 | /Game/UI/Common/Textures/T_UI_common_img_window_bg_02.T_UI_common_img_window_bg_02 |  | Min(0.000,0.000) Max(1.000,1.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 1920.0, 1080.0 | 1920.0×1080.0 |
| /CanvasPanel_40/TitleBar/Title_Bg | Image | MI_UI_Wnd_TitleBg_02 | /Game/UI/Common/Material/MI_UI_Wnd_TitleBg_02.MI_UI_Wnd_TitleBg_02 |  | Min(0.000,0.000) Max(1.000,0.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.500 Y:0.000 | -960.0, 0.0 | 960.0, 0.0 | 1920.0×0.0 |
| /CanvasPanel_40/CanvasPanel_Money/currency_bg | Image | T_UI_common_plusbg_n | /Game/UI/Common/Textures/T_UI_common_plusbg_n.T_UI_common_plusbg_n |  | Min(0.000,0.000) Max(1.000,1.000) | L:-6.000 T:-4.000 R:-2.000 B:-4.000 | X:0.000 Y:0.500 | -6.0, -544.0 | 1918.0, 536.0 | 1924.0×1080.0 |

> 共 5 个带贴图 Image 节点。

## WBP_Common_Wnd_Bg_Base（窗口背景基座）

> 源文件：`X6Game/Content/UI/Common/WidgetBp/Wnd/WBP_Common_Wnd_Bg_Base.uasset`　|　WidgetTree 节点数：1

| 层级路径 | 类名 | 素材 | 素材资源路径 | zorder | Anchors | Offsets | Alignment | x0,y0 | x1,y1 | 宽×高 |
|---|---|---|---|---|---|---|---|---|---|---|

> 共 0 个带贴图 Image 节点。

## WBP_Common_Wnd_Bg_S（小窗口背景）

> 源文件：`X6Game/Content/UI/Common/WidgetBp/Wnd/WBP_Common_Wnd_Bg_S.uasset`　|　WidgetTree 节点数：18

| 层级路径 | 类名 | 素材 | 素材资源路径 | zorder | Anchors | Offsets | Alignment | x0,y0 | x1,y1 | 宽×高 |
|---|---|---|---|---|---|---|---|---|---|---|
| /CanvasPanel_40/Fx_Bg_1 | Image | T_UI_common_img_window_bg_01_line | /Game/UI/Common/Textures/T_UI_common_img_window_bg_01_line.T_UI_common_img_window_bg_01_line |  | Min(0.000,0.000) Max(1.000,1.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 1920.0, 1080.0 | 1920.0×1080.0 |
| /CanvasPanel_40/Fx_Bg | Image | MI_UI_Wnd_Edge_02 | /Game/UI/Common/Material/MI_UI_Wnd_Edge_02.MI_UI_Wnd_Edge_02 |  | Min(0.000,0.000) Max(1.000,1.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 1920.0, 1080.0 | 1920.0×1080.0 |
| /CanvasPanel_40/Bg | Image | T_UI_common_img_window_bg_01 | /Game/UI/Common/Textures/T_UI_common_img_window_bg_01.T_UI_common_img_window_bg_01 |  | Min(0.000,0.000) Max(1.000,1.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 1920.0, 1080.0 | 1920.0×1080.0 |
| /CanvasPanel_40/WidgetSwitcher_1/TitleBar/Title_Bg | Image | MI_UI_Wnd_TitleBg_01 | /Game/UI/Common/Material/MI_UI_Wnd_TitleBg_01.MI_UI_Wnd_TitleBg_01 |  | Min(0.000,0.000) Max(1.000,0.000) | L:0.000 T:22.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 22.0 | 1920.0, 0.0 | 1920.0×-22.0 |
| /CanvasPanel_40/CanvasPanel_Money/currency_bg | Image | T_UI_common_plusbg_n | /Game/UI/Common/Textures/T_UI_common_plusbg_n.T_UI_common_plusbg_n |  | Min(0.000,0.000) Max(1.000,1.000) | L:-6.000 T:-4.000 R:-2.000 B:-4.000 | X:0.000 Y:0.500 | -6.0, -544.0 | 1918.0, 536.0 | 1924.0×1080.0 |

> 共 5 个带贴图 Image 节点。

## WBP_Common_Wnd_ScaleLocate_Large（大尺寸定位缩放窗口）

> 源文件：`X6Game/Content/UI/Common/WidgetBp/Wnd/WBP_Common_Wnd_ScaleLocate_Large.uasset`　|　WidgetTree 节点数：5

| 层级路径 | 类名 | 素材 | 素材资源路径 | zorder | Anchors | Offsets | Alignment | x0,y0 | x1,y1 | 宽×高 |
|---|---|---|---|---|---|---|---|---|---|---|

> 共 0 个带贴图 Image 节点。

## WBP_Common_Wnd_ScaleLocate_Middle（中尺寸定位缩放窗口）

> 源文件：`X6Game/Content/UI/Common/WidgetBp/Wnd/WBP_Common_Wnd_ScaleLocate_Middle.uasset`　|　WidgetTree 节点数：5

| 层级路径 | 类名 | 素材 | 素材资源路径 | zorder | Anchors | Offsets | Alignment | x0,y0 | x1,y1 | 宽×高 |
|---|---|---|---|---|---|---|---|---|---|---|

> 共 0 个带贴图 Image 节点。

## WBP_Common_BlockMask（通用阻挡遮罩）

> 源文件：`X6Game/Content/UI/Common/WidgetBp/WBP_Common_BlockMask.uasset`　|　WidgetTree 节点数：1

| 层级路径 | 类名 | 素材 | 素材资源路径 | zorder | Anchors | Offsets | Alignment | x0,y0 | x1,y1 | 宽×高 |
|---|---|---|---|---|---|---|---|---|---|---|

> 共 0 个带贴图 Image 节点。

## WBP_UI_Common_KeyTips（通用按键提示）

> 源文件：`X6Game/Content/UI/Common/WidgetBp/WBP_UI_Common_KeyTips.uasset`　|　WidgetTree 节点数：6

| 层级路径 | 类名 | 素材 | 素材资源路径 | zorder | Anchors | Offsets | Alignment | x0,y0 | x1,y1 | 宽×高 |
|---|---|---|---|---|---|---|---|---|---|---|

> 共 0 个带贴图 Image 节点。

## WBP_UI_Common_KeyTips_Entry（按键提示条目）

> 源文件：`X6Game/Content/UI/Common/WidgetBp/WBP_UI_Common_KeyTips_Entry.uasset`　|　WidgetTree 节点数：2

| 层级路径 | 类名 | 素材 | 素材资源路径 | zorder | Anchors | Offsets | Alignment | x0,y0 | x1,y1 | 宽×高 |
|---|---|---|---|---|---|---|---|---|---|---|

> 共 0 个带贴图 Image 节点。

## WBP_UI_Common_KeyTips_PC（PC端通用按键提示）

> 源文件：`X6Game/Content/UI/Common/PC/WidgetBp/WBP_UI_Common_KeyTips_PC.uasset`　|　WidgetTree 节点数：11

| 层级路径 | 类名 | 素材 | 素材资源路径 | zorder | Anchors | Offsets | Alignment | x0,y0 | x1,y1 | 宽×高 |
|---|---|---|---|---|---|---|---|---|---|---|
| /InvalidationBox_0/WidgetSwitcher_Key/Label/ControlButtonBg_Img | Image | T_UI_tipbg_01 | /Game/UI/Common/Textures/T_UI_tipbg_01.T_UI_tipbg_01 |  | Min(0.000,0.000) Max(1.000,1.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 1920.0, 1080.0 | 1920.0×1080.0 |
| /InvalidationBox_0/WidgetSwitcher_Key/Icon/Image_Icon | Image | T_UI_KeyTips_Left_Mouse | /Game/UI/Common/Textures/T_UI_KeyTips_Left_Mouse.T_UI_KeyTips_Left_Mouse |  | Min(0.500,0.500) Max(0.500,0.500) | L:0.000 T:0.000 R:0.000 B:26.800 | X:0.500 Y:0.500 | 960.0, 526.6 | 960.0, 553.4 | 0.0×26.8 |
| /InvalidationBox_0/WidgetSwitcher_Key/Space_Press/Progress_bg | Image | T_UI_KeyTips_Space_bar | /Game/UI/Common/Textures/KeyTips/T_UI_KeyTips_Space_bar.T_UI_KeyTips_Space_bar |  | Min(0.000,0.000) Max(1.000,1.000) | L:-3.000 T:1.000 R:-3.000 B:2.000 | X:0.000 Y:0.000 | -3.0, 1.0 | 1917.0, 1082.0 | 1920.0×1081.0 |
| /InvalidationBox_0/WidgetSwitcher_Key/Space_Press/Progress_bar | Image | MI_UI_Keytips_Progress | /Game/UI/Common/PC/Material/MI_UI_Keytips_Progress.MI_UI_Keytips_Progress |  | Min(0.000,0.000) Max(1.000,1.000) | L:-4.438 T:-0.241 R:-3.977 B:0.087 | X:0.000 Y:0.000 | -4.4, -0.2 | 1916.0, 1080.1 | 1920.5×1080.3 |
| /InvalidationBox_0/WidgetSwitcher_Key/Space_Press/Img_Icon | Image | T_UI_KeyTips_Space | /Game/UI/Common/Textures/T_UI_KeyTips_Space.T_UI_KeyTips_Space |  | Min(0.500,0.500) Max(0.500,0.500) | L:0.000 T:0.000 R:0.000 B:38.000 | X:0.500 Y:0.500 | 960.0, 521.0 | 960.0, 559.0 | 0.0×38.0 |

> 共 5 个带贴图 Image 节点。

## WBP_UI_Common_MultiKeyTips_PC（PC端多按键提示）

> 源文件：`X6Game/Content/UI/Common/PC/WidgetBp/WBP_UI_Common_MultiKeyTips_PC.uasset`　|　WidgetTree 节点数：2

| 层级路径 | 类名 | 素材 | 素材资源路径 | zorder | Anchors | Offsets | Alignment | x0,y0 | x1,y1 | 宽×高 |
|---|---|---|---|---|---|---|---|---|---|---|

> 共 0 个带贴图 Image 节点。

## WBP_Common_Tooltip（通用悬浮提示）

> 源文件：`X6Game/Content/UI/Common/PC/WidgetBp/WBP_Common_Tooltip.uasset`　|　WidgetTree 节点数：43

| 层级路径 | 类名 | 素材 | 素材资源路径 | zorder | Anchors | Offsets | Alignment | x0,y0 | x1,y1 | 宽×高 |
|---|---|---|---|---|---|---|---|---|---|---|
| /CanvasPanel_0/Tips_Panel/Image_1 | Image | T_UI_design_img_show_shadow | /Game/UI/SysDrawDesining/Textures/T_UI_design_img_show_shadow.T_UI_design_img_show_shadow |  | Min(0.000,0.000) Max(1.000,1.000) | L:-25.000 T:0.000 R:-25.000 B:-64.971 | X:0.000 Y:0.000 | -25.0, 0.0 | 1895.0, 1015.0 | 1920.0×1015.0 |
| /CanvasPanel_0/Tips_Panel/Image | Image | T_UI_desginimg_popup_currency | /Game/UI/Common/Textures/T_UI_desginimg_popup_currency.T_UI_desginimg_popup_currency |  | Min(0.000,0.000) Max(1.000,1.000) | L:-5.000 T:0.000 R:-7.000 B:-70.800 | X:0.000 Y:0.000 | -5.0, 0.0 | 1913.0, 1009.2 | 1918.0×1009.2 |
| /CanvasPanel_0/Tips_Panel/Image_170 | Image | T_UI_desgin_img_popup__material | /Game/UI/Common/Textures/T_UI_desgin_img_popup__material.T_UI_desgin_img_popup__material |  | Min(0.000,0.000) Max(1.000,1.000) | L:3.000 T:7.550 R:0.600 B:-37.050 | X:0.000 Y:0.000 | 3.0, 7.5 | 1920.6, 1042.9 | 1917.6×1035.4 |
| /CanvasPanel_0/Tips_Panel/Image_6 | Image | T_UI_desginimg_popup_currency_2 | /Game/UI/Common/Textures/T_UI_desginimg_popup_currency_2.T_UI_desginimg_popup_currency_2 |  | Min(1.000,0.000) Max(1.000,0.000) | L:0.000 T:7.333 R:461.500 B:280.248 | X:1.000 Y:0.000 | 1458.5, 7.3 | 1920.0, 280.2 | 461.5×272.9 |
| /CanvasPanel_0/Tips_Panel/SizeBox_5/VerticalBox_104/Title/Switcher_Quality/Title_Black | Image | T_UI_desgin_popup_black | /Game/UI/Common/Textures/T_UI_desgin_popup_black.T_UI_desgin_popup_black |  | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 0.0, 0.0 | 0.0×0.0 |
| /CanvasPanel_0/Tips_Panel/SizeBox_5/VerticalBox_104/Title/Switcher_Quality/Title_Brown | Image | T_UI_desgin_popup_brown | /Game/UI/Common/Textures/T_UI_desgin_popup_brown.T_UI_desgin_popup_brown |  | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 0.0, 0.0 | 0.0×0.0 |
| /CanvasPanel_0/Tips_Panel/SizeBox_5/VerticalBox_104/Title/Switcher_Quality/Title_Blue | Image | T_UI_desgin_popup_blue | /Game/UI/Common/Textures/T_UI_desgin_popup_blue.T_UI_desgin_popup_blue |  | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 0.0, 0.0 | 0.0×0.0 |
| /CanvasPanel_0/Tips_Panel/SizeBox_5/VerticalBox_104/Title/Switcher_Quality/Title_Purple | Image | T_UI_desgin_popup_purple | /Game/UI/Common/Textures/T_UI_desgin_popup_purple.T_UI_desgin_popup_purple |  | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 0.0, 0.0 | 0.0×0.0 |
| /CanvasPanel_0/Tips_Panel/SizeBox_5/VerticalBox_104/Title/Switcher_Quality/Title_Pink | Image | T_UI_desgin_popup_pink | /Game/UI/Common/Textures/T_UI_desgin_popup_pink.T_UI_desgin_popup_pink |  | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 0.0, 0.0 | 0.0×0.0 |
| /CanvasPanel_0/Tips_Panel/SizeBox_5/VerticalBox_104/Title/Limit_Time/Time_Image | Image | T_UI_desgin_icon_forever | /Game/UI/Common/Textures/T_UI_desgin_icon_forever.T_UI_desgin_icon_forever |  | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 0.0, 0.0 | 0.0×0.0 |
| /CanvasPanel_0/Tips_Panel/SizeBox_5/VerticalBox_104/CanvasPanel/Icon_Item | Image | T_Icon_clothes_S0008D | /Game/UI/Image/IconClothes/T_Icon_clothes_S0008D.T_Icon_clothes_S0008D |  | Min(0.000,0.000) Max(0.000,0.000) | L:320.208 T:-12.332 R:140.000 B:140.000 | X:0.000 Y:0.000 | 320.2, -12.3 | 140.0, 140.0 | -180.2×152.3 |
| /CanvasPanel_0/Tips_Panel/SizeBox_5/VerticalBox_104/CanvasPanel/Num_Panel/Image_122 | Image | T_UI_common_img_item_tips_quantity_bg | /Game/UI/Common/Textures/T_UI_common_img_item_tips_quantity_bg.T_UI_common_img_item_tips_quantity_bg |  | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:0.000 R:0.000 B:20.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 0.0, 20.0 | 0.0×20.0 |
| /CanvasPanel_0/Tips_Panel/SizeBox_5/VerticalBox_104/CanvasPanel/ItemType/SizeBox_2/MinorTypeIcon | Image | T_UI_common_bag_icon_fish_PNG | /Game/__ExternalPaper2dAtlas__/SaveAtlas/UI/SysBag/Textures/__Frames/T_UI_common_bag_icon_fish_PNG.T_UI_common_bag_icon_fish_PNG |  | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 0.0, 0.0 | 0.0×0.0 |
| /CanvasPanel_0/Tips_Panel/SizeBox_5/VerticalBox_104/CanvasPanel/ItemType/Switcher_TypeBg/Image_Black | Image | T_UI_Bag_InfoPanel_QualityBG_PNG | /Game/__ExternalPaper2dAtlas__/SaveAtlas/UI/SysBag/Textures/__Frames/T_UI_Bag_InfoPanel_QualityBG_PNG.T_UI_Bag_InfoPanel_QualityBG_PNG |  | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 0.0, 0.0 | 0.0×0.0 |
| /CanvasPanel_0/Tips_Panel/SizeBox_5/VerticalBox_104/CanvasPanel/ItemType/Switcher_TypeBg/Image_Brown | Image | T_UI_Bag_InfoPanel_QualityBG_PNG | /Game/__ExternalPaper2dAtlas__/SaveAtlas/UI/SysBag/Textures/__Frames/T_UI_Bag_InfoPanel_QualityBG_PNG.T_UI_Bag_InfoPanel_QualityBG_PNG |  | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 0.0, 0.0 | 0.0×0.0 |
| /CanvasPanel_0/Tips_Panel/SizeBox_5/VerticalBox_104/CanvasPanel/ItemType/Switcher_TypeBg/Image_Blue | Image | T_UI_Bag_InfoPanel_QualityBG_PNG | /Game/__ExternalPaper2dAtlas__/SaveAtlas/UI/SysBag/Textures/__Frames/T_UI_Bag_InfoPanel_QualityBG_PNG.T_UI_Bag_InfoPanel_QualityBG_PNG |  | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 0.0, 0.0 | 0.0×0.0 |
| /CanvasPanel_0/Tips_Panel/SizeBox_5/VerticalBox_104/CanvasPanel/ItemType/Switcher_TypeBg/Image_Purple | Image | T_UI_Bag_InfoPanel_QualityBG_PNG | /Game/__ExternalPaper2dAtlas__/SaveAtlas/UI/SysBag/Textures/__Frames/T_UI_Bag_InfoPanel_QualityBG_PNG.T_UI_Bag_InfoPanel_QualityBG_PNG |  | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 0.0, 0.0 | 0.0×0.0 |
| /CanvasPanel_0/Tips_Panel/SizeBox_5/VerticalBox_104/CanvasPanel/ItemType/Switcher_TypeBg/Image_Pink | Image | T_UI_Bag_InfoPanel_QualityBG_PNG | /Game/__ExternalPaper2dAtlas__/SaveAtlas/UI/SysBag/Textures/__Frames/T_UI_Bag_InfoPanel_QualityBG_PNG.T_UI_Bag_InfoPanel_QualityBG_PNG |  | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 0.0, 0.0 | 0.0×0.0 |
| /CanvasPanel_0/Tips_Panel/SizeBox_5/VerticalBox_104/AbilityInfo/Image_167 | Image | T_UI_common_section_end_n_02 | /Game/UI/Common/Textures/T_UI_common_section_end_n_02.T_UI_common_section_end_n_02 |  | Min(0.000,0.000) Max(0.000,0.000) | L:2.383 T:19.215 R:445.071 B:48.000 | X:0.000 Y:0.000 | 2.4, 19.2 | 445.1, 48.0 | 442.7×28.8 |
| /CanvasPanel_0/Tips_Panel/SizeBox_5/VerticalBox_104/AbilityInfo/Ability_Icon | Image | T_UI_skill_btn_fishing | /Game/UI/SysSkill/Resource/T_UI_skill_btn_fishing.T_UI_skill_btn_fishing |  | Min(0.000,0.000) Max(0.000,0.000) | L:16.000 T:20.000 R:45.000 B:45.000 | X:0.000 Y:0.000 | 16.0, 20.0 | 45.0, 45.0 | 29.0×25.0 |

> 共 20 个带贴图 Image 节点。

## WBP_UI_ToolTips（悬浮提示框）

> 源文件：`X6Game/Content/UI/Common/WidgetBp/WBP_UI_ToolTips.uasset`　|　WidgetTree 节点数：2

| 层级路径 | 类名 | 素材 | 素材资源路径 | zorder | Anchors | Offsets | Alignment | x0,y0 | x1,y1 | 宽×高 |
|---|---|---|---|---|---|---|---|---|---|---|

> 共 0 个带贴图 Image 节点。

## WBP_UI_InfoTooltip（信息提示框）

> 源文件：`X6Game/Content/UI/Common/WidgetBp/WBP_UI_InfoTooltip.uasset`　|　WidgetTree 节点数：220

| 层级路径 | 类名 | 素材 | 素材资源路径 | zorder | Anchors | Offsets | Alignment | x0,y0 | x1,y1 | 宽×高 |
|---|---|---|---|---|---|---|---|---|---|---|
| /InfoTooltip/bg | Image | T_UI_common_img_tips_bg_3_PNG | /Game/__ExternalPaper2dAtlas__/SaveAtlas/UI/Common/Textures/Tooltip/__Frames/T_UI_common_img_tips_bg_3_PNG.T_UI_common_img_tips_bg_3_PNG |  | Min(0.000,0.000) Max(0.000,1.000) | L:-0.200 T:-6.000 R:485.000 B:-23.659 | X:0.000 Y:0.000 | -0.2, -6.0 | 485.0, 1056.3 | 485.2×1062.3 |
| /InfoTooltip/Info_Item/Switcher_Quality/Image_none | Image | T_UI_common_img_tips_bg_nomal_PNG | /Game/__ExternalPaper2dAtlas__/SaveAtlas/UI/Common/Textures/Tooltip/__Frames/T_UI_common_img_tips_bg_nomal_PNG.T_UI_common_img_tips_bg_nomal_PNG |  | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 0.0, 0.0 | 0.0×0.0 |
| /InfoTooltip/Info_Item/Switcher_Quality/Image_Brown | Image | T_UI_common_img_tips_bg_brown_PNG | /Game/__ExternalPaper2dAtlas__/SaveAtlas/UI/Common/Textures/Tooltip/__Frames/T_UI_common_img_tips_bg_brown_PNG.T_UI_common_img_tips_bg_brown_PNG |  | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 0.0, 0.0 | 0.0×0.0 |
| /InfoTooltip/Info_Item/Switcher_Quality/Image_Blue | Image | T_UI_common_img_tips_bg_blue_PNG | /Game/__ExternalPaper2dAtlas__/SaveAtlas/UI/Common/Textures/Tooltip/__Frames/T_UI_common_img_tips_bg_blue_PNG.T_UI_common_img_tips_bg_blue_PNG |  | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 0.0, 0.0 | 0.0×0.0 |
| /InfoTooltip/Info_Item/Switcher_Quality/Image_Purple | Image | T_UI_common_img_tips_bg_purple_PNG | /Game/__ExternalPaper2dAtlas__/SaveAtlas/UI/Common/Textures/Tooltip/__Frames/T_UI_common_img_tips_bg_purple_PNG.T_UI_common_img_tips_bg_purple_PNG |  | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 0.0, 0.0 | 0.0×0.0 |
| /InfoTooltip/Info_Item/Switcher_Quality/Image_Pink | Image | T_UI_common_img_tips_bg_pink_PNG | /Game/__ExternalPaper2dAtlas__/SaveAtlas/UI/Common/Textures/Tooltip/__Frames/T_UI_common_img_tips_bg_pink_PNG.T_UI_common_img_tips_bg_pink_PNG |  | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 0.0, 0.0 | 0.0×0.0 |
| /InfoTooltip/Info_Item/Switcher_Info_Top/Info_Top_Clothes/empty_pic | Image | T_UI_123 | /Game/UI/Common/Textures/T_UI_123.T_UI_123 |  | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 0.0, 0.0 | 0.0×0.0 |
| /InfoTooltip/Info_Item/Switcher_Info_Top/Info_Top_Clothes/TopBg_1 | Image | T_UI_common_img_tips_bg_1_PNG | /Game/__ExternalPaper2dAtlas__/SaveAtlas/UI/Common/Textures/Tooltip/__Frames/T_UI_common_img_tips_bg_1_PNG.T_UI_common_img_tips_bg_1_PNG | 1 | Min(0.000,0.000) Max(0.000,1.000) | L:0.000 T:0.000 R:470.000 B:-21.419 | X:0.000 Y:0.000 | 0.0, 0.0 | 470.0, 1058.6 | 470.0×1058.6 |
| /InfoTooltip/Info_Item/Switcher_Info_Top/Info_Top_Clothes/Dec_Texture_1/Image_Dec_Texture_1 | Image | T_UI_common_img_tips_bg_4_PNG | /Game/__ExternalPaper2dAtlas__/SaveAtlas/UI/Common/Textures/Tooltip/__Frames/T_UI_common_img_tips_bg_4_PNG.T_UI_common_img_tips_bg_4_PNG |  | Min(0.500,1.000) Max(0.500,1.000) | L:-241.872 T:-316.095 R:80.029 B:-31.276 | X:0.000 Y:0.000 | 718.1, 763.9 | 1040.0, 1048.7 | 321.9×284.8 |
| /InfoTooltip/Info_Item/Switcher_Info_Top/Info_Top_Clothes/Top_1/Image_TopLine_2 | Image | T_UI_common_img_line | /Game/UI/Common/Textures/Tooltip/T_UI_common_img_line.T_UI_common_img_line |  | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 0.0, 0.0 | 0.0×0.0 |
| /InfoTooltip/Info_Item/Switcher_Info_Top/Info_Top_Clothes/Top_1/Number_And_Level/Img_Line_6 | Image | T_UI_common_img_line_point_brown | /Game/UI/Common/Textures/Tooltip/T_UI_common_img_line_point_brown.T_UI_common_img_line_point_brown |  | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:29.690 R:448.000 B:7.000 | X:0.000 Y:0.000 | 0.0, 29.7 | 448.0, 7.0 | 448.0×-22.7 |
| /InfoTooltip/Info_Item/Switcher_Info_Top/Info_Top_Clothes/Top_1/Score/Quality_BG/Image_QualityBG_1 | Image | T_UI_dressup_tips_img_starbox_PNG | /Game/__ExternalPaper2dAtlas__/SaveAtlas/UI/SysClothes/Textures/__Frames/T_UI_dressup_tips_img_starbox_PNG.T_UI_dressup_tips_img_starbox_PNG |  | Min(0.000,0.500) Max(1.000,0.500) | L:-2.000 T:-16.000 R:0.000 B:32.000 | X:1.000 Y:0.000 | -1924.0, 524.0 | -2.0, 572.0 | 1922.0×48.0 |
| /InfoTooltip/Info_Item/Switcher_Info_Top/Info_Top_Clothes/Top_1/Score/Image_Frame | Image | T_UI_dressup_bg_showpic | /Game/UI/Common/Textures/T_UI_dressup_bg_showpic.T_UI_dressup_bg_showpic |  | Min(0.000,0.000) Max(0.000,0.000) | L:-2.000 T:5.000 R:214.000 B:290.000 | X:0.000 Y:0.000 | -2.0, 5.0 | 214.0, 290.0 | 216.0×285.0 |
| /InfoTooltip/Info_Item/Switcher_Info_Top/Info_Top_Clothes/Top_1/Score/Bg_Suit | Image | T_showpic_bg_clothes | /Game/UI/Common/Textures/T_showpic_bg_clothes.T_showpic_bg_clothes |  | Min(0.000,0.000) Max(0.000,0.000) | L:5.000 T:12.000 R:200.000 B:276.000 | X:0.000 Y:0.000 | 5.0, 12.0 | 200.0, 276.0 | 195.0×264.0 |
| /InfoTooltip/Info_Item/Switcher_Info_Top/Info_Top_Clothes/Top_1/Score/Show/Image_Show | Image | T_UI_123 | /Game/UI/Common/Textures/T_UI_123.T_UI_123 |  | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 0.0, 0.0 | 0.0×0.0 |
| /InfoTooltip/Info_Item/Switcher_Info_Top/Info_Top_Clothes/Top_1/TimeLimit_Switch/Img_Line_3 | Image | T_UI_common_img_line_point_brown | /Game/UI/Common/Textures/Tooltip/T_UI_common_img_line_point_brown.T_UI_common_img_line_point_brown |  | Min(0.000,0.000) Max(0.000,0.000) | L:2.000 T:0.000 R:448.000 B:7.000 | X:0.000 Y:0.000 | 2.0, 0.0 | 448.0, 7.0 | 446.0×7.0 |
| /InfoTooltip/Info_Item/Switcher_Info_Top/Info_Top_Clothes/Top_1/TimeLimit_Switch/Switch_Panel/SizeBox_9/ScaleBox_10/HorizontalBox_130/Image_Switch | Image | T_UI_dressup_icon_switchover_tips_PNG | /Game/__ExternalPaper2dAtlas__/SaveAtlas/UI/SysClothes/Textures/__Frames/T_UI_dressup_icon_switchover_tips_PNG.T_UI_dressup_icon_switchover_tips_PNG |  | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 0.0, 0.0 | 0.0×0.0 |
| /InfoTooltip/Info_Item/Switcher_Info_Top/Info_Top_Clothes/Top_1/TimeLimit_Clothes/Img_Line_5 | Image | T_UI_common_img_line_point_brown | /Game/UI/Common/Textures/Tooltip/T_UI_common_img_line_point_brown.T_UI_common_img_line_point_brown |  | Min(0.000,0.000) Max(0.000,0.000) | L:2.000 T:0.000 R:448.000 B:7.000 | X:0.000 Y:0.000 | 2.0, 0.0 | 448.0, 7.0 | 446.0×7.0 |
| /InfoTooltip/Info_Item/Switcher_Info_Top/Info_Top_Clothes/Top_1/TimeLimit_Clothes/Limit_Time_1/Time_Image_1 | Image | T_UI_common_icon_time_PNG | /Game/__ExternalPaper2dAtlas__/SaveAtlas/UI/Common/Textures/Tooltip/__Frames/T_UI_common_icon_time_PNG.T_UI_common_icon_time_PNG |  | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 0.0, 0.0 | 0.0×0.0 |
| /InfoTooltip/Info_Item/Switcher_Info_Top/Info_Top_Clothes/Top_1/DressTag_Panel_1/Img_Line_4 | Image | T_UI_common_img_line_point_brown | /Game/UI/Common/Textures/Tooltip/T_UI_common_img_line_point_brown.T_UI_common_img_line_point_brown |  | Min(0.000,0.000) Max(0.000,0.000) | L:2.000 T:0.000 R:448.000 B:7.000 | X:0.000 Y:0.000 | 2.0, 0.0 | 448.0, 7.0 | 446.0×7.0 |
| /InfoTooltip/Info_Item/Switcher_Info_Top/Info_Top_Item/TopBg | Image | T_UI_common_img_tips_bg_1_PNG | /Game/__ExternalPaper2dAtlas__/SaveAtlas/UI/Common/Textures/Tooltip/__Frames/T_UI_common_img_tips_bg_1_PNG.T_UI_common_img_tips_bg_1_PNG | 1 | Min(0.000,0.000) Max(0.000,1.000) | L:0.000 T:0.000 R:470.000 B:-21.419 | X:0.000 Y:0.000 | 0.0, 0.0 | 470.0, 1058.6 | 470.0×1058.6 |
| /InfoTooltip/Info_Item/Switcher_Info_Top/Info_Top_Item/Dec_Texture/Image_Dec_Texture | Image | T_UI_common_img_tips_bg_4_PNG | /Game/__ExternalPaper2dAtlas__/SaveAtlas/UI/Common/Textures/Tooltip/__Frames/T_UI_common_img_tips_bg_4_PNG.T_UI_common_img_tips_bg_4_PNG |  | Min(0.500,1.000) Max(0.500,1.000) | L:-241.872 T:-316.095 R:80.029 B:-31.276 | X:0.000 Y:0.000 | 718.1, 763.9 | 1040.0, 1048.7 | 321.9×284.8 |
| /InfoTooltip/Info_Item/Switcher_Info_Top/Info_Top_Item/Dec_Top/Image_Dec_Top | Image | T_UI_common_img_tips_ornament_3_PNG | /Game/__ExternalPaper2dAtlas__/SaveAtlas/UI/Common/Textures/Tooltip/__Frames/T_UI_common_img_tips_ornament_3_PNG.T_UI_common_img_tips_ornament_3_PNG |  | Min(0.000,0.500) Max(0.000,0.500) | L:219.274 T:-131.904 R:101.600 B:-23.467 | X:0.000 Y:0.000 | 219.3, 408.1 | 101.6, 516.5 | -117.7×108.4 |
| /InfoTooltip/Info_Item/Switcher_Info_Top/Info_Top_Item/Image_TopLine | Image | T_UI_common_img_line | /Game/UI/Common/Textures/Tooltip/T_UI_common_img_line.T_UI_common_img_line |  | Min(0.000,0.000) Max(0.000,0.000) | L:13.794 T:70.484 R:456.229 B:3.000 | X:0.000 Y:0.000 | 13.8, 70.5 | 456.2, 3.0 | 442.4×-67.5 |
| /InfoTooltip/Info_Item/Switcher_Info_Top/Info_Top_Item/Image_TopLine_1 | Image | T_UI_common_img_line | /Game/UI/Common/Textures/Tooltip/T_UI_common_img_line.T_UI_common_img_line | 1 | Min(0.000,0.000) Max(0.000,0.000) | L:5.805 T:58.644 R:456.229 B:3.000 | X:0.000 Y:0.000 | 5.8, 58.6 | 456.2, 3.0 | 450.4×-55.6 |
| /InfoTooltip/Info_Item/Switcher_Info_Top/Info_Top_Item/Top/InfoTop_Special/MballColor_1/SizeBox_3/Img_MballColor | Image | T_UI_mball_img_colour_5 | /Game/UI/SysEffectBall/ColorIcon/T_UI_mball_img_colour_5.T_UI_mball_img_colour_5 |  | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 0.0, 0.0 | 0.0×0.0 |
| /InfoTooltip/Info_Item/Switcher_Info_Top/Info_Top_Item/Top/InfoTop_Special/WidgetSwitcher_0/Quality_1/Image_QualityBG_2 | Image | T_UI_dressup_tips_img_starbox_PNG | /Game/__ExternalPaper2dAtlas__/SaveAtlas/UI/SysClothes/Textures/__Frames/T_UI_dressup_tips_img_starbox_PNG.T_UI_dressup_tips_img_starbox_PNG |  | Min(0.000,0.000) Max(1.000,1.000) | L:-9.000 T:0.000 R:-9.000 B:0.000 | X:0.000 Y:0.000 | -9.0, 0.0 | 1911.0, 1080.0 | 1920.0×1080.0 |
| /InfoTooltip/Info_Item/Switcher_Info_Top/Info_Top_Item/Top/InfoTop_Special/WidgetSwitcher_0/TimeLimit_1/Limit_Time_2/Time_Image_2 | Image | T_UI_common_icon_time_PNG | /Game/__ExternalPaper2dAtlas__/SaveAtlas/UI/Common/Textures/Tooltip/__Frames/T_UI_common_icon_time_PNG.T_UI_common_icon_time_PNG |  | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 0.0, 0.0 | 0.0×0.0 |
| /InfoTooltip/Info_Item/Switcher_Info_Top/Info_Top_Item/Top/InfoTop_Special/Img_Line_Top_4/Img_Spot_4 | Image | T_UI_common_img_line_arrow_PNG | /Game/__ExternalPaper2dAtlas__/SaveAtlas/UI/Common/Textures/Tooltip/__Frames/T_UI_common_img_line_arrow_PNG.T_UI_common_img_line_arrow_PNG |  | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 0.0, 0.0 | 0.0×0.0 |
| /InfoTooltip/Info_Item/Switcher_Info_Top/Info_Top_Item/Top/InfoTop_Special/Img_Line_Top_4/Img_Line_7 | Image | T_UI_common_img_line_point_brown | /Game/UI/Common/Textures/Tooltip/T_UI_common_img_line_point_brown.T_UI_common_img_line_point_brown |  | Min(0.000,0.000) Max(0.000,0.000) | L:18.968 T:-0.834 R:426.172 B:8.000 | X:0.000 Y:0.000 | 19.0, -0.8 | 426.2, 8.0 | 407.2×8.8 |
| /InfoTooltip/Info_Item/Switcher_Info_Top/Info_Top_Item/Top/SizeBox_5/ScaleBox_3/InfoTop_1/ItemType/SizeBox_2/MinorTypeIcon | Image | T_UI_common_bag_icon_fish_PNG | /Game/__ExternalPaper2dAtlas__/SaveAtlas/UI/SysBag/Textures/__Frames/T_UI_common_bag_icon_fish_PNG.T_UI_common_bag_icon_fish_PNG |  | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 0.0, 0.0 | 0.0×0.0 |
| /InfoTooltip/Info_Item/Switcher_Info_Top/Info_Top_Item/Top/SizeBox_5/ScaleBox_3/InfoTop_1/ItemType/Image_TypeBg | Image | T_UI_Bag_InfoPanel_QualityBG_PNG | /Game/__ExternalPaper2dAtlas__/SaveAtlas/UI/SysBag/Textures/__Frames/T_UI_Bag_InfoPanel_QualityBG_PNG.T_UI_Bag_InfoPanel_QualityBG_PNG |  | Min(0.000,0.000) Max(1.000,1.000) | L:-5.000 T:0.000 R:-16.000 B:0.000 | X:0.000 Y:0.000 | -5.0, 0.0 | 1904.0, 1080.0 | 1909.0×1080.0 |
| /InfoTooltip/Info_Item/Switcher_Info_Top/Info_Top_Item/Top/SizeBox_5/ScaleBox_3/InfoTop_1/ItemType_Furniture/SizeBox_6/MinorTypeIcon_Furniture | Image | T_UI_common_bag_icon_fish_PNG | /Game/__ExternalPaper2dAtlas__/SaveAtlas/UI/SysBag/Textures/__Frames/T_UI_common_bag_icon_fish_PNG.T_UI_common_bag_icon_fish_PNG |  | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 0.0, 0.0 | 0.0×0.0 |
| /InfoTooltip/Info_Item/Switcher_Info_Top/Info_Top_Item/Top/SizeBox_5/ScaleBox_3/InfoTop_1/ItemType_Furniture/Image_TypeBg_Furniture | Image | T_UI_Bag_InfoPanel_QualityBG_PNG | /Game/__ExternalPaper2dAtlas__/SaveAtlas/UI/SysBag/Textures/__Frames/T_UI_Bag_InfoPanel_QualityBG_PNG.T_UI_Bag_InfoPanel_QualityBG_PNG |  | Min(0.000,0.000) Max(1.000,1.000) | L:-5.000 T:0.000 R:-16.000 B:0.000 | X:0.000 Y:0.000 | -5.0, 0.0 | 1904.0, 1080.0 | 1909.0×1080.0 |
| /InfoTooltip/Info_Item/Switcher_Info_Top/Info_Top_Item/Top/Img_Line_Top/Img_Spot | Image | T_UI_common_img_line_arrow_PNG | /Game/__ExternalPaper2dAtlas__/SaveAtlas/UI/Common/Textures/Tooltip/__Frames/T_UI_common_img_line_arrow_PNG.T_UI_common_img_line_arrow_PNG |  | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 0.0, 0.0 | 0.0×0.0 |
| /InfoTooltip/Info_Item/Switcher_Info_Top/Info_Top_Item/Top/Img_Line_Top/Img_Line | Image | T_UI_common_img_line_point_brown | /Game/UI/Common/Textures/Tooltip/T_UI_common_img_line_point_brown.T_UI_common_img_line_point_brown |  | Min(0.000,0.000) Max(0.000,0.000) | L:18.968 T:-0.834 R:426.172 B:8.000 | X:0.000 Y:0.000 | 19.0, -0.8 | 426.2, 8.0 | 407.2×8.8 |
| /InfoTooltip/Info_Item/Switcher_Info_Top/Info_Top_Item/Top/Img_Line_Top_2/Img_Spot_1 | Image | T_UI_common_img_line_arrow_PNG | /Game/__ExternalPaper2dAtlas__/SaveAtlas/UI/Common/Textures/Tooltip/__Frames/T_UI_common_img_line_arrow_PNG.T_UI_common_img_line_arrow_PNG |  | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:-0.600 R:0.000 B:30.600 | X:0.000 Y:0.000 | 0.0, -0.6 | 0.0, 30.6 | 0.0×31.2 |
| /InfoTooltip/Info_Item/Switcher_Info_Top/Info_Top_Item/Top/Img_Line_Top_2/Img_Line_1 | Image | T_UI_common_img_line_point_brown | /Game/UI/Common/Textures/Tooltip/T_UI_common_img_line_point_brown.T_UI_common_img_line_point_brown |  | Min(0.000,0.000) Max(0.000,0.000) | L:24.168 T:-0.834 R:419.544 B:8.000 | X:0.000 Y:0.000 | 24.2, -0.8 | 419.5, 8.0 | 395.4×8.8 |
| /InfoTooltip/Info_Item/Switcher_Info_Top/Info_Top_Item/Top/Img_Line_Top_3/Img_Spot_2 | Image | T_UI_common_img_line_arrow_PNG | /Game/__ExternalPaper2dAtlas__/SaveAtlas/UI/Common/Textures/Tooltip/__Frames/T_UI_common_img_line_arrow_PNG.T_UI_common_img_line_arrow_PNG |  | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:-0.600 R:0.000 B:30.600 | X:0.000 Y:0.000 | 0.0, -0.6 | 0.0, 30.6 | 0.0×31.2 |
| /InfoTooltip/Info_Item/Switcher_Info_Top/Info_Top_Item/Top/Img_Line_Top_3/Img_Line_2 | Image | T_UI_common_img_line_point_brown | /Game/UI/Common/Textures/Tooltip/T_UI_common_img_line_point_brown.T_UI_common_img_line_point_brown |  | Min(0.000,0.000) Max(0.000,0.000) | L:24.168 T:-0.834 R:419.544 B:8.000 | X:0.000 Y:0.000 | 24.2, -0.8 | 419.5, 8.0 | 395.4×8.8 |
| /InfoTooltip/Info_Item/Switcher_Info_Top/Info_Top_Item/Top/Special/Title/Image_Special | Image | T_UI_pear_titleselect_img_title_06 | /Game/UI/SysPear/Texture/TitleIcon/T_UI_pear_titleselect_img_title_06.T_UI_pear_titleselect_img_title_06 |  | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 0.0, 0.0 | 0.0×0.0 |
| /InfoTooltip/Info_Item/Switcher_Info_Top/Info_Top_Item/Top/Furniture_Sign/Interaction/Image_1 | Image | T_UI_house_shop_icon_interaction_PNG | /Game/__ExternalPaper2dAtlas__/SaveAtlas/UI/SysHomeUI/Common/Textures/__Frames/T_UI_house_shop_icon_interaction_PNG.T_UI_house_shop_icon_interaction_PNG |  | Min(0.000,0.500) Max(0.000,0.500) | L:21.500 T:3.000 R:0.000 B:0.000 | X:0.500 Y:0.500 | 32.2, 544.5 | 10.8, 541.5 | -21.5×-3.0 |
| /InfoTooltip/Info_Item/Switcher_Info_Top/Info_Top_Item/Top/Furniture_Sign/DIYColor/Image_2 | Image | T_UI_house_shop_icon_dyeing_PNG | /Game/__ExternalPaper2dAtlas__/SaveAtlas/UI/SysHomeUI/Common/Textures/__Frames/T_UI_house_shop_icon_dyeing_PNG.T_UI_house_shop_icon_dyeing_PNG |  | Min(0.000,0.500) Max(0.000,0.500) | L:21.500 T:3.000 R:0.000 B:0.000 | X:0.500 Y:0.500 | 32.2, 544.5 | 10.8, 541.5 | -21.5×-3.0 |
| /InfoTooltip/Info_Item/Switcher_Info_Top/Info_Top_Item/Top/Ornament/Image_Ornament | Image | T_UI_common_img_pearl_white | /Game/UI/Common/Textures/T_UI_common_img_pearl_white.T_UI_common_img_pearl_white |  | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 0.0, 0.0 | 0.0×0.0 |
| /InfoTooltip/Info_Item/Switcher_Info_Top/Info_Top_Movement/Movement_BG | Image | T_UI_common_img_tips_bg_1_PNG | /Game/__ExternalPaper2dAtlas__/SaveAtlas/UI/Common/Textures/Tooltip/__Frames/T_UI_common_img_tips_bg_1_PNG.T_UI_common_img_tips_bg_1_PNG | 1 | Min(0.000,0.000) Max(0.000,1.000) | L:0.000 T:0.000 R:0.000 B:11.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 0.0, 1091.0 | 0.0×1091.0 |
| /InfoTooltip/Info_Item/Switcher_Info_Top/Info_Top_Movement/Dec_Texture_2/Image_Dec_Texture_2 | Image | T_UI_common_img_tips_bg_4_PNG | /Game/__ExternalPaper2dAtlas__/SaveAtlas/UI/Common/Textures/Tooltip/__Frames/T_UI_common_img_tips_bg_4_PNG.T_UI_common_img_tips_bg_4_PNG |  | Min(0.500,1.000) Max(0.500,1.000) | L:-241.872 T:-316.095 R:80.029 B:-31.276 | X:0.000 Y:0.000 | 718.1, 763.9 | 1040.0, 1048.7 | 321.9×284.8 |
| /InfoTooltip/Info_Item/Switcher_Info_Top/Info_Top_Movement/RetainerBox_0/ScaleBox_5/Video | Image | T_UI_123 | /Game/UI/Common/Textures/T_UI_123.T_UI_123 |  | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 0.0, 0.0 | 0.0×0.0 |
| /InfoTooltip/Info_Item/Info_Bottom/BottomBg | Image | T_UI_common_img_tips_bg_2 | /Game/UI/Common/Textures/Tooltip/T_UI_common_img_tips_bg_2.T_UI_common_img_tips_bg_2 |  | Min(0.000,0.000) Max(0.000,1.000) | L:0.094 T:6.000 R:469.907 B:-21.714 | X:0.000 Y:0.000 | 0.1, 6.0 | 469.9, 1058.3 | 469.8×1052.3 |
| /InfoTooltip/Info_Item/Info_Bottom/Bottom/Furniture_Size/Image_Size | Image | T_UI_house_shop_icon_size_PNG | /Game/__ExternalPaper2dAtlas__/SaveAtlas/UI/SysHomeUI/SysMoneyShop/Textures/Icon/__Frames/T_UI_house_shop_icon_size_PNG.T_UI_house_shop_icon_size_PNG |  | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 0.0, 0.0 | 0.0×0.0 |
| /InfoTooltip/Info_Item/Info_Bottom/Bottom/Furniture_Size/Img_Line_Bottom_6 | Image | T_UI_common_img_line | /Game/UI/Common/Textures/Tooltip/T_UI_common_img_line.T_UI_common_img_line |  | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 0.0, 0.0 | 0.0×0.0 |
| /InfoTooltip/Info_Item/Info_Bottom/Bottom/Use/Image_Line_7 | Image | T_UI_bag_img_point_n | /Game/UI/Common/Textures/T_UI_bag_img_point_n.T_UI_bag_img_point_n |  | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 0.0, 0.0 | 0.0×0.0 |
| /InfoTooltip/Info_Item/Info_Bottom/Bottom/Img_Line_Bottom_5 | Image | T_UI_common_img_line | /Game/UI/Common/Textures/Tooltip/T_UI_common_img_line.T_UI_common_img_line |  | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 0.0, 0.0 | 0.0×0.0 |
| /InfoTooltip/Info_Item/Info_Bottom/Bottom/Action/Image_Line_6 | Image | T_UI_bag_img_point_n | /Game/UI/Common/Textures/T_UI_bag_img_point_n.T_UI_bag_img_point_n |  | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 0.0, 0.0 | 0.0×0.0 |
| /InfoTooltip/Info_Item/Info_Bottom/Bottom/Action/SizeBox/Img_Action | Image | MI_UI_InfoTooltip_icon | /Game/UI/SysSocial/Material/MI_UI_InfoTooltip_icon.MI_UI_InfoTooltip_icon |  | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 0.0, 0.0 | 0.0×0.0 |
| /InfoTooltip/Info_Item/Info_Bottom/Bottom/Img_Line_Bottom | Image | T_UI_common_img_line | /Game/UI/Common/Textures/Tooltip/T_UI_common_img_line.T_UI_common_img_line |  | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 0.0, 0.0 | 0.0×0.0 |
| /InfoTooltip/Info_Item/Info_Bottom/Bottom/Info/Image_Line_2 | Image | T_UI_bag_img_point_n | /Game/UI/Common/Textures/T_UI_bag_img_point_n.T_UI_bag_img_point_n |  | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 0.0, 0.0 | 0.0×0.0 |
| /InfoTooltip/Info_Item/Info_Bottom/Bottom/Img_Line_Bottom_1 | Image | T_UI_common_img_line | /Game/UI/Common/Textures/Tooltip/T_UI_common_img_line.T_UI_common_img_line |  | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 0.0, 0.0 | 0.0×0.0 |
| /InfoTooltip/Info_Item/Info_Bottom/Bottom/Info_1/Image_Line | Image | T_UI_bag_img_point_n | /Game/UI/Common/Textures/T_UI_bag_img_point_n.T_UI_bag_img_point_n |  | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 0.0, 0.0 | 0.0×0.0 |
| /InfoTooltip/Info_Item/Info_Bottom/Bottom/Img_Line_Bottom_3 | Image | T_UI_common_img_line | /Game/UI/Common/Textures/Tooltip/T_UI_common_img_line.T_UI_common_img_line |  | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 0.0, 0.0 | 0.0×0.0 |
| /InfoTooltip/Info_Item/Info_Bottom/Bottom/Img_Line_Bottom_7 | Image | T_UI_common_img_line | /Game/UI/Common/Textures/Tooltip/T_UI_common_img_line.T_UI_common_img_line |  | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 0.0, 0.0 | 0.0×0.0 |
| /InfoTooltip/Info_Item/Info_Bottom/Bottom/Group_SuitName/Image_Line_4 | Image | T_UI_bag_img_point_n | /Game/UI/Common/Textures/T_UI_bag_img_point_n.T_UI_bag_img_point_n |  | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 0.0, 0.0 | 0.0×0.0 |
| /InfoTooltip/Info_Item/Info_Bottom/Bottom/Group_SuitName/SizeBox_4/HorizontalBox_1/SkillIcon/Image_Suit_SkillIcon | Image | T_UI_skill_btn_catch_PNG | /Game/__ExternalPaper2dAtlas__/SaveAtlas/UI/SysSkill/Resource/__Frames/T_UI_skill_btn_catch_PNG.T_UI_skill_btn_catch_PNG |  | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 0.0, 0.0 | 0.0×0.0 |
| /InfoTooltip/Info_Item/Info_Bottom/Bottom/Group_SuitSkill/Img_Line_Bottom_2 | Image | T_UI_common_img_line | /Game/UI/Common/Textures/Tooltip/T_UI_common_img_line.T_UI_common_img_line |  | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:0.000 R:443.143 B:3.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 443.1, 3.0 | 443.1×3.0 |
| /InfoTooltip/Info_Item/Info_Bottom/Bottom/Group_SuitSkill/Image_Line_1 | Image | T_UI_bag_img_point_n | /Game/UI/Common/Textures/T_UI_bag_img_point_n.T_UI_bag_img_point_n |  | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:86.800 R:482.500 B:7.000 | X:0.000 Y:0.000 | 0.0, 86.8 | 482.5, 7.0 | 482.5×-79.8 |
| /InfoTooltip/Info_Item/Info_Bottom/Bottom/Group_SuitSkill/ScaleBox_1/HorizontalBox_0/SizeBox_1/Image_SkillIcon | Image | T_UI_skill_btn_catch_PNG | /Game/__ExternalPaper2dAtlas__/SaveAtlas/UI/SysSkill/Resource/__Frames/T_UI_skill_btn_catch_PNG.T_UI_skill_btn_catch_PNG |  | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 0.0, 0.0 | 0.0×0.0 |
| /InfoTooltip/Info_Item/Info_Bottom/Bottom/Group_SuitSkill/ScaleBox_1/HorizontalBox_0/Ability_Locked/Image_Lock | Image | T_UI_dresup_lock_PNG | /Game/__ExternalPaper2dAtlas__/SaveAtlas/UI/Common/Textures/SuitShow/__Frames/T_UI_dresup_lock_PNG.T_UI_dresup_lock_PNG |  | Min(0.500,0.500) Max(0.500,0.500) | L:0.000 T:0.000 R:68.000 B:66.000 | X:0.500 Y:0.500 | 926.0, 507.0 | 994.0, 573.0 | 68.0×66.0 |
| /InfoTooltip/Info_Item/Info_Bottom/Bottom/Group_SuitSkill/ScaleBox_1/HorizontalBox_0/Image_Special_Effect | Image | T_UI_dresup_img_special_effect_PNG | /Game/__ExternalPaper2dAtlas__/SaveAtlas/UI/SysClothes/Textures/Ability/__Frames/T_UI_dresup_img_special_effect_PNG.T_UI_dresup_img_special_effect_PNG |  | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 0.0, 0.0 | 0.0×0.0 |
| /InfoTooltip/Info_Item/Info_Bottom/Bottom/Group_SuitSkill/ScaleBox_1/HorizontalBox_0/Image_Line_Ability | Image | T_UI_common_img_line_point_white | /Game/UI/Common/Textures/Tooltip/T_UI_common_img_line_point_white.T_UI_common_img_line_point_white |  | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 0.0, 0.0 | 0.0×0.0 |
| /InfoTooltip/Info_Item/Info_Bottom/Bottom/Group_SuitSkill/ScaleBox_1/HorizontalBox_0/Image_Line_3 | Image | T_UI_bag_img_point_n | /Game/UI/Common/Textures/T_UI_bag_img_point_n.T_UI_bag_img_point_n |  | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 0.0, 0.0 | 0.0×0.0 |
| /InfoTooltip/Info_Item/Info_Bottom/Bottom/Group_SuitSkill/ScaleBox_1/HorizontalBox_0/Image_AbilityType | Image | T_UI_suitskill_tab_01 | /Game/UI/SysClothes/Textures/T_UI_suitskill_tab_01.T_UI_suitskill_tab_01 |  | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 0.0, 0.0 | 0.0×0.0 |
| /InfoTooltip/Info_Item/Info_Bottom/Bottom/Group_Toggle/Img_Line_Bottom_4 | Image | T_UI_common_img_line | /Game/UI/Common/Textures/Tooltip/T_UI_common_img_line.T_UI_common_img_line |  | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:0.000 R:443.143 B:3.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 443.1, 3.0 | 443.1×3.0 |
| /InfoTooltip/Info_Item/Info_Bottom/Bottom/Group_Toggle/Toggle/HorizontalBox/Image_Line_5 | Image | T_UI_bag_img_point_n | /Game/UI/Common/Textures/T_UI_bag_img_point_n.T_UI_bag_img_point_n |  | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 0.0, 0.0 | 0.0×0.0 |
| /InfoTooltip/Info_Item/Info_Bottom/Bottom/Switch_Btn/HorizontalBox_3/Image_Line_8 | Image | T_UI_bag_img_point_n | /Game/UI/Common/Textures/T_UI_bag_img_point_n.T_UI_bag_img_point_n |  | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 0.0, 0.0 | 0.0×0.0 |
| /InfoTooltip/Lock/Img_Lock | Image | T_UI_cc_equipment_img_lock_n | /Game/UI/Common/Textures/T_UI_cc_equipment_img_lock_n.T_UI_cc_equipment_img_lock_n |  | Min(0.000,0.000) Max(0.000,0.000) | L:-5.429 T:0.000 R:98.168 B:23.475 | X:0.000 Y:0.000 | -5.4, 0.0 | 98.2, 23.5 | 103.6×23.5 |

> 共 74 个带贴图 Image 节点。

## WBP_Common_Button_Close（关闭按钮）

> 源文件：`X6Game/Content/UI/Common/WidgetBp/Button/WBP_Common_Button_Close.uasset`　|　WidgetTree 节点数：5

| 层级路径 | 类名 | 素材 | 素材资源路径 | zorder | Anchors | Offsets | Alignment | x0,y0 | x1,y1 | 宽×高 |
|---|---|---|---|---|---|---|---|---|---|---|
| /CanvasPanel_30/Normal_Img | Image | T_UI_common_btn_close_02_n | /Game/UI/Common/Textures/T_UI_common_btn_close_02_n.T_UI_common_btn_close_02_n |  | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 0.0, 0.0 | 0.0×0.0 |
| /CanvasPanel_30/Hover_Img | Image | T_UI_common_btn_back_h | /Game/UI/Common/Textures/T_UI_common_btn_back_h.T_UI_common_btn_back_h |  | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 0.0, 0.0 | 0.0×0.0 |
| /CanvasPanel_30/Pressed_Img | Image | T_UI_common_btn_close_02_n | /Game/UI/Common/Textures/T_UI_common_btn_close_02_n.T_UI_common_btn_close_02_n |  | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 0.0, 0.0 | 0.0×0.0 |

> 共 3 个带贴图 Image 节点。

## WBP_Common_Button_Confirm（确认按钮）

> 源文件：`X6Game/Content/UI/Common/WidgetBp/Button/WBP_Common_Button_Confirm.uasset`　|　WidgetTree 节点数：30

| 层级路径 | 类名 | 素材 | 素材资源路径 | zorder | Anchors | Offsets | Alignment | x0,y0 | x1,y1 | 宽×高 |
|---|---|---|---|---|---|---|---|---|---|---|
| /CanvasPanel_1/ButtonArea/SizeBox_2/ScaleBox_0/Content/HorizontalBox_1/SizeBox_4/Icon_Img | Image | T_Icon_quest_0004 | /Game/UI/Image/IconQuest/T_Icon_quest_0004.T_Icon_quest_0004 |  | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 0.0, 0.0 | 0.0×0.0 |
| /CanvasPanel_1/ButtonArea/SizeBox_2/ScaleBox_0/Content/CanvasPanel_3/HorizontalBox_0/SizeBox_1/ConsoleIcon | Image | T_Icon_quest_0004 | /Game/UI/Image/IconQuest/T_Icon_quest_0004.T_Icon_quest_0004 |  | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 0.0, 0.0 | 0.0×0.0 |
| /CanvasPanel_1/Hover_Img | Image | T_UI_common_btn_h | /Game/UI/Common/Textures/T_UI_common_btn_h.T_UI_common_btn_h | 1 | Min(0.000,0.000) Max(1.000,1.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.500 Y:0.500 | -960.0, -540.0 | 960.0, 540.0 | 1920.0×1080.0 |
| /CanvasPanel_1/Pressed_Img | Image | T_UI_common_btn_golden_n | /Game/UI/Common/Textures/T_UI_common_btn_golden_n.T_UI_common_btn_golden_n | 1 | Min(0.000,0.000) Max(1.000,1.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.500 Y:0.500 | -960.0, -540.0 | 960.0, 540.0 | 1920.0×1080.0 |
| /CanvasPanel_1/Fx_Effect/Fx_Edge_Sweep_01 | Image | MI_UI_Achievenment_Reward_Item_edge_02 | /Game/UI/SysAreaAchievement/Material/MI_UI_Achievenment_Reward_Item_edge_02.MI_UI_Achievenment_Reward_Item_edge_02 | 3 | Min(0.000,0.000) Max(1.000,1.000) | L:0.000 T:0.000 R:0.000 B:2.000 | X:0.500 Y:0.500 | -960.0, -541.0 | 960.0, 541.0 | 1920.0×1082.0 |
| /CanvasPanel_1/Fx_Effect/Fx_Edge_Sweep_02 | Image | MI_UI_Achievenment_Reward_Item_edge_02 | /Game/UI/SysAreaAchievement/Material/MI_UI_Achievenment_Reward_Item_edge_02.MI_UI_Achievenment_Reward_Item_edge_02 | 3 | Min(0.000,0.000) Max(1.000,1.000) | L:0.000 T:-5.500 R:0.000 B:7.500 | X:0.500 Y:0.500 | -960.0, -552.0 | 960.0, 541.0 | 1920.0×1093.0 |
| /CanvasPanel_1/Fx_Effect/Fx_Glow | Image | MI_UI_Common_Button_Glow | /Game/UI/Common/Material/MI_UI_Common_Button_Glow.MI_UI_Common_Button_Glow |  | Min(0.000,0.000) Max(1.000,1.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 1920.0, 1080.0 | 1920.0×1080.0 |
| /CanvasPanel_1/Fx_Effect/Fx_Sweep | Image | MI_UI_Common_Button_Confirm_Sweep | /Game/UI/UIParticle/UI_Material/Reward/MI_UI_Common_Button_Confirm_Sweep.MI_UI_Common_Button_Confirm_Sweep |  | Min(0.000,0.500) Max(1.000,0.500) | L:0.000 T:0.000 R:0.000 B:82.000 | X:0.500 Y:0.500 | -960.0, 499.0 | 960.0, 581.0 | 1920.0×82.0 |
| /CanvasPanel_1/Fx_Effect/Fx_Light_01 | Image | MI_UI_ParticleBase_01_10 | /Game/UI/UIParticle/UI_Material/MI_UI_ParticleBase_01_10.MI_UI_ParticleBase_01_10 |  | Min(0.500,0.500) Max(0.500,0.500) | L:-60.000 T:-30.000 R:160.000 B:50.000 | X:0.500 Y:0.500 | 790.0, 470.0 | 1010.0, 550.0 | 220.0×80.0 |
| /CanvasPanel_1/Fx_Effect/Fx_Light_02 | Image | MI_UI_ParticleBase_03 | /Game/UI/UIParticle/UI_Material/MI_UI_ParticleBase_03.MI_UI_ParticleBase_03 |  | Min(0.500,0.500) Max(0.500,0.500) | L:40.000 T:23.000 R:106.000 B:16.000 | X:0.500 Y:0.500 | 967.0, 566.5 | 1033.0, 559.5 | 66.0×-7.0 |

> 共 10 个带贴图 Image 节点。

## WBP_Common_Button_Cancel（取消按钮）

> 源文件：`X6Game/Content/UI/Common/WidgetBp/Button/WBP_Common_Button_Cancel.uasset`　|　WidgetTree 节点数：22

| 层级路径 | 类名 | 素材 | 素材资源路径 | zorder | Anchors | Offsets | Alignment | x0,y0 | x1,y1 | 宽×高 |
|---|---|---|---|---|---|---|---|---|---|---|
| /CanvasPanel_1/IconTips/SizeBox_4/Icon_Img | Image | T_UI_123 | /Game/UI/Common/Textures/T_UI_123.T_UI_123 |  | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 0.0, 0.0 | 0.0×0.0 |
| /CanvasPanel_1/Hover_Img | Image | T_UI_common_btn_h | /Game/UI/Common/Textures/T_UI_common_btn_h.T_UI_common_btn_h | 1 | Min(0.000,0.500) Max(1.000,0.500) | L:0.000 T:0.000 R:0.000 B:84.000 | X:0.500 Y:0.500 | -960.0, 498.0 | 960.0, 582.0 | 1920.0×84.0 |
| /CanvasPanel_1/Pressed_Img | Image | T_UI_common_btn_brown_n | /Game/UI/Common/Textures/T_UI_common_btn_brown_n.T_UI_common_btn_brown_n | 2 | Min(0.000,0.500) Max(1.000,0.500) | L:0.000 T:0.143 R:0.000 B:83.000 | X:0.500 Y:0.500 | -960.0, 498.7 | 960.0, 581.6 | 1920.0×82.9 |
| /CanvasPanel_1/ButtonArea/SizeBox_2/ScaleBox_0/Content/CanvasPanel_3/HorizontalBox_0/SizeBox_1/ConsoleIcon | Image |  |  |  | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 0.0, 0.0 | 0.0×0.0 |

> 共 4 个带贴图 Image 节点。

## WBP_Common_Button_Secondary（次要按钮）

> 源文件：`X6Game/Content/UI/Common/WidgetBp/Button/WBP_Common_Button_Secondary.uasset`　|　WidgetTree 节点数：23

| 层级路径 | 类名 | 素材 | 素材资源路径 | zorder | Anchors | Offsets | Alignment | x0,y0 | x1,y1 | 宽×高 |
|---|---|---|---|---|---|---|---|---|---|---|
| /CanvasPanel_1/ButtonArea/SizeBox_0/ScaleBox_0/Content/HorizontalBox_0/SizeBox_4/Icon_Img | Image | T_UI_NikkiDisplayGroup_badge_middle_img_01 | /Game/UI/SysNikkiDisplayGroup/Texture/DIYBadge/BadgeDecoration/T_UI_NikkiDisplayGroup_badge_middle_img_01.T_UI_NikkiDisplayGroup_badge_middle_img_01 |  | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 0.0, 0.0 | 0.0×0.0 |
| /CanvasPanel_1/ButtonArea/SizeBox_0/ScaleBox_0/Content/CanvasPanel_3/HorizontalBox/SizeBox_1/ConsoleIcon | Image | T_UI_NikkiDisplayGroup_badge_middle_img_01 | /Game/UI/SysNikkiDisplayGroup/Texture/DIYBadge/BadgeDecoration/T_UI_NikkiDisplayGroup_badge_middle_img_01.T_UI_NikkiDisplayGroup_badge_middle_img_01 |  | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 0.0, 0.0 | 0.0×0.0 |
| /CanvasPanel_1/Hover_Img | Image | T_UI_common_btn_white2_h | /Game/UI/Common/Textures/T_UI_common_btn_white2_h.T_UI_common_btn_white2_h |  | Min(0.000,0.000) Max(1.000,1.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.500 Y:0.500 | -960.0, -540.0 | 960.0, 540.0 | 1920.0×1080.0 |
| /CanvasPanel_1/Pressed_Img | Image | T_UI_common_btn_white2_n | /Game/UI/Common/Textures/T_UI_common_btn_white2_n.T_UI_common_btn_white2_n | 1 | Min(0.000,0.500) Max(1.000,0.500) | L:0.000 T:0.000 R:0.000 B:84.000 | X:0.500 Y:0.500 | -960.0, 498.0 | 960.0, 582.0 | 1920.0×84.0 |

> 共 4 个带贴图 Image 节点。

## WBP_Common_Button_Secondary_Dis（次要按钮(禁用)）

> 源文件：`X6Game/Content/UI/Common/WidgetBp/Button/WBP_Common_Button_Secondary_Dis.uasset`　|　WidgetTree 节点数：23

| 层级路径 | 类名 | 素材 | 素材资源路径 | zorder | Anchors | Offsets | Alignment | x0,y0 | x1,y1 | 宽×高 |
|---|---|---|---|---|---|---|---|---|---|---|
| /CanvasPanel_1/ButtonArea/SizeBox_0/ScaleBox_0/Content/HorizontalBox_0/SizeBox_4/Icon_Img | Image | T_UI_NikkiDisplayGroup_badge_middle_img_01 | /Game/UI/SysNikkiDisplayGroup/Texture/DIYBadge/BadgeDecoration/T_UI_NikkiDisplayGroup_badge_middle_img_01.T_UI_NikkiDisplayGroup_badge_middle_img_01 |  | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 0.0, 0.0 | 0.0×0.0 |
| /CanvasPanel_1/ButtonArea/SizeBox_0/ScaleBox_0/Content/CanvasPanel_3/HorizontalBox/SizeBox_1/ConsoleIcon | Image | T_UI_NikkiDisplayGroup_badge_middle_img_01 | /Game/UI/SysNikkiDisplayGroup/Texture/DIYBadge/BadgeDecoration/T_UI_NikkiDisplayGroup_badge_middle_img_01.T_UI_NikkiDisplayGroup_badge_middle_img_01 |  | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 0.0, 0.0 | 0.0×0.0 |
| /CanvasPanel_1/Hover_Img | Image | T_UI_common_btn_black_p3_h | /Game/UI/Common/Textures/T_UI_common_btn_black_p3_h.T_UI_common_btn_black_p3_h |  | Min(0.000,0.000) Max(1.000,1.000) | L:3.000 T:4.000 R:3.000 B:5.000 | X:0.500 Y:0.500 | -957.0, -536.5 | 963.0, 544.5 | 1920.0×1081.0 |
| /CanvasPanel_1/Pressed_Img | Image | T_UI_common_btn_2_disabled | /Game/UI/Common/Textures/T_UI_common_btn_2_disabled.T_UI_common_btn_2_disabled | 1 | Min(0.000,0.000) Max(1.000,1.000) | L:2.000 T:5.000 R:2.000 B:-1.000 | X:0.500 Y:0.500 | -958.0, -532.0 | 962.0, 542.0 | 1920.0×1074.0 |

> 共 4 个带贴图 Image 节点。

## WBP_Common_SmallButton（小按钮）

> 源文件：`X6Game/Content/UI/Common/WidgetBp/Button/WBP_Common_SmallButton.uasset`　|　WidgetTree 节点数：12

| 层级路径 | 类名 | 素材 | 素材资源路径 | zorder | Anchors | Offsets | Alignment | x0,y0 | x1,y1 | 宽×高 |
|---|---|---|---|---|---|---|---|---|---|---|
| /CanvasPanel_24/Image_Normal | Image | T_UI_common_next_btn | /Game/UI/Common/Textures/T_UI_common_next_btn.T_UI_common_next_btn |  | Min(0.500,0.500) Max(0.500,0.500) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.500 Y:0.500 | 960.0, 540.0 | 960.0, 540.0 | 0.0×0.0 |
| /CanvasPanel_24/Image_Hover | Image | T_UI_common_btn_back_h | /Game/UI/Common/Textures/T_UI_common_btn_back_h.T_UI_common_btn_back_h | 1 | Min(0.500,0.500) Max(0.500,0.500) | L:-0.500 T:0.000 R:84.000 B:84.000 | X:0.500 Y:0.500 | 917.2, 498.0 | 1001.8, 582.0 | 84.5×84.0 |
| /CanvasPanel_24/Image_Icon | Image | T_UI_123 | /Game/UI/Common/Textures/T_UI_123.T_UI_123 | 2 | Min(0.500,0.500) Max(0.500,0.500) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.500 Y:0.500 | 960.0, 540.0 | 960.0, 540.0 | 0.0×0.0 |
| /CanvasPanel_24/Size_Font/Overlay_0/Image_TextBg | Image | T_UI_Common_BtnTips_txt_bg | /Game/UI/Common/Textures/T_UI_Common_BtnTips_txt_bg.T_UI_Common_BtnTips_txt_bg |  | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 0.0, 0.0 | 0.0×0.0 |
| /CanvasPanel_24/Img_Grey | Image | T_UI_common_btn_dialog_base_slider_mask | /Game/UI/SysDlg/Texture/T_UI_common_btn_dialog_base_slider_mask.T_UI_common_btn_dialog_base_slider_mask | 1 | Min(0.500,0.500) Max(0.500,0.500) | L:-0.500 T:0.000 R:74.000 B:74.000 | X:0.500 Y:0.500 | 922.2, 503.0 | 996.8, 577.0 | 74.5×74.0 |

> 共 5 个带贴图 Image 节点。

## WBP_Common_Page_Btn（翻页按钮）

> 源文件：`X6Game/Content/UI/Common/WidgetBp/Button/WBP_Common_Page_Btn.uasset`　|　WidgetTree 节点数：4

| 层级路径 | 类名 | 素材 | 素材资源路径 | zorder | Anchors | Offsets | Alignment | x0,y0 | x1,y1 | 宽×高 |
|---|---|---|---|---|---|---|---|---|---|---|

> 共 0 个带贴图 Image 节点。

## WBP_Common_IconBtn（图标按钮）

> 源文件：`X6Game/Content/UI/Common/WidgetBp/Button/WBP_Common_IconBtn.uasset`　|　WidgetTree 节点数：17

| 层级路径 | 类名 | 素材 | 素材资源路径 | zorder | Anchors | Offsets | Alignment | x0,y0 | x1,y1 | 宽×高 |
|---|---|---|---|---|---|---|---|---|---|---|
| /Content/Bg | Image | T_UI_tower_btn_main_n_PNG | /Game/__ExternalPaper2dAtlas__/SaveAtlas/UI/SysDressTower/Textures/__Frames/T_UI_tower_btn_main_n_PNG.T_UI_tower_btn_main_n_PNG |  | Min(0.500,0.000) Max(0.500,0.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.500 Y:0.000 | 960.0, 0.0 | 960.0, 0.0 | 0.0×0.0 |
| /Content/Hover | Image | T_UI_tower_btn_main_h_PNG | /Game/__ExternalPaper2dAtlas__/SaveAtlas/UI/SysDressTower/Textures/__Frames/T_UI_tower_btn_main_h_PNG.T_UI_tower_btn_main_h_PNG |  | Min(0.500,0.000) Max(0.500,0.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.500 Y:0.000 | 960.0, 0.0 | 960.0, 0.0 | 0.0×0.0 |
| /Content/CanvasPanel_0/SizeBox_0/Image_Icon | Image | T_UI_tower_icon_main_reward_PNG | /Game/__ExternalPaper2dAtlas__/SaveAtlas/UI/SysDressTower/Textures/__Frames/T_UI_tower_icon_main_reward_PNG.T_UI_tower_icon_main_reward_PNG |  | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 0.0, 0.0 | 0.0×0.0 |
| /Content/Progress/Image_Progress_Bg_1 | Image | T_UI_fragranc_img_text_shadow_PNG | /Game/__ExternalPaper2dAtlas__/SaveAtlas/UI/SysClothes/Textures/Fragrance/__Frames/T_UI_fragranc_img_text_shadow_PNG.T_UI_fragranc_img_text_shadow_PNG |  | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:0.000 R:145.000 B:44.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 145.0, 44.0 | 145.0×44.0 |
| /Content/Progress/Image_Progress_Bg | Image | T_UI_fragranc_img_text_shadow_PNG | /Game/__ExternalPaper2dAtlas__/SaveAtlas/UI/SysClothes/Textures/Fragrance/__Frames/T_UI_fragranc_img_text_shadow_PNG.T_UI_fragranc_img_text_shadow_PNG |  | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:0.000 R:145.000 B:44.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 145.0, 44.0 | 145.0×44.0 |

> 共 5 个带贴图 Image 节点。

## WBP_Common_Button_Close_Dark（深色关闭按钮）

> 源文件：`X6Game/Content/UI/Common/WidgetBp/Button/WBP_Common_Button_Close_Dark.uasset`　|　WidgetTree 节点数：5

| 层级路径 | 类名 | 素材 | 素材资源路径 | zorder | Anchors | Offsets | Alignment | x0,y0 | x1,y1 | 宽×高 |
|---|---|---|---|---|---|---|---|---|---|---|
| /CanvasPanel_30/Normal_Img | Image | T_UI_common_btn_close_02_dark_n | /Game/UI/Common/Textures/T_UI_common_btn_close_02_dark_n.T_UI_common_btn_close_02_dark_n |  | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 0.0, 0.0 | 0.0×0.0 |
| /CanvasPanel_30/Hover_Img | Image | T_UI_common_btn_back_h | /Game/UI/Common/Textures/T_UI_common_btn_back_h.T_UI_common_btn_back_h |  | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 0.0, 0.0 | 0.0×0.0 |
| /CanvasPanel_30/Pressed_Img | Image | T_UI_common_btn_close_02_dark_n | /Game/UI/Common/Textures/T_UI_common_btn_close_02_dark_n.T_UI_common_btn_close_02_dark_n |  | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 0.0, 0.0 | 0.0×0.0 |

> 共 3 个带贴图 Image 节点。

## WBP_Common_Button_Close_02（关闭按钮样式02）

> 源文件：`X6Game/Content/UI/Common/WidgetBp/Button/WBP_Common_Button_Close_02.uasset`　|　WidgetTree 节点数：5

| 层级路径 | 类名 | 素材 | 素材资源路径 | zorder | Anchors | Offsets | Alignment | x0,y0 | x1,y1 | 宽×高 |
|---|---|---|---|---|---|---|---|---|---|---|
| /CanvasPanel_24/Bg | Image | T_UI_common_btn_blackbg_n | /Game/UI/Common/Textures/T_UI_common_btn_blackbg_n.T_UI_common_btn_blackbg_n |  | Min(0.500,0.500) Max(0.500,0.500) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.500 Y:0.500 | 960.0, 540.0 | 960.0, 540.0 | 0.0×0.0 |
| /CanvasPanel_24/Image_Close | Image | T_UI_oufit_img_popup_close_n | /Game/UI/Common/Textures/T_UI_oufit_img_popup_close_n.T_UI_oufit_img_popup_close_n | 1 | Min(0.500,0.500) Max(0.500,0.500) | L:0.000 T:1.000 R:70.000 B:70.000 | X:0.500 Y:0.500 | 925.0, 506.5 | 995.0, 575.5 | 70.0×69.0 |
| /CanvasPanel_24/Hover | Image | T_UI_common_btn_back_h | /Game/UI/Common/Textures/T_UI_common_btn_back_h.T_UI_common_btn_back_h | 2 | Min(0.500,0.500) Max(0.500,0.500) | L:-0.600 T:0.500 R:110.000 B:110.000 | X:0.500 Y:0.500 | 904.1, 485.8 | 1014.7, 595.2 | 110.6×109.5 |

> 共 3 个带贴图 Image 节点。

## WBP_Common_Button_Close_Circle（圆形关闭按钮）

> 源文件：`X6Game/Content/UI/Common/WidgetBp/Button/WBP_Common_Button_Close_Circle.uasset`　|　WidgetTree 节点数：5

| 层级路径 | 类名 | 素材 | 素材资源路径 | zorder | Anchors | Offsets | Alignment | x0,y0 | x1,y1 | 宽×高 |
|---|---|---|---|---|---|---|---|---|---|---|
| /CanvasPanel_30/Normal_Img | Image | T_UI_common_btn_close_n | /Game/UI/Common/Textures/T_UI_common_btn_close_n.T_UI_common_btn_close_n |  | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 0.0, 0.0 | 0.0×0.0 |
| /CanvasPanel_30/Hover_Img | Image | T_UI_common_btn_close_h | /Game/UI/Common/Textures/T_UI_common_btn_close_h.T_UI_common_btn_close_h |  | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 0.0, 0.0 | 0.0×0.0 |
| /CanvasPanel_30/Pressed_Img | Image | T_UI_common_btn_close_s | /Game/UI/Common/Textures/T_UI_common_btn_close_s.T_UI_common_btn_close_s |  | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 0.0, 0.0 | 0.0×0.0 |

> 共 3 个带贴图 Image 节点。

## WBP_Common_Button_Next（下一步按钮）

> 源文件：`X6Game/Content/UI/Common/WidgetBp/Button/WBP_Common_Button_Next.uasset`　|　WidgetTree 节点数：4

| 层级路径 | 类名 | 素材 | 素材资源路径 | zorder | Anchors | Offsets | Alignment | x0,y0 | x1,y1 | 宽×高 |
|---|---|---|---|---|---|---|---|---|---|---|
| /CanvasPanel_24/Img_Next | Image | T_UI_common_next_btn | /Game/UI/Common/Textures/T_UI_common_next_btn.T_UI_common_next_btn |  | Min(0.500,0.500) Max(0.500,0.500) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.500 Y:0.500 | 960.0, 540.0 | 960.0, 540.0 | 0.0×0.0 |
| /CanvasPanel_24/Hover | Image | T_UI_common_btn_back_h | /Game/UI/Common/Textures/T_UI_common_btn_back_h.T_UI_common_btn_back_h | 2 | Min(0.500,0.500) Max(0.500,0.500) | L:-1.000 T:-1.000 R:84.000 B:84.000 | X:0.500 Y:0.500 | 916.5, 496.5 | 1001.5, 581.5 | 85.0×85.0 |

> 共 2 个带贴图 Image 节点。

## WBP_Common_Button_Grey（灰色按钮）

> 源文件：`X6Game/Content/UI/Common/WidgetBp/Button/WBP_Common_Button_Grey.uasset`　|　WidgetTree 节点数：24

| 层级路径 | 类名 | 素材 | 素材资源路径 | zorder | Anchors | Offsets | Alignment | x0,y0 | x1,y1 | 宽×高 |
|---|---|---|---|---|---|---|---|---|---|---|
| /CanvasPanel_1/ButtonArea/SizeBox_2/ScaleBox_0/Content/HorizontalBox_0/SizeBox_4/Icon_Img | Image | T_UI_icon_money_01 | /Game/UI/Common/Textures/Material_Icon/T_UI_icon_money_01.T_UI_icon_money_01 |  | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 0.0, 0.0 | 0.0×0.0 |
| /CanvasPanel_1/ButtonArea/SizeBox_2/ScaleBox_0/Content/CanvasPanel_3/HorizontalBox/SizeBox_1/ConsoleIcon | Image | T_Icon_quest_0004 | /Game/UI/Image/IconQuest/T_Icon_quest_0004.T_Icon_quest_0004 |  | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 0.0, 0.0 | 0.0×0.0 |
| /CanvasPanel_1/Hover_Img | Image | T_UI_common_btn_h | /Game/UI/Common/Textures/T_UI_common_btn_h.T_UI_common_btn_h | 1 | Min(0.000,0.000) Max(1.000,1.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.500 Y:0.500 | -960.0, -540.0 | 960.0, 540.0 | 1920.0×1080.0 |
| /CanvasPanel_1/Pressed_Img | Image | T_UI_common_btn_gray_n | /Game/UI/Common/Textures/T_UI_common_btn_gray_n.T_UI_common_btn_gray_n | 2 | Min(0.000,0.000) Max(1.000,1.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.500 Y:0.500 | -960.0, -540.0 | 960.0, 540.0 | 1920.0×1080.0 |

> 共 4 个带贴图 Image 节点。

## WBP_Common_Button_Third（三级按钮）

> 源文件：`X6Game/Content/UI/Common/WidgetBp/Button/WBP_Common_Button_Third.uasset`　|　WidgetTree 节点数：23

| 层级路径 | 类名 | 素材 | 素材资源路径 | zorder | Anchors | Offsets | Alignment | x0,y0 | x1,y1 | 宽×高 |
|---|---|---|---|---|---|---|---|---|---|---|
| /CanvasPanel_1/ButtonArea/SizeBox_0/ScaleBox_0/Content/HorizontalBox_0/SizeBox_4/Icon_Img | Image | T_Icon_quest_0004 | /Game/UI/Image/IconQuest/T_Icon_quest_0004.T_Icon_quest_0004 |  | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 0.0, 0.0 | 0.0×0.0 |
| /CanvasPanel_1/ButtonArea/SizeBox_0/ScaleBox_0/Content/CanvasPanel_3/HorizontalBox/SizeBox_1/ConsoleIcon | Image | T_Icon_quest_0004 | /Game/UI/Image/IconQuest/T_Icon_quest_0004.T_Icon_quest_0004 |  | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 0.0, 0.0 | 0.0×0.0 |
| /CanvasPanel_1/Hover_Img | Image | T_UI_common_btn_h | /Game/UI/Common/Textures/T_UI_common_btn_h.T_UI_common_btn_h |  | Min(0.000,0.000) Max(1.000,1.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.500 Y:0.500 | -960.0, -540.0 | 960.0, 540.0 | 1920.0×1080.0 |
| /CanvasPanel_1/Pressed_Img | Image | T_UI_common_btn_white_n | /Game/UI/Common/Textures/T_UI_common_btn_white_n.T_UI_common_btn_white_n | 1 | Min(0.000,0.000) Max(1.000,1.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.500 Y:0.500 | -960.0, -540.0 | 960.0, 540.0 | 1920.0×1080.0 |

> 共 4 个带贴图 Image 节点。

## WBP_Common_Round_Btn（圆形按钮）

> 源文件：`X6Game/Content/UI/Common/WidgetBp/Button/WBP_Common_Round_Btn.uasset`　|　WidgetTree 节点数：9

| 层级路径 | 类名 | 素材 | 素材资源路径 | zorder | Anchors | Offsets | Alignment | x0,y0 | x1,y1 | 宽×高 |
|---|---|---|---|---|---|---|---|---|---|---|
| /CanvasPanel_30/CanvasPanel_48/Img_Bg | Image | T_UI_common_btn_blackbg_n | /Game/UI/Common/Textures/T_UI_common_btn_blackbg_n.T_UI_common_btn_blackbg_n |  | Min(0.500,0.500) Max(0.500,0.500) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.500 Y:0.500 | 960.0, 540.0 | 960.0, 540.0 | 0.0×0.0 |
| /CanvasPanel_30/CanvasPanel_48/Img_Bg_Selected | Image | T_UI_map_bg_btn_place_collection_n3_25_PNG | /Game/__ExternalPaper2dAtlas__/SaveAtlas/UI/SysMap/Texture/V2/__Frames/T_UI_map_bg_btn_place_collection_n3_25_PNG.T_UI_map_bg_btn_place_collection_n3_25_PNG |  | Min(0.500,0.500) Max(0.500,0.500) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.500 Y:0.500 | 960.0, 540.0 | 960.0, 540.0 | 0.0×0.0 |
| /CanvasPanel_30/CanvasPanel_48/SizeBox_0/Img_Icon | Image | T_UI_map_bg_btn_place_collection_n3_25_3_PNG | /Game/__ExternalPaper2dAtlas__/SaveAtlas/UI/SysMap/Texture/V2/__Frames/T_UI_map_bg_btn_place_collection_n3_25_3_PNG.T_UI_map_bg_btn_place_collection_n3_25_3_PNG |  | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 0.0, 0.0 | 0.0×0.0 |
| /CanvasPanel_30/CanvasPanel_48/Img_Bg_P | Image | T_UI_map_bg_btn_place_collection_n3_25_PNG | /Game/__ExternalPaper2dAtlas__/SaveAtlas/UI/SysMap/Texture/V2/__Frames/T_UI_map_bg_btn_place_collection_n3_25_PNG.T_UI_map_bg_btn_place_collection_n3_25_PNG | 1 | Min(0.500,0.500) Max(0.500,0.500) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.500 Y:0.500 | 960.0, 540.0 | 960.0, 540.0 | 0.0×0.0 |
| /CanvasPanel_30/CanvasPanel_48/Img_H | Image | T_UI_common_btn_back_h | /Game/UI/Common/Textures/T_UI_common_btn_back_h.T_UI_common_btn_back_h |  | Min(0.500,0.500) Max(0.500,0.500) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.500 Y:0.500 | 960.0, 540.0 | 960.0, 540.0 | 0.0×0.0 |

> 共 5 个带贴图 Image 节点。

## WBP_Common_Jump_Btn（跳转按钮）

> 源文件：`X6Game/Content/UI/Common/WidgetBp/Button/WBP_Common_Jump_Btn.uasset`　|　WidgetTree 节点数：15

| 层级路径 | 类名 | 素材 | 素材资源路径 | zorder | Anchors | Offsets | Alignment | x0,y0 | x1,y1 | 宽×高 |
|---|---|---|---|---|---|---|---|---|---|---|
| /CanvasPanel_0/CanvasPanel_12/BG_Normal | Image | T_UI_house_animal_img_jump_PNG | /Game/__ExternalPaper2dAtlas__/SaveAtlas/UI/SysHomeUI/SysHomePetCostume/Texture/__Frames/T_UI_house_animal_img_jump_PNG.T_UI_house_animal_img_jump_PNG | -1 | Min(0.000,0.000) Max(1.000,1.000) | L:-76.000 T:-25.000 R:-110.000 B:-22.000 | X:0.500 Y:0.500 | -1019.0, -566.5 | 867.0, 516.5 | 1886.0×1083.0 |
| /CanvasPanel_0/CanvasPanel_12/BG_Hover | Image | T_UI_house_animal_img_jump_PNG | /Game/__ExternalPaper2dAtlas__/SaveAtlas/UI/SysHomeUI/SysHomePetCostume/Texture/__Frames/T_UI_house_animal_img_jump_PNG.T_UI_house_animal_img_jump_PNG | -1 | Min(0.000,0.000) Max(1.000,1.000) | L:-76.000 T:-25.000 R:-110.000 B:-22.000 | X:0.500 Y:0.500 | -1019.0, -566.5 | 867.0, 516.5 | 1886.0×1083.0 |
| /CanvasPanel_0/CanvasPanel_12/BG_Pressed | Image | T_UI_house_animal_img_jump_PNG | /Game/__ExternalPaper2dAtlas__/SaveAtlas/UI/SysHomeUI/SysHomePetCostume/Texture/__Frames/T_UI_house_animal_img_jump_PNG.T_UI_house_animal_img_jump_PNG | 2 | Min(0.000,0.000) Max(1.000,1.000) | L:-76.000 T:-25.000 R:-110.000 B:-22.000 | X:0.500 Y:0.500 | -1019.0, -566.5 | 867.0, 516.5 | 1886.0×1083.0 |
| /CanvasPanel_0/CanvasPanel_12/CanvasPanel_Btn/X6PlatformWidgetSwitcher_Keytip/Overlay_43/Image_62 | Image | T_UI_desgin_btn_jump_n_PNG | /Game/__ExternalPaper2dAtlas__/SaveAtlas/UI/SysDrawDesining/Textures/__Frames/T_UI_desgin_btn_jump_n_PNG.T_UI_desgin_btn_jump_n_PNG |  | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 0.0, 0.0 | 0.0×0.0 |

> 共 4 个带贴图 Image 节点。

## WBP_Common_backbtn（返回按钮）

> 源文件：`X6Game/Content/UI/Common/WidgetBp/Button/WBP_Common_backbtn.uasset`　|　WidgetTree 节点数：31

| 层级路径 | 类名 | 素材 | 素材资源路径 | zorder | Anchors | Offsets | Alignment | x0,y0 | x1,y1 | 宽×高 |
|---|---|---|---|---|---|---|---|---|---|---|
| /CanvasPanel_0/CanvasPanel_1/HorizontalBox_1/SizeBox_1/Switch_Icon/CanvasPanel_30/Normal_Img | Image | T_UI_common_btn_back_n | /Game/UI/Common/Textures/T_UI_common_btn_back_n.T_UI_common_btn_back_n |  | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 0.0, 0.0 | 0.0×0.0 |
| /CanvasPanel_0/CanvasPanel_1/HorizontalBox_1/SizeBox_1/Switch_Icon/CanvasPanel_30/Fx_Normal_Img | Image | MI_UI_Btn_Edge_03 | /Game/UI/Common/Material/MI_UI_Btn_Edge_03.MI_UI_Btn_Edge_03 |  | Min(0.500,0.500) Max(0.500,0.500) | L:0.264 T:-0.192 R:0.000 B:0.000 | X:0.500 Y:0.500 | 960.4, 539.7 | 960.1, 539.9 | -0.3×0.2 |
| /CanvasPanel_0/CanvasPanel_1/HorizontalBox_1/SizeBox_1/Switch_Icon/CanvasPanel_30/Fx_Normal_Img_1 | Image | MI_UI_Btn_Edge_04 | /Game/UI/Common/Material/MI_UI_Btn_Edge_04.MI_UI_Btn_Edge_04 |  | Min(0.500,0.500) Max(0.500,0.500) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.500 Y:0.500 | 960.0, 540.0 | 960.0, 540.0 | 0.0×0.0 |
| /CanvasPanel_0/CanvasPanel_1/HorizontalBox_1/SizeBox_1/Switch_Icon/CanvasPanel_30/Hover_Img | Image | T_UI_common_btn_back_h | /Game/UI/Common/Textures/T_UI_common_btn_back_h.T_UI_common_btn_back_h |  | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 0.0, 0.0 | 0.0×0.0 |
| /CanvasPanel_0/CanvasPanel_1/HorizontalBox_1/SizeBox_1/Switch_Icon/CanvasPanel_30/Pressed_Img | Image | T_UI_common_btn_back_n | /Game/UI/Common/Textures/T_UI_common_btn_back_n.T_UI_common_btn_back_n |  | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 0.0, 0.0 | 0.0×0.0 |
| /CanvasPanel_0/CanvasPanel_1/HorizontalBox_1/SizeBox_1/Switch_Icon/SizeBox_2/Image_PX_Icon | Image | T_UI_HUD_btn_ps5_grocery_n_PNG | /Game/__ExternalPaper2dAtlas__/SaveAtlas/UI/Common/Textures/SystemIcon/__Frames/T_UI_HUD_btn_ps5_grocery_n_PNG.T_UI_HUD_btn_ps5_grocery_n_PNG |  | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 0.0, 0.0 | 0.0×0.0 |
| /CanvasPanel_0/CanvasPanel_1/HorizontalBox_1/SizeBox_0/ScaleBox_0/WidgetSwitcher_0/Overlay_0/Image_shadow | Image | T_UI_common_bg_title_shadow | /Game/UI/Common/Textures/T_UI_common_bg_title_shadow.T_UI_common_bg_title_shadow |  | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 0.0, 0.0 | 0.0×0.0 |
| /CanvasPanel_0/CanvasPanel_1/InfoPanel/X6PlatformWidgetSwitcher_0/CanvasPanel_2/Image_N | Image | T_UI_common_icon_info_02_n_PNG | /Game/__ExternalPaper2dAtlas__/SaveAtlas/UI/Common/Textures/Button_Icon/__Frames/T_UI_common_icon_info_02_n_PNG.T_UI_common_icon_info_02_n_PNG |  | Min(0.500,0.500) Max(0.500,0.500) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.500 Y:0.500 | 960.0, 540.0 | 960.0, 540.0 | 0.0×0.0 |
| /CanvasPanel_0/CanvasPanel_1/InfoPanel/X6PlatformWidgetSwitcher_0/CanvasPanel_2/Image_H | Image | T_UI_common_icon_info_02_h_PNG | /Game/__ExternalPaper2dAtlas__/SaveAtlas/UI/Common/Textures/Button_Icon/__Frames/T_UI_common_icon_info_02_h_PNG.T_UI_common_icon_info_02_h_PNG | 1 | Min(0.500,0.500) Max(0.500,0.500) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.500 Y:0.500 | 960.0, 540.0 | 960.0, 540.0 | 0.0×0.0 |

> 共 9 个带贴图 Image 节点。

## WBP_Common_Backbtn_Base（返回按钮基座）

> 源文件：`X6Game/Content/UI/Common/WidgetBp/Button/WBP_Common_Backbtn_Base.uasset`　|　WidgetTree 节点数：1

| 层级路径 | 类名 | 素材 | 素材资源路径 | zorder | Anchors | Offsets | Alignment | x0,y0 | x1,y1 | 宽×高 |
|---|---|---|---|---|---|---|---|---|---|---|

> 共 0 个带贴图 Image 节点。
