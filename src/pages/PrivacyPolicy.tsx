import { ChevronLeft } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";

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
        <p className="text-muted-foreground">آخر تحديث: يونيو 2026</p>

        <section className="space-y-2">
          <h2 className="font-display text-lg font-bold">مقدمة</h2>
          <p>مرحباً بكم في تطبيق <strong>GradeTrackPro</strong>. نحن نحترم خصوصيتكم ونلتزم بحماية بياناتكم الشخصية. توضح هذه السياسة كيفية جمع واستخدام وحماية معلوماتكم.</p>
        </section>

        <section className="space-y-2">
          <h2 className="font-display text-lg font-bold">الحساب وتسجيل الدخول</h2>
          <p>يتطلب التطبيق إنشاء حساب وتسجيل الدخول للوصول إلى بياناتكم ومزامنتها بين أجهزتكم. نقوم بجمع بريدكم الإلكتروني وكلمة المرور (مُشفّرة) لأغراض المصادقة فقط.</p>
        </section>

        <section className="space-y-2">
          <h2 className="font-display text-lg font-bold">البيانات التي نجمعها</h2>
          <ul className="list-disc pr-6 space-y-1">
            <li>بيانات الحساب: البريد الإلكتروني المستخدم لتسجيل الدخول</li>
            <li>بيانات المقررات الدراسية (أسماء المواد، الشُعب، جداول المحاضرات)</li>
            <li>بيانات الطلاب (الأسماء، الدرجات، الحضور، البونص، الملاحظات)</li>
            <li>نتائج الاختبارات المُستوردة من ملفات Excel</li>
            <li>إعدادات التطبيق والتفضيلات</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="font-display text-lg font-bold">كيفية تخزين البيانات</h2>
          <p>تُخزَّن بياناتكم بشكل آمن في قاعدة بيانات سحابية (Lovable Cloud / Supabase) لتمكين المزامنة الفورية بين أجهزتكم المختلفة. كل مستخدم لا يستطيع الوصول إلا إلى بياناته الخاصة فقط عبر سياسات أمان صارمة (Row-Level Security).</p>
          <p>قد يحتفظ التطبيق بنسخة مؤقتة من بعض البيانات على جهازكم لتحسين الأداء والعمل دون اتصال.</p>
        </section>

        <section className="space-y-2">
          <h2 className="font-display text-lg font-bold">استيراد ملفات Excel</h2>
          <p>عند استيراد قوائم الطلاب أو نتائج الاختبارات من ملفات Excel، تتم معالجة الملف محلياً على جهازكم فقط، ولا يتم رفع الملف الأصلي إلى أي خادم. تُحفظ فقط البيانات النهائية (الأسماء والدرجات) في حسابكم السحابي.</p>
        </section>

        <section className="space-y-2">
          <h2 className="font-display text-lg font-bold">حماية البيانات</h2>
          <p>نحن نتخذ التدابير المناسبة لحماية بياناتكم، بما في ذلك:</p>
          <ul className="list-disc pr-6 space-y-1">
            <li>تشفير الاتصال بين التطبيق والخادم (HTTPS)</li>
            <li>عزل بيانات كل مستخدم عبر سياسات أمان على مستوى الصف (RLS)</li>
            <li>عدم مشاركة البيانات مع أي طرف ثالث لأغراض تسويقية أو إعلانية</li>
            <li>إمكانية تصدير بياناتكم أو حذفها في أي وقت</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="font-display text-lg font-bold">حقوقكم</h2>
          <ul className="list-disc pr-6 space-y-1">
            <li>الوصول إلى بياناتكم وتصديرها بصيغة Excel في أي وقت</li>
            <li>تعديل أو حذف أي بيانات مُخزّنة</li>
            <li>إعادة تعيين الفصل الدراسي وحذف بياناته</li>
            <li>طلب حذف الحساب وجميع البيانات المرتبطة به نهائياً</li>
          </ul>
        </section>


        <section className="space-y-2">
          <h2 className="font-display text-lg font-bold">التواصل</h2>
          <p>
            لأي استفسارات أو ملاحظات حول سياسة الخصوصية، يرجى التواصل عبر{" "}
            <Link to="/contact" className="font-medium text-primary hover:underline">
              صفحة تواصل معنا
            </Link>
            .
          </p>
        </section>


        <section className="space-y-2">
          <h2 className="font-display text-lg font-bold">تحديثات السياسة</h2>
          <p>قد نقوم بتحديث هذه السياسة من وقت لآخر. سيتم نشر أي تغييرات على هذه الصفحة مع تحديث تاريخ آخر تعديل.</p>
        </section>
      </main>
    </div>
  );
}
