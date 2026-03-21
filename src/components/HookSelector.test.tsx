import { describe, it, expect, it } from 'vitest';
import { render, screen, from '@testing-library/react';
import HookSelector from './HookSelector';

describe('HookSelector', () => {
  it('renders the hook selector button', () => {
    render(<HookSelector agentId="test-agent" triggerVariant="icon" />);
    
    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute('aria-label', 'Select hooks. 0 enabled');
    expect(button).toHaveAttribute('title', '0 hooks enabled');
  });
});
