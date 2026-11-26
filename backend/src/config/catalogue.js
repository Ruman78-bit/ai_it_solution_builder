/**
 * IT service catalogue.
 *
 * IMPORTANT: These categories are ILLUSTRATIVE. They follow the categories in the
 * project brief and have NOT been verified against Cyber Communications' official
 * service list (the company website could not be reached while this was built).
 * Every entry is marked `verified: false` and the UI shows a "pending company
 * confirmation" badge until someone at the company confirms it and sets
 * `verified: true`.
 *
 * The AI module is restricted to these category ids, so editing this file is the
 * single place to change what the AI can recommend.
 */
const catalogue = [
  {
    id: 'hardware-laptops',
    name: 'Hardware & Laptops',
    summary: 'Business desktops, laptops, workstations and peripherals for teams of any size.',
    examples: ['Laptops and desktops', 'Workstations', 'Monitors and peripherals', 'Printers and scanners'],
    verified: false,
  },
  {
    id: 'servers-storage',
    name: 'Servers & Storage',
    summary: 'On-premise servers, storage systems and backup infrastructure for business data.',
    examples: ['Rack and tower servers', 'NAS / SAN storage', 'Backup appliances', 'UPS and power'],
    verified: false,
  },
  {
    id: 'networking',
    name: 'Networking',
    summary: 'Wired and wireless networks for offices, branches and campuses.',
    examples: ['Switching and routing', 'Wi-Fi access points', 'Structured cabling', 'Branch connectivity'],
    verified: false,
  },
  {
    id: 'cybersecurity',
    name: 'Cybersecurity',
    summary: 'Protection for networks, devices and data against modern threats.',
    examples: ['Firewalls', 'Endpoint protection', 'Email security', 'Security assessments'],
    verified: false,
  },
  {
    id: 'cloud-solutions',
    name: 'Cloud Solutions',
    summary: 'Cloud adoption, migration and productivity suites for modern workplaces.',
    examples: ['Cloud migration', 'Productivity and email suites', 'Cloud backup', 'Hybrid setups'],
    verified: false,
  },
  {
    id: 'software-business-tech',
    name: 'Software & Business Technology',
    summary: 'Licensed software and business applications that keep teams productive.',
    examples: ['Operating system and office licensing', 'Collaboration tools', 'Business applications'],
    verified: false,
  },
  {
    id: 'it-support',
    name: 'IT Support',
    summary: 'Installation, maintenance and ongoing support for your IT environment.',
    examples: ['Installation and setup', 'Annual maintenance', 'Helpdesk support', 'On-site support'],
    verified: false,
  },
];

const categoryIds = catalogue.map((c) => c.id);
const categoryById = Object.fromEntries(catalogue.map((c) => [c.id, c]));

module.exports = { catalogue, categoryIds, categoryById };
