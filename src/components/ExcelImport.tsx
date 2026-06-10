import { useRef } from "react";
import { Download } from "lucide-react";
import { parseExcelFile } from "@/lib/excel";
import { toast } from "sonner";
import { useLanguage } from "@/hooks/useLanguage";
import { tf } from "@/lib/translations";

interface ExcelImportProps {
  onImport: (names: string[]) => void;
}

export default function ExcelImport({ onImport }: ExcelImportProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { t } = useLanguage();

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const names = await parseExcelFile(file);
      if (names.length === 0) {
        toast.error(t("noNamesFound"));
        return;
      }
      onImport(names);
      toast.success(tf(t("studentsAdded"), { n: names.length }));
    } catch {
      toast.error(t("fileReadFailed"));
    }

    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        className="hidden"
        onChange={handleFile}
      />
      <button
        onClick={() => inputRef.current?.click()}
        className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 font-display text-sm font-semibold text-primary-foreground shadow-md transition-all hover:shadow-lg hover:brightness-110 active:scale-[0.98]"
      >
        <Download size={18} />
        {t("importExcel")}
      </button>
    </>
  );
}
