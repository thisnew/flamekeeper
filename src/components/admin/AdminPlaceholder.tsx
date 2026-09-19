"use client";

import { useCallback } from "react";

export default function AdminGenericPage({ title, placeholder }: { title: string; placeholder: string }) {
  return (
    <div className="page-enter max-w-6xl mx-auto px-4 sm:px-6 py-12">
      <h1 className="font-display text-2xl font-bold text-wow-gold text-glow mb-8">{title}</h1>
      <div className="text-center py-20 border border-border-default rounded bg-bg-card">
        <p className="text-text-muted">{placeholder}</p>
      </div>
    </div>
  );
}