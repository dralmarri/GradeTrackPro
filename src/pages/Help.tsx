import { Link } from "react-router-dom";
import AppleLogo from "@/components/icons/AppleLogo";
import appIcon from "@/assets/app-icon.png";
import { useLanguage } from "@/hooks/useLanguage";
import { isNativeApp } from "@/lib/platform";
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
  Smartphone,

  Share,
  MoreVertical,
} from "lucide-react";
import type { ReactNode } from "react";

export default function Help() {
  const { lang, dir } = useLanguage();
  const ar = lang === "ar";

  const sections: { icon: any; title: string; items: ReactNode[] }[] = ar
    ? [
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
            "على الموبايل يمكنك مشاركة الملف مباشرة",
          ],
        },
        {
          icon: Cloud,
          title: "٩. المزامنة السحابية",
          items: [
            "كل بياناتك تُحفظ تلقائياً في السحابة فور الإدخال",
            "نفس الحساب يعمل على الويب وعلى تطبيق iOS من App Store — بياناتك متزامنة تلقائياً بين الجميع",
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
      ]
    : [
        {
          icon: UserPlus,
          title: "1. Create an account & sign in",
          items: [
            'Open the app and tap "Sign up"',
            "Enter your email and a strong password (6+ characters)",
            'Next time, use "Sign in" with the same email',
            'Forgot your password? Tap "Forgot password?" and a reset link will be sent to your email',
          ],
        },
        {
          icon: BookOpen,
          title: "2. Create a new course",
          items: [
            'Tap the "New course" button at the top',
            "Enter the course name and section (optional)",
            "Set the semester start and end dates",
            "Pick the weekly lecture days and time",
            "The lecture list is generated automatically based on the dates and days",
          ],
        },
        {
          icon: Upload,
          title: "3. Import the student list",
          items: [
            'From the course creation dialog, tap "Import students"',
            "Upload an Excel or CSV file containing the student names",
            'You can also add students later from "Settings → Manage courses"',
            "Names are sorted alphabetically automatically",
          ],
        },
        {
          icon: UserCheck,
          title: "4. Record attendance",
          items: [
            'Open the course and select the "Attendance" tab',
            "All students are present by default — tap a name to toggle",
            "Navigate between lectures using arrows or the dropdown",
            "The lecture closest to today's date is selected automatically",
          ],
        },
        {
          icon: Star,
          title: "5. Participation grades (bonus)",
          items: [
            'From the "Participation" tab, add positive or negative bonus to each student',
            "Positive values appear in green, negative in red",
            "Participation grade is computed automatically = 10 − absences",
          ],
        },
        {
          icon: ClipboardList,
          title: "6. Exam grades",
          items: [
            'From the "Exams" tab, add a new exam with a max grade',
            "Enter student scores — they are auto-clamped to the max",
            "You can edit or delete any exam later",
          ],
        },
        {
          icon: BarChart3,
          title: "7. Student status summary",
          items: [
            'The "Status" tab shows a complete summary for each student',
            'The "Attendance stats" tab lists students sorted by absences',
          ],
        },
        {
          icon: Download,
          title: "8. Export results",
          items: [
            "Tap the export button to download an Excel file with all data",
            "On mobile you can share the file directly",
          ],
        },
        {
          icon: Cloud,
          title: "9. Cloud sync",
          items: [
            "All your data is saved to the cloud the moment you enter it",
            "Open your account on any device and find your data up to date",
            "Each instructor's data is private — nobody else can see it",
          ],
        },
        {
          icon: SettingsIcon,
          title: "10. Settings",
          items: [
            "From the settings icon you can manage and edit your courses",
            "You can delete all data to start a new semester",
            "The audit log shows every change you made",
          ],
        },
      ];

  const installTitle = ar ? "تثبيت التطبيق كأيقونة على موبايلك" : "Install the app on your phone";
  const installIntro = ar
    ? "تستطيع إضافة GradeTrackPro كأيقونة على شاشة موبايلك ليفتح كتطبيق مستقل بدون شريط المتصفح."
    : "You can add GradeTrackPro as an icon on your phone's home screen so it opens like a standalone app.";
  const iosTitle = ar ? "على iPhone / iPad (Safari)" : "On iPhone / iPad (Safari)";
  const androidTitle = ar ? "على Android (Chrome)" : "On Android (Chrome)";
  const iosSteps: ReactNode[] = ar
    ? [
        "افتح الموقع gradetrackpro.com في متصفح Safari",
        <>
          اضغط زر المشاركة <Share size={14} className="inline align-text-bottom text-primary" /> في أسفل الشاشة
        </>,
        "اختر «إضافة إلى الشاشة الرئيسية» (Add to Home Screen)",
        "اضغط «إضافة» في الأعلى — ستظهر الأيقونة على شاشتك مباشرة",
      ]
    : [
        "Open gradetrackpro.com in Safari",
        <>
          Tap the share button <Share size={14} className="inline align-text-bottom text-primary" /> at the bottom
        </>,
        '"Add to Home Screen"',
        'Tap "Add" at the top — the icon will appear on your home screen',
      ];
  const androidSteps: ReactNode[] = ar
    ? [
        "افتح الموقع gradetrackpro.com في متصفح Chrome",
        <>
          اضغط زر القائمة <MoreVertical size={14} className="inline align-text-bottom text-primary" /> في أعلى يمين الشاشة
        </>,
        "اختر «تثبيت التطبيق» (Install app) أو «إضافة إلى الشاشة الرئيسية»",
        "أكّد الإضافة — ستظهر الأيقونة في قائمة تطبيقاتك",
      ]
    : [
        "Open gradetrackpro.com in Chrome",
        <>
          Tap the menu <MoreVertical size={14} className="inline align-text-bottom text-primary" /> at the top right
        </>,
        '"Install app" or "Add to Home Screen"',
        "Confirm — the icon will appear in your app drawer",
      ];

  return (
    <div dir={dir} className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-5">
          <Link
            to="/"
            className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-muted"
          >
            <ChevronLeft size={20} className={dir === "rtl" ? "rotate-180" : ""} />
          </Link>
          <div className="flex items-center gap-2">
            <HelpCircle className="text-primary" size={22} />
            <h1 className="font-display text-xl font-bold text-foreground">
              {ar ? "دليل الاستخدام" : "User guide"}
            </h1>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6">
        <div className="mb-6 flex flex-col items-center text-center">
          <img src={appIcon} alt="GradeTrackPro" className="mb-3 h-16 w-16 rounded-2xl shadow-md" />
          <h2 className="font-display text-lg font-bold">
            {ar ? "مرحباً بك في GradeTrackPro" : "Welcome to GradeTrackPro"}
          </h2>
          <p className="mt-1 max-w-md text-sm text-muted-foreground">
            {ar
              ? "دليل سريع لاستخدام التطبيق خطوة بخطوة. كل التغييرات تُحفظ تلقائياً، ولا حاجة لزر «حفظ»."
              : "A quick step-by-step guide to using the app. Everything is auto-saved — no save button needed."}
          </p>
        </div>

        <div className="space-y-4">
          {sections.map(({ icon: Icon, title, items }) => (
            <section key={title} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <div className="mb-3 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon size={18} />
                </div>
                <h3 className="font-display text-base font-bold text-foreground">{title}</h3>
              </div>
              <ul className="space-y-2 px-2">
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

        <section className="mt-6 rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Smartphone size={18} />
            </div>
            <h3 className="font-display text-base font-bold text-foreground">{installTitle}</h3>
          </div>
          <p className="mb-4 text-xs leading-relaxed text-muted-foreground">{installIntro}</p>

          {/* App Store availability */}
          <a
            href="https://apps.apple.com/kw/app/gradetrackpro/id6778925716"
            target="_blank"
            rel="noopener noreferrer"
            className="mb-4 flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 p-4 transition-colors hover:bg-primary/10"
          >
            <AppleLogo size={28} className="shrink-0 text-foreground" />
            <div className="flex-1 text-right">
              <h4 className="font-display text-sm font-bold text-foreground">
                {ar ? "متوفر الآن على App Store" : "Now available on the App Store"}
              </h4>
              <p className="mt-0.5 text-[12px] leading-relaxed text-muted-foreground">
                {ar
                  ? "حمّل GradeTrackPro كتطبيق أصلي من متجر آبل لأجهزة iPhone و iPad."
                  : "Download GradeTrackPro as a native app from the Apple App Store for iPhone and iPad."}
              </p>
              <span className="mt-1 inline-block text-[11px] font-semibold text-primary">
                {ar ? "اضغط هنا للتحميل ←" : "Tap to download →"}
              </span>
            </div>
          </a>

          <p className="mb-3 text-[11px] font-semibold text-muted-foreground">
            {ar
              ? "لمستخدمي iPhone: التحميل من App Store هو الخيار الموصى به. الخطوات التالية بديل عبر متصفح Safari فقط:"
              : "For iPhone users: downloading from the App Store is the recommended option. The steps below are only a fallback via Safari:"}
          </p>

          <div className="mb-4 rounded-xl border border-border bg-background p-4">
            <div className="mb-2 flex items-center gap-2">
              <AppleLogo size={18} className="text-foreground" />
              <h4 className="font-display text-sm font-bold">{iosTitle}</h4>
            </div>


            <ol className="space-y-2 px-2">
              {iosSteps.map((step, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-foreground/90">
                  <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
                    {i + 1}
                  </span>
                  <span className="leading-relaxed">{step}</span>
                </li>
              ))}
            </ol>
          </div>

          {!isNativeApp() && (
            <div className="rounded-xl border border-border bg-background p-4">
              <div className="mb-2 flex items-center gap-2">
                <Smartphone size={18} className="text-foreground" />
                <h4 className="font-display text-sm font-bold">{androidTitle}</h4>
              </div>
              <ol className="space-y-2 px-2">
                {androidSteps.map((step, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-foreground/90">
                    <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
                      {i + 1}
                    </span>
                    <span className="leading-relaxed">{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
            {ar
              ? "💡 بعد التثبيت، سيفتح التطبيق بملء الشاشة كأي تطبيق آخر — نفس البيانات ونفس الحساب."
              : "💡 After installing, the app opens full-screen like any native app — same data, same account."}
          </p>
        </section>

        <div className="mt-8 rounded-2xl border border-primary/20 bg-primary/5 p-5 text-center">
          <p className="text-sm font-medium text-foreground">
            {ar ? "هل تواجه مشكلة أو لديك اقتراح؟" : "Having an issue or have a suggestion?"}
          </p>
          <div className="mt-3 flex justify-center">
            <Link
              to="/contact"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 font-display text-sm font-semibold text-primary-foreground shadow-md transition-all hover:shadow-lg hover:brightness-110 active:scale-[0.98]"
            >
              <MessageSquare size={16} />
              {ar ? "تواصل معنا" : "Contact us"}
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
