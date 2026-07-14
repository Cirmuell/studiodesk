import { useEffect } from "react";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";

export function OnboardingTour() {
  useEffect(() => {
    // Only run on the client
    if (typeof window === "undefined") return;

    // Check if the user has already seen the tour
    const hasSeenTour = localStorage.getItem("hasSeenTour");
    if (hasSeenTour) return;

    // We use a timeout to ensure AppShell has mounted its tabs and initial animations complete
    const timeout = setTimeout(() => {
      const tour = driver({
        showProgress: true,
        animate: true,
        allowClose: true,
        nextBtnText: 'Next',
        prevBtnText: 'Back',
        doneBtnText: 'Got it',
        popoverClass: 'driver-premium-theme',
        steps: [
          {
            element: '#tour-clients',
            popover: {
              title: 'Step 1: Add Client',
              description: 'Start by adding a client profile to your workspace. This is the foundation of your workflow.',
              side: 'top',
              align: 'center'
            }
          },
          {
            element: '#tour-projects',
            popover: {
              title: 'Step 2: Create Project',
              description: 'Next, create a project and assign it to your new client to start tracking work.',
              side: 'top',
              align: 'center'
            }
          },
          {
            element: '#tour-pricing',
            popover: {
              title: 'Step 3: Price Project',
              description: 'Use the intelligent AI engine to build a comprehensive, grounded estimate for your project.',
              side: 'top',
              align: 'center'
            }
          },
          {
            element: '#tour-docs',
            popover: {
              title: 'Step 4: Generate Docs',
              description: 'Finally, instantly generate professional contracts and invoices based on your pricing.',
              side: 'top',
              align: 'center'
            }
          }
        ],
        onDestroyed: () => {
          // Ensure they don't see it again on reload
          localStorage.setItem("hasSeenTour", "true");
        },
      });

      // Start the tour
      tour.drive();
    }, 1500);

    return () => clearTimeout(timeout);
  }, []);

  return null;
}
