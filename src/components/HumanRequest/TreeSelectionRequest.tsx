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
        <div className="tree-node" style={{ marginLeft: `${depth * 20}px` }}>
            <div className="tree-node-content">
                {hasChildren ? (
                    <span onClick={handleExpand} className="tree-expander">
                        {expanded ? '▼' : '▶'}
                    </span>
                ) : (
                    <span className="tree-spacer"></span>
                )}
                <div
                    className={`tree-label ${isSelected ? 'selected' : ''}`}
                    onClick={multiple ? handleToggle : (hasChildren ? handleExpand : handleToggle)}
                >
                    {multiple && (
                        <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => { }}
                            readOnly
                            className="tree-checkbox"
                        />
                    )}
                    {node.name}
                </div>
            </div>
            {expanded && hasChildren && (
                <div className="tree-children">
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
        <div className="human-request-card tree-selection-card">
            <h3>{request.message || 'Select an option'}</h3>
            <div className="tree-container">
                <TreeNode
                    node={request.tree}
                    depth={0}
                    selected={selected}
                    onToggle={handleToggle}
                    multiple={multiple}
                    initialExpanded={true}
                />
            </div>
            <div className="button-group">
                <button
                    onClick={() => onResponse(null)}
                    className="btn-secondary"
                >
                    Cancel
                </button>
                <button onClick={handleSubmit} className="btn-primary">
                    Confirm Selection
                </button>
            </div>
        </div>
    );
}
