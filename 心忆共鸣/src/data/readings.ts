/**
 * 阅读物图鉴的类型（数据在 `public/assets/data/readings.json`，运行时加载）。
 * 生成器：`python tools/gen-readings.py`（读 `<数据根>/阅读物/{心愿原野,伊赞之土}/[系列/]*.txt`）。
 */
export interface ReadingEntry {
  id: string        // 【编号】原值（全局唯一）
  region: 'wish' | 'yizan'
  series: string    // 系列子目录名
  title: string     // 书名（含《》）
  text: string      // 正文
}
