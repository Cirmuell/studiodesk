import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, ArrowLeft } from "lucide-react";
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
    title: "Your Creative\nBusiness,\nPowered by AI.",
    description:
      "StudioDesk handles the business side of your creativity so you can focus on doing great work.",
    image: "/images/onboarding/step-1.webp",
    bgClass: "bg-[#FAF8F3]",
    textClass: "text-[#3B241A]",
    blobClass: "bg-[#3B241A] w-[400px] h-[400px] -top-[80px] -left-[80px]",
    navBtnClass: "bg-[#3B241A] text-white",
    skipBtnClass: "bg-[#D96B52] text-white",
    accentColor: "#D96B52",
  },
  {
    title: "Price\nwith\nConfidence",
    description:
      "Stop guessing. Get intelligent estimates grounded in market data, your profile, and the client's tier.",
    image: "/images/onboarding/step-2.webp",
    bgClass: "bg-[#D96B52]",
    textClass: "text-white",
    blobClass: "bg-[#FAF8F3] w-[340px] h-[340px] -top-[40px] -right-[40px]",
    navBtnClass: "bg-[#FAF8F3] text-[#3B241A]",
    skipBtnClass: "bg-[#241A15] text-white",
    accentColor: "#FAF8F3",
  },
  {
    title: "Automate\nYour\nPaperwork",
    description:
      "Generate professional proposals, invoices, contracts, and receipts instantly from your project scopes.",
    image: "/images/onboarding/step-3.webp",
    bgClass: "bg-[#FAF8F3]",
    textClass: "text-[#3B241A]",
    blobClass: "bg-[#D96B52] w-[360px] h-[360px] -top-[60px] -left-[60px]",
    navBtnClass: "bg-[#D96B52] text-white",
    skipBtnClass: "bg-[#3B241A] text-white",
    accentColor: "#D96B52",
  },
  {
    title: "Everything\nin One\nPlace",
    description:
      "Manage client relationships and track active projects seamlessly without switching between apps.",
    image: "/images/onboarding/step-4.webp",
    bgClass: "bg-[#3B241A]",
    textClass: "text-[#FAF8F3]",
    blobClass: "bg-[#FAF8F3] w-[340px] h-[340px] -top-[50px] -left-[40px]",
    navBtnClass: "",
    skipBtnClass: "",
    startBtnClass: "bg-[#FAF8F3] text-[#3B241A]",
    accentColor: "#FAF8F3",
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

  const handleNext = () => api?.scrollNext();
  const handlePrev = () => api?.scrollPrev();

  const handleComplete = () => {
    localStorage.setItem("has_seen_onboarding", "true");
    navigate({ to: "/auth" });
  };

  const step = ONBOARDING_STEPS[current];
  const isLast = current === ONBOARDING_STEPS.length - 1;

  return (
    <div className={`h-dvh w-full overflow-hidden transition-colors duration-500 ${step.bgClass}`}>

      {/* ── DESKTOP LAYOUT (md+) ── side-by-side */}
      <div className="hidden md:flex h-full">
        {/* Left panel — illustration */}
        <div className="flex-1 relative overflow-hidden flex items-center justify-center">
          <div className={`absolute rounded-full transition-all duration-500 ${step.blobClass}`} />
          <div className="relative z-10 w-full h-full flex items-center justify-center p-16">
            {step.image && (
              <img
                src={step.image}
                alt="illustration"
                className="w-full h-full max-h-[75vh] object-contain drop-shadow-2xl"
              />
            )}
          </div>
        </div>

        {/* Right panel — text + navigation */}
        <div className="w-[440px] shrink-0 flex flex-col justify-between px-14 py-16">
          {/* Step dots */}
          <div className="flex gap-2">
            {ONBOARDING_STEPS.map((_, i) => (
              <button
                key={i}
                onClick={() => api?.scrollTo(i)}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === current ? "w-8 opacity-100" : "w-3 opacity-30"
                }`}
                style={{ backgroundColor: step.accentColor ?? "currentColor" }}
              />
            ))}
          </div>

          {/* Heading + description */}
          <div className="space-y-6">
            <h1
              className={`font-serif text-[clamp(2.5rem,4vw,3.5rem)] leading-[1.05] font-bold whitespace-pre-line tracking-tight ${step.textClass}`}
            >
              {step.title}
            </h1>
            <p className={`text-lg leading-relaxed opacity-80 ${step.textClass}`}>
              {step.description}
            </p>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between">
            {isLast ? (
              <button
                onClick={handleComplete}
                className={`px-10 h-14 rounded-full font-bold tracking-widest text-sm flex items-center justify-center active:scale-95 transition-all ${step.startBtnClass}`}
              >
                GET STARTED
              </button>
            ) : (
              <>
                <div className="flex gap-3">
                  {current > 0 && (
                    <button
                      onClick={handlePrev}
                      className={`size-14 rounded-full flex items-center justify-center active:scale-95 transition-all ${step.navBtnClass}`}
                    >
                      <ArrowLeft size={22} />
                    </button>
                  )}
                  <button
                    onClick={handleNext}
                    className={`size-14 rounded-full flex items-center justify-center active:scale-95 transition-all ${step.navBtnClass}`}
                  >
                    <ArrowRight size={22} />
                  </button>
                </div>
                <button
                  onClick={handleComplete}
                  className={`px-8 h-12 rounded-full font-bold text-xs tracking-[0.2em] flex items-center justify-center active:scale-95 transition-all ${step.skipBtnClass}`}
                >
                  SKIP
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── MOBILE LAYOUT (< md) ── original carousel */}
      <div className="md:hidden flex flex-col h-full">
        <Carousel setApi={setApi} className="flex-1 min-h-0 flex flex-col w-full" opts={{ loop: false }}>
          <CarouselContent className="h-full m-0 flex-1">
            {ONBOARDING_STEPS.map((s, index) => (
              <CarouselItem
                key={index}
                className="flex flex-col h-full pl-0 relative overflow-hidden"
              >
                <div className="flex-[0_0_55%] w-full relative flex items-center justify-center">
                  <div className={`absolute rounded-full transition-all duration-500 ${s.blobClass}`} />
                  <div className="relative z-10 w-full h-full flex items-center justify-center p-8 pb-0">
                    {s.image ? (
                      <img
                        src={s.image}
                        alt="illustration"
                        className="w-full h-full object-contain drop-shadow-2xl"
                      />
                    ) : (
                      <div className="w-full max-w-[280px] aspect-square border-2 border-dashed border-current opacity-30 rounded-2xl flex items-center justify-center text-center p-4">
                        <span className={`font-medium ${s.textClass}`}>
                          [Illustration Placeholder]
                          <br />
                          <span className="text-sm opacity-75">Replace with image asset</span>
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex-1 min-h-0 w-full px-10 pt-6 pb-2 flex flex-col justify-start overflow-hidden">
                  <h1
                    className={`font-serif text-[clamp(1.85rem,7vw,2.5rem)] leading-[1.1] mb-4 font-bold whitespace-pre-line tracking-tight ${s.textClass}`}
                  >
                    {s.title}
                  </h1>
                  <p className={`text-[clamp(0.9rem,3.5vw,1.1rem)] leading-relaxed opacity-90 ${s.textClass}`}>
                    {s.description}
                  </p>
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>

        <div className="px-10 pb-10 pt-3 flex items-center justify-between shrink-0">
          {isLast ? (
            <div className="w-full flex justify-center animate-in fade-in slide-in-from-bottom-4 duration-500">
              <button
                onClick={handleComplete}
                className={`w-auto px-12 h-14 rounded-full font-bold tracking-widest text-sm flex items-center justify-center active:scale-95 transition-all ${step.startBtnClass}`}
              >
                START
              </button>
            </div>
          ) : (
            <>
              <div className="flex gap-4">
                {current > 0 && (
                  <button
                    onClick={handlePrev}
                    className={`size-14 rounded-full flex items-center justify-center active:scale-95 transition-all ${step.navBtnClass}`}
                  >
                    <ArrowLeft size={24} />
                  </button>
                )}
                <button
                  onClick={handleNext}
                  className={`size-14 rounded-full flex items-center justify-center active:scale-95 transition-all ${step.navBtnClass}`}
                >
                  <ArrowRight size={24} />
                </button>
              </div>

              <button
                onClick={handleComplete}
                className={`px-8 h-12 rounded-full font-bold text-xs tracking-[0.2em] flex items-center justify-center active:scale-95 transition-all ${step.skipBtnClass}`}
              >
                SKIP
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
