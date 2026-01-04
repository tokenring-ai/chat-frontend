import React, { useState } from 'react';
import { HumanInterfaceRequestFor, HumanInterfaceResponseFor } from '@tokenring-ai/agent/HumanInterfaceRequest';

interface PasswordRequestProps {
  request: HumanInterfaceRequestFor<'askForPassword'>;
  onResponse: (response: HumanInterfaceResponseFor<'askForPassword'>) => void;
}

export default function PasswordRequest({ request, onResponse }: PasswordRequestProps) {
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      onResponse(password);
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-4 md:p-8 backdrop-blur-sm">
      <div className="w-full max-w-[500px] bg-secondary rounded-lg shadow-2xl border border-default overflow-hidden animate-in fade-in zoom-in duration-300 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-[#3e3e42]">
          <h3 className="text-[#4ec9b0] text-lg font-medium">Password Required</h3>
        </div>

        {/* Content Area */}
        <form onSubmit={handleSubmit} className="flex flex-col">
          <div className="flex-1 p-6 bg-[#1e1e1e]">
            <p className="mb-4 text-[#d4d4d4] leading-normal">{request.message}</p>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              autoFocus
              className="bg-[#3c3c3c] border border-[#3e3e42] text-[#d4d4d4] text-sm p-2.5 w-full outline-none focus:border-[#007acc] rounded-sm transition-colors"
            />
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-[#3e3e42] flex gap-2.5 justify-end bg-secondary">
            <button
              type="submit"
              className="bg-[#0e639c] border-none rounded-sm text-white cursor-pointer text-sm py-2 px-6 hover:bg-[#1177bb] transition-colors"
            >
              Submit
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
