import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Sparkles, TrendingUp, FileText, LayoutDashboard, ArrowRight } from "lucide-react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";

export const Route = createFileRoute("/onboarding")({
  ssr: false,
  head: () => ({ meta: [{ title: "Welcome to StudioDesk" }] }),
  component: OnboardingPage,
});

const ONBOARDING_STEPS = [
  {
    title: "Your creative business, powered by AI.",
    description:
      "StudioDesk handles the business side of your creativity so you can focus on doing great work.",
    icon: <Sparkles className="size-16 text-primary" />,
    color: "bg-primary/10",
  },
  {
    title: "Price with Confidence",
    description:
      "Stop guessing. Get intelligent project estimates grounded in market data, your profile, and the client's tier.",
    icon: <TrendingUp className="size-16 text-[var(--color-chart-1)]" />,
    color: "bg-[var(--color-chart-1)]/10",
  },
  {
    title: "Automate Your Paperwork",
    description:
      "Generate professional proposals, invoices, contracts, and receipts instantly from your project scopes.",
    icon: <FileText className="size-16 text-[var(--color-chart-2)]" />,
    color: "bg-[var(--color-chart-2)]/10",
  },
  {
    title: "Everything in One Place",
    description:
      "Manage client relationships and track active projects seamlessly without switching between apps.",
    icon: <LayoutDashboard className="size-16 text-[var(--color-chart-3)]" />,
    color: "bg-[var(--color-chart-3)]/10",
  },
];

function OnboardingPage() {
  const navigate = useNavigate();
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (!api) return;

    setCurrent(api.selectedScrollSnap());
    api.on("select", () => {
      setCurrent(api.selectedScrollSnap());
    });
  }, [api]);

  const handleNext = () => {
    if (current === ONBOARDING_STEPS.length - 1) {
      // Finish onboarding
      localStorage.setItem("has_seen_onboarding", "true");
      navigate({ to: "/auth" });
    } else {
      api?.scrollNext();
    }
  };

  const handleSkip = () => {
    localStorage.setItem("has_seen_onboarding", "true");
    navigate({ to: "/auth" });
  };

  return (
    <div className="min-h-dvh bg-background flex flex-col">
      <div className="flex-1 flex flex-col justify-center max-w-md mx-auto w-full relative">
        <button
          onClick={handleSkip}
          className="absolute top-8 right-6 text-sm font-medium text-muted-foreground hover:text-foreground z-10"
        >
          Skip
        </button>

        <Carousel setApi={setApi} className="w-full" opts={{ loop: false }}>
          <CarouselContent>
            {ONBOARDING_STEPS.map((step, index) => (
              <CarouselItem
                key={index}
                className="flex flex-col items-center text-center px-8 pt-12 pb-8"
              >
                <div
                  className={`size-48 rounded-full flex items-center justify-center mb-12 \${step.color}`}
                >
                  {step.icon}
                </div>

                <h1 className="font-display text-3xl leading-tight mb-4">{step.title}</h1>

                <p className="text-muted-foreground leading-relaxed">{step.description}</p>
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>
      </div>

      <div className="px-6 pb-12 pt-6 max-w-md mx-auto w-full">
        <div className="flex justify-center gap-2 mb-8">
          {ONBOARDING_STEPS.map((_, index) => (
            <button
              key={index}
              onClick={() => api?.scrollTo(index)}
              className={`h-2 rounded-full transition-all \${
                current === index ? "w-8 bg-primary" : "w-2 bg-primary/20"
              }`}
              aria-label={`Go to slide \${index + 1}`}
            />
          ))}
        </div>

        <button
          onClick={handleNext}
          className="w-full h-14 rounded-full bg-primary text-primary-foreground font-medium flex items-center justify-center gap-2 shadow-[var(--shadow-pop)] active:scale-[0.98] transition-transform"
        >
          {current === ONBOARDING_STEPS.length - 1 ? (
            "Get Started"
          ) : (
            <>
              Continue
              <ArrowRight className="size-4" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
