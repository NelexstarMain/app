import { contextBridge, ipcRenderer } from 'electron'
import { IpcContracts } from '../shared/ipc/contracts'

const api = {
  invoke: async <K extends keyof IpcContracts>(
    channel: K,
    payload: IpcContracts[K]['request']
  ): Promise<IpcContracts[K]['response']> => {
    return await ipcRenderer.invoke(channel, payload)
  },

  onEvent: (channel: string, listener: (event: any, ...args: any[]) => void): (() => void) => {
    const handler = (event: any, ...args: any[]) => listener(event, ...args)
    ipcRenderer.on(channel, handler)
    return () => {
      ipcRenderer.removeListener(channel, handler)
    }
  }
}

try {
  contextBridge.exposeInMainWorld('electronAPI', api)
} catch (error) {
  console.error('Failed to expose electronAPI via contextBridge:', error)
}
