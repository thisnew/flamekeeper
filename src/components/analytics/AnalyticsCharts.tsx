"use client";

import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from "recharts";

const CLASS_COLOR_HEX: Record<string, string> = {
  Warrior: "#C79C6E", Paladin: "#F58CBA", Hunter: "#AAD372", Rogue: "#FFF569",
  Priest: "#FFFFFF", "Death Knight": "#C41E3A", Shaman: "#0070DE", Mage: "#69CCF0",
  Warlock: "#9482C9", Monk: "#00FF96", Druid: "#FF7D0A", "Demon Hunter": "#A330C9",
  Evoker: "#33937F",
};

const TOOLTIP_STYLE = {
  contentStyle: {
    background: "#1A1A1E",
    border: "1px solid #F0B823",
    borderRadius: 8,
  },
  itemStyle: { color: "#EBEBEB" },
} as const;

export interface RoleDatum {
  name: string;
  value: number;
  color: string;
}

export interface ClassDatum {
  name: string;
  value: number;
}

export interface BucketDatum {
  range: string;
  count: number;
}

export function RoleChart({ data }: { data: RoleDatum[] }) {
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={90}
            paddingAngle={3}
            dataKey="value"
            label={({ name, value }) => `${name}: ${value}`}
          >
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.color} stroke="#1A1A1E" />
            ))}
          </Pie>
          <Tooltip {...TOOLTIP_STYLE} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ClassChart({ data }: { data: ClassDatum[] }) {
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            outerRadius={90}
            dataKey="value"
            label={({ name, value }) => `${name}: ${value}`}
          >
            {data.map((entry, i) => (
              <Cell key={i} fill={CLASS_COLOR_HEX[entry.name] || "#666"} stroke="#1A1A1E" />
            ))}
          </Pie>
          <Tooltip {...TOOLTIP_STYLE} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ItemLevelChart({ data }: { data: BucketDatum[] }) {
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#333" />
          <XAxis dataKey="range" stroke="#9D9D9D" />
          <YAxis stroke="#9D9D9D" allowDecimals={false} />
          <Tooltip {...TOOLTIP_STYLE} cursor={{ fill: "rgba(240,184,35,0.05)" }} />
          <Bar dataKey="count" fill="#F0B823" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}