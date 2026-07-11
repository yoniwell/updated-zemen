import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'en',
    resources: {
      en: {
        translation: {
          // Navbar & General
          home: "Home",
          about: "About",
          savings: "Savings",
          loans: "Loans",
          membership: "Membership",
          contact: "Contact",
          contact_btn: "Contact Us",
          apply_now: "Apply Now",

          // Loans Page
          loan_hero_title: "Loan Products Designed for You",
          loan_hero_sub: "Access capital with fair interest rates and terms that respect your financial health.",
          personal_loans: "Personal Loans",
          business_loans: "Business Loans",
          emergency_loans: "Emergency Loans",
          dev_loans: "Development Loans",
          purpose: "Purpose",
          eligibility: "Eligibility",
          repayment: "Repayment",

          // Membership Page
          why_join: "Why Become a Member?",
          member_sub: "Membership at Zemen is a partnership where you own a part of the institution.",
          step_fill: "Fill Form",
          step_docs: "Upload Docs",
          step_pay: "Pay Share",
          step_approve: "Approval",
        //hero page 
        build_wealth:"Build Wealth"
        }

      },
      am: {
        translation: {
          home: "መነሻ",
          about: "ስለ እኛ",
          savings: "ቁጠባ",
          loans: "ብድር",
          membership: "አባልነት",
          contact: "አድራሻ",
          contact_btn: "ያግኙን",
          apply_now: "አሁኑኑ ያመልክቱ",

          loan_hero_title: "ለእርስዎ ተስማሚ የሆኑ የብድር አይነቶች",
          loan_hero_sub: "ተመጣጣኝ ወለድ እና ምቹ የክፍያ ጊዜ ያለው ካፒታል ያግኙ።",
          personal_loans: "የግል ብድር",
          business_loans: "የንግድ ብድር",
          emergency_loans: "የአስቸኳይ ጊዜ ብድር",
          dev_loans: "የልማት ብድር",
          purpose: "አላማ",
          eligibility: "መስፈርት",
          repayment: "አከፋፈል",

          why_join: "ለምን አባል ይሆናሉ?",
          member_sub: "የዘመን አባልነት የድርጅቱ ባለቤት የሚሆኑበት የጋራ ጉዞ ነው።",
          step_fill: "ፎርም መሙላት",
          step_docs: "ሰነድ መላክ",
          step_pay: "ክፍያ መፈጸም",
          step_approve: "ማረጋገጫ"
        }
      },
      ti: {
        translation: {
          home: "መበገሲ",
          about: "ብዛዕባና",
          savings: "ቁጠባ",
          loans: "ልቓሕ",
          membership: "ኣባልነት",
          contact: "ርኸቡና",
          contact_btn: "ርኸቡና",
          apply_now: "ሕጂ ኣመልክቱ",

          loan_hero_title: "ንዓኻ ዝተዳለዉ ናይ ልቓሕ ዓይነታት",
          loan_hero_sub: "ርትዓዊ ወለድን ምቹእ ናይ ክፍሊት ግዜን ዘለዎ ካፒታል ይረኽቡ።",
          personal_loans: "ናይ ውልቀ ልቓሕ",
          business_loans: "ናይ ንግዲ ልቓሕ",
          emergency_loans: "ናይ ህጹጽ እዋን ልቓሕ",
          dev_loans: "ናይ ልምዓት ልቓሕ",
          purpose: "ዕላማ",
          eligibility: "ረቛሒታት",
          repayment: "ኣከፋፍላ",

          why_join: "ስለምንታይ ኣባል ትኾኑ?",
          member_sub: "ኣባልነት ዘመን ናይቲ ትካል ዋና ዝኾኑሉ ናይ ሓባር ጉዕዞ እዩ።",
          step_fill: "ፎርም ምምላእ",
          step_docs: "ሰነድ ምልኣኽ",
          step_pay: "ክፍሊት ምፍጻም",
          step_approve: "ምጽዳቕ"
        }
      }
    }
  });

export default i18n;