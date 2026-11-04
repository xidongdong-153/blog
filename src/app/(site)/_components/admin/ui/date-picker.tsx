'use client'

import { format, isValid, parseISO } from 'date-fns'
import { CalendarDays } from 'lucide-react'
import { useState } from 'react'
import { zhCN } from 'react-day-picker/locale'
import { formatDate } from '@/lib/date'
import { Button } from './button'
import { Calendar } from './calendar'
import { Popover, PopoverContent, PopoverTrigger } from './popover'

export function DatePicker({
  id,
  value,
  onValueChange,
  disabled,
  required = false,
}: {
  id: string
  value: string
  onValueChange: (value: string) => void
  disabled?: boolean
  required?: boolean
}) {
  const [open, setOpen] = useState(false)
  const parsed = value ? parseISO(value) : undefined
  const selected = parsed && isValid(parsed) ? parsed : undefined
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant="outline"
          disabled={disabled}
          aria-describedby={`${id}-value`}
          className="w-full justify-between font-normal"
        >
          <span id={`${id}-value`} className={value ? '' : 'text-muted-foreground'}>
            {value ? formatDate(value) : '选择日期'}
          </span>
          <CalendarDays className="text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0" collisionPadding={8}>
        <Calendar
          mode="single"
          locale={zhCN}
          selected={selected}
          defaultMonth={selected}
          autoFocus
          onSelect={(date) => {
            if (!date && required) return
            onValueChange(date ? format(date, 'yyyy-MM-dd') : '')
            setOpen(false)
          }}
        />
        <div className="flex items-center justify-between gap-2 border-t border-border p-2">
          <Button
            variant="ghost"
            onClick={() => {
              onValueChange(format(new Date(), 'yyyy-MM-dd'))
              setOpen(false)
            }}
          >
            今天
          </Button>
          {!required && (
            <Button
              variant="ghost"
              disabled={!value}
              onClick={() => {
                onValueChange('')
                setOpen(false)
              }}
            >
              清除
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
