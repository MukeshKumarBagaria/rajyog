'use client';

import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { format, parseISO } from 'date-fns';

type Point = { id: string; name: string; date: string; percent: number };

const tooltipStyle = { background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12, fontSize: 12, color: 'var(--ink)' };

export function TrendChart({ points, benchmark }: { points: Point[]; benchmark: number | null }) {
  const data = points.map((p) => ({ ...p, label: format(parseISO(p.date), 'd MMM') }));
  const values = data.map((d) => d.percent).concat(benchmark ?? []);
  const min = Math.max(0, Math.floor((Math.min(...values) - 10) / 10) * 10);
  const max = Math.min(100, Math.ceil((Math.max(...values) + 10) / 10) * 10);

  return (
    <div className="h-64 w-full" role="img" aria-label={`Mock score trend across ${points.length} mocks${benchmark ? `, benchmark ${benchmark.toFixed(1)}%` : ''}`}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 12, right: 12, left: -16, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--line)" />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: 'var(--ink-secondary)', fontSize: 11 }} minTickGap={16} />
          <YAxis domain={[min, max]} tickLine={false} axisLine={false} tick={{ fill: 'var(--ink-faint)', fontSize: 11 }} tickFormatter={(v: number) => `${v}%`} />
          <Tooltip
            contentStyle={tooltipStyle}
            formatter={(v) => [`${Number(v).toFixed(1)}%`, 'Score']}
            labelFormatter={(_, payload) => payload?.[0]?.payload?.name ?? ''}
          />
          {benchmark ? (
            <ReferenceLine
              y={benchmark}
              stroke="var(--warning)"
              strokeDasharray="5 4"
              label={{ value: `Benchmark ${benchmark.toFixed(1)}%`, position: 'insideTopRight', fill: 'var(--warning-ink)', fontSize: 11 }}
            />
          ) : null}
          <Line animationDuration={500} type="monotone" dataKey="percent" stroke="var(--primary)" strokeWidth={2.5} dot={{ r: 3.5, fill: 'var(--surface)', stroke: 'var(--primary)', strokeWidth: 2 }} activeDot={{ r: 5 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function LastFiveChart({ points, benchmark }: { points: Point[]; benchmark: number | null }) {
  const data = points.map((p, i) => ({ ...p, label: `#${i + 1}` }));
  return (
    <div className="h-64 w-full" role="img" aria-label={`Last ${points.length} mock scores: ${points.map((p) => `${p.percent}%`).join(', ')}`}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 12, right: 8, left: -16, bottom: 0 }} barCategoryGap="30%">
          <CartesianGrid vertical={false} stroke="var(--line)" />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: 'var(--ink-secondary)', fontSize: 11 }} />
          <YAxis domain={[0, 100]} tickLine={false} axisLine={false} tick={{ fill: 'var(--ink-faint)', fontSize: 11 }} tickFormatter={(v: number) => `${v}%`} />
          <Tooltip
            cursor={{ fill: 'var(--primary-light)', opacity: 0.5 }}
            contentStyle={tooltipStyle}
            formatter={(v) => [`${Number(v).toFixed(1)}%`, 'Score']}
            labelFormatter={(_, payload) => {
              const p = payload?.[0]?.payload as (Point & { label: string }) | undefined;
              return p ? `${p.name} · ${format(parseISO(p.date), 'd MMM')}` : '';
            }}
          />
          {benchmark ? <ReferenceLine y={benchmark} stroke="var(--warning)" strokeDasharray="5 4" /> : null}
          <Bar animationDuration={500} dataKey="percent" radius={[8, 8, 0, 0]}>
            {data.map((d) => (
              <Cell key={d.id} fill={benchmark && d.percent >= benchmark ? 'var(--success)' : 'var(--primary)'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
