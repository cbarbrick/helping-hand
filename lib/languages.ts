// Languages offered on the welcome screen. `full` means the whole app UI is translated;
// others show the welcome text in their language and fall back to English inside the app for now.
export type LangInfo = { code: string; native: string; english: string; full: boolean; rtl?: boolean };

export const LANGUAGES: LangInfo[] = [
  { code: "en", native: "English", english: "English", full: true },
  { code: "es", native: "Español", english: "Spanish", full: true },
  { code: "ht", native: "Kreyòl Ayisyen", english: "Haitian Creole", full: true },
  { code: "pt", native: "Português", english: "Portuguese", full: false },
  { code: "fr", native: "Français", english: "French", full: false },
  { code: "zh", native: "中文", english: "Chinese", full: false },
  { code: "vi", native: "Tiếng Việt", english: "Vietnamese", full: false },
  { code: "ar", native: "العربية", english: "Arabic", full: false, rtl: true },
  { code: "ru", native: "Русский", english: "Russian", full: false },
  { code: "tl", native: "Tagalog", english: "Tagalog", full: false },
  { code: "ko", native: "한국어", english: "Korean", full: false },
  { code: "hi", native: "हिन्दी", english: "Hindi", full: false },
  { code: "de", native: "Deutsch", english: "German", full: false },
  { code: "it", native: "Italiano", english: "Italian", full: false },
];

// Welcome copy shown on the front page, cycling through languages until someone taps.
export type Welcome = { code: string; tagline: string; what: string; items?: string[]; tap: string; askLanguage: string };

