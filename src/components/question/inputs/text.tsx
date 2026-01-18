import type {ParsedTextQuestion, ResultTypeForQuestion} from "@tokenring-ai/agent/question";
import React, { useState } from 'react';

interface TextInputProps {
  question: ParsedTextQuestion;
  onSubmit: (value: ResultTypeForQuestion<ParsedTextQuestion>) => void;
}

export const TextInputQuestion: React.FC<TextInputProps> = ({
  question: {
    label,
    required,
    defaultValue,
    expectedLines,
    masked
  },
  onSubmit,
}) => {
  const [value, setValue] = useState(defaultValue ?? "");

  return (
    <>
      <div className="flex-1 p-6 bg-primary">
        <label className="block text-primary mb-2">
          {label}
          {required && ' *'}
        </label>
        {expectedLines > 1 ? (
          <textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            rows={expectedLines}
            style={masked ? { WebkitTextSecurity: 'disc' } as React.CSSProperties & { WebkitTextSecurity: string } : {}}
            autoFocus
            className="bg-input border border-primary text-primary text-sm p-3 w-full outline-none focus:border-focus rounded-lg transition-colors"
          />
        ) : (
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            type={masked ? 'password' : 'text'}
            autoFocus
            className="bg-input border border-primary text-primary text-sm p-3 w-full outline-none focus:border-focus rounded-lg transition-colors"
          />
        )}
      </div>
      <div className="p-5 border-t border-primary flex gap-3 justify-end bg-secondary">
        <button
          onClick={() => onSubmit(null)}
          className="bg-tertiary border border-primary rounded-lg text-primary text-sm py-2.5 px-5 hover:bg-hover transition-all"
        >
          Cancel
        </button>
        <button
          onClick={() => onSubmit(value)}
          className="btn-primary rounded-lg text-sm py-2.5 px-6 hover:btn-primary transition-all shadow-sm"
        >
          Submit
        </button>
      </div>
    </>
  );
};
