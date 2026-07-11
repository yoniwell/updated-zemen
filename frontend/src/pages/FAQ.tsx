import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { fetchPublicFaqs, type PublicFaq } from '@/lib/publicContentApi';
import { usePublicUiI18n } from '@/lib/uiI18n';

const faqs = [
  {
    questionKey: 'faqQ1',
    questionFallback: 'Who can become a member of Zemen Cooperative?',
    answerKey: 'faqA1',
    answerFallback: 'Any Ethiopian resident or community group above the age of 18 with a stable source of income or interest in saving can become a member. We welcome individuals, NGOs, and businesses who share our vision of mutual growth.'
  },
  {
    questionKey: 'faqQ2',
    questionFallback: 'What documents are required for membership?',
    answerKey: 'faqA2',
    answerFallback: 'You will need a valid National Identity Card or Passport, two recent passport-sized photographs, and proof of your residential address (such as a utility bill or local government letter).'
  },
  {
    questionKey: 'faqQ3',
    questionFallback: 'How long does the membership approval take?',
    answerKey: 'faqA3',
    answerFallback: 'Typically, the review and approval process for a new membership application takes between 2 to 3 business days once all required documents are submitted and verified.'
  },
  {
    questionKey: 'faqQ4',
    questionFallback: 'What KYC documents are mandatory for online applications?',
    answerKey: 'faqA4',
    answerFallback: 'At minimum, applicants must provide a valid national ID or passport, a recent applicant photo, and proof of address when requested. For some loan products, additional documents such as bank statements, payslips, or business licenses are required.'
  },
  {
    questionKey: 'faqQ5',
    questionFallback: 'Can I track my application after submission?',
    answerKey: 'faqA5',
    answerFallback: 'Yes. After submission, you receive a reference number that can be used to track status updates such as Under Review, Pending Documents, Approved, or Rejected.'
  },
  {
    questionKey: 'faqQ6',
    questionFallback: 'Can I apply for a loan immediately after joining?',
    answerKey: 'faqA6',
    answerFallback: 'While some emergency products may be accessible sooner, most standard loan products require an active membership and a consistent savings history of at least 6 months to ensure financial stability and mutual trust.'
  },
  {
    questionKey: 'faqQ7',
    questionFallback: 'Why was my application marked as pending documents?',
    answerKey: 'faqA7',
    answerFallback: 'This status usually means one or more uploaded files are missing, expired, unclear, or do not match your submitted details. Re-uploading valid documents typically resumes the review quickly.'
  },
  {
    questionKey: 'faqQ8',
    questionFallback: 'Can I apply for a loan or membership using my phone?',
    answerKey: 'faqA8',
    answerFallback: 'Absolutely! Our website and digital application portal are fully optimized for mobile devices. You can complete forms, upload photos of your documents, and track your application status directly from your smartphone.'
  },
  {
    questionKey: 'faqQ9',
    questionFallback: 'What are the interest rates for loans and savings?',
    answerKey: 'faqA9',
    answerFallback: 'Interest rates vary based on the specific product and market conditions. However, we pride ourselves on offering competitive savings dividends that outperform traditional banks and fair, transparent interest rates for our loan products. Please contact a branch for the latest specific rates.'
  },
  {
    questionKey: 'faqQ10',
    questionFallback: 'Can I save my application and continue later?',
    answerKey: 'faqA10',
    answerFallback: 'Yes, once you start an application, you can create a temporary account that allows you to save your progress. You will receive a link to your email to resume exactly where you left off.'
  },
  {
    questionKey: 'faqQ11',
    questionFallback: 'How are loan decisions made?',
    answerKey: 'faqA11',
    answerFallback: 'Loan decisions are based on eligibility, repayment capacity, document verification, and product policy limits. Final approval is completed by authorized officers after internal review checks.'
  }
];

export default function FAQs() {
  const { tPublic } = usePublicUiI18n();
  const [items, setItems] = useState<Array<{ question: string; answer: string }>>(
    faqs.map((item) => ({
      question: tPublic(item.questionKey, item.questionFallback),
      answer: tPublic(item.answerKey, item.answerFallback),
    }))
  );

  useEffect(() => {
    let mounted = true;

    const loadFaqs = async () => {
      try {
        const cmsFaqs: PublicFaq[] = await fetchPublicFaqs();
        if (!mounted || cmsFaqs.length === 0) return;

        setItems(
          cmsFaqs.map((faq) => ({
            question: faq.question,
            answer: faq.answer,
          }))
        );
      } catch {
        // Keep static fallback faqs when CMS endpoint is unavailable.
      }
    };

    void loadFaqs();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="pt-16 pb-24 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-2xl mx-auto mb-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-4xl lg:text-5xl font-extrabold text-blue-950 mb-6 italic">{tPublic('faqHeroTitle', 'Frequently Asked Questions')}</h1>
            <p className="text-xl text-gray-600 leading-relaxed italic">
              {tPublic('faqHeroDescription', 'Find quick answers to common questions about membership, loans, and our digital services.')}
            </p>
          </motion.div>
        </div>

        <div className="max-w-3xl mx-auto bg-white rounded-[2.5rem] p-8 lg:p-12 shadow-xl shadow-blue-50 border border-blue-50">
          <Accordion type="single" collapsible className="w-full">
            {items.map((faq, index) => (
              <AccordionItem key={index} value={`item-${index}`} className="border-b-blue-50 py-2">
                <AccordionTrigger className="text-lg font-bold text-blue-950 hover:text-blue-600 text-left hover:no-underline italic">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-gray-600 text-base leading-relaxed italic font-medium pt-4">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>

        <div className="mt-20 text-center">
          <p className="text-gray-500 mb-6 italic">{tPublic('faqMissingQuestionPrompt', "Don't see your question here?")}</p>
          <a 
            href="/contact" 
            className="inline-flex items-center text-blue-600 font-bold text-lg hover:underline italic"
          >
            {tPublic('faqContactSupport', 'Contact our Support Team')} →
          </a>
        </div>
      </div>
    </div>
  );
}
