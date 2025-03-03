import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { calculateRentalDaysPerMonth } from '@/utils/chartUtils';
interface RentalDaysChartProps {
    locations: any[];
}
export const RentalDaysChart: React.FC<RentalDaysChartProps> = ({ locations }) => {
    const data = calculateRentalDaysPerMonth(locations);
    return (
        <Card className="col-span-3">
            <CardHeader>
                <CardTitle className="text-lg font-semibold">Jours de location par mois</CardTitle>
            </CardHeader>
            <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 5 }}>
                        <XAxis
                            dataKey="name"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 12 }}
                        />
                        <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 12 }}
                            width={30}
                        />
                        <Tooltip
                            formatter={(value) => [`${value} jours`, 'Jours loués']}
                            contentStyle={{
                                backgroundColor: 'white',
                                borderRadius: '6px',
                                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                                border: 'none'
                            }}
                        />
                        <Bar
                            dataKey="days"
                            fill="#B8860B"
                            radius={[4, 4, 0, 0]}
                            animationDuration={1500}
                            name="Jours loués"
                        />
                    </BarChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
};