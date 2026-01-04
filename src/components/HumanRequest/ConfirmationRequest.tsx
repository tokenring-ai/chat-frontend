import { HumanInterfaceRequestFor, HumanInterfaceResponseFor } from '@tokenring-ai/agent/HumanInterfaceRequest';

interface ConfirmationRequestProps {
    request: HumanInterfaceRequestFor<'askForConfirmation'>;
    onResponse: (response: HumanInterfaceResponseFor<'askForConfirmation'>) => void;
}

export default function ConfirmationRequest({ request, onResponse }: ConfirmationRequestProps) {
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-4 backdrop-blur-sm">
      <div className="w-full max-w-[120ch] max-h-[90vh] bg-secondary rounded-lg shadow-2xl border border-default overflow-hidden animate-in fade-in zoom-in duration-300 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-[#3e3e42]">
          <h3 className="text-[#4ec9b0] text-lg font-medium">Confirmation Required</h3>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 bg-[#1e1e1e] custom-scrollbar">
          <p className="leading-normal text-[#d4d4d4] whitespace-pre-wrap">
            {request.message}
          </p>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#3e3e42] flex gap-2.5 justify-end bg-secondary">
          <button
            onClick={() => onResponse(true)}
            className="bg-[#0e639c] border-none rounded-sm text-white cursor-pointer text-sm py-2 px-4 hover:bg-[#1177bb] transition-colors"
          >
            Yes
          </button>
          <button
            onClick={() => onResponse(false)}
            className="bg-[#3c3c3c] border border-[#3e3e42] rounded-sm text-[#d4d4d4] cursor-pointer text-sm py-2 px-4 hover:bg-[#4e4e4e] transition-colors"
          >
            No
          </button>
        </div>
      </div>
    </div>
  );
}
