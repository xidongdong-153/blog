'use client'

import type { Editor } from '@tiptap/core'
import type { RefObject } from 'react'
import * as Toolbar from '@radix-ui/react-toolbar'
import { Node } from '@tiptap/core'
import Document from '@tiptap/extension-document'
import Text from '@tiptap/extension-text'
import { UndoRedo } from '@tiptap/extensions'
import { closeHistory } from '@tiptap/pm/history'
import { EditorContent, useEditor } from '@tiptap/react'
import {
  Bold,
  ChevronDown,
  Code,
  FileCode,
  Heading2,
  Italic,
  Keyboard,
  Link2,
  List,
  ListOrdered,
  MessageSquareText,
  Minus,
  Quote,
  Redo2,
  Sigma,
  Undo2,
} from 'lucide-react'
import { useEffect, useMemo } from 'react'
import { MAX_POST_BYTES } from '@/lib/posts'
import { Button } from '../ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu'
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover'
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip'

interface SnippetSpec {
  label: string
  before: string
  after: string
  block?: boolean
}

function insertSnippet(editor: Editor | null, before: string, after: string, block = false): boolean {
  if (!editor || !editor.isEditable || editor.view.composing) return false
  const { from, to } = editor.state.selection
  const selected = editor.state.doc.textBetween(from, to)
  const atLineStart = from <= 1 || editor.state.doc.textBetween(from - 1, from) === '\n'
  const prefix = block && before.startsWith('\n') && atLineStart ? before.slice(1) : before

  editor.view.dispatch(closeHistory(editor.state.tr))
  editor
    .chain()
    .focus()
    .insertContentAt({ from, to }, { type: 'text', text: prefix + selected + after })
    .setTextSelection({ from: from + prefix.length, to: from + prefix.length + selected.length })
    .run()
  editor.view.dispatch(closeHistory(editor.state.tr))
  return true
}

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
    const newline = () => {
      if (this.editor.view.composing) return true
      return this.editor.commands.insertContent({ type: 'text', text: '\n' })
    }
    const wrap = (before: string, after: string) => () => {
      if (this.editor.view.composing) return false
      return insertSnippet(this.editor, before, after)
    }
    return {
      Enter: newline,
      'Shift-Enter': newline,
      'Mod-Enter': newline,
      'Mod-b': wrap('**', '**'),
      'Mod-i': wrap('*', '*'),
      'Mod-e': wrap('\u0060', '\u0060'),
      'Mod-k': wrap('[', '](https://example.com)'),
    }
  },
})

const extensions = [Document.extend({ content: 'mdxSource' }), Text, MdxSource, UndoRedo]
function sourceDocument(value: string) {
  return {
    type: 'doc',
    content: [{ type: 'mdxSource', content: value ? [{ type: 'text', text: value }] : [] }],
  }
}

const HEADING_ITEMS: SnippetSpec[] = [
  { label: '二级标题 (##)', before: '\n## ', after: '', block: true },
  { label: '三级标题 (###)', before: '\n### ', after: '', block: true },
  { label: '四级标题 (####)', before: '\n#### ', after: '', block: true },
]

const INLINE_ITEMS: (SnippetSpec & { icon: typeof Bold; shortcut: string })[] = [
  { label: '粗体', shortcut: '⌘B', icon: Bold, before: '**', after: '**' },
  { label: '斜体', shortcut: '⌘I', icon: Italic, before: '*', after: '*' },
  { label: '行内代码', shortcut: '⌘E', icon: Code, before: '\u0060', after: '\u0060' },
  { label: '链接', shortcut: '⌘K', icon: Link2, before: '[', after: '](https://example.com)' },
]

const BLOCK_ITEMS: (SnippetSpec & { icon: typeof List })[] = [
  { label: '无序列表', icon: List, before: '\n- ', after: '', block: true },
  { label: '有序列表', icon: ListOrdered, before: '\n1. ', after: '', block: true },
  { label: '引用', icon: Quote, before: '\n> ', after: '', block: true },
  { label: '分割线', icon: Minus, before: '\n---\n', after: '', block: true },
]

