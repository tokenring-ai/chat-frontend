import React, { useState } from 'react';
import { HumanInterfaceRequestFor, HumanInterfaceResponseFor, TreeLeaf } from '@tokenring-ai/agent/HumanInterfaceRequest';

interface TreeSelectionRequestProps {
    request: HumanInterfaceRequestFor<'askForSingleTreeSelection'> | HumanInterfaceRequestFor<'askForMultipleTreeSelection'>;
    onResponse: (response: HumanInterfaceResponseFor<'askForSingleTreeSelection'> | HumanInterfaceResponseFor<'askForMultipleTreeSelection'>) => void;
}

interface TreeNodeProps {
    node: TreeLeaf;
    depth: number;
    selected: Set<string>;
    onToggle: (value: string) => void;
    multiple: boolean;
    initialExpanded: boolean;
}

const TreeNode: React.FC<TreeNodeProps> = ({ node, depth, selected, onToggle, multiple, initialExpanded }) => {
    const [expanded, setExpanded] = useState(initialExpanded);
    const hasChildren = node.children && Array.isArray(node.children) && node.children.length > 0;
    const value = node.value || node.name;
    const isSelected = selected.has(value);

    const handleToggle = (e: React.MouseEvent) => {
        e.stopPropagation();
        onToggle(value);
    };

    const handleExpand = (e: React.MouseEvent) => {
        e.stopPropagation();
        setExpanded(!expanded);
    };

    return (
        <div className="flex flex-col" style={{ marginLeft: `${depth * 20}px` }}>
            <div className="flex items-center cursor-pointer py-1 hover:bg-hover rounded-lg px-2 transition-colors">
                {hasChildren ? (
                    <span onClick={handleExpand} className="w-5 text-center text-tertiary select-none">
                        {expanded ? '▼' : '▶'}
                    </span>
                ) : (
                    <span className="w-5"></span>
                )}
                <div
                    className={`flex-1 flex items-center gap-2 ${isSelected ? 'text-accent font-semibold' : 'text-primary'}`}
                    onClick={multiple ? handleToggle : (hasChildren ? handleExpand : handleToggle)}
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
            {expanded && hasChildren && (
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
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default function TreeSelectionRequest({ request, onResponse }: TreeSelectionRequestProps) {
    const [selected, setSelected] = useState<Set<string>>(new Set(
        request.initialSelection ? (
            typeof request.initialSelection === 'string'
                ? [request.initialSelection]
                : Array.from(request.initialSelection)
        ) : []
    ));

    const multiple = request.type === 'askForMultipleTreeSelection';

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

    const handleSubmit = () => {
        if (multiple) {
            onResponse(Array.from(selected));
        } else {
            const value = Array.from(selected)[0];
            onResponse(value || null);
        }
    };
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[100] p-4 backdrop-blur-sm">
      <div className="w-full max-w-[120ch] max-h-[90vh] bg-secondary rounded-2xl shadow-lg border border-primary overflow-hidden flex flex-col">
        <div className="p-5 border-b border-primary bg-tertiary">
          <h3 className="text-accent text-lg font-semibold">
            {request.message || 'Select an option'}
          </h3>
        </div>
        <div className="flex-1 overflow-y-auto bg-primary p-6">
          <TreeNode
            node={request.tree}
            depth={0}
            selected={selected}
            onToggle={handleToggle}
            multiple={multiple}
            initialExpanded={true}
          />
        </div>
        <div className="p-5 border-t border-primary flex gap-3 justify-end bg-secondary">
          <button
            onClick={() => onResponse(null)}
            className="bg-tertiary border border-primary rounded-lg text-primary text-sm py-2.5 px-5 hover:bg-hover transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="btn-primary rounded-lg text-sm py-2.5 px-5 hover:btn-primary transition-all shadow-sm"
          >
            Confirm Selection
          </button>
        </div>
      </div>
    </div>
  );
}