export const WELCOME: Welcome[] = [
  {
    code: "en",
    tagline: "Real help, in your language, in your neighborhood.",
    what: "Housing that is not a shelter. Food and clothes in 20 minutes. ID, Social Security card, EBT, Medicaid, disability. A job. A person nearby who walks with you. No phone or email needed.",
    items: ["Housing (not a shelter)", "Food & clothes in 20 minutes", "ID & birth certificate", "Social Security card", "EBT & Medicaid", "Disability benefits", "A job", "A helper who walks with you", "No phone or email needed"],
    tap: "Tap anywhere to begin",
    askLanguage: "What language do you speak?",
  },
  {
    code: "es",
    tagline: "Ayuda real, en su idioma, en su barrio.",
    what: "Vivienda que no es un refugio. Comida y ropa en 20 minutos. Identificación, Seguro Social, EBT, Medicaid, discapacidad. Un trabajo. Una persona cerca que le acompaña. No necesita teléfono ni correo.",
    items: ["Vivienda (no un refugio)", "Comida y ropa en 20 minutos", "Identificación y acta de nacimiento", "Tarjeta del Seguro Social", "EBT y Medicaid", "Beneficios por discapacidad", "Un trabajo", "Un ayudante que le acompaña", "Sin teléfono ni correo"],
    tap: "Toque en cualquier lugar para empezar",
    askLanguage: "¿Qué idioma habla?",
  },
  {
    code: "ht",
    tagline: "Èd reyèl, nan lang ou, nan katye w.",
    what: "Lojman ki pa yon abri. Manje ak rad nan 20 minit. ID, Sekirite Sosyal, EBT, Medicaid, andikap. Yon travay. Yon moun toupre w ki mache avè w. Ou pa bezwen telefòn ni imel.",
    items: ["Lojman (pa yon abri)", "Manje ak rad nan 20 minit", "ID ak batistè", "Kat Sekirite Sosyal", "EBT ak Medicaid", "Benefis andikap", "Yon travay", "Yon moun k ap ede ki mache avè w", "Pa bezwen telefòn ni imel"],
    tap: "Peze nenpòt kote pou kòmanse",
    askLanguage: "Ki lang ou pale?",
  },
  {
    code: "pt",
    tagline: "Ajuda de verdade, no seu idioma, no seu bairro.",
    what: "Moradia que não é abrigo. Comida e roupas em 20 minutos. Identidade, Seguro Social, EBT, Medicaid, deficiência. Um emprego. Uma pessoa perto de você que caminha ao seu lado. Sem telefone ou e-mail.",
    tap: "Toque em qualquer lugar para começar",
    askLanguage: "Que idioma você fala?",
  },
  {
    code: "fr",
    tagline: "Une vraie aide, dans votre langue, dans votre quartier.",
    what: "Un logement qui n'est pas un refuge. Nourriture et vêtements en 20 minutes. Pièce d'identité, sécurité sociale, EBT, Medicaid, handicap. Un emploi. Une personne près de vous qui vous accompagne. Pas besoin de téléphone ni d'e-mail.",
    tap: "Touchez n'importe où pour commencer",
    askLanguage: "Quelle langue parlez-vous ?",
  },
  {
    code: "zh",
    tagline: "真正的帮助，用您的语言，就在您的社区。",
    what: "不是收容所的住房。20分钟内送到的食物和衣服。身份证、社会安全卡、EBT、Medicaid、残障补助。一份工作。附近有人陪您一起走。不需要手机或电子邮件。",
    tap: "点击任意位置开始",
    askLanguage: "您说什么语言？",
  },
  {
    code: "vi",
    tagline: "Giúp đỡ thật sự, bằng ngôn ngữ của bạn, ngay trong khu phố của bạn.",
    what: "Nhà ở không phải là nơi tạm trú. Thức ăn và quần áo trong 20 phút. Giấy tờ tùy thân, thẻ An sinh Xã hội, EBT, Medicaid, trợ cấp khuyết tật. Một công việc. Một người gần bạn đồng hành cùng bạn. Không cần điện thoại hay email.",
    tap: "Chạm vào bất kỳ đâu để bắt đầu",
    askLanguage: "Bạn nói ngôn ngữ nào?",
  },
  {
    code: "ar",
    tagline: "مساعدة حقيقية، بلغتك، في حيّك.",
    what: "سكن وليس ملجأ. طعام وملابس خلال 20 دقيقة. بطاقة هوية، بطاقة الضمان الاجتماعي، EBT، Medicaid، إعانة الإعاقة. وظيفة. شخص قريب منك يرافقك. لا حاجة لهاتف أو بريد إلكتروني.",
    tap: "المس أي مكان للبدء",
    askLanguage: "ما هي اللغة التي تتحدثها؟",
  },
  {
    code: "ru",
    tagline: "Настоящая помощь, на вашем языке, в вашем районе.",
    what: "Жильё, а не приют. Еда и одежда за 20 минут. Удостоверение личности, карта Social Security, EBT, Medicaid, пособие по инвалидности. Работа. Человек рядом, который пройдёт этот путь с вами. Телефон и электронная почта не нужны.",
    tap: "Нажмите в любом месте, чтобы начать",
    askLanguage: "На каком языке вы говорите?",
  },
  {
    code: "tl",
    tagline: "Tunay na tulong, sa iyong wika, sa iyong komunidad.",
    what: "Tirahan na hindi shelter. Pagkain at damit sa loob ng 20 minuto. ID, Social Security card, EBT, Medicaid, disability. Trabaho. Isang taong malapit sa iyo na sasamahan ka. Hindi kailangan ng telepono o email.",
    tap: "Pindutin kahit saan para magsimula",
    askLanguage: "Anong wika ang sinasalita mo?",
  },
  {
    code: "ko",
    tagline: "진짜 도움, 당신의 언어로, 당신의 동네에서.",
    what: "쉼터가 아닌 주거. 20분 안에 도착하는 음식과 옷. 신분증, 사회보장카드, EBT, Medicaid, 장애 지원. 일자리. 곁에서 함께 걸어주는 사람. 전화나 이메일이 없어도 됩니다.",
    tap: "아무 곳이나 눌러 시작하세요",
    askLanguage: "어떤 언어를 사용하시나요?",
  },
  {
    code: "hi",
    tagline: "सच्ची मदद, आपकी भाषा में, आपके मोहल्ले में।",
    what: "ऐसा आवास जो शेल्टर नहीं है। 20 मिनट में खाना और कपड़े। पहचान पत्र, सोशल सिक्योरिटी कार्ड, EBT, Medicaid, विकलांगता सहायता। एक नौकरी। पास का एक व्यक्ति जो आपके साथ चले। फ़ोन या ईमेल की ज़रूरत नहीं।",
    tap: "शुरू करने के लिए कहीं भी टैप करें",
    askLanguage: "आप कौन सी भाषा बोलते हैं?",
  },
  {
    code: "de",
    tagline: "Echte Hilfe, in Ihrer Sprache, in Ihrem Viertel.",
    what: "Wohnen statt Notunterkunft. Essen und Kleidung in 20 Minuten. Ausweis, Sozialversicherungskarte, EBT, Medicaid, Behindertenhilfe. Ein Job. Ein Mensch in Ihrer Nähe, der Sie begleitet. Kein Telefon, keine E-Mail nötig.",
    tap: "Tippen Sie irgendwo, um zu beginnen",
    askLanguage: "Welche Sprache sprechen Sie?",
  },
  {
    code: "it",
    tagline: "Aiuto vero, nella tua lingua, nel tuo quartiere.",
    what: "Una casa che non è un rifugio. Cibo e vestiti in 20 minuti. Documento, tessera Social Security, EBT, Medicaid, disabilità. Un lavoro. Una persona vicina che cammina con te. Nessun telefono o e-mail necessari.",
    tap: "Tocca ovunque per iniziare",
    askLanguage: "Che lingua parli?",
  },
];
