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
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[100] p-4 backdrop-blur-sm">
      <div className="w-full max-w-[500px] bg-secondary rounded-2xl shadow-lg border border-primary overflow-hidden flex flex-col">
        <div className="p-5 border-b border-primary bg-tertiary">
          <h3 className="text-accent text-lg font-semibold">Password Required</h3>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col">
          <div className="flex-1 p-6 bg-primary">
            <p className="mb-4 text-primary leading-relaxed">{request.message}</p>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              autoFocus
              className="bg-input border border-primary text-primary text-sm p-3 w-full outline-none focus:border-focus rounded-lg transition-colors"
            />
          </div>
          <div className="p-5 border-t border-primary flex gap-3 justify-end bg-secondary">
            <button
              type="submit"
              className="btn-primary rounded-lg text-sm py-2.5 px-6 hover:btn-primary transition-all shadow-sm"
            >
              Submit
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
