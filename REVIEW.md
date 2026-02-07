Refactor Artifact Rendering
Refactor the artifact rendering system to allow specific handling of different artifact types (Diff, Markdown, Image, HTML, JSON) directly within the
MessageComponent
, rather than delegating everything to a generic viewer.

User Review Required
IMPORTANT

The
ArtifactViewer
component will be deprecated and replaced by specialized components that share a common shell (BaseArtifactViewer). This changes the internal component structure significantly.

Proposed Changes
Components Layer
[NEW]
BaseArtifactViewer.tsx
Create a reusable shell component that handles:
Container styling (border, shadow, etc.)
Header section with customizable Icon, Title, and Meta Info.
Expansion state management.
Download functionality.
Collapsible body rendering.
[NEW]
ImageArtifactViewer.tsx
Specialized viewer for image mime types.
Renders image preview in body.
[NEW]
HtmlArtifactViewer.tsx
Specialized viewer for text/html.
Renders HTML content safely (possibly using an iframe or sanitized HTML).
[NEW]
JsonArtifactViewer.tsx
Specialized viewer for application/json.
Renders syntax-highlighted JSON.
[MODIFY]
DiffArtifact.tsx
Rename to DiffArtifactViewer.tsx (or wrap logic).
Update to use BaseArtifactViewer.
Implement logic to count lines for the "contracted state" requirement.
[MODIFY]
MarkdownArtifact.tsx
Rename to MarkdownArtifactViewer.tsx.
Update to use BaseArtifactViewer.
[MODIFY]
TextArtifact.tsx
Rename to DefaultArtifactViewer.tsx.
Update to use BaseArtifactViewer.
[MODIFY]
MessageComponent.tsx
Remove generic
ArtifactViewer
import.
Import specialized viewers.
Add logic to switch component based on msg.mimeType when handling output.artifact.