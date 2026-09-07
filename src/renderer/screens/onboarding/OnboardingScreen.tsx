import React, { useState } from 'react';
import { useAppNavigation } from '../../app/navigation';
import { setOnboardingCompleted } from '../../lib/onboarding';
import { Icon } from '../../icons';
import { agreementText, onboardingSteps, totalSteps, type OnboardingStep as OnboardingStepType } from './constants';
import './onboarding.css';

// Порт screens/onboarding + component/onboarding/{OnboardingStep,AgreementStep} (Figma «Desktop / Onboarding»):
// без рейла (AppShell), слева панель с логотипом, справа текст шага, кнопка и точки.

const Dots: React.FC<{ current: number }> = ({ current }) => (
  <div className="onboarding__dots" aria-hidden="true">
    {Array.from({ length: totalSteps }).map((_, index) => (
      <span key={index} className={'onboarding__dot' + (index === current ? ' onboarding__dot--active' : '')} />
    ))}
  </div>
);

type StepProps = {
  currentStep: number;
  stepData: OnboardingStepType;
  onNext: () => void;
  isLastRegularStep: boolean;
};

const OnboardingStep: React.FC<StepProps> = ({ currentStep, stepData, onNext, isLastRegularStep }) => (
  <div className="onboarding">
    {/* Как topCard в приложении: цвет шага с opacity 0.2 поверх фона; иконка — цветом шага (белая на 20 % тинте не видна) */}
    <div className="onboarding__panel">
      <div className="onboarding__panel-tint" style={{ background: stepData.topCardColor }} />
      <div className="onboarding__logo" style={{ color: stepData.topCardColor }}>
        <Icon name="bird" size={220} />
        <div className="onboarding__logo-text">Totus Club</div>
      </div>
    </div>
    <div className="onboarding__content">
      <div className="onboarding__text">
        <div className="onboarding__title">
          {stepData.title.map((line, index) => (
            <span key={index} className="onboarding__title-line">
              {line}
            </span>
          ))}
        </div>
        <div className="onboarding__description">
          {stepData.description.map((line, index) => (
            <span key={index} className="onboarding__description-line">
              {line}
            </span>
          ))}
        </div>
      </div>
      <div className="onboarding__footer">
        <button type="button" className="onboarding__button" onClick={onNext}>
          {isLastRegularStep ? 'Начать' : 'Далее'}
        </button>
        <Dots current={currentStep} />
      </div>
    </div>
  </div>
);

const AgreementStep: React.FC<{ currentStep: number; onAgree: () => void }> = ({ currentStep, onAgree }) => (
  <div className="onboarding onboarding--agreement">
    <div className="onboarding__panel">
      <div className="onboarding__panel-tint" style={{ background: '#2BA9E2' }} />
      <div className="onboarding__logo" style={{ color: '#2BA9E2' }}>
        <Icon name="bird" size={220} />
        <div className="onboarding__logo-text">Totus Club</div>
      </div>
    </div>
    <div className="onboarding__content onboarding__content--agreement">
      <div className="agreement__title">Пользовательское соглашение приложения</div>
      <div className="agreement__intro">Для продолжения работы с приложением необходимо принять условия использования</div>
      <div className="agreement__section-header">ПОЛЬЗОВАТЕЛЬСКОЕ СОГЛАШЕНИЕ</div>
      <div className="agreement__scroll text-selectable">
        <p className="agreement__text">{agreementText}</p>
      </div>
      <div className="agreement__footer">
        <button type="button" className="onboarding__button" onClick={onAgree}>
          Я согласен
        </button>
        <Dots current={currentStep} />
      </div>
    </div>
  </div>
);

export const OnboardingScreen: React.FC = () => {
  const nav = useAppNavigation();
  const [currentStep, setCurrentStep] = useState(0);
  const isAgreementStep = currentStep >= onboardingSteps.length;

  const handleNext = () => {
    if (isAgreementStep) {
      setOnboardingCompleted();
      // Navigate to main app
      nav.replace('home');
    } else {
      setCurrentStep(prev => Math.min(prev + 1, onboardingSteps.length));
    }
  };

  // Show agreement step (no top card)
  if (isAgreementStep) {
    return <AgreementStep currentStep={currentStep} onAgree={handleNext} />;
  }

  // Regular onboarding steps
  const currentData = onboardingSteps[currentStep];
  return (
    <OnboardingStep
      currentStep={currentStep}
      stepData={currentData}
      onNext={handleNext}
      // AgreementStep is the real last step in onboarding flow.
      // Keep regular steps on "Далее" and confirm only on agreement screen.
      isLastRegularStep={false}
    />
  );
};

export default OnboardingScreen;
