import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/_authenticated/tos")({
  component: TosPage,
});

function TosPage() {
  return (
    <AppShell title="Terms of Service" subtitle="Rules and guidelines">
      <div className="mb-4">
        <Link to="/settings" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4 mr-2" /> Back to Settings
        </Link>
      </div>
      <div className="card-soft p-6 space-y-6 text-sm text-foreground/90">
        <section>
          <h2 className="text-lg font-bold font-serif mb-2">1. Acceptance of Terms</h2>
          <p>
            By accessing or using StudioDesk, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our services.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold font-serif mb-2">2. Description of Service</h2>
          <p>
            StudioDesk provides an AI-powered business management platform for independent creatives, offering features such as AI-grounded pricing estimates, document generation (proposals, contracts, invoices), and client tracking.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold font-serif mb-2">3. Intellectual Property</h2>
          <p>
            <strong>You own your documents.</strong> Any proposals, contracts, invoices, or other documents generated using StudioDesk are your intellectual property. You retain full rights to use, modify, and distribute them as you see fit.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold font-serif mb-2">4. AI Disclaimers & No Legal Advice</h2>
          <p>
            The AI-generated content provided by StudioDesk is for informational and drafting purposes only. <strong>StudioDesk is not a law firm or a financial advisory service.</strong> Contracts and legal documents should be reviewed by a qualified legal professional in your jurisdiction before use. We do not guarantee the legal enforceability of generated contracts.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold font-serif mb-2">5. User Responsibilities</h2>
          <p>
            You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You agree not to use StudioDesk for any illegal or unauthorized purpose.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold font-serif mb-2">6. Subscription and Termination</h2>
          <p>
            Some features require a paid subscription. You may cancel your subscription at any time. We reserve the right to suspend or terminate your account if you violate these Terms of Service.
          </p>
        </section>
      </div>
    </AppShell>
  );
}
