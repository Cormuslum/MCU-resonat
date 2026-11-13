# 《无限暖暖》UI 布局坐标表（从 UMG WBP 反序列化提取）

> 数据来源：游戏解包 .uasset（UMG WidgetBlueprint），经 CUE4Parse + usmap 反射反序列化 WidgetTree 获得。

> 坐标系：以 1920×1080 为设计分辨率。坐标为绝对像素 (x0,y0,x1,y1,宽,高)，x0,y0 为左上角，x1,y1 为右下角。负值/超出屏幕表示元素延伸到屏幕外（游戏内正常现象）。

> zorder 表示同父级下的叠放顺序（越小越靠底）。未列出的元素 zorder 默认 0。

> 说明：此表为 UI 树中带贴图/材质的 Image 类节点；TextBlock、布局容器等未贴图节点不在表中。


## WBP_Reward_NewClothes（单件衣服展示）

> 源文件：`X6Game/Content/UI/SysReward/PC/WidgetBP/WBP_Reward_NewClothes.uasset`　|　WidgetTree 节点数：215

| 层级路径 | 素材 | 素材资源路径 | zorder | 坐标 x0,y0 | 坐标 x1,y1 | 宽×高 |
|---|---|---|---|---|---|---|
| `/NewClothes/BgPanel/Fx_Draw_FadeIn` | MI_UI_Single_Bg_Draw | `/Game/UI/SysReward/Material/MI_UI_Single_Bg_Draw.MI_UI_Single_Bg_Draw` |  | -445.0, -928.1 | 1825.0, 1384.0 | 2270.0×2312.1 |
| `/NewClothes/BgPanel/Bg_Right` | T_showpic_clothes_bg_right | `/Game/UI/SysReward/Textures/T_showpic_clothes_bg_right.T_showpic_clothes_bg_right` |  | 730.9, 0.0 | 1920.0, 1080.0 | 1189.1×1080.0 |
| `/NewClothes/BgPanel/Bg_Dec_Circle` | MI_UI_Suit_Cir_01 | `/Game/UI/SysReward/Material/MI_UI_Suit_Cir_01.MI_UI_Suit_Cir_01` |  | 1497.0, 753.2 | 1850.0, 1363.0 | 353.0×609.8 |
| `/NewClothes/BgPanel/Fx_SkyLight/Fx_Glow_01` | MI_UI_Glow_BG_02 | `/Game/UI/Common/Material/MI_UI_Glow_BG_02.MI_UI_Glow_BG_02` | 1 | -440.5, 331.6 | 3869.2, 1252.3 | 4309.7×920.7 |
| `/NewClothes/BgPanel/Fx_SkyLight/Fx_Glow_02` | MI_UI_Glow_BG_01 | `/Game/UI/Common/Material/MI_UI_Glow_BG_01.MI_UI_Glow_BG_01` |  | -819.0, 460.0 | 2019.0, 900.0 | 2838.0×440.0 |
| `/NewClothes/Switcher_Sort/Suit/BgDec_Suit/Light_Suit` | T_showpic_suit_bg_light | `/Game/UI/SysReward/Textures/T_showpic_suit_bg_light.T_showpic_suit_bg_light` |  | 449.1, 6.8 | 1459.6, 956.9 | 1010.5×950.2 |
| `/NewClothes/Switcher_Sort/Suit/BgDec_Suit/Line_Suit` | T_showpic_suit_img_ornament_01 | `/Game/UI/SysReward/Textures/T_showpic_suit_img_ornament_01.T_showpic_suit_img_ornament_01` |  | 960.0, 453.0 | 960.0, 511.0 | 0.0×58.0 |
| `/NewClothes/Switcher_Sort/Suit/BgDec_Suit/Group_Line/Deco_Cir` | MI_UI_Reward_Clothes_01 | `/Game/UI/SysReward/Material/MI_UI_Reward_Clothes_01.MI_UI_Reward_Clothes_01` |  | 160.0, -345.5 | 1760.0, 1311.5 | 1600.0×1657.0 |
| `/NewClothes/Switcher_Sort/Suit/BgDec_Suit/Group_Line/Deco_Dots` | MI_UI_Reward_Clothes_02 | `/Game/UI/SysReward/Material/MI_UI_Reward_Clothes_02.MI_UI_Reward_Clothes_02` |  | 173.0, -332.5 | 1747.0, 1298.5 | 1574.0×1631.0 |
| `/NewClothes/Switcher_Sort/Suit/BgDec_Suit/Group_Line/Deco_Rays` | MI_UI_Reward_Clothes_03 | `/Game/UI/SysReward/Material/MI_UI_Reward_Clothes_03.MI_UI_Reward_Clothes_03` |  | 460.0, -45.5 | 1460.0, 1011.5 | 1000.0×1057.0 |
| `/NewClothes/Switcher_Sort/Suit/BgDec_Suit/Deco_Lines_L/L01/Deco_Line_L_01` | MI_UI_Suit_Line_01 | `/Game/UI/SysReward/Material/MI_UI_Suit_Line_01.MI_UI_Suit_Line_01` |  | 960.0, 950.4 | 960.0, 676.8 | 0.0×-273.6 |
| `/NewClothes/Switcher_Sort/Suit/BgDec_Suit/Deco_Lines_L/Deco_Arrow_L` | T_showpic_suit_img_line_03 | `/Game/UI/SysReward/Textures/T_showpic_suit_img_line_03.T_showpic_suit_img_line_03` |  | -75.0, 435.0 | 615.0, 505.0 | 690.0×70.0 |
| `/NewClothes/Switcher_Sort/Suit/BgDec_Suit/Deco_Lines_L/L02/Deco_Line_L_02` | MI_UI_Suit_Line_02 | `/Game/UI/SysReward/Material/MI_UI_Suit_Line_02.MI_UI_Suit_Line_02` |  | 960.0, 950.4 | 960.0, 676.8 | 0.0×-273.6 |
| `/NewClothes/Switcher_Sort/Suit/BgDec_Suit/Deco_Lines_R/R01/Deco_Line_R_01` | MI_UI_Suit_Line_01 | `/Game/UI/SysReward/Material/MI_UI_Suit_Line_01.MI_UI_Suit_Line_01` |  | 960.0, 950.4 | 960.0, 676.8 | 0.0×-273.6 |
| `/NewClothes/Switcher_Sort/Suit/BgDec_Suit/Deco_Lines_R/Deco_Arrow_R` | T_showpic_suit_img_line_03 | `/Game/UI/SysReward/Textures/T_showpic_suit_img_line_03.T_showpic_suit_img_line_03` |  | -75.0, 435.0 | 615.0, 505.0 | 690.0×70.0 |
| `/NewClothes/Switcher_Sort/Suit/BgDec_Suit/Deco_Lines_R/R02/Deco_Line_R_02` | MI_UI_Suit_Line_02 | `/Game/UI/SysReward/Material/MI_UI_Suit_Line_02.MI_UI_Suit_Line_02` |  | 960.0, 950.4 | 960.0, 676.8 | 0.0×-273.6 |
| `/NewClothes/Switcher_Sort/Suit/Card_Suit/Dec_SuitCard` | T_showpic_suit_frame_04 | `/Game/UI/SysReward/Textures/T_showpic_suit_frame_04.T_showpic_suit_frame_04` |  | 765.0, 170.5 | 1195.0, 819.5 | 430.0×649.0 |
| `/NewClothes/Switcher_Sort/Suit/Card_Suit/Bg_SuitCard` | T_showpic_suit_frame_02 | `/Game/UI/SysReward/Textures/T_showpic_suit_frame_02.T_showpic_suit_frame_02` |  | 722.0, 96.0 | 1198.0, 846.0 | 476.0×750.0 |
| `/NewClothes/Switcher_Sort/Suit/Card_Suit/Fx_Bg_SuitCard_glow` | MI_UI_Suit_Card_Bg_liquid | `/Game/UI/SysReward/Material/MI_UI_Suit_Card_Bg_liquid.MI_UI_Suit_Card_Bg_liquid` |  | 722.0, 96.0 | 1198.0, 846.0 | 476.0×750.0 |
| `/NewClothes/Switcher_Sort/Suit/Card_Suit/Line_SuitCard` | T_showpic_suit_frame_01 | `/Game/UI/SysReward/Textures/T_showpic_suit_frame_01.T_showpic_suit_frame_01` |  | 722.0, 96.0 | 1198.0, 846.0 | 476.0×750.0 |
| `/NewClothes/Switcher_Sort/Suit/Card_Suit/Fx_Line_SuitCard_Sweep` | MI_UI_Get_Suit_edge_01 | `/Game/UI/SysReward/Material/MI_UI_Get_Suit_edge_01.MI_UI_Get_Suit_edge_01` |  | 722.0, 96.0 | 1198.0, 846.0 | 476.0×750.0 |
| `/NewClothes/Switcher_Sort/Suit/Card_Suit/Dec_Suit_Circle` | T_showpic_Suit_img_ornament_03 | `/Game/UI/SysReward/Textures/T_showpic_Suit_img_ornament_03.T_showpic_Suit_img_ornament_03` |  | 1231.5, 2.0 | 1160.5, 448.0 | -71.0×446.0 |
| `/NewClothes/Switcher_Sort/Suit/Titlebg_Suit/SuitBg_02/Image_tai_2` | T_showpic_suit_img_board_04 | `/Game/UI/SysReward/Textures/T_showpic_suit_img_board_04.T_showpic_suit_img_board_04` |  | 919.4, 907.5 | 1000.6, 662.5 | 81.1×-245.0 |
| `/NewClothes/Switcher_Sort/Suit/Titlebg_Suit/SuitBg_03/Image_tai_3` | T_showpic_suit_img_board_03 | `/Game/UI/SysReward/Textures/T_showpic_suit_img_board_03.T_showpic_suit_img_board_03` |  | 919.4, 907.5 | 1000.6, 662.5 | 81.1×-245.0 |
| `/NewClothes/Switcher_Sort/Suit/Titlebg_Suit/SuitBg_04/Image_tai_4` | T_showpic_suit_img_board_02 | `/Game/UI/SysReward/Textures/T_showpic_suit_img_board_02.T_showpic_suit_img_board_02` |  | 919.4, 907.5 | 1000.6, 662.5 | 81.1×-245.0 |
| `/NewClothes/Switcher_Sort/Suit/Titlebg_Suit/SuitBg_05/Image_tai_5` | T_showpic_suit_img_board_01 | `/Game/UI/SysReward/Textures/T_showpic_suit_img_board_01.T_showpic_suit_img_board_01` |  | 919.4, 907.5 | 1000.6, 662.5 | 81.1×-245.0 |
| `/NewClothes/Switcher_Sort/Suit/Type_Suit/CanvasPanel_0/VerticalBox_1/AbilityPanel/Ability_Locked/Image_Lock` | T_UI_dresup_lock_PNG | `/Game/__ExternalPaper2dAtlas__/SaveAtlas/UI/Common/Textures/SuitShow/__Frames/T_UI_dresup_lock_PNG.T_UI_dresup_lock_PNG` |  | 960.0, 492.0 | 960.0, 588.0 | 0.0×96.0 |
| `/NewClothes/Switcher_Sort/Suit/Evolution_Progress/Bg_Evolution` | T_UI_dresup_img_special_effect_bg | `/Game/UI/SysClothes/Textures/Ability/T_UI_dresup_img_special_effect_bg.T_UI_dresup_img_special_effect_bg` |  | -40.0, 507.0 | 1888.0, 606.0 | 1928.0×99.0 |
| `/NewClothes/Switcher_Sort/Suit/Fx_Get_Suit_5x_Shine` | MI_UI_Get_Suit_shine_01 | `/Game/UI/SysReward/Material/MI_UI_Get_Suit_shine_01.MI_UI_Get_Suit_shine_01` |  | -40.0, -340.0 | 1960.0, 1580.0 | 2000.0×1920.0 |
| `/NewClothes/Switcher_Sort/Cloth/Bg_Resonance/Fx_Draw_FadeIn_Resonance` | MI_UI_Single_Bg_Draw_Resonance | `/Game/UI/SysReward/Material/MI_UI_Single_Bg_Draw_Resonance.MI_UI_Single_Bg_Draw_Resonance` |  | -445.0, -928.0 | 1825.0, 1384.0 | 2270.0×2312.0 |
| `/NewClothes/Switcher_Sort/Cloth/Bg_Resonance/BG_Right_1` | T_resonance_clothes_bg_right | `/Game/UI/SysResonance/Texture/V2/T_resonance_clothes_bg_right.T_resonance_clothes_bg_right` |  | -348.0, 0.0 | 768.0, 1080.0 | 1116.0×1080.0 |
| `/NewClothes/Switcher_Sort/Cloth/Bg_Resonance/Bg_Dec_Circle_Resonance` | MI_UI_Suit_Cir_01 | `/Game/UI/SysReward/Material/MI_UI_Suit_Cir_01.MI_UI_Suit_Cir_01` |  | 1497.0, 754.0 | 1850.0, 1363.0 | 353.0×609.0 |
| `/NewClothes/Switcher_Sort/Cloth/BgDec_SingleCloth/Fx_orname_01` | MI_UI_Get_Single_Orname_01 | `/Game/UI/SysReward/Material/MI_UI_Get_Single_Orname_01.MI_UI_Get_Single_Orname_01` |  | 1944.0, 550.5 | 1462.0, 565.5 | -482.0×15.0 |
| `/NewClothes/Switcher_Sort/Cloth/BgDec_SingleCloth/Fx_orname_02` | MI_UI_Get_Single_Orname_02 | `/Game/UI/SysReward/Material/MI_UI_Get_Single_Orname_02.MI_UI_Get_Single_Orname_02` |  | 1984.5, 599.5 | 1447.5, 568.5 | -537.0×-31.0 |
| `/NewClothes/Switcher_Sort/Cloth/BgDec_SingleCloth/Img_clothes_logo` | T_showpic_clothes_img_logo_right | `/Game/UI/SysReward/Textures/T_showpic_clothes_img_logo_right.T_showpic_clothes_img_logo_right` |  | 1080.0, 61.0 | 2724.0, 967.0 | 1644.0×906.0 |
| `/NewClothes/Switcher_Sort/Cloth/BgDec_SingleCloth/Img_clothes_logo_Resonance` | MI_UI_Reward_Resonance_Deco | `/Game/UI/SysReward/Material/MI_UI_Reward_Resonance_Deco.MI_UI_Reward_Resonance_Deco` |  | 1080.0, 61.0 | 2724.0, 967.0 | 1644.0×906.0 |
| `/NewClothes/Switcher_Sort/Cloth/SingleCloth/Dec_Paper` | MI_UI_Reward_Deco_Paper | `/Game/UI/SysReward/Material/MI_UI_Reward_Deco_Paper.MI_UI_Reward_Deco_Paper` |  | 946.0, 744.0 | 1210.0, 680.0 | 264.0×-64.0 |
| `/NewClothes/Switcher_Sort/Cloth/SingleCloth/Deco_Circle_01` | T_showpic_clothes_img_card_deco_01 | `/Game/UI/SysReward/Textures/T_showpic_clothes_img_card_deco_01.T_showpic_clothes_img_card_deco_01` |  | 656.0, 302.0 | 1166.0, 658.0 | 510.0×356.0 |
| `/NewClothes/Switcher_Sort/Cloth/SingleCloth/Deco_Circle_02` | T_showpic_clothes_img_card_deco_02 | `/Game/UI/SysReward/Textures/T_showpic_clothes_img_card_deco_02.T_showpic_clothes_img_card_deco_02` |  | 706.0, 535.0 | 1166.0, 658.0 | 460.0×123.0 |
| `/NewClothes/Switcher_Sort/Cloth/SingleCloth/Deco_Circle_03` | T_showpic_clothes_img_card_deco_03 | `/Game/UI/SysReward/Textures/T_showpic_clothes_img_card_deco_03.T_showpic_clothes_img_card_deco_03` |  | 712.0, 367.0 | 1166.0, 658.0 | 454.0×291.0 |
| `/NewClothes/Switcher_Sort/Cloth/SingleCloth/Deco_Line_02` | MI_UI_Single_Card_Line_02 | `/Game/UI/SysReward/Material/MI_UI_Single_Card_Line_02.MI_UI_Single_Card_Line_02` |  | 623.0, 591.0 | 1166.0, 658.0 | 543.0×67.0 |
| `/NewClothes/Switcher_Sort/Cloth/SingleCloth/Deco_Line_01` | MI_UI_Single_Card_Line_01 | `/Game/UI/SysReward/Material/MI_UI_Single_Card_Line_01.MI_UI_Single_Card_Line_01` |  | 485.0, 413.0 | 1166.0, 658.0 | 681.0×245.0 |
| `/NewClothes/Switcher_Sort/Cloth/SingleCloth/Img_Cloth/ClothImg` | T_showpic_clothes_blank | `/Game/UI/Image/Showpic/T_showpic_clothes_blank.T_showpic_clothes_blank` |  | 700.0, 178.0 | 1220.0, 902.0 | 520.0×724.0 |
| `/NewClothes/Switcher_Sort/Cloth/SingleCloth/Img_Frame` | T_showpic_clothes_img_frame_PNG | `/Game/__ExternalPaper2dAtlas__/SaveAtlas/UI/SysReward/Textures/__Frames/T_showpic_clothes_img_frame_PNG.T_showpic_clothes_img_frame_PNG` | 1 | 960.0, 540.0 | 960.0, 540.0 | 0.0×0.0 |
| `/NewClothes/Switcher_Sort/Cloth/SingleCloth/Fx_Image_Kuang` | MI_UI_Reward_16 | `/Game/UI/UIParticle/UI_Material/Reward/MI_UI_Reward_16.MI_UI_Reward_16` | 1 | 960.0, 403.9 | 960.0, 596.1 | 0.0×192.1 |
| `/NewClothes/Switcher_Sort/Cloth/SingleCloth/Image_New` | T_UI_reward_new_img_new | `/Game/UI/Common/Textures/T_UI_reward_new_img_new.T_UI_reward_new_img_new` | 5 | 1196.0, 36.5 | 1132.0, 465.5 | -64.0×429.0 |
| `/NewClothes/Switcher_Sort/Cloth/Fx_Group_Glow_Line/Fx_Glow_Line_01` | MI_UI_Get_Single_Glow_Line_01 | `/Game/UI/SysReward/Material/MI_UI_Get_Single_Glow_Line_01.MI_UI_Get_Single_Glow_Line_01` |  | -122.5, -22.6 | 1091.8, 405.8 | 1214.4×428.4 |
| `/NewClothes/Switcher_Sort/Cloth/Fx_Group_Glow_Line/Fx_Glow_Line_021` | MI_UI_Get_Single_Glow_Line_02 | `/Game/UI/SysReward/Material/MI_UI_Get_Single_Glow_Line_02.MI_UI_Get_Single_Glow_Line_02` | 6 | 384.9, 861.6 | 1349.6, 807.2 | 964.7×-54.4 |
| `/NewClothes/Switcher_Sort/Cloth/Fx_Group_Glow_Line/Fx_Glow_Line_022` | MI_UI_Get_Single_Glow_Line_01 | `/Game/UI/SysReward/Material/MI_UI_Get_Single_Glow_Line_01.MI_UI_Get_Single_Glow_Line_01` |  | -413.0, 1074.7 | 1035.7, 762.2 | 1448.6×-312.5 |
| `/NewClothes/Switcher_Sort/Cloth/Fx_Group_Glow_Line/Fx_Glow_Line_03` | MI_UI_Get_Single_Glow_Line_03 | `/Game/UI/SysReward/Material/MI_UI_Get_Single_Glow_Line_03.MI_UI_Get_Single_Glow_Line_03` |  | 1234.5, 428.5 | 1675.5, 561.5 | 441.0×133.0 |
| `/NewClothes/Switcher_Sort/Cloth/Fx_Resonance_Lines/Fx_Resonance_Line_01` | MI_UI_Resonnance_Get_Line_01 | `/Game/UI/SysResonance/Material/MI_UI_Resonnance_Get_Line_01.MI_UI_Resonnance_Get_Line_01` |  | -438.0, 743.0 | 1742.0, 917.0 | 2180.0×174.0 |
| `/NewClothes/Switcher_Sort/Cloth/Fx_Resonance_Lines/Fx_Resonance_Line_02` | MI_UI_Resonnance_Get_Line_02 | `/Game/UI/SysResonance/Material/MI_UI_Resonnance_Get_Line_02.MI_UI_Resonnance_Get_Line_02` |  | 926.0, -171.5 | 1418.0, 793.5 | 492.0×965.0 |
| `/NewClothes/Switcher_Sort/Cloth/Fx_Resonance_Lines/Fx_Resonance_Line_03` | MI_UI_Resonnance_Get_Line_03 | `/Game/UI/SysResonance/Material/MI_UI_Resonnance_Get_Line_03.MI_UI_Resonnance_Get_Line_03` |  | -771.0, 516.5 | 991.0, 649.5 | 1762.0×133.0 |
| `/NewClothes/Switcher_Sort/Cloth/Fx_Resonance_Lines/Fx_Resonance_Line_04` | MI_UI_Resonnance_Get_Line_01 | `/Game/UI/SysResonance/Material/MI_UI_Resonnance_Get_Line_01.MI_UI_Resonnance_Get_Line_01` |  | -825.2, -285.0 | 1162.9, 462.3 | 1988.1×747.3 |
| `/NewClothes/Switcher_Sort/Cloth/Fx_Resonance_Lines/Fx_Resonance_Line_05` | MI_UI_Resonnance_Get_Line_03 | `/Game/UI/SysResonance/Material/MI_UI_Resonnance_Get_Line_03.MI_UI_Resonnance_Get_Line_03` |  | 589.1, -241.4 | 1444.4, 396.9 | 855.3×638.3 |
| `/NewClothes/Switcher_Sort/Cloth/Fx_Resonance_Lines/Fx_Resonance_Line_06` | MI_UI_Resonnance_Get_Line_01 | `/Game/UI/SysResonance/Material/MI_UI_Resonnance_Get_Line_01.MI_UI_Resonnance_Get_Line_01` |  | 1354.7, 66.7 | 1840.2, 590.2 | 485.5×523.5 |
| `/NewClothes/Switcher_Sort/Cloth/Fx_Resonance_Lines_Burst/Fx_Resonance_Line_07` | MI_UI_Resonnance_Get_Line_01 | `/Game/UI/SysResonance/Material/MI_UI_Resonnance_Get_Line_01.MI_UI_Resonnance_Get_Line_01` |  | -947.3, 810.2 | 1572.2, 848.7 | 2519.6×38.5 |
| `/NewClothes/Switcher_Sort/Cloth/Fx_Resonance_Lines_Burst/Fx_Resonance_Line_08` | MI_UI_Resonnance_Get_Line_02 | `/Game/UI/SysResonance/Material/MI_UI_Resonnance_Get_Line_02.MI_UI_Resonnance_Get_Line_02` |  | 459.9, 270.7 | 1262.6, 940.9 | 802.7×670.2 |
| `/NewClothes/Switcher_Sort/Cloth/Fx_Resonance_Lines_Burst/Fx_Resonance_Line_09` | MI_UI_Resonnance_Get_Line_03 | `/Game/UI/SysResonance/Material/MI_UI_Resonnance_Get_Line_03.MI_UI_Resonnance_Get_Line_03` |  | -379.6, 630.3 | 1121.5, 687.4 | 1501.0×57.1 |
| `/NewClothes/Switcher_Sort/Cloth/Fx_Resonance_Lines_Burst/Fx_Resonance_Line_10` | MI_UI_Resonnance_Get_Line_01 | `/Game/UI/SysResonance/Material/MI_UI_Resonnance_Get_Line_01.MI_UI_Resonnance_Get_Line_01` |  | -578.5, 75.5 | 1245.2, 582.5 | 1823.7×507.0 |
| `/NewClothes/Switcher_Sort/Cloth/Fx_Resonance_Lines_Burst/Fx_Resonance_Line_11` | MI_UI_Resonnance_Get_Line_03 | `/Game/UI/SysResonance/Material/MI_UI_Resonnance_Get_Line_03.MI_UI_Resonnance_Get_Line_03` |  | 509.1, -77.2 | 1417.7, 451.6 | 908.6×528.8 |
| `/NewClothes/Switcher_Sort/Cloth/Fx_Resonance_Lines_Burst/Fx_Resonance_Line_12` | MI_UI_Resonnance_Get_Line_01 | `/Game/UI/SysResonance/Material/MI_UI_Resonnance_Get_Line_01.MI_UI_Resonnance_Get_Line_01` |  | 1024.0, 383.3 | 1730.0, 695.8 | 706.0×312.5 |
| `/NewClothes/Switcher_Sort/Cloth/Fx_Get_Single_5x_Shine` | MI_UI_Get_Suit_shine_01 | `/Game/UI/SysReward/Material/MI_UI_Get_Suit_shine_01.MI_UI_Get_Suit_shine_01` |  | -40.0, -220.0 | 1960.0, 1620.0 | 2000.0×1840.0 |

