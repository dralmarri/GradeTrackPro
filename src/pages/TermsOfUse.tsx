import { ChevronLeft } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { useLanguage } from "@/hooks/useLanguage";

export default function TermsOfUse() {
  const navigate = useNavigate();
  const { lang, dir } = useLanguage();
  const ar = lang === "ar";

  const sections = ar
    ? [
        {
          h: "القبول بالشروط",
          body: (
            <p>
              باستخدامك لتطبيق <strong>GradeTrackPro</strong>، فإنك توافق على الالتزام بهذه الشروط والأحكام. إذا لم
              توافق على أي من هذه الشروط، يرجى عدم استخدام التطبيق.
            </p>
          ),
        },
        {
          h: "الحساب وتسجيل الدخول",
          body: (
            <ul className="list-disc ps-6 space-y-1">
              <li>يتطلب استخدام التطبيق إنشاء حساب وتسجيل الدخول ببريد إلكتروني وكلمة مرور</li>
              <li>أنت مسؤول عن الحفاظ على سرية بيانات حسابك وعدم مشاركتها مع الآخرين</li>
              <li>تتم مزامنة بياناتك تلقائياً عبر السحابة بين أجهزتك المختلفة</li>
            </ul>
          ),
        },
        {
          h: "وصف الخدمة",
          body: (
            <>
              <p>
                GradeTrackPro متاح كموقع ويب وكتطبيق أصلي على iPhone و iPad عبر Apple App Store، ويستخدمان نفس
                الحساب وقاعدة البيانات لمزامنة فورية بين جميع أجهزتك. يتيح التطبيق للمعلمين وأعضاء هيئة التدريس:
              </p>
              <ul className="list-disc ps-6 space-y-1">
                <li>إنشاء وإدارة المقررات الدراسية والشُعب وجداول المحاضرات</li>
                <li>تسجيل حضور المحاضرات وإدارة درجات البونص</li>
                <li>إدخال درجات الاختبارات والمشاركة والواجبات يدوياً أو عبر استيراد ملفات Excel</li>
                <li>استيراد قوائم الطلاب من Excel ومطابقتها بالأسماء تلقائياً</li>
                <li>تصدير النتائج كاملة بصيغة Excel</li>
                <li>متابعة وضع كل طالب ونتائجه عبر جميع الأجهزة بشكل فوري</li>
              </ul>
            </>
          ),
        },
        {
          h: "شروط خاصة بتطبيق App Store",
          body: (
            <>
              <p>
                عند استخدامك لنسخة iOS من التطبيق المُحمَّلة من Apple App Store، فإنك توافق إضافة على ما يلي:
              </p>
              <ul className="list-disc ps-6 space-y-1">
                <li>هذه الاتفاقية مُبرَمة بينك وبين مطوّر التطبيق فقط، وليست بينك وبين شركة Apple، وApple ليست طرفاً فيها.</li>
                <li>Apple ليست مسؤولة عن التطبيق ولا عن محتواه أو دعمه أو صيانته.</li>
                <li>في حال وجود أي خلل في التطبيق، يحق لك إبلاغ Apple وستقوم بإرجاع ثمن الشراء إن وُجد، ولا تتحمل Apple أي مسؤولية أخرى.</li>
                <li>أي مطالبات تتعلق بالتطبيق (أداء، أضرار، عدم مطابقة قانون، انتهاك ملكية فكرية) هي مسؤولية المطوّر وحده وليست مسؤولية Apple.</li>
                <li>Apple وشركاتها التابعة مستفيدون كطرف ثالث (Third-Party Beneficiaries) من هذه الشروط، ولهم الحق في تطبيقها ضدك.</li>
                <li>تُقرّ بعدم وجودك في أي دولة تخضع لحظر حكومة الولايات المتحدة، وبعدم إدراجك في قوائم الأطراف المحظورة.</li>
              </ul>
            </>
          ),
        },

        {
          h: "مسؤولية المستخدم",
          body: (
            <ul className="list-disc ps-6 space-y-1">
              <li>أنت المسؤول الوحيد عن دقة البيانات المُدخلة ومراجعتها قبل اعتمادها</li>
              <li>عند استيراد ملفات Excel، يجب التحقق من مطابقة الأسماء والدرجات قبل الحفظ</li>
              <li>يُنصح بتصدير نسخ احتياطية دورية من بياناتك</li>
              <li>يجب استخدام التطبيق للأغراض التعليمية المشروعة فقط</li>
              <li>يجب الحفاظ على سرية بيانات الطلاب وعدم مشاركتها مع أطراف غير مخوّلة</li>
            </ul>
          ),
        },
        {
          h: "إخلاء المسؤولية",
          body: (
            <ul className="list-disc ps-6 space-y-1">
              <li>التطبيق مُقدّم "كما هو" دون أي ضمانات صريحة أو ضمنية</li>
              <li>لا نضمن توفر الخدمة بشكل متواصل دون انقطاع أو خلوها من الأخطاء</li>
              <li>لا نتحمل مسؤولية فقدان البيانات الناتج عن سوء الاستخدام أو أعطال الخدمة السحابية أو الجهاز</li>
              <li>لا نتحمل مسؤولية أي أخطاء في احتساب الدرجات ناتجة عن إدخال بيانات خاطئة أو ملف Excel غير صحيح</li>
            </ul>
          ),
        },
        {
          h: "الملكية الفكرية",
          body: (
            <p>
              جميع حقوق الملكية الفكرية للتطبيق محفوظة. لا يجوز نسخ أو تعديل أو توزيع التطبيق أو أي جزء منه دون إذن
              كتابي مسبق.
            </p>
          ),
        },
        {
          h: "تعديل الشروط",
          body: (
            <p>
              نحتفظ بالحق في تعديل هذه الشروط في أي وقت. ستُنشر التعديلات على هذه الصفحة مع تحديث التاريخ.
            </p>
          ),
        },
        {
          h: "التواصل",
          body: (
            <p>
              لأي استفسارات حول شروط الاستخدام، يرجى زيارة{" "}
              <Link to="/contact" className="font-medium text-primary hover:underline">
                صفحة تواصل معنا
              </Link>
              .
            </p>
          ),
        },
      ]
    : [
        {
          h: "Acceptance of terms",
          body: (
            <p>
              By using <strong>GradeTrackPro</strong>, you agree to be bound by these terms. If you do not agree
              with any of them, please do not use the app.
            </p>
          ),
        },
        {
          h: "Account & sign-in",
          body: (
            <ul className="list-disc ps-6 space-y-1">
              <li>Using the app requires creating an account with an email and password</li>
              <li>You are responsible for keeping your account credentials confidential</li>
              <li>Your data is automatically synced via the cloud across your devices</li>
            </ul>
          ),
        },
        {
          h: "Service description",
          body: (
            <>
              <p>
                GradeTrackPro is available as a web app and as a native iOS app on iPhone and iPad via the Apple
                App Store. Both share the same account and database, with instant sync across all your devices. The
                app lets instructors:
              </p>
              <ul className="list-disc ps-6 space-y-1">
                <li>Create and manage courses, sections, and lecture schedules</li>
                <li>Record lecture attendance and manage bonus grades</li>
                <li>Enter exam, participation, and assignment grades manually or via Excel import</li>
                <li>Import student lists from Excel with automatic name matching</li>
                <li>Export the complete results as Excel</li>
                <li>Track each student's status and results across all devices in real time</li>
              </ul>
            </>
          ),
        },
        {
          h: "App Store specific terms",
          body: (
            <>
              <p>
                When using the iOS version of the app downloaded from the Apple App Store, you additionally agree
                to the following:
              </p>
              <ul className="list-disc ps-6 space-y-1">
                <li>This agreement is concluded solely between you and the developer, not with Apple. Apple is not a party to it.</li>
                <li>Apple is not responsible for the app, its content, support, or maintenance.</li>
                <li>If the app fails to conform to any applicable warranty, you may notify Apple, which will refund the purchase price (if any). Apple has no other warranty obligation.</li>
                <li>Any claims relating to the app (performance, damages, legal or IP infringement) are the developer's sole responsibility, not Apple's.</li>
                <li>Apple and its subsidiaries are third-party beneficiaries of these terms and may enforce them against you.</li>
                <li>You confirm you are not located in a U.S.-embargoed country and not listed on any U.S. government prohibited-parties list.</li>
              </ul>
            </>
          ),
        },

        {
          h: "User responsibility",
          body: (
            <ul className="list-disc ps-6 space-y-1">
              <li>You are solely responsible for the accuracy of entered data and reviewing it before finalizing</li>
              <li>When importing Excel files, verify name and grade matching before saving</li>
              <li>Regular backup exports of your data are recommended</li>
              <li>The app must be used for legitimate educational purposes only</li>
              <li>Keep student data confidential and do not share it with unauthorized parties</li>
            </ul>
          ),
        },
        {
          h: "Disclaimer",
          body: (
            <ul className="list-disc ps-6 space-y-1">
              <li>The app is provided "as is" with no express or implied warranties</li>
              <li>We do not guarantee uninterrupted availability or that the service is error-free</li>
              <li>We are not liable for data loss caused by misuse, cloud outages, or device failure</li>
              <li>We are not liable for grade-calculation errors caused by incorrect entries or invalid files</li>
            </ul>
          ),
        },
        {
          h: "Intellectual property",
          body: (
            <p>
              All intellectual property rights in the app are reserved. The app or any part of it may not be
              copied, modified, or distributed without prior written permission.
            </p>
          ),
        },
        {
          h: "Changes to terms",
          body: (
            <p>
              We reserve the right to modify these terms at any time. Updates will be posted on this page with a
              revised date.
            </p>
          ),
        },
        {
          h: "Contact",
          body: (
            <p>
              For any questions about these terms, please visit the{" "}
              <Link to="/contact" className="font-medium text-primary hover:underline">
                contact page
              </Link>
              .
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
            {ar ? "شروط الاستخدام" : "Terms of Use"}
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
