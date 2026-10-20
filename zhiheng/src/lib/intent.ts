// 问题分流：基于关键词的确定性规则。AI 分析服务接入后，可由后端返回更准确的分类，
// 但关键数字始终由本地计算模块产生。

export type Topic = 'reserve' | 'coupon-yield' | 'rate-impact' | 'unknown';

const RULES: { topic: Topic; keywords: string[] }[] = [
  { topic: 'coupon-yield', keywords: ['票息', '收益率', '到期收益', 'ytm', 'coupon', '利息是不是', '赚多少', '回报'] },
  { topic: 'rate-impact', keywords: ['利率', '加息', '降息', '久期', 'duration', '美联储', '利差', '价格会'] },
  { topic: 'reserve', keywords: ['备用金', '赴港', '来港', '落地', '搬', '生活费', '留多少', '预算', '开支', '租房'] },
];

export function classifyQuestion(q: string): Topic {
  const text = q.toLowerCase();
  let best: Topic = 'unknown';
  let bestScore = 0;
  for (const rule of RULES) {
    const score = rule.keywords.filter((k) => text.includes(k)).length;
    if (score > bestScore) {
      best = rule.topic;
      bestScore = score;
    }
  }
  return best;
}

export const TOPIC_LABEL: Record<Topic, string> = {
  reserve: '香港落地资金与备用金',
  'coupon-yield': '票息与实际收益',
  'rate-impact': '利率变化对持仓的影响',
  unknown: '未能匹配到计算模板',
};

export const EXAMPLE_QUESTIONS = [
  '我们一家三口明年赴港，需要留多少备用金？',
  '一只债券票息 7.5%，是不是每年就能赚 7.5%？',
  '如果美国利率上升 1 个百分点，我持有的美元债会怎样？',
];