> 共 63 个带贴图 Image 节点。


## WBP_SuitCollect_Main_PC（套装收集）

> 源文件：`X6Game/Content/UI/SysReward/PC/WidgetBP/WBP_SuitCollect_Main_PC.uasset`　|　WidgetTree 节点数：42

| 层级路径 | 素材 | 素材资源路径 | zorder | 坐标 x0,y0 | 坐标 x1,y1 | 宽×高 |
|---|---|---|---|---|---|---|
| `/CanvasPanel_0/ScaleBox_4/CanvasPanel_42/Bg_03` | T_UI_dresup_img_bg_shadow | `/Game/UI/SysReward/Textures/SuitCollect/T_UI_dresup_img_bg_shadow.T_UI_dresup_img_bg_shadow` |  | 996.0, 608.0 | 1700.0, 1310.0 | 704.0×702.0 |
| `/CanvasPanel_0/ScaleBox_4/CanvasPanel_42/Left/CanvasPanel_44/Image_421` | T_UI_dresup_img_dec_05 | `/Game/UI/SysReward/Textures/SuitCollect/T_UI_dresup_img_dec_05.T_UI_dresup_img_dec_05` |  | -45.0, 541.1 | 0.0, 540.4 | 45.0×-0.7 |
| `/CanvasPanel_0/ScaleBox_4/CanvasPanel_42/Right/Bg_List/Bg_04` | T_UI_dresup_img_dec_03_PNG | `/Game/__ExternalPaper2dAtlas__/SaveAtlas/UI/SysReward/Textures/SuitCollect/__Frames/T_UI_dresup_img_dec_03_PNG.T_UI_dresup_img_dec_03_PNG` |  | 1040.0, 418.0 | 1480.0, 749.0 | 440.0×331.0 |
| `/CanvasPanel_0/ScaleBox_4/CanvasPanel_42/Right/Bg_List/Bg_05` | MI_UI_SuitCollect_Mask_02 | `/Game/UI/SysReward/Material/MI_UI_SuitCollect_Mask_02.MI_UI_SuitCollect_Mask_02` |  | 1519.2, 606.0 | 2096.6, 869.0 | 577.4×263.0 |
| `/CanvasPanel_0/ScaleBox_4/CanvasPanel_42/Right/Bg_List/Bg_06` | T_UI_dresup_img_dec_04 | `/Game/UI/SysReward/Textures/SuitCollect/T_UI_dresup_img_dec_04.T_UI_dresup_img_dec_04` |  | 1824.0, 588.0 | 1872.0, 834.0 | 48.0×246.0 |
| `/CanvasPanel_0/ScaleBox_4/CanvasPanel_42/Right/Bg_List/Bg_ring` | MI_UI_SuitCollect_deco_Glow_01 | `/Game/UI/SysReward/Material/MI_UI_SuitCollect_deco_Glow_01.MI_UI_SuitCollect_deco_Glow_01` |  | 874.0, 584.0 | 1397.0, 832.0 | 523.0×248.0 |
| `/CanvasPanel_0/ScaleBox_4/CanvasPanel_42/Right/Bg_List/Bg_txt_deco` | MI_UI_SuitCollect_Mask_01 | `/Game/UI/SysReward/Material/MI_UI_SuitCollect_Mask_01.MI_UI_SuitCollect_Mask_01` |  | 2006.0, 644.0 | 1963.0, 862.0 | -43.0×218.0 |
| `/CanvasPanel_0/ScaleBox_4/CanvasPanel_42/Right/Bg_List/Bg_09` | T_UI_dresup_img_light | `/Game/UI/SysReward/Textures/SuitCollect/T_UI_dresup_img_light.T_UI_dresup_img_light` |  | 1984.0, 980.0 | 1952.0, 1030.0 | -32.0×50.0 |
| `/CanvasPanel_0/ScaleBox_4/CanvasPanel_42/Right/Bg_List/Fx_Glow_01` | MI_UI_SuitCollect_shine_01 | `/Game/UI/SysReward/Material/MI_UI_SuitCollect_shine_01.MI_UI_SuitCollect_shine_01` |  | 1400.0, 536.0 | 1764.0, 880.0 | 364.0×344.0 |
| `/CanvasPanel_0/ScaleBox_4/CanvasPanel_42/Right/Bg_List/Fx_Glow_02` | MI_UI_SuitCollect_shine_02 | `/Game/UI/SysReward/Material/MI_UI_SuitCollect_shine_02.MI_UI_SuitCollect_shine_02` |  | 616.0, 288.0 | 1332.0, 740.0 | 716.0×452.0 |
| `/CanvasPanel_0/ScaleBox_4/CanvasPanel_42/Right/Bg_List/Bg_lines` | T_UI_dresup_img_line_01 | `/Game/UI/SysReward/Textures/SuitCollect/T_UI_dresup_img_line_01.T_UI_dresup_img_line_01` |  | 2070.2, 1174.0 | 1995.1, 1127.0 | -75.1×-47.0 |
| `/CanvasPanel_0/ScaleBox_4/CanvasPanel_42/Right/Fx_Group_Glow_Line/Fx_Glow_Line_01` | MI_UI_Get_Single_Glow_Line_04 | `/Game/UI/SysReward/Material/MI_UI_Get_Single_Glow_Line_04.MI_UI_Get_Single_Glow_Line_04` |  | 676.0, 704.0 | 1436.0, 760.0 | 760.0×56.0 |
| `/CanvasPanel_0/ScaleBox_4/CanvasPanel_42/Right/Fx_Group_Glow_Line/Fx_Glow_Line_02` | MI_UI_Get_Single_Glow_Line_01 | `/Game/UI/SysReward/Material/MI_UI_Get_Single_Glow_Line_01.MI_UI_Get_Single_Glow_Line_01` |  | 860.0, 808.5 | 1460.0, 673.5 | 600.0×-135.0 |
| `/CanvasPanel_0/ScaleBox_4/CanvasPanel_42/Right/Fx_Group_Glow_Line/Fx_Glow_Line` | MI_UI_Get_Single_Glow_Line_03 | `/Game/UI/SysReward/Material/MI_UI_Get_Single_Glow_Line_03.MI_UI_Get_Single_Glow_Line_03` |  | 907.1, 586.9 | 1566.4, 614.3 | 659.3×27.4 |

