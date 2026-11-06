'use client'

import * as Toolbar from '@radix-ui/react-toolbar'
import { Node } from '@tiptap/core'
import Document from '@tiptap/extension-document'
import Text from '@tiptap/extension-text'
import { UndoRedo } from '@tiptap/extensions'
import { closeHistory } from '@tiptap/pm/history'
import { EditorContent, useEditor } from '@tiptap/react'
import {
  Bold,
  Code,
  FileCode,
  Heading2,
  Italic,
  Link2,
  List,
  MessageSquareText,
  Quote,
  Redo2,
  Undo2,
} from 'lucide-react'
import { useEffect } from 'react'
import { Button } from '../ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip'

const MdxSource = Node.create({
  name: 'mdxSource',
  group: 'block',
  content: 'text*',
  marks: '',
  code: true,
  defining: true,
  whitespace: 'pre',
  parseHTML: () => [{ tag: 'pre', preserveWhitespace: 'full' }],
  renderHTML: () => ['pre', { class: 'm-0 whitespace-pre-wrap break-words font-mono' }, ['code', {}, 0]],
  addKeyboardShortcuts() {
    const newline = () => this.editor.commands.insertContent({ type: 'text', text: '\n' })
    return { Enter: newline, 'Shift-Enter': newline, 'Mod-Enter': newline }
  },
})

const extensions = [Document.extend({ content: 'mdxSource' }), Text, MdxSource, UndoRedo]
function sourceDocument(value: string) {
  return {
    type: 'doc',
    content: [{ type: 'mdxSource', content: value ? [{ type: 'text', text: value }] : [] }],
  }
}

const snippets = [
  { label: '标题', icon: Heading2, before: '\n## ', after: '' },
  { label: '粗体', icon: Bold, before: '**', after: '**' },
  { label: '斜体', icon: Italic, before: '*', after: '*' },
  { label: '链接', icon: Link2, before: '[', after: '](https://)' },
  { label: '行内代码', icon: Code, before: '\u0060', after: '\u0060' },
  { label: '代码块', icon: FileCode, before: '\n\u0060\u0060\u0060ts\n', after: '\n\u0060\u0060\u0060\n' },
  { label: '列表', icon: List, before: '\n- ', after: '' },
  { label: '引用', icon: Quote, before: '\n> ', after: '' },
  {
    label: '提示框',
    icon: MessageSquareText,
    before: '\n<Callout type="tip" title="提示">\n\n',
    after: '\n\n</Callout>\n',
  },
]

export function MarkdownEditor({
  value,
  onChange,
  disabled,
}: {
  value: string
  onChange: (value: string) => void
  disabled: boolean
}) {
  const editor = useEditor({
    extensions,
    content: sourceDocument(value),
    immediatelyRender: false,
    editable: !disabled,
    enableInputRules: false,
    enablePasteRules: false,
    editorProps: {
      attributes: {
        role: 'textbox',
        'aria-label': 'MDX 正文',
        'aria-multiline': 'true',
        spellcheck: 'false',
        class:
          'min-h-[560px] p-5 text-sm leading-7 text-foreground caret-foreground selection:bg-primary/20 outline-none focus:outline-none focus-visible:outline-none focus-visible:ring-0',
      },
      handlePaste(view, event) {
        if (!view.editable || !event.clipboardData) return false
        event.preventDefault()
        view.dispatch(view.state.tr.insertText(event.clipboardData.getData('text/plain')))
        return true
      },
    },
    onUpdate: ({ editor }) => onChange(editor.state.doc.textContent),
  })

  useEffect(() => {
    if (editor && editor.state.doc.textContent !== value) {
      editor.commands.setContent(sourceDocument(value), { emitUpdate: false })
    }
  }, [editor, value])

  useEffect(() => {
    editor?.setEditable(!disabled)
  }, [editor, disabled])

  function insert(before: string, after: string) {
    if (!editor || disabled || editor.view.composing) return
    const { from, to } = editor.state.selection
    const selected = editor.state.doc.textBetween(from, to)
    editor.view.dispatch(closeHistory(editor.state.tr))
    editor
      .chain()
      .focus()
      .insertContentAt({ from, to }, { type: 'text', text: before + selected + after })
      .setTextSelection({ from: from + before.length, to: from + before.length + selected.length })
      .run()
    editor.view.dispatch(closeHistory(editor.state.tr))
  }

  return (
    <div className="min-w-0 overflow-hidden rounded-lg border border-border">
      <Toolbar.Root
        aria-label="正文格式"
        className="flex min-h-12 flex-wrap items-center gap-1 border-b border-border bg-muted/30 px-2 py-1"
      >
        {snippets.map(({ label, icon: Icon, before, after }) => (
          <Tooltip key={label}>
            <TooltipTrigger asChild>
              <Toolbar.Button asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={label}
                  disabled={disabled || !editor}
                  onClick={() => insert(before, after)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <Icon />
                </Button>
              </Toolbar.Button>
            </TooltipTrigger>
            <TooltipContent sideOffset={8}>{label}</TooltipContent>
          </Tooltip>
        ))}
        <Toolbar.Separator className="mx-1 h-5 w-px bg-border" />
        <Toolbar.Button asChild>
          <Button
            variant="ghost"
            size="icon"
            aria-label="撤销"
            disabled={disabled || !editor}
            onClick={() => editor?.chain().focus().undo().run()}
          >
            <Undo2 />
          </Button>
        </Toolbar.Button>
        <Toolbar.Button asChild>
          <Button
            variant="ghost"
            size="icon"
            aria-label="重做"
            disabled={disabled || !editor}
            onClick={() => editor?.chain().focus().redo().run()}
          >
            <Redo2 />
          </Button>
        </Toolbar.Button>
      </Toolbar.Root>
      <EditorContent editor={editor} className="max-h-[75vh] min-h-[560px] overflow-auto overscroll-contain" />
    </div>
  )
}
