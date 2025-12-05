import { HumanInterfaceRequestFor, HumanInterfaceResponseFor } from '@tokenring-ai/agent/HumanInterfaceRequest';

interface WebPageRequestProps {
    request: HumanInterfaceRequestFor<'openWebPage'>;
    onResponse: (response: HumanInterfaceResponseFor<'openWebPage'>) => void;
}

export default function WebPageRequest({ request, onResponse }: WebPageRequestProps) {
    return (
        <div className="human-request-card">
            <h3>Open Web Page</h3>
            <p>Please open the following link:</p>
            <a href={request.url} target="_blank" rel="noopener noreferrer" className="link-primary">
                {request.url}
            </a>
            <div className="button-group">
                <button
                    onClick={() => onResponse(true)}
                    className="btn-primary"
                >
                    Done
                </button>
            </div>
        </div>
    );
}
