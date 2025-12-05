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
        <div className="human-request-card">
            <h3>Input Required</h3>
            <p>{request.message}</p>
            <form onSubmit={handleSubmit}>
                <input
                    type="text"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Enter text"
                    autoFocus
                    className="input-field"
                />
                <div className="button-group">
                    <button
                        type="button"
                        onClick={() => onResponse(null)}
                        className="btn-secondary"
                    >
                        Cancel
                    </button>
                    <button type="submit" className="btn-primary">Submit</button>
                </div>
            </form >
        </div >
    );
}
