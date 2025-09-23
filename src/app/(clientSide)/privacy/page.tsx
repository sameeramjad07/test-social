import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Geist } from "next/font/google";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

export const metadata = {
  title: "Privacy Policy - Social Manager",
  description:
    "Learn how Social Manager handles your personal data and social media information.",
};

export default function PrivacyPage() {
  const lastUpdated = new Date("2025-09-23").toLocaleDateString(); // Update this date as needed

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 py-12 px-4">
      <div className="container mx-auto max-w-4xl">
        <Card className="border-0 shadow-lg bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle
              className={`${geist.className} text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2`}
            >
              Privacy Policy
            </CardTitle>
            <CardDescription className="text-slate-600 dark:text-slate-400">
              Effective Date: {lastUpdated}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
            <section>
              <h2 className="text-xl font-semibold mb-2">1. Introduction</h2>
              <p>
                Welcome to Social Manager ("we," "us," or "our"), an AI-powered
                social media management platform. This Privacy Policy explains
                how we collect, use, disclose, and safeguard your information
                when you use our website (postwaves.net), mobile app, or
                services. By using our services, you consent to the practices
                described here.
              </p>
              <p className="mt-2">
                We are committed to protecting your privacy and comply with
                applicable laws like GDPR and CCPA. If you have questions,
                contact us at Numankhan@codenextsoltions.tech.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-2">
                2. Information We Collect
              </h2>
              <p>We collect the following types of information:</p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li>
                  <strong>Account Information:</strong> Email, password, name,
                  and profile details you provide during signup.
                </li>
                <li>
                  <strong>Social Media Data:</strong> When you connect accounts
                  (e.g., Facebook, Instagram, LinkedIn), we access authorized
                  data like posts, pages, analytics, and audience insights via
                  official APIs. We do not store login credentials.
                </li>
                <li>
                  <strong>Usage Data:</strong> Device info, IP address, browser
                  type, pages visited, and interaction logs (e.g., scheduled
                  posts, AI generations).
                </li>
                <li>
                  <strong>Content Data:</strong> Posts you create or schedule,
                  including AI-generated content based on your inputs.
                </li>
                <li>
                  <strong>Cookies & Tracking:</strong> We use cookies for
                  analytics (e.g., Google Analytics) and functionality. You can
                  manage preferences via browser settings.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-2">
                3. How We Use Your Information
              </h2>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li>
                  Provide and improve services (e.g., scheduling posts,
                  generating AI content).
                </li>
                <li>
                  Personalize your experience (e.g., brand voice adaptation).
                </li>
                <li>
                  Analyze usage for better features and analytics dashboards.
                </li>
                <li>
                  Communicate updates, support, or marketing (with opt-out).
                </li>
                <li>Comply with legal obligations or prevent fraud.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-2">
                4. How We Share Your Information
              </h2>
              <p>We do not sell your personal data. We may share it with:</p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li>
                  <strong>Service Providers:</strong> Third parties like AWS for
                  hosting, OpenAI for AI features, or social platforms
                  (Facebook, etc.) for API integrations.
                </li>
                <li>
                  <strong>Business Transfers:</strong> In case of merger or
                  acquisition.
                </li>
                <li>
                  <strong>Legal Requirements:</strong> If required by law or to
                  protect rights.
                </li>
                <li>
                  <strong>Aggregated Data:</strong> Anonymized insights for
                  research (no personal identifiers).
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-2">
                5. Data Security & Retention
              </h2>
              <p>
                We use industry-standard security (e.g., encryption, access
                controls) to protect your data. However, no system is 100%
                secure. We retain data as long as needed for services or legal
                reasons—e.g., account data until deletion, logs for 12 months.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-2">
                6. Your Rights & Choices
              </h2>
              <p>Depending on your location:</p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li>
                  Access, correct, or delete your data via account settings or
                  by emailing Numankhan@codenextsoltions.tech.
                </li>
                <li>Opt out of marketing or cookies.</li>
                <li>
                  Withdraw social integrations anytime (revokes our API access).
                </li>
                <li>
                  GDPR/CCPA: Request data portability or object to processing.
                </li>
              </ul>
              <p className="mt-2">
                For California residents: We do not sell data. Review our CCPA
                notice at /ccpa (if applicable).
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-2">
                7. Children's Privacy
              </h2>
              <p>
                Our services are not for users under 13 (or 16 in some regions).
                We do not knowingly collect children's data.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-2">
                8. International Transfers
              </h2>
              <p>
                Data may be processed in the US or other countries. We ensure
                adequate safeguards (e.g., Standard Contractual Clauses).
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-2">
                9. Changes to This Policy
              </h2>
              <p>
                We may update this policy. Check the effective date above.
                Significant changes will be notified via email or site banner.
              </p>
            </section>

            <section className="pt-6 border-t border-slate-200 dark:border-slate-700">
              <p className="text-center text-xs text-slate-500 dark:text-slate-400">
                © 2025 Social Manager Inc. All rights reserved. | Contact:
                Numankhan@codenextsoltions.tech | 701, Elysium tower Blue Area,
                Islamabad, Pakistan 44000
              </p>
            </section>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
