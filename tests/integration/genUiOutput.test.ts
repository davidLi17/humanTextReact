import { afterEach, beforeEach, expect, test } from 'bun:test';
import { GenUiOutputBuffer, GENUI_FAILURE_TEXT, GENUI_ATTACHMENT_BYTE_LIMIT, isVerifiedGenUiSender, validateGenUiRequest } from '../../entrypoints/background/genUiOutput';
import { TranslationService } from '../../entrypoints/background/translationService';
import { MessageHandler } from '../../entrypoints/background/messageHandler';
import { MessageUtils } from '../../entrypoints/background/messageUtils';
import { RequestManager } from '../../entrypoints/background/requestManager';
import { HistoryManager } from '../../entrypoints/background/historyManager';
import { SettingsUtils } from '../../entrypoints/shared/settingsUtils';
import { createSidepanelTarget } from '../../entrypoints/shared/requestProtocol';
import { jsonByteLength, normalizeGenUiAttachment } from '../../entrypoints/shared/genui/profile';
import { parseGeneratedUiEnvelope } from '../../entrypoints/shared/genui/parse';
import { GENUI_SYSTEM_PROMPT } from '../../entrypoints/shared/genui/prompt';
import { setRequestTimeoutRuntimeForTests } from '../../entrypoints/shared/requestTimeout';
import { MESSAGE_TYPES } from '../../entrypoints/shared/constants';

const meta = {sourceMessageIds:['source-1'], contextFingerprint:'fingerprint-1', assistantMessageId:'assistant-1'};
const envelope = {version:1, fallbackText:'安全的文字解释', spec:{root:'root',elements:{root:{type:'Card',props:{title:'概念'},children:[]}}}};
const raw = JSON.stringify(envelope);
const frame = (content: string, finish_reason: string | null = null, reasoning_content = '') => `data: ${JSON.stringify({choices:[{delta:{content,reasoning_content},finish_reason}]})}\n\n`;
const originals = {fetch:globalThis.fetch, settings:SettingsUtils.getSettings, send:MessageUtils.sendRuntimeMessage, history:HistoryManager.saveTranslationHistory};
let updates: any[];
let histories: any[][];
let body: any;
let sequence = 0;
let requestIds: string[];
beforeEach(() => {
  updates=[]; histories=[]; requestIds=[];
  SettingsUtils.getSettings = async () => ({apiKey:'mock-key',baseUrl:'https://example.invalid/chat',model:'test',prismModeEnabled:true} as any);
  MessageUtils.sendRuntimeMessage = async message => {updates.push(message); return true;};
  HistoryManager.saveTranslationHistory = async (...args:any[]) => {histories.push(args);};
});
afterEach(() => {
  globalThis.fetch=originals.fetch;
  SettingsUtils.getSettings=originals.settings;
  MessageUtils.sendRuntimeMessage=originals.send;
  HistoryManager.saveTranslationHistory=originals.history;
  requestIds.forEach(id=>RequestManager.cleanupRequest(id));
  setRequestTimeoutRuntimeForTests();
});
function context() {
  const id=`genui-test-${++sequence}`;requestIds.push(id);
  RequestManager.createRequest(id,createSidepanelTarget('session'));
  return RequestManager.claimRequest(id)!;
}
function mockStream(sse:string) {
  globalThis.fetch=(async (_url: unknown,options?: RequestInit) => {
    body=JSON.parse(String(options?.body));
    return new Response(sse,{status:200});
  }) as unknown as typeof fetch;
}
const params = {text:'测试', responseMode:'genui-v1' as const, genUiRequest:meta, prismMode:true, messages:[{role:'system' as const,content:'untrusted prompt'},{role:'user' as const,content:'测试'}]};

