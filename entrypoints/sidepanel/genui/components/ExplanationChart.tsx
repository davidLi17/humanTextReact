import React, { useEffect, useMemo, useRef, useState } from "react";
import * as echarts from "echarts/core";
import { LineChart, BarChart, PieChart } from "echarts/charts";
import { GridComponent, LegendComponent, TooltipComponent } from "echarts/components";
import { SVGRenderer } from "echarts/renderers";
import type { z } from "zod";
import type { componentSchemas } from "@/entrypoints/shared/genui/catalog";

echarts.use([LineChart, BarChart, PieChart, GridComponent, LegendComponent, TooltipComponent, SVGRenderer]);

type ChartProps = z.infer<typeof componentSchemas.Chart>;
type Theme = "light" | "dark";

function getTheme(element: HTMLElement): Theme {
  return element.closest("[data-theme]")?.getAttribute("data-theme") === "dark" ? "dark" : "light";
}

function useTheme(element: React.RefObject<HTMLDivElement | null>) {
  const [theme, setTheme] = useState<Theme>("light");
  useEffect(() => {
    const host = element.current?.closest("[data-theme]");
    if (!host) return;
    const update = () => setTheme(getTheme(element.current!));
    update();
    const observer = new MutationObserver(update);
    observer.observe(host, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, [element]);
  return theme;
}

/** Local SVG chart with a deliberately small declarative data surface. */
export function ExplanationChart({ type, title, xLabel, yLabel, categories, series }: ChartProps) {
  const node = useRef<HTMLDivElement>(null);
  const chart = useRef<echarts.ECharts | null>(null);
  const theme = useTheme(node);
  const option = useMemo<echarts.EChartsCoreOption>(() => {
    const palette = theme === "dark" ? ["#a5b4fc", "#67e8f9", "#fbbf24", "#f9a8d4", "#86efac", "#c4b5fd"] : ["#4f46e5", "#0891b2", "#d97706", "#db2777", "#16a34a", "#7c3aed"];
    const textColor = theme === "dark" ? "#e4e4e7" : "#27272a";
    const axisColor = theme === "dark" ? "#71717a" : "#a1a1aa";
    const shared = {
      color: palette,
      textStyle: { color: textColor },
      tooltip: { trigger: type === "pie" ? "item" : "axis", confine: true, renderMode: "richText" },
      legend: { type: "scroll", bottom: 0, textStyle: { color: textColor } },
    };
    if (type === "pie") return {
      ...shared,
      series: [{
        type: "pie", name: series[0].name, radius: ["34%", "68%"], center: ["50%", "45%"],
        avoidLabelOverlap: true, label: { color: textColor, formatter: "{b}: {d}%" },
        data: categories.map((name, index) => ({ name, value: series[0].values[index] })),
      }],
    };
    return {
      ...shared,
      grid: { left: 8, right: 12, top: yLabel ? 28 : 12, bottom: xLabel ? 74 : 48, containLabel: true },
      xAxis: { type: "category", name: xLabel, nameLocation: "middle", nameGap: 32, nameTextStyle: { color: textColor, fontSize: 11 }, data: categories, axisLabel: { color: textColor, overflow: "truncate", width: 72 }, axisLine: { lineStyle: { color: axisColor } } },
      yAxis: { type: "value", name: yLabel, axisLabel: { color: textColor }, splitLine: { lineStyle: { color: axisColor, opacity: 0.28 } } },
      series: series.map(item => ({ type, name: item.name, data: item.values, smooth: type === "line", symbolSize: type === "line" ? 7 : undefined, emphasis: { focus: "series" } })),
    };
  }, [categories, series, theme, title, type, xLabel, yLabel]);

  useEffect(() => {
    if (!node.current) return;
    chart.current = echarts.init(node.current, undefined, { renderer: "svg" });
    const resize = () => chart.current?.resize();
    const observer = new ResizeObserver(resize);
    observer.observe(node.current);
    return () => { observer.disconnect(); chart.current?.dispose(); chart.current = null; };
  }, []);
  useEffect(() => { chart.current?.setOption(option, { replaceMerge: ["series"], lazyUpdate: true }); }, [option]);

  return <section className="genui-chart" aria-label={title ?? `${type} 图表`}>
    {title && <h4>{title}</h4>}
    <div className="genui-chart-canvas" ref={node} role="img" aria-label={`${title ?? type}，${series.map(item => item.name).join("、")}`} />
  </section>;
}
