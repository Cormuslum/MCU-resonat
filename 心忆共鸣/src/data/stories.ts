/**
 * 故事图鉴的类型（数据在 `public/assets/data/stories.json`，运行时加载）。
 * 生成器：`python tools/gen-stories.py`（读 `<数据根>/故事/*.md` + `pool-map.json`）。
 */
export interface StoryEntry {
  /** 稳定 id（= 套装名，唯一） */
  id: string
  /** pool-map 的套装 id（S0001…），用于「抽齐该套即解锁」判断 */
  setId: string
  setName: string
  star: number
  /** 大版本号：0 = 奇迹传说（0.x）/ 1 = 心愿原野（1.x）/ 2 = 伊赞之土（2.x）
   *  取**所属服装阁**的版本主号。 */
  major: number
  title: string
  text: string
}
