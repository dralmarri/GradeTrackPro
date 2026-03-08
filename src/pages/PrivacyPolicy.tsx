import { ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function PrivacyPolicy() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-5">
          <button
            onClick={() => navigate(-1)}
            className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-muted"
          >
            <ChevronLeft size={20} className="rotate-180" />
          </button>
          <h1 className="font-display text-xl font-bold text-foreground">سياسة الخصوصية</h1>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8 space-y-6 text-sm leading-relaxed text-foreground" dir="rtl">
        <p className="text-muted-foreground">آخر تحديث: مارس 2026</p>

        <section className="space-y-2">
          <h2 className="font-display text-lg font-bold">مقدمة</h2>
          <p>مرحباً بكم في تطبيق <strong>GradeTrackPro</strong>. نحن نحترم خصوصيتكم ونلتزم بحماية بياناتكم الشخصية. توضح هذه السياسة كيفية جمع واستخدام وحماية معلوماتكم.</p>
        </section>

        <section className="space-y-2">
          <h2 className="font-display text-lg font-bold">البيانات التي نجمعها</h2>
          <ul className="list-disc pr-6 space-y-1">
            <li>بيانات المقررات الدراسية (أسماء المواد، الشُعب، جداول المحاضرات)</li>
            <li>بيانات الطلاب (الأسماء، الدرجات، البونص)</li>
            <li>إعدادات التطبيق والتفضيلات</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="font-display text-lg font-bold">كيفية تخزين البيانات</h2>
          <p>جميع البيانات تُخزّن محلياً على جهازك فقط باستخدام تقنية التخزين المحلي (Local Storage). لا يتم إرسال أي بيانات إلى خوادم خارجية أو أطراف ثالثة.</p>
        </section>

        <section className="space-y-2">
          <h2 className="font-display text-lg font-bold">حماية البيانات</h2>
          <p>نحن نتخذ التدابير المناسبة لحماية بياناتكم، بما في ذلك:</p>
          <ul className="list-disc pr-6 space-y-1">
            <li>التخزين المحلي على الجهاز فقط</li>
            <li>عدم مشاركة البيانات مع أي طرف ثالث</li>
            <li>إمكانية حذف جميع البيانات في أي وقت من الإعدادات</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="font-display text-lg font-bold">حقوقكم</h2>
          <ul className="list-disc pr-6 space-y-1">
            <li>الوصول إلى بياناتكم وتصديرها في أي وقت</li>
            <li>تعديل أو حذف أي بيانات مُخزّنة</li>
            <li>حذف جميع البيانات نهائياً من الإعدادات</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="font-display text-lg font-bold">التواصل</h2>
          <p>لأي استفسارات أو ملاحظات حول سياسة الخصوصية، يرجى التواصل عبر البريد الإلكتروني:</p>
          <a href="mailto:dralmarri@gmail.com" className="font-medium text-primary hover:underline">
            dralmarri@gmail.com
          </a>
        </section>

        <section className="space-y-2">
          <h2 className="font-display text-lg font-bold">تحديثات السياسة</h2>
          <p>قد نقوم بتحديث هذه السياسة من وقت لآخر. سيتم نشر أي تغييرات على هذه الصفحة مع تحديث تاريخ آخر تعديل.</p>
        </section>
      </main>
    </div>
  );
}
