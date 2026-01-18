import {type ParsedQuestionRequest, QuestionResponseSchema} from "@tokenring-ai/agent/AgentEvents";
import {TreeSelectQuestionSchema} from '@tokenring-ai/agent/question';
import React from 'react';
import {z} from "zod";
import {agentRPCClient} from "../../rpc.ts";
import FileInputQuestion from "./inputs/file.tsx";
import FormInputQuestion from "./inputs/form.tsx";
import {TextInputQuestion} from "./inputs/text.tsx";
import TreeInputQuestion from "./inputs/tree.tsx";

interface QuestionRequestProps {
  request: ParsedQuestionRequest;
  agentId: string;
}

export default function ImmediateRequest({ request, agentId }: QuestionRequestProps) {
  const handleResponse = async (result: z.input<typeof QuestionResponseSchema>["result"]) => {
    await agentRPCClient.sendQuestionResponse({
      agentId,
      requestId: request.requestId,
      response: {type: 'question.response', requestId: request.requestId, result, timestamp: Date.now()}
    });
  };

  const question = request.question;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-100 p-4 backdrop-blur-sm" onClick={(e) => e.target === e.currentTarget && handleResponse(null)}>
      <div className="w-full max-w-[120ch] max-h-[90vh] bg-secondary rounded-2xl shadow-lg border border-primary overflow-hidden flex flex-col relative z-[101]">
        <div className="p-5 border-b border-primary bg-tertiary">
          <h3 className="text-accent text-lg font-semibold">
            {request.message || 'Select an option'}
          </h3>
        </div>
        {question.type === 'treeSelect' &&
          <TreeInputQuestion question={request.question as z.output<typeof TreeSelectQuestionSchema>} onSubmit={handleResponse} />}
        {question.type === 'text' && (
          <TextInputQuestion
            question={question}
            onSubmit={handleResponse}
          />
        )}
        {question.type === 'fileSelect' && (
          <FileInputQuestion
            agentId={agentId}
            question={question}
            onSubmit={handleResponse}
          />
        )}
        {question.type === 'form' && (
          <FormInputQuestion
            agentId={agentId}
            question={question}
            onSubmit={handleResponse}
          />
        )}
      </div>
    </div>
  );
}
