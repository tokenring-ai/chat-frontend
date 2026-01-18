import {getDefaultQuestionValue, type ParsedFormQuestion, type ResultTypeForQuestion} from '@tokenring-ai/agent/question';
import {ChevronLeft, ChevronRight} from 'lucide-react';
import React, {useState} from 'react';
import FileInputQuestion from './file.tsx';
import Tree from './tree.tsx';

interface FormInputProps {
  agentId: string;
  question: ParsedFormQuestion;
  onSubmit: (result: ResultTypeForQuestion<ParsedFormQuestion>) => void;
}

export default function FormInputQuestion({ agentId, question, onSubmit }: FormInputProps) {
  const [values, setValues] = useState<Record<string, any>>({});
  const [currentSection, setCurrentSection] = useState(0);
  const [currentField, setCurrentField] = useState(0);

  const section = question.sections[currentSection];
  const fieldEntries = Object.entries(section.fields);
  const [fieldKey, field] = fieldEntries[currentField];
  const totalFields = fieldEntries.length;
  const isLastField = currentField === totalFields - 1;
  const isLastSection = currentSection === question.sections.length - 1;

  const handleFieldSubmit = (value: any) => {
    setValues(prev => ({ ...prev, [`${section.name}.${fieldKey}`]: value }));
    
    if (isLastField && isLastSection) {
      const result: Record<string, Record<string, any>> = {};
      for (const sec of question.sections) {
        result[sec.name] = {};
        for (const key of Object.keys(sec.fields)) {
          result[sec.name][key] = values[`${sec.name}.${key}`];
        }
      }
      result[section.name][fieldKey] = value;
      onSubmit(result);
    } else if (isLastField) {
      setCurrentSection(currentSection + 1);
      setCurrentField(0);
    } else {
      setCurrentField(currentField + 1);
    }
  };

  const handlePrevious = () => {
    if (currentField > 0) {
      setCurrentField(currentField - 1);
    } else if (currentSection > 0) {
      setCurrentSection(currentSection - 1);
      setCurrentField(Object.keys(question.sections[currentSection - 1].fields).length - 1);
    }
  };

  const canGoPrevious = currentSection > 0 || currentField > 0;

  return (
    <div className="flex flex-col h-full max-h-[90vh]">
      <div className="p-4 border-b border-primary bg-tertiary/30 flex-shrink-0">
        <div className="text-xs text-muted mb-1">
          Section {currentSection + 1} of {question.sections.length} · Field {currentField + 1} of {totalFields}
        </div>
        <h4 className="text-accent font-semibold">{section.name}</h4>
        {section.description && <p className="text-xs text-muted mt-1">{section.description}</p>}
      </div>

      <div className="flex-1 overflow-hidden p-4 min-h-0">
        {field.type === 'text' && (
          <div>
            <label className="block text-sm font-medium text-primary mb-2">{field.label}</label>
            {field.description && <p className="text-xs text-muted mb-3">{field.description}</p>}
            <input
              type={field.masked ? 'password' : 'text'}
              defaultValue={values[`${section.name}.${fieldKey}`] || field.defaultValue}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleFieldSubmit(e.currentTarget.value);
                }
              }}
              className="w-full px-3 py-2 bg-tertiary border border-primary rounded text-primary"
              required={field.required}
              autoFocus
            />
          </div>
        )}

        {field.type === 'treeSelect' && (
          <div className="h-full flex flex-col min-h-0">
            <label className="block text-sm font-medium text-primary mb-2 flex-shrink-0">{field.label}</label>
            <div className="border border-primary rounded flex-1 flex flex-col overflow-hidden min-h-0">
              <Tree
                key={`${section.name}.${fieldKey}`}
                question={field}
                onSubmit={handleFieldSubmit}
              />
            </div>
          </div>
        )}

        {field.type === 'fileSelect' && (
          <div className="h-full flex flex-col min-h-0">
            <label className="block text-sm font-medium text-primary mb-2 shrink-0">{field.label}</label>
            {field.description && <p className="text-xs text-muted mb-3 shrink-0">{field.description}</p>}
            <div className="border border-primary rounded flex-1 overflow-hidden min-h-0">
              <FileInputQuestion
                agentId={agentId}
                question={field}
                onSubmit={handleFieldSubmit}
              />
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-between p-4 border-t border-primary shrink-0">
        <div className="flex gap-2">
          <button onClick={() => onSubmit(getDefaultQuestionValue(question))} className="px-4 py-2 bg-tertiary hover:bg-hover rounded text-primary">
            Cancel
          </button>
          {canGoPrevious && (
            <button onClick={handlePrevious} className="px-4 py-2 bg-tertiary hover:bg-hover rounded text-primary flex items-center gap-1">
              <ChevronLeft size={16} /> Previous
            </button>
          )}
        </div>
        {field.type === 'text' && (
          <button
            onClick={(e) => {
              const input = e.currentTarget.parentElement?.parentElement?.querySelector('input') as HTMLInputElement;
              if (input) handleFieldSubmit(input.value);
            }}
            className="px-4 py-2 bg-accent hover:bg-accent/80 rounded text-primary font-medium flex items-center gap-1"
          >
            {isLastField && isLastSection ? 'Submit' : 'Next'} <ChevronRight size={16} />
          </button>
        )}
      </div>
    </div>
  );
}
