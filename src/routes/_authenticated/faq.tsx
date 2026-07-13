import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { ArrowLeft } from "lucide-react";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";

export const Route = createFileRoute("/_authenticated/faq")({
  component: FaqPage,
});

function FaqPage() {
  return (
    <AppShell title="FAQ" subtitle="Frequently Asked Questions">
      <div className="mb-4">
        <Link to="/settings" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4 mr-2" /> Back to Settings
        </Link>
      </div>
      
      <div className="card-soft p-2">
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="item-1" className="border-none">
            <AccordionTrigger className="px-4 py-4 hover:no-underline text-sm font-semibold text-left">
              How does the AI pricing work?
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4 text-sm text-muted-foreground">
              Our AI analyzes the project scope you provide and cross-references it with your custom profile, including your defined rate cards and minimum/maximum day rates. It then calculates a grounded estimate tailored exactly to your business standards, rather than generic market rates.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="item-2" className="border-none border-t border-border/50">
            <AccordionTrigger className="px-4 py-4 hover:no-underline text-sm font-semibold text-left">
              Is my financial and client data secure?
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4 text-sm text-muted-foreground">
              Yes. We use industry-standard encryption for all data at rest and in transit. Your project scopes are sent securely to our AI providers strictly for generating your documents, and your data is never used to train public AI models.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="item-3" className="border-none border-t border-border/50">
            <AccordionTrigger className="px-4 py-4 hover:no-underline text-sm font-semibold text-left">
              Can I customize my documents with my own brand?
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4 text-sm text-muted-foreground">
              Absolutely. StudioDesk allows you to upload your own logo, set custom primary and secondary brand colors, upload custom fonts, and even add a digital signature. All generated PDFs and web proposals will automatically reflect your branding.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="item-4" className="border-none border-t border-border/50">
            <AccordionTrigger className="px-4 py-4 hover:no-underline text-sm font-semibold text-left">
              Can I cancel or upgrade my subscription?
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4 text-sm text-muted-foreground">
              Yes! You can upgrade your plan at any time to unlock more features (like unlimited document generation and custom fonts). You can also cancel your subscription at any time from your billing settings.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="item-5" className="border-none border-t border-border/50">
            <AccordionTrigger className="px-4 py-4 hover:no-underline text-sm font-semibold text-left">
              Are the generated contracts legally binding?
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4 text-sm text-muted-foreground">
              While our AI generates highly professional and structured contracts based on standard industry practices, they do not constitute formal legal advice. We highly recommend having a lawyer review your contract templates to ensure they comply with your local jurisdiction.
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </AppShell>
  );
}
