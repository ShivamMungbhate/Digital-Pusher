import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

const resources = {
  en: {
    translation: {
      appName: 'Digital Pusher',
      tagline: 'Your honest shield against online tricks, deceptive documents, and scams.',
      disclaimer: 'This is information to help you decide, not legal or financial advice.',
      nav: {
        home: 'Home',
        history: 'History',
        family: 'Family Protection',
        settings: 'Settings',
        logout: 'Sign Out',
        login: 'Sign In'
      },
      home: {
        heading: 'Is something suspicious?',
        subheading: 'Forward a call, text, screenshot, or contract. We will read it and tell you honestly if it is safe.',
        checkButton: 'Check something now',
        modeA_title: 'Suspicious Message or Call',
        modeA_desc: 'Bank warnings, prize claims, lottery, urgent demands',
        modeB_title: 'Shopping or App Trick',
        modeB_desc: 'Hidden fees, sneaky recurring subscriptions, countdown timers',
        modeC_title: 'Official Paper or Notice',
        modeC_desc: 'Rental agreements, loan papers, notices with small print'
      },
      verdict: {
        likely_scam: 'Likely Scam',
        unclear: 'Caution / Unclear',
        looks_genuine: 'Looks Genuine',
        issues_found: 'Unfair Conditions Found',
        no_issues: 'No Hidden Issues Found'
      },
      actions: {
        alertFamily: 'Alert My Family',
        reportDraft: 'Create Report Draft',
        done: 'Done / Safe',
        listenAudio: 'Listen to Explanation'
      }
    }
  },
  hi: {
    translation: {
      appName: 'डिजिटल पुशर',
      tagline: 'ऑनलाइन धोखाधड़ी, चालबाजी और मुश्किल कागजों से आपकी सुरक्षा का कवच।',
      disclaimer: 'यह जानकारी केवल आपके निर्णय में सहायता के लिए है, कानूनी या वित्तीय सलाह नहीं।',
      nav: {
        home: 'मुख्य पृष्ठ',
        history: 'इतिहास',
        family: 'परिवार सुरक्षा',
        settings: 'सेटिंग्स',
        logout: 'लॉग आउट',
        login: 'लॉग इन'
      },
      home: {
        heading: 'क्या कुछ संदिग्ध लग रहा है?',
        subheading: 'कोई कॉल रिकॉर्डिंग, मैसेज या कागज़ भेजें। हम आपको सरल हिंदी में बताएंगे कि यह सुरक्षित है या नहीं।',
        checkButton: 'अभी जांच करें',
        modeA_title: 'संदिग्ध संदेश या कॉल',
        modeA_desc: 'बैंक के नाम पर धमकी, लॉटरी, अचानक पैसों की मांग',
        modeB_title: 'ऐप या खरीदारी में चालाकी',
        modeB_desc: 'छिपी हुई फीस, अनचाहा सब्सक्रिप्शन, नकली समय सीमा',
        modeC_title: 'सरकारी या कानूनी कागजात',
        modeC_desc: 'किरायानामा, लोन के कागज, बारीक अक्षरों में शर्तें'
      },
      verdict: {
        likely_scam: 'सावधान! यह धोखा (Scam) हो सकता है',
        unclear: 'संदेहास्पद / स्पष्ट नहीं',
        looks_genuine: 'सुरक्षित प्रतीत होता है',
        issues_found: 'चालाकी या अनुचित शर्तें मिलीं',
        no_issues: 'कोई अनुचित शर्त नहीं मिली'
      },
      actions: {
        alertFamily: 'परिवार को सूचित करें',
        reportDraft: 'शिकायत का मसौदा बनाएं',
        done: 'सब ठीक है',
        listenAudio: 'ऑडियो सुनें'
      }
    }
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;