> 共 14 个带贴图 Image 节点。


## WBP_Resonance_Main（共鸣主界面）

> 源文件：`X6Game/Content/UI/SysResonance/PC/WBP_Resonance_Main.uasset`　|　WidgetTree 节点数：108

| 层级路径 | 素材 | 素材资源路径 | zorder | 坐标 x0,y0 | 坐标 x1,y1 | 宽×高 |
|---|---|---|---|---|---|---|
| `/CanvasPanel_70/BG/Image_64` | MI_UI_Resonance_Gacha_Bg_Line_01 | `/Game/UI/SysResonance/Material/MI_UI_Resonance_Gacha_Bg_Line_01.MI_UI_Resonance_Gacha_Bg_Line_01` |  | 188.9, 788.9 | 2324.3, 1207.0 | 2135.4×418.1 |
| `/CanvasPanel_70/BG/Image_452` | T_UI_resonance_bg_Light_01 | `/Game/UI/SysResonance/Texture/T_UI_resonance_bg_Light_01.T_UI_resonance_bg_Light_01` |  | 960.0, 770.2 | 960.0, 1013.5 | 0.0×243.4 |
| `/CanvasPanel_70/BG/Fx_Bg_Black` | MI_UI_Resonance_Main_Bottom_Black | `/Game/UI/SysResonance/Material/MI_UI_Resonance_Main_Bottom_Black.MI_UI_Resonance_Main_Bottom_Black` |  | 0.0, 600.0 | 1920.0, 760.0 | 1920.0×160.0 |
| `/CanvasPanel_70/BG/Fx_Glow_01` | MI_UI_SkyLight_01 | `/Game/UI/UIParticle/UI_Material/MI_UI_SkyLight_01.MI_UI_SkyLight_01` | 2 | 152.0, 422.0 | 2115.0, 600.0 | 1963.0×178.0 |
| `/CanvasPanel_70/BG/Fx_Glow_02` | MI_UI_SkyLight_02 | `/Game/UI/UIParticle/UI_Material/MI_UI_SkyLight_02.MI_UI_SkyLight_02` | 2 | 203.0, 365.0 | 1986.0, 538.0 | 1783.0×173.0 |
| `/CanvasPanel_70/Right_Btn/VerticalBox_0/Bonus/Image_Progress_Bg_1` | T_UI_fragranc_img_text_shadow_PNG | `/Game/__ExternalPaper2dAtlas__/SaveAtlas/UI/SysClothes/Textures/Fragrance/__Frames/T_UI_fragranc_img_text_shadow_PNG.T_UI_fragranc_img_text_shadow_PNG` |  | 863.0, 92.0 | 1057.0, 0.0 | 194.0×-92.0 |
| `/CanvasPanel_70/Right_Btn/VerticalBox_0/Wish_Cloth/CanvasPanel_0/WidgetSwitcher_Wish/Empty/Image_Empty` | T_UI_resonance_btn_limitwish_add_n | `/Game/UI/SysResonance/Texture/V2/T_UI_resonance_btn_limitwish_add_n.T_UI_resonance_btn_limitwish_add_n` |  | 942.0, 522.0 | 978.0, 558.0 | 36.0×36.0 |
| `/CanvasPanel_70/Effect/img_titleBg` | T_UI_Glow_23 | `/Game/UI/UIParticle/Texture/T_UI_Glow_23.T_UI_Glow_23` |  | 478.5, -768.0 | 841.5, 408.0 | 363.0×1176.0 |

