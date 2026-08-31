import React from 'react'
import { FolderOpen } from 'lucide-react'
import { IpcChannel } from '../../../../shared/ipc/channels'

interface Props {
  onWorkspaceSelected: (path: string) => void
}

export const WorkspaceSelector: React.FC<Props> = ({ onWorkspaceSelected }) => {
  const handleOpenFolder = async () => {
    try {
      const res = await window.electronAPI.invoke(IpcChannel.WORKSPACE_SELECT, undefined)
      if (res.path) onWorkspaceSelected(res.path)
    } catch (err) {
      console.error('Failed to select workspace:', err)
    }
  }

  return (
    <div className="h-full w-full flex items-center justify-center bg-[#0B0C0E] select-none text-xs">
      <div className="max-w-md w-full mx-4 p-8 rounded-xl bg-[#141519] border border-[#22242b] shadow-2xl text-center">
        <div className="w-10 h-10 rounded-lg bg-[#1b1c22] border border-[#2d2f38] flex items-center justify-center text-sm font-bold text-[#D8DAE0] mx-auto mb-4">
          CC
        </div>

        <h1 className="text-base font-semibold text-[#D8DAE0] mb-1">
          CogniCanvas <span className="text-[#4A6B8A] font-mono text-xs">v1.4</span>
        </h1>
        <p className="text-[#727683] text-xs mb-6 leading-relaxed">
          Wizualna tablica wiedzy i system nauki Local-First.
        </p>

        <button
          onClick={handleOpenFolder}
          className="w-full py-2.5 px-4 rounded-lg bg-[#1b1c22] hover:bg-[#22242b] border border-[#2d2f38] text-[#D8DAE0] text-xs font-medium transition-colors flex items-center justify-center gap-2 cursor-pointer"
        >
          <FolderOpen className="w-4 h-4 text-[#4A6B8A]" />
          <span>Otwórz katalog bazy wiedzy</span>
        </button>

        <div className="mt-4 text-[10px] text-[#4B4E58]">
          Wybierz dowolny folder. Struktura <code className="text-[#727683]">.workspace/</code> zostanie zainicjalizowana automatycznie.
        </div>
      </div>
    </div>
  )
}
