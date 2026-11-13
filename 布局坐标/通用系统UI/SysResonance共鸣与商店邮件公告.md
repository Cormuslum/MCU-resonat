# 《无限暖暖》UI 布局坐标表 —— 通用系统UI（共鸣/商店/邮件/公告）

> 数据来源：游戏解包 .uasset（UMG WidgetBlueprint），经 CUE4Parse + usmap 反射反序列化 WidgetTree 获得。

> 坐标系：以 1920×1080 为设计分辨率。坐标为绝对像素 (x0,y0,x1,y1,宽,高)，x0,y0 为左上角，x1,y1 为右下角。负值/超出屏幕表示元素延伸到屏幕外（游戏内正常现象）。

> zorder 表示同父级下的叠放顺序（越小越靠底）。未列出的元素 zorder 默认 0。

> 说明：此表为 UI 树中带贴图/材质的 Image 类节点；TextBlock、布局容器等未贴图节点不在表中。

## WBP_Resonance_Main_New（共鸣主界面）

> 源文件：`X6Game/Content/UI/SysResonance/Main/WBP_Resonance_Main_New.uasset`　|　WidgetTree 节点数：84

| 层级路径 | 类名 | 素材 | 素材资源路径 | zorder | Anchors | Offsets | Alignment | x0,y0 | x1,y1 | 宽×高 |
|---|---|---|---|---|---|---|---|---|---|---|
| /CanvasPanel_Main/BG/Image_Bg_1 | Image | T_UI_resonance_bg_textures_01 | /Game/UI/SysResonance/Texture/T_UI_resonance_bg_textures_01.T_UI_resonance_bg_textures_01 |  | Min(0.000,0.000) Max(1.000,1.000) | L:-320.000 T:-180.000 R:-320.000 B:-180.000 | X:0.500 Y:0.500 | -1280.0, -720.0 | 640.0, 360.0 | 1920.0×1080.0 |
| /CanvasPanel_Main/BG/Image_Bg_2 | Image | MI_UI_Resonance_Gacha_Bg_Line_01 | /Game/UI/SysResonance/Material/MI_UI_Resonance_Gacha_Bg_Line_01.MI_UI_Resonance_Gacha_Bg_Line_01 |  | Min(0.500,1.000) Max(0.500,1.000) | L:296.608 T:-82.051 R:2432.000 B:336.000 | X:0.500 Y:0.500 | 188.9, 788.9 | 2324.3, 1207.0 | 2135.4×418.1 |
| /CanvasPanel_Main/BG/Image_Bg_3 | Image | T_UI_resonance_bg_Light_01 | /Game/UI/SysResonance/Texture/T_UI_resonance_bg_Light_01.T_UI_resonance_bg_Light_01 |  | Min(0.500,1.000) Max(0.500,1.000) | L:0.000 T:-309.840 R:0.000 B:-66.476 | X:0.500 Y:0.000 | 960.0, 770.2 | 960.0, 1013.5 | 0.0×243.4 |
| /CanvasPanel_Main/BG/Fx_Bg_Black | Image | MI_UI_Resonance_Main_Bottom_Black | /Game/UI/SysResonance/Material/MI_UI_Resonance_Main_Bottom_Black.MI_UI_Resonance_Main_Bottom_Black |  | Min(0.000,0.600) Max(1.000,1.000) | L:0.000 T:112.000 R:0.000 B:-160.000 | X:0.000 Y:1.000 | 0.0, 600.0 | 1920.0, 760.0 | 1920.0×160.0 |
| /CanvasPanel_Main/BG/Fx_Glow_01 | Image | MI_UI_SkyLight_01 | /Game/UI/UIParticle/UI_Material/MI_UI_SkyLight_01.MI_UI_SkyLight_01 | 2 | Min(0.500,0.000) Max(0.500,0.000) | L:-808.000 T:422.000 R:1155.000 B:600.000 | X:0.000 Y:0.000 | 152.0, 422.0 | 2115.0, 600.0 | 1963.0×178.0 |
| /CanvasPanel_Main/BG/Fx_Glow_02 | Image | MI_UI_SkyLight_02 | /Game/UI/UIParticle/UI_Material/MI_UI_SkyLight_02.MI_UI_SkyLight_02 | 2 | Min(0.500,0.000) Max(0.500,0.000) | L:-757.000 T:365.000 R:1026.000 B:538.000 | X:0.000 Y:0.000 | 203.0, 365.0 | 1986.0, 538.0 | 1783.0×173.0 |
| /CanvasPanel_Main/Effect/img_titleBg | Image | T_UI_Glow_23 | /Game/UI/UIParticle/Texture/T_UI_Glow_23.T_UI_Glow_23 |  | Min(0.500,0.500) Max(0.500,0.500) | L:-300.000 T:-720.000 R:63.000 B:456.000 | X:0.500 Y:0.500 | 478.5, -768.0 | 841.5, 408.0 | 363.0×1176.0 |
| /CanvasPanel_Main/SafeZone/VerticalBox_Panel/CanvasPanel_Panel/ScaleBox_Features/CanvasPanel_Features/ScaleBox_Roll/Bottom/Resonance_OneRoll/Cost_OneRoll/SizeBox_0/Image_CostIcon | Image | T_UI_icon_003_PNG | /Game/__ExternalPaper2dAtlas__/SaveAtlas/UI/Common/Textures/Material_Icon/__Frames/T_UI_icon_003_PNG.T_UI_icon_003_PNG |  | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 0.0, 0.0 | 0.0×0.0 |
| /CanvasPanel_Main/SafeZone/VerticalBox_Panel/CanvasPanel_Panel/ScaleBox_Features/CanvasPanel_Features/ScaleBox_Roll/Bottom/Resonance_TenRolls/Cost_TenRolls/SizeBox_TenRolls/Image_CostIcon_1 | Image | T_UI_icon_003_PNG | /Game/__ExternalPaper2dAtlas__/SaveAtlas/UI/Common/Textures/Material_Icon/__Frames/T_UI_icon_003_PNG.T_UI_icon_003_PNG |  | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 0.0, 0.0 | 0.0×0.0 |
| /CanvasPanel_Main/Switcher_Console/CanvasPanel_KeyTips/Image_Down | Image | T_UI_pc_img_tab_s | /Game/UI/Common/Textures/T_UI_pc_img_tab_s.T_UI_pc_img_tab_s |  | Min(0.000,1.000) Max(1.000,1.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:1.000 | 0.0, 1080.0 | 1920.0, 1080.0 | 1920.0×0.0 |

> 共 10 个带贴图 Image 节点。

## WBP_Resonance_Btn_Mall（共鸣商店按钮）

> 源文件：`X6Game/Content/UI/SysResonance/Main/WBP_Resonance_Btn_Mall.uasset`　|　WidgetTree 节点数：17

| 层级路径 | 类名 | 素材 | 素材资源路径 | zorder | Anchors | Offsets | Alignment | x0,y0 | x1,y1 | 宽×高 |
|---|---|---|---|---|---|---|---|---|---|---|
| /CanvasPanel_1/CanvasPanel_2/BG | Image | T_UI_resonance_btn_shop_n | /Game/UI/SysResonance/Texture/T_UI_resonance_btn_shop_n.T_UI_resonance_btn_shop_n |  | Min(0.000,0.500) Max(1.000,0.500) | L:-38.000 T:0.000 R:-39.000 B:60.000 | X:0.500 Y:0.500 | -997.5, 510.0 | 921.5, 570.0 | 1919.0×60.0 |
| /CanvasPanel_1/CanvasPanel_2/Hover | Image | T_UI_resonance_btn_shop_h | /Game/UI/SysResonance/Texture/T_UI_resonance_btn_shop_h.T_UI_resonance_btn_shop_h |  | Min(0.000,0.500) Max(1.000,0.500) | L:-38.000 T:0.000 R:-39.000 B:60.000 | X:0.500 Y:0.500 | -997.5, 510.0 | 921.5, 570.0 | 1919.0×60.0 |
| /CanvasPanel_1/CanvasPanel_2/Select | Image | T_UI_resonance_btn_shop_n | /Game/UI/SysResonance/Texture/T_UI_resonance_btn_shop_n.T_UI_resonance_btn_shop_n | 1 | Min(0.000,0.500) Max(1.000,0.500) | L:-38.000 T:0.000 R:-39.000 B:60.000 | X:0.500 Y:0.500 | -997.5, 510.0 | 921.5, 570.0 | 1919.0×60.0 |
| /CanvasPanel_1/Collect/Image_178 | Image | T_UI_resonance_bg02_PNG | /Game/__ExternalPaper2dAtlas__/SaveAtlas/UI/SysResonance/Texture/__Frames/T_UI_resonance_bg02_PNG.T_UI_resonance_bg02_PNG |  | Min(0.000,0.000) Max(1.000,1.000) | L:-15.000 T:-5.000 R:-15.000 B:-5.000 | X:0.000 Y:0.000 | -15.0, -5.0 | 1905.0, 1075.0 | 1920.0×1080.0 |

> 共 4 个带贴图 Image 节点。

## WBP_Resonance_Wants_Btn（共鸣愿望按钮）

> 源文件：`X6Game/Content/UI/SysResonance/Main/WBP_Resonance_Wants_Btn.uasset`　|　WidgetTree 节点数：10

| 层级路径 | 类名 | 素材 | 素材资源路径 | zorder | Anchors | Offsets | Alignment | x0,y0 | x1,y1 | 宽×高 |
|---|---|---|---|---|---|---|---|---|---|---|

> 共 0 个带贴图 Image 节点。

## WBP_Resonance_Tab（共鸣标签页）

> 源文件：`X6Game/Content/UI/SysResonance/Main/WBP_Resonance_Tab.uasset`　|　WidgetTree 节点数：33

| 层级路径 | 类名 | 素材 | 素材资源路径 | zorder | Anchors | Offsets | Alignment | x0,y0 | x1,y1 | 宽×高 |
|---|---|---|---|---|---|---|---|---|---|---|
| /CanvasPanel_20/ScaleBox_0/Wish_Cloth/ScaleBox_4/CanvasPanel_0/Image_N | Image | T_UI_resonance_btn_limitwish_n | /Game/UI/SysResonance/Texture/V2/T_UI_resonance_btn_limitwish_n.T_UI_resonance_btn_limitwish_n |  | Min(0.500,0.500) Max(0.500,0.500) | L:-76.000 T:-70.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 884.0, 470.0 | 960.0, 540.0 | 76.0×70.0 |
| /CanvasPanel_20/ScaleBox_0/Wish_Cloth/ScaleBox_4/CanvasPanel_0/Image_H | Image | T_UI_resonance_btn_limitwish_h | /Game/UI/SysResonance/Texture/V2/T_UI_resonance_btn_limitwish_h.T_UI_resonance_btn_limitwish_h |  | Min(0.500,0.500) Max(0.500,0.500) | L:-76.000 T:-70.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 884.0, 470.0 | 960.0, 540.0 | 76.0×70.0 |
| /CanvasPanel_20/ScaleBox_0/Wish_Cloth/ScaleBox_4/CanvasPanel_0/Switcher_Icon/Image_Icon | Image | T_Icon_mall_0109 | /Game/UI/Image/IconMall/T_Icon_mall_0109.T_Icon_mall_0109 |  | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 0.0, 0.0 | 0.0×0.0 |
| /CanvasPanel_20/ScaleBox_0/Wish_Cloth/ScaleBox_4/CanvasPanel_0/Switcher_Icon/Empty/Image_Empty | Image | T_UI_resonance_btn_limitwish_add_n | /Game/UI/SysResonance/Texture/V2/T_UI_resonance_btn_limitwish_add_n.T_UI_resonance_btn_limitwish_add_n |  | Min(0.500,0.500) Max(0.500,0.500) | L:0.000 T:0.000 R:36.000 B:36.000 | X:0.500 Y:0.500 | 942.0, 522.0 | 978.0, 558.0 | 36.0×36.0 |
| /CanvasPanel_20/ScaleBox_0/Wish_Cloth/ScaleBox_4/CanvasPanel_0/Wish_Get/Image_Wish_Get_Mask | Image | T_UI_resonance_btn_limitwish_mask_PNG | /Game/__ExternalPaper2dAtlas__/SaveAtlas/UI/SysResonance/Texture/V2/__Frames/T_UI_resonance_btn_limitwish_mask_PNG.T_UI_resonance_btn_limitwish_mask_PNG |  | Min(0.500,0.500) Max(0.500,0.500) | L:-2.000 T:4.000 R:128.000 B:128.000 | X:0.500 Y:0.500 | 893.0, 482.0 | 1023.0, 606.0 | 130.0×124.0 |
| /CanvasPanel_20/ScaleBox_0/Wish_Cloth/ScaleBox_4/CanvasPanel_0/Wish_Get/Image_Get | Image | T_UI_resonance_bg_wish_clothes_all | /Game/UI/SysResonance/Texture/V2/T_UI_resonance_bg_wish_clothes_all.T_UI_resonance_bg_wish_clothes_all |  | Min(0.500,0.500) Max(0.500,0.500) | L:-1.000 T:5.000 R:60.000 B:60.000 | X:0.500 Y:0.500 | 928.5, 517.5 | 989.5, 572.5 | 61.0×55.0 |
| /CanvasPanel_20/ScaleBox_0/Wish_Cloth/CanvasPanel_2/Star/Bg_Progress_Text | Image | T_UI_fragranc_img_text_shadow_PNG | /Game/__ExternalPaper2dAtlas__/SaveAtlas/UI/SysClothes/Textures/Fragrance/__Frames/T_UI_fragranc_img_text_shadow_PNG.T_UI_fragranc_img_text_shadow_PNG | 1 | Min(0.000,0.500) Max(1.000,0.500) | L:0.000 T:-12.000 R:0.000 B:27.000 | X:0.000 Y:0.000 | 0.0, 528.0 | 1920.0, 567.0 | 1920.0×39.0 |
| /CanvasPanel_20/ScaleBox_0/Wish_Cloth/CanvasPanel_2/RemainTimes/Time_1/Image_Bg_1 | Image | T_UI_fragranc_img_text_shadow_PNG | /Game/__ExternalPaper2dAtlas__/SaveAtlas/UI/SysClothes/Textures/Fragrance/__Frames/T_UI_fragranc_img_text_shadow_PNG.T_UI_fragranc_img_text_shadow_PNG |  | Min(0.000,0.000) Max(1.000,1.000) | L:-50.000 T:0.000 R:-50.000 B:0.000 | X:0.500 Y:0.500 | -1010.0, -540.0 | 910.0, 540.0 | 1920.0×1080.0 |

> 共 8 个带贴图 Image 节点。

## WBP_Resonance_TabItem_PX（共鸣标签页项(PC)）

> 源文件：`X6Game/Content/UI/SysResonance/Main/WBP_Resonance_TabItem_PX.uasset`　|　WidgetTree 节点数：30

| 层级路径 | 类名 | 素材 | 素材资源路径 | zorder | Anchors | Offsets | Alignment | x0,y0 | x1,y1 | 宽×高 |
|---|---|---|---|---|---|---|---|---|---|---|
| /CanvasPanel_Tab/CanvasPanel_TabItem/N/Image_0 | Image | T_UI_resonance_gacha_048_list_PNG | /Game/__ExternalPaper2dAtlas__/SaveAtlas/UI/SysResonance/Texture/Pic/048/__Frames/T_UI_resonance_gacha_048_list_PNG.T_UI_resonance_gacha_048_list_PNG |  | Min(0.500,0.500) Max(0.500,0.500) | L:-128.000 T:-60.000 R:256.000 B:112.000 | X:0.000 Y:0.000 | 832.0, 480.0 | 1216.0, 652.0 | 384.0×172.0 |
| /CanvasPanel_Tab/CanvasPanel_TabItem/N/WidgetSwitcher_Type/Normal/Bg_Normal | Image | T_UI_resonance_bg_limit_01 | /Game/UI/SysResonance/Texture/V2/T_UI_resonance_bg_limit_01.T_UI_resonance_bg_limit_01 |  | Min(0.000,0.000) Max(0.000,0.000) | L:-20.000 T:-16.000 R:168.000 B:60.000 | X:0.000 Y:0.000 | -20.0, -16.0 | 168.0, 60.0 | 188.0×76.0 |
| /CanvasPanel_Tab/CanvasPanel_TabItem/N/WidgetSwitcher_Type/Limit/WidgetSwitcher_LimitBg/Bg_Limit | Image | T_UI_resonance_bg_limit_02_PNG | /Game/__ExternalPaper2dAtlas__/SaveAtlas/UI/SysResonance/Texture/V2/__Frames/T_UI_resonance_bg_limit_02_PNG.T_UI_resonance_bg_limit_02_PNG |  | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 0.0, 0.0 | 0.0×0.0 |
| /CanvasPanel_Tab/CanvasPanel_TabItem/N/WidgetSwitcher_Type/Limit/WidgetSwitcher_LimitBg/Bg_Limit_Special | Image | T_UI_resonance_bg_limit_03 | /Game/UI/SysResonance/Texture/V2/T_UI_resonance_bg_limit_03.T_UI_resonance_bg_limit_03 |  | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 0.0, 0.0 | 0.0×0.0 |
| /CanvasPanel_Tab/CanvasPanel_TabItem/N/Name/Bg_Name | Image | T_UI_resonance_bg_list_line | /Game/UI/SysResonance/Texture/V2/T_UI_resonance_bg_list_line.T_UI_resonance_bg_list_line |  | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:0.000 R:256.000 B:48.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 256.0, 48.0 | 256.0×48.0 |
| /CanvasPanel_Tab/CanvasPanel_TabItem/h/Image | Image | T_UI_resonance_bg_limitlist_h02 | /Game/UI/SysResonance/Texture/T_UI_resonance_bg_limitlist_h02.T_UI_resonance_bg_limitlist_h02 |  | Min(0.500,0.500) Max(0.500,0.500) | L:0.000 T:-2.000 R:286.000 B:146.000 | X:0.500 Y:0.500 | 817.0, 464.0 | 1103.0, 612.0 | 286.0×148.0 |
| /CanvasPanel_Tab/CanvasPanel_TabItem/S/Image_121 | Image | T_UI_resonance_bg_list_line_h | /Game/UI/SysResonance/Texture/V2/T_UI_resonance_bg_list_line_h.T_UI_resonance_bg_list_line_h |  | Min(0.500,0.500) Max(0.500,0.500) | L:0.000 T:-2.000 R:286.000 B:146.000 | X:0.500 Y:0.500 | 817.0, 464.0 | 1103.0, 612.0 | 286.0×148.0 |
| /CanvasPanel_Tab/CanvasPanel_TabItem/CanvasPanel_SendGift/Image_SendGift | Image | T_UI_0209ResonanceGift_main_tab_icon | /Game/UI/SysResonance/Texture/SendGift/T_UI_0209ResonanceGift_main_tab_icon.T_UI_0209ResonanceGift_main_tab_icon |  | Min(0.000,0.500) Max(1.000,0.500) | L:-17.000 T:-7.000 R:-29.000 B:0.000 | X:0.000 Y:0.500 | -17.0, 529.5 | 1891.0, 536.5 | 1908.0×7.0 |

> 共 8 个带贴图 Image 节点。

## WBP_Resonance_FullScreenPanel（共鸣全屏面板）

> 源文件：`X6Game/Content/UI/SysResonance/Main/WBP_Resonance_FullScreenPanel.uasset`　|　WidgetTree 节点数：43

| 层级路径 | 类名 | 素材 | 素材资源路径 | zorder | Anchors | Offsets | Alignment | x0,y0 | x1,y1 | 宽×高 |
|---|---|---|---|---|---|---|---|---|---|---|
| /CanvasPanel_0/SafeZone_0/CanvasPanel_49/CanvasPanel_80/ScaleBox_0/VerticalBox_0/CanvasPanel_1/PictureGroup/Image_GuidePicture | Image | T_UI_newguide_img_loading | /Game/UI/SysGuide/Texture/T_UI_newguide_img_loading.T_UI_newguide_img_loading |  | Min(0.000,0.000) Max(1.000,1.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 1920.0, 1080.0 | 1920.0×1080.0 |
| /CanvasPanel_0/SafeZone_0/CanvasPanel_49/CanvasPanel_80/ScaleBox_0/VerticalBox_0/CanvasPanel_1/Decorate_01 | Image | T_UI_newguide_img_bigframe_n | /Game/UI/SysGuide/Texture/T_UI_newguide_img_bigframe_n.T_UI_newguide_img_bigframe_n |  | Min(0.500,0.500) Max(0.500,0.500) | L:0.000 T:0.000 R:1264.000 B:706.000 | X:0.500 Y:0.500 | 328.0, 187.0 | 1592.0, 893.0 | 1264.0×706.0 |
| /CanvasPanel_0/SafeZone_0/CanvasPanel_49/X6PlatformWidgetSwitcher/KeyTips/Image_Down | Image | T_UI_pc_img_tab_s | /Game/UI/Common/Textures/T_UI_pc_img_tab_s.T_UI_pc_img_tab_s |  | Min(0.000,0.000) Max(1.000,1.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:1.000 | 0.0, -1080.0 | 1920.0, 0.0 | 1920.0×1080.0 |

> 共 3 个带贴图 Image 节点。

## WBP_Resonance_More_New（共鸣更多(新)）

> 源文件：`X6Game/Content/UI/SysResonance/Main/WBP_Resonance_More_New.uasset`　|　WidgetTree 节点数：88

| 层级路径 | 类名 | 素材 | 素材资源路径 | zorder | Anchors | Offsets | Alignment | x0,y0 | x1,y1 | 宽×高 |
|---|---|---|---|---|---|---|---|---|---|---|
| /CanvasPanel_0/BG/Image_381 | Image | T_UI_resonance_bg_textures_01 | /Game/UI/SysResonance/Texture/T_UI_resonance_bg_textures_01.T_UI_resonance_bg_textures_01 |  | Min(0.000,0.000) Max(1.000,1.000) | L:-320.000 T:-180.000 R:-320.000 B:-180.000 | X:0.500 Y:0.500 | -1280.0, -720.0 | 640.0, 360.0 | 1920.0×1080.0 |
| /CanvasPanel_0/BG/Image_64 | Image | MI_UI_Resonance_Gacha_Bg_Line_01 | /Game/UI/SysResonance/Material/MI_UI_Resonance_Gacha_Bg_Line_01.MI_UI_Resonance_Gacha_Bg_Line_01 |  | Min(0.500,1.000) Max(0.500,1.000) | L:296.608 T:-82.051 R:2432.000 B:336.000 | X:0.500 Y:0.500 | 188.9, 788.9 | 2324.3, 1207.0 | 2135.4×418.1 |
| /CanvasPanel_0/BG/Fx_Bg_Smoke_02 | Image | MI_UI_Resonance_Bg_Smoke_03 | /Game/UI/SysResonance/Material/MI_UI_Resonance_Bg_Smoke_03.MI_UI_Resonance_Bg_Smoke_03 |  | Min(0.500,1.000) Max(0.500,1.000) | L:449.857 T:-26.602 R:1000.000 B:500.000 | X:0.500 Y:0.500 | 1134.8, 790.1 | 1684.9, 1316.7 | 550.1×526.6 |
| /CanvasPanel_0/BG/Fx_Bg_Smoke_01 | Image | MI_UI_Resonance_Bg_Smoke_03 | /Game/UI/SysResonance/Material/MI_UI_Resonance_Bg_Smoke_03.MI_UI_Resonance_Bg_Smoke_03 |  | Min(0.500,1.000) Max(0.500,1.000) | L:-470.136 T:17.435 R:1000.000 B:500.000 | X:0.500 Y:0.500 | -245.2, 856.2 | 1224.9, 1338.7 | 1470.1×482.6 |
| /CanvasPanel_0/BG/Image_452 | Image | T_UI_resonance_bg_Light_01 | /Game/UI/SysResonance/Texture/T_UI_resonance_bg_Light_01.T_UI_resonance_bg_Light_01 |  | Min(0.500,1.000) Max(0.500,1.000) | L:0.000 T:-309.840 R:0.000 B:-66.476 | X:0.500 Y:0.000 | 960.0, 770.2 | 960.0, 1013.5 | 0.0×243.4 |
| /CanvasPanel_0/SafeZone_0/CanvasPanel_30/HorizontalBox_1/CanvasPanel_58/X6PlatformScaleBox_4/CanvasPanel_1/Bg_Tab_Line | Image | T_UI_resonance_btn_long_details_n | /Game/UI/SysResonance/Texture/V2/T_UI_resonance_btn_long_details_n.T_UI_resonance_btn_long_details_n |  | Min(0.000,0.500) Max(1.000,0.500) | L:-59.000 T:-40.000 R:-90.000 B:100.000 | X:0.000 Y:0.000 | -59.0, 500.0 | 1830.0, 640.0 | 1889.0×140.0 |
| /CanvasPanel_0/SafeZone_0/CanvasPanel_30/HorizontalBox_1/CanvasPanel_58/X6PlatformScaleBox_4/CanvasPanel_1/Image_369 | Image | T_UI_resonance_btn_long_details02_bg_PNG | /Game/__ExternalPaper2dAtlas__/SaveAtlas/UI/SysResonance/Texture/V2/__Frames/T_UI_resonance_btn_long_details02_bg_PNG.T_UI_resonance_btn_long_details02_bg_PNG |  | Min(0.000,0.500) Max(1.000,0.500) | L:164.000 T:0.000 R:164.000 B:0.000 | X:0.500 Y:0.500 | -796.0, 540.0 | 1124.0, 540.0 | 1920.0×0.0 |
| /CanvasPanel_0/SafeZone_0/CanvasPanel_30/HorizontalBox_1/CanvasPanel_58/X6PlatformScaleBox_4/CanvasPanel_1/Image_254 | Image | T_UI_resonance_btn_long_details02_line_PNG | /Game/__ExternalPaper2dAtlas__/SaveAtlas/UI/SysResonance/Texture/__Frames/T_UI_resonance_btn_long_details02_line_PNG.T_UI_resonance_btn_long_details02_line_PNG |  | Min(0.000,0.500) Max(0.000,0.500) | L:480.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.500 | 480.0, 540.0 | 0.0, 540.0 | -480.0×0.0 |
| /CanvasPanel_0/SafeZone_0/CanvasPanel_30/HorizontalBox_1/CanvasPanel_58/X6PlatformScaleBox_4/CanvasPanel_1/Image_1 | Image | T_UI_resonance_btn_long_details02_line_PNG | /Game/__ExternalPaper2dAtlas__/SaveAtlas/UI/SysResonance/Texture/__Frames/T_UI_resonance_btn_long_details02_line_PNG.T_UI_resonance_btn_long_details02_line_PNG |  | Min(0.000,0.500) Max(0.000,0.500) | L:965.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.500 | 965.0, 540.0 | 0.0, 540.0 | -965.0×0.0 |
| /CanvasPanel_0/SafeZone_0/CanvasPanel_30/HorizontalBox_1/CanvasPanel_58/CanvasPanel_2/Image_2 | Image | T_UI_Events_common015_img_line_02_PNG | /Game/__ExternalPaper2dAtlas__/SaveAtlas/UI/SysResonance/Texture/__Frames/T_UI_Events_common015_img_line_02_PNG.T_UI_Events_common015_img_line_02_PNG |  | Min(0.000,0.000) Max(0.000,1.000) | L:-29.000 T:-114.000 R:0.000 B:20.000 | X:0.000 Y:0.000 | -29.0, -114.0 | 0.0, 1100.0 | 29.0×1214.0 |
| /CanvasPanel_0/SafeZone_0/CanvasPanel_30/HorizontalBox_1/CanvasPanel_58/CanvasPanel_2/Switch_Can/X6PlatformScaleBox_3/CanvasPanel_51/Switch/VerticalBox_0/HistoryPanel/RightList/ListBg_01 | Image | T_UI__collocation_bg_photo_n | /Game/UI/Common/Textures/T_UI__collocation_bg_photo_n.T_UI__collocation_bg_photo_n |  | Min(0.000,0.000) Max(1.000,1.000) | L:-4.000 T:-6.000 R:-5.000 B:-4.000 | X:0.000 Y:0.000 | -4.0, -6.0 | 1915.0, 1076.0 | 1919.0×1082.0 |
| /CanvasPanel_0/SafeZone_0/CanvasPanel_30/HorizontalBox_1/CanvasPanel_58/CanvasPanel_2/Switch_Can/X6PlatformScaleBox_3/CanvasPanel_51/Switch/Empty/Image_101 | Image | T_UI_resonance_bg_window_img_none | /Game/UI/SysResonance/Texture/T_UI_resonance_bg_window_img_none.T_UI_resonance_bg_window_img_none |  | Min(0.500,0.500) Max(0.500,0.500) | L:0.000 T:-30.000 R:103.000 B:68.500 | X:0.500 Y:0.500 | 908.5, 460.8 | 1011.5, 559.2 | 103.0×98.5 |
| /CanvasPanel_0/SafeZone_0/CanvasPanel_30/HorizontalBox_1/CanvasPanel_58/CanvasPanel_2/Switch_Can/X6PlatformScaleBox_3/CanvasPanel_51/TitleGroup/TitleBG/Image_7 | Image | T_UI_resonance_bg_window_img_01 | /Game/UI/SysResonance/Texture/T_UI_resonance_bg_window_img_01.T_UI_resonance_bg_window_img_01 |  | Min(0.000,0.500) Max(0.000,0.500) | L:18.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.500 | 18.0, 540.0 | 0.0, 540.0 | -18.0×0.0 |
| /CanvasPanel_0/SafeZone_0/CanvasPanel_30/HorizontalBox_1/CanvasPanel_58/CanvasPanel_2/Switch_Can/X6PlatformScaleBox_3/CanvasPanel_51/TitleGroup/TitleBG/Image_8 | Image | T_UI_resonance_bg_window_img_01 | /Game/UI/SysResonance/Texture/T_UI_resonance_bg_window_img_01.T_UI_resonance_bg_window_img_01 |  | Min(1.000,0.500) Max(1.000,0.500) | L:-314.500 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.500 | 1605.5, 540.0 | 1920.0, 540.0 | 314.5×0.0 |
| /CanvasPanel_0/X6PlatformWidgetSwitcher/KeyTips/Image_Down | Image | T_UI_pc_img_tab_s | /Game/UI/Common/Textures/T_UI_pc_img_tab_s.T_UI_pc_img_tab_s |  | Min(0.000,0.000) Max(1.000,1.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:1.000 | 0.0, -1080.0 | 1920.0, 0.0 | 1920.0×1080.0 |

> 共 15 个带贴图 Image 节点。

## WBP_Resonance_Prompt_Gift（共鸣礼物提示）

> 源文件：`X6Game/Content/UI/SysResonance/Main/WBP_Resonance_Prompt_Gift.uasset`　|　WidgetTree 节点数：19

| 层级路径 | 类名 | 素材 | 素材资源路径 | zorder | Anchors | Offsets | Alignment | x0,y0 | x1,y1 | 宽×高 |
|---|---|---|---|---|---|---|---|---|---|---|
| /CanvasPanel_30/Gift_Pack/Icon/CanvasPanel_1/Image_82 | Image | T_UI_resonance_gift_bg02_PNG | /Game/__ExternalPaper2dAtlas__/SaveAtlas/UI/SysResonance/Texture/__Frames/T_UI_resonance_gift_bg02_PNG.T_UI_resonance_gift_bg02_PNG |  | Min(0.000,0.000) Max(1.000,1.000) | L:-65.000 T:-29.000 R:-50.000 B:-10.000 | X:0.000 Y:0.500 | -65.0, -578.5 | 1870.0, 520.5 | 1935.0×1099.0 |
| /CanvasPanel_30/Gift_Pack/Icon/CanvasPanel_2/Image_Bg_Preview | Image | T_UI_shop_img_mark_donate | /Game/UI/SysSupplyStation/Texture/New/T_UI_shop_img_mark_donate.T_UI_shop_img_mark_donate |  | Min(0.500,0.500) Max(0.500,0.500) | L:0.000 T:0.000 R:120.000 B:120.000 | X:0.500 Y:0.500 | 900.0, 480.0 | 1020.0, 600.0 | 120.0×120.0 |
| /CanvasPanel_30/Gift_Pack/Icon/CanvasPanel_2/SizeBox_1/XingShiIcon_2 | Image | T_Icon_mall_0109 | /Game/UI/Image/IconMall/T_Icon_mall_0109.T_Icon_mall_0109 |  | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 0.0, 0.0 | 0.0×0.0 |
| /CanvasPanel_30/Gift_Pack/Icon/Image_Bg_H | Image | T_UI_resonance_gift_btn_h_PNG | /Game/__ExternalPaper2dAtlas__/SaveAtlas/UI/SysResonance/Texture/__Frames/T_UI_resonance_gift_btn_h_PNG.T_UI_resonance_gift_btn_h_PNG | 1 | Min(0.000,0.000) Max(1.000,1.000) | L:-11.901 T:-10.000 R:-50.000 B:-10.000 | X:0.500 Y:0.500 | -952.9, -550.0 | 929.0, 530.0 | 1881.9×1080.0 |
| /CanvasPanel_30/Gift_Pack/Icon/Time/Border_0/HorizontalBox_0/Image_97 | Image | T__UI_checkin_img_time_PNG | /Game/__ExternalPaper2dAtlas__/SaveAtlas/UI/SysActivity/Textures/__Frames/T__UI_checkin_img_time_PNG.T__UI_checkin_img_time_PNG |  | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 0.0, 0.0 | 0.0×0.0 |

> 共 5 个带贴图 Image 节点。

## WBP_Resonance_RewardItem_PC_V2（共鸣奖励项(PC V2)）

> 源文件：`X6Game/Content/UI/SysResonance/PC/Reward_V2/WBP_Resonance_RewardItem_PC_V2.uasset`　|　WidgetTree 节点数：48

| 层级路径 | 类名 | 素材 | 素材资源路径 | zorder | Anchors | Offsets | Alignment | x0,y0 | x1,y1 | 宽×高 |
|---|---|---|---|---|---|---|---|---|---|---|
| /CanvasPanel_39/CanvasPanel_84/WidgetSwitcher_Quality/Blue/Image_ShowPic_Blue | Image | T_UI_123 | /Game/UI/Common/Textures/T_UI_123.T_UI_123 |  | Min(0.000,0.000) Max(0.000,0.000) | L:36.000 T:47.000 R:204.000 B:290.000 | X:0.000 Y:0.000 | 36.0, 47.0 | 204.0, 290.0 | 168.0×243.0 |
| /CanvasPanel_39/CanvasPanel_84/WidgetSwitcher_Quality/Blue/Image_Frame_Blue | Image | T_UI_resonance_bg_character_01 | /Game/UI/SysResonance/Texture/V2/T_UI_resonance_bg_character_01.T_UI_resonance_bg_character_01 | 1 | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:0.000 R:276.000 B:444.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 276.0, 444.0 | 276.0×444.0 |
| /CanvasPanel_39/CanvasPanel_84/WidgetSwitcher_Quality/Purple/Fx_Purple_Dust_Up | Image | MI_UI_Resonance_Card_Bg_Dust | /Game/UI/SysResonance/Material/MI_UI_Resonance_Card_Bg_Dust.MI_UI_Resonance_Card_Bg_Dust |  | Min(0.500,0.500) Max(0.500,0.500) | L:0.000 T:-120.000 R:240.000 B:240.000 | X:0.500 Y:0.500 | 840.0, 240.0 | 1080.0, 600.0 | 240.0×360.0 |
| /CanvasPanel_39/CanvasPanel_84/WidgetSwitcher_Quality/Purple/Fx_Purple_Dust_Down | Image | MI_UI_Resonance_Card_Bg_Dust | /Game/UI/SysResonance/Material/MI_UI_Resonance_Card_Bg_Dust.MI_UI_Resonance_Card_Bg_Dust |  | Min(0.500,0.500) Max(0.500,0.500) | L:0.000 T:120.000 R:240.000 B:240.000 | X:0.500 Y:0.500 | 840.0, 600.0 | 1080.0, 720.0 | 240.0×120.0 |
| /CanvasPanel_39/CanvasPanel_84/WidgetSwitcher_Quality/Purple/Image_ShowPic_Purple | Image | T_UI_123 | /Game/UI/Common/Textures/T_UI_123.T_UI_123 |  | Min(0.000,0.000) Max(0.000,0.000) | L:36.000 T:47.000 R:204.000 B:290.000 | X:0.000 Y:0.000 | 36.0, 47.0 | 204.0, 290.0 | 168.0×243.0 |
| /CanvasPanel_39/CanvasPanel_84/WidgetSwitcher_Quality/Purple/Image_Frame_Purple | Image | T_UI_resonance_bg_character_02 | /Game/UI/SysResonance/Texture/V2/T_UI_resonance_bg_character_02.T_UI_resonance_bg_character_02 | 1 | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:0.000 R:276.000 B:444.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 276.0, 444.0 | 276.0×444.0 |
| /CanvasPanel_39/CanvasPanel_84/WidgetSwitcher_Quality/Pink/Fx_Pink_Dust_Up | Image | MI_UI_Resonance_Card_Bg_Dust | /Game/UI/SysResonance/Material/MI_UI_Resonance_Card_Bg_Dust.MI_UI_Resonance_Card_Bg_Dust |  | Min(0.500,0.500) Max(0.500,0.500) | L:0.000 T:-140.000 R:240.000 B:240.000 | X:0.500 Y:0.500 | 840.0, 210.0 | 1080.0, 590.0 | 240.0×380.0 |
| /CanvasPanel_39/CanvasPanel_84/WidgetSwitcher_Quality/Pink/Fx_Pink_Dust_Up_Burst | Image | MI_UI_Resonance_Card_Bg_Dust | /Game/UI/SysResonance/Material/MI_UI_Resonance_Card_Bg_Dust.MI_UI_Resonance_Card_Bg_Dust |  | Min(0.500,0.500) Max(0.500,0.500) | L:0.000 T:-140.000 R:240.000 B:240.000 | X:0.500 Y:0.500 | 840.0, 210.0 | 1080.0, 590.0 | 240.0×380.0 |
| /CanvasPanel_39/CanvasPanel_84/WidgetSwitcher_Quality/Pink/Fx_Pink_Dust_Down | Image | MI_UI_Resonance_Card_Bg_Dust | /Game/UI/SysResonance/Material/MI_UI_Resonance_Card_Bg_Dust.MI_UI_Resonance_Card_Bg_Dust |  | Min(0.500,0.500) Max(0.500,0.500) | L:0.000 T:140.000 R:240.000 B:240.000 | X:0.500 Y:0.500 | 840.0, 630.0 | 1080.0, 730.0 | 240.0×100.0 |
| /CanvasPanel_39/CanvasPanel_84/WidgetSwitcher_Quality/Pink/Fx_Pink_Dust_Down_Burst | Image | MI_UI_Resonance_Card_Bg_Dust | /Game/UI/SysResonance/Material/MI_UI_Resonance_Card_Bg_Dust.MI_UI_Resonance_Card_Bg_Dust |  | Min(0.500,0.500) Max(0.500,0.500) | L:0.000 T:140.000 R:240.000 B:240.000 | X:0.500 Y:0.500 | 840.0, 630.0 | 1080.0, 730.0 | 240.0×100.0 |
| /CanvasPanel_39/CanvasPanel_84/WidgetSwitcher_Quality/Pink/RetainerBox_ShowPic/Image_ShowPic_Pink | Image | T_UI_123 | /Game/UI/Common/Textures/T_UI_123.T_UI_123 |  | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 0.0, 0.0 | 0.0×0.0 |
| /CanvasPanel_39/CanvasPanel_84/WidgetSwitcher_Quality/Pink/Image_Frame_Pink | Image | T_UI_resonance_bg_character_03 | /Game/UI/SysResonance/Texture/V2/T_UI_resonance_bg_character_03.T_UI_resonance_bg_character_03 | 1 | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:4.000 R:276.000 B:444.000 | X:0.000 Y:0.000 | 0.0, 4.0 | 276.0, 444.0 | 276.0×440.0 |
| /CanvasPanel_39/CanvasPanel_84/WidgetSwitcher_Quality/Pink/Fx_Glod_Sweep | Image | MI_UI_Get_Card_sweep | /Game/UI/SysResonance/Material/MI_UI_Get_Card_sweep.MI_UI_Get_Card_sweep | 2 | Min(0.500,0.500) Max(0.500,0.500) | L:0.000 T:-38.113 R:210.000 B:303.000 | X:0.500 Y:0.500 | 855.0, 331.3 | 1065.0, 672.4 | 210.0×341.1 |
| /CanvasPanel_39/CanvasPanel_84/WidgetSwitcher_0/RewardTip_Normal/Bg_Reward | Image | T_UI_resonance_bg_transform_01 | /Game/UI/SysResonance/Texture/V2/T_UI_resonance_bg_transform_01.T_UI_resonance_bg_transform_01 |  | Min(0.000,0.500) Max(1.000,0.500) | L:-20.000 T:4.000 R:-16.000 B:44.000 | X:0.500 Y:0.500 | -982.0, 524.0 | 942.0, 564.0 | 1924.0×40.0 |
| /CanvasPanel_39/CanvasPanel_84/WidgetSwitcher_0/RewardTip_Normal/Reward_1/SizeBox/Image_CostIcon_1 | Image | T_icon_shop_0003 | /Game/UI/Common/Textures/Material_Icon/T_icon_shop_0003.T_icon_shop_0003 |  | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 0.0, 0.0 | 0.0×0.0 |
| /CanvasPanel_39/CanvasPanel_84/Fx_Effect/Fx_Glow | Image | MI_UI_Resonance_Glow_01 | /Game/UI/SysResonance/Material/MI_UI_Resonance_Glow_01.MI_UI_Resonance_Glow_01 |  | Min(0.500,0.500) Max(0.500,0.500) | L:0.000 T:0.000 R:1600.000 B:500.000 | X:0.500 Y:0.500 | 160.0, 290.0 | 1760.0, 790.0 | 1600.0×500.0 |
| /CanvasPanel_39/CanvasPanel_84/Fx_Effect/Fx_Door_Line_5x | Image | MI_UI_Resonnance_Door_Line_5x | /Game/UI/SysResonance/Material/MI_UI_Resonnance_Door_Line_5x.MI_UI_Resonnance_Door_Line_5x |  | Min(0.500,0.500) Max(0.500,0.500) | L:0.000 T:0.000 R:512.000 B:512.000 | X:0.500 Y:0.500 | 704.0, 284.0 | 1216.0, 796.0 | 512.0×512.0 |
| /CanvasPanel_39/CanvasPanel_84/Fx_Effect/Fx_Door_Line_5x_Done | Image | MI_UI_Resonnance_Door_Line_5x | /Game/UI/SysResonance/Material/MI_UI_Resonnance_Door_Line_5x.MI_UI_Resonnance_Door_Line_5x |  | Min(0.500,0.500) Max(0.500,0.500) | L:0.000 T:0.000 R:512.000 B:512.000 | X:0.500 Y:0.500 | 704.0, 284.0 | 1216.0, 796.0 | 512.0×512.0 |
| /CanvasPanel_39/CanvasPanel_84/Fx_Effect/Fx_Door_Line_4x | Image | MI_UI_Resonnance_Door_Line_4x | /Game/UI/SysResonance/Material/MI_UI_Resonnance_Door_Line_4x.MI_UI_Resonnance_Door_Line_4x |  | Min(0.500,0.500) Max(0.500,0.500) | L:0.000 T:7.000 R:512.000 B:512.000 | X:0.500 Y:0.500 | 704.0, 294.5 | 1216.0, 799.5 | 512.0×505.0 |
| /CanvasPanel_39/CanvasPanel_84/Fx_Effect/Fx_Door_Line_4x_Done | Image | MI_UI_Resonnance_Door_Line_4x | /Game/UI/SysResonance/Material/MI_UI_Resonnance_Door_Line_4x.MI_UI_Resonnance_Door_Line_4x |  | Min(0.500,0.500) Max(0.500,0.500) | L:0.000 T:7.000 R:512.000 B:512.000 | X:0.500 Y:0.500 | 704.0, 294.5 | 1216.0, 799.5 | 512.0×505.0 |
| /CanvasPanel_39/CanvasPanel_84/Fx_Effect/Fx_Point_Line_1 | Image | MI_UI_Resonnance_Point_Line | /Game/UI/SysResonance/Material/MI_UI_Resonnance_Point_Line.MI_UI_Resonnance_Point_Line |  | Min(0.500,0.500) Max(0.500,0.500) | L:46.496 T:136.655 R:162.000 B:222.000 | X:0.500 Y:0.500 | 948.7, 634.0 | 1064.2, 719.3 | 115.5×85.3 |
| /CanvasPanel_39/CanvasPanel_84/Fx_Effect/Fx_Point_Line_2 | Image | MI_UI_Resonnance_Point_Line | /Game/UI/SysResonance/Material/MI_UI_Resonnance_Point_Line.MI_UI_Resonnance_Point_Line |  | Min(0.500,0.500) Max(0.500,0.500) | L:127.185 T:-349.527 R:162.000 B:222.000 | X:0.500 Y:0.500 | 1069.8, -95.3 | 1104.6, 476.2 | 34.8×571.5 |
| /CanvasPanel_39/CanvasPanel_84/Fx_Effect/Fx_Star | Image | MI_UI_Resonance_Star_01 | /Game/UI/SysResonance/Material/MI_UI_Resonance_Star_01.MI_UI_Resonance_Star_01 |  | Min(0.500,0.500) Max(0.500,0.500) | L:0.000 T:-37.541 R:256.000 B:272.000 | X:0.500 Y:0.500 | 832.0, 347.7 | 1088.0, 657.2 | 256.0×309.5 |

> 共 23 个带贴图 Image 节点。

## WBP_Resonance_ExtraReward_Item（共鸣额外奖励项）

> 源文件：`X6Game/Content/UI/SysResonance/PC/Reward_V2/WBP_Resonance_ExtraReward_Item.uasset`　|　WidgetTree 节点数：15

| 层级路径 | 类名 | 素材 | 素材资源路径 | zorder | Anchors | Offsets | Alignment | x0,y0 | x1,y1 | 宽×高 |
|---|---|---|---|---|---|---|---|---|---|---|
| /CanvasPanel_22/CanvasPanel_67/Bg_ExtraReward | Image | T_showpic_clothes_img_tips_01_PNG | /Game/__ExternalPaper2dAtlas__/SaveAtlas/UI/SysReward/Textures/__Frames/T_showpic_clothes_img_tips_01_PNG.T_showpic_clothes_img_tips_01_PNG |  | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:0.000 R:568.000 B:148.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 568.0, 148.0 | 568.0×148.0 |
| /CanvasPanel_22/CanvasPanel_67/Fx_Select_Img_Edge | Image | MI_UI_ExtraReward_Edge_01 | /Game/UI/SysResonance/Material/MI_UI_ExtraReward_Edge_01.MI_UI_ExtraReward_Edge_01 |  | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:0.000 R:568.000 B:148.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 568.0, 148.0 | 568.0×148.0 |
| /CanvasPanel_22/CanvasPanel_67/Image_319 | Image | T_showpic_clothes_img_line_01 | /Game/UI/SysReward/Textures/T_showpic_clothes_img_line_01.T_showpic_clothes_img_line_01 |  | Min(0.000,0.000) Max(0.000,0.000) | L:120.000 T:54.000 R:286.000 B:2.000 | X:0.000 Y:0.000 | 120.0, 54.0 | 286.0, 2.0 | 166.0×-52.0 |
| /CanvasPanel_22/CanvasPanel_67/Image_Icon | Image | T_UI_123 | /Game/UI/Common/Textures/T_UI_123.T_UI_123 |  | Min(0.000,0.000) Max(0.000,0.000) | L:28.000 T:14.000 R:90.000 B:90.000 | X:0.000 Y:0.000 | 28.0, 14.0 | 90.0, 90.0 | 62.0×76.0 |
| /CanvasPanel_22/CanvasPanel_67/Fx_Select_Img_Glow | Image | MI_UI_ExtarReward_Bg_Glow | /Game/UI/SysResonance/Material/MI_UI_ExtarReward_Bg_Glow.MI_UI_ExtarReward_Bg_Glow |  | Min(0.000,0.000) Max(0.000,0.000) | L:5.000 T:-2.000 R:566.000 B:155.000 | X:0.000 Y:0.000 | 5.0, -2.0 | 566.0, 155.0 | 561.0×157.0 |
| /CanvasPanel_22/CanvasPanel_67/Fx_Select_Img_Star | Image | MI_UI_ParticleBase_09_04 | /Game/UI/UIParticle/UI_Material/MI_UI_ParticleBase_09_04.MI_UI_ParticleBase_09_04 |  | Min(0.000,0.000) Max(0.000,0.000) | L:-40.000 T:-6.000 R:120.000 B:130.000 | X:0.000 Y:0.000 | -40.0, -6.0 | 120.0, 130.0 | 160.0×136.0 |

> 共 6 个带贴图 Image 节点。

## WBP_Resonance_Bonus_List（共鸣加成列表）

> 源文件：`X6Game/Content/UI/SysResonance/PC/Bonus/WBP_Resonance_Bonus_List.uasset`　|　WidgetTree 节点数：27

| 层级路径 | 类名 | 素材 | 素材资源路径 | zorder | Anchors | Offsets | Alignment | x0,y0 | x1,y1 | 宽×高 |
|---|---|---|---|---|---|---|---|---|---|---|
| /CanvasPanel_20/Overlay_0/Bonus_List/RetainerBox_0/CanvasPanel_0/Group_Base/Fx_Line_main_1 | Image | MI_UI_Resonance_Bonos_Line_Main | /Game/UI/SysResonance/Material/MI_UI_Resonance_Bonos_Line_Main.MI_UI_Resonance_Bonos_Line_Main |  | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:-17.000 R:2000.000 B:240.000 | X:0.000 Y:0.000 | 0.0, -17.0 | 2000.0, 240.0 | 2000.0×257.0 |
| /CanvasPanel_20/Overlay_0/Bonus_List/RetainerBox_0/CanvasPanel_0/Group_Base/Fx_Line_deco | Image | MI_UI_Resonance_Bonos_Line_Deco_01 | /Game/UI/SysResonance/Material/MI_UI_Resonance_Bonos_Line_Deco_01.MI_UI_Resonance_Bonos_Line_Deco_01 |  | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:0.000 R:2000.000 B:200.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 2000.0, 200.0 | 2000.0×200.0 |
| /CanvasPanel_20/Overlay_0/Bonus_List/RetainerBox_0/CanvasPanel_0/Group_Base/Fx_Line_deco_1 | Image | MI_UI_Resonance_Bonos_Line_Deco_02 | /Game/UI/SysResonance/Material/MI_UI_Resonance_Bonos_Line_Deco_02.MI_UI_Resonance_Bonos_Line_Deco_02 |  | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:0.000 R:2000.000 B:240.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 2000.0, 240.0 | 2000.0×240.0 |
| /CanvasPanel_20/Overlay_0/Bonus_List/RetainerBox_0/CanvasPanel_0/Group_Highlight/Fx_Line_main_2 | Image | MI_UI_Resonance_Bonos_Line_Main | /Game/UI/SysResonance/Material/MI_UI_Resonance_Bonos_Line_Main.MI_UI_Resonance_Bonos_Line_Main |  | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:-17.000 R:2000.000 B:240.000 | X:0.000 Y:0.000 | 0.0, -17.0 | 2000.0, 240.0 | 2000.0×257.0 |
| /CanvasPanel_20/Overlay_0/Bonus_List/RetainerBox_0/CanvasPanel_0/Group_Highlight/Fx_Line_deco_2 | Image | MI_UI_Resonance_Bonos_Line_Deco_01 | /Game/UI/SysResonance/Material/MI_UI_Resonance_Bonos_Line_Deco_01.MI_UI_Resonance_Bonos_Line_Deco_01 |  | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:0.000 R:2000.000 B:200.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 2000.0, 200.0 | 2000.0×200.0 |
| /CanvasPanel_20/Overlay_0/Bonus_List/RetainerBox_0/CanvasPanel_0/Group_Highlight/Fx_Line_deco_3 | Image | MI_UI_Resonance_Bonos_Line_Deco_02 | /Game/UI/SysResonance/Material/MI_UI_Resonance_Bonos_Line_Deco_02.MI_UI_Resonance_Bonos_Line_Deco_02 |  | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:0.000 R:2000.000 B:240.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 2000.0, 240.0 | 2000.0×240.0 |

> 共 6 个带贴图 Image 节点。

## WBP_Resonance_Bonus_Item（共鸣加成项）

> 源文件：`X6Game/Content/UI/SysResonance/PC/Bonus/WBP_Resonance_Bonus_Item.uasset`　|　WidgetTree 节点数：38

| 层级路径 | 类名 | 素材 | 素材资源路径 | zorder | Anchors | Offsets | Alignment | x0,y0 | x1,y1 | 宽×高 |
|---|---|---|---|---|---|---|---|---|---|---|
| /CanvasPanel_15/Bonus_Item/Image_Special | Image | T_UI_resonance_reward_bg_high_level_n_PNG | /Game/__ExternalPaper2dAtlas__/SaveAtlas/UI/SysResonance/Texture/V2/__Frames/T_UI_resonance_reward_bg_high_level_n_PNG.T_UI_resonance_reward_bg_high_level_n_PNG |  | Min(0.500,0.000) Max(0.500,0.000) | L:-6.000 T:-112.000 R:372.000 B:548.000 | X:0.500 Y:0.000 | 765.0, -112.0 | 1143.0, 548.0 | 378.0×660.0 |
| /CanvasPanel_15/Bonus_Item/Fx_Special_Effect/Image_68 | Image | MI_UI_Resonance_Bonus_Special_Dust | /Game/UI/SysResonance/Material/MI_UI_Resonance_Bonus_Special_Dust.MI_UI_Resonance_Bonus_Special_Dust |  | Min(0.500,0.500) Max(0.500,0.500) | L:0.000 T:0.000 R:147.000 B:422.865 | X:0.500 Y:0.500 | 886.5, 328.6 | 1033.5, 751.4 | 147.0×422.9 |
| /CanvasPanel_15/Bonus_Item/Fx_Special_Effect/Fx_Line_L | Image | MI_UI_Resonance_Bonus_Special_line | /Game/UI/SysResonance/Material/MI_UI_Resonance_Bonus_Special_line.MI_UI_Resonance_Bonus_Special_line |  | Min(0.500,0.500) Max(0.500,0.500) | L:-73.017 T:0.000 R:448.820 B:244.834 | X:0.500 Y:0.500 | 626.1, 417.6 | 1147.9, 662.4 | 521.8×244.8 |
| /CanvasPanel_15/Bonus_Item/Fx_Special_Effect/Fx_Line_R | Image | MI_UI_Resonance_Bonus_Special_line | /Game/UI/SysResonance/Material/MI_UI_Resonance_Bonus_Special_line.MI_UI_Resonance_Bonus_Special_line |  | Min(0.500,0.500) Max(0.500,0.500) | L:78.220 T:0.000 R:448.820 B:244.834 | X:0.500 Y:0.500 | 852.9, 417.6 | 1223.5, 662.4 | 370.6×244.8 |
| /CanvasPanel_15/Bonus_Item/Fx_Special_Effect/Fx_Selected_Glow | Image | MI_UI_Resonance_Bonus_Special_Glow | /Game/UI/SysResonance/Material/MI_UI_Resonance_Bonus_Special_Glow.MI_UI_Resonance_Bonus_Special_Glow |  | Min(0.500,1.000) Max(0.500,1.000) | L:0.000 T:-438.748 R:169.953 B:816.339 | X:0.500 Y:0.500 | 875.0, 13.7 | 1045.0, 1268.8 | 170.0×1255.1 |
| /CanvasPanel_15/Bonus_Item/Fx_Special_Effect/Image_Special_2 | Image | T_UI_resonance_reward_tuning_currently01_PNG | /Game/__ExternalPaper2dAtlas__/SaveAtlas/UI/SysResonance/Texture/V2/__Frames/T_UI_resonance_reward_tuning_currently01_PNG.T_UI_resonance_reward_tuning_currently01_PNG |  | Min(0.500,0.000) Max(0.500,0.000) | L:5.500 T:100.000 R:372.000 B:548.000 | X:0.500 Y:0.000 | 782.2, 100.0 | 1148.8, 548.0 | 366.5×448.0 |
| /CanvasPanel_15/Bonus_Item/Fx_Special_Effect/Image_Special_3 | Image | MI_UI_Resonance_Bonus_Item_Bg_Add | /Game/UI/SysResonance/Material/MI_UI_Resonance_Bonus_Item_Bg_Add.MI_UI_Resonance_Bonus_Item_Bg_Add |  | Min(0.500,0.000) Max(0.500,0.000) | L:5.500 T:100.000 R:372.000 B:548.000 | X:0.500 Y:0.000 | 782.2, 100.0 | 1148.8, 548.0 | 366.5×448.0 |
| /CanvasPanel_15/Bonus_Item/Dot_Mask/WidgetSwitcher_0/Image_Dot_Inactive | Image | T_UI_resonance_reward_img_number_n_PNG | /Game/__ExternalPaper2dAtlas__/SaveAtlas/UI/SysResonance/Texture/V2/__Frames/T_UI_resonance_reward_img_number_n_PNG.T_UI_resonance_reward_img_number_n_PNG |  | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 0.0, 0.0 | 0.0×0.0 |
| /CanvasPanel_15/Bonus_Item/Dot_Mask/WidgetSwitcher_0/Image_Dot_Inactive_Special | Image | T_UI_resonance_reward_img_number_high_level_n_PNG | /Game/__ExternalPaper2dAtlas__/SaveAtlas/UI/SysResonance/Texture/V2/__Frames/T_UI_resonance_reward_img_number_high_level_n_PNG.T_UI_resonance_reward_img_number_high_level_n_PNG |  | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 0.0, 0.0 | 0.0×0.0 |
| /CanvasPanel_15/Bonus_Item/Dot_Mask/WidgetSwitcher_0/Image_Dot_Active | Image | T_UI_resonance_reward_img_number_s_PNG | /Game/__ExternalPaper2dAtlas__/SaveAtlas/UI/SysResonance/Texture/V2/__Frames/T_UI_resonance_reward_img_number_s_PNG.T_UI_resonance_reward_img_number_s_PNG |  | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 0.0, 0.0 | 0.0×0.0 |
| /CanvasPanel_15/Bonus_Item/Dot_Mask/WidgetSwitcher_0/Image_Dot_Finish | Image | T_UI_resonance_reward_img_number_s_PNG | /Game/__ExternalPaper2dAtlas__/SaveAtlas/UI/SysResonance/Texture/V2/__Frames/T_UI_resonance_reward_img_number_s_PNG.T_UI_resonance_reward_img_number_s_PNG |  | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 0.0, 0.0 | 0.0×0.0 |
| /CanvasPanel_15/Bonus_Item/Title/WidgetSwitcher_Bg_Text/Bg_Inactive | Image | T_UI_resonance_reward_bg_number_01_PNG | /Game/__ExternalPaper2dAtlas__/SaveAtlas/UI/SysResonance/Texture/V2/__Frames/T_UI_resonance_reward_bg_number_01_PNG.T_UI_resonance_reward_bg_number_01_PNG |  | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 0.0, 0.0 | 0.0×0.0 |
| /CanvasPanel_15/Bonus_Item/Title/WidgetSwitcher_Bg_Text/Bg_Inactive_Special | Image | T_UI_resonance_reward_bg_number_high_level_01_PNG | /Game/__ExternalPaper2dAtlas__/SaveAtlas/UI/SysResonance/Texture/V2/__Frames/T_UI_resonance_reward_bg_number_high_level_01_PNG.T_UI_resonance_reward_bg_number_high_level_01_PNG |  | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 0.0, 0.0 | 0.0×0.0 |
| /CanvasPanel_15/Bonus_Item/Title/WidgetSwitcher_Bg_Text/Bg_Active | Image | T_UI_resonance_reward_bg_number_01_PNG | /Game/__ExternalPaper2dAtlas__/SaveAtlas/UI/SysResonance/Texture/V2/__Frames/T_UI_resonance_reward_bg_number_01_PNG.T_UI_resonance_reward_bg_number_01_PNG |  | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 0.0, 0.0 | 0.0×0.0 |
| /CanvasPanel_15/Bonus_Item/Title/WidgetSwitcher_Bg_Text/Bg_Finish | Image | T_UI_resonance_reward_bg_number_01_PNG | /Game/__ExternalPaper2dAtlas__/SaveAtlas/UI/SysResonance/Texture/V2/__Frames/T_UI_resonance_reward_bg_number_01_PNG.T_UI_resonance_reward_bg_number_01_PNG |  | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 0.0, 0.0 | 0.0×0.0 |
| /CanvasPanel_15/Bonus_Item/Unlock/Fx_Get_Glow | Image | T_UI_resonance_Bonus_Item_Glow | /Game/UI/SysResonance/Texture/V2/T_UI_resonance_Bonus_Item_Glow.T_UI_resonance_Bonus_Item_Glow |  | Min(0.500,0.500) Max(0.500,0.500) | L:0.000 T:5.500 R:0.000 B:0.000 | X:0.500 Y:0.500 | 960.0, 548.2 | 960.0, 542.8 | 0.0×-5.5 |
| /CanvasPanel_15/Bonus_Item/CanvasPanel_Progress/Image_88 | Image | T_UI_resonance_reward_tuning_txtbg02_PNG | /Game/__ExternalPaper2dAtlas__/SaveAtlas/UI/SysResonance/Texture/__Frames/T_UI_resonance_reward_tuning_txtbg02_PNG.T_UI_resonance_reward_tuning_txtbg02_PNG |  | Min(0.000,0.000) Max(1.000,1.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.500 | 0.0, -540.0 | 1920.0, 540.0 | 1920.0×1080.0 |

> 共 17 个带贴图 Image 节点。

## WBP_Resonance_Wish_Clothes_Main（共鸣许愿衣服主界面）

> 源文件：`X6Game/Content/UI/SysResonance/PC/WBP_Resonance_Wish_Clothes_Main.uasset`　|　WidgetTree 节点数：75

| 层级路径 | 类名 | 素材 | 素材资源路径 | zorder | Anchors | Offsets | Alignment | x0,y0 | x1,y1 | 宽×高 |
|---|---|---|---|---|---|---|---|---|---|---|
| /CanvasPanel_13/BG/Image_381 | Image | T_UI_resonance_bg_textures_01 | /Game/UI/SysResonance/Texture/T_UI_resonance_bg_textures_01.T_UI_resonance_bg_textures_01 |  | Min(0.000,0.000) Max(1.000,1.000) | L:-320.000 T:-180.000 R:-320.000 B:-180.000 | X:0.500 Y:0.500 | -1280.0, -720.0 | 640.0, 360.0 | 1920.0×1080.0 |
| /CanvasPanel_13/BG/Image_64 | Image | MI_UI_Resonance_Gacha_Bg_Line_01 | /Game/UI/SysResonance/Material/MI_UI_Resonance_Gacha_Bg_Line_01.MI_UI_Resonance_Gacha_Bg_Line_01 |  | Min(0.500,1.000) Max(0.500,1.000) | L:296.608 T:-82.051 R:2432.000 B:336.000 | X:0.500 Y:0.500 | 188.9, 788.9 | 2324.3, 1207.0 | 2135.4×418.1 |
| /CanvasPanel_13/BG/Fx_Bg_Smoke_02 | Image | MI_UI_Resonance_Bg_Smoke_03 | /Game/UI/SysResonance/Material/MI_UI_Resonance_Bg_Smoke_03.MI_UI_Resonance_Bg_Smoke_03 |  | Min(0.500,1.000) Max(0.500,1.000) | L:449.857 T:-26.602 R:1000.000 B:500.000 | X:0.500 Y:0.500 | 1134.8, 790.1 | 1684.9, 1316.7 | 550.1×526.6 |
| /CanvasPanel_13/BG/Fx_Bg_Smoke_01 | Image | MI_UI_Resonance_Bg_Smoke_03 | /Game/UI/SysResonance/Material/MI_UI_Resonance_Bg_Smoke_03.MI_UI_Resonance_Bg_Smoke_03 |  | Min(0.500,1.000) Max(0.500,1.000) | L:-470.136 T:17.435 R:1000.000 B:500.000 | X:0.500 Y:0.500 | -245.2, 856.2 | 1224.9, 1338.7 | 1470.1×482.6 |
| /CanvasPanel_13/BG/Image_452 | Image | T_UI_resonance_bg_Light_01 | /Game/UI/SysResonance/Texture/T_UI_resonance_bg_Light_01.T_UI_resonance_bg_Light_01 |  | Min(0.500,1.000) Max(0.500,1.000) | L:0.000 T:-309.840 R:0.000 B:-66.476 | X:0.500 Y:0.000 | 960.0, 770.2 | 960.0, 1013.5 | 0.0×243.4 |
| /CanvasPanel_13/Left/Image_397 | Image | T_UI_physical_img_line_PNG | /Game/__ExternalPaper2dAtlas__/SaveAtlas/UI/SysChallenge/Textures/V2/__Frames/T_UI_physical_img_line_PNG.T_UI_physical_img_line_PNG |  | Min(0.000,0.000) Max(0.000,0.000) | L:592.000 T:241.000 R:106.000 B:42.000 | X:0.000 Y:0.000 | 592.0, 241.0 | 106.0, 42.0 | -486.0×-199.0 |
| /CanvasPanel_13/Left/Select_Cloth/Select/Fx_Energy | Image | MI_UI_Wish_Bg_Energy | /Game/UI/SysResonance/Material/MI_UI_Wish_Bg_Energy.MI_UI_Wish_Bg_Energy |  | Min(0.500,0.500) Max(0.500,0.500) | L:31.317 T:-1.374 R:600.000 B:500.000 | X:0.500 Y:0.500 | 707.0, 287.9 | 1275.7, 789.3 | 568.7×501.4 |
| /CanvasPanel_13/Left/Select_Cloth/Select/Icon/Bg_Wish_Clothes_Normal | Image | T_UI_resonance_bg_wish_clothes_s | /Game/UI/SysResonance/Texture/V2/T_UI_resonance_bg_wish_clothes_s.T_UI_resonance_bg_wish_clothes_s |  | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 0.0, 0.0 | 0.0×0.0 |
| /CanvasPanel_13/Left/Select_Cloth/Select/Icon/Img_Wish_Bg | Image | MI_UI_Renonance_Wish_Bg_Draw | /Game/UI/SysResonance/Material/MI_UI_Renonance_Wish_Bg_Draw.MI_UI_Renonance_Wish_Bg_Draw |  | Min(0.500,0.500) Max(0.500,0.500) | L:30.934 T:6.760 R:0.000 B:0.000 | X:0.500 Y:0.500 | 1006.4, 550.1 | 975.5, 543.4 | -30.9×-6.8 |
| /CanvasPanel_13/Left/Select_Cloth/Select/Icon/Img_Grade_Rays | Image | MI_UI_Renonance_Bouns_Rays | /Game/UI/SysResonance/Material/MI_UI_Renonance_Bouns_Rays.MI_UI_Renonance_Bouns_Rays |  | Min(0.500,0.500) Max(0.500,0.500) | L:25.000 T:11.000 R:360.000 B:360.000 | X:0.500 Y:0.500 | 817.5, 376.5 | 1152.5, 725.5 | 335.0×349.0 |
| /CanvasPanel_13/Left/Select_Cloth/Select/Icon/Img_Wish_Cir | Image | MI_UI_Resonance_Wish_Cir | /Game/UI/SysResonance/Material/MI_UI_Resonance_Wish_Cir.MI_UI_Resonance_Wish_Cir |  | Min(0.500,0.500) Max(0.500,0.500) | L:27.000 T:14.000 R:280.000 B:280.000 | X:0.500 Y:0.500 | 860.5, 421.0 | 1113.5, 687.0 | 253.0×266.0 |
| /CanvasPanel_13/Left/Select_Cloth/Select/Icon/Img_Wish_Deco_01 | Image | T_UI_physical_img_line_PNG | /Game/__ExternalPaper2dAtlas__/SaveAtlas/UI/SysChallenge/Textures/V2/__Frames/T_UI_physical_img_line_PNG.T_UI_physical_img_line_PNG |  | Min(0.500,0.500) Max(0.500,0.500) | L:-159.000 T:11.000 R:0.000 B:0.000 | X:0.500 Y:0.500 | 721.5, 556.5 | 880.5, 545.5 | 159.0×-11.0 |
| /CanvasPanel_13/Left/Select_Cloth/Select/Icon/Img_Wish_Deco_02 | Image | T_UI_physical_img_line_PNG | /Game/__ExternalPaper2dAtlas__/SaveAtlas/UI/SysChallenge/Textures/V2/__Frames/T_UI_physical_img_line_PNG.T_UI_physical_img_line_PNG |  | Min(0.500,0.500) Max(0.500,0.500) | L:213.000 T:11.000 R:0.000 B:0.000 | X:0.500 Y:0.500 | 1279.5, 556.5 | 1066.5, 545.5 | -213.0×-11.0 |
| /CanvasPanel_13/Left/Select_Cloth/Select/Icon/Img_Wish_Squa | Image | T_UI_resonance_bg_wish_clothes_squa | /Game/UI/SysResonance/Texture/V2/T_UI_resonance_bg_wish_clothes_squa.T_UI_resonance_bg_wish_clothes_squa |  | Min(0.500,0.500) Max(0.500,0.500) | L:27.000 T:14.000 R:0.000 B:0.000 | X:0.500 Y:0.500 | 1000.5, 561.0 | 973.5, 547.0 | -27.0×-14.0 |
| /CanvasPanel_13/Left/Select_Cloth/Select/Icon/Image_Icon | Image | T_UI_123 | /Game/UI/Common/Textures/T_UI_123.T_UI_123 |  | Min(0.000,0.000) Max(0.000,0.000) | L:172.000 T:136.000 R:217.000 B:217.000 | X:0.000 Y:0.000 | 172.0, 136.0 | 217.0, 217.0 | 45.0×81.0 |
| /CanvasPanel_13/Left/Select_Cloth/Select/Get/Image_Get | Image | T_UI_resonance_bg_wish_clothes_all | /Game/UI/SysResonance/Texture/V2/T_UI_resonance_bg_wish_clothes_all.T_UI_resonance_bg_wish_clothes_all |  | Min(0.000,0.000) Max(0.000,0.000) | L:228.000 T:197.000 R:108.000 B:108.000 | X:0.000 Y:0.000 | 228.0, 197.0 | 108.0, 108.0 | -120.0×-89.0 |
| /CanvasPanel_13/Left/Select_Cloth/Select/WidgetSwitcher_Quality/Image_Blue | Image | T_UI_resonance_img_rank_03_PNG | /Game/__ExternalPaper2dAtlas__/SaveAtlas/UI/SysResonance/Texture/V2/__Frames/T_UI_resonance_img_rank_03_PNG.T_UI_resonance_img_rank_03_PNG |  | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 0.0, 0.0 | 0.0×0.0 |
| /CanvasPanel_13/Left/Select_Cloth/Select/WidgetSwitcher_Quality/Image_Purple | Image | T_UI_resonance_img_rank_02_PNG | /Game/__ExternalPaper2dAtlas__/SaveAtlas/UI/SysResonance/Texture/V2/__Frames/T_UI_resonance_img_rank_02_PNG.T_UI_resonance_img_rank_02_PNG |  | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 0.0, 0.0 | 0.0×0.0 |
| /CanvasPanel_13/Left/Select_Cloth/Select/WidgetSwitcher_Quality/Image_Pink | Image | T_UI_resonance_img_rank_01_PNG | /Game/__ExternalPaper2dAtlas__/SaveAtlas/UI/SysResonance/Texture/V2/__Frames/T_UI_resonance_img_rank_01_PNG.T_UI_resonance_img_rank_01_PNG |  | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 0.0, 0.0 | 0.0×0.0 |
| /CanvasPanel_13/Left/Select_Cloth/Empty/Bg_Wish_Clothes_Empty | Image | T_UI_resonance_bg_wish_clothes_g_PNG | /Game/__ExternalPaper2dAtlas__/SaveAtlas/UI/SysResonance/Texture/V2/__Frames/T_UI_resonance_bg_wish_clothes_g_PNG.T_UI_resonance_bg_wish_clothes_g_PNG |  | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:0.000 R:502.857 B:462.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 502.9, 462.0 | 502.9×462.0 |
| /CanvasPanel_13/Left/Progress/Bg_Progress_Text | Image | T_UI_fragranc_img_text_shadow_PNG | /Game/__ExternalPaper2dAtlas__/SaveAtlas/UI/SysClothes/Textures/Fragrance/__Frames/T_UI_fragranc_img_text_shadow_PNG.T_UI_fragranc_img_text_shadow_PNG |  | Min(0.000,0.000) Max(0.000,1.000) | L:0.000 T:0.000 R:620.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 620.0, 1080.0 | 620.0×1080.0 |
| /CanvasPanel_13/Right/BG_Title | Image | T_UI_physical_img_title_03 | /Game/UI/SysChallenge/Textures/V2/T_UI_physical_img_title_03.T_UI_physical_img_title_03 |  | Min(0.000,0.000) Max(0.000,0.000) | L:178.000 T:66.000 R:350.000 B:74.000 | X:0.000 Y:0.000 | 178.0, 66.0 | 350.0, 74.0 | 172.0×8.0 |
| /CanvasPanel_13/Right/BG_Title_1 | Image | T_UI_physical_img_title_03 | /Game/UI/SysChallenge/Textures/V2/T_UI_physical_img_title_03.T_UI_physical_img_title_03 |  | Min(0.000,0.000) Max(0.000,0.000) | L:528.000 T:66.000 R:350.000 B:74.000 | X:0.000 Y:0.000 | 528.0, 66.0 | 350.0, 74.0 | -178.0×8.0 |
| /CanvasPanel_13/Right/Title/Image_TitleDec | Image | T_UI_physical_img_title_04_PNG | /Game/__ExternalPaper2dAtlas__/SaveAtlas/UI/SysChallenge/Textures/V2/__Frames/T_UI_physical_img_title_04_PNG.T_UI_physical_img_title_04_PNG |  | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 0.0, 0.0 | 0.0×0.0 |
| /CanvasPanel_13/Right/Title/Image_TitleDec_1 | Image | T_UI_physical_img_title_04_PNG | /Game/__ExternalPaper2dAtlas__/SaveAtlas/UI/SysChallenge/Textures/V2/__Frames/T_UI_physical_img_title_04_PNG.T_UI_physical_img_title_04_PNG |  | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 0.0, 0.0 | 0.0×0.0 |
| /CanvasPanel_13/Right/Image_Line | Image | T_UI_resonance_btn_wish_line_01 | /Game/UI/SysResonance/Texture/V2/T_UI_resonance_btn_wish_line_01.T_UI_resonance_btn_wish_line_01 |  | Min(0.000,0.000) Max(0.000,1.000) | L:8.000 T:60.000 R:2.000 B:70.000 | X:0.000 Y:0.000 | 8.0, 60.0 | 2.0, 1150.0 | -6.0×1090.0 |
| /CanvasPanel_13/Right/WidgetSwitcher_Btn/Finish/ScaleBox_3/Hint_Finish/Image_TitleDec_2 | Image | T_UI_resonance_reward_img_message_01_PNG | /Game/__ExternalPaper2dAtlas__/SaveAtlas/UI/SysResonance/Texture/V2/__Frames/T_UI_resonance_reward_img_message_01_PNG.T_UI_resonance_reward_img_message_01_PNG |  | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 0.0, 0.0 | 0.0×0.0 |
| /CanvasPanel_13/Right/WidgetSwitcher_Btn/Finish/ScaleBox_3/Hint_Finish/Image_TitleDec_3 | Image | T_UI_resonance_reward_img_message_01_PNG | /Game/__ExternalPaper2dAtlas__/SaveAtlas/UI/SysResonance/Texture/V2/__Frames/T_UI_resonance_reward_img_message_01_PNG.T_UI_resonance_reward_img_message_01_PNG |  | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 0.0, 0.0 | 0.0×0.0 |

> 共 28 个带贴图 Image 节点。

## WBP_Resonance_Main_SuitInfo_V2（共鸣套装信息主界面 V2）

> 源文件：`X6Game/Content/UI/SysResonance/PC/WBP_Resonance_Main_SuitInfo_V2.uasset`　|　WidgetTree 节点数：40

| 层级路径 | 类名 | 素材 | 素材资源路径 | zorder | Anchors | Offsets | Alignment | x0,y0 | x1,y1 | 宽×高 |
|---|---|---|---|---|---|---|---|---|---|---|
| /CanvasPanel_18/Suit_Name/Bg_Star | Image | T_UI_resonance_gacha_clothesinfo_PNG | /Game/__ExternalPaper2dAtlas__/SaveAtlas/UI/SysResonance/Texture/__Frames/T_UI_resonance_gacha_clothesinfo_PNG.T_UI_resonance_gacha_clothesinfo_PNG |  | Min(0.000,0.000) Max(0.000,0.000) | L:124.000 T:92.000 R:232.000 B:40.000 | X:0.000 Y:0.000 | 124.0, 92.0 | 232.0, 40.0 | 108.0×-52.0 |
| /CanvasPanel_18/Suit_Name/Name/Bg_Name | Image | T_UI_resonance_gacha_001_name01 | /Game/UI/SysResonance/Texture/V2/T_UI_resonance_gacha_001_name01.T_UI_resonance_gacha_001_name01 |  | Min(0.000,0.000) Max(1.000,1.000) | L:-50.000 T:-15.000 R:-44.000 B:-30.000 | X:0.000 Y:0.000 | -50.0, -15.0 | 1876.0, 1050.0 | 1926.0×1065.0 |
| /CanvasPanel_18/Suit_Name/Name/Bg_Name_Hover | Image | T_UI_resonance_gacha_001_name01_h | /Game/UI/SysResonance/Texture/V2/T_UI_resonance_gacha_001_name01_h.T_UI_resonance_gacha_001_name01_h |  | Min(0.000,0.000) Max(1.000,1.000) | L:-50.000 T:-15.000 R:-44.000 B:-30.000 | X:0.000 Y:0.000 | -50.0, -15.0 | 1876.0, 1050.0 | 1926.0×1065.0 |
| /CanvasPanel_18/Suit_Name/Name/Bg_Name_Hover_Line_01 | Image | MI_UI_Resonance_Pic01_SuitInfo_Hover_Line | /Game/UI/SysResonance/Material/MI_UI_Resonance_Pic01_SuitInfo_Hover_Line.MI_UI_Resonance_Pic01_SuitInfo_Hover_Line |  | Min(0.000,0.000) Max(1.000,1.000) | L:-50.000 T:-35.000 R:-20.000 B:10.000 | X:0.000 Y:0.000 | -50.0, -35.0 | 1900.0, 1090.0 | 1950.0×1125.0 |
| /CanvasPanel_18/Suit_Name/Name/Bg_Name_Hover_Line_02 | Image | MI_UI_Resonance_Pic01_SuitInfo_Hover_Line | /Game/UI/SysResonance/Material/MI_UI_Resonance_Pic01_SuitInfo_Hover_Line.MI_UI_Resonance_Pic01_SuitInfo_Hover_Line |  | Min(0.000,0.000) Max(1.000,1.000) | L:-50.000 T:15.650 R:-20.000 B:-35.000 | X:0.000 Y:0.000 | -50.0, 15.7 | 1900.0, 1045.0 | 1950.0×1029.3 |
| /CanvasPanel_18/Suit_Name/Suit_Progress/WidgetSwitcher_0/Progress/Image_0 | Image | T_UI_resonance_wish_bg_number_n | /Game/UI/SysResonance/Texture/V2/T_UI_resonance_wish_bg_number_n.T_UI_resonance_wish_bg_number_n |  | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 0.0, 0.0 | 0.0×0.0 |
| /CanvasPanel_18/Suit_Name/Suit_Progress/WidgetSwitcher_0/Finish/Image | Image | T_UI_resonance_wish_bg_number_all | /Game/UI/SysResonance/Texture/V2/T_UI_resonance_wish_bg_number_all.T_UI_resonance_wish_bg_number_all |  | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 0.0, 0.0 | 0.0×0.0 |
| /CanvasPanel_18/Suit_Name/Suit_Progress/WidgetSwitcher_Set_Text/Second_Set/Bg_Text_Second | Image | T_UI_resonance_bg_first_set_PNG | /Game/__ExternalPaper2dAtlas__/SaveAtlas/UI/SysResonance/Texture/V2/__Frames/T_UI_resonance_bg_first_set_PNG.T_UI_resonance_bg_first_set_PNG |  | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:4.000 R:180.000 B:36.000 | X:0.000 Y:0.000 | 0.0, 4.0 | 180.0, 36.0 | 180.0×32.0 |
| /CanvasPanel_18/Suit_Name/Suit_Progress/WidgetSwitcher_Set_Text/Complete/Bg_Text_Finish | Image | T_UI_resonance_bg_collected_PNG | /Game/__ExternalPaper2dAtlas__/SaveAtlas/UI/SysResonance/Texture/V2/__Frames/T_UI_resonance_bg_collected_PNG.T_UI_resonance_bg_collected_PNG |  | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:4.000 R:180.000 B:36.000 | X:0.000 Y:0.000 | 0.0, 4.0 | 180.0, 36.0 | 180.0×32.0 |
| /CanvasPanel_18/Suit_Name/Suit_Progress/Image_Progress_Hover | Image | MI_UI_Resonance_SuitInfo_Hover | /Game/UI/SysResonance/Material/MI_UI_Resonance_SuitInfo_Hover.MI_UI_Resonance_SuitInfo_Hover |  | Min(0.500,0.500) Max(0.500,0.500) | L:0.000 T:-5.000 R:174.000 B:174.000 | X:0.500 Y:0.500 | 873.0, 445.5 | 1047.0, 624.5 | 174.0×179.0 |
| /CanvasPanel_18/Suit_Name/Suit_Progress/Image_Progress_Hover_1 | Image | MI_UI_Resonance_SuitInfo_Hover | /Game/UI/SysResonance/Material/MI_UI_Resonance_SuitInfo_Hover.MI_UI_Resonance_SuitInfo_Hover |  | Min(0.500,0.500) Max(0.500,0.500) | L:0.000 T:-5.000 R:174.000 B:174.000 | X:0.500 Y:0.500 | 873.0, 445.5 | 1047.0, 624.5 | 174.0×179.0 |
| /CanvasPanel_18/Suit_Name/Wish_Select/Bg_Want_Suit_Sign_01 | Image | T_UI_resonance_img_wish_sign_bg | /Game/UI/SysResonance/Texture/V2/T_UI_resonance_img_wish_sign_bg.T_UI_resonance_img_wish_sign_bg |  | Min(0.000,0.000) Max(0.000,0.000) | L:152.000 T:-16.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 152.0, -16.0 | 0.0, 0.0 | -152.0×16.0 |
| /CanvasPanel_18/Suit_Name/Wish_Select/Image_Want_Suit_01 | Image | T_UI_resonance_img_wish_sign_n | /Game/UI/SysResonance/Texture/V2/T_UI_resonance_img_wish_sign_n.T_UI_resonance_img_wish_sign_n | 1 | Min(0.000,0.000) Max(0.000,0.000) | L:152.000 T:-12.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 152.0, -12.0 | 0.0, 0.0 | -152.0×12.0 |

> 共 13 个带贴图 Image 节点。

## WBP_Resonance_Bouns_Jump_Btn（共鸣加成跳转按钮）

> 源文件：`X6Game/Content/UI/SysResonance/WidgetBp/WBP_Resonance_Bouns_Jump_Btn.uasset`　|　WidgetTree 节点数：15

| 层级路径 | 类名 | 素材 | 素材资源路径 | zorder | Anchors | Offsets | Alignment | x0,y0 | x1,y1 | 宽×高 |
|---|---|---|---|---|---|---|---|---|---|---|
| /CanvasPanel_0/CanvasPanel_12/BG_Normal | Image | T_UI_resonance_reward_btn_go_n_PNG | /Game/__ExternalPaper2dAtlas__/SaveAtlas/UI/SysResonance/Texture/Bonus/__Frames/T_UI_resonance_reward_btn_go_n_PNG.T_UI_resonance_reward_btn_go_n_PNG | -1 | Min(0.000,0.000) Max(1.000,1.000) | L:-80.000 T:-18.000 R:-130.000 B:-18.000 | X:0.500 Y:0.500 | -1015.0, -558.0 | 855.0, 522.0 | 1870.0×1080.0 |
| /CanvasPanel_0/CanvasPanel_12/BG_Hover | Image | T_UI_resonance_reward_btn_go_h_PNG | /Game/__ExternalPaper2dAtlas__/SaveAtlas/UI/SysResonance/Texture/Bonus/__Frames/T_UI_resonance_reward_btn_go_h_PNG.T_UI_resonance_reward_btn_go_h_PNG | -1 | Min(0.000,0.000) Max(1.000,1.000) | L:-80.000 T:-18.000 R:-130.000 B:-18.000 | X:0.500 Y:0.500 | -1015.0, -558.0 | 855.0, 522.0 | 1870.0×1080.0 |
| /CanvasPanel_0/CanvasPanel_12/BG_Pressed | Image | T_UI_resonance_reward_btn_go_dwn_PNG | /Game/__ExternalPaper2dAtlas__/SaveAtlas/UI/SysResonance/Texture/Bonus/__Frames/T_UI_resonance_reward_btn_go_dwn_PNG.T_UI_resonance_reward_btn_go_dwn_PNG | 2 | Min(0.000,0.000) Max(1.000,1.000) | L:-80.000 T:-18.000 R:-130.000 B:-18.000 | X:0.500 Y:0.500 | -1015.0, -558.0 | 855.0, 522.0 | 1870.0×1080.0 |
| /CanvasPanel_0/CanvasPanel_12/CanvasPanel_Btn/X6PlatformWidgetSwitcher_Keytip/Overlay_43/Image_62 | Image | T_UI_desgin_btn_jump_n_PNG | /Game/__ExternalPaper2dAtlas__/SaveAtlas/UI/SysDrawDesining/Textures/__Frames/T_UI_desgin_btn_jump_n_PNG.T_UI_desgin_btn_jump_n_PNG |  | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 0.0, 0.0 | 0.0×0.0 |

> 共 4 个带贴图 Image 节点。

## WBP_Resonance_Bouns_Reward（共鸣加成奖励）

> 源文件：`X6Game/Content/UI/SysResonance/WidgetBp/WBP_Resonance_Bouns_Reward.uasset`　|　WidgetTree 节点数：28

| 层级路径 | 类名 | 素材 | 素材资源路径 | zorder | Anchors | Offsets | Alignment | x0,y0 | x1,y1 | 宽×高 |
|---|---|---|---|---|---|---|---|---|---|---|
| /CanvasPanel_25/CanvasPanel_90/Image_84 | Image | T_UI_resonance_reward_giftbox_PNG | /Game/__ExternalPaper2dAtlas__/SaveAtlas/UI/SysResonance/Texture/Bonus/__Frames/T_UI_resonance_reward_giftbox_PNG.T_UI_resonance_reward_giftbox_PNG |  | Min(0.500,0.500) Max(0.500,0.500) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.500 Y:0.500 | 960.0, 540.0 | 960.0, 540.0 | 0.0×0.0 |
| /CanvasPanel_25/CanvasPanel_90/Overlay_0/Image | Image | T_UI_resonance_reward_giftbg | /Game/UI/SysResonance/Texture/Bonus/T_UI_resonance_reward_giftbg.T_UI_resonance_reward_giftbg |  | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 0.0, 0.0 | 0.0×0.0 |
| /CanvasPanel_25/CanvasPanel_90/Overlay_0/SizeBox_0/Icon_Reward | Image | T_UI_icon_027 | /Game/UI/Common/Textures/Material_Icon/T_UI_icon_027.T_UI_icon_027 |  | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 0.0, 0.0 | 0.0×0.0 |
| /CanvasPanel_25/CanvasPanel_90/WidgetSwitcher_Reward/CanvasPanel_28/Overlay_1/SizeBox/Icon_Reward_S | Image | T_UI_icon_027 | /Game/UI/Common/Textures/Material_Icon/T_UI_icon_027.T_UI_icon_027 |  | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 0.0, 0.0 | 0.0×0.0 |
| /CanvasPanel_25/CanvasPanel_90/WidgetSwitcher_Reward/CanvasPanel_28/Overlay_1/ScaleBox_0/Image_1 | Image | T_UI_resonance_reward_giftbg | /Game/UI/SysResonance/Texture/Bonus/T_UI_resonance_reward_giftbg.T_UI_resonance_reward_giftbg |  | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 0.0, 0.0 | 0.0×0.0 |
| /CanvasPanel_25/CanvasPanel_90/WidgetSwitcher_Reward/CanvasPanel_28/Overlay_2/SizeBox_1/Icon_Reward_S_1 | Image | T_UI_icon_027 | /Game/UI/Common/Textures/Material_Icon/T_UI_icon_027.T_UI_icon_027 |  | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 0.0, 0.0 | 0.0×0.0 |
| /CanvasPanel_25/CanvasPanel_90/WidgetSwitcher_Reward/CanvasPanel_28/Overlay_2/ScaleBox/Image_2 | Image | T_UI_resonance_reward_giftbg | /Game/UI/SysResonance/Texture/Bonus/T_UI_resonance_reward_giftbg.T_UI_resonance_reward_giftbg |  | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 0.0, 0.0 | 0.0×0.0 |
| /CanvasPanel_25/CanvasPanel_90/WidgetSwitcher_Reward/CanvasPanel_29/Overlay_3/SizeBox_2/Icon_Reward_S_2 | Image | T_UI_icon_027 | /Game/UI/Common/Textures/Material_Icon/T_UI_icon_027.T_UI_icon_027 |  | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 0.0, 0.0 | 0.0×0.0 |
| /CanvasPanel_25/CanvasPanel_90/WidgetSwitcher_Reward/CanvasPanel_29/Overlay_3/ScaleBox_1/Image_4 | Image | T_UI_resonance_reward_giftbg | /Game/UI/SysResonance/Texture/Bonus/T_UI_resonance_reward_giftbg.T_UI_resonance_reward_giftbg |  | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 0.0, 0.0 | 0.0×0.0 |
| /CanvasPanel_25/CanvasPanel_90/Canvas_Glow/Fx_Glow_01 | Image | MI_UI_Glow_BG_02 | /Game/UI/Common/Material/MI_UI_Glow_BG_02.MI_UI_Glow_BG_02 | 1 | Min(0.500,0.500) Max(0.500,0.500) | L:-70.283 T:102.370 R:230.000 B:130.000 | X:0.500 Y:0.500 | 739.6, 628.6 | 1039.9, 656.2 | 300.3×27.6 |
| /CanvasPanel_25/CanvasPanel_90/Img_Done | Image | T_UI_resonance_reward_tuning_hook_PNG | /Game/__ExternalPaper2dAtlas__/SaveAtlas/UI/SysResonance/Texture/V2/__Frames/T_UI_resonance_reward_tuning_hook_PNG.T_UI_resonance_reward_tuning_hook_PNG | 5 | Min(0.500,0.500) Max(0.500,0.500) | L:-24.000 T:46.000 R:0.000 B:0.000 | X:0.500 Y:0.500 | 924.0, 609.0 | 948.0, 563.0 | 24.0×-46.0 |

> 共 11 个带贴图 Image 节点。

## WBP_Resonance_Bonus_Preview（共鸣加成预览）

> 源文件：`X6Game/Content/UI/SysResonance/WidgetBp/WBP_Resonance_Bonus_Preview.uasset`　|　WidgetTree 节点数：10

| 层级路径 | 类名 | 素材 | 素材资源路径 | zorder | Anchors | Offsets | Alignment | x0,y0 | x1,y1 | 宽×高 |
|---|---|---|---|---|---|---|---|---|---|---|
| /CanvasPanel_30/Bonus_Preview/Image_Bg_Preview | Image | T_UI_resonance_btn_high_level_reward_n_PNG | /Game/__ExternalPaper2dAtlas__/SaveAtlas/UI/SysResonance/Texture/V2/__Frames/T_UI_resonance_btn_high_level_reward_n_PNG.T_UI_resonance_btn_high_level_reward_n_PNG |  | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:0.000 R:88.000 B:88.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 88.0, 88.0 | 88.0×88.0 |
| /CanvasPanel_30/Bonus_Preview/effect_BGglow_cir_Special | Image | MI_UI_Resonance_Bonus_Preview_Cir | /Game/UI/SysResonance/Material/MI_UI_Resonance_Bonus_Preview_Cir.MI_UI_Resonance_Bonus_Preview_Cir | 1 | Min(0.500,0.500) Max(0.500,0.500) | L:-2.000 T:0.000 R:62.000 B:62.000 | X:0.500 Y:0.500 | 926.0, 509.0 | 990.0, 571.0 | 64.0×62.0 |
| /CanvasPanel_30/Bonus_Preview/Image_Icon_Reward | Image | T_UI_123 | /Game/UI/Common/Textures/T_UI_123.T_UI_123 |  | Min(0.500,0.500) Max(0.500,0.500) | L:-2.000 T:-4.000 R:54.000 B:54.000 | X:0.500 Y:0.500 | 930.0, 507.0 | 986.0, 565.0 | 56.0×58.0 |
| /CanvasPanel_30/Bonus_Preview/Num/Bg_Num | Image | T_UI_resonance_btn_high_level_reward_n_number_PNG | /Game/__ExternalPaper2dAtlas__/SaveAtlas/UI/SysResonance/Texture/V2/__Frames/T_UI_resonance_btn_high_level_reward_n_number_PNG.T_UI_resonance_btn_high_level_reward_n_number_PNG |  | Min(0.000,0.000) Max(1.000,0.000) | L:-10.000 T:-5.000 R:-10.000 B:28.000 | X:0.000 Y:0.000 | -10.0, -5.0 | 1910.0, 28.0 | 1920.0×33.0 |

> 共 4 个带贴图 Image 节点。

## WBP_Resonance_Bonus_Preview_Item（共鸣加成预览项）

> 源文件：`X6Game/Content/UI/SysResonance/WidgetBp/WBP_Resonance_Bonus_Preview_Item.uasset`　|　WidgetTree 节点数：23

| 层级路径 | 类名 | 素材 | 素材资源路径 | zorder | Anchors | Offsets | Alignment | x0,y0 | x1,y1 | 宽×高 |
|---|---|---|---|---|---|---|---|---|---|---|
| /CanvasPanel_21/Image_Item_bg | Image | T_UI_resonance_reward_tuning_mask | /Game/UI/SysResonance/Texture/V2/T_UI_resonance_reward_tuning_mask.T_UI_resonance_reward_tuning_mask |  | Min(0.500,0.500) Max(0.500,0.500) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.500 Y:0.500 | 960.0, 540.0 | 960.0, 540.0 | 0.0×0.0 |
| /CanvasPanel_21/CanvasPanel_107/Image_Item | Image | T_UI_Princessfigurine_bg | /Game/UI/SysResonance/Texture/Rewards/T_UI_Princessfigurine_bg.T_UI_Princessfigurine_bg |  | Min(0.500,1.000) Max(0.500,1.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.500 Y:1.000 | 960.0, 1080.0 | 960.0, 1080.0 | 0.0×0.0 |
| /CanvasPanel_21/WidgetSwitcher_Can_Get/Get_Already/Image_Get_Already | Image | T_UI_resonance_reward_tuning_hook_PNG | /Game/__ExternalPaper2dAtlas__/SaveAtlas/UI/SysResonance/Texture/V2/__Frames/T_UI_resonance_reward_tuning_hook_PNG.T_UI_resonance_reward_tuning_hook_PNG |  | Min(1.000,1.000) Max(1.000,1.000) | L:-223.000 T:-134.000 R:160.000 B:160.000 | X:1.000 Y:1.000 | 1314.0, 652.0 | 1697.0, 946.0 | 383.0×294.0 |
| /CanvasPanel_21/WidgetSwitcher_Can_Get/Not_Get/CanvasPanel_281/Image_Bg_Text | Image | T_UI_resonance_reward_tuning_txtbg01_PNG | /Game/__ExternalPaper2dAtlas__/SaveAtlas/UI/SysResonance/Texture/V2/__Frames/T_UI_resonance_reward_tuning_txtbg01_PNG.T_UI_resonance_reward_tuning_txtbg01_PNG |  | Min(0.000,0.500) Max(1.000,0.500) | L:0.000 T:-24.000 R:0.000 B:48.000 | X:0.500 Y:0.000 | -960.0, 516.0 | 960.0, 588.0 | 1920.0×72.0 |
| /CanvasPanel_21/WidgetSwitcher_Can_Get/Can_Get/CanvasPanel/Image_Bg_Text_1 | Image | T_UI_resonance_reward_tuning_txtbg01_PNG | /Game/__ExternalPaper2dAtlas__/SaveAtlas/UI/SysResonance/Texture/V2/__Frames/T_UI_resonance_reward_tuning_txtbg01_PNG.T_UI_resonance_reward_tuning_txtbg01_PNG |  | Min(0.000,0.000) Max(1.000,1.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.500 Y:0.000 | -960.0, 0.0 | 960.0, 1080.0 | 1920.0×1080.0 |
| /CanvasPanel_21/Fx_New_1/Fx_Smoke_1 | Image | MI_UI_Resonance_Bonus_Ring | /Game/UI/SysResonance/Material/MI_UI_Resonance_Bonus_Ring.MI_UI_Resonance_Bonus_Ring |  | Min(0.500,0.500) Max(0.500,0.500) | L:-15.000 T:-3.000 R:0.000 B:0.000 | X:0.500 Y:0.500 | 937.5, 535.5 | 952.5, 538.5 | 15.0×3.0 |
| /CanvasPanel_21/Fx_New_0/Fx_Dot1 | Image | MI_UI_Resonance_Bonus_Dot_01 | /Game/UI/SysResonance/Material/MI_UI_Resonance_Bonus_Dot_01.MI_UI_Resonance_Bonus_Dot_01 |  | Min(0.500,0.500) Max(0.500,0.500) | L:0.000 T:-7.846 R:0.000 B:0.000 | X:0.500 Y:0.500 | 960.0, 528.2 | 960.0, 536.1 | 0.0×7.8 |
| /CanvasPanel_21/Fx_New_0/Fx_Dot2 | Image | MI_UI_Resonance_Bonus_Dot_02 | /Game/UI/SysResonance/Material/MI_UI_Resonance_Bonus_Dot_02.MI_UI_Resonance_Bonus_Dot_02 |  | Min(0.500,0.500) Max(0.500,0.500) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.500 Y:0.500 | 960.0, 540.0 | 960.0, 540.0 | 0.0×0.0 |
| /CanvasPanel_21/Fx_New_0/Fx_Smoke | Image | MI_UI_Photo_Rays_01 | /Game/UI/SysPhotograph/Material/MI_UI_Photo_Rays_01.MI_UI_Photo_Rays_01 |  | Min(0.500,0.500) Max(0.500,0.500) | L:-1.000 T:-3.000 R:0.000 B:0.000 | X:0.500 Y:0.500 | 958.5, 535.5 | 959.5, 538.5 | 1.0×3.0 |

> 共 9 个带贴图 Image 节点。

## WBP_UI_ClothShop_Main_PC（服装商店主界面(PC)）

> 源文件：`X6Game/Content/UI/SysShop/PC/WBP_UI_ClothShop_Main_PC.uasset`　|　WidgetTree 节点数：42

| 层级路径 | 类名 | 素材 | 素材资源路径 | zorder | Anchors | Offsets | Alignment | x0,y0 | x1,y1 | 宽×高 |
|---|---|---|---|---|---|---|---|---|---|---|
| /CanvasPanel_0/Image_bg_mask | Image | T_UI_clothesshop_bg_all_N | /Game/UI/SysShop/Textures/T_UI_clothesshop_bg_all_N.T_UI_clothesshop_bg_all_N |  | Min(1.000,0.000) Max(1.000,1.000) | L:0.000 T:0.000 R:1037.852 B:0.000 | X:1.000 Y:0.000 | 882.1, 0.0 | 1920.0, 1080.0 | 1037.9×1080.0 |
| /CanvasPanel_0/CanvasPanel_32/Right_middle/Image_line_1 | Image | T_UI_clothesshop_line_btn_n | /Game/UI/SysShop/Textures/T_UI_clothesshop_line_btn_n.T_UI_clothesshop_line_btn_n |  | Min(1.000,0.350) Max(1.000,0.350) | L:-1008.000 T:-206.000 R:466.000 B:2.000 | X:0.000 Y:0.000 | 912.0, 172.0 | 2386.0, 380.0 | 1474.0×208.0 |
| /CanvasPanel_0/CanvasPanel_32/Right_middle/Image_line_2 | Image | T_UI_clothesshop_line_btn_n | /Game/UI/SysShop/Textures/T_UI_clothesshop_line_btn_n.T_UI_clothesshop_line_btn_n |  | Min(1.000,0.350) Max(1.000,0.350) | L:-542.000 T:-206.000 R:466.000 B:2.000 | X:1.000 Y:0.000 | 370.0, 172.0 | 1378.0, 380.0 | 1008.0×208.0 |
| /CanvasPanel_0/CanvasPanel_32/Right_middle/ShoppingCart/Button_Cart/Overlay_52/Image_cartBG | Image | T_UI_desgin_img_ItemDrawing_starbg | /Game/UI/SysDrawDesining/Textures/T_UI_desgin_img_ItemDrawing_starbg.T_UI_desgin_img_ItemDrawing_starbg |  | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 0.0, 0.0 | 0.0×0.0 |
| /CanvasPanel_0/CanvasPanel_32/Right_middle/ShoppingCart/Num_Cart/Image_49 | Image | T_UI_clothesshop_icon_shoppingcart_addbg | /Game/UI/SysShop/Textures/T_UI_clothesshop_icon_shoppingcart_addbg.T_UI_clothesshop_icon_shoppingcart_addbg |  | Min(0.000,0.000) Max(1.000,1.000) | L:-1.000 T:-2.000 R:0.000 B:-2.000 | X:0.000 Y:0.000 | -1.0, -2.0 | 1920.0, 1078.0 | 1921.0×1080.0 |

> 共 5 个带贴图 Image 节点。

## WBP_UI_ClothShopItem_v2（服装商店物品 v2）

> 源文件：`X6Game/Content/UI/SysShop/WBP_UI_ClothShopItem_v2.uasset`　|　WidgetTree 节点数：42

| 层级路径 | 类名 | 素材 | 素材资源路径 | zorder | Anchors | Offsets | Alignment | x0,y0 | x1,y1 | 宽×高 |
|---|---|---|---|---|---|---|---|---|---|---|
| /CanvasPanel_0/Clothes_Item/Image_item_bg_1 | Image | T_UI_clothesshop_img_bowhanger_n | /Game/UI/SysShop/Textures/T_UI_clothesshop_img_bowhanger_n.T_UI_clothesshop_img_bowhanger_n |  | Min(0.000,0.000) Max(0.000,0.000) | L:8.000 T:31.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 8.0, 31.0 | 0.0, 0.0 | -8.0×-31.0 |
| /CanvasPanel_0/Clothes_Item/Image_item_bg | Image | T_UI_clothesshop_img_bow_n | /Game/UI/SysShop/Textures/T_UI_clothesshop_img_bow_n.T_UI_clothesshop_img_bow_n |  | Min(0.000,0.000) Max(0.000,0.000) | L:59.000 T:-10.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 59.0, -10.0 | 0.0, 0.0 | -59.0×10.0 |
| /CanvasPanel_0/Clothes_Item/Image_Bg_Item/select/Image_bg_1 | Image | T_UI_clothesshop_bg_itemmessage_s | /Game/UI/SysShop/Textures/T_UI_clothesshop_bg_itemmessage_s.T_UI_clothesshop_bg_itemmessage_s |  | Min(0.000,0.000) Max(0.000,0.000) | L:12.000 T:54.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 12.0, 54.0 | 0.0, 0.0 | -12.0×-54.0 |
| /CanvasPanel_0/Clothes_Item/Image_Bg_Item/select/Quality_s/Image_quality_s_2 | Image | T_UI_clothesshop_img_rank2 | /Game/UI/SysShop/Textures/T_UI_clothesshop_img_rank2.T_UI_clothesshop_img_rank2 |  | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 0.0, 0.0 | 0.0×0.0 |
| /CanvasPanel_0/Clothes_Item/Image_Bg_Item/select/Quality_s/Image_quality_s_3 | Image | T_UI_clothesshop_img_rank3 | /Game/UI/SysShop/Textures/T_UI_clothesshop_img_rank3.T_UI_clothesshop_img_rank3 |  | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 0.0, 0.0 | 0.0×0.0 |
| /CanvasPanel_0/Clothes_Item/Image_Bg_Item/select/Quality_s/Image_quality_s_4 | Image | T_UI_clothesshop_img_rank4 | /Game/UI/SysShop/Textures/T_UI_clothesshop_img_rank4.T_UI_clothesshop_img_rank4 |  | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 0.0, 0.0 | 0.0×0.0 |
| /CanvasPanel_0/Clothes_Item/Image_Bg_Item/select/Quality_s/Image_quality_s_5 | Image | T_UI_clothesshop_img_rank5 | /Game/UI/SysShop/Textures/T_UI_clothesshop_img_rank5.T_UI_clothesshop_img_rank5 |  | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 0.0, 0.0 | 0.0×0.0 |
| /CanvasPanel_0/Clothes_Item/Image_Bg_Item/select/Image_bg | Image | T_UI_clothesshop_bg_price_s | /Game/UI/SysShop/Textures/T_UI_clothesshop_bg_price_s.T_UI_clothesshop_bg_price_s | 2 | Min(0.000,0.000) Max(0.000,0.000) | L:24.000 T:226.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 24.0, 226.0 | 0.0, 0.0 | -24.0×-226.0 |
| /CanvasPanel_0/Clothes_Item/Image_Bg_Item/select/Price/SizeBox_0/coin1_2 | Image | T_UI_icon_money_01 | /Game/UI/Common/Textures/Material_Icon/T_UI_icon_money_01.T_UI_icon_money_01 |  | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 0.0, 0.0 | 0.0×0.0 |
| /CanvasPanel_0/Clothes_Item/Image_Bg_Item/select/Image_Cart_s | Image | T_UI_clothesshop_icon_shoppingcart_add_01 | /Game/UI/SysShop/Textures/T_UI_clothesshop_icon_shoppingcart_add_01.T_UI_clothesshop_icon_shoppingcart_add_01 | 3 | Min(0.000,0.000) Max(0.000,0.000) | L:156.000 T:190.000 R:30.000 B:0.000 | X:0.000 Y:0.000 | 156.0, 190.0 | 30.0, 0.0 | -126.0×-190.0 |
| /CanvasPanel_0/Clothes_Item/Image_Bg_Item/normal/Image_bg_2 | Image | T_UI_clothesshop_bg_itemmessage_n | /Game/UI/SysShop/Textures/T_UI_clothesshop_bg_itemmessage_n.T_UI_clothesshop_bg_itemmessage_n |  | Min(0.000,0.000) Max(0.000,0.000) | L:12.000 T:54.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 12.0, 54.0 | 0.0, 0.0 | -12.0×-54.0 |
| /CanvasPanel_0/Clothes_Item/Image_Bg_Item/normal/Quality_n/Image_quality_n_2 | Image | T_UI_clothesshop_img_rank2 | /Game/UI/SysShop/Textures/T_UI_clothesshop_img_rank2.T_UI_clothesshop_img_rank2 |  | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 0.0, 0.0 | 0.0×0.0 |
| /CanvasPanel_0/Clothes_Item/Image_Bg_Item/normal/Quality_n/Image_quality_n_3 | Image | T_UI_clothesshop_img_rank3 | /Game/UI/SysShop/Textures/T_UI_clothesshop_img_rank3.T_UI_clothesshop_img_rank3 |  | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 0.0, 0.0 | 0.0×0.0 |
| /CanvasPanel_0/Clothes_Item/Image_Bg_Item/normal/Quality_n/Image_quality_n_4 | Image | T_UI_clothesshop_img_rank4 | /Game/UI/SysShop/Textures/T_UI_clothesshop_img_rank4.T_UI_clothesshop_img_rank4 |  | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 0.0, 0.0 | 0.0×0.0 |
| /CanvasPanel_0/Clothes_Item/Image_Bg_Item/normal/Quality_n/Image_quality_n_5 | Image | T_UI_clothesshop_img_rank5 | /Game/UI/SysShop/Textures/T_UI_clothesshop_img_rank5.T_UI_clothesshop_img_rank5 |  | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 0.0, 0.0 | 0.0×0.0 |
| /CanvasPanel_0/Clothes_Item/Image_Bg_Item/normal/Image_bg_3 | Image | T_UI_clothesshop_bg_price_n | /Game/UI/SysShop/Textures/T_UI_clothesshop_bg_price_n.T_UI_clothesshop_bg_price_n | 2 | Min(0.000,0.000) Max(0.000,0.000) | L:24.000 T:226.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 24.0, 226.0 | 0.0, 0.0 | -24.0×-226.0 |
| /CanvasPanel_0/Clothes_Item/Image_Bg_Item/normal/Price_1/SizeBox_1/coin1 | Image | T_UI_icon_money_01 | /Game/UI/Common/Textures/Material_Icon/T_UI_icon_money_01.T_UI_icon_money_01 |  | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 0.0, 0.0 | 0.0×0.0 |
| /CanvasPanel_0/Clothes_Item/Image_Bg_Item/normal/Image_Cart_n | Image | T_UI_clothesshop_icon_shoppingcart_add_02 | /Game/UI/SysShop/Textures/T_UI_clothesshop_icon_shoppingcart_add_02.T_UI_clothesshop_icon_shoppingcart_add_02 | 3 | Min(0.000,0.000) Max(0.000,0.000) | L:156.000 T:190.000 R:30.000 B:0.000 | X:0.000 Y:0.000 | 156.0, 190.0 | 30.0, 0.0 | -126.0×-190.0 |
| /CanvasPanel_0/Clothes_Item/Image_photo | Image | T_UI_123 | /Game/UI/Common/Textures/T_UI_123.T_UI_123 | 1 | Min(0.000,0.000) Max(0.000,0.000) | L:26.000 T:64.000 R:150.000 B:150.000 | X:0.000 Y:0.000 | 26.0, 64.0 | 150.0, 150.0 | 124.0×86.0 |
| /CanvasPanel_0/Clothes_Item/Image_get | Image | T_UI_clothesshop_img_havegeted_n | /Game/UI/SysShop/Textures/T_UI_clothesshop_img_havegeted_n.T_UI_clothesshop_img_havegeted_n | 1 | Min(0.000,0.000) Max(0.000,0.000) | L:20.000 T:184.000 R:180.000 B:284.000 | X:0.000 Y:0.000 | 20.0, 184.0 | 180.0, 284.0 | 160.0×100.0 |
| /CanvasPanel_0/Clothes_Item/SoldOut/Image_mask | Image | T_UI_clothesshop_bg_itemmessage_mask | /Game/UI/SysShop/Textures/T_UI_clothesshop_bg_itemmessage_mask.T_UI_clothesshop_bg_itemmessage_mask |  | Min(0.000,0.000) Max(0.000,0.000) | L:12.000 T:54.000 R:180.000 B:217.000 | X:0.000 Y:0.000 | 12.0, 54.0 | 180.0, 217.0 | 168.0×163.0 |
| /CanvasPanel_0/Clothes_Item/SoldOut/Image_2092 | Image | T_UI_clothesshop_img_line_havesaled_n | /Game/UI/SysShop/Textures/T_UI_clothesshop_img_line_havesaled_n.T_UI_clothesshop_img_line_havesaled_n |  | Min(0.000,0.000) Max(0.000,0.000) | L:16.000 T:132.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 16.0, 132.0 | 0.0, 0.0 | -16.0×-132.0 |
| /CanvasPanel_0/Clothes_Item/Image_Hover | Image | T_UI_clothesshop_bg_itemmessage_h | /Game/UI/SysShop/Textures/T_UI_clothesshop_bg_itemmessage_h.T_UI_clothesshop_bg_itemmessage_h | 2 | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:43.000 R:180.000 B:284.000 | X:0.000 Y:0.000 | 0.0, 43.0 | 180.0, 284.0 | 180.0×241.0 |

> 共 23 个带贴图 Image 节点。

## WBP_Shop_ShoppingCart（商店购物车）

> 源文件：`X6Game/Content/UI/SysShop/WBP_Shop_ShoppingCart.uasset`　|　WidgetTree 节点数：22

| 层级路径 | 类名 | 素材 | 素材资源路径 | zorder | Anchors | Offsets | Alignment | x0,y0 | x1,y1 | 宽×高 |
|---|---|---|---|---|---|---|---|---|---|---|
| /CanvasPanel_35/Panel/CanvasPanel_83/WidgetSwitcher/List/Image_50 | Image | T_UI_clothesshop_popup_img_bg2 | /Game/UI/SysShop/Textures/T_UI_clothesshop_popup_img_bg2.T_UI_clothesshop_popup_img_bg2 |  | Min(0.000,0.000) Max(0.000,0.000) | L:-6.857 T:-6.857 R:1116.000 B:548.071 | X:0.000 Y:0.000 | -6.9, -6.9 | 1116.0, 548.1 | 1122.9×554.9 |
| /CanvasPanel_35/Panel/CanvasPanel_83/WidgetSwitcher/Empty/Image_Empty | Image | T_UI_common_empty_PNG | /Game/__ExternalPaper2dAtlas__/SaveAtlas/UI/SysChat/Texture/__Frames/T_UI_common_empty_PNG.T_UI_common_empty_PNG |  | Min(0.500,0.500) Max(0.500,0.500) | L:-4.000 T:-224.000 R:348.000 B:376.000 | X:0.500 Y:0.000 | 780.0, 316.0 | 1132.0, 916.0 | 352.0×600.0 |
| /CanvasPanel_35/Panel/CanvasPanel_83/Total/Icon_1/icon_money_1 | Image | T_UI_icon_money_01 | /Game/UI/Common/Textures/Material_Icon/T_UI_icon_money_01.T_UI_icon_money_01 |  | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 0.0, 0.0 | 0.0×0.0 |
| /CanvasPanel_35/Panel/CanvasPanel_83/Total/Icon_2/icon_money_2 | Image | T_icon_shop_0001 | /Game/UI/Common/Textures/Material_Icon/T_icon_shop_0001.T_icon_shop_0001 |  | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 0.0, 0.0 | 0.0×0.0 |

> 共 4 个带贴图 Image 节点。

## WBP_Mail_Main（邮件主界面）

> 源文件：`X6Game/Content/UI/SysMail/PC/WBP_Mail_Main.uasset`　|　WidgetTree 节点数：71

| 层级路径 | 类名 | 素材 | 素材资源路径 | zorder | Anchors | Offsets | Alignment | x0,y0 | x1,y1 | 宽×高 |
|---|---|---|---|---|---|---|---|---|---|---|
| /CanvasPanel_41/BG | Image | T_UI_common_bg_01 | /Game/UI/Common/Textures/T_UI_common_bg_01.T_UI_common_bg_01 |  | Min(0.000,0.000) Max(1.000,1.000) | L:-10.000 T:-10.000 R:-10.000 B:-10.000 | X:0.500 Y:0.500 | -970.0, -550.0 | 950.0, 530.0 | 1920.0×1080.0 |
| /CanvasPanel_41/BG_1/Img_Deco | Image | T_UI_common_img_pattern_01 | /Game/UI/Common/Textures/T_UI_common_img_pattern_01.T_UI_common_img_pattern_01 |  | Min(0.000,0.000) Max(0.000,0.000) | L:-260.000 T:-135.000 R:1940.000 B:1100.000 | X:0.000 Y:0.000 | -260.0, -135.0 | 1940.0, 1100.0 | 2200.0×1235.0 |
| /CanvasPanel_41/BG_1/Fx_Img_Deco | Image | MI_UI_Task_Mask_01 | /Game/UI/SysTask/Material/MI_UI_Task_Mask_01.MI_UI_Task_Mask_01 |  | Min(0.000,0.000) Max(0.000,0.000) | L:-260.000 T:-134.000 R:1072.000 B:856.000 | X:0.000 Y:0.000 | -260.0, -134.0 | 1072.0, 856.0 | 1332.0×990.0 |
| /CanvasPanel_41/BG_1/Fx_Img_Deco_1 | Image | MI_UI_Task_Mask_02 | /Game/UI/SysTask/Material/MI_UI_Task_Mask_02.MI_UI_Task_Mask_02 |  | Min(0.000,0.000) Max(0.000,0.000) | L:-260.000 T:-134.000 R:1072.000 B:856.000 | X:0.000 Y:0.000 | -260.0, -134.0 | 1072.0, 856.0 | 1332.0×990.0 |
| /CanvasPanel_41/Center/CanvasPanel_1/HorizontalBox_1/Overlay_0/WidgetSwitcher_Show/CanvasPanel_0/Normal | Image | T_UI_mail_unshown_btn_n | /Game/UI/SysMail/Texture/T_UI_mail_unshown_btn_n.T_UI_mail_unshown_btn_n |  | Min(0.500,0.500) Max(0.500,0.500) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.500 Y:0.500 | 960.0, 540.0 | 960.0, 540.0 | 0.0×0.0 |
| /CanvasPanel_41/Center/CanvasPanel_1/HorizontalBox_1/Overlay_0/WidgetSwitcher_Show/CanvasPanel_0/Normal_h | Image | T_UI_mail_unshown_btn_h | /Game/UI/SysMail/Texture/T_UI_mail_unshown_btn_h.T_UI_mail_unshown_btn_h |  | Min(0.500,0.500) Max(0.500,0.500) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.500 Y:0.500 | 960.0, 540.0 | 960.0, 540.0 | 0.0×0.0 |
| /CanvasPanel_41/Center/CanvasPanel_1/HorizontalBox_1/Overlay_0/WidgetSwitcher_Show/CanvasPanel_88/Select | Image | T_UI_mail_shown_btn_n | /Game/UI/SysMail/Texture/T_UI_mail_shown_btn_n.T_UI_mail_shown_btn_n |  | Min(0.500,0.500) Max(0.500,0.500) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.500 Y:0.500 | 960.0, 540.0 | 960.0, 540.0 | 0.0×0.0 |
| /CanvasPanel_41/Center/CanvasPanel_1/HorizontalBox_1/Overlay_0/WidgetSwitcher_Show/CanvasPanel_88/Select_h | Image | T_UI_mail_shown_btn_h | /Game/UI/SysMail/Texture/T_UI_mail_shown_btn_h.T_UI_mail_shown_btn_h |  | Min(0.500,0.500) Max(0.500,0.500) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.500 Y:0.500 | 960.0, 540.0 | 960.0, 540.0 | 0.0×0.0 |
| /CanvasPanel_41/Center/CanvasPanel_1/HorizontalBox_1/Icon_Collect | Image | T_UI_mail_collect_img | /Game/UI/SysMail/Texture/T_UI_mail_collect_img.T_UI_mail_collect_img |  | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 0.0, 0.0 | 0.0×0.0 |
| /CanvasPanel_41/Center/WidgetSwitcher_Mail/Empty/Image_Paper | Image | T_UI_mail_img_01 | /Game/UI/SysMail/Texture/T_UI_mail_img_01.T_UI_mail_img_01 |  | Min(0.400,0.000) Max(1.000,1.000) | L:3.000 T:32.000 R:50.000 B:-12.000 | X:0.000 Y:0.000 | 771.0, 32.0 | 1970.0, 1068.0 | 1199.0×1036.0 |
| /CanvasPanel_41/Center/WidgetSwitcher_Mail/Empty/Image_light | Image | T_UI_mail_img_02 | /Game/UI/SysMail/Texture/T_UI_mail_img_02.T_UI_mail_img_02 | 1 | Min(0.000,0.000) Max(1.000,0.000) | L:772.000 T:-5.000 R:68.000 B:102.000 | X:1.000 Y:0.000 | -444.0, -5.0 | 772.0, 102.0 | 1216.0×107.0 |
| /CanvasPanel_41/Center/WidgetSwitcher_Mail/Empty/Image_128 | Image | T_UI_mail_img_08 | /Game/UI/SysMail/Texture/T_UI_mail_img_08.T_UI_mail_img_08 |  | Min(0.685,0.500) Max(0.685,0.500) | L:-97.276 T:-88.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 1217.9, 452.0 | 1315.2, 540.0 | 97.3×88.0 |
| /CanvasPanel_41/Center/WidgetSwitcher_Mail/Empty/Image | Image | T_UI_mail_img_07 | /Game/UI/SysMail/Texture/T_UI_mail_img_07.T_UI_mail_img_07 |  | Min(0.685,0.500) Max(0.685,0.500) | L:-410.944 T:-346.667 R:518.000 B:376.667 | X:0.000 Y:0.000 | 904.3, 193.3 | 1833.2, 916.7 | 928.9×723.3 |
| /CanvasPanel_41/Center/WidgetSwitcher_Mail/Empty/Image_226 | Image | T_UI_mail_img_09 | /Game/UI/SysMail/Texture/T_UI_mail_img_09.T_UI_mail_img_09 |  | Min(0.200,0.519) Max(0.200,0.519) | L:0.000 T:-28.000 R:163.810 B:-74.667 | X:0.500 Y:0.000 | 302.1, 532.5 | 465.9, 485.9 | 163.8×-46.7 |
| /CanvasPanel_41/Fx_SkyLight/Fx_Glow_01 | Image | MI_UI_Mail_SkyLight_01 | /Game/UI/SysMail/Material/MI_UI_Mail_SkyLight_01.MI_UI_Mail_SkyLight_01 | 1 | Min(0.500,0.000) Max(0.500,0.000) | L:-470.514 T:500.799 R:1212.638 B:662.946 | X:0.000 Y:0.000 | 489.5, 500.8 | 2172.6, 662.9 | 1683.2×162.1 |
| /CanvasPanel_41/Fx_SkyLight/Fx_Glow_02 | Image | MI_UI_Mail_SkyLight_02 | /Game/UI/SysMail/Material/MI_UI_Mail_SkyLight_02.MI_UI_Mail_SkyLight_02 |  | Min(0.500,0.000) Max(0.500,0.000) | L:-535.904 T:610.000 R:1518.000 B:520.000 | X:0.000 Y:0.000 | 424.1, 610.0 | 2478.0, 520.0 | 2053.9×-90.0 |
| /CanvasPanel_41/PanelKey/Image_Down | Image | T_UI_pc_img_tab_s | /Game/UI/Common/Textures/T_UI_pc_img_tab_s.T_UI_pc_img_tab_s | 3 | Min(0.000,1.000) Max(1.000,1.000) | L:0.000 T:0.000 R:0.000 B:84.000 | X:0.000 Y:1.000 | 0.0, 996.0 | 1920.0, 1080.0 | 1920.0×84.0 |

> 共 17 个带贴图 Image 节点。

## WBP_Mail_RightPanel（邮件右侧面板）

> 源文件：`X6Game/Content/UI/SysMail/PC/WBP_Mail_RightPanel.uasset`　|　WidgetTree 节点数：40

| 层级路径 | 类名 | 素材 | 素材资源路径 | zorder | Anchors | Offsets | Alignment | x0,y0 | x1,y1 | 宽×高 |
|---|---|---|---|---|---|---|---|---|---|---|
| /CanvasPanel_58/BG/Image_Paper | Image | T_UI_mail_img_01 | /Game/UI/SysMail/Texture/T_UI_mail_img_01.T_UI_mail_img_01 |  | Min(0.000,0.000) Max(1.000,1.000) | L:-16.808 T:-40.316 R:15.621 B:-42.000 | X:0.000 Y:0.000 | -16.8, -40.3 | 1935.6, 1038.0 | 1952.4×1078.3 |
| /CanvasPanel_58/Image_light_1 | Image | T_UI_mail_img_02 | /Game/UI/SysMail/Texture/T_UI_mail_img_02.T_UI_mail_img_02 |  | Min(0.500,0.000) Max(0.500,0.000) | L:892.000 T:49.937 R:31.815 B:102.000 | X:1.000 Y:0.000 | 2712.2, 49.9 | 1852.0, 102.0 | -860.2×52.1 |
| /CanvasPanel_58/CanvasPanel_113/CanvasPanel_1/Image_DecLine01 | Image | T_UI_mail_img_06 | /Game/UI/Common/Textures/T_UI_mail_img_06.T_UI_mail_img_06 |  | Min(0.000,0.000) Max(0.500,0.000) | L:0.000 T:0.000 R:0.000 B:23.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 960.0, 23.0 | 960.0×23.0 |
| /CanvasPanel_58/CanvasPanel_113/CanvasPanel_1/Image_DecLine02 | Image | T_UI_mail_img_06 | /Game/UI/Common/Textures/T_UI_mail_img_06.T_UI_mail_img_06 | 2 | Min(0.500,0.000) Max(1.000,0.000) | L:0.000 T:0.000 R:0.000 B:23.000 | X:0.000 Y:0.000 | 960.0, 0.0 | 1920.0, 23.0 | 960.0×23.0 |
| /CanvasPanel_58/CanvasPanel_113/VerticalBox_0/CanvasPanel_2/Image_Dec02 | Image | T_UI_mail_img_04 | /Game/UI/SysMail/Texture/T_UI_mail_img_04.T_UI_mail_img_04 |  | Min(1.000,0.500) Max(1.000,0.500) | L:-41.000 T:-5.000 R:0.000 B:0.000 | X:1.000 Y:0.500 | 1838.0, 532.5 | 1879.0, 537.5 | 41.0×5.0 |
| /CanvasPanel_58/CanvasPanel_113/VerticalBox_0/CanvasPanel_2/Btn_Jump/Overlay_0/HorizontalBox_0/Img_JumpIcon | Image | T_UI_mail_shopcar_img | /Game/UI/SysMail/Texture/T_UI_mail_shopcar_img.T_UI_mail_shopcar_img |  | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 0.0, 0.0 | 0.0×0.0 |
| /CanvasPanel_58/CanvasPanel_113/VerticalBox_0/CanvasPanel/CanvasPanel_0/Image_DecLine03 | Image | T_UI_mail_img_06 | /Game/UI/Common/Textures/T_UI_mail_img_06.T_UI_mail_img_06 |  | Min(0.500,0.000) Max(0.500,0.000) | L:-459.750 T:0.000 R:459.750 B:23.000 | X:0.000 Y:0.000 | 500.2, 0.0 | 1419.8, 23.0 | 919.5×23.0 |
| /CanvasPanel_58/CanvasPanel_113/VerticalBox_0/CanvasPanel/CanvasPanel_0/Image_DecLine04 | Image | T_UI_mail_img_06 | /Game/UI/Common/Textures/T_UI_mail_img_06.T_UI_mail_img_06 |  | Min(0.500,0.000) Max(0.500,0.000) | L:0.000 T:0.000 R:459.750 B:23.000 | X:0.000 Y:0.000 | 960.0, 0.0 | 1419.8, 23.0 | 459.8×23.0 |

> 共 8 个带贴图 Image 节点。

## WBP_Mail_Explain_Popup（邮件说明弹窗）

> 源文件：`X6Game/Content/UI/SysMail/PC/WBP_Mail_Explain_Popup.uasset`　|　WidgetTree 节点数：7

| 层级路径 | 类名 | 素材 | 素材资源路径 | zorder | Anchors | Offsets | Alignment | x0,y0 | x1,y1 | 宽×高 |
|---|---|---|---|---|---|---|---|---|---|---|

> 共 0 个带贴图 Image 节点。

## WBP_Notice_Main_PC（公告主界面(PC)）

> 源文件：`X6Game/Content/UI/SysNotice/PC/WidgetBp/WBP_Notice_Main_PC.uasset`　|　WidgetTree 节点数：63

| 层级路径 | 类名 | 素材 | 素材资源路径 | zorder | Anchors | Offsets | Alignment | x0,y0 | x1,y1 | 宽×高 |
|---|---|---|---|---|---|---|---|---|---|---|
| /CanvasPanel_51/BG/Image_524 | Image | T_UI_common_bg_01 | /Game/UI/Common/Textures/T_UI_common_bg_01.T_UI_common_bg_01 |  | Min(0.000,0.000) Max(1.000,1.000) | L:-10.000 T:-10.000 R:-10.000 B:-10.000 | X:0.000 Y:0.000 | -10.0, -10.0 | 1910.0, 1070.0 | 1920.0×1080.0 |
| /CanvasPanel_51/BG/Image_38 | Image | T_UI_common_img_pattern_01 | /Game/UI/Common/Textures/T_UI_common_img_pattern_01.T_UI_common_img_pattern_01 |  | Min(0.000,0.000) Max(0.000,0.000) | L:-178.000 T:-107.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | -178.0, -107.0 | 0.0, 0.0 | 178.0×107.0 |
| /CanvasPanel_51/BG/Img_Deco | Image | T_UI_common_img_pattern_01 | /Game/UI/Common/Textures/T_UI_common_img_pattern_01.T_UI_common_img_pattern_01 |  | Min(0.000,0.000) Max(0.000,0.000) | L:-260.000 T:-135.000 R:1940.000 B:1100.000 | X:0.000 Y:0.000 | -260.0, -135.0 | 1940.0, 1100.0 | 2200.0×1235.0 |
| /CanvasPanel_51/BG/Fx_Img_Deco | Image | MI_UI_Task_Mask_01 | /Game/UI/SysTask/Material/MI_UI_Task_Mask_01.MI_UI_Task_Mask_01 |  | Min(0.000,0.000) Max(0.000,0.000) | L:-260.000 T:-135.000 R:1072.000 B:856.000 | X:0.000 Y:0.000 | -260.0, -135.0 | 1072.0, 856.0 | 1332.0×991.0 |
| /CanvasPanel_51/BG/Fx_Img_Deco_1 | Image | MI_UI_Task_Mask_02 | /Game/UI/SysTask/Material/MI_UI_Task_Mask_02.MI_UI_Task_Mask_02 |  | Min(0.000,0.000) Max(0.000,0.000) | L:-260.000 T:-135.000 R:1072.000 B:856.000 | X:0.000 Y:0.000 | -260.0, -135.0 | 1072.0, 856.0 | 1332.0×991.0 |
| /CanvasPanel_51/BG/Fx_Glow_01 | Image | MI_UI_SkyLight_01 | /Game/UI/UIParticle/UI_Material/MI_UI_SkyLight_01.MI_UI_SkyLight_01 | 2 | Min(0.500,0.000) Max(0.500,0.000) | L:-256.000 T:327.000 R:810.000 B:600.000 | X:0.000 Y:0.000 | 704.0, 327.0 | 1770.0, 600.0 | 1066.0×273.0 |
| /CanvasPanel_51/BG/Fx_Glow_02 | Image | MI_UI_SkyLight_02 | /Game/UI/UIParticle/UI_Material/MI_UI_SkyLight_02.MI_UI_SkyLight_02 | 2 | Min(0.500,0.000) Max(0.500,0.000) | L:-265.000 T:345.000 R:1026.000 B:538.000 | X:0.000 Y:0.000 | 695.0, 345.0 | 1986.0, 538.0 | 1291.0×193.0 |
| /CanvasPanel_51/Middle/WidgetSwitcher_Notice/Empty/Content_1/Content_Bg_1/Image_5 | Image | T_UI_mail_img_01 | /Game/UI/SysMail/Texture/T_UI_mail_img_01.T_UI_mail_img_01 |  | Min(0.000,0.000) Max(1.000,1.000) | L:10.138 T:31.671 R:-1.000 B:-7.000 | X:0.000 Y:0.000 | 10.1, 31.7 | 1919.0, 1073.0 | 1908.9×1041.3 |
| /CanvasPanel_51/Middle/WidgetSwitcher_Notice/Empty/Content_1/Content_Bg_1/Image_6 | Image | T_UI_mail_img_02 | /Game/UI/SysMail/Texture/T_UI_mail_img_02.T_UI_mail_img_02 |  | Min(0.000,0.000) Max(1.000,0.000) | L:21.000 T:-5.000 R:137.000 B:761.185 | X:0.000 Y:0.000 | 21.0, -5.0 | 2057.0, 761.2 | 2036.0×766.2 |
| /CanvasPanel_51/Middle/WidgetSwitcher_Notice/Empty/Content_1/Content_Bg_1/Image_7 | Image | T_UI_notice_img_mask_01 | /Game/UI/SysNotice/Textures/T_UI_notice_img_mask_01.T_UI_notice_img_mask_01 |  | Min(0.500,1.000) Max(0.500,1.000) | L:-575.000 T:5.000 R:1147.000 B:1016.000 | X:0.000 Y:1.000 | 385.0, 74.0 | 2107.0, 1085.0 | 1722.0×1011.0 |
| /CanvasPanel_51/Middle/WidgetSwitcher_Notice/Empty/Content_1/Content_Bg_1/Image_8 | Image | T_UI_notice_img_06 | /Game/UI/SysNotice/Textures/T_UI_notice_img_06.T_UI_notice_img_06 |  | Min(1.000,1.000) Max(1.000,1.000) | L:-492.000 T:-376.000 R:770.185 B:761.185 | X:0.000 Y:0.000 | 1428.0, 704.0 | 2690.2, 1841.2 | 1262.2×1137.2 |
| /CanvasPanel_51/Middle/WidgetSwitcher_Notice/Empty/Content_1/Content_Bg_1/Image_9 | Image | T_UI_notice_img_04 | /Game/UI/SysNotice/Textures/T_UI_notice_img_04.T_UI_notice_img_04 |  | Min(0.000,0.000) Max(0.000,0.000) | L:20.000 T:64.000 R:770.185 B:761.185 | X:0.000 Y:0.000 | 20.0, 64.0 | 770.2, 761.2 | 750.2×697.2 |
| /CanvasPanel_51/Middle/WidgetSwitcher_Notice/Empty/Content_1/Content_Bg_1/Image_10 | Image | T_UI_notice_img_07 | /Game/UI/SysNotice/Textures/T_UI_notice_img_07.T_UI_notice_img_07 |  | Min(0.500,0.000) Max(0.500,0.000) | L:-589.000 T:54.000 R:1178.000 B:35.000 | X:0.000 Y:0.000 | 371.0, 54.0 | 2138.0, 35.0 | 1767.0×-19.0 |
| /CanvasPanel_51/Middle/WidgetSwitcher_Notice/Empty/Content_1/Image_empty | Image | T_UI_common_empty | /Game/UI/Common/Textures/T_UI_common_empty.T_UI_common_empty |  | Min(0.500,0.500) Max(0.500,0.500) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.500 Y:0.500 | 960.0, 540.0 | 960.0, 540.0 | 0.0×0.0 |
| /CanvasPanel_51/Middle/WidgetSwitcher_Notice/Empty/CanvasPanel_2/Image_226 | Image | T_UI_mail_img_09 | /Game/UI/SysMail/Texture/T_UI_mail_img_09.T_UI_mail_img_09 |  | Min(0.500,0.500) Max(0.500,0.500) | L:0.000 T:0.000 R:163.810 B:-74.667 | X:0.500 Y:0.500 | 878.1, 577.3 | 1041.9, 502.7 | 163.8×-74.7 |
| /CanvasPanel_51/Middle/WidgetSwitcher_Notice/NotEmpty/Content/Content_Bg/Image_131 | Image | T_UI_mail_img_01 | /Game/UI/SysMail/Texture/T_UI_mail_img_01.T_UI_mail_img_01 |  | Min(0.000,0.000) Max(1.000,1.000) | L:10.138 T:31.671 R:-1.000 B:-7.000 | X:0.000 Y:0.000 | 10.1, 31.7 | 1919.0, 1073.0 | 1908.9×1041.3 |
| /CanvasPanel_51/Middle/WidgetSwitcher_Notice/NotEmpty/Content/Content_Bg/Image | Image | T_UI_mail_img_02 | /Game/UI/SysMail/Texture/T_UI_mail_img_02.T_UI_mail_img_02 |  | Min(0.000,0.000) Max(1.000,0.000) | L:21.000 T:-5.000 R:137.000 B:761.185 | X:0.000 Y:0.000 | 21.0, -5.0 | 2057.0, 761.2 | 2036.0×766.2 |
| /CanvasPanel_51/Middle/WidgetSwitcher_Notice/NotEmpty/Content/Content_Bg/Image_4 | Image | T_UI_notice_img_mask_01 | /Game/UI/SysNotice/Textures/T_UI_notice_img_mask_01.T_UI_notice_img_mask_01 |  | Min(0.500,1.000) Max(0.500,1.000) | L:-575.000 T:5.000 R:1147.000 B:1016.000 | X:0.000 Y:1.000 | 385.0, 74.0 | 2107.0, 1085.0 | 1722.0×1011.0 |
| /CanvasPanel_51/Middle/WidgetSwitcher_Notice/NotEmpty/Content/Content_Bg/Image_1 | Image | T_UI_notice_img_06 | /Game/UI/SysNotice/Textures/T_UI_notice_img_06.T_UI_notice_img_06 |  | Min(1.000,1.000) Max(1.000,1.000) | L:-492.000 T:-376.000 R:770.185 B:761.185 | X:0.000 Y:0.000 | 1428.0, 704.0 | 2690.2, 1841.2 | 1262.2×1137.2 |
| /CanvasPanel_51/Middle/WidgetSwitcher_Notice/NotEmpty/Content/Content_Bg/Image_2 | Image | T_UI_notice_img_04 | /Game/UI/SysNotice/Textures/T_UI_notice_img_04.T_UI_notice_img_04 |  | Min(0.000,0.000) Max(0.000,0.000) | L:20.000 T:64.000 R:770.185 B:761.185 | X:0.000 Y:0.000 | 20.0, 64.0 | 770.2, 761.2 | 750.2×697.2 |
| /CanvasPanel_51/Middle/WidgetSwitcher_Notice/NotEmpty/Content/Content_Bg/Image_3 | Image | T_UI_notice_img_07 | /Game/UI/SysNotice/Textures/T_UI_notice_img_07.T_UI_notice_img_07 |  | Min(0.500,0.000) Max(0.500,0.000) | L:-589.000 T:54.000 R:1178.000 B:35.000 | X:0.000 Y:0.000 | 371.0, 54.0 | 2138.0, 35.0 | 1767.0×-19.0 |
| /CanvasPanel_51/Middle/WidgetSwitcher_Notice/NotEmpty/Content/VerticalBox_0/CanvasPanel_1/Image_DecLine01 | Image | T_UI_mail_img_06 | /Game/UI/Common/Textures/T_UI_mail_img_06.T_UI_mail_img_06 |  | Min(0.000,0.000) Max(0.500,0.000) | L:0.000 T:0.000 R:0.000 B:23.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 960.0, 23.0 | 960.0×23.0 |
| /CanvasPanel_51/Middle/WidgetSwitcher_Notice/NotEmpty/Content/VerticalBox_0/CanvasPanel_1/Image_DecLine02 | Image | T_UI_mail_img_06 | /Game/UI/Common/Textures/T_UI_mail_img_06.T_UI_mail_img_06 | 2 | Min(0.500,0.000) Max(1.000,0.000) | L:0.000 T:0.000 R:0.000 B:23.000 | X:0.000 Y:0.000 | 960.0, 0.0 | 1920.0, 23.0 | 960.0×23.0 |
| /CanvasPanel_51/Middle/WidgetSwitcher_Notice/NotEmpty/Content/VerticalBox_0/Line/Image_Line_1 | Image | T_UI_notice_img_line_03 | /Game/UI/SysNotice/Textures/T_UI_notice_img_line_03.T_UI_notice_img_line_03 |  | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 0.0, 0.0 | 0.0×0.0 |
| /CanvasPanel_51/Middle/WidgetSwitcher_Notice/NotEmpty/Content/VerticalBox_0/Line/Image_Line_2 | Image | T_UI_notice_img_line_02 | /Game/UI/SysNotice/Textures/T_UI_notice_img_line_02.T_UI_notice_img_line_02 |  | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 0.0, 0.0 | 0.0×0.0 |
| /CanvasPanel_51/Middle/WidgetSwitcher_Notice/NotEmpty/Content/VerticalBox_0/Line/Image_Line_3 | Image | T_UI_notice_img_line_01 | /Game/UI/SysNotice/Textures/T_UI_notice_img_line_01.T_UI_notice_img_line_01 |  | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 0.0, 0.0 | 0.0×0.0 |
| /CanvasPanel_51/Middle/WidgetSwitcher_Notice/NotEmpty/Content/VerticalBox_0/Line/Image_Line_4 | Image | T_UI_notice_img_line_02 | /Game/UI/SysNotice/Textures/T_UI_notice_img_line_02.T_UI_notice_img_line_02 |  | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 0.0, 0.0 | 0.0×0.0 |
| /CanvasPanel_51/Middle/WidgetSwitcher_Notice/NotEmpty/Content/VerticalBox_0/Line/Image_Line_5 | Image | T_UI_notice_img_line_03 | /Game/UI/SysNotice/Textures/T_UI_notice_img_line_03.T_UI_notice_img_line_03 |  | Min(0.000,0.000) Max(0.000,0.000) | L:0.000 T:0.000 R:0.000 B:0.000 | X:0.000 Y:0.000 | 0.0, 0.0 | 0.0, 0.0 | 0.0×0.0 |

> 共 28 个带贴图 Image 节点。

## WBP_Notice_List_Item（公告列表项）

> 源文件：`X6Game/Content/UI/SysNotice/PC/WidgetBp/WBP_Notice_List_Item.uasset`　|　WidgetTree 节点数：13

| 层级路径 | 类名 | 素材 | 素材资源路径 | zorder | Anchors | Offsets | Alignment | x0,y0 | x1,y1 | 宽×高 |
|---|---|---|---|---|---|---|---|---|---|---|

> 共 0 个带贴图 Image 节点。
