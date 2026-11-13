/** manifest.json 的类型定义（由 tools/collect-assets.py 生成） */

/** 单座服装阁的专属套名横幅（右侧渐隐）；键为该套装在本池的序号，`any` = 整池一张 */
export interface NamePlate {
  any?: string
  [seq: string]: string | undefined
}

/** 版本元数据 */
export interface VersionMeta {
  /** 版本号，如 "2.11" */
  v: string
  /** 展示名，如 "时光缝合的扉页" */
  name: string
  /** 大版本号（"1" / "2"），决定赛季栏分组 */
  major: string
  /** 大版本名，如 "伊赞之土" */
  majorName: string
  /** 版本介绍文案 */
  desc: string
}

export interface RulesConfig {
  cost: {
    item: string
    perPull: number
    perTenPull: number
    infinite: boolean
    insufficientPopup: boolean
    note: string
  }
  currencies: Record<string, { type: string; infinite: boolean; rateToCrystal: number | null; note?: string }>
  rates: {
    base: Record<'3' | '4' | '5', number>
    effective: Record<'3' | '4' | '5', number>
    note: string
  }
  pity: {
    /** 4★ 保底 */
    '4': { hard: number; softStart?: number; softSlope?: number; note: string }
    '5': { hard: number; softStart: number; softSlope: number; curve: string; note: string }
    inheritAcrossBanners: boolean
    note: string
  }
  standardPoolSamePity: boolean
  /** 纯 4★ 服装阁的独立概率：4★ 基础 10%、每 5 抽必出；缺省时退回主池规则 */
  pure4?: {
    /** 4★ 单抽基础概率 */
    base4: number
    /** 4★ 硬保底抽数（5 = 每 5 抽必出） */
    hard4: number
    /** 第 N 抽起 4★ 概率线性提升；不填 = 恒定 base4 */
    softStart4?: number
    softSlope4?: number
    /** 综合概率 */
    effective4: number
    note: string
  }
  noDuplicate: boolean
  wishSelect: { enabled: boolean; note: string }
  milestonePulls: number[]
}

export interface CurrencyInfo {
  icon: string
  kind: string
  type: string
  usage: string
  infinite: boolean
}

export interface SetIcon {
  name: string
  src: string
}

/** 3★ 通用散件（来自 三星散件清单.yaml） */
export interface Star3Info {
  name: string
  src: string
  /** 256×256 透明单品图标 */
  icon?: string
  /** 部位：发型 / 鞋子 / 饰品·发饰 … */
  slot: string
  /** 风格：典雅 / 甜美 / … */
  style: string
  /** 细分标签：清凉 / 制服 / 幻想 … */
  tags: string[]
  /** 五维 */
  stats: Record<string, number>
  /** 五维前两名 */
  top: string[]
  /** 描述文案 */
  desc: string
  /** 角色评论，`角色:内容|角色:内容` */
  comment: string
  code: string
}

export interface SetCard {
  name: string
  src: string
}

export interface SetStage {
  stage: string
  setName: string
  cards: SetCard[]
}

export interface SetAssets {
  portrait: string | null
  awaken: string[]
  icons: SetIcon[]
  stages: SetStage[]
}

/** 属性-*.yaml 里的单个部件数据 */
export interface SetPartInfo {
  name: string
  slot: string
  uid: string
  /** 五维：典雅 / 清新 / 甜美 / 性感 / 帅气 */
  stats: Record<string, number>
  /** 数值最高的两个维度，用于卡面标签 */
  top: string[]
  /** 部件文案 */
  desc: string
  /** 细分标签：类别 / 材质 / 装饰 … */
  tags: Record<string, string | string[]>
}

