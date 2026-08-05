declare module "@tauri-apps/plugin-dialog" {
  export interface DialogFilter {
    name?: string
    extensions: string[]
  }

  export interface OpenDialogOptions {
    directory?: boolean
    multiple?: boolean
    recursive?: boolean
    title?: string
    defaultPath?: string
    filters?: DialogFilter[]
  }

  export interface SaveDialogOptions {
    title?: string
    defaultPath?: string
    filters?: DialogFilter[]
  }

  export function open(options?: OpenDialogOptions): Promise<string | string[] | null>

  export function save(options?: SaveDialogOptions): Promise<string | null>
}
