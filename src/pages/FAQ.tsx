import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, HelpCircle } from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
}

const FAQ: React.FC = () => {
  const navigate = useNavigate();

  const faqs: FAQItem[] = [
    {
      id: '1',
      category: 'Getting Started',
      question: 'What is CashKaro and how does it work?',
      answer: 'CashKaro is India\'s largest Cashback and Coupons site. When you shop through CashKaro, retailers pay us a commission for referring you. We share most of this commission with you as Cashback. Simply find your store on CashKaro, click through to shop, and earn Cashback on your purchases!',
    },
    {
      id: '2',
      category: 'Cashback',
      question: 'How long does it take to receive my Cashback?',
      answer: 'Cashback tracking typically happens within 72 hours of your purchase. However, Cashback is confirmed only after the retailer\'s return period ends (usually 30-90 days depending on the store). Once confirmed, you can request a payout to your bank account.',
    },
    {
      id: '3',
      category: 'Cashback',
      question: 'Why is my Cashback showing as "Pending"?',
      answer: 'Pending Cashback means your order has been tracked but is awaiting confirmation from the retailer. This status allows for any potential returns or cancellations. Once the return window closes and the retailer confirms your purchase, your Cashback will move to "Confirmed" status.',
    },
    {
      id: '4',
      category: 'Missing Cashback',
      question: 'What should I do if my Cashback is missing?',
      answer: 'If your Cashback hasn\'t tracked within 72 hours, file a Missing Cashback claim from the Help section. Make sure you have your Order ID ready. We\'ll investigate with the retailer and update you within 45-60 days. Remember to always click through CashKaro before making a purchase!',
    },
    {
      id: '5',
      category: 'Retailers',
      question: 'Which retailers are available on CashKaro?',
      answer: 'CashKaro partners with 1500+ retailers across categories like Fashion, Electronics, Travel, Food Delivery, and more. Popular stores include Amazon, Flipkart, Myntra, Ajio, Swiggy, Zomato, MakeMyTrip, and many others. Check our Deals section to browse all available stores.',
    },
    {
      id: '6',
      category: 'Payments',
      question: 'How can I withdraw my Cashback?',
      answer: 'Once your Cashback is confirmed and you have a minimum balance of ₹250, you can request a payout. Go to the Earnings section, click "Request Payment", choose your preferred payment method (Bank Transfer, UPI, or Amazon Pay), and complete the verification. Payouts are processed within 2-3 business days.',
    },
    {
      id: '7',
      category: 'Payments',
      question: 'What payment methods are available for withdrawal?',
      answer: 'We offer multiple payout options: Direct Bank Transfer (NEFT/IMPS), UPI transfers to any UPI ID, and Amazon Pay balance. Bank transfers and UPI are processed within 2-3 business days, while Amazon Pay credits are usually instant.',
    },
    {
      id: '8',
      category: 'Account',
      question: 'Can I use CashKaro on my mobile phone?',
      answer: 'Absolutely! CashKaro is available as a mobile app on both Android and iOS. You can also use our mobile website. The experience is seamless across all devices - just make sure you\'re logged into your account to track all your Cashback in one place.',
    },
    {
      id: '9',
      category: 'Cashback',
      question: 'Does Cashback work with discount coupons?',
      answer: 'Yes! In most cases, you can combine CashKaro Cashback with retailer discount codes and coupons. However, some exclusive bank offers or certain promo codes might not be eligible for Cashback. Always check the store\'s terms on CashKaro before applying any external codes.',
    },
    {
      id: '10',
      category: 'Technical',
      question: 'Why didn\'t my Cashback track even though I clicked through CashKaro?',
      answer: 'Cashback may not track if: you had ad blockers enabled, used a different browser/device to complete purchase, your cookies were disabled, you visited other cashback sites before checkout, or you modified your cart after clicking through. Always complete your purchase in one session without visiting other sites.',
    },
  ];

  // Group FAQs by category
  const categories = [...new Set(faqs.map(faq => faq.category))];

  return (
    <AppLayout>
      <div className="min-h-screen bg-background">
        {/* Breadcrumb */}
        <div className="px-4 py-3 border-b border-border">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/" className="text-muted-foreground hover:text-foreground">
                  Home
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink href="/help" className="text-muted-foreground hover:text-foreground">
                  Help
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>FAQ</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        {/* Header */}
        <div className="bg-primary px-6 py-8 md:py-12">
          <div className="max-w-4xl mx-auto">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/help')}
              className="text-primary-foreground hover:bg-primary-foreground/10 -ml-2 mb-4"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Back to Help
            </Button>
            <div className="flex items-center gap-3">
              <HelpCircle className="w-8 h-8 text-primary-foreground" />
              <h1 className="text-2xl md:text-3xl font-bold text-primary-foreground">
                Frequently Asked Questions
              </h1>
            </div>
            <p className="text-primary-foreground/80 mt-2">
              Find answers to the most common questions about CashKaro
            </p>
          </div>
        </div>

        {/* FAQ Content */}
        <div className="max-w-4xl mx-auto px-4 py-8">
          {categories.map((category) => (
            <div key={category} className="mb-8">
              <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-primary"></span>
                {category}
              </h2>
              <Accordion type="single" collapsible className="space-y-3">
                {faqs
                  .filter(faq => faq.category === category)
                  .map((faq) => (
                    <AccordionItem
                      key={faq.id}
                      value={faq.id}
                      className="border border-border rounded-lg px-4 data-[state=open]:bg-secondary/30"
                    >
                      <AccordionTrigger className="text-left hover:no-underline py-4">
                        <span className="font-medium text-foreground pr-4">
                          {faq.question}
                        </span>
                      </AccordionTrigger>
                      <AccordionContent className="text-muted-foreground pb-4 leading-relaxed">
                        {faq.answer}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
              </Accordion>
            </div>
          ))}

          {/* Still Need Help */}
          <div className="mt-12 p-6 bg-secondary/50 rounded-xl text-center">
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Still have questions?
            </h3>
            <p className="text-muted-foreground mb-4">
              Can't find what you're looking for? We're here to help!
            </p>
            <Button onClick={() => navigate('/feedback')} className="bg-primary hover:bg-primary/90">
              Contact Support
            </Button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default FAQ;
