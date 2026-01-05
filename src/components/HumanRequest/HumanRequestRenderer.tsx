import { HumanInterfaceRequest, HumanInterfaceResponse } from '@tokenring-ai/agent/HumanInterfaceRequest';
import ConfirmationRequest from './ConfirmationRequest.tsx';
import PasswordRequest from './PasswordRequest.tsx';
import TextRequest from './TextRequest.tsx';
import WebPageRequest from './WebPageRequest.tsx';
import TreeSelectionRequest from './TreeSelectionRequest.tsx';

interface HumanRequestRendererProps {
    request: HumanInterfaceRequest;
    onResponse: (response: HumanInterfaceResponse) => void;
}

export default function HumanRequestRenderer({ request, onResponse }: HumanRequestRendererProps) {
    // We need to cast the onResponse to any because TypeScript has trouble inferring the specific union type match
    // But we know that for a specific request type, we will pass the correct response type
    const handleResponse = (response: any) => {
        onResponse(response);
    };

    switch (request.type) {
        case 'askForConfirmation':
            return <ConfirmationRequest request={request} onResponse={handleResponse} />;
        case 'askForPassword':
            return <PasswordRequest request={request} onResponse={handleResponse} />;
        case 'askForText':
            return <TextRequest request={request} onResponse={handleResponse} />;
        case 'openWebPage':
            return <WebPageRequest request={request} onResponse={handleResponse} />;
        case 'askForSingleTreeSelection':
        case 'askForMultipleTreeSelection':
            return <TreeSelectionRequest request={request} onResponse={handleResponse} />;
        default:
            return (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[100] p-4 backdrop-blur-sm">
                    <div className="bg-secondary border border-primary rounded-2xl p-6 max-w-[500px] w-[90%] shadow-lg">
                        <h3 className="text-accent mb-4 text-lg font-semibold">Unknown Request Type</h3>
                        <p className="mb-5 leading-relaxed text-primary">Received an unknown request type: {(request as any).type}</p>
                        <button onClick={() => onResponse(null as any)} className="bg-tertiary border border-primary rounded-lg text-primary text-sm py-2.5 px-5 hover:bg-hover transition-all">Dismiss</button>
                    </div>
                </div>
            );
    }
}
