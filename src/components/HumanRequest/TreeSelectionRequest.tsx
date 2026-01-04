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
            <div className="flex items-center cursor-pointer py-0.5 hover:bg-[#2d2d30]">
                {hasChildren ? (
                    <span onClick={handleExpand} className="w-5 text-center text-[#858585] select-none">
                        {expanded ? '▼' : '▶'}
                    </span>
                ) : (
                    <span className="w-5"></span>
                )}
                <div
                    className={`flex-1 flex items-center gap-2 ${isSelected ? 'text-[#4ec9b0] font-bold' : ''}`}
                    onClick={multiple ? handleToggle : (hasChildren ? handleExpand : handleToggle)}
                >
                    {multiple && (
                        <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => { }}
                            readOnly
                            className="cursor-pointer"
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
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-4 md:p-8 backdrop-blur-sm">
      <div className="w-full max-w-[120ch] max-h-[90vh] bg-secondary rounded-lg shadow-2xl border border-default overflow-hidden animate-in fade-in zoom-in duration-300 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-[#3e3e42]">
          <h3 className="text-[#4ec9b0] text-lg font-medium">
            {request.message || 'Select an option'}
          </h3>
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto bg-[#1e1e1e] p-4 custom-scrollbar">
          <TreeNode
            node={request.tree}
            depth={0}
            selected={selected}
            onToggle={handleToggle}
            multiple={multiple}
            initialExpanded={true}
          />
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#3e3e42] flex gap-2.5 justify-end bg-secondary">
          <button
            onClick={() => onResponse(null)}
            className="bg-[#3c3c3c] border border-[#3e3e42] rounded-sm text-[#d4d4d4] cursor-pointer text-sm py-2 px-4 hover:bg-[#4e4e4e] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="bg-[#0e639c] border-none rounded-sm text-white cursor-pointer text-sm py-2 px-4 hover:bg-[#1177bb] transition-colors"
          >
            Confirm Selection
          </button>
        </div>
      </div>
    </div>
  );
}
