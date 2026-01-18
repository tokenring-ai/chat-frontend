import React from 'react';

interface TreeSelectorActionsProps {
  onCancel: () => void;
  onConfirm: () => void;
  isValid: boolean;
}

export const TreeSelectorActions: React.FC<TreeSelectorActionsProps> = ({
  onCancel,
  onConfirm,
  isValid,
}) => {
  return (
    <div className="flex gap-3">
      <button
        onClick={onCancel}
        className="bg-tertiary border border-primary rounded-lg text-primary text-sm py-2.5 px-5 hover:bg-hover transition-all"
      >
        Cancel
      </button>
      <button
        onClick={onConfirm}
        disabled={!isValid}
        className={`rounded-lg text-sm py-2.5 px-5 transition-all shadow-sm ${
          isValid
            ? 'btn-primary hover:btn-primary'
            : 'bg-gray-400 text-gray-600 cursor-not-allowed'
        }`}
      >
        Confirm Selection
      </button>
    </div>
  );
};
