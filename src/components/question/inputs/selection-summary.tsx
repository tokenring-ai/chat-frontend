import React from 'react';

interface SelectionSummaryProps {
  selectionCount: number;
  isValid: boolean;
  minimumSelections?: number;
  maximumSelections?: number;
}

export const SelectionSummary: React.FC<SelectionSummaryProps> = ({
  selectionCount,
  isValid,
  minimumSelections,
  maximumSelections,
}) => {
  let constraintText = '';
  if (minimumSelections !== undefined || maximumSelections !== undefined) {
    const parts: string[] = [];
    if (minimumSelections !== undefined) {
      parts.push(`min ${minimumSelections}`);
    }
    if (maximumSelections !== undefined) {
      parts.push(`max ${maximumSelections}`);
    }
    constraintText = parts.join(', ');
  }

  return (
    <div className="text-sm text-tertiary">
      Selected: <span className={isValid ? 'text-accent' : 'text-red-500'}>{selectionCount}</span>
      {constraintText && <span className="text-tertiary"> ({constraintText})</span>}
    </div>
  );
};
