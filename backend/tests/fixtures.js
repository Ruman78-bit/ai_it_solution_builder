const requirementInput = () => ({
  industry: 'Education',
  employeeCount: '51-200',
  services: ['networking', 'cybersecurity'],
  requirements:
    'We are a school with a three-floor building and about 400 students. We need reliable Wi-Fi in every classroom and a firewall to filter internet access.',
  budget: '5l-20l',
  location: 'Bengaluru',
  notes: 'We would like this before the next academic year.',
});

const enquiryInput = () => ({
  name: 'Priya Sharma',
  company: 'Green Valley School',
  email: 'priya@greenvalley.example',
  phone: '+91 98765 43210',
  ...requirementInput(),
});

const goodAiOutput = () => ({
  projectSummary: 'The school needs campus-wide Wi-Fi and perimeter security. Internet filtering for students is a priority.',
  identifiedRequirements: ['Wi-Fi coverage across three floors', 'Firewall with web filtering'],
  relevantServiceCategories: ['networking', 'cybersecurity'],
  suggestedComponents: [
    { name: 'Managed Wi-Fi access points', category: 'networking', purpose: 'Classroom coverage' },
    { name: 'Next-generation firewall', category: 'cybersecurity', purpose: 'Web filtering and threat protection' },
  ],
  missingInformation: ['Number of concurrent devices'],
  followUpQuestions: ['Is there existing network cabling on each floor?'],
});

module.exports = { requirementInput, enquiryInput, goodAiOutput };
