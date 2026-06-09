import { ChevronLeft } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";

export default function TermsOfUse() {
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
          <h1 className="font-display text-xl font-bold text-foreground">شروط الاستخدام</h1>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8 space-y-6 text-sm leading-relaxed text-foreground" dir="rtl">
        <p className="text-muted-foreground">آخر تحديث: يونيو 2026</p>

        <section className="space-y-2">
          <h2 className="font-display text-lg font-bold">القبول بالشروط</h2>
          <p>باستخدامك لتطبيق <strong>GradeTrackPro</strong>، فإنك توافق على الالتزام بهذه الشروط والأحكام. إذا لم توافق على أي من هذه الشروط، يرجى عدم استخدام التطبيق.</p>
        </section>

        <section className="space-y-2">
          <h2 className="font-display text-lg font-bold">الحساب وتسجيل الدخول</h2>
          <ul className="list-disc pr-6 space-y-1">
            <li>يتطلب استخدام التطبيق إنشاء حساب وتسجيل الدخول ببريد إلكتروني وكلمة مرور</li>
            <li>أنت مسؤول عن الحفاظ على سرية بيانات حسابك وعدم مشاركتها مع الآخرين</li>
            <li>تتم مزامنة بياناتك تلقائياً عبر السحابة بين أجهزتك المختلفة</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="font-display text-lg font-bold">وصف الخدمة</h2>
          <p>GradeTrackPro هو تطبيق لإدارة درجات الطلاب يتيح للمعلمين وأعضاء هيئة التدريس:</p>
          <ul className="list-disc pr-6 space-y-1">
            <li>إنشاء وإدارة المقررات الدراسية والشُعب وجداول المحاضرات</li>
            <li>تسجيل حضور المحاضرات وإدارة درجات البونص</li>
            <li>إدخال درجات الاختبارات والمشاركة والواجبات يدوياً أو عبر استيراد ملفات Excel</li>
            <li>استيراد قوائم الطلاب من Excel ومطابقتها بالأسماء تلقائياً</li>
            <li>تصدير النتائج كاملة بصيغة Excel</li>
            <li>متابعة وضع كل طالب ونتائجه عبر جميع الأجهزة بشكل فوري</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="font-display text-lg font-bold">مسؤولية المستخدم</h2>
          <ul className="list-disc pr-6 space-y-1">
            <li>أنت المسؤول الوحيد عن دقة البيانات المُدخلة ومراجعتها قبل اعتمادها</li>
            <li>عند استيراد ملفات Excel، يجب التحقق من مطابقة الأسماء والدرجات قبل الحفظ</li>
            <li>يُنصح بتصدير نسخ احتياطية دورية من بياناتك</li>
            <li>يجب استخدام التطبيق للأغراض التعليمية المشروعة فقط</li>
            <li>يجب الحفاظ على سرية بيانات الطلاب وعدم مشاركتها مع أطراف غير مخوّلة</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="font-display text-lg font-bold">إخلاء المسؤولية</h2>
          <ul className="list-disc pr-6 space-y-1">
            <li>التطبيق مُقدّم "كما هو" دون أي ضمانات صريحة أو ضمنية</li>
            <li>لا نضمن توفر الخدمة بشكل متواصل دون انقطاع أو خلوها من الأخطاء</li>
            <li>لا نتحمل مسؤولية فقدان البيانات الناتج عن سوء الاستخدام أو أعطال الخدمة السحابية أو الجهاز</li>
            <li>لا نتحمل مسؤولية أي أخطاء في احتساب الدرجات ناتجة عن إدخال بيانات خاطئة أو ملف Excel غير صحيح</li>
          </ul>
        </section>


        <section className="space-y-2">
          <h2 className="font-display text-lg font-bold">الملكية الفكرية</h2>
          <p>جميع حقوق الملكية الفكرية للتطبيق محفوظة. لا يجوز نسخ أو تعديل أو توزيع التطبيق أو أي جزء منه دون إذن كتابي مسبق.</p>
        </section>

        <section className="space-y-2">
          <h2 className="font-display text-lg font-bold">تعديل الشروط</h2>
          <p>نحتفظ بالحق في تعديل هذه الشروط في أي وقت. ستُنشر التعديلات على هذه الصفحة مع تحديث التاريخ.</p>
        </section>

        <section className="space-y-2">
          <h2 className="font-display text-lg font-bold">التواصل</h2>
          <p>
            لأي استفسارات حول شروط الاستخدام، يرجى زيارة{" "}
            <Link to="/contact" className="font-medium text-primary hover:underline">
              صفحة تواصل معنا
            </Link>
            .
          </p>
        </section>
      </main>
    </div>
  );
}
