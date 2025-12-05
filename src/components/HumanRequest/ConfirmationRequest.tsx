import { HumanInterfaceRequestFor, HumanInterfaceResponseFor } from '@tokenring-ai/agent/HumanInterfaceRequest';

interface ConfirmationRequestProps {
    request: HumanInterfaceRequestFor<'askForConfirmation'>;
    onResponse: (response: HumanInterfaceResponseFor<'askForConfirmation'>) => void;
}

export default function ConfirmationRequest({ request, onResponse }: ConfirmationRequestProps) {
    return (
        <div className="bg-[#252526] border border-[#3e3e42] rounded-md p-5 max-w-[500px] w-[90%] shadow-[0_4px_12px_rgba(0,0,0,0.5)]">
            <h3 className="text-[#4ec9b0] mb-[15px] text-lg">Confirmation Required</h3>
            <p className="mb-5 leading-normal">{request.message}</p>
            <div className="flex gap-2.5 justify-end mt-5">
                <button
                    onClick={() => onResponse(true)}
                    className="bg-[#0e639c] border-none rounded-sm text-white cursor-pointer text-sm py-2 px-4 hover:bg-[#1177bb]"
                >
                    Yes
                </button>
                <button
                    onClick={() => onResponse(false)}
                    className="bg-[#3c3c3c] border border-[#3e3e42] rounded-sm text-[#d4d4d4] cursor-pointer text-sm py-2 px-4 hover:bg-[#4e4e4e]"
                >
                    No
                </button>
            </div>
        </div>
    );
}
