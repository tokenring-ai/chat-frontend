import {fireEvent, render, screen, waitFor} from '@testing-library/react';
import {beforeEach, describe, expect, it, vi} from 'vitest';
// Import the mocked functions after the mock declaration
import {useAvailableHooks, useEnabledHooks} from '../rpc';
import HookSelector from './HookSelector';

// Mock the RPC module
vi.mock('../rpc.ts', () => ({
  lifecycleRPCClient: {
    enableHooks: vi.fn(),
    disableHooks: vi.fn(),
  },
  useAvailableHooks: vi.fn(),
  useEnabledHooks: vi.fn(),
}));

describe('HookSelector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const setup = (availableHooks: Record<string, any> = {}, enabledHooks: string[] = []) => {
    (useAvailableHooks as any).mockReturnValue({data: {hooks: availableHooks}});
    (useEnabledHooks as any).mockReturnValue({data: {hooks: enabledHooks}, mutate: vi.fn()});
  };

  it('renders the hook selector button with accurate hook count', () => {
    setup();

    render(<HookSelector agentId="test-agent" triggerVariant="icon" />);
    
    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute('aria-label', 'Select hooks. 0 of 0 enabled');
    expect(button).toHaveAttribute('title', '0 of 0 hooks enabled');
  });

  it('displays icon trigger variant correctly', () => {
    setup();

    render(<HookSelector agentId="test-agent" triggerVariant="icon"/>);

    const button = screen.getByRole('button');
    expect(button).toHaveClass('flex items-center justify-center p-1.5 rounded-md');
    expect(button).toHaveAttribute('title', '0 of 0 hooks enabled');
  });

  it('displays default trigger variant correctly', () => {
    setup();

    render(<HookSelector agentId="test-agent" triggerVariant="default"/>);

    const button = screen.getByRole('button');
    expect(button).toHaveClass('hidden md:flex items-center gap-2 px-2 py-1 rounded-md');
  });

  it('filters hooks based on search query', async () => {
    const availableHooks = {
      'file-hooks': {displayName: 'File Hooks', description: 'File system operations'},
      'memory-hooks': {displayName: 'Memory Hooks', description: 'Memory management'},
      'git-hooks': {displayName: 'Git Hooks', description: 'Version control operations'},
    };

    setup(availableHooks);

    render(<HookSelector agentId="test-agent" triggerVariant="icon"/>);

    // Open the dropdown
    const button = screen.getByRole('button');
    button.click();

    await waitFor(() => {
      expect(screen.getByText('File Hooks')).toBeInTheDocument();
      expect(screen.getByText('Memory Hooks')).toBeInTheDocument();
      expect(screen.getByText('Git Hooks')).toBeInTheDocument();
    });

    // Type search query
    const searchInput = screen.getByPlaceholderText('Filter hooks...');
    fireEvent.change(searchInput, {target: {value: 'git'}});

    // Should only show git hooks
    await waitFor(() => {
      expect(screen.queryByText('File Hooks')).not.toBeInTheDocument();
      expect(screen.queryByText('Memory Hooks')).not.toBeInTheDocument();
      expect(screen.getByText('Git Hooks')).toBeInTheDocument();
    });
  });

  it('clears search when clear button is clicked', async () => {
    const availableHooks = {
      'file-hooks': {displayName: 'File Hooks', description: 'File system operations'},
    };

    setup(availableHooks);

    render(<HookSelector agentId="test-agent" triggerVariant="icon"/>);

    // Open the dropdown
    const button = screen.getByRole('button');
    button.click();

    await waitFor(() => {
      expect(screen.getByText('File Hooks')).toBeInTheDocument();
    });

    // Type search query
    const searchInput = screen.getByPlaceholderText('Filter hooks...');
    fireEvent.change(searchInput, {target: {value: 'nonexistent'}});

    await waitFor(() => {
      expect(screen.getByText(/No hooks found matching/)).toBeInTheDocument();
    });

    // Click clear button
    const clearButton = screen.getByLabelText('Clear search');
    fireEvent.click(clearButton);

    // Search should be cleared and original hooks shown
    await waitFor(() => {
      expect(searchInput).toHaveValue('');
      expect(screen.getByText('File Hooks')).toBeInTheDocument();
    });
  });

  it('navigates through hooks with keyboard arrow keys', async () => {
    const availableHooks = {
      'file-hooks': {displayName: 'File Hooks', description: 'File system operations'},
      'memory-hooks': {displayName: 'Memory Hooks', description: 'Memory management'},
      'git-hooks': {displayName: 'Git Hooks', description: 'Version control operations'},
    };

    setup(availableHooks);

    render(<HookSelector agentId="test-agent" triggerVariant="icon"/>);

    // Open the dropdown
    const button = screen.getByRole('button');
    button.click();

    await waitFor(() => {
      expect(screen.getByText('File Hooks')).toBeInTheDocument();
    });

    // Get the first hook item and focus it
    const firstHook = screen.getByText('File Hooks').closest('[role="option"]');
    const secondHook = screen.getByText('Memory Hooks').closest('[role="option"]');

    if (firstHook) {
      firstHook.focus();

      // Simulate ArrowDown key press
      fireEvent.keyDown(firstHook, {key: 'ArrowDown', code: 'ArrowDown'});

      // Second hook should now be focused (visually highlighted with bg-hover and focus ring)
      expect(secondHook).toHaveClass('bg-hover');
      expect(secondHook).toHaveClass('focus-ring');
    }
  });

  it('toggles hook with Enter key', async () => {
    const mockMutate = vi.fn();
    (useEnabledHooks as any).mockReturnValue({
      data: {hooks: []},
      mutate: mockMutate
    });
    (useAvailableHooks as any).mockReturnValue({
      data: {
        hooks: {
          'file-hooks': {displayName: 'File Hooks', description: 'File system operations'},
        }
      }
    });

    render(<HookSelector agentId="test-agent" triggerVariant="icon"/>);

    // Open the dropdown
    const button = screen.getByRole('button');
    button.click();

    await waitFor(() => {
      expect(screen.getByText('File Hooks')).toBeInTheDocument();
    });

    // Get the hook item and focus it
    const hookItem = screen.getByText('File Hooks').closest('[role="option"]');

    if (hookItem) {
      hookItem.focus();

      // Simulate Enter key press
      fireEvent.keyDown(hookItem, {key: 'Enter', code: 'Enter'});

      // Verify toggle was called
      await waitFor(() => {
        expect(mockMutate).toHaveBeenCalled();
      });
    }
  });
});
