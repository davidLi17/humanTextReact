import { defineCatalog } from '@json-render/core';
import { schema } from '@json-render/react/schema';
import { z } from 'zod';

export const idSchema = z.string().min(1).max(160).regex(/^[A-Za-z0-9_.:-]+$/).refine(value => value !== 'prototype' && !Object.hasOwn(Object.prototype, value));
export const presentationIdSchema = z.string().min(1).max(160).refine(value => value !== 'prototype' && !Object.hasOwn(Object.prototype, value));
const label = z.string().min(1).max(200);
const text = z.string().max(8000);
const chartValue = z.number().finite().min(-1_000_000_000_000).max(1_000_000_000_000);
const chartSeries = z.object({ name: label, values: z.array(chartValue).min(1).max(60) }).strict();
/** These same strict schemas define the catalog, inferred types and trust-boundary checks. */
export const componentSchemas = {
  Card: z.object({ title: label.optional() }).strict(),
  Text: z.object({ text }).strict(),
  TreeInspector: z.object({ nodes: z.array(z.object({ id: presentationIdSchema, label, parentId: presentationIdSchema.nullable(), description: text.optional() }).strict()).min(1).max(100) }).strict(),
  ConceptTabs: z.object({ tabs: z.array(z.object({ id: presentationIdSchema, label, content: text }).strict()).min(1).max(12) }).strict(),
  CompareTable: z.object({ columns: z.array(z.object({ id: presentationIdSchema, label }).strict()).min(1).max(12), rows: z.array(z.object({ id: presentationIdSchema, cells: z.record(presentationIdSchema, z.string().max(2000)) }).strict()).min(1).max(200) }).strict(),
  StepViewer: z.object({ steps: z.array(z.object({ id: presentationIdSchema, title: label, description: text }).strict()).min(1).max(30) }).strict(),
  Chart: z.object({
    type: z.enum(['line', 'bar', 'pie']), title: label.optional(), xLabel: label.optional(), yLabel: label.optional(),
    categories: z.array(label).min(1).max(60), series: z.array(chartSeries).min(1).max(8),
  }).strict(),
};
export const explanationCatalog = defineCatalog(schema, {
  components: {
    Card: { props: componentSchemas.Card, slots: ['default'], description: 'A titled group of explanation elements.' },
    Text: { props: componentSchemas.Text, slots: [], description: 'Plain readable explanation text.' },
    TreeInspector: { props: componentSchemas.TreeInspector, slots: [], description: 'Explore a bounded hierarchy.' },
    ConceptTabs: { props: componentSchemas.ConceptTabs, slots: [], description: 'Switch between related concepts.' },
    CompareTable: { props: componentSchemas.CompareTable, slots: [], description: 'Compare items across named dimensions.' },
    StepViewer: { props: componentSchemas.StepViewer, slots: [], description: 'Move through a finite sequence.' },
    Chart: { props: componentSchemas.Chart, slots: [], description: 'Display a bounded line, bar, or pie chart using supplied numeric data only.' },
  },
  actions: {},
});

/** Canonical prompt material, generated from the same strict runtime props schemas. */
export const explanationComponentJsonSchemas = Object.fromEntries(
  Object.entries(componentSchemas).map(([name, props]) => [name, z.toJSONSchema(props)])
);
