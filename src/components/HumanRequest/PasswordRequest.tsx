import React, { useState } from 'react';
import { HumanInterfaceRequestFor, HumanInterfaceResponseFor } from '@tokenring-ai/agent/HumanInterfaceRequest';

interface PasswordRequestProps {
    request: HumanInterfaceRequestFor<'askForPassword'>;
    onResponse: (response: HumanInterfaceResponseFor<'askForPassword'>) => void;
}

export default function PasswordRequest({ request, onResponse }: PasswordRequestProps) {
    const [password, setPassword] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onResponse(password);
    };

    return (
        <div className="human-request-card">
            <h3>Password Required</h3>
            <p>{request.message}</p>
            <form onSubmit={handleSubmit}>
                <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    autoFocus
                    className="input-field"
                />
                <div className="button-group">
                    <button type="submit" className="btn-primary">Submit</button>
                </div>
            </form>
        </div>
    );
}