> 共 8 个带贴图 Image 节点。


## WBP_Resonance_Bouns_Main（奖励轨道）

> 源文件：`X6Game/Content/UI/SysResonance/PC/Bonus/WBP_Resonance_Bouns_Main.uasset`　|　WidgetTree 节点数：36

| 层级路径 | 素材 | 素材资源路径 | zorder | 坐标 x0,y0 | 坐标 x1,y1 | 宽×高 |
|---|---|---|---|---|---|---|
| `/CanvasPanel_11/Fx_Effect/Fx_FadeIn_Sweep_01` | MI_UI_Resonance_Bouns_FadeIn_Sweep_01 | `/Game/UI/SysResonance/Material/MI_UI_Resonance_Bouns_FadeIn_Sweep_01.MI_UI_Resonance_Bouns_FadeIn_Sweep_01` |  | 0.0, -488.0 | 1920.0, 1052.0 | 1920.0×1540.0 |
| `/CanvasPanel_11/Fx_Effect/Fx_FadeIn_Sweep_02` | MI_UI_Resonance_Bouns_FadeIn_Sweep_02 | `/Game/UI/SysResonance/Material/MI_UI_Resonance_Bouns_FadeIn_Sweep_02.MI_UI_Resonance_Bouns_FadeIn_Sweep_02` |  | 0.0, -488.0 | 1920.0, 1052.0 | 1920.0×1540.0 |

