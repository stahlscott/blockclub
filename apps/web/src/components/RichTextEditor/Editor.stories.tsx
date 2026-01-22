import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { RichTextEditor, RichTextContent } from "./Editor";

// Wrapper to handle state for the editor
function EditorWithState(props: {
  initialContent?: string;
  editable?: boolean;
  placeholder?: string;
}) {
  const [content, setContent] = useState(props.initialContent || "");
  return (
    <div style={{ maxWidth: 700 }}>
      <RichTextEditor
        content={content}
        onChange={setContent}
        editable={props.editable}
        placeholder={props.placeholder}
      />
      {props.editable !== false && (
        <div style={{ marginTop: 16, padding: 12, background: "#f5f5f5", borderRadius: 6 }}>
          <strong>HTML Output:</strong>
          <pre style={{ fontSize: 12, margin: "8px 0 0", whiteSpace: "pre-wrap" }}>
            {content || "(empty)"}
          </pre>
        </div>
      )}
    </div>
  );
}

const meta: Meta<typeof RichTextEditor> = {
  title: "Components/RichTextEditor",
  component: RichTextEditor,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Rich text editor built on Tiptap. Supports bold, italic, headings (H2, H3), " +
          "bullet lists, numbered lists, and links. Used for neighborhood guides.",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof RichTextEditor>;

export const Empty: Story = {
  render: () => <EditorWithState placeholder="Start typing..." />,
  parameters: {
    docs: {
      description: {
        story: "Empty editor with placeholder text.",
      },
    },
  },
};

export const WithContent: Story = {
  render: () => (
    <EditorWithState
      initialContent={`
        <h2>Welcome to the Neighborhood</h2>
        <p>Here's some <strong>important information</strong> for all residents.</p>
        <h3>Garbage Collection</h3>
        <ul>
          <li>Trash pickup: <strong>Mondays</strong></li>
          <li>Recycling: <strong>Wednesdays</strong></li>
          <li>Yard waste: <strong>First Friday</strong> of each month</li>
        </ul>
        <h3>Useful Contacts</h3>
        <ol>
          <li>City services: 311</li>
          <li>Non-emergency police: (216) 555-1234</li>
          <li>Block club president: <em>Sarah Johnson</em></li>
        </ol>
        <p>For more info, visit the <a href="https://example.com">city website</a>.</p>
      `.trim()}
    />
  ),
  parameters: {
    docs: {
      description: {
        story: "Editor pre-populated with formatted content including headings, lists, and links.",
      },
    },
  },
};

export const CustomPlaceholder: Story = {
  render: () => (
    <EditorWithState placeholder="Share helpful info for your neighbors - garbage day, local contacts, upcoming events..." />
  ),
  parameters: {
    docs: {
      description: {
        story: "Editor with custom placeholder text for the guide use case.",
      },
    },
  },
};

// RichTextContent stories (grouped under same file for convenience)
export const ReadOnlyContent: StoryObj<typeof RichTextContent> = {
  render: () => (
    <div style={{ maxWidth: 700 }}>
      <RichTextContent
        content={`
          <h2>Neighborhood Guidelines</h2>
          <p>Welcome to our community! Here are a few things to know:</p>
          <h3>Parking</h3>
          <ul>
            <li>Street parking is available on both sides</li>
            <li>Please don't block driveways</li>
            <li>Snow emergency rules apply in winter</li>
          </ul>
          <h3>Community Events</h3>
          <p>We have a <strong>block party</strong> every summer, usually in <em>late July</em>.</p>
          <p>Check out the <a href="https://example.com">events calendar</a> for details.</p>
        `.trim()}
      />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: "Displays HTML content in read-only mode. Links are clickable and open in new tabs.",
      },
    },
  },
};

export const EmptyContent: StoryObj<typeof RichTextContent> = {
  render: () => (
    <div style={{ maxWidth: 700 }}>
      <RichTextContent content="" />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: "Empty content renders as blank area.",
      },
    },
  },
};
