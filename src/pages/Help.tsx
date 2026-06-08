import { Link } from "react-router-dom";
import appIcon from "@/assets/app-icon.png";
import {
  ChevronLeft,
  UserPlus,
  BookOpen,
  Upload,
  UserCheck,
  Star,
  ClipboardList,
  BarChart3,
  Download,
  Settings as SettingsIcon,
  Cloud,
  HelpCircle,
  MessageSquare,
} from "lucide-react";

export default function Help() {
  const sections = [
    {
      icon: UserPlus,
      title: "١. إنشاء الحساب وتسجيل الدخول",
      items: [
        "افتح التطبيق واضغط «إنشاء حساب»",
        "أدخل بريدك الإلكتروني وكلمة مرور قوية (٦ أحرف فأكثر)",
        "في المرات القادمة استخدم «تسجيل الدخول» بنفس البريد",
        "نسيت كلمة المرور؟ اضغط «نسيت كلمة المرور؟» وسيصلك رابط إعادة التعيين على بريدك",
      ],
    },
    {
      icon: BookOpen,
      title: "٢. إنشاء مادة جديدة",
      items: [
        "اضغط زر «مادة جديدة» في الأعلى",
        "أدخل اسم المادة والشعبة (اختياري)",
        "حدد تاريخ بداية ونهاية الفصل الدراسي",
        "اختر أيام المحاضرات الأسبوعية ووقتها",
        "سيتم توليد قائمة المحاضرات تلقائياً حسب الفترة والأيام",
      ],
    },
    {
      icon: Upload,
      title: "٣. استيراد قائمة الطلبة",
      items: [
        "من نافذة إنشاء المادة، اضغط «استيراد كشف الطلبة»",
        "ارفع ملف Excel أو CSV يحتوي أسماء الطلبة",
        "يمكنك أيضاً إضافة الطلبة لاحقاً من «الإعدادات ← إدارة المقررات»",
        "سيتم ترتيب الأسماء أبجدياً تلقائياً",
      ],
    },
    {
      icon: UserCheck,
      title: "٤. تسجيل الحضور",
      items: [
        "افتح المادة واختر تبويب «الحضور»",
        "كل الطلبة حاضرون افتراضياً، اضغط على اسم الطالب لتغيير حالته",
        "تنقل بين المحاضرات بالأسهم أو القائمة المنسدلة",
        "ستظهر المحاضرة الأقرب لتاريخ اليوم تلقائياً",
      ],
    },
    {
      icon: Star,
      title: "٥. درجات المشاركة (البونص)",
      items: [
        "من تبويب «المشاركة» أضف درجات إضافية موجبة أو سالبة لكل طالب",
        "الدرجة الموجبة تظهر باللون الأخضر، والسالبة بالأحمر",
        "تُحسب درجة المشاركة تلقائياً = ١٠ − عدد الغيابات",
      ],
    },
    {
      icon: ClipboardList,
      title: "٦. درجات الاختبارات",
      items: [
        "من تبويب «الاختبارات» أضف اختباراً جديداً بدرجة قصوى",
        "أدخل درجات الطلبة، وسيتم ضبطها تلقائياً ضمن الحد الأقصى",
        "يمكنك تعديل أو حذف أي اختبار لاحقاً",
      ],
    },
    {
      icon: BarChart3,
      title: "٧. ملخص حالة الطالب",
      items: [
        "تبويب «الحالة» يعرض ملخصاً شاملاً لكل طالب",
        "تبويب «إحصاءات الحضور» يعرض الطلبة مرتبين حسب الغيابات",
      ],
    },
    {
      icon: Download,
      title: "٨. تصدير النتائج",
      items: [
        "اضغط زر التصدير لتنزيل ملف Excel بكل البيانات",
        "على الجوال يمكنك مشاركة الملف مباشرة",
      ],
    },
    {
      icon: Cloud,
      title: "٩. المزامنة السحابية",
      items: [
        "كل بياناتك تُحفظ تلقائياً في السحابة فور الإدخال",
        "تستطيع فتح حسابك من أي جهاز وستجد بياناتك محدّثة",
        "بيانات كل معلّم خاصة به ولا يطّلع عليها أحد",
      ],
    },
    {
      icon: SettingsIcon,
      title: "١٠. الإعدادات",
      items: [
        "من أيقونة الإعدادات تستطيع إدارة المقررات وتعديلها",
        "يمكنك حذف جميع البيانات لبدء فصل دراسي جديد",
        "سجل المراجعة يعرض كل التعديلات التي أجريتها",
      ],
    },
  ];

  return (
    <div dir="rtl" className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-5">
          <Link
            to="/"
            className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-muted"
          >
            <ChevronLeft size={20} className="rotate-180" />
          </Link>
          <div className="flex items-center gap-2">
            <HelpCircle className="text-primary" size={22} />
            <h1 className="font-display text-xl font-bold text-foreground">دليل الاستخدام</h1>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6">
        <div className="mb-6 flex flex-col items-center text-center">
          <img src={appIcon} alt="GradeTrackPro" className="mb-3 h-16 w-16 rounded-2xl shadow-md" />
          <h2 className="font-display text-lg font-bold">مرحباً بك في GradeTrackPro</h2>
          <p className="mt-1 max-w-md text-sm text-muted-foreground">
            دليل سريع لاستخدام التطبيق خطوة بخطوة. كل التغييرات تُحفظ تلقائياً، ولا حاجة لزر «حفظ».
          </p>
        </div>

        <div className="space-y-4">
          {sections.map(({ icon: Icon, title, items }) => (
            <section
              key={title}
              className="rounded-2xl border border-border bg-card p-5 shadow-sm"
            >
              <div className="mb-3 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon size={18} />
                </div>
                <h3 className="font-display text-base font-bold text-foreground">{title}</h3>
              </div>
              <ul className="space-y-2 pr-2">
                {items.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-foreground/90">
                    <span className="mt-1.5 inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary" />
                    <span className="leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <div className="mt-8 rounded-2xl border border-primary/20 bg-primary/5 p-5 text-center">
          <p className="text-sm font-medium text-foreground">
            هل تواجه مشكلة أو لديك اقتراح؟
          </p>
          <div className="mt-3 flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
            <a
              href={`mailto:dralmarri@gmail.com?subject=${encodeURIComponent("ملاحظات على تطبيق GradeTrackPro")}&body=${encodeURIComponent("اكتب ملاحظتك أو اقتراحك هنا:\n\n")}`}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 font-display text-sm font-semibold text-primary-foreground shadow-md transition-all hover:shadow-lg hover:brightness-110 active:scale-[0.98]"
            >
              <MessageSquare size={16} />
              إرسال ملاحظات
            </a>
            <Link
              to="/contact"
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-5 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
            >
              تواصل معنا
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
