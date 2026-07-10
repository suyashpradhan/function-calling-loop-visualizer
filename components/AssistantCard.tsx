'use client';

import React from 'react';
import type { AssistantMessage } from '@/lib/loop';
import type { Provider } from '@/lib/providerFormats';

interface AssistantCardProps {
  message: AssistantMessage;
  provider: Provider;
}

const PROVIDER_ROLE_LABEL: Record<Provider, string> = {
  openai: 'role: "assistant"',
  anthropic: 'role: "assistant"',
  gemini: 'role: "model"',
};

export default function AssistantCard({ message, provider }: AssistantCardProps) {
  return (
    <div className="rounded-xl border border-purple-900 bg-purple-950/30 p-4">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-5 h-5 rounded-full bg-purple-600 flex items-center justify-center text-white text-xs font-bold">A</div>
        <span className="text-xs font-medium text-purple-400 uppercase tracking-wide">Assistant — Final Response</span>
        <span className="ml-auto text-xs text-gray-600 font-mono">{PROVIDER_ROLE_LABEL[provider]}</span>
      </div>
      <p className="text-gray-100 text-sm leading-relaxed">{message.content}</p>
    </div>
  );
}
