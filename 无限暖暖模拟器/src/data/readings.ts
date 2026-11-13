/**
 * 阅读物图鉴的**类型**（数据不在这里）。
 *
 * v2.1.00：正文从编译期数据改成运行时加载 `public/assets/data/readings.json`。
 * 以前 `tools/gen-readings.py` 直接生成这个 .ts，900KB 正文被编译进 JS ——
 * 发行版里没有 vite，工坊改完阅读物刷新页面也看不到变化。改成 JSON 后写盘即生效。
 *
 * 生成器：`python tools/gen-readings.py`（读 `<数据根>/阅读物/{心愿原野,伊赞之土}/[系列/]*.txt`）
 */
export interface ReadingEntry {
  id: string        // 【编号】原值（全局唯一）
  region: 'wish' | 'yizan'
  series: string    // 系列子目录名
  title: string     // 书名（含《》）
  text: string      // 正文
}