test('GenUI emits only complete validated fallback and host metadata, never reasoning/JSON', async()=>{
  mockStream(frame(raw.slice(0,20))+frame(raw.slice(20),'stop','private reasoning')+'data: [DONE]\n\n');
  expect(await TranslationService.translateText(params,context())).toBe(envelope.fallbackText);
  expect(body.messages[0]).toEqual({role:'system',content:GENUI_SYSTEM_PROMPT});
  expect(body.messages.filter((m:any)=>m.role==='system')).toHaveLength(1);
  expect(updates).toHaveLength(1);
  expect(updates[0]).toMatchObject({content:envelope.fallbackText,reasoningContent:'',done:true,assistantMessageId:meta.assistantMessageId,sessionId:'session',genUi:{protocolVersion:1,catalogVersion:'explanation-v1',revision:1,sourceMessageIds:meta.sourceMessageIds,contextFingerprint:meta.contextFingerprint}});
  expect(histories[0][1]).toBe(envelope.fallbackText);
  expect(JSON.stringify(updates)).not.toContain('private reasoning');
  expect(histories[0][2]).toBe('');
});
for(const [name,sse] of [
  ['interrupted valid JSON',frame(raw)],
  ['truncated valid JSON',frame(raw,'length')+'data: [DONE]\n\n'],
  ['filtered response',frame(raw,'content_filter')+'data: [DONE]\n\n'],
  ['invalid envelope',frame('{"version":1,"secret":"private raw"}','stop')],
  ['overflow',frame('汉'.repeat(22000),'stop')],
  ['malformed SSE','data: {private raw\n\ndata: [DONE]\n\n'],
] as const) test(`GenUI rejects ${name} without leaking or saving`,async()=>{
  mockStream(sse);
  await expect(TranslationService.translateText(params,context())).rejects.toThrow(GENUI_FAILURE_TEXT);
  expect(updates).toHaveLength(1);
  expect(updates[0]).toMatchObject({error:GENUI_FAILURE_TEXT,done:true});
  expect(updates[0].content).toBeUndefined();
  expect(updates[0].genUi).toBeUndefined();
  expect(histories).toHaveLength(0);
});

test('GenUI accepts DONE-only normal completion and stop+EOF',async()=>{
  for(const suffix of ['data: [DONE]\n\n',frame('','stop')]) {
    mockStream(frame(raw)+suffix);
    expect(await TranslationService.translateText(params,context())).toBe(envelope.fallbackText);
  }
});

test('GenUI cancelled after complete JSON but before termination never delivers',async()=>{
  let resolveRead!:()=>void;
  const waiting=new Promise<void>(resolve=>{resolveRead=resolve;});
  const ctx=context();
  globalThis.fetch=(async()=>new Response(new ReadableStream({start(controller){controller.enqueue(new TextEncoder().encode(frame(raw)));resolveRead();}}))) as unknown as typeof fetch;
  const pending=TranslationService.translateText(params,ctx);
  await waiting; await new Promise(resolve=>setTimeout(resolve,0));
  RequestManager.cleanupRequest(ctx.requestId);
  await pending;
  expect(updates).toHaveLength(0);expect(histories).toHaveLength(0);
});

test('GenUI timeout keeps private partial JSON out of update',async()=>{
  setRequestTimeoutRuntimeForTests({policy:{fetchHeadersMs:100,firstOutputMs:100,thinkingFirstOutputMs:100,idleMs:5,totalMs:100,errorBodyMs:100,connectionTestMs:100,keepAliveIntervalMs:100},clock:{setTimeout,clearTimeout}});
  globalThis.fetch=(async()=>new Response(new ReadableStream({start(controller){controller.enqueue(new TextEncoder().encode(frame(raw)));}}))) as unknown as typeof fetch;
  await expect(TranslationService.translateText(params,context())).rejects.toThrow(GENUI_FAILURE_TEXT);
  expect(updates[0].error).toBe(GENUI_FAILURE_TEXT);expect(updates[0].genUi).toBeUndefined();expect(histories).toHaveLength(0);
});

