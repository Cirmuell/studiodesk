import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/_authenticated/privacy")({
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <AppShell title="Privacy Policy" subtitle="How we protect your data">
      <div className="mb-4">
        <Link to="/settings" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4 mr-2" /> Back to Settings
        </Link>
      </div>
      <div className="card-soft p-6 space-y-6 text-sm text-foreground/90">
        <section>
          <h2 className="text-lg font-bold font-serif mb-2">1. Introduction</h2>
          <p>
            Welcome to StudioDesk. This Privacy Policy explains how we collect, use, and protect your personal and business data, particularly regarding the AI processing of your project scopes and client documents.
          </p>
        </section>
        
        <section>
          <h2 className="text-lg font-bold font-serif mb-2">2. Information We Collect</h2>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li><strong>Account Information:</strong> Your name, business name, and contact details.</li>
            <li><strong>Financial Information:</strong> Bank details, rate cards, and billing configurations to generate invoices.</li>
            <li><strong>Client & Project Data:</strong> Information you input about clients, scopes, and project requirements.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold font-serif mb-2">3. How AI Uses Your Data</h2>
          <p>
            StudioDesk uses artificial intelligence to generate pricing estimates, contracts, and proposals based on your inputs. <strong>Your data is processed strictly for inference to generate these documents.</strong> We do not use your personal, financial, or client data to train our foundational AI models.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold font-serif mb-2">4. Data Storage and Security</h2>
          <p>
            Your data is securely stored using industry-standard encryption protocols through our infrastructure providers. We implement strict access controls to ensure your financial details and client communications remain confidential.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold font-serif mb-2">5. Third-Party Services</h2>
          <p>
            We may share limited, necessary data with third-party service providers solely for the purpose of operating our service (e.g., secure payment processing, cloud hosting, and secure API requests to AI providers like OpenAI/Anthropic).
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold font-serif mb-2">6. Your Rights</h2>
          <p>
            You have the right to access, update, or permanently delete your account and all associated data at any time from your account settings. Upon deletion, your financial and client data is purged from our active databases.
          </p>
        </section>
      </div>
    </AppShell>
  );
}
