'use client'

import type { EditorView } from '@codemirror/view'
import { markdown } from '@codemirror/lang-markdown'
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { languages } from '@codemirror/language-data'
import { EditorView as View } from '@codemirror/view'
import { tags } from '@lezer/highlight'
import * as Toolbar from '@radix-ui/react-toolbar'
import CodeMirror from '@uiw/react-codemirror'
import { Bold, Code, FileCode, Italic, Link2, List, MessageSquareText, Quote } from 'lucide-react'
import { useMemo, useRef } from 'react'
import { Button } from '../ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip'

const editorHighlightStyle = HighlightStyle.define([
  { tag: tags.heading, color: 'hsl(var(--foreground))', fontWeight: '600' },
  { tag: [tags.keyword, tags.tagName, tags.link], color: 'hsl(var(--primary))' },
  { tag: [tags.string, tags.attributeValue, tags.number], color: 'hsl(var(--foreground))' },
  { tag: [tags.comment, tags.meta], color: 'hsl(var(--muted-foreground))' },
  { tag: tags.invalid, color: 'hsl(var(--destructive))' },
])

const snippets = [
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

/** 仅在文章编辑页加载的 CodeMirror 源码编辑器。 */
export function MarkdownEditor({
  value,
  onChange,
  disabled,
}: {
  value: string
  onChange: (value: string) => void
  disabled: boolean
}) {
  const view = useRef<EditorView | null>(null)
  const extensions = useMemo(
    () => [
      markdown({ codeLanguages: languages }),
      syntaxHighlighting(editorHighlightStyle),
      View.lineWrapping,
      View.theme({
        '&': { backgroundColor: 'transparent', color: 'hsl(var(--foreground))', fontSize: '14px' },
        '.cm-scroller': { fontFamily: 'var(--font-mono), monospace', lineHeight: '1.8' },
        '.cm-content': { padding: '20px 0', caretColor: 'hsl(var(--foreground))' },
        '.cm-line': { padding: '0 20px' },
        '.cm-gutters': { backgroundColor: 'hsl(var(--muted))', color: 'hsl(var(--muted-foreground))', border: 'none' },
        '&.cm-focused': { outline: '2px solid hsl(var(--ring))', outlineOffset: '2px' },
        '.cm-activeLine, .cm-activeLineGutter': { backgroundColor: 'hsl(var(--muted))' },
        '.cm-selectionBackground, &.cm-focused .cm-selectionBackground': { backgroundColor: 'hsl(var(--border))' },
        '.cm-cursor': { borderLeftColor: 'hsl(var(--foreground))' },
        '.cm-panels, .cm-tooltip': {
          backgroundColor: 'hsl(var(--background))',
          color: 'hsl(var(--foreground))',
          borderColor: 'hsl(var(--border))',
        },
        '.cm-searchMatch': { backgroundColor: 'hsl(var(--muted))', outline: '1px solid hsl(var(--primary))' },
      }),
    ],
    [],
  )
  function insert(before: string, after: string) {
    const editor = view.current
    if (!editor || disabled || editor.composing) return
    const { from, to } = editor.state.selection.main
    const selected = editor.state.sliceDoc(from, to)
    editor.dispatch({
      changes: { from, to, insert: before + selected + after },
      selection: { anchor: from + before.length, head: from + before.length + selected.length },
    })
    editor.focus()
  }
  return (
    <div className="min-w-0 overflow-hidden rounded-lg border border-border">
      <Toolbar.Root
        aria-label="正文格式"
        className="flex flex-wrap items-center gap-1 border-b border-border bg-muted/30 px-2 py-1"
      >
        {snippets.map(({ label, icon: Icon, before, after }) => (
          <Tooltip key={label}>
            <TooltipTrigger asChild>
              <Toolbar.Button asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={label}
                  disabled={disabled}
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
      </Toolbar.Root>
      <CodeMirror
        aria-label="MDX 正文"
        value={value}
        onChange={onChange}
        onCreateEditor={(editor) => {
          view.current = editor
        }}
        extensions={extensions}
        editable={!disabled}
        theme="none"
        minHeight="560px"
        basicSetup={{ foldGutter: true, highlightActiveLine: true }}
      />
    </div>
  )
}
