'use client';

import React from 'react';
import type { UserMessage } from '@/lib/loop';
import type { Provider } from '@/lib/providerFormats';

interface UserCardProps {
  message: UserMessage;
  provider: Provider;
}

const PROVIDER_LABELS: Record<Provider, string> = {
  openai: 'role: "user"',
  anthropic: 'role: "user"',
  gemini: 'role: "user"',
};

export default function UserCard({ message, provider }: UserCardProps) {
  return (
    <div className="rounded-xl border border-blue-900 bg-blue-950/30 p-4">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">U</div>
        <span className="text-xs font-medium text-blue-400 uppercase tracking-wide">User</span>
        <span className="ml-auto text-xs text-gray-600 font-mono">{PROVIDER_LABELS[provider]}</span>
      </div>
      <p className="text-gray-100 text-sm leading-relaxed">{message.content}</p>
    </div>
  );
}