test('GenUI buffer counts UTF-8 bytes and copies only validated source metadata',()=>{
  const buffer=new GenUiOutputBuffer();buffer.append('汉'.repeat(21845));
  expect(()=>buffer.append('汉')).toThrow(GENUI_FAILURE_TEXT);
  const copied=validateGenUiRequest(meta);expect(copied).toEqual(meta);expect(copied.sourceMessageIds).not.toBe(meta.sourceMessageIds);
  for(const invalid of [{...meta,sourceMessageIds:[]},{...meta,sourceMessageIds:['x','x']},{...meta,assistantMessageId:''}, {...meta,contextFingerprint:'x'.repeat(257)}]) expect(()=>validateGenUiRequest(invalid)).toThrow();
});

test('GenUI trusted sender requires own sidepanel URL, id, session and rejects tab spoofing',()=>{
  const runtime={id:'own-id',getURL:(path:string)=>`chrome-extension://own-id/${path}`};
  const sender={id:'own-id',url:runtime.getURL('sidepanel.html')};
  const request={source:'sidepanel',targetKind:'sidepanel',sessionId:'session'};
  expect(isVerifiedGenUiSender(request,sender,runtime)).toBe(true);
  expect(isVerifiedGenUiSender(request,{...sender,tab:{url:runtime.getURL('sidepanel.html')}},runtime)).toBe(true);
  expect(isVerifiedGenUiSender(request,{...sender,tab:{url:'https://evil.test/sidepanel.html'}},runtime)).toBe(false);
  expect(isVerifiedGenUiSender(request,{...sender,url:'https://evil.test/sidepanel.html',tab:{url:runtime.getURL('sidepanel.html')}},runtime)).toBe(false);
  for(const badSender of [{...sender,tab:{id:1}}, {...sender,id:'other'}, {...sender,url:'https://evil.test/sidepanel.html'}, {...sender,url:runtime.getURL('popup.html')}]) expect(isVerifiedGenUiSender(request,badSender,runtime)).toBe(false);
  expect(isVerifiedGenUiSender({...request,sessionId:''},sender,runtime)).toBe(false);
  expect(isVerifiedGenUiSender({...request,tabId:1},sender,runtime)).toBe(false);
});

test('message handler rejects unknown response modes before settings or provider call',async()=>{
  let called=false;SettingsUtils.getSettings=async()=>{called=true;throw Error('unexpected');};
  const response:any=await new Promise(resolve=>MessageHandler.handleRuntimeMessage({action:MESSAGE_TYPES.TRANSLATE,responseMode:'unrecognized'},{} as any,resolve));
  expect(response.success).toBe(false);expect(called).toBe(false);
});

test('replacement request cannot receive stale GenUI attachment',async()=>{
  let started!:()=>void;
  const waiting=new Promise<void>(resolve=>{started=resolve;});
  const old=context();
  globalThis.fetch=(async()=>new Response(new ReadableStream({start(controller){controller.enqueue(new TextEncoder().encode(frame(raw)));started();}}))) as unknown as typeof fetch;
  const pending=TranslationService.translateText(params,old);
  await waiting;await new Promise(resolve=>setTimeout(resolve,0));
  const replacement=context();
  await pending;
  expect(RequestManager.isActiveRequest(replacement.requestId)).toBe(true);
  expect(updates).toHaveLength(0);expect(histories).toHaveLength(0);
});

test('metadata is snapshotted before asynchronous model response',async()=>{
  const source={...meta,sourceMessageIds:['original-source']};
  globalThis.fetch=(async()=>{
    source.sourceMessageIds[0]='mutated-source';source.contextFingerprint='mutated-fingerprint';
    return new Response(frame(raw,'stop'));
  }) as unknown as typeof fetch;
  await TranslationService.translateText({...params,genUiRequest:source},context());
  expect(updates[0].genUi.sourceMessageIds).toEqual(['original-source']);
  expect(updates[0].genUi.contextFingerprint).toBe(meta.contextFingerprint);
});

test('provider error bodies cannot become raw GenUI error text',async()=>{
  globalThis.fetch=(async()=>new Response('private raw JSON',{status:400})) as unknown as typeof fetch;
  await expect(TranslationService.translateText(params,context())).rejects.toThrow(GENUI_FAILURE_TEXT);
  expect(JSON.stringify(updates)).not.toContain('private raw');
});


