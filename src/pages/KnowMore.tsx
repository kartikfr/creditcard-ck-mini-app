import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CreditCard, CheckCircle, Shield, Wallet, HelpCircle } from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

const KnowMore: React.FC = () => {
  const navigate = useNavigate();

  const steps = [
    {
      title: 'Step 1: Visit the Platform',
      content: 'Go to the "Credit Card Cashback" Powered by CashKaro platform and log in or sign up using your registered mobile number or email ID.',
    },
    {
      title: 'Step 2: Choose Your Credit Card',
      content: 'Search for the credit card you want and check key details such as card features, fees, and reward conditions before applying.',
    },
    {
      title: 'Step 3: Start Your Application',
      content: 'Click on the button of the product. You will be redirected to the official bank website to complete your application securely. Always start your application from the product button so your rewards are tracked correctly.',
    },
    {
      title: 'Step 4: Complete the Application Form',
      content: 'Fill in your personal, contact, and income details. Upload required documents such as PAN card, address proof, and income proof if required by the bank.',
    },
    {
      title: 'Step 5: Verification and Approval',
      content: 'The bank will verify your details through a phone call, video KYC, or physical verification. Once verified, your credit card will be approved and issued.',
    },
    {
      title: 'Step 6: Card Activation and Usage',
      content: 'After receiving your credit card, activate it and make a qualifying purchase as required by the bank and platform terms.',
    },
    {
      title: 'Step 7: Receive Your Rewards',
      content: 'Once all conditions are met, rewards will be credited to your "Credit Card Cashback" Powered by CashKaro account. You can redeem these rewards as Amazon Pay Balance or Flipkart Gift Cards.',
    },
  ];

  const faqs = [
    {
      question: 'Will I get rewards on every credit card application?',
      answer: 'Most listed credit cards offer rewards, but reward value and conditions may vary.',
    },
    {
      question: 'When will my rewards be credited?',
      answer: 'Rewards are credited after your credit card is approved, activated, and used as per applicable terms.',
    },
    {
      question: 'How can I redeem my rewards?',
      answer: 'Rewards can be redeemed as Amazon Pay Balance or Flipkart Gift Cards from your account.',
    },
    {
      question: 'Is it safe to apply through this platform?',
      answer: 'Yes. You are redirected to the official bank website to complete the application securely.',
    },
    {
      question: 'Can I apply for more than one credit card?',
      answer: 'Yes, but approval depends on your eligibility and bank policies.',
    },
  ];

  return (
    <AppLayout>
      <div className="p-4 lg:p-8 max-w-4xl mx-auto pb-24 lg:pb-8">
        {/* Back Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
          className="mb-4 -ml-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-xl md:text-2xl font-display font-bold text-foreground mb-2">
            How to Get Rewards on Your Credit Card Application
          </h1>
          <p className="text-sm text-muted-foreground">
            Credit Card Cashback Powered by CashKaro
          </p>
        </div>

        {/* Intro */}
        <div className="card-elevated p-4 md:p-6 mb-6">
          <p className="text-sm md:text-base text-foreground leading-relaxed">
            When you apply for a credit card through "Credit Card Cashback" Powered by CashKaro, 
            you can earn extra rewards along with the regular benefits provided by the bank. 
            These rewards are credited after your credit card is approved, activated, and used as per applicable terms.
          </p>
        </div>

        {/* What is Credit Card Cashback */}
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
              <CreditCard className="w-4 h-4 text-primary" />
            </div>
            <h2 className="text-lg font-display font-semibold text-foreground">
              What is "Credit Card Cashback" Powered by CashKaro?
            </h2>
          </div>
          <div className="card-elevated p-4 md:p-6">
            <p className="text-sm md:text-base text-foreground leading-relaxed mb-4">
              "Credit Card Cashback" Powered by CashKaro is a trusted rewards platform that allows users 
              to apply for credit cards and earn additional rewards for a successful application.
            </p>
            <p className="text-sm md:text-base text-foreground leading-relaxed">
              You continue to receive all standard benefits offered by the bank, along with extra rewards 
              from "Credit Card Cashback" Powered by CashKaro.
            </p>
          </div>
        </section>

        {/* Eligibility */}
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-accent/10 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-4 h-4 text-accent" />
            </div>
            <h2 className="text-lg font-display font-semibold text-foreground">
              Who Can Apply for a Credit Card?
            </h2>
          </div>
          <div className="card-elevated p-4 md:p-6">
            <p className="text-sm md:text-base text-foreground leading-relaxed mb-4">
              Eligibility depends on the credit card and bank, but usually includes:
            </p>
            <ul className="space-y-2 text-sm md:text-base text-foreground">
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                Age between 21 and 60 years
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                Minimum income as required by the card issuer
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                A good credit score, generally 650 or above
              </li>
            </ul>
            <p className="text-sm text-muted-foreground mt-4">
              Exact eligibility details are mentioned on the credit card page.
            </p>
          </div>
        </section>

        {/* How to Apply Steps */}
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
              <Shield className="w-4 h-4 text-primary" />
            </div>
            <h2 className="text-lg font-display font-semibold text-foreground">
              How to Apply and Earn Rewards
            </h2>
          </div>
          <div className="card-elevated p-4 md:p-6">
            <Accordion type="single" collapsible className="w-full">
              {steps.map((step, index) => (
                <AccordionItem key={index} value={`step-${index}`}>
                  <AccordionTrigger className="text-sm md:text-base font-medium text-left">
                    {step.title}
                  </AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
                    {step.content}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>

        {/* Why Apply Through Us */}
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-accent/10 rounded-lg flex items-center justify-center">
              <Wallet className="w-4 h-4 text-accent" />
            </div>
            <h2 className="text-lg font-display font-semibold text-foreground">
              Why Apply Through "Credit Card Cashback" Powered by CashKaro?
            </h2>
          </div>
          <div className="card-elevated p-4 md:p-6">
            <ul className="space-y-3 text-sm md:text-base text-foreground">
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                You earn extra rewards in addition to the credit card's regular benefits
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                Your application is completed on the official bank website, ensuring safety
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                You can compare multiple credit cards in one place
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                Rewards are easy to track and redeem
              </li>
            </ul>
          </div>
        </section>

        {/* Important Points */}
        <section className="mb-8">
          <h2 className="text-lg font-display font-semibold text-foreground mb-4">
            Important Points to Remember
          </h2>
          <div className="card-elevated p-4 md:p-6 bg-destructive/5 border-destructive/20">
            <ul className="space-y-2 text-sm md:text-base text-foreground">
              <li className="flex items-start gap-2">
                <span className="text-destructive mt-1">•</span>
                Rewards are credited only after successful card approval, activation, and qualifying usage
              </li>
              <li className="flex items-start gap-2">
                <span className="text-destructive mt-1">•</span>
                Rewards are subject to bank and platform terms and conditions
              </li>
              <li className="flex items-start gap-2">
                <span className="text-destructive mt-1">•</span>
                Reward offers may change or end without prior notice
              </li>
              <li className="flex items-start gap-2">
                <span className="text-destructive mt-1">•</span>
                Applying directly on the bank website without starting from the product button may make you ineligible for rewards
              </li>
            </ul>
          </div>
        </section>

        {/* FAQs */}
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
              <HelpCircle className="w-4 h-4 text-primary" />
            </div>
            <h2 className="text-lg font-display font-semibold text-foreground">
              Frequently Asked Questions
            </h2>
          </div>
          <div className="card-elevated p-4 md:p-6">
            <Accordion type="single" collapsible className="w-full">
              {faqs.map((faq, index) => (
                <AccordionItem key={index} value={`faq-${index}`}>
                  <AccordionTrigger className="text-sm md:text-base font-medium text-left">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>

        {/* Final Note */}
        <div className="card-elevated p-4 md:p-6 bg-primary/5 border-primary/20 text-center">
          <p className="text-sm md:text-base text-foreground leading-relaxed mb-2">
            Applying for a credit card through "Credit Card Cashback" Powered by CashKaro helps you 
            earn extra rewards while enjoying all the benefits offered by your credit card.
          </p>
          <p className="text-base md:text-lg font-semibold text-primary">
            Apply smart and get rewarded.
          </p>
        </div>
      </div>
    </AppLayout>
  );
};

export default KnowMore;
