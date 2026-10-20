import { Link } from 'react-router-dom';
import { ResultLayout } from '../ResultLayout';

export function InsufficientResult({ question, reason, missing }: { question?: string; reason?: string; missing?: string[] }) {
  return (
    <ResultLayout
      topicLabel="资料不足"
      question={question}
      insufficient
      answerKind="fact"
      answer={<>资料不足，暂不能判断。{reason ?? '这个问题目前还没有可靠的计算方法，我们不会用猜测代替计算。'}</>}
      highlights={[]}
      chart={
        <div className="notice info">
          <p>知衡目前可以可靠计算三类问题：</p>
          <ul style={{ margin: 0 }}>
            <li><Link to="/analysis?topic=reserve">赴港需要准备多少钱、留多少备用金</Link></li>
            <li><Link to="/analysis?topic=coupon-yield">债券票息与实际收益的区别</Link></li>
            <li><Link to="/analysis?topic=rate-impact">利率或信用利差变化对债券价格的影响</Link></li>
          </ul>
        </div>
      }
      factors={[{ kind: 'fact', text: 'AI 解读服务尚未接入，问题分流采用关键词规则；规则无法确定时直接说明，而不是勉强给出答案。' }]}
      sources={[{ label: '问题分流规则', status: 'unconnected', statusLabel: 'AI 解读未接入', note: '你的问题没有发送到任何外部服务' }]}
      formulas={[]}
      assumptions={['无']}
      missing={missing ?? ['问题涉及的具体资产、金额、时间或家庭情况。', '与问题相关的可信数据来源。']}
      limits={['当前版本不提供个股、加密资产、房产估值或产品推荐。']}
      actions={
        <>
          <Link className="btn" to="/">换一种说法提问</Link>
          <Link className="btn secondary" to="/experts">整理问题，请真人解答</Link>
        </>
      }
    />
  );
}