function largeValidEnvelope(targetBytes: number, measure: (value: any) => number = jsonByteLength) {
  const value: any = {version:1,fallbackText:'A readable fallback.',spec:{root:'root',elements:{root:{type:'Card',props:{title:'Large explanation'},children:[]}}}};
  for(let index=0;index<9;index++) {
    const id=`text-${index}`;
    value.spec.elements.root.children.push(id);
    value.spec.elements[id]={type:'Text',props:{text:''},children:[]};
  }
  let remaining=targetBytes-measure(value);
  for(let index=0;index<9 && remaining>0;index++) {
    const size=Math.min(8000,remaining);
    value.spec.elements[`text-${index}`].props.text='a'.repeat(size);
    remaining-=size;
  }
  expect(remaining).toBe(0);
  expect(measure(value)).toBe(targetBytes);
  return value;
}

test('valid 64,602-byte envelope with 100 source IDs fails safely before publishing or history',async()=>{
  const large=largeValidEnvelope(64_602);
  expect(parseGeneratedUiEnvelope(JSON.stringify(large)).version).toBe(1);
  const metadata={...meta,sourceMessageIds:Array.from({length:100},(_,index)=>`source-${index}-`.padEnd(160,'x'))};
  expect(validateGenUiRequest(metadata)).toEqual(metadata);
  mockStream(frame(JSON.stringify(large),'stop'));
  await expect(TranslationService.translateText({...params,genUiRequest:metadata},context())).rejects.toThrow(GENUI_FAILURE_TEXT);
  expect(updates).toHaveLength(1);
  expect(updates[0]).toMatchObject({error:GENUI_FAILURE_TEXT,done:true});
  expect(updates[0].genUi).toBeUndefined();expect(updates[0].content).toBeUndefined();
  expect(histories).toHaveLength(0);
});

test('assembled attachment succeeds at exact 60-KiB budget and fails one byte over',async()=>{
  const measure=(value:any)=>jsonByteLength({id:'0'.repeat(36),protocolVersion:1,catalogVersion:'explanation-v1',revision:1,spec:value.spec,sourceMessageIds:meta.sourceMessageIds,contextFingerprint:meta.contextFingerprint});
  for(const excess of [0,1]) {
    const large=largeValidEnvelope(GENUI_ATTACHMENT_BYTE_LIMIT+excess,measure);
    const encoded=JSON.stringify(large);
    expect(new TextEncoder().encode(encoded).byteLength).toBeLessThan(65_536);
    mockStream(frame(encoded,'stop'));
    if(excess) {
      await expect(TranslationService.translateText(params,context())).rejects.toThrow(GENUI_FAILURE_TEXT);
      expect(updates.at(-1).genUi).toBeUndefined();
      expect(histories).toHaveLength(1);
    } else {
      expect(await TranslationService.translateText(params,context())).toBe(large.fallbackText);
      expect(jsonByteLength(updates[0].genUi)).toBe(GENUI_ATTACHMENT_BYTE_LIMIT);
      expect(normalizeGenUiAttachment(updates[0].genUi)).toBeDefined();
      expect(histories).toHaveLength(1);
    }
  }
});

test('source IDs, fingerprint and assistant ID use the shared 160-char safe identifier grammar',()=>{
  expect(validateGenUiRequest({...meta,sourceMessageIds:['x'.repeat(160)],contextFingerprint:'f'.repeat(160),assistantMessageId:'a'.repeat(160)})).toBeDefined();
  for(const invalid of ['x'.repeat(161),'__proto__','constructor','prototype','white space','中文','']) {
    for(const candidate of [{...meta,sourceMessageIds:[invalid]},{...meta,contextFingerprint:invalid},{...meta,assistantMessageId:invalid}]) {
      expect(()=>validateGenUiRequest(candidate)).toThrow('交互解释请求参数无效');
    }
  }
});
