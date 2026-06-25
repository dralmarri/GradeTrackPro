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
              إذا تعذّر عليك الدخول إلى حسابك، يمكنك طلب حذف الحساب عبر{" "}
              <Link to="/contact" className="font-medium text-primary hover:underline">
                صفحة تواصل معنا
              </Link>{" "}
              أو بمراسلتنا على البريد <strong>dralmarri@gmail.com</strong> من العنوان البريدي المسجّل في
              حسابك. سنعالج طلبك خلال مدة أقصاها 30 يوماً.
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
              If you cannot sign in, you can request account deletion via our{" "}
              <Link to="/contact" className="font-medium text-primary hover:underline">
                contact page
              </Link>{" "}
              or by emailing <strong>dralmarri@gmail.com</strong> from the email address registered to your
              account. We will process your request within 30 days at most.
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
