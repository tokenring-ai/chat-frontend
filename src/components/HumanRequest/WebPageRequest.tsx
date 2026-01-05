import { HumanInterfaceRequestFor, HumanInterfaceResponseFor } from '@tokenring-ai/agent/HumanInterfaceRequest';

interface WebPageRequestProps {
    request: HumanInterfaceRequestFor<'openWebPage'>;
    onResponse: (response: HumanInterfaceResponseFor<'openWebPage'>) => void;
}

export default function WebPageRequest({ request, onResponse }: WebPageRequestProps) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[100] p-4 backdrop-blur-sm">
      <div className="w-full max-w-[600px] bg-secondary rounded-2xl shadow-lg border border-primary overflow-hidden flex flex-col">
        <div className="p-5 border-b border-primary bg-tertiary">
          <h3 className="text-accent text-lg font-semibold">Open Web Page</h3>
        </div>
        <div className="flex-1 overflow-y-auto bg-primary p-6">
          <p className="mb-4 text-primary leading-relaxed">Please open the following link:</p>
          <a
            href={request.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent no-underline break-all hover:underline text-base"
          >
            {request.url}
          </a>
        </div>
        <div className="p-5 border-t border-primary flex gap-3 justify-end bg-secondary">
          <button
            onClick={() => onResponse(true)}
            className="btn-primary rounded-lg text-sm py-2.5 px-6 hover:btn-primary transition-all shadow-sm"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
