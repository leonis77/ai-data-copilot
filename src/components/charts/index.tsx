"use client";

import ReactEChartsCore from "echarts-for-react/lib/core";
import * as echarts from "echarts/core";
import { PieChart as ECPieChart, BarChart as ECBarChart, LineChart as ECLineChart } from "echarts/charts";
import { GridComponent, TooltipComponent, LegendComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";

echarts.use([ECPieChart, ECBarChart, ECLineChart, GridComponent, TooltipComponent, LegendComponent, CanvasRenderer]);

interface ChartProps {
  title: string;
  data: { name: string; value: number }[];
  className?: string;
  height?: number;
}

const darkTheme = {
  textStyle: { color: "#94A3B8" },
  legend: { textStyle: { color: "#94A3B8" } },
};

export function PieChart({ title, data, className, height = 300 }: ChartProps) {
  const option = {
    ...darkTheme,
    tooltip: { trigger: "item", formatter: "{b}: {c} ({d}%)" },
    legend: { bottom: 0, textStyle: { color: "#94A3B8" } },
    series: [
      {
        type: "pie",
        radius: ["45%", "75%"],
        center: ["50%", "45%"],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 6,
          borderColor: "#0B0F17",
          borderWidth: 3,
        },
        label: { show: false },
        emphasis: {
          label: { show: true, fontWeight: "bold" },
          scaleSize: 10,
        },
        data: data.map((d) => ({
          name: d.name,
          value: d.value,
          itemStyle: {
            color:
              data.length <= 2
                ? d.name === data[0].name
                  ? new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                      { offset: 0, color: "#6366F1" },
                      { offset: 1, color: "#818CF8" },
                    ])
                  : new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                      { offset: 0, color: "#06B6D4" },
                      { offset: 1, color: "#22D3EE" },
                    ])
                : undefined,
          },
        })),
        color: ["#6366F1", "#A855F7", "#06B6D4", "#F59E0B", "#10B981", "#EF4444", "#8B5CF6", "#EC4899"],
      },
    ],
  };

  return (
    <div className={className}>
      <h3 className="text-sm font-medium text-white/60 mb-4">{title}</h3>
      <ReactEChartsCore echarts={echarts} option={option} style={{ height }} theme="dark" />
    </div>
  );
}

export function BarChart({ title, data, className, height = 300 }: ChartProps) {
  const option = {
    ...darkTheme,
    tooltip: { trigger: "axis" },
    grid: { left: "3%", right: "4%", bottom: "10%", top: "10%", containLabel: true },
    xAxis: {
      type: "category",
      data: data.map((d) => d.name),
      axisLine: { lineStyle: { color: "#1E293B" } },
      axisLabel: { color: "#94A3B8", fontSize: 11 },
    },
    yAxis: {
      type: "value",
      splitLine: { lineStyle: { color: "#1E293B" } },
      axisLabel: { color: "#94A3B8" },
    },
    series: [
      {
        type: "bar",
        data: data.map((d) => ({
          value: d.value,
          itemStyle: {
            borderRadius: [8, 8, 0, 0],
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: "#818CF8" },
              { offset: 1, color: "#6366F1" },
            ]),
          },
        })),
        barWidth: "60%",
      },
    ],
  };

  return (
    <div className={className}>
      <h3 className="text-sm font-medium text-white/60 mb-4">{title}</h3>
      <ReactEChartsCore echarts={echarts} option={option} style={{ height }} theme="dark" />
    </div>
  );
}

export function LineChart({ title, data, className, height = 300 }: ChartProps) {
  const option = {
    ...darkTheme,
    tooltip: { trigger: "axis" },
    grid: { left: "3%", right: "4%", bottom: "10%", top: "10%", containLabel: true },
    xAxis: {
      type: "category",
      data: data.map((d) => d.name),
      axisLine: { lineStyle: { color: "#1E293B" } },
      axisLabel: { color: "#94A3B8", fontSize: 11 },
    },
    yAxis: {
      type: "value",
      splitLine: { lineStyle: { color: "#1E293B" } },
      axisLabel: { color: "#94A3B8" },
    },
    series: [
      {
        type: "line",
        data: data.map((d) => d.value),
        smooth: true,
        symbol: "circle",
        symbolSize: 6,
        lineStyle: { color: "#6366F1", width: 2 },
        itemStyle: { color: "#6366F1" },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: "rgba(99, 102, 241, 0.3)" },
            { offset: 1, color: "rgba(99, 102, 241, 0.02)" },
          ]),
        },
      },
    ],
  };

  return (
    <div className={className}>
      <h3 className="text-sm font-medium text-white/60 mb-4">{title}</h3>
      <ReactEChartsCore echarts={echarts} option={option} style={{ height }} theme="dark" />
    </div>
  );
}
