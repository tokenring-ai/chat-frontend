import React, {Fragment, useState} from 'react';
import {TreeSelectQuestionSchema, type TreeLeaf, type ParsedTreeSelectQuestion, type ResultTypeForQuestion} from '@tokenring-ai/agent/question';
import {z} from "zod";
import {SelectionSummary} from './selection-summary.tsx';
import {TreeSelectorActions} from './tree-selector-actions.tsx';

interface TreeNodeProps {
    node: TreeLeaf;
    depth: number;
    selected: Set<string>;
    onToggle: (value: string) => void;
    multiple: boolean;
    initialExpanded: boolean;
    canSelect: (value: string) => boolean;
}

const TreeNode: React.FC<TreeNodeProps> = ({ node, depth, selected, onToggle, multiple, initialExpanded, canSelect }) => {
    const [expanded, setExpanded] = useState(initialExpanded);
    const value = node.value || node.name;
    const isSelected = selected.has(value);

    const handleToggle = (e: React.MouseEvent) => {
        e.stopPropagation();
        console.log('TreeNode clicked:', value, 'canSelect:', canSelect(value));
        if (canSelect(value)) {
            onToggle(value);
        }
    };

    const handleExpand = (e: React.MouseEvent) => {
        e.stopPropagation();
        setExpanded(!expanded);
    };

    return (
        <div className="flex flex-col" style={{ marginLeft: `${depth * 20}px` }}>
            <div className="flex items-center cursor-pointer py-1 hover:bg-hover rounded-lg px-2 transition-colors">
                {node.children ? (
                    <span onClick={handleExpand} className="w-5 text-center text-tertiary select-none">
                        {expanded ? '▼' : '▶'}
                    </span>
                ) : (
                    <span className="w-5"></span>
                )}
                <div
                    className={`flex-1 flex items-center gap-2 ${isSelected ? 'text-accent font-semibold' : 'text-primary'}`}
                    onClick={multiple ? handleToggle : (node.children ? handleExpand : handleToggle)}
                >
                    {multiple && (
                        <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => { }}
                            readOnly
                            className="cursor-pointer accent-accent"
                        />
                    )}
                    {node.name}
                </div>
            </div>
            {expanded && node.children && (
                <div className="flex flex-col">
                    {(node.children as TreeLeaf[]).map((child, index) => (
                        <TreeNode
                            key={index}
                            node={child}
                            depth={depth + 1}
                            selected={selected}
                            onToggle={onToggle}
                            multiple={multiple}
                            initialExpanded={false}
                            canSelect={canSelect}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

type TreeSelectorProps = {
  question: ParsedTreeSelectQuestion;
  onSubmit: (value: ResultTypeForQuestion<ParsedTreeSelectQuestion>) => void;
}


export default function TreeInputQuestion({ question, onSubmit }: TreeSelectorProps) {
    const [selected, setSelected] = useState<Set<string>>(new Set(question.defaultValue ?? []));

    const { minimumSelections, maximumSelections } = question;
    const multiple = maximumSelections !== 1;

    const canSelect = (value: string): boolean => {
        if (!multiple) return true;
        
        const isCurrentlySelected = selected.has(value);
        if (isCurrentlySelected) {
            return minimumSelections === undefined || selected.size > minimumSelections;
        }
        return maximumSelections === undefined || selected.size < maximumSelections;
    };

    const handleToggle = (value: string) => {
        if (multiple) {
            const newSelected = new Set(selected);
            if (newSelected.has(value)) {
                newSelected.delete(value);
            } else {
                newSelected.add(value);
            }
            setSelected(newSelected);
        } else {
            setSelected(new Set([value]));
        }
    };

    const isSelectionValid = () => {
        const count = selected.size;
        if (minimumSelections !== undefined && count < minimumSelections) {
            return false;
        }
        if (maximumSelections !== undefined && count > maximumSelections) {
            return false;
        }
        return true;
    };

    const handleSubmit = () => {
        if (!isSelectionValid()) {
            return;
        }
        const values = Array.from(selected);
        onSubmit(values.length > 0 ? values : null);
    };
  const selectionCount = selected.size;
  const isValid = isSelectionValid();

  return (
    <Fragment>
      <div className="flex-1 overflow-y-auto bg-primary p-6 relative z-10">
        {question.tree.map((root, index) => (
          <TreeNode
            key={index}
            node={root}
            depth={0}
            selected={selected}
            onToggle={handleToggle}
            multiple={multiple}
            initialExpanded={true}
            canSelect={canSelect}
          />
        ))}
      </div>
      <div className="p-5 border-t border-primary bg-secondary">
        <div className="flex gap-3 justify-between items-center mb-3">
          <SelectionSummary
            selectionCount={selectionCount}
            isValid={isValid}
            minimumSelections={minimumSelections}
            maximumSelections={maximumSelections}
          />
          <TreeSelectorActions
            onCancel={() => onSubmit(null)}
            onConfirm={handleSubmit}
            isValid={isValid}
          />
        </div>
      </div>
    </Fragment>
  );
}