const CODE_ITEMS: SnippetSpec[] = [
  { label: 'TypeScript (ts)', before: '\n\u0060\u0060\u0060ts\n', after: '\n\u0060\u0060\u0060\n', block: true },
  { label: 'TSX (tsx)', before: '\n\u0060\u0060\u0060tsx\n', after: '\n\u0060\u0060\u0060\n', block: true },
  { label: 'Bash / Shell', before: '\n\u0060\u0060\u0060bash\n', after: '\n\u0060\u0060\u0060\n', block: true },
  { label: 'JSON', before: '\n\u0060\u0060\u0060json\n', after: '\n\u0060\u0060\u0060\n', block: true },
  { label: 'SQL', before: '\n\u0060\u0060\u0060sql\n', after: '\n\u0060\u0060\u0060\n', block: true },
  {
    label: '带文件名代码块',
    before: '\n\u0060\u0060\u0060ts title="example.ts"\n',
    after: '\n\u0060\u0060\u0060\n',
    block: true,
  },
]

const MATH_ITEMS: SnippetSpec[] = [
  { label: '行内公式 ($...$)', before: '$', after: '$' },
  { label: '块级公式 ($$...$$)', before: '\n$$\n', after: '\n$$\n', block: true },
]

const COMPONENT_ITEMS: SnippetSpec[] = [
  {
    label: '提示框 · 提示 (tip)',
    before: '\n<Callout type="tip" title="提示">\n\n',
    after: '\n\n</Callout>\n',
    block: true,
  },
  {
    label: '提示框 · 注意 (note)',
    before: '\n<Callout type="note" title="注意">\n\n',
    after: '\n\n</Callout>\n',
    block: true,
  },
  {
    label: '提示框 · 警告 (warning)',
    before: '\n<Callout type="warning" title="警告">\n\n',
    after: '\n\n</Callout>\n',
    block: true,
  },
  {
    label: '提示框 · 重要 (important)',
    before: '\n<Callout type="important" title="重要">\n\n',
    after: '\n\n</Callout>\n',
    block: true,
  },
  {
    label: '折叠块 (<Collapse>)',
    before: '\n<Collapse title="展开详情">\n\n',
    after: '\n\n</Collapse>\n',
    block: true,
  },
]

const SHORTCUTS = [
  { keys: '⌘ / Ctrl + S', action: '保存草稿' },
  { keys: '⌘ / Ctrl + Shift + F', action: '专注写作' },
  { keys: '⌘ / Ctrl + B', action: '粗体' },
  { keys: '⌘ / Ctrl + I', action: '斜体' },
  { keys: '⌘ / Ctrl + E', action: '行内代码' },
  { keys: '⌘ / Ctrl + K', action: '插入链接' },
]

