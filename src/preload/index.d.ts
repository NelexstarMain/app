import { IElectronAPI } from '../shared/ipc/contracts'

declare global {
  interface Window {
    electronAPI: IElectronAPI
  }
}
