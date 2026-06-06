'use client'

import { useState } from 'react'
import type { ToolRow } from '@/lib/types/freelancer-config'

type Props = {
  tools: ToolRow[]
  setTools: (tools: ToolRow[]) => void
  t: (key: string) => string
}

export function FreelancerToolsEditor({ tools, setTools, t }: Props) {
  const [pendingName, setPendingName] = useState('')

  function addPending() {
    const name = pendingName.trim()
    if (!name) return
    // Client-side case-insensitive dedup; the DB UNIQUE(freelancer_id, name)
    // is the authoritative guard.
    if (tools.some(tool => tool.name.toLowerCase() === name.toLowerCase())) {
      setPendingName('')
      return
    }
    setTools([...tools, { name }])
    setPendingName('')
  }

  function removeAt(idx: number) {
    setTools(tools.filter((_, i) => i !== idx))
  }

  return (
    <div className="space-y-3 border-t border-gray-100 pt-5">
      <div>
        <p className="text-sm font-medium text-gray-700">{t('freelance.section_tools')}</p>
        <p className="text-xs text-gray-400 mt-0.5">{t('freelance.hint_tools')}</p>
      </div>

      {tools.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {tools.map((tool, idx) => (
            <span key={tool.id || `new-${idx}`}
              className="flex items-center gap-1 bg-blue-50 text-blue-700 text-sm px-3 py-1 rounded-full">
              {tool.name}
              <button type="button" onClick={() => removeAt(idx)}
                aria-label={t('common.delete')} className="text-blue-400 hover:text-blue-700">×</button>
            </span>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <input
          type="text"
          value={pendingName}
          onChange={e => setPendingName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addPending() } }}
          placeholder={t('freelance.placeholder_tool_name')}
          className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button type="button" onClick={addPending}
          className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium px-3 py-2 rounded transition-colors whitespace-nowrap">
          {t('freelance.action_add_tool')}
        </button>
      </div>
    </div>
  )
}