export interface SetInfo {
  id: string
  name: string
  star: number
  origin: string
  firstVersion: string
  assets: SetAssets
  /** 部件属性（3★ 散件没有，只有 5★/4★ 套装） */
  parts?: SetPartInfo[]
  /** 完整套装文案（套装文案 txt 里『整体』那一段） */
  desc?: string
  /** 套装标签：主属性 + 风格词（如 性感 / 神谕 / 绮想） */
  styles?: string[]
  /** 文案来源行：2.10金羽的裁决-限定共鸣-执律的流金 */
  textSource?: string
  /** 每个部位 × 每个进化形态的部件文案，键是部位名 */
  formTexts?: Record<string, { name: string; text: string }[]>
  /** 专属铭牌序号，索引 `ui.banner.namePlates[gachaKey][plateIdx]`；缺省时前端退回通用底板 */
  plateIdx?: number
}

export interface BannerAssets {
  /** 服装阁动态背景 webm（官网 PV 转码），没有就是 null */
  bgVideo: string | null
  /** 去艺术字版整屏背景，界面**只**认这一张 */
  bgClean: string | null
  thumb: string | null
  /** 服装阁名艺术字（透明底书法字） */
  title: string | null
}

export interface MilestoneInfo {
  pulls: number
  reward: string
  img: string
}

export interface BannerInfo {
  id: string
  /** 版本内序号（1 起，由管线算、前端只读）：含 5★ 的阁在前 → 同星级按 gachaKey 升序 → 常驻阁最后 */
  seq?: number
  name: string
  version: string
  versionName: string
  /** 阁型：`limited` / `standard` / `collab`，或工坊里自定义的任意值 */
  type: string
  /** 自定义阁型的中文名（内置阁型没有这个字段） */
  typeLabel?: string
  star: string
  gachaKey: string | null
  assets: BannerAssets
  milestones: MilestoneInfo[]
  /** 深海回响左侧的摆饰 / 礼盒（没有就 null；有文案无图时 img 为 null） */
  decor: BannerDecor | null
  sets: SetInfo[]
}

export interface BannerDecor {
  name: string
  desc: string
  img: string | null
}


/** 界面素材表（ui/*），全部由 collect-assets.py 生成，缺失项为 null */
/** 玄学运势书桌风格：欧洲风 / 中国风 */
export type SceneStyle = 'eu' | 'cn'
/** 卷轴按钮语义键 */
export type HitKey = 'past' | 'today' | 'future' | 'bazi'

/** 黑屏加载过渡的指向性装饰键（与 manifest.ui.loading.photo 一一对应） */
export type LoadPhotoKey = 'home' | 'ver' | 'banner' | 'codex' | 'almanac' | 'gloria'

/** 背景音场景键，与 `manifest.bgm` 的键一一对应（`home` 无独立曲目，仅音量面板使用） */
export type BgmScene = 'home' | 'versions' | 'banner' | 'codex' | 'almanac' | 'gloria'

/** 一首背景音：`src` 相对 /assets/，`w` 是同场景内的相对权重 */
export interface BgmTrack {
  src: string
  w: number
}

