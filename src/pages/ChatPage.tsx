import ChatPanel from "../components/chat/ChatPanel.tsx";

export default function ChatPage({ agentId }: { agentId: string }) {
  return <ChatPanel agentId={agentId} />;
}
