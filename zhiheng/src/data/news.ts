// 信息中心：演示条目只围绕虚构发行人，不编造任何真实机构的新闻。
// 香港政策、利率与宏观类在未接入时只提供官方来源导航。

export type NewsCategory = 'hk-policy' | 'macro' | 'issuer' | 'credit';

export const NEWS_CATEGORY_LABEL: Record<NewsCategory, string> = {
  'hk-policy': '香港政策',
  macro: '利率与宏观',
  issuer: '发行人公告',
  credit: '信用事件',
};

export interface NewsItem {
  id: string;
  category: NewsCategory;
  title: string;
  source: string;
  publishedAt: string; // 原始发布时间
  fetchedAt: string; // 平台获取时间
  url: string | null;
  isDemo: boolean;
  /** 新闻本身陈述的事实 */
  facts: string[];
  /** 平台解读：与事实分开展示 */
  interpretation: string;
  /** 可能的传导路径 */
  channels: { asset: string; path: string }[];
  caveat: string;
  relatedBondId?: string;
}

export const DEMO_NEWS: NewsItem[] = [
  {
    id: 'demo-credit-1',
    category: 'credit',
    title: '示例置业集团公告：委任财务顾问，评估境外债务整体安排',
    source: '演示数据（虚构发行人）',
    publishedAt: '2026-09-27 21:05 HKT',
    fetchedAt: '2026-09-27 21:20 HKT',
    url: null,
    isDemo: true,
    facts: [
      '公司公告已委任财务顾问及法律顾问。',
      '公告称将评估境外债务的整体安排，未披露具体方案。',
      '公告未提及 2026 年 9 月 20 日到期票息是否已支付。',
    ],
    interpretation:
      '委任顾问通常是债务重组的前期步骤，但不等于已经违约。下一个需要核对的事实是票息宽限期内是否完成支付。',
    channels: [
      { asset: '示例置业 2027 美元债', path: '违约概率上升 → 信用利差扩大 → 价格下跌；最终取决于回收率。' },
      { asset: '同行业其他发行人', path: '市场重新评估行业再融资风险 → 利差可能联动扩大，但个体差异大。' },
    ],
    caveat: '价格变化往往同时受多重因素影响，不能把任何一次波动归因于单条新闻。',
    relatedBondId: 'demo-prop-2027',
  },
  {
    id: 'demo-rating-1',
    category: 'credit',
    title: '示例评级将示例共和国展望由“稳定”调整为“负面”，评级维持 BB-',
    source: '演示数据（虚构评级机构）',
    publishedAt: '2026-10-08 05:40 HKT',
    fetchedAt: '2026-10-08 06:10 HKT',
    url: null,
    isDemo: true,
    facts: ['长期外币评级维持 BB-。', '展望调整为负面，理由为财政赤字扩大与外汇储备下降。'],
    interpretation: '展望负面表示未来 12–24 个月内存在下调评级的可能，不代表已经下调。',
    channels: [
      { asset: '示例共和国美元主权债', path: '评级下调预期 → 部分投资者需按评级约束减持 → 利差可能扩大。' },
      { asset: '该国企业美元债', path: '企业评级通常受主权评级上限约束 → 可能间接受影响。' },
    ],
    caveat: '评级机构观点是对未来的判断，并非事实结论；不同机构可能给出不同评级。',
    relatedBondId: 'demo-sov-2034',
  },
  {
    id: 'demo-issuer-1',
    category: 'issuer',
    title: '示例能源控股发布 2026 年中期业绩：净负债上升，现金充足率维持',
    source: '演示数据（虚构发行人）',
    publishedAt: '2026-08-29 18:00 HKT',
    fetchedAt: '2026-08-29 18:30 HKT',
    url: null,
    isDemo: true,
    facts: ['期内净负债较年初上升。', '现金及等价物可覆盖未来 12 个月内到期债务。', '管理层表示会评估 2027 年到期前的再融资安排。'],
    interpretation:
      '短期偿债压力不大；若市场利率下降、发行人再融资成本降低，2027 年 6 月按 102 提前赎回的可能性上升，持有人收益应参考赎回收益率。',
    channels: [{ asset: '示例能源 2029 美元债', path: '再融资条件变化 → 提前赎回概率变化 → 实际持有期与收益变化。' }],
    caveat: '是否赎回由发行人决定，平台无法预测。',
    relatedBondId: 'demo-energy-2029',
  },
];

export interface OfficialSource {
  name: string;
  url: string;
  covers: string;
}

export const OFFICIAL_SOURCES: Record<NewsCategory, OfficialSource[]> = {
  'hk-policy': [
    { name: '香港入境事务处', url: 'https://www.immd.gov.hk', covers: '各类签证与入境计划、身份证办理' },
    { name: '香港人才服务窗口', url: 'https://www.hktalent.gov.hk', covers: '人才入境计划与落地支援' },
    { name: '香港税务局', url: 'https://www.ird.gov.hk', covers: '薪俸税、个人入息课税、税务居民身份' },
    { name: '强制性公积金计划管理局', url: 'https://www.mpfa.org.hk', covers: '强积金供款与提取规则' },
    { name: '香港政府一站通', url: 'https://www.gov.hk', covers: '教育、医疗、房屋等公共服务' },
  ],
  macro: [
    { name: '香港金融管理局', url: 'https://www.hkma.gov.hk', covers: '联系汇率、基本利率、银行业监管' },
    { name: '香港银行公会', url: 'https://www.hkab.org.hk', covers: 'HIBOR 定价' },
    { name: '美国联邦储备委员会 FOMC 日程', url: 'https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm', covers: '议息会议时间与声明' },
    { name: '美国财政部收益率数据', url: 'https://home.treasury.gov/resource-center/data-chart-center/interest-rates', covers: '美国国债每日收益率曲线' },
    { name: '国家外汇管理局', url: 'https://www.safe.gov.cn', covers: '个人购汇额度与跨境资金规定' },
  ],
  issuer: [
    { name: '香港交易所披露易', url: 'https://www.hkexnews.hk', covers: '在港上市发行人公告与债券上市文件' },
    { name: '新加坡交易所', url: 'https://www.sgx.com', covers: '在新加坡上市的美元债公告' },
    { name: '卢森堡证券交易所', url: 'https://www.luxse.com', covers: '大量新兴市场主权债的上市文件' },
  ],
  credit: [
    { name: 'S&P Global Ratings', url: 'https://www.spglobal.com/ratings', covers: '评级行动与评级定义' },
    { name: "Moody's Ratings", url: 'https://ratings.moodys.com', covers: '评级行动与评级定义' },
    { name: 'Fitch Ratings', url: 'https://www.fitchratings.com', covers: '评级行动与评级定义' },
  ],
};
