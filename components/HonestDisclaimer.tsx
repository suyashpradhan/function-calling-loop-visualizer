'use client';

import React, { useState } from 'react';

export default function HonestDisclaimer() {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex items-center gap-2 text-xs">
      <div className="flex items-center gap-1.5 text-amber-500 cursor-pointer" onClick={() => setOpen(!open)}>
        <span>⚠</span>
        <span className="underline decoration-dotted">Model disclaimer</span>
      </div>

      {open && (
        <div className="absolute bottom-10 right-4 w-80 bg-gray-900 border border-amber-800 rounded-xl p-4 shadow-xl z-50">
          <p className="text-xs text-amber-300 font-medium mb-2">About the &quot;model&quot; in this demo</p>
          <p className="text-xs text-gray-400 leading-relaxed">
            The tool selector here is a <strong className="text-gray-200">deterministic pattern-matcher</strong> over
            tool descriptions — a stand-in for what an LLM&apos;s constrained-decoding tool selection produces.
          </p>
          <p className="text-xs text-gray-400 leading-relaxed mt-2">
            It uses keyword rules + regex entity extraction. <strong className="text-gray-200">No real LLM is called.</strong>
            {' '}The message loop, JSON Schema validation (ajv), tool implementations, token counting, and provider formats are all 100% real.
          </p>
          <button onClick={() => setOpen(false)} className="mt-3 text-xs text-gray-500 hover:text-gray-300">
            Close ✕
          </button>
        </div>
      )}
    </div>
  );
}
