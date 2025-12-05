import { HumanInterfaceRequestFor, HumanInterfaceResponseFor } from '@tokenring-ai/agent/HumanInterfaceRequest';

interface ConfirmationRequestProps {
    request: HumanInterfaceRequestFor<'askForConfirmation'>;
    onResponse: (response: HumanInterfaceResponseFor<'askForConfirmation'>) => void;
}

export default function ConfirmationRequest({ request, onResponse }: ConfirmationRequestProps) {
    return (
        <div className="human-request-card">
            <h3>Confirmation Required</h3>
            <p>{request.message}</p>
            <div className="button-group">
                <button
                    onClick={() => onResponse(true)}
                    className="btn-primary"
                >
                    Yes
                </button>
                <button
                    onClick={() => onResponse(false)}
                    className="btn-secondary"
                >
                    No
                </button>
            </div>
        </div>
    );
}
