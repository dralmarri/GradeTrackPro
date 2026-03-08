import { useRef } from "react";
import { Upload } from "lucide-react";
import { parseExcelFile } from "@/lib/excel";
import { toast } from "sonner";

interface ExcelImportProps {
  onImport: (names: string[]) => void;
}

export default function ExcelImport({ onImport }: ExcelImportProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const names = await parseExcelFile(file);
      if (names.length === 0) {
        toast.error("لم يتم العثور على أسماء في الملف");
        return;
      }
      onImport(names);
      toast.success(`تم إضافة ${names.length} طالب بنجاح`);
    } catch {
      toast.error("فشل في قراءة الملف");
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
        <Upload size={18} />
        استيراد Excel
      </button>
    </>
  );
}
