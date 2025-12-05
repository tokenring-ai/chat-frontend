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
                <div className="human-request-card error">
                    <h3>Unknown Request Type</h3>
                    <p>Received an unknown request type: {(request as any).type}</p>
                    <button onClick={() => onResponse(null as any)} className="btn-secondary">Dismiss</button>
                </div>
            );
    }
}
