"use client";

import { useEditor, EditorContent, Editor as TiptapEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import { useCallback, useEffect, useState } from "react";
import styles from "./Editor.module.css";

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  editable?: boolean;
  placeholder?: string;
  "data-testid"?: string;
}

interface MenuBarProps {
  editor: TiptapEditor | null;
}

function MenuBar({ editor }: MenuBarProps) {
  const [linkUrl, setLinkUrl] = useState("");
  const [showLinkInput, setShowLinkInput] = useState(false);

  const setLink = useCallback(() => {
    if (!editor) return;

    if (linkUrl === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
    } else {
      const url = linkUrl.startsWith("http") ? linkUrl : `https://${linkUrl}`;
      editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
    }

    setLinkUrl("");
    setShowLinkInput(false);
  }, [editor, linkUrl]);

  if (!editor) {
    return null;
  }

  return (
    <div className={styles.menuBar}>
      <div className={styles.buttonGroup}>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`${styles.menuButton} ${editor.isActive("bold") ? styles.active : ""}`}
          title="Bold (Ctrl+B)"
          aria-label="Toggle bold"
        >
          <strong>B</strong>
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`${styles.menuButton} ${editor.isActive("italic") ? styles.active : ""}`}
          title="Italic (Ctrl+I)"
          aria-label="Toggle italic"
        >
          <em>I</em>
        </button>
      </div>

      <div className={styles.divider} />

      <div className={styles.buttonGroup}>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`${styles.menuButton} ${editor.isActive("heading", { level: 2 }) ? styles.active : ""}`}
          title="Heading 2"
          aria-label="Toggle heading 2"
        >
          H2
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={`${styles.menuButton} ${editor.isActive("heading", { level: 3 }) ? styles.active : ""}`}
          title="Heading 3"
          aria-label="Toggle heading 3"
        >
          H3
        </button>
      </div>

      <div className={styles.divider} />

      <div className={styles.buttonGroup}>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`${styles.menuButton} ${editor.isActive("bulletList") ? styles.active : ""}`}
          title="Bullet list"
          aria-label="Toggle bullet list"
        >
          •
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`${styles.menuButton} ${editor.isActive("orderedList") ? styles.active : ""}`}
          title="Numbered list"
          aria-label="Toggle numbered list"
        >
          1.
        </button>
      </div>

      <div className={styles.divider} />

      <div className={styles.buttonGroup}>
        {showLinkInput ? (
          <div className={styles.linkInput}>
            <input
              type="url"
              placeholder="Enter URL..."
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  setLink();
                }
                if (e.key === "Escape") {
                  setShowLinkInput(false);
                  setLinkUrl("");
                }
              }}
              className={styles.linkUrlInput}
              autoFocus
            />
            <button
              type="button"
              onClick={setLink}
              className={styles.linkConfirmButton}
              aria-label="Confirm link"
            >
              ✓
            </button>
            <button
              type="button"
              onClick={() => {
                setShowLinkInput(false);
                setLinkUrl("");
              }}
              className={styles.linkCancelButton}
              aria-label="Cancel"
            >
              ✕
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => {
              const previousUrl = editor.getAttributes("link").href || "";
              setLinkUrl(previousUrl);
              setShowLinkInput(true);
            }}
            className={`${styles.menuButton} ${editor.isActive("link") ? styles.active : ""}`}
            title="Add link"
            aria-label="Add link"
          >
            🔗
          </button>
        )}
        {editor.isActive("link") && !showLinkInput && (
          <button
            type="button"
            onClick={() => editor.chain().focus().unsetLink().run()}
            className={styles.menuButton}
            title="Remove link"
            aria-label="Remove link"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}

export function RichTextEditor({
  content,
  onChange,
  editable = true,
  placeholder = "Start typing...",
  "data-testid": testId,
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [2, 3],
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: styles.link,
        },
      }),
    ],
    content,
    editable,
    immediatelyRender: false, // Prevent SSR hydration mismatch
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: styles.editor,
        "data-testid": testId || "rich-text-editor",
      },
    },
  });

  // Update content when prop changes (for cancel/reset functionality)
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  // Update editable state
  useEffect(() => {
    if (editor) {
      editor.setEditable(editable);
    }
  }, [editable, editor]);

  return (
    <div className={styles.container} data-testid={testId ? `${testId}-container` : undefined}>
      {editable && <MenuBar editor={editor} />}
      <EditorContent
        editor={editor}
        className={`${styles.editorContent} ${!editable ? styles.readOnly : ""}`}
      />
      {editable && !content && (
        <div className={styles.placeholder}>{placeholder}</div>
      )}
    </div>
  );
}

// Read-only renderer for displaying HTML content safely
export function RichTextContent({
  content,
  className,
  "data-testid": testId,
}: {
  content: string;
  className?: string;
  "data-testid"?: string;
}) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [2, 3],
        },
      }),
      Link.configure({
        openOnClick: true,
        HTMLAttributes: {
          class: styles.link,
          target: "_blank",
          rel: "noopener noreferrer",
        },
      }),
    ],
    content,
    editable: false,
    immediatelyRender: false, // Prevent SSR hydration mismatch
  });

  // Update content when prop changes
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  return (
    <div className={className} data-testid={testId}>
      <EditorContent editor={editor} className={styles.readOnlyContent} />
    </div>
  );
}
