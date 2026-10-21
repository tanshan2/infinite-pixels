import { useEffect, useMemo, useState } from 'react';
import { apiRequest, API_ENABLED } from '../api/client';
import type { DataEnvelope } from '../api/types';
import { PUBLIC_BONDS, type PublicBond, type TreasuryCurve } from '../data/publicBonds';
import { analyzeBond, stressTest, type Frequency } from '../lib/finance/bond';
import { StatusBadge } from './Badges';
import { pct, num } from '../lib/format';

export function PublicBondPanel(){
  const [catalog,setCatalog]=useState<DataEnvelope<PublicBond[]>>({status:'delayed',data:PUBLIC_BONDS,source:'发行人官方公开资料 · 本地核对目录',note:'逐条列明核对日期，不含市场报价。'});
  const [curve,setCurve]=useState<DataEnvelope<TreasuryCurve>|null>(null);
  const [id,setId]=useState(PUBLIC_BONDS[0].id),[price,setPrice]=useState(''),[frequency,setFrequency]=useState<Frequency>(2),[confirmed,setConfirmed]=useState(false);
  const [settlement,setSettlement]=useState(new Date().toISOString().slice(0,10));
  const [attempt,setAttempt]=useState(0);
  useEffect(()=>{let alive=true;
    if(!API_ENABLED){setCurve({status:'unconnected',data:null,source:'美国财政部',note:'启动同源后端并开启 API 后可读取官方每日利率。'});return;}
    apiRequest<DataEnvelope<PublicBond[]>>('/public-bonds').then(r=>{if(alive)setCatalog(r);}).catch(()=>{if(alive)setCatalog({status:'stale',data:PUBLIC_BONDS,source:'本地核对目录',note:'服务器未连接，保留本地目录，不提供实时价格。'});});
    setCurve(null);apiRequest<DataEnvelope<TreasuryCurve>>('/treasury-curve').then(r=>{if(alive)setCurve(r);}).catch(()=>{if(alive)setCurve({status:'missing',data:null,source:'美国财政部',note:'官方利率读取失败，请稍后重试。'});});
    return()=>{alive=false;};
  },[attempt]);
  const selected=catalog.data?.find(b=>b.id===id);
  const result=useMemo(()=>{if(!confirmed||!selected?.maturity||price===''||!Number.isFinite(Number(price))||Number(price)<=0||Number(price)>300)return null;
    try{return analyzeBond({couponRate:selected.couponRate,frequency,maturity:selected.maturity,structure:'fixed-bullet'},Number(price),settlement);}catch{return {supported:false as const,reason:'日期或条款无法用于当前模型，请重新核对。'};}
  },[confirmed,selected,price,frequency,settlement]);
  return <>
    <h1>公开债券资料与条件测算</h1>
    <p className="muted">免费官方来源，不需要数据商账号或 AI 密钥。真实条款、官方利率、用户输入价格分别标注。</p>
    <section className="panel" style={{marginBottom:24}}>
      <h2>美国国债每日收益率</h2>
      {curve?<><StatusBadge status={curve.status}/><p>{curve.note}</p>{curve.data&&<><p>数据日期：{curve.data.date} · 获取时间：{curve.fetchedAt} · <a href={curve.data.sourceUrl} target="_blank" rel="noreferrer">财政部原始数据 ↗</a></p><div className="table-wrap"><table className="data-table"><thead><tr>{curve.data.points.map(p=><th key={p.tenor}>{p.tenor}</th>)}</tr></thead><tbody><tr>{curve.data.points.map(p=><td key={p.tenor}>{pct(p.yield)}</td>)}</tr></tbody></table></div></> }<button className="btn secondary" onClick={()=>setAttempt(n=>n+1)}>刷新</button></>:<p role="status">读取官方利率…</p>}
    </section>
    <section className="panel" style={{marginBottom:24}}><h2>真实美元债资料目录</h2><StatusBadge status={catalog.status} label="公开资料 · 非行情"/><p>{catalog.note}</p>
      <div className="table-wrap"><table className="data-table"><thead><tr><th>发行人／债券</th><th>票息</th><th>到期日</th><th>市场价格</th><th>依据</th></tr></thead><tbody>{catalog.data?.map(b=><tr key={b.id}><td><button className="btn ghost" onClick={()=>{setId(b.id);setPrice('');setConfirmed(false);}}>{b.name}</button><span className="sub">{b.market} · {b.isin??'ISIN 尚未核实'}</span></td><td>{pct(b.couponRate)}</td><td>{b.maturity??`${b.maturityYear}年（具体日期待核实）`}</td><td>暂无公开报价</td><td><a href={b.sourceUrl} target="_blank" rel="noreferrer">官方来源 ↗</a><span className="sub">核对：{b.checkedOn}</span></td></tr>)}</tbody></table></div>
    </section>
    {selected&&<section className="panel"><h2>{selected.name} · 输入价格测算</h2><p>{selected.note}</p>
      {!selected.maturity?<p className="notice info">缺少完整到期日，暂不计算。不会用年份或发行价代替必要数据。</p>:<>
      <div className="form-grid"><div className="field"><label htmlFor="public-price">你输入的净价（每100面值，非平台报价）</label><input id="public-price" type="number" min="0.01" max="300" step="0.01" placeholder="请输入交易记录或自行核实的价格" value={price} onChange={e=>setPrice(e.target.value)}/></div>
      <div className="field"><label htmlFor="public-settlement">实际／假设结算日（不自动推算 T+2）</label><input id="public-settlement" type="date" value={settlement} onChange={e=>setSettlement(e.target.value)}/></div>
      <div className="field"><label htmlFor="public-frequency">假设付息频率</label><select id="public-frequency" value={frequency} onChange={e=>setFrequency(Number(e.target.value) as Frequency)}><option value="1">每年</option><option value="2">每半年</option><option value="4">每季度</option></select></div></div>
      <label style={{display:'flex',gap:10,margin:'20px 0'}}><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/>我理解这是按固定票息、到期一次还本及 30/360 假设进行的条件测算，尚未核实全部赎回及特殊条款。</label>
      {result&&(result.supported?<><div className="notice info">条件测算：到期收益率 {pct(result.ytm)} · 修正久期 {num(result.risk.modifiedDuration)} · 应计利息 {num(result.accrued)}／每100面值。</div><div className="table-wrap"><table className="data-table"><thead><tr><th>收益率变化</th><th>理论净价</th><th>全价变化</th></tr></thead><tbody>{stressTest(result.schedule.flows,frequency,result.ytm,result.accrued,[-100,0,100,200].map(rateBp=>({rateBp,spreadBp:0}))).map(s=><tr key={s.rateShiftBp}><td>{s.rateShiftBp}基点</td><td>{num(s.newCleanPrice)}</td><td>{pct(s.pctChange)}</td></tr>)}</tbody></table></div><p className="small muted">输入价格：{price}，用户自行提供；结算日 {settlement}。未计算最差收益率、违约概率、交易成本、税费或流动性折价，结果不是当前市场报价。</p></>:<p role="alert">{result.reason}</p>)}
      </>}
    </section>}
  </>;
}