> 共 2 个带贴图 Image 节点。


## WBP_Resonance_RewarPanel_PC_V2（奖励面板 V2）

> 源文件：`X6Game/Content/UI/SysResonance/PC/Reward_V2/WBP_Resonance_RewarPanel_PC_V2.uasset`　|　WidgetTree 节点数：63

| 层级路径 | 素材 | 素材资源路径 | zorder | 坐标 x0,y0 | 坐标 x1,y1 | 宽×高 |
|---|---|---|---|---|---|---|
| `/CanvasPanel_22/Fx_Deco_Lines/Fx_Group_Cir_01/Fx_Bg_Point_11` | T_UI_common_whitecircle_big | `/Game/UI/Common/Textures/T_UI_common_whitecircle_big.T_UI_common_whitecircle_big` |  | -263.5, 316.4 | 557.5, 470.8 | 821.0×154.4 |
| `/CanvasPanel_22/Fx_Deco_Lines/Fx_Group_Cir_01/Fx_Bg_Point_12` | T_UI_common_whitecircle_big | `/Game/UI/Common/Textures/T_UI_common_whitecircle_big.T_UI_common_whitecircle_big` |  | 2039.0, 1140.5 | 1325.0, 745.5 | -714.0×-395.0 |
| `/CanvasPanel_22/Fx_Deco_Lines/Fx_Group_Cir_01/Fx_Bg_Cir_01` | MI_UI_Resonance_Bg_Cir_01 | `/Game/UI/SysResonance/Material/MI_UI_Resonance_Bg_Cir_01.MI_UI_Resonance_Bg_Cir_01` |  | -690.0, -1110.0 | 2610.0, 2190.0 | 3300.0×3300.0 |
| `/CanvasPanel_22/Fx_Deco_Lines/Fx_Group_Cir_02/Fx_Bg_Point_21` | T_UI_common_whitecircle_big | `/Game/UI/Common/Textures/T_UI_common_whitecircle_big.T_UI_common_whitecircle_big` |  | 1393.1, -56.5 | 1109.7, 346.5 | -283.4×403.0 |
| `/CanvasPanel_22/Fx_Deco_Lines/Fx_Group_Cir_02/Fx_Bg_Cir_02` | MI_UI_Resonance_Bg_Cir_01 | `/Game/UI/SysResonance/Material/MI_UI_Resonance_Bg_Cir_01.MI_UI_Resonance_Bg_Cir_01` |  | -20.0, -440.0 | 1940.0, 1520.0 | 1960.0×1960.0 |
| `/CanvasPanel_22/Fx_Deco_Lines/Fx_Bg_Cir_04` | MI_UI_Resonance_Bg_Cir_02 | `/Game/UI/SysResonance/Material/MI_UI_Resonance_Bg_Cir_02.MI_UI_Resonance_Bg_Cir_02` |  | 2076.0, -214.5 | 1772.0, 728.5 | -304.0×943.0 |
| `/CanvasPanel_22/Fx_Deco_Lines/Fx_Group_Cir_03/Fx_Bg_Point_31` | T_UI_common_whitecircle_big | `/Game/UI/Common/Textures/T_UI_common_whitecircle_big.T_UI_common_whitecircle_big` |  | 705.0, 1252.5 | 881.0, 783.5 | 176.0×-469.0 |
| `/CanvasPanel_22/Fx_Deco_Lines/Fx_Group_Cir_03/Fx_Bg_Point_32` | T_UI_common_whitecircle_big | `/Game/UI/Common/Textures/T_UI_common_whitecircle_big.T_UI_common_whitecircle_big` |  | 673.5, 1242.0 | 868.5, 778.0 | 195.0×-464.0 |
| `/CanvasPanel_22/Fx_Deco_Lines/Fx_Group_Cir_03/Fx_Bg_Cir_03` | MI_UI_Resonance_Bg_Cir_01 | `/Game/UI/SysResonance/Material/MI_UI_Resonance_Bg_Cir_01.MI_UI_Resonance_Bg_Cir_01` |  | -50.0, -470.0 | 1970.0, 1550.0 | 2020.0×2020.0 |
| `/CanvasPanel_22/Fx_Deco_Lines/Fx_Bg_Line_02` | MI_UI_Resonance_Bg_Line_01 | `/Game/UI/SysResonance/Material/MI_UI_Resonance_Bg_Line_01.MI_UI_Resonance_Bg_Line_01` |  | -497.4, -684.1 | 1340.9, 665.3 | 1838.3×1349.4 |
| `/CanvasPanel_22/Fx_Deco_Lines/Fx_Bg_Line_04` | MI_UI_Resonance_Bg_Line_01 | `/Game/UI/SysResonance/Material/MI_UI_Resonance_Bg_Line_01.MI_UI_Resonance_Bg_Line_01` |  | -1686.2, -635.1 | 944.6, 681.6 | 2630.8×1316.7 |
| `/CanvasPanel_22/Fx_Deco_Lines/Fx_Bg_Line_05` | MI_UI_Resonance_Bg_Line_01 | `/Game/UI/SysResonance/Material/MI_UI_Resonance_Bg_Line_01.MI_UI_Resonance_Bg_Line_01` |  | 1888.5, -783.7 | 2136.2, 632.1 | 247.7×1415.8 |
| `/CanvasPanel_22/Fx_Deco_Lines/Fx_Bg_Line_03` | MI_UI_Resonance_Bg_Line_01 | `/Game/UI/SysResonance/Material/MI_UI_Resonance_Bg_Line_01.MI_UI_Resonance_Bg_Line_01` |  | -1265.6, -649.3 | 1084.8, 676.9 | 2350.4×1326.2 |
| `/CanvasPanel_22/Fx_Deco_Lines/Fx_Bg_Line_L` | MI_UI_Resonance_Bg_Line_02 | `/Game/UI/SysResonance/Material/MI_UI_Resonance_Bg_Line_02.MI_UI_Resonance_Bg_Line_02` |  | 1250.5, 13.0 | 1923.5, 1031.0 | 673.0×1018.0 |
| `/CanvasPanel_22/Fx_Deco_Lines/Fx_Bg_Line_L_fadein` | MI_UI_Resonance_Bg_Line_02 | `/Game/UI/SysResonance/Material/MI_UI_Resonance_Bg_Line_02.MI_UI_Resonance_Bg_Line_02` |  | 1250.5, 13.0 | 1923.5, 1031.0 | 673.0×1018.0 |
| `/CanvasPanel_22/Fx_Deco_Lines/Fx_Bg_Line_R` | MI_UI_Resonance_Bg_Line_03 | `/Game/UI/SysResonance/Material/MI_UI_Resonance_Bg_Line_03.MI_UI_Resonance_Bg_Line_03` |  | -630.5, 13.0 | 1296.5, 1031.0 | 1927.0×1018.0 |
| `/CanvasPanel_22/Fx_Deco_Lines/Fx_Bg_Line_R_fadein` | MI_UI_Resonance_Bg_Line_03 | `/Game/UI/SysResonance/Material/MI_UI_Resonance_Bg_Line_03.MI_UI_Resonance_Bg_Line_03` |  | -630.5, 13.0 | 1296.5, 1031.0 | 1927.0×1018.0 |
| `/CanvasPanel_22/Fx_Deco_Lines/Fx_Group_Cir_Center/Fx_Bg_Deco_01` | T_UI_resonance_bg_Deco_01 | `/Game/UI/SysResonance/Texture/T_UI_resonance_bg_Deco_01.T_UI_resonance_bg_Deco_01` |  | 963.8, 1136.9 | 961.2, 739.0 | -2.5×-397.9 |
| `/CanvasPanel_22/Fx_Deco_Lines/Fx_Group_Cir_Center/Fx_Bg_Line_01` | MI_UI_Resonance_Bg_Line_01 | `/Game/UI/SysResonance/Material/MI_UI_Resonance_Bg_Line_01.MI_UI_Resonance_Bg_Line_01` |  | 310.0, 90.2 | 1610.0, 1256.7 | 1300.0×1166.5 |
| `/CanvasPanel_22/Fx_Deco_Lines/Fx_Group_Cir_Center/Fx_Bg_Cir_Center` | MI_UI_Resonance_Bg_Cir_03 | `/Game/UI/SysResonance/Material/MI_UI_Resonance_Bg_Cir_03.MI_UI_Resonance_Bg_Cir_03` |  | 180.0, -240.0 | 1740.0, 1320.0 | 1560.0×1560.0 |
| `/CanvasPanel_22/Single_Reward/BG_Right` | T_resonance_clothes_bg_right | `/Game/UI/SysResonance/Texture/V2/T_resonance_clothes_bg_right.T_resonance_clothes_bg_right` |  | -456.0, 0.0 | 732.0, 1080.0 | 1188.0×1080.0 |
| `/CanvasPanel_22/Ten_Rewards/Title/Fx_Title_point_01/Fx_Title_Point_11` | T_UI_common_whitecircle_big | `/Game/UI/Common/Textures/T_UI_common_whitecircle_big.T_UI_common_whitecircle_big` |  | 885.3, 470.8 | 940.4, 522.3 | 55.1×51.5 |
| `/CanvasPanel_22/Ten_Rewards/Title/Fx_Title_point_01/Fx_Title_Point_12` | T_UI_common_whitecircle_big | `/Game/UI/Common/Textures/T_UI_common_whitecircle_big.T_UI_common_whitecircle_big` |  | 1022.8, 605.0 | 986.2, 567.0 | -36.5×-38.0 |
| `/CanvasPanel_22/Ten_Rewards/Title/Fx_Title_Line_01` | MI_UI_Resonance_Bg_Line_02 | `/Game/UI/SysResonance/Material/MI_UI_Resonance_Bg_Line_02.MI_UI_Resonance_Bg_Line_02` |  | 807.5, 170.0 | 1200.5, 950.0 | 393.0×780.0 |
| `/CanvasPanel_22/Ten_Rewards/Title/Fx_Title_Cir_01` | MI_UI_Resonance_Title_Cir_01 | `/Game/UI/SysResonance/Material/MI_UI_Resonance_Title_Cir_01.MI_UI_Resonance_Title_Cir_01` |  | 682.0, 427.0 | 1038.0, 673.0 | 356.0×246.0 |
| `/CanvasPanel_22/Ten_Rewards/Title/Fx_Title_Cir_02` | MI_UI_Resonance_Title_Cir_02 | `/Game/UI/SysResonance/Material/MI_UI_Resonance_Title_Cir_02.MI_UI_Resonance_Title_Cir_02` |  | 752.0, 497.0 | 968.0, 603.0 | 216.0×106.0 |
| `/CanvasPanel_22/Ten_Rewards/Title/Fx_Dots_02` | MI_UI_Single_Card_Line_02 | `/Game/UI/SysReward/Material/MI_UI_Single_Card_Line_02.MI_UI_Single_Card_Line_02` |  | 731.6, 548.6 | 1166.0, 658.0 | 434.4×109.4 |
| `/CanvasPanel_22/Ten_Rewards/Title/Fx_Dots_01` | MI_UI_Single_Card_Line_01 | `/Game/UI/SysReward/Material/MI_UI_Single_Card_Line_01.MI_UI_Single_Card_Line_01` |  | 839.9, 546.4 | 1166.0, 658.0 | 326.1×111.6 |
| `/CanvasPanel_22/Ten_Rewards/Title/Fx_Title_Sweep` | MI_UI_Ten_Title_Sweep | `/Game/UI/SysResonance/Material/MI_UI_Ten_Title_Sweep.MI_UI_Ten_Title_Sweep` | 1 | 660.0, 452.3 | 1260.0, 657.4 | 600.0×205.2 |

> 共 29 个带贴图 Image 节点。


---

## 坐标换算说明

UMG CanvasPanelSlot 布局由三部分决定（均为原始数据）：

1. **Anchors（锚点）**：归一化 0~1 的 Min/Max 两个点，相对父容器尺寸。

2. **Offsets（偏移）**：像素 Left/Top/Right/Bottom，叠加在锚点上。

3. **Alignment（对齐）**：归一化，表示控件自身对齐点（0,0 左上 / 0.5,0.5 中心 / 1,1 右下）。

换算公式：`x0 = Min.X×W + Left；y0 = Min.Y×H + Top；x1 = Max.X×W + Right；y1 = Max.Y×H + Bottom`，再按 Alignment 平移。

换算已在本文档完成，W=1920、H=1080。
