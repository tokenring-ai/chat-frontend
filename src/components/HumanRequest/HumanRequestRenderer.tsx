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
                <div className="bg-[#252526] border border-[#3e3e42] rounded-md p-5 max-w-[500px] w-[90%] shadow-[0_4px_12px_rgba(0,0,0,0.5)]">
                    <h3 className="text-[#4ec9b0] mb-[15px] text-lg">Unknown Request Type</h3>
                    <p className="mb-5 leading-normal">Received an unknown request type: {(request as any).type}</p>
                    <button onClick={() => onResponse(null as any)} className="bg-[#3c3c3c] border border-[#3e3e42] rounded-sm text-[#d4d4d4] cursor-pointer text-sm py-2 px-4 hover:bg-[#4e4e4e]">Dismiss</button>
                </div>
            );
    }
}
