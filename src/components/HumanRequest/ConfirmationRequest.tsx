import { HumanInterfaceRequestFor, HumanInterfaceResponseFor } from '@tokenring-ai/agent/HumanInterfaceRequest';

interface ConfirmationRequestProps {
    request: HumanInterfaceRequestFor<'askForConfirmation'>;
    onResponse: (response: HumanInterfaceResponseFor<'askForConfirmation'>) => void;
}

export default function ConfirmationRequest({ request, onResponse }: ConfirmationRequestProps) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[100] p-4 backdrop-blur-sm">
      <div className="w-full max-w-[120ch] max-h-[90vh] bg-secondary rounded-2xl shadow-lg border border-primary overflow-hidden flex flex-col">
        <div className="p-5 border-b border-primary bg-tertiary">
          <h3 className="text-accent text-lg font-semibold">Confirmation Required</h3>
        </div>
        <div className="flex-1 overflow-y-auto p-6 bg-primary">
          <p className="leading-relaxed text-primary whitespace-pre-wrap">
            {request.message}
          </p>
        </div>
        <div className="p-5 border-t border-primary flex gap-3 justify-end bg-secondary">
          <button
            onClick={() => onResponse(true)}
            className="btn-primary rounded-lg text-sm py-2.5 px-5 hover:btn-primary transition-all shadow-sm"
          >
            Yes
          </button>
          <button
            onClick={() => onResponse(false)}
            className="bg-tertiary border border-primary rounded-lg text-primary text-sm py-2.5 px-5 hover:bg-hover transition-all"
          >
            No
          </button>
        </div>
      </div>
    </div>
  );
}
