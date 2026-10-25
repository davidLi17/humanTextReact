import { describe, expect, test } from 'bun:test';
import { parseGeneratedUiEnvelope } from '../../entrypoints/shared/genui/parse';
import { validateExplanationSpec, recoverGeneratedExplanationSpec, normalizeGenUiAttachment, normalizeGenUiRequestIntent, normalizeGenUiSessions, MAX_GENUI_BYTES } from '../../entrypoints/shared/genui/profile';
import { GENUI_SYSTEM_PROMPT } from '../../entrypoints/shared/genui/prompt';
import { explanationCatalog, explanationComponentJsonSchemas } from '../../entrypoints/shared/genui/catalog';
import { buildHistoryPayload, type ChatSession } from '../../entrypoints/shared/chatTypes';
import { createBackupEnvelope, validateBackup } from '../../entrypoints/shared/dataBackup';
import { formatSessionAsMarkdown, formatSessionAsPlainText, formatSessionAsJson } from '../../entrypoints/shared/sessionExport';
const spec = () => ({ root: 'root', elements: { root: { type: 'Card' as const, props: { title: '概念' }, children: ['text'] }, text: { type: 'Text' as const, props: { text: '保留可读解释' }, children: [] } } });
const attachment = () => ({ id: 'ui-1', protocolVersion: 1, catalogVersion: 'explanation-v1', revision: 1, spec: spec(), sourceMessageIds: ['source-1'], contextFingerprint: 'fp:123' });
const envelope = () => ({ version: 1, fallbackText: '完整文字解释', spec: spec() });
const session = (ui: unknown = attachment()): ChatSession => ({ id: 's1', title: '示例', createdAt: 1, updatedAt: 1, messages: [{ id: 'a1', role: 'assistant', content: '完整文字解释', genUi: ui as any, createdAt: 1 }] });

describe('usable final model components', () => {
  test('defaults optional fields, projects known props and normalizes presentation IDs', () => {
    const result = recoverGeneratedExplanationSpec({root:'根 卡片',elements:{
      '根 卡片':{type:'Card',props:{title:null,className:'ignored'},children:['steps']},
      steps:{type:'StepViewer',props:{steps:[{id:'s1',title:'开始',extra:true}]},children:null},
    }});
    expect(result.spec.root).toBe('generated-0');
    expect(result.spec.elements['generated-0'].props).toEqual({});
    expect(result.spec.elements.steps.props).toEqual({steps:[{id:'s1',title:'开始',description:''}]});
    expect(normalizeGenUiAttachment({...attachment(),spec:result.spec})).toBeDefined();
  });
  test('isolates malformed chart and graph edges, retains independent legal components through restore', () => {
    const result = recoverGeneratedExplanationSpec({root:'root',elements:{
      root:{type:'Card',props:{},children:['text','chart','missing','root','text']},
      text:{type:'Text',props:{text:'可用内容'}},
      orphan:{type:'ConceptTabs',props:{tabs:[{id:'a',label:'概念',content:'独立内容'}]}},
      chart:{type:'Chart',props:{type:'bar',categories:['甲','乙'],series:[{name:'数据',values:[7]}]}},
    }});
    expect(result.spec.elements.root.children).toEqual(['text','chart','orphan']);
    expect(result.spec.elements.chart).toMatchObject({props:{categories:['甲'],series:[{name:'数据',values:[7]}]}});
    expect(result.warnings.join('；')).toContain('组件引用已省略');
    expect(normalizeGenUiAttachment({...attachment(),spec:result.spec})?.spec).toEqual(result.spec);
  });
  test('skips broken items, tree branches and table cells without losing usable siblings', () => {
    const result = recoverGeneratedExplanationSpec({root:'卡片 key',elements:{
      '卡片 key':{type:'Card',children:['steps','tree','table']},
      steps:{type:'StepViewer',props:{steps:[{id:'步骤 一',title:'可读步骤',description:'保留'},null,{id:'bad'}]}},
      tree:{type:'TreeInspector',props:{nodes:[{id:'根',label:'根',parentId:null},{id:'子',label:'子',parentId:'根'},{id:'bad',label:'坏引用',parentId:'missing'}]}},
      table:{type:'CompareTable',props:{columns:[{id:'列 一',label:'列'}],rows:[{id:'行 一',cells:{'列 一':'内容',extra:'忽略'}},{id:'行 二',cells:{}}]}},
    }});
    expect(result.spec.elements.steps.props).toEqual({steps:[{id:'步骤 一',title:'可读步骤',description:'保留'}]});
    expect(result.spec.elements.tree.props).toMatchObject({nodes:[{id:'根'},{id:'子'}]});
    expect(result.spec.elements.table.props).toMatchObject({rows:[{id:'行 一',cells:{'列 一':'内容'}},{id:'行 二',cells:{'列 一':''}}]});
    expect(normalizeGenUiAttachment({...attachment(),spec:result.spec})).toBeDefined();
  });
  test('keeps the data-only boundary and rejects unsafe JSON even when a valid sibling exists', () => {
    const result = recoverGeneratedExplanationSpec({root:'root',elements:{
      root:{type:'Card',props:{},children:['text','script']},
      text:{type:'Text',props:{text:'纯文字',dangerouslySetInnerHTML:{__html:'<script>fetch()</script>'}},on:{click:'fetch'}},
      script:{type:'iframe',props:{src:'https://example.com'}},
    }});
    expect(result.spec.elements.text).toEqual({type:'Text',props:{text:'纯文字'},children:[]});
    expect(result.spec.elements.script).toBeUndefined();
    expect(()=>recoverGeneratedExplanationSpec(JSON.parse('{"root":"text","elements":{"text":{"type":"Text","props":{"text":"ok","__proto__":{}}}}}'))).toThrow();
  });
});

