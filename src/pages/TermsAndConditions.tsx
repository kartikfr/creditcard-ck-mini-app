import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';

const TermsAndConditions: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate(-1)}
            className="rounded-full"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            <h1 className="text-lg font-display font-bold">Terms & Conditions</h1>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="prose prose-sm md:prose-base dark:prose-invert max-w-none">
          <p className="text-muted-foreground text-sm mb-6">
            Last updated: December 2024
          </p>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-4">1. Acceptance of Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              By accessing or using CashKaro's services, you agree to be bound by these Terms and Conditions. If you do not agree to these terms, please do not use our services. These terms apply to all users of the platform, including browsers, customers, and contributors of content.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-4">2. Description of Service</h2>
            <p className="text-muted-foreground leading-relaxed">
              CashKaro is a cashback and coupon platform that enables users to earn cashback on their online purchases through our partner retailers. We provide links to third-party websites where you can make purchases and earn cashback rewards that will be credited to your CashKaro account.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-4">3. User Account</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              To use our cashback services, you must create an account by providing accurate and complete information. You are responsible for:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Maintaining the confidentiality of your account credentials</li>
              <li>All activities that occur under your account</li>
              <li>Notifying us immediately of any unauthorized use</li>
              <li>Ensuring your contact information is up to date</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-4">4. Cashback Terms</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Cashback is subject to the following conditions:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Cashback rates are subject to change without prior notice</li>
              <li>Cashback will only be tracked when you click through CashKaro</li>
              <li>Ad blockers and certain browser extensions may prevent tracking</li>
              <li>Returns or cancellations may result in cashback being voided</li>
              <li>Minimum withdrawal amount applies for cashback payouts</li>
              <li>Cashback confirmation times vary by retailer</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-4">5. Payment Processing</h2>
            <p className="text-muted-foreground leading-relaxed">
              Once your cashback is confirmed and you meet the minimum withdrawal threshold, you can request a payment transfer to your bank account or preferred payment method. Processing times may vary, and we reserve the right to verify your identity before processing payments.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-4">6. Prohibited Activities</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              You agree not to engage in any of the following:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Creating multiple accounts to abuse cashback offers</li>
              <li>Using automated tools or bots to interact with our services</li>
              <li>Fraudulent purchases or return abuse</li>
              <li>Sharing referral links through spam or deceptive means</li>
              <li>Any activity that violates applicable laws or regulations</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-4">7. Intellectual Property</h2>
            <p className="text-muted-foreground leading-relaxed">
              All content on CashKaro, including logos, text, graphics, and software, is the property of CashKaro or its licensors and is protected by intellectual property laws. You may not reproduce, distribute, or create derivative works without our express written consent.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-4">8. Limitation of Liability</h2>
            <p className="text-muted-foreground leading-relaxed">
              CashKaro is not liable for any indirect, incidental, or consequential damages arising from your use of our services. We are not responsible for the products or services offered by our partner retailers, and any issues should be resolved directly with the retailer.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-4">9. Modifications to Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              We reserve the right to modify these terms at any time. Continued use of our services after changes are posted constitutes your acceptance of the modified terms. We encourage you to review these terms periodically.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-4">10. Contact Information</h2>
            <p className="text-muted-foreground leading-relaxed">
              If you have any questions about these Terms and Conditions, please contact us at:
            </p>
            <div className="mt-4 p-4 bg-muted/30 rounded-lg">
              <p className="text-foreground font-medium">CashKaro.com</p>
              <p className="text-muted-foreground">Email: support@cashkaro.com</p>
              <p className="text-muted-foreground">Gurugram, Haryana, India - 122002</p>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};

export default TermsAndConditions;
