import { useState } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useTranslation } from "@/i18n/translations";
import { Upload, Download } from "lucide-react";
import { ImportSection } from "@/components/import-export/ImportSection";
import { ExportSection } from "@/components/import-export/ExportSection";

type Tab = "import" | "export";

export function ImportExportPage() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>("import");

  return (
    <div className="flex flex-col h-full">
      <Topbar title={t("import-export")} subtitle={t("importExportSubtitle")} />
      <div className="flex-1 overflow-y-auto p-6">
        <Tabs value={tab} onValueChange={(val) => setTab(val as Tab)}>
          <TabsList className="group-data-horizontal/tabs:h-10">
            <TabsTrigger
              value="import"
              className="text-xs font-semibold px-4 cursor-pointer gap-1.5"
            >
              <Upload className="w-3.5 h-3.5" />
              {t("import")}
            </TabsTrigger>
            <TabsTrigger
              value="export"
              className="text-xs font-semibold px-4 cursor-pointer gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              {t("export")}
            </TabsTrigger>
          </TabsList>

          <TabsContent
            value="import"
            className="m-0 focus-visible:outline-none max-w-2xl space-y-4"
          >
            <ImportSection />
          </TabsContent>

          <TabsContent
            value="export"
            className="m-0 focus-visible:outline-none max-w-2xl space-y-4"
          >
            <ExportSection />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
