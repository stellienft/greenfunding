import { Check } from 'lucide-react';

interface Step {
  number: number;
  title: string;
  path: string;
}

const steps: Step[] = [
  { number: 1, title: 'Project Details', path: '/' },
  { number: 2, title: 'Your Quote', path: '/step-3' },
];

interface StepperProps {
  currentStep: number;
}

export function Stepper({ currentStep }: StepperProps) {
  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-4">
      <div className="flex items-start justify-center">
        {steps.map((step, index) => (
          <div key={step.number} className="flex items-start">
            <div className="flex flex-col items-center">
              <div
                className={`
                  w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center font-bold transition-all text-base sm:text-lg
                  ${
                    currentStep > step.number
                      ? 'bg-[#28AA48] text-white'
                      : currentStep === step.number
                      ? 'bg-[#28AA48] text-white ring-4 ring-[#28AA48]/20'
                      : 'bg-gray-200 text-gray-500'
                  }
                `}
              >
                {currentStep > step.number ? (
                  <Check className="w-6 h-6 sm:w-7 sm:h-7" />
                ) : (
                  step.number
                )}
              </div>
              <span
                className={`
                  mt-3 text-xs sm:text-base font-semibold text-center whitespace-nowrap
                  ${
                    currentStep >= step.number ? 'text-[#3A475B]' : 'text-gray-500'
                  }
                `}
              >
                {step.title}
              </span>
            </div>

            {index < steps.length - 1 && (
              <div className="flex items-center pt-6 sm:pt-7 px-4 sm:px-8 lg:px-12">
                <div
                  className={`
                    h-1 w-16 sm:w-32 lg:w-40 transition-all
                    ${
                      currentStep > step.number
                        ? 'bg-[#28AA48]'
                        : 'bg-gray-200'
                    }
                  `}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