export interface UiAssets {
  /** 黑屏加载过渡（SysLoading 素材）：底部进度条 + 右下奔跑装饰 + 各界面指向性装饰 */
  loading: {
    /** 整屏底图 1920×1080（`T_UI_loading_bg.png`：淡青白的花枝宣纸） */
    bg: string | null
    /** 进度条底 */
    sliderOff: string | null
    /** 进度条高亮 */
    sliderOn: string | null
    /** 精灵群装饰 1920×1080（右下角奔跑装饰周围的漂浮精灵） */
    spirits: string | null
    /** 右下角奔跑动图（原 奔跑暖暖_动态.gif，16 帧） */
    runner: string | null
    /** 各界面指向性装饰 1220×632（水彩羽化边） */
    photo: Partial<Record<'home' | 'ver' | 'banner' | 'codex' | 'almanac' | 'gloria', string>>
  }
  /** 彩蛋弹窗（主页右下角热区）左右切换键：`T_UI__collocation_btn_skip_n / _h`。左键在 CSS 里 `scaleX(-1)` 翻转，保持「左键向左、右键向右」的直觉 */
  egg?: {
    skipN: string | null
    skipH: string | null
  }
  /** 主页右上角「信封」弹窗：`env` 信封正面 / `back` 信封背 / `paper` 信纸 */
  mail?: {
    env: string | null
    back: string | null
    paper: string | null
  } | null
  home: {
    bg: string | null
    /** 用户自己设计的主页底图（开机动画播完后随 LOGO 淡入） */
    bgMain: string | null
    /** 站名艺术字（心忆共鸣） */
    logo: string | null
    /** 横版「无限暖暖 INFINITY NIKKI」（与竖版并存） */
    logoCenter: string | null
    /** 动态背景（`StarSeaPublicSpace_Wing_001_Mobile.webm` 转码）。与静态底图之间用左下角切换键互斥，默认播动态 */
    bgVideo: string | null
    /** 动态背景的独立音轨（由 webm 拆出的 opus/ogg）；视频本身永远 `muted` 播放 */
    bgAudio?: string | null
    /** 首页轮播的动态背景：每次冷启动随机一条、会话内固定；读不到时回落单条 `bgVideo` / `bgAudio` */
    bgVideos?: { video: string; audio?: string | null; poster?: string | null }[]
    /** 主页五个二级界面入口，图标常态半透明、悬停呼吸 */
    nav: Partial<Record<'ver' | 'codex' | 'almanac' | 'banner' | 'gloria', string>>
    /** 动态背景版入口 + 左侧栏图标（同一批 `SystemIcon` 素材） */
    navSys: Partial<Record<'ver' | 'banner' | 'almanac' | 'codex' | 'gloria' | 'home', string>>
    /** 装饰件（`素材/主页/主页面素材`），全部按 screen 混合叠在背景上 */
    deco: Partial<Record<
      'starlight' | 'halo' | 'ribbon' | 'stars' | 'glow' | 'beam',
      string
    >>
  }
  /** 共鸣页专用小件 */
  banner: {
    /** 服装阁列表条目的名称底条 */
    listLine: string
    /** 标题背光（T_UI_Glow_23） */
    glowTitle: string
    /** 服装阁类型标签底 168×60：常驻蓝 / 限定金 / 联动限定绿 */
    tagStandard: string
    tagLimited: string
    tagCollab: string
    /** 服装阁缩略图的米白光框 268×148 */
    cardFrame: string
    /** 底部三段长按钮 624×100（超值礼包 / 共鸣详情 / 套装展示） */
    longBar: string
    /** 视频 / 静态背景切换键 */
    switch: string
    /** 切换键悬停高亮 */
    switchH: string
    switchIco: string
    /** 金色描边（活动条高亮） */
    goldenEdge: string
    /** 列表分割线 736×4 */
    divider: string
    socialBg: string
    /** 深海回响活动签 152×168 */
    wishN: string
    wishH: string
    /** 共鸣按钮 356×112，文字已烘焙 */
    pullWhite: string
    pullYellow: string
    /** 服装阁背景兜底。该阁没给背景图、或背景/动态背景加载失败时用它， 复用版本页那张通用风景（`ui/ver/bg.webp`） */
    fallbackBg?: string | null
    /** 服装阁主背景原图 2560×1440 */
    bg076: string
    /** 货币栏下划线（金线在底部） */
    longDetailsN: string
    /** 深海回响礼盒图标 */
    giftFlower: string
    /** 通用套名横幅底板（name01 粉=5★ / name02 紫=4★） */
    setName1: string
    setName2: string
    /** 各池专属套名横幅：键为三位池编号（"004"），值为整池一张的字符串或 `{ any?, "5"?, "4"? }` */
    namePlates: Record<string, string | NamePlate>
    /** 共鸣详情弹窗 */
    winBg: string
    winLine1: string
    winLine4: string
    winLine3: string
  }
  /** 套装详情弹层 */
  popup: {
    art: Record<string, string>
    plate: Record<string, string>
    slot: string
    slotHover: string
    /** 主背景（活动窗口底图） */
    bg: string
    /** 名字背后的暗色光晕 */
    glow: string
    nameN: string
    nameH: string
    star: string
    ribbon1: string
    ribbon2: string
    pocky: string
    light: string
    line1: string
    line2: string
    diamond: string
    band: string
    slotFrame: string
    /** 方框内的白色圆角板 */
    slotBg: string
    formCard: string
    label: string
    /** 进化等级图标 常态 [01,02,03,04]（_l，置灰） */
    stages: string[]
    /** 进化等级图标 已激活 [01,02,03,04]（_s，高亮） */
    stagesOn: string[]
    /** 属性标签胶囊底（键 "01".."10"），按《标签颜色映射表》分色 */
    labels: Record<string, string>
  }
  cursor: string | null
  btn: {
    /** 共鸣按钮：文字已烘焙进图，直接当背景用 */
    resSingle: string
    resTen: string
    skip: string
    /** 圆形返回按钮（游戏内素材） */
    backN: string
    backH: string
    closeN: string
    closeH: string
    /** 键位提示：F 键 / 鼠标左键 */
    keyF: string
    keyMouse: string
    /** 套装详情 → 服装图鉴的跳转图 */
    jump?: string
  }
  /** 深海回响奖励轨道。素材来自 `ui/deepsea/` */
  deepsea: {
    /** 全屏背景 2731×1535（深蓝夜空 + 底部云海） */
    bg: string
    /** 摆饰展示大图 1264×728（万金之上，带软边遮罩） */
    /** 主进度轨道波形（黑底白线，必须 screen） */
    track: string
    track2: string
    /** 辅助装饰弧线 */
    arc1: string
    arc2: string
    arc3: string
    /** 节点灯泡（尖朝下的水滴） */
    nodeArrow: string
    /** 未达成节点细环 */
    nodeRing: string
    /** 下一档高亮环 */
    nodeRingOn: string
    /** 抽数徽章内球 */
    badgeBall: string
    /** 抽数徽章外刻度盘 */
    badgeDial: string
    /** 重点档蓝色光柱 */
    beam: string
    /** 顶部紫缎带 */
    ribbon: string
    /** 右侧分隔饰线 + 中央菱形 */
    divider: string
    /** 极淡横向光带 */
    glowBand: string
    /** 抽数胶囊底板 116×44（只当 mask 用，保留柔和圆角） */
    numPlate: string
    /** 已领取对勾（screen 叠在奖励卡上） */
    hook: string
    /** 返回金钮三态 */
    backN: string
    backH: string
    /** 奖励卡粉底 */
    card: string
    /** 奖励卡金框（未达成态） */
  }
  detail: {
    bg: string
    /** 整屏底板 */
    bgPlate: string
    bgRight: string
    frame: string
    /** 4 种属性配色面板：1 粉甜美 / 2 紫性感 / 3 蓝帅气 / 4 棕金典雅 */
    board: string[]
    orname: string[]
    ring: string
    logo: string
    deco: string[]
    line: string
    /** 细分割线，详情页横线 */
    lineThin: string
    /** 额外获得条里的素材图标 */
    iconItem: string
    /** 立绘底图 */
    clothBlank: string
    /** 面板侧丝带 */
    orname3: string
    /** 丝绸吊牌 */
    silkRibbon: string
    /** 文字装饰条 */
    ornameText: string
    /** 细下划线 */
    ornameText2: string
    /** 圆环 + 圆珠装饰 */
    ornament3: string
    tips: string[]
    star: string
    labelBg: string
    labels: string[]
    /** 属性标签长条 165×47：1 甜美粉 / 2 典雅金 / 3 清新绿 / 4 性感紫 / 5 帅气蓝 */
    tags: string[]
  }
  /** 十连结果页：背景是用户烘焙好的整图，其余为卡面素材 */
  result: {
    bg: string
    /** 3★/4★/5★ 卡框（含名牌底板） */
    char: string[]
    glowPurple: string
    glowPink: string
    /** 十连「新」角标 120×70 */
    newBadge: string
    /** 单抽「新」角标 156×156 */
    newSuit: string
    /** 重复件赠送材料 */
    mat3: string
    mat4: string
    /** 「×n」角标底 */
    soft: string
    line: string
  }
  /** 版本选择页 */
  ver: {
    bg: string
    nextN: string
    nextH: string
    optN: string
    optS: string
    tower: string[]
    /** 工坊新增大版本时自带的图标，键 = 大版本号（'0' / '3' …） */
    majorIcons?: Record<string, string>
    /** 小版本容器底板（按 alpha 裁到实体） */
    titlePanelN: string
    titlePanelH: string
    picFrame: string
    pinkH: string
    /** 版本大图底边文案条 `tuning_txtbg04`（两头渐隐 → 九宫格只拉中间） */
    descBand: string
    /** 版本大图底边装饰 `tuning_txtbg03`（横线 + 中心对称花饰） */
    descOrn: string
    /** 版本号角标容器 `tuning_txtbg01` */
    verTag: string
    /** 版本号 → 版本缩略图 */
    cards: Record<string, string>
    /** 版本号 → 版本大图 */
    bigCards: Record<string, string>
    /** 兜底：版本缩略图损坏 / 新版本还没配卡时用 */
    cardDefault?: string | null
    /** 兜底：版本大图损坏 / 新版本还没配卡时用 */
    bigDefault?: string | null
    /** 版本元数据。来源 `素材/信息表/版本表.csv`，由更新程序维护。版本页的版本列表、大版本分组、介绍文案全读这里 */
    versions?: VersionMeta[]
  }
  /** 十连「恭喜获得」弹窗 */
  reward: {
    /** `T_UI_common_section_start_n_08` 200×200 段首饰件 */
    section: string
    /** `T_UI_reward_bg_rewardword_02` 640×260 标题底光 */
    word: string
    /** `T_UI_common_img_arrow_n` 31×39 翻页箭头 */
    arrow: string
    /** 3★ 卡底（蓝）/ 4★ 及静谧水滴（紫）/ 5★ 及澎湃浪花（金） */
    item3: string
    item4: string
    item5: string
    /** `T_UI_dresup_bg_details` 612×288 卡片条底 */
    strip: string
    /** `T_UI_configure_img_skillsuit_lline_n` 173×13 底部进度条 */
    bar: string
    /** `T_UI_resonance_btn_long_details_h` 624×100 金线（高亮态） */
    lineH: string
  }
  /** 玄学运势（书桌场景 + 卷轴弹窗）：纸面 1668×976 @(105,46)、轴杆高 824，素材已裁到 alpha 实体框 */
  almanac: {
    /** 页面主背景 1920×1080（做旧米色纹理，整图铺底） */
    bg: string
    /** 木质方桌 2048² → 实机 (-810,648) 1879×1089 */
    desk: string
    /** 返回键（常态 / 悬停高亮态），实机 184×169 @(0,0) */
    backN: string
    backH: string
    /** 收纳桶 720×717 @(-197,439)，两种风格各 50% */
    basket: Record<SceneStyle, string>
    /** 四卷轴拆分图层（与桶同框叠放，供 hover 金光与 alpha 命中） */
    btn: Record<SceneStyle, Record<HitKey, string>>
    /** 墨台 329×329 @(348,770) op.7 */
    inkstand: Record<SceneStyle, string>
    /** 书写笔（跟随光标） */
    quill: Record<SceneStyle, string>
    /** 书签：背面（默认显示，绘「玄运」） / 正面（显示档位艺术字） */
    bookmarkBack: string
    bookmarkFront: string
    /** 三套纸面（按日期哈希 60/20/20）与配对轴杆 */
    paper: string[]
    axle: string[]
    /** 七档运势艺术字（缺「大凶」，运行时用「凶」+ 暗红滤镜兜底） */
    tier: Record<'great' | 'good' | 'minorGood' | 'neutral' | 'minorBad' | 'bad', string>
    /** 主界面标题艺术字「玄运」 */
    title: string
    /** 快速展开按钮（收起用 scaleX(-1)） */
    arrowN: string
  }
  /** 「辉煌心光」设置页 */
  gloria: {
    /** 背景视频 1920×1080 VP9（无声，26.7s 循环） */
    bg: string
    /** 视频海报帧（首帧解码前铺底） */
    poster: string
    backN: string
    backH: string
    closeN: string
    closeH: string
    /** 弹窗容器 */
    board: string
    /** 左上角名牌 */
    tab: string
    /** 二级确认条 */
    confirm: string
    /** 四个交互区（演出 / 音量 / 快捷 / 存档）：1920×1080 全画布叠图 `ic-*.webp`，不裁剪 */
    entry: {
      stage: string
      volume: string
      quick: string
      save: string
    }
  }
  museum: {
    /** 主界面背景 2732×1536 → 1920×1080 */
    bgWish: string
    bgYizan: string
    /** `T_UI_btn_common_back_h` 69×69 主界面返回键（高亮态，与烘焙图标等大重合） */
    btnBackH: string
    /** `T_UI_common_img_menu_s` 147×90 顶栏金色 menu 按钮 */
    btnMenu: string
    /** `T_UI_common_btn_close_02_n/h` 95×96 搜索弹窗退出键 */
    btnCloseN: string
    btnCloseH: string
    /** `T_UI_NTASK_bg_02` 1536×880 搜索弹窗背景 */
    searchBg: string
    /** `T_UI_NTASK_bg_task_06` 972×156 搜索框（顶部居中） */
    searchBar: string
    /** `T_UI_common_btn_search_02_n` 60×60 放大镜 */
    searchIcon: string
    /** `T_UI_common_next_btn` 60×60 搜索结果「跳转」按钮 */
    nextBtn: string
    /** 交互项拆分图（带 alpha） */
    split: Record<string, string>
    /** 服装图鉴子界面（M2） */
    clothes: {
      bg: string
      showTexture: string
      plog: string
      setItem: string
      btnWhite: string
      btnGray: string
      arrowN: string
      arrowH: string
      backN: string
      backH: string
      /** 5 属性色按键（甜美 / 典雅 / 清新 / 性感 / 帅气） */
      tag: Record<string, string>
      tagOn: string
      tagOff: string
      /** `T_UI_common_img_item_bg_empty` 160×160 部件选中/悬停高亮框 */
      itemEmpty: string
      /** 区域选项卡（心愿原野 / 伊赞之土） */
      regionTab: string
      /** 信息栏羊皮纸 */
      paper: string
      /** 花瓣装饰 */
      petals: string
      /** 立绘容器 `T_UI_Collage_free_02` */
      collage: string
      /** 五维雷达框 `T_UI_Collage_f_1` */
      radarFrame: string
      /** 装饰 `1793115502748_100.png`（服装界面-图片工程2 图层 1，opacity 0.3） */
      decor: string
      /** 立绘背景图 `T_showpic_bg_clothes.png`（与立绘容器等大；按套装星级调色） */
      showBg: string
    }
    /** 阅读物图鉴子界面（M3） */
    readings: {
      /** 区域背景（等比 0.75） */
      bgWish: string
      bgYizan: string
      /** 中央卷轴底（左缘放大镜/千纸鹤/蕾丝装饰在其上） */
      reelWish: string
      reelYizan: string
      /** 卷轴纸面（正文绘于此） */
      paperWish: string
      paperYizan: string
      /** 左侧列表栏面板 */
      tabWish: string
      tabYizan: string
      /** 列表选中高亮框（常态隐藏，选中/悬停显示） */
      tabSelN: string
      tabSelH: string
      /** 列表标签头（心愿原野 / 伊赞之土 各一版） + 标签阴影 */
      labelWish: string
      labelYizan: string
      labelShadow: string
      /** 列表条目分隔线 / 顶部横线（9-slice 非等比） */
      tabLine: string
      topLine: string
      /** 左缘放大镜装饰（两区域各一版） */
      magnifierWish: string
      magnifierYizan: string
      /** 右上千纸鹤（仅心愿原野）/ 左下横向飘带蕾丝（仅伊赞之土） */
      papercranes: string
      lace: string
      /** 右上枫叶（仅伊赞之土）/ 右下螺旋（仅伊赞之土） */
      maple: string
      spiral: string
      /** 未获取条目锁组件：挂锁 / 锁框 / U 型链环 / 链节横条 / 闪光锁（已获取备选） */
      lock01: string
      lock02: string
      lock03: string
      lockChain: string
      lock04: string
      /** 空态卡通形象 */
      emptySticker: string
      /** Q / E 键提示 */
      /** 提示条底板（地名条样式，用于「集齐套装可解锁」等提示） */
      placename: string
      keyQ: string
      keyE: string
      /** 随机彩蛋装饰库（各 10 张，刷新时随机取 1 张，opacity 0.25） */
      stickersWish: string[]
      stickersYizan: string[]
    }
  }
  suit: {
    /** 套装获得页背景整图 1920×1080（`素材/抽卡奖励界面/SysReward.png`） */
    bg: string
    frames: string[]
    light: string
    imgLight: string
    ornament: string[]
    /** 点珠圆环（徽章外围细弧） */
    orn3: string
    /** 套装获得页卡右上角的贴身纹样（与 orn3 是两张图） */
    ornClothes3: string
    /** 四芒星闪光（徽章顶饰 / 星级） */
    spark: string
    /** 黑底发光弧线，必须 screen 叠层 */
    glow1: string
    glow2: string
    glow3: string
    line: string[]
    board: string
    /** 套名底板 720×300 ×4：01 5★未全 / 02 4★已全 / 03 4★未全 / 04 5★已全 */
    boards: string[]
    /** 进度圆：bg/fullBg 盘面、step/full 高亮动效、slot 空槽、star 起始四角星 */
    sched: {
      fill: string
      step: string
      bg: string
      full: string
      fullBg: string
      slot: string
      star: string
    }
  }
}

