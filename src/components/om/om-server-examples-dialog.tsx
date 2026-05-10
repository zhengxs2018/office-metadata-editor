import React from "react"
import { Copy } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export interface ServerExamplesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  bindAddress: string
  port: string
}

export const ServerExamplesDialog: React.FC<ServerExamplesDialogProps> = ({
  open,
  onOpenChange,
  bindAddress,
  port,
}) => {
  const examples = {
    curl: `curl -X POST http://${bindAddress}:${port}/request \\
  -H "Content-Type: application/json" \\
  -d '{
    "source": "curl",
    "templateId": "tpl_1741234567890",
    "metadataOverrides": {
      "documentProperties": { "creator": "品牌部", "source": "curl" },
      "appProperties": { "company": "ACME Corp" }
    },
    "filePaths": ["/Users/demo/a.docx", "/Users/demo/b.xlsx"]
  }'`,
    node: `await emit("ome://service/request", {
  source: "node",
  templateId: "tpl_1741234567890",
  metadataOverrides: {
    documentProperties: { creator: "研发中心" },
  },
  filePaths: ["/Users/demo/a.docx", "/Users/demo/b.xlsx"],
})`,
    payload: `{
  "source": "external",
  "templateId": "tpl_1741234567890",
  "metadataOverrides": {
    "documentProperties": {
      "creator": "法务部",
      "source": "external"
    }
  },
  "filePaths": ["/Users/demo/a.docx", "/Users/demo/b.xlsx"]
}`,
  }

  const copyText = async (value: string) => {
    await navigator.clipboard.writeText(value)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="min-w-120">
        <DialogHeader>
          <DialogTitle>调用示例</DialogTitle>
          <DialogDescription>
            使用事件 ome://service/request 推送文件列表，下面提供不同调用方式的示例。
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="payload" className="w-full overflow-hidden">
          <TabsList variant="line" className="w-full justify-start p-0">
            <TabsTrigger value="payload">Payload</TabsTrigger>
            <TabsTrigger value="curl">cURL</TabsTrigger>
            <TabsTrigger value="node">Node.js</TabsTrigger>
          </TabsList>

          <TabsContent value="payload" className="mt-4">
            <ExampleCodeBlock label="Payload 结构" value={examples.payload} onCopy={copyText} />
          </TabsContent>
          <TabsContent value="curl" className="mt-4">
            <ExampleCodeBlock label="命令行调用" value={examples.curl} onCopy={copyText} />
          </TabsContent>
          <TabsContent value="node" className="mt-4">
            <ExampleCodeBlock
              label="Node.js / Tauri 事件调用"
              value={examples.node}
              onCopy={copyText}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

interface ExampleCodeBlockProps {
  label: string
  value: string
  onCopy: (value: string) => Promise<void>
}

const ExampleCodeBlock: React.FC<ExampleCodeBlockProps> = ({ label, value, onCopy }) => {
  return (
    <div className="w-full">
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <Button variant="outline" size="sm" onClick={() => void onCopy(value)} className="gap-1.5">
          <Copy className="h-3.5 w-3.5" />
          复制
        </Button>
      </div>
      <pre className="block overflow-x-auto rounded-lg bg-muted/55 p-4 text-xs leading-6 whitespace-pre text-foreground">
        <code>{value}</code>
      </pre>
    </div>
  )
}

export default ServerExamplesDialog
