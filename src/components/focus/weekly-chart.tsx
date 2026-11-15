'use client';

import { Bar, BarChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { format, parseISO } from 'date-fns';
import { formatDuration } from '@/lib/utils/format';
import type { DailyTotal } from '@/lib/analytics/study-stats';

export function WeeklyChart({ days, targetMinutes }: { days: DailyTotal[]; targetMinutes: number }) {
  const data = days.map((d) => ({
    day: format(parseISO(d.local_date), 'EEE'),
    date: d.local_date,
    video: Math.round(d.video_seconds / 60),
    manual: Math.round(d.manual_seconds / 60),
  }));

  // Ticks on whole hours (or half hours for light weeks) so labels are never misleading.
  const maxMinutes = Math.max(targetMinutes, ...data.map((d) => d.video + d.manual), 60);
  const step = maxMinutes <= 120 ? 30 : 60;
  const ticks = Array.from({ length: Math.ceil(maxMinutes / step) + 1 }, (_, i) => i * step);

  return (
    <div className="h-56 w-full" role="img" aria-label={`Study minutes for the last 7 days. Daily goal ${targetMinutes} minutes.`}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 4, left: -18, bottom: 0 }} barCategoryGap="28%">
          <CartesianGrid vertical={false} stroke="var(--line)" />
          <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fill: 'var(--ink-secondary)', fontSize: 12 }} />
          <YAxis
            ticks={ticks}
            domain={[0, ticks[ticks.length - 1]]}
            tickLine={false}
            axisLine={false}
            tick={{ fill: 'var(--ink-faint)', fontSize: 11 }}
            tickFormatter={(v: number) => (v === 0 ? '0' : v % 60 === 0 ? `${v / 60}h` : `${Math.floor(v / 60) ? `${Math.floor(v / 60)}h ` : ''}${v % 60}m`)}
          />
          <ReferenceLine y={targetMinutes} stroke="var(--warning)" strokeDasharray="4 4" ifOverflow="extendDomain" />
          <Tooltip
            cursor={{ fill: 'var(--primary-light)', opacity: 0.5 }}
            contentStyle={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12, fontSize: 12, color: 'var(--ink)' }}
            labelFormatter={(_, payload) => (payload?.[0] ? format(parseISO(payload[0].payload.date), 'EEE, d MMM') : '')}
            formatter={(value, name) => [formatDuration(Number(value) * 60), name === 'video' ? 'Lectures' : 'Focus timer']}
          />
          <Bar animationDuration={500} dataKey="video" stackId="a" fill="var(--primary)" radius={[0, 0, 4, 4]} />
          <Bar animationDuration={500} dataKey="manual" stackId="a" fill="var(--secondary)" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
