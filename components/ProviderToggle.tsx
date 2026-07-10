'use client';

import React from 'react';
import { motion } from 'framer-motion';
import type { Provider } from '@/lib/providerFormats';

interface ProviderToggleProps {
  provider: Provider;
  onProviderChange: (p: Provider) => void;
}

const PROVIDERS: { id: Provider; label: string; color: string }[] = [
  { id: 'openai', label: 'OpenAI', color: 'text-emerald-400' },
  { id: 'anthropic', label: 'Anthropic', color: 'text-orange-400' },
  { id: 'gemini', label: 'Gemini', color: 'text-blue-400' },
];

export default function ProviderToggle({ provider, onProviderChange }: ProviderToggleProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-500">Wire format:</span>
      <div className="flex bg-gray-900 rounded-lg p-0.5 border border-gray-800 gap-0.5">
        {PROVIDERS.map((p) => (
          <button
            key={p.id}
            onClick={() => onProviderChange(p.id)}
            className={`relative px-3 py-1 rounded-md text-xs font-medium transition-colors ${
              provider === p.id ? p.color : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            {provider === p.id && (
              <motion.div
                layoutId="providerActive"
                className="absolute inset-0 bg-gray-800 rounded-md"
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            )}
            <span className="relative">{p.label}</span>
          </button>
        ))}
      </div>
      <span className="text-xs text-gray-600 hidden sm:block italic">
        Same semantic loop, three wire formats
      </span>
    </div>
  );
}
