/**
 * 故事图鉴的**类型**（数据不在这里）。
 *
 * v2.1.00：正文从编译期数据改成运行时加载 `public/assets/data/stories.json`。
 * 以前 `tools/gen-stories.py` 直接生成这个 .ts，700KB 正文被编译进 JS ——
 * 发行版里没有 vite，工坊改完故事刷新页面也看不到变化。改成 JSON 后写盘即生效，
 * 构建体积也少了一整块（首屏 chunk 更小）。
 *
 * 生成器：`python tools/gen-stories.py`（读 `<数据根>/故事/*.md` + `pool-map.json`）
 */
export interface StoryEntry {
  /** 稳定 id（= 套装名，唯一） */
  id: string
  /** pool-map 的套装 id（S0001…），用于「抽齐该套即解锁」判断 */
  setId: string
  setName: string
  star: number
  /** 大版本号：0 = 奇迹传说（0.x）/ 1 = 心愿原野（1.x）/ 2 = 伊赞之土（2.x）
   *  取**所属服装阁**的版本主号 —— 0.x 的阁会借调官方旧版本的套装，
   *  按套装首发版本归区会把它们散到别的分区去。 */
  major: number
  title: string
  text: string
}