describe('strict explanation protocol', () => {
  test('real catalog and strict JSON return rebuilt safe objects', () => {
    expect(explanationCatalog).toBeDefined();
    const raw = spec();
    const clean = validateExplanationSpec(raw);
    expect(clean).toEqual(raw);
    expect(clean.elements.root.props).not.toBe(raw.elements.root.props);
    expect(parseGeneratedUiEnvelope(JSON.stringify(envelope())).fallbackText).toBe('完整文字解释');
  });
  test('prompt uses canonical schemas and project-owned rules', () => {
    expect(GENUI_SYSTEM_PROMPT).toContain(JSON.stringify(explanationComponentJsonSchemas));
    expect(GENUI_SYSTEM_PROMPT).toContain('do not invent facts');
    expect(explanationComponentJsonSchemas.Text).toMatchObject({ additionalProperties: false });
  });
  test('rejects fences, patches, unknown envelope fields, missing fallback and multibyte oversize', () => {
    for (const raw of ['```json\n' + JSON.stringify(envelope()) + '\n```', '{}\n{}', JSON.stringify({ ...envelope(), actions: [] }), JSON.stringify({ ...envelope(), fallbackText: '' }), ' '.repeat(MAX_GENUI_BYTES + 1), JSON.stringify({ ...envelope(), fallbackText: '文'.repeat(30_000) })]) expect(() => parseGeneratedUiEnvelope(raw)).toThrow();
  });
  test('rejects arbitrary components, props, actions, bindings and raw HTML fields', () => {
    for (const element of [
      { type: 'iframe', props: { src: 'https://example.com' }, children: [] },
      { type: 'Text', props: { text: 'x', dangerouslySetInnerHTML: { __html: '<script>x</script>' } }, children: [] },
      { type: 'Text', props: { text: { $state: '/secret' } }, children: [] },
      { type: 'Text', props: { text: 'x' }, children: [], on: { click: 'fetch' } },
      { type: 'Text', props: { text: 'x' }, children: [], visible: true },
    ]) expect(() => validateExplanationSpec({ root: 'x', elements: { x: element } })).toThrow();
  });
  test('rejects prototype pollution, custom prototypes, getters, object cycles', () => {
    const polluted = JSON.parse('{"root":"x","elements":{"__proto__":{"type":"Text","props":{"text":"x"},"children":[]}}}');
    expect(() => validateExplanationSpec(polluted)).toThrow();
    const custom = Object.assign(Object.create({ inherited: true }), spec());
    expect(() => validateExplanationSpec(custom)).toThrow();
    let touched = false;
    const getter = Object.defineProperty({}, 'root', { enumerable: true, get() { touched = true; return 'root'; } });
    expect(() => validateExplanationSpec(getter)).toThrow(); expect(touched).toBe(false);
    const cycle: any = spec(); cycle.extra = cycle;
    expect(() => validateExplanationSpec(cycle)).toThrow();
  });
  test('rejects every inherited dictionary key as element or comparison cell id', () => {
    for (const key of Object.getOwnPropertyNames(Object.prototype)) {
      expect(() => validateExplanationSpec({ root: key, elements: { [key]: { type: 'Text', props: { text: 'text' }, children: [] } } })).toThrow();
      expect(() => validateExplanationSpec({ root: 't', elements: { t: { type: 'CompareTable', props: { columns: [{ id: key, label: 'A' }], rows: [{ id: 'r', cells: { [key]: 'text' } }] }, children: [] } } })).toThrow();
    }
  });
  test('rejects unknown refs, repeated parents, disconnected elements, cycles, excessive depth/count', () => {
    const dangling = spec(); dangling.elements.root.children.push('missing');
    const duplicate = spec(); duplicate.elements.root.children.push('text');
    const disconnected = spec(); disconnected.elements.root.children = [];
    const cyclic = spec(); cyclic.elements.root.children = ['root'];
    for (const value of [dangling, duplicate, disconnected, cyclic]) expect(() => validateExplanationSpec(value)).toThrow();
    for (const count of [9, 101]) {
      const elements = Object.fromEntries(Array.from({ length: count }, (_, i) => [`n${i}`, { type: 'Card', props: {}, children: i < count - 1 ? [`n${i + 1}`] : [] }]));
      expect(() => validateExplanationSpec({ root: 'n0', elements })).toThrow();
    }
  });
  test('validates tree identities, parent graphs and table column integrity', () => {
    const tree = (nodes: unknown[]) => ({ root: 'x', elements: { x: { type: 'TreeInspector', props: { nodes }, children: [] } } });
    expect(() => validateExplanationSpec(tree([{ id: 'a', label: 'A', parentId: null }, { id: 'b', label: 'B', parentId: 'a' }]))).not.toThrow();
    for (const nodes of [
      [{ id: 'a', label: 'A', parentId: null }, { id: 'a', label: 'A', parentId: null }],
      [{ id: 'a', label: 'A', parentId: null }, { id: 'b', label: 'B', parentId: 'missing' }],
      [{ id: 'a', label: 'A', parentId: null }, { id: 'b', label: 'B', parentId: 'b' }],
    ]) expect(() => validateExplanationSpec(tree(nodes))).toThrow();
    expect(() => validateExplanationSpec({ root: 't', elements: { t: { type: 'CompareTable', props: { columns: [{ id: 'a', label: 'A' }], rows: [{ id: 'r', cells: { b: 'wrong column' } }] }, children: [] } } })).toThrow();
  });
  test('accepts bounded chart data and rejects shape mismatches', () => {
    const chart = { root: 'chart', elements: { chart: { type: 'Chart', props: { type: 'line', title: '本周趋势', categories: ['周一', '周二'], series: [{ name: '访问量', values: [12, 18] }] }, children: [] } } };
    expect(() => validateExplanationSpec(chart)).not.toThrow();
    const wrongLength = structuredClone(chart); wrongLength.elements.chart.props.series[0].values = [12];
    const manyPieSeries = structuredClone(chart); manyPieSeries.elements.chart.props.type = 'pie'; manyPieSeries.elements.chart.props.series.push({ name: '备用', values: [1, 2] });
    const negativePie = structuredClone(chart); negativePie.elements.chart.props.type = 'pie'; negativePie.elements.chart.props.series[0].values = [12, -1];
    expect(() => validateExplanationSpec(wrongLength)).toThrow();
    expect(() => validateExplanationSpec(manyPieSeries)).toThrow();
    expect(() => validateExplanationSpec(negativePie)).toThrow();
  });
});