/** 基于 Tiptap 纯源码块的 MDX 编辑器，提供排版菜单、博客组件插入与字节状态栏。 */
export function MarkdownEditor({
  value,
  onChange,
  disabled,
  scrollRef,
  focusMode = false,
}: {
  value: string
  onChange: (value: string) => void
  disabled: boolean
  scrollRef?: RefObject<HTMLDivElement | null>
  focusMode?: boolean
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
          'min-h-[460px] p-5 text-[14px] leading-7 text-foreground caret-primary selection:bg-primary/20 outline-none focus:outline-none focus-visible:outline-none focus-visible:ring-0',
      },
      handleDOMEvents: {
        keydown(view, event) {
          if ((event.isComposing || view.composing) && event.key === 'Enter') {
            event.preventDefault()
            return true
          }
          return false
        },
      },
      handlePaste(view, event) {
        if (!view.editable || !event.clipboardData) return false
        event.preventDefault()
        view.dispatch(view.state.tr.insertText(event.clipboardData.getData('text/plain')))
        return true
      },
    },
    onUpdate: ({ editor: instance }) => onChange(instance.state.doc.textContent),
  })

  useEffect(() => {
    if (editor && editor.state.doc.textContent !== value) {
      editor.commands.setContent(sourceDocument(value), { emitUpdate: false })
    }
  }, [editor, value])

  useEffect(() => {
    editor?.setEditable(!disabled)
  }, [editor, disabled])

  const telemetry = useMemo(() => {
    const bytes = new TextEncoder().encode(value).length
    const lines = value ? value.split('\n').length : 0
    const kb = (bytes / 1024).toFixed(1)
    const ratio = bytes / MAX_POST_BYTES
    return { bytes, lines, chars: value.length, kb, ratio }
  }, [value])

  return (
    <div
      data-mdx-editor="true"
      className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-hair bg-background/60"
    >
      <Toolbar.Root
        aria-label="正文格式"
        className="flex min-h-11 flex-wrap items-center gap-0.5 border-b border-hair bg-muted/35 px-2 py-1"
      >
        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <Toolbar.Button asChild>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label="标题级别"
                    disabled={disabled || !editor}
                    className="h-9 gap-1 px-2 text-muted-foreground hover:text-foreground"
                  >
                    <Heading2 />
                    <ChevronDown className="size-3 opacity-60" />
                  </Button>
                </DropdownMenuTrigger>
              </Toolbar.Button>
            </TooltipTrigger>
            <TooltipContent sideOffset={8}>标题级别</TooltipContent>
          </Tooltip>
          <DropdownMenuContent align="start">
            <DropdownMenuLabel className="font-mono text-xs text-muted-foreground">标题</DropdownMenuLabel>
            {HEADING_ITEMS.map((item) => (
              <DropdownMenuItem
                key={item.label}
                onSelect={() => insertSnippet(editor, item.before, item.after, item.block)}
              >
                {item.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {INLINE_ITEMS.map(({ label, shortcut, icon: Icon, before, after }) => (
          <Tooltip key={label}>
            <TooltipTrigger asChild>
              <Toolbar.Button asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={label}
                  disabled={disabled || !editor}
                  onClick={() => insertSnippet(editor, before, after)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <Icon />
                </Button>
              </Toolbar.Button>
            </TooltipTrigger>
            <TooltipContent sideOffset={8}>
              {label} ({shortcut})
            </TooltipContent>
          </Tooltip>
        ))}

        <Toolbar.Separator className="mx-1 h-4 w-px bg-hair" />

        {BLOCK_ITEMS.map(({ label, icon: Icon, before, after, block }) => (
          <Tooltip key={label}>
            <TooltipTrigger asChild>
              <Toolbar.Button asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={label}
                  disabled={disabled || !editor}
                  onClick={() => insertSnippet(editor, before, after, block)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <Icon />
                </Button>
              </Toolbar.Button>
            </TooltipTrigger>
            <TooltipContent sideOffset={8}>{label}</TooltipContent>
          </Tooltip>
        ))}

        <Toolbar.Separator className="mx-1 h-4 w-px bg-hair" />

        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <Toolbar.Button asChild>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label="代码块模板"
                    disabled={disabled || !editor}
                    className="h-9 gap-1 px-2 text-muted-foreground hover:text-foreground"
                  >
                    <FileCode />
                    <ChevronDown className="size-3 opacity-60" />
                  </Button>
                </DropdownMenuTrigger>
              </Toolbar.Button>
            </TooltipTrigger>
            <TooltipContent sideOffset={8}>代码块</TooltipContent>
          </Tooltip>
          <DropdownMenuContent align="start">
            <DropdownMenuLabel className="font-mono text-xs text-muted-foreground">代码块</DropdownMenuLabel>
            {CODE_ITEMS.map((item) => (
              <DropdownMenuItem
                key={item.label}
                onSelect={() => insertSnippet(editor, item.before, item.after, item.block)}
              >
                {item.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <Toolbar.Button asChild>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label="数学公式"
                    disabled={disabled || !editor}
                    className="h-9 gap-1 px-2 text-muted-foreground hover:text-foreground"
                  >
                    <Sigma />
                    <ChevronDown className="size-3 opacity-60" />
                  </Button>
                </DropdownMenuTrigger>
              </Toolbar.Button>
            </TooltipTrigger>
            <TooltipContent sideOffset={8}>数学公式 (KaTeX)</TooltipContent>
          </Tooltip>
          <DropdownMenuContent align="start">
            <DropdownMenuLabel className="font-mono text-xs text-muted-foreground">KaTeX 公式</DropdownMenuLabel>
            {MATH_ITEMS.map((item) => (
              <DropdownMenuItem
                key={item.label}
                onSelect={() => insertSnippet(editor, item.before, item.after, item.block)}
              >
                {item.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <Toolbar.Button asChild>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label="MDX 组件"
                    disabled={disabled || !editor}
                    className="h-9 gap-1 px-2 text-muted-foreground hover:text-foreground"
                  >
                    <MessageSquareText />
                    <span className="hidden text-xs sm:inline">组件</span>
                    <ChevronDown className="size-3 opacity-60" />
                  </Button>
                </DropdownMenuTrigger>
              </Toolbar.Button>
            </TooltipTrigger>
            <TooltipContent sideOffset={8}>插入 Callout / Collapse 组件</TooltipContent>
          </Tooltip>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuLabel className="font-mono text-xs text-muted-foreground">MDX 提示与折叠</DropdownMenuLabel>
            {COMPONENT_ITEMS.slice(0, 4).map((item) => (
              <DropdownMenuItem
                key={item.label}
                onSelect={() => insertSnippet(editor, item.before, item.after, item.block)}
              >
                {item.label}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            {COMPONENT_ITEMS.slice(4).map((item) => (
              <DropdownMenuItem
                key={item.label}
                onSelect={() => insertSnippet(editor, item.before, item.after, item.block)}
              >
                {item.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <Toolbar.Separator className="mx-1 h-4 w-px bg-hair" />

        <Tooltip>
          <TooltipTrigger asChild>
            <Toolbar.Button asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="撤销"
                disabled={disabled || !editor}
                onClick={() => editor?.chain().focus().undo().run()}
                className="text-muted-foreground hover:text-foreground"
              >
                <Undo2 />
              </Button>
            </Toolbar.Button>
          </TooltipTrigger>
          <TooltipContent sideOffset={8}>撤销</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Toolbar.Button asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="重做"
                disabled={disabled || !editor}
                onClick={() => editor?.chain().focus().redo().run()}
                className="text-muted-foreground hover:text-foreground"
              >
                <Redo2 />
              </Button>
            </Toolbar.Button>
          </TooltipTrigger>
          <TooltipContent sideOffset={8}>重做</TooltipContent>
        </Tooltip>

        <div className="ml-auto">
          <Popover>
            <Tooltip>
              <TooltipTrigger asChild>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="快捷键参考"
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <Keyboard />
                  </Button>
                </PopoverTrigger>
              </TooltipTrigger>
              <TooltipContent sideOffset={8}>快捷键参考</TooltipContent>
            </Tooltip>
            <PopoverContent align="end" className="w-72 border-hair shadow-[var(--surface-shadow)]">
              <p className="mb-2.5 font-mono text-xs font-medium text-foreground">编辑器快捷键</p>
              <dl className="flex flex-col gap-2 text-xs">
                {SHORTCUTS.map((item) => (
                  <div key={item.keys} className="flex items-center justify-between gap-2">
                    <dt className="text-muted-foreground">{item.action}</dt>
                    <dd className="rounded border border-hair bg-muted/50 px-1.5 py-0.5 font-mono text-xs text-foreground">
                      {item.keys}
                    </dd>
                  </div>
                ))}
              </dl>
            </PopoverContent>
          </Popover>
        </div>
      </Toolbar.Root>

      <div
        ref={scrollRef}
        className={`overflow-auto overscroll-contain transition-[height] duration-200 ${
          focusMode ? 'h-[max(460px,calc(100dvh-16rem))]' : 'h-[max(460px,calc(100dvh-23rem))]'
        }`}
      >
        <EditorContent editor={editor} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-hair bg-muted/25 px-4 py-1.5 font-mono text-xs tabular-nums text-muted-foreground">
        <span>
          {telemetry.chars} 字符 · {telemetry.lines} 行
        </span>
        <span
          className={
            telemetry.ratio > 1
              ? 'font-medium text-destructive'
              : telemetry.ratio > 0.85
                ? 'text-amber-700 dark:text-amber-400'
                : ''
          }
        >
          {telemetry.kb} / 1024 KB
        </span>
      </div>
    </div>
  )
}
