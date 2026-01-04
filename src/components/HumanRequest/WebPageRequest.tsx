import { HumanInterfaceRequestFor, HumanInterfaceResponseFor } from '@tokenring-ai/agent/HumanInterfaceRequest';

interface WebPageRequestProps {
    request: HumanInterfaceRequestFor<'openWebPage'>;
    onResponse: (response: HumanInterfaceResponseFor<'openWebPage'>) => void;
}

export default function WebPageRequest({ request, onResponse }: WebPageRequestProps) {
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-4 md:p-8 backdrop-blur-sm">
      <div className="w-full max-w-[600px] bg-secondary rounded-lg shadow-2xl border border-default overflow-hidden animate-in fade-in zoom-in duration-300 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-[#3e3e42]">
          <h3 className="text-[#4ec9b0] text-lg font-medium">Open Web Page</h3>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto bg-[#1e1e1e] p-6 custom-scrollbar">
          <p className="mb-4 text-[#d4d4d4] leading-normal">Please open the following link:</p>
          <a
            href={request.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#4fc1ff] no-underline break-all hover:underline text-lg"
          >
            {request.url}
          </a>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#3e3e42] flex gap-2.5 justify-end bg-secondary">
          <button
            onClick={() => onResponse(true)}
            className="bg-[#0e639c] border-none rounded-sm text-white cursor-pointer text-sm py-2 px-6 hover:bg-[#1177bb] transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
