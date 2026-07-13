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
    api?.scrollNext();
  };

  const handlePrev = () => {
    api?.scrollPrev();
  };

  const handleComplete = () => {
    localStorage.setItem("has_seen_onboarding", "true");
    navigate({ to: "/auth" });
  };

  const step = ONBOARDING_STEPS[current];

  return (
    <div className={`min-h-dvh flex flex-col overflow-x-hidden transition-colors duration-500 ${step.bgClass}`}>
      <div className="flex-1 flex flex-col max-w-md mx-auto w-full relative h-full">
        <Carousel setApi={setApi} className="w-full flex-1 flex flex-col" opts={{ loop: false }}>
          <CarouselContent className="h-full m-0 flex-1">
            {ONBOARDING_STEPS.map((s, index) => (
              <CarouselItem
                key={index}
                className="flex flex-col h-full pl-0 overflow-hidden relative"
              >
                {/* Illustration Section (Golden Ratio ~60% of viewport) */}
                <div className="w-full h-[58vh] shrink-0 relative flex items-center justify-center">
                  {/* Blob Background */}
                  <div
                    className={`absolute rounded-full transition-all duration-500 ${s.blobClass}`}
                  />

                  {/* Illustration Image Placeholder */}
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

                {/* Text Section (Golden Ratio ~40% of viewport) */}
                <div className="w-full px-10 pt-8 pb-4 flex flex-col justify-start">
                  <h1
                    className={`font-serif text-[2.5rem] leading-[1.1] mb-6 font-bold whitespace-pre-line tracking-tight ${s.textClass}`}
                  >
                    {s.title}
                  </h1>
                  <p className={`text-[1.1rem] leading-relaxed opacity-90 ${s.textClass}`}>
                    {s.description}
                  </p>
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>

        {/* Footer Navigation */}
        <div className="px-10 pb-12 pt-4 flex items-center justify-between mt-auto shrink-0 min-h-[100px]">
          {current === ONBOARDING_STEPS.length - 1 ? (
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

