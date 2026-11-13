/**
 * 深海回响（界面里叫这个名字，不是「深海回响」）
 *
 * 实机是**横向曲线时间轴** + 左侧大圆环 + 节点（上标签下奖励卡）+ 右侧详情面板，
 * 不是网格。阈值随池型分三套：
 *   - 44 个纯 4★ 池：5 / 15 / 25
 *   - 32 个 5★+4★ 池：20 / 40 / … / 230
 *   - 1 个常驻池（遥远之海）：36 档，20 … 715
 * 同一档可能发多件奖励，所以这里按档位 group。
 */
import type { BannerInfo, MilestoneInfo } from '@/types'

/**
 * 里程碑奖励名的中文对照。
 *
 * 原始资源里 reward 是英文（`Flowing Spectrum Selectable` 之类），
 * 直接显示会跟整个中文界面打架。这里做一层映射，查不到的统一叫
 * 「深海回响礼盒」，至少不突兀。
 */
const REWARD_CN: Record<string, string> = {
  'Flowing Spectrum Selectable': '流光自选礼盒',
  'Blossoming Tales': '花间絮语',
  'Blooming Dreamtime': '梦绽时分',
  'Night Blossoms': '夜绽之花',
  "Ocean's Radiance Gift Box": '海辉礼盒',
  "Ocean's Radiance": '海辉',
  'Deepsea Resonance Gift Box': '深海回响礼盒',
  'Resonance Gift Box': '共鸣礼盒',
  'Echo of the Deep': '深海之回声',
  // 2.10「执律的流金」深海回响（「万金之上」为实机截图确认的官方译名）
  'Golden Law Light': '金律辉光',
  "Momo's Cloak Goldwrap": '摩摩的披风·金裹',
  'Above All Gold': '万金之上',
  'Heartshine Dust-Shrouded Crime': '心辉·尘封之罪',
  'Dustbound Heartchime Above All Gold': '尘缚心音·万金之上',
  "Ocean's Glowing Gift Box": '海辉赠礼盒',
}

/** 英文奖励名 → 中文；查不到就用通用名 */
export function rewardName(raw: string): string {
  if (!raw) return '深海回响礼盒'
  const hit = REWARD_CN[raw.trim()]
  if (hit) return hit
  // 已经是中文就直接用
  if (/[\u4e00-\u9fff]/.test(raw)) return raw
  return '深海回响礼盒'
}

export interface MilestoneView extends MilestoneInfo {
  claimed: boolean
  /** 是否已达成（总抽数 >= pulls） */
  reached: boolean
  /** 还差几抽 */
  remain: number
}

/** 一档（一个节点）下可能有多件奖励 */
export interface TierView {
  pulls: number
  rewards: MilestoneView[]
  reached: boolean
  /** 整档是否领过（按第一件的领取状态代表） */
  claimed: boolean
  /** 有可领的（达成但没领） */
  claimable: boolean
  remain: number
}

export function milestoneViews(
  banner: BannerInfo,
  totalPulls: number,
  claimedPulls: number[],
): MilestoneView[] {
  return banner.milestones.map((m) => ({
    ...m,
    reward: rewardName(m.reward),
    claimed: claimedPulls.includes(m.pulls),
    reached: totalPulls >= m.pulls,
    remain: Math.max(0, m.pulls - totalPulls),
  }))
}

/** 按档位分组后的节点列表（供横向时间轴渲染） */
export function tierViews(
  banner: BannerInfo,
  totalPulls: number,
  claimedPulls: number[],
): TierView[] {
  const views = milestoneViews(banner, totalPulls, claimedPulls)
  const byPulls = new Map<number, MilestoneView[]>()
  for (const v of views) {
    const list = byPulls.get(v.pulls)
    if (list) list.push(v)
    else byPulls.set(v.pulls, [v])
  }
  return [...byPulls.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([pulls, rewards]) => {
      const claimed = rewards.every((r) => r.claimed)
      const reached = rewards[0].reached
      return {
        pulls,
        rewards,
        reached,
        claimed,
        claimable: reached && !claimed,
        remain: rewards[0].remain,
      }
    })
}

/** 下一个未领取且已达成的节点 */
export function nextClaimable(
  banner: BannerInfo,
  totalPulls: number,
  claimedPulls: number[],
): TierView | null {
  return tierViews(banner, totalPulls, claimedPulls).find((t) => t.claimable) ?? null
}
