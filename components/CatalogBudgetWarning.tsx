'use client';

import React from 'react';

export default function CatalogBudgetWarning({ tokenCount }: { tokenCount: number }) {
  return (
    <div className="bg-amber-950/50 border-b border-amber-800 px-4 py-2 flex items-center gap-2 text-xs text-amber-400">
      <span>⚠</span>
      <span>
        Tool catalog uses <strong>{tokenCount.toLocaleString()} tokens</strong> — exceeds the 2K recommended budget.
        {' '}Consider pruning rarely-used tools or using dynamic catalog injection.
      </span>
    </div>
  );
}
