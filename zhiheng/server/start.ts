import { createApp } from './app';
const server=createApp({origin:process.env.APP_ORIGIN,intentDir:process.env.CONSULT_INTENT_DIR,sampleBonds:process.env.BOND_SAMPLE_MODE==='true',bondUrl:process.env.BOND_DATA_URL,bondToken:process.env.BOND_DATA_TOKEN,anthropicKey:process.env.ANTHROPIC_API_KEY,anthropicModel:process.env.ANTHROPIC_MODEL});
server.requestTimeout=15_000;server.headersTimeout=10_000;
server.listen(Number(process.env.PORT??8787),process.env.HOST??'127.0.0.1',()=>console.log('知衡 API 已启动；不记录请求正文。'));
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.close(()=>process.exit(0)));
