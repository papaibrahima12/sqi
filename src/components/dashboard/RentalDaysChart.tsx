"use client"

import React from "react";
import {
    Line, LineChart, CartesianGrid, Legend, ResponsiveContainer,
    Tooltip, XAxis, YAxis, Label, ReferenceLine
} from "recharts";

type TDailyData = { month: string; jours: number; };
type TResponsiveLineChartProps = { data: TDailyData[]; };

export const ResponsiveLineChart = ({ data }: TResponsiveLineChartProps) => {
    const tooltipStyle = { padding: "2px", fontSize: "10px" }

    return (
        <ResponsiveContainer className="w-full" height={335} >
            <LineChart
                className="w-full" height={200}
                data={data}
            >
                <CartesianGrid strokeDasharray="4,2"/>
                <XAxis
                    height={49} dataKey="month" style={{ fontSize: "12px" }}
                    label={{value: "Mois", position: "insideBottom", fontSize: "14px"}}
                />
                <YAxis
                    width={49} dataKey="jours" style={{ fontSize: "12px" }}
                    label={{ value: "Nombres de jours loués par mois !", position: "insideLeft", fontSize: "14px", angle: "-90" }}
                />
                <Line type="monotone" dataKey="jours" stroke="#164e63" strokeWidth={2} opacity={0.6} />
                <Tooltip itemStyle={tooltipStyle} contentStyle={tooltipStyle} />
                <Legend verticalAlign="top" color="#164e63" />
            </LineChart>
        </ResponsiveContainer>
    );
};