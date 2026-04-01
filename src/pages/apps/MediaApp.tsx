import {Image} from 'lucide-react';
import AgentLauncherApp from '../../components/AgentLauncherApp.tsx';

export default function MediaApp() {
  return (
    <AgentLauncherApp
      label="Media"
      description="Generate and manage images, audio, and video"
      icon={<Image />}
      gradient="from-pink-500 to-rose-600"
      agentType="media"
      launchDescription="Launch a media agent to generate images with AI, manage your media library, and process audio and video files."
      launchLabel="Open Media Studio"
    />
  );
}