describe('attachment storage and text compatibility', () => {
  test('validates revision, versions, provenance, unknown metadata and view state', () => {
    expect(normalizeGenUiAttachment(attachment())).toBeDefined();
    for (const extra of [{ revision: 0 }, { revision: 1.5 }, { protocolVersion: 2 }, { catalogVersion: 'custom' }, { sourceMessageIds: [] }, { contextFingerprint: '' }, { arbitrary: true }, { viewState: { missing: {} } }, { viewState: { text: { step: 0 } } }]) expect(normalizeGenUiAttachment({ ...attachment(), ...extra })).toBeUndefined();
    const tab = { ...attachment(), spec: { root: 'tabs', elements: { tabs: { type: 'ConceptTabs', props: { tabs: [{ id: 'a', label: 'A', content: '内容' }] }, children: [] } } }, viewState: { tabs: { activeTabId: 'a' } } };
    expect(normalizeGenUiAttachment(tab)?.viewState?.tabs.activeTabId).toBe('a');
    tab.viewState.tabs.activeTabId = 'bad'; expect(normalizeGenUiAttachment(tab)).toBeUndefined();
  });
  test('request intent is strict and applies only to user messages', () => {
    const intent = { version: 1 as const, sourceMessageIds: ['source-1'], contextFingerprint: 'fp:123' };
    expect(normalizeGenUiRequestIntent(intent)).toEqual(intent);
    expect(normalizeGenUiRequestIntent({ ...intent, code: 'run' })).toBeUndefined();
    const value = session(); value.messages[0].genUiRequest = intent as any;
    expect(normalizeGenUiSessions([value])[0].messages[0].genUiRequest).toBeUndefined();
    value.messages[0].role = 'user';
    expect(normalizeGenUiSessions([value])[0].messages[0].genUiRequest).toBeUndefined();
    value.messages.push({ id: 'source-1', role: 'assistant', content: 'source', createdAt: 0 });
    expect(normalizeGenUiSessions([value])[0].messages[0].genUiRequest).toEqual(intent);
  });
  test('ordinary payloads and readable exports exclude specs and local state', () => {
    const value = session();
    expect(buildHistoryPayload(value.messages)).toEqual([{ role: 'assistant', content: '完整文字解释' }]);
    for (const text of [formatSessionAsMarkdown(value), formatSessionAsPlainText(value)]) {
      expect(text).toContain('完整文字解释'); expect(text).not.toContain('contextFingerprint'); expect(text).not.toContain('explanation-v1');
    }
    value.messages[0].genUi = normalizeGenUiAttachment({ ...attachment(), fallbackText: '第二步：进入组件目录。' })!;
    expect(normalizeGenUiAttachment(value.messages[0].genUi)?.fallbackText).toBe('第二步：进入组件目录。');
    expect(buildHistoryPayload(value.messages)[0].content).toBe('完整文字解释\n\n第二步：进入组件目录。');
    expect(formatSessionAsMarkdown(value)).toContain('第二步：进入组件目录。');
    expect(JSON.parse(formatSessionAsJson(value)).messages[0].genUi.fallbackText).toBe('第二步：进入组件目录。');
    value.messages[0].content = '第二步：进入组件目录。';
    expect(buildHistoryPayload(value.messages)[0].content).toBe('第二步：进入组件目录。');
  });
  test('JSON export retains valid structured UI and drops malicious attachments', () => {
    expect(JSON.parse(formatSessionAsJson(session())).messages[0].genUi).toEqual(attachment());
    const bad = JSON.parse(formatSessionAsJson(session({ ...attachment(), code: 'run' })));
    expect(bad.messages[0].genUi).toBeUndefined();
    expect(bad.messages[0].content).toBe('完整文字解释');
  });
  test('backup export/import drops unsafe UI but keeps text and valid UI', () => {
    const backup = createBackupEnvelope({ sessions: { sessions: [session(), session({ ...attachment(), spec: { bad: true } })], activeSessionId: 's1' } });
    expect(backup.data.sessions.sessions[0].messages[0].genUi).toBeDefined();
    expect(backup.data.sessions.sessions[1].messages[0].genUi).toBeUndefined();
    const malicious = JSON.parse(JSON.stringify(backup));
    malicious.data.sessions.sessions[0].messages[0].genUi.viewState = { root: { onClick: 'evil' } };
    const result = validateBackup(malicious);
    expect(result.valid).toBe(true);
    expect(result.backup?.data.sessions.sessions[0].messages[0].content).toBe('完整文字解释');
    expect(result.backup?.data.sessions.sessions[0].messages[0].genUi).toBeUndefined();
  });
  test('enforces aggregate storage cap without dropping fallback messages', () => {
    const large = { ...attachment(), viewState: { root: {} } }; large.spec.elements.text.props.text = 'x'.repeat(8000);
    const messages = Array.from({ length: 160 }, (_, i) => ({ ...session(large).messages[0], id: `a${i}`, createdAt: i }));
    const clean = normalizeGenUiSessions([{ ...session(), messages }])[0];
    expect(clean.messages.length).toBe(160);
    expect(clean.messages.filter(message => message.genUi).length).toBeLessThan(160);
    expect(clean.messages.every(message => message.content === '完整文字解释')).toBe(true);
    expect(clean.messages[0].genUi).toBeUndefined();
    expect(clean.messages.at(-1)?.genUi).toBeDefined();
    expect(clean.messages.every(message => !message.genUi?.viewState)).toBe(true);
  });
  test('drops transient streaming previews during session normalization', () => {
    const value = session();
    (value.messages[0] as any).genUiPreview = attachment();
    (value.messages[0] as any).genUiPending = true;
    const clean = normalizeGenUiSessions([value])[0].messages[0];
    expect(clean.genUi).toBeDefined();
    expect((clean as any).genUiPreview).toBeUndefined();
    expect((clean as any).genUiPending).toBeUndefined();
  });
});