export interface Manifest {
  generatedAt: string
  rules: RulesConfig
  currency: Record<string, CurrencyInfo>
  sfx: Record<string, string>
  /** bannerId → 该池专属「进入界面」音 */
  bannerEnter: Record<string, string>
  fonts: Record<string, string>
  ui: UiAssets
  /** 按界面分配的背景音。主页不在此表（无独立曲目）。一个场景给多首时按 `w` 加权随机，播完自动换下一首 */
  bgm?: Partial<Record<Exclude<BgmScene, 'home'>, BgmTrack[]>>
  /** 开机动画（5s，带音轨） */
  loginVideo: string | null
  video: {
    single: { normal: string; gold: string }
    ten: { normal: string; gold: string }
  } | null
  stars3: Star3Info[]
  banners: BannerInfo[]
}

/** 展开后的「部件」——抽卡的最小单位 */
export interface Part {
  /** 唯一 ID：`setId:部件名` */
  id: string
  setId: string
  setName: string
  /** 部件名（主键的一部分，来自图标文件名，可能是英文） */
  name: string
  /** 显示名：属性表中文名优先；图标是英文时单独提供，`name` 仍是存档主键 */
  displayName: string
  /** 部位，如「连衣裙」，从卡片图文件名前缀解析 */
  slot: string
  /** 3 | 4 | 5 */
  star: number
  /** 图标类型 */
  iconKind: 'flat' | 'photo'
  /** 256×256 图标 */
  icon: string
  /** 初始阶段的 520×724 卡片图 */
  card: string
  /** 各进化阶段的卡片图（阶段名 → 路径） */
  stageCards: Record<string, string>
  /** 该部件所属套装的立绘（用于结算展示） */
  portrait: string | null
  /** 部件 id（来自属性表，3★ 散件为空） */
  uid: string
  /** 五维数值 */
  stats: Record<string, number>
  /** 数值最高的两个维度 */
  top: string[]
  /** 部件文案 */
  desc: string
  /** 细分标签 */
  tags: Record<string, string | string[]>
}

/** 抽卡结果 */
export interface PullResult {
  rarity: 3 | 4 | 5
  part: Part
  isNew: boolean
  /** 该部件当前累计获得次数（含本次） */
  count: number
  /** 第几抽（用于十连展示） */
  index: number
}

/** 单池保底状态 */
export interface PityState {
  p5: number
  p4: number
  total: number
}
