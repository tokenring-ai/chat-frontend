import { HumanInterfaceRequestFor, HumanInterfaceResponseFor } from '@tokenring-ai/agent/HumanInterfaceRequest';

interface WebPageRequestProps {
    request: HumanInterfaceRequestFor<'openWebPage'>;
    onResponse: (response: HumanInterfaceResponseFor<'openWebPage'>) => void;
}

export default function WebPageRequest({ request, onResponse }: WebPageRequestProps) {
    return (
        <div className="bg-[#252526] border border-[#3e3e42] rounded-md p-5 max-w-[500px] w-[90%] shadow-[0_4px_12px_rgba(0,0,0,0.5)]">
            <h3 className="text-[#4ec9b0] mb-[15px] text-lg">Open Web Page</h3>
            <p className="mb-5 leading-normal">Please open the following link:</p>
            <a href={request.url} target="_blank" rel="noopener noreferrer" className="text-[#4fc1ff] no-underline break-all hover:underline">
                {request.url}
            </a>
            <div className="flex gap-2.5 justify-end mt-5">
                <button
                    onClick={() => onResponse(true)}
                    className="bg-[#0e639c] border-none rounded-sm text-white cursor-pointer text-sm py-2 px-4 hover:bg-[#1177bb]"
                >
                    Done
                </button>
            </div>
        </div>
    );
}
