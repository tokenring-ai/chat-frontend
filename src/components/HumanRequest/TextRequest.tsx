import React, { useState } from 'react';
import { HumanInterfaceRequestFor, HumanInterfaceResponseFor } from '@tokenring-ai/agent/HumanInterfaceRequest';

interface TextRequestProps {
    request: HumanInterfaceRequestFor<'askForText'>;
    onResponse: (response: HumanInterfaceResponseFor<'askForText'>) => void;
}

export default function TextRequest({ request, onResponse }: TextRequestProps) {
    const [text, setText] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onResponse(text);
    };

    return (
        <div className="bg-[#252526] border border-[#3e3e42] rounded-md p-5 max-w-[500px] w-[90%] shadow-[0_4px_12px_rgba(0,0,0,0.5)]">
            <h3 className="text-[#4ec9b0] mb-[15px] text-lg">Input Required</h3>
            <p className="mb-5 leading-normal">{request.message}</p>
            <form onSubmit={handleSubmit}>
                <input
                    type="text"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Enter text"
                    autoFocus
                    className="bg-[#3c3c3c] border border-[#3e3e42] text-[#d4d4d4] text-sm p-2.5 w-full outline-none focus:border-[#007acc]"
                />
                <div className="flex gap-2.5 justify-end mt-5">
                    <button
                        type="button"
                        onClick={() => onResponse(null)}
                        className="bg-[#3c3c3c] border border-[#3e3e42] rounded-sm text-[#d4d4d4] cursor-pointer text-sm py-2 px-4 hover:bg-[#4e4e4e]"
                    >
                        Cancel
                    </button>
                    <button type="submit" className="bg-[#0e639c] border-none rounded-sm text-white cursor-pointer text-sm py-2 px-4 hover:bg-[#1177bb]">Submit</button>
                </div>
            </form >
        </div >
    );
}
