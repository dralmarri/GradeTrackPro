import { ChevronLeft } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { useLanguage } from "@/hooks/useLanguage";

export default function DeleteAccount() {
  const navigate = useNavigate();
  const { lang, dir } = useLanguage();
  const ar = lang === "ar";

  const sections = ar
    ? [
        {
          h: "حذف حسابك وبياناتك",
          body: (
            <p>
              يوفّر تطبيق <strong>GradeTrackPro</strong> لمستخدميه إمكانية حذف حساباتهم وجميع البيانات
              المرتبطة بها نهائياً في أي وقت. توضّح هذه الصفحة الخطوات اللازمة لذلك.
            </p>
          ),
        },
        {
          h: "الحذف من داخل التطبيق (الطريقة الموصى بها)",
          body: (
            <ol className="list-decimal ps-6 space-y-1">
              <li>سجّل الدخول إلى حسابك في تطبيق GradeTrackPro.</li>
              <li>افتح صفحة <strong>الإعدادات</strong> (Settings).</li>
              <li>انتقل إلى قسم <strong>«حذف الحساب»</strong> في أسفل الصفحة.</li>
              <li>اضغط على زر <strong>«حذف حسابي نهائياً»</strong>.</li>
              <li>أكّد العملية عند ظهور رسالة التأكيد.</li>
            </ol>
          ),
        },
        {
          h: "طلب الحذف عبر البريد الإلكتروني",
          body: (
            <p>
              إذا تعذّر عليك الدخول إلى حسابك، يمكنك طلب حذف الحساب مباشرةً بالضغط على الزر أدناه، وسيُفتح
              بريد إلكتروني جاهز للإرسال من عنوانك المسجّل. سنعالج طلبك خلال مدة أقصاها 30 يوماً.
              <div className="pt-3">
                <a
                  href="mailto:dralmarri@gmail.com?subject=%D8%B7%D9%84%D8%A8%20%D8%AD%D8%B0%D9%81%20%D8%AD%D8%B3%D8%A7%D8%A8%20GradeTrackPro&body=%D8%A7%D9%84%D8%B1%D8%AC%D8%A7%D8%A1%20%D8%AD%D8%B0%D9%81%20%D8%AD%D8%B3%D8%A7%D8%A8%D9%8A%20%D9%88%D8%AC%D9%85%D9%8A%D8%B9%20%D8%A8%D9%8A%D8%A7%D9%86%D8%A7%D8%AA%D9%8A%20%D9%86%D9%87%D8%A7%D8%A6%D9%8A%D8%A7%D9%8B%20%D9%85%D9%86%20GradeTrackPro.%0A%0A%D8%A7%D9%84%D8%A8%D8%B1%D9%8A%D8%AF%20%D8%A7%D9%84%D9%85%D8%B3%D8%AC%D9%84%20%D9%81%D9%8A%20%D8%AD%D8%B3%D8%A7%D8%A8%D9%8A:%20"
                  className="inline-flex items-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                >
                  طلب حذف الحساب عبر البريد الإلكتروني
                </a>
              </div>
              <p className="pt-2 text-xs text-muted-foreground">
                أو راسلنا مباشرة على <strong>dralmarri@gmail.com</strong>، أو عبر{" "}
                <Link to="/contact" className="font-medium text-primary hover:underline">
                  صفحة تواصل معنا
                </Link>
                .
              </p>
            </p>
          ),
        },
        {
          h: "ما الذي يتم حذفه",
          body: (
            <ul className="list-disc ps-6 space-y-1">
              <li>بيانات الحساب (البريد الإلكتروني وبيانات تسجيل الدخول)</li>
              <li>جميع المقررات الدراسية والشُعب وجداول المحاضرات</li>
              <li>جميع بيانات الطلاب (الأسماء، الدرجات، الحضور، البونص، الملاحظات)</li>
              <li>نتائج الاختبارات وإعدادات التطبيق والتفضيلات</li>
            </ul>
          ),
        },
        {
          h: "فترة الاحتفاظ",
          body: (
            <p>
              يتم حذف بياناتك بشكل فوري ودائم من خوادمنا عند تأكيد الحذف من داخل التطبيق، ولا يمكن
              استعادتها. لا نحتفظ بأي نسخة من بياناتك بعد الحذف، باستثناء ما قد يكون مطلوباً قانونياً.
            </p>
          ),
        },
      ]
    : [
        {
          h: "Delete your account and data",
          body: (
            <p>
              <strong>GradeTrackPro</strong> lets you permanently delete your account and all associated
              data at any time. This page explains how to do that.
            </p>
          ),
        },
        {
          h: "Delete from within the app (recommended)",
          body: (
            <ol className="list-decimal ps-6 space-y-1">
              <li>Sign in to your account in the GradeTrackPro app.</li>
              <li>Open the <strong>Settings</strong> page.</li>
              <li>Scroll to the <strong>“Delete account”</strong> section at the bottom.</li>
              <li>Tap the <strong>“Delete my account permanently”</strong> button.</li>
              <li>Confirm when the confirmation dialog appears.</li>
            </ol>
          ),
        },
        {
          h: "Request deletion by email",
          body: (
            <p>
              If you cannot sign in, you can request account deletion right away by tapping the button
              below — it will open a pre-filled email from your registered address. We will process your
              request within 30 days at most.
              <div className="pt-3">
                <a
                  href="mailto:dralmarri@gmail.com?subject=GradeTrackPro%20Account%20Deletion%20Request&body=I%20would%20like%20to%20permanently%20delete%20my%20GradeTrackPro%20account%20and%20all%20associated%20data.%0A%0AAccount%20email%3A%20"
                  className="inline-flex items-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                >
                  Request account deletion by email
                </a>
              </div>
              <p className="pt-2 text-xs text-muted-foreground">
                Or email us directly at <strong>dralmarri@gmail.com</strong>, or via our{" "}
                <Link to="/contact" className="font-medium text-primary hover:underline">
                  contact page
                </Link>
                .
              </p>
            </p>
          ),
        },
        {
          h: "What gets deleted",
          body: (
            <ul className="list-disc ps-6 space-y-1">
              <li>Account data (email and sign-in details)</li>
              <li>All courses, sections, and lecture schedules</li>
              <li>All student data (names, grades, attendance, bonus, notes)</li>
              <li>Exam results, app settings, and preferences</li>
            </ul>
          ),
        },
        {
          h: "Retention period",
          body: (
            <p>
              Your data is deleted immediately and permanently from our servers once you confirm deletion
              in the app, and cannot be recovered. We retain no copy of your data after deletion, except
              where legally required.
            </p>
          ),
        },
      ];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-sky-200 dark:border-sky-800 bg-sky-100/90 dark:bg-sky-950/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-5">
          <button
            onClick={() => navigate(-1)}
            className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-muted"
          >
            <ChevronLeft size={20} className={dir === "rtl" ? "rotate-180" : ""} />
          </button>
          <h1 className="font-display text-xl font-bold text-foreground">
            {ar ? "حذف الحساب" : "Delete Account"}
          </h1>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8 space-y-6 text-sm leading-relaxed text-foreground">
        <p className="text-muted-foreground">
          {ar ? "آخر تحديث: يونيو 2026" : "Last updated: June 2026"}
        </p>
        {sections.map((s) => (
          <section key={s.h} className="space-y-2">
            <h2 className="font-display text-lg font-bold">{s.h}</h2>
            {s.body}
          </section>
        ))}
      </main>
    </div>
  );
}
