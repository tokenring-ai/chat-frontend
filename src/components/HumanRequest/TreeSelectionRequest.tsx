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
        <div className="bg-[#252526] border border-[#3e3e42] rounded-md p-5 max-w-[600px] w-[90%] shadow-[0_4px_12px_rgba(0,0,0,0.5)]">
            <h3 className="text-[#4ec9b0] mb-[15px] text-lg">{request.message || 'Select an option'}</h3>
            <div className="max-h-[400px] overflow-y-auto border border-[#3e3e42] bg-[#1e1e1e] p-2.5 mb-5">
                <TreeNode
                    node={request.tree}
                    depth={0}
                    selected={selected}
                    onToggle={handleToggle}
                    multiple={multiple}
                    initialExpanded={true}
                />
            </div>
            <div className="flex gap-2.5 justify-end mt-5">
                <button
                    onClick={() => onResponse(null)}
                    className="bg-[#3c3c3c] border border-[#3e3e42] rounded-sm text-[#d4d4d4] cursor-pointer text-sm py-2 px-4 hover:bg-[#4e4e4e]"
                >
                    Cancel
                </button>
                <button onClick={handleSubmit} className="bg-[#0e639c] border-none rounded-sm text-white cursor-pointer text-sm py-2 px-4 hover:bg-[#1177bb]">
                    Confirm Selection
                </button>
            </div>
        </div>
    );
}
