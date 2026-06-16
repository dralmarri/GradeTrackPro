import { ChevronLeft } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { useLanguage } from "@/hooks/useLanguage";

export default function PrivacyPolicy() {
  const navigate = useNavigate();
  const { lang, dir } = useLanguage();
  const ar = lang === "ar";

  const sections = ar
    ? [
        {
          h: "مقدمة",
          body: (
            <p>
              مرحباً بكم في تطبيق <strong>GradeTrackPro</strong>. نحن نحترم خصوصيتكم ونلتزم بحماية بياناتكم
              الشخصية. توضح هذه السياسة كيفية جمع واستخدام وحماية معلوماتكم.
            </p>
          ),
        },
        {
          h: "الحساب وتسجيل الدخول",
          body: (
            <p>
              يتطلب التطبيق إنشاء حساب وتسجيل الدخول للوصول إلى بياناتكم ومزامنتها بين أجهزتكم. نقوم بجمع بريدكم
              الإلكتروني وكلمة المرور (مُشفّرة) لأغراض المصادقة فقط.
            </p>
          ),
        },
        {
          h: "البيانات التي نجمعها",
          body: (
            <ul className="list-disc ps-6 space-y-1">
              <li>بيانات الحساب: البريد الإلكتروني المستخدم لتسجيل الدخول</li>
              <li>بيانات المقررات الدراسية (أسماء المواد، الشُعب، جداول المحاضرات)</li>
              <li>بيانات الطلاب (الأسماء، الدرجات، الحضور، البونص، الملاحظات)</li>
              <li>نتائج الاختبارات المُستوردة من ملفات Excel</li>
              <li>إعدادات التطبيق والتفضيلات</li>
            </ul>
          ),
        },
        {
          h: "كيفية تخزين البيانات",
          body: (
            <>
              <p>
                التطبيق متاح كموقع ويب وكتطبيق iOS عبر Apple App Store، وكلاهما يستخدمان نفس الحساب وقاعدة
                البيانات السحابية. تُخزَّن بياناتكم بشكل آمن لتمكين المزامنة الفورية بين أجهزتكم المختلفة. كل مستخدم
                لا يستطيع الوصول إلا إلى بياناته الخاصة فقط عبر سياسات أمان صارمة (Row-Level Security).
              </p>
              <p>قد يحتفظ التطبيق بنسخة مؤقتة من بعض البيانات على جهازكم لتحسين الأداء والعمل دون اتصال.</p>
            </>
          ),
        },
        {
          h: "التتبع والإعلانات",
          body: (
            <ul className="list-disc ps-6 space-y-1">
              <li>لا نستخدم أي معرّفات تتبّع للإعلانات (IDFA على iOS أو مكافئها).</li>
              <li>لا نتتبّع نشاطكم عبر تطبيقات أو مواقع شركات أخرى.</li>
              <li>لا نعرض أي إعلانات داخل التطبيق.</li>
              <li>لا نبيع بياناتكم ولا نشاركها مع أي طرف ثالث لأغراض تسويقية.</li>
            </ul>
          ),
        },

        {
          h: "استيراد ملفات Excel",
          body: (
            <p>
              عند استيراد قوائم الطلاب أو نتائج الاختبارات من ملفات Excel، تتم معالجة الملف محلياً على جهازكم فقط،
              ولا يتم رفع الملف الأصلي إلى أي خادم. تُحفظ فقط البيانات النهائية (الأسماء والدرجات) في حسابكم
              السحابي.
            </p>
          ),
        },
        {
          h: "حماية البيانات",
          body: (
            <>
              <p>نحن نتخذ التدابير المناسبة لحماية بياناتكم، بما في ذلك:</p>
              <ul className="list-disc ps-6 space-y-1">
                <li>تشفير الاتصال بين التطبيق والخادم (HTTPS)</li>
                <li>عزل بيانات كل مستخدم عبر سياسات أمان على مستوى الصف (RLS)</li>
                <li>عدم مشاركة البيانات مع أي طرف ثالث لأغراض تسويقية أو إعلانية</li>
                <li>إمكانية تصدير بياناتكم أو حذفها في أي وقت</li>
              </ul>
            </>
          ),
        },
        {
          h: "حقوقكم",
          body: (
            <ul className="list-disc ps-6 space-y-1">
              <li>الوصول إلى بياناتكم وتصديرها بصيغة Excel في أي وقت</li>
              <li>تعديل أو حذف أي بيانات مُخزّنة</li>
              <li>إعادة تعيين الفصل الدراسي وحذف بياناته</li>
              <li>طلب حذف الحساب وجميع البيانات المرتبطة به نهائياً</li>
            </ul>
          ),
        },
        {
          h: "التواصل",
          body: (
            <p>
              لأي استفسارات أو ملاحظات حول سياسة الخصوصية، يرجى التواصل عبر{" "}
              <Link to="/contact" className="font-medium text-primary hover:underline">
                صفحة تواصل معنا
              </Link>
              .
            </p>
          ),
        },
        {
          h: "تحديثات السياسة",
          body: (
            <p>
              قد نقوم بتحديث هذه السياسة من وقت لآخر. سيتم نشر أي تغييرات على هذه الصفحة مع تحديث تاريخ آخر تعديل.
            </p>
          ),
        },
      ]
    : [
        {
          h: "Introduction",
          body: (
            <p>
              Welcome to <strong>GradeTrackPro</strong>. We respect your privacy and are committed to protecting
              your personal data. This policy explains how we collect, use, and safeguard your information.
            </p>
          ),
        },
        {
          h: "Account & sign-in",
          body: (
            <p>
              The app requires creating an account and signing in to access and sync your data across devices. We
              collect your email and password (hashed) for authentication only.
            </p>
          ),
        },
        {
          h: "Data we collect",
          body: (
            <ul className="list-disc ps-6 space-y-1">
              <li>Account data: the email used to sign in</li>
              <li>Course data (course names, sections, lecture schedules)</li>
              <li>Student data (names, grades, attendance, bonus, notes)</li>
              <li>Exam results imported from Excel files</li>
              <li>App settings and preferences</li>
            </ul>
          ),
        },
        {
          h: "How data is stored",
          body: (
            <>
              <p>
                The app is available as a website and as an iOS app on the Apple App Store. Both use the same
                account and cloud database. Your data is securely stored in the cloud to enable instant sync
                across your devices. Each user can only access their own data via strict Row-Level Security
                policies.
              </p>
              <p>The app may keep a temporary local copy of some data to improve performance and offline use.</p>
            </>
          ),
        },
        {
          h: "Tracking & advertising",
          body: (
            <ul className="list-disc ps-6 space-y-1">
              <li>We do not use any advertising identifiers (IDFA on iOS or equivalents).</li>
              <li>We do not track you across other companies' apps or websites.</li>
              <li>We show no ads inside the app.</li>
              <li>We do not sell your data or share it with third parties for marketing.</li>
            </ul>
          ),
        },

        {
          h: "Excel imports",
          body: (
            <p>
              When importing student lists or exam results from Excel files, the file is processed locally on your
              device only — the original file is never uploaded to any server. Only the final data (names and
              grades) is saved to your cloud account.
            </p>
          ),
        },
        {
          h: "Data protection",
          body: (
            <>
              <p>We take appropriate measures to protect your data, including:</p>
              <ul className="list-disc ps-6 space-y-1">
                <li>Encrypted communication between app and server (HTTPS)</li>
                <li>Per-user isolation via Row-Level Security policies</li>
                <li>No sharing of data with third parties for marketing or ads</li>
                <li>Ability to export or delete your data at any time</li>
              </ul>
            </>
          ),
        },
        {
          h: "Your rights",
          body: (
            <ul className="list-disc ps-6 space-y-1">
              <li>Access and export your data as Excel at any time</li>
              <li>Edit or delete any stored data</li>
              <li>Reset the semester and delete its data</li>
              <li>Request permanent deletion of your account and all related data</li>
            </ul>
          ),
        },
        {
          h: "Contact",
          body: (
            <p>
              For any questions about this privacy policy, please reach us via the{" "}
              <Link to="/contact" className="font-medium text-primary hover:underline">
                contact page
              </Link>
              .
            </p>
          ),
        },
        {
          h: "Policy updates",
          body: (
            <p>
              We may update this policy from time to time. Any changes will be posted on this page along with an
              updated last-modified date.
            </p>
          ),
        },
      ];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-5">
          <button
            onClick={() => navigate(-1)}
            className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-muted"
          >
            <ChevronLeft size={20} className={dir === "rtl" ? "rotate-180" : ""} />
          </button>
          <h1 className="font-display text-xl font-bold text-foreground">
            {ar ? "سياسة الخصوصية" : "Privacy Policy"}
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
