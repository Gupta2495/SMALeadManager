// Mock data for the lead tracker prototype
// Dates are relative to "today" = 18 Apr 2026 (per system date)

const TODAY = new Date('2026-04-18T09:30:00+05:30');

const daysAgo = (d) => {
  const x = new Date(TODAY);
  x.setDate(x.getDate() - d);
  return x.toISOString();
};
const daysFromNow = (d, hour = 10) => {
  const x = new Date(TODAY);
  x.setDate(x.getDate() + d);
  x.setHours(hour, 0, 0, 0);
  return x.toISOString();
};

const CLASSES = ['Nursery', 'LKG', 'UKG', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
const INTERESTS = ['Admission', 'Fee structure', 'Transport', 'Hostel', 'Scholarship', 'Curriculum', 'Visit'];
const LOCATIONS = ['Mandsaur', 'Neemuch', 'Ratlam', 'Pratapgarh', 'Nimbahera', 'Jawad', 'Garoth', 'Malhargarh'];

const STATUS_META = {
  new:            { label: 'New',            bg: '#DBEAFE', fg: '#1E40AF', filled: false },
  contacted:      { label: 'Contacted',      bg: '#EDE9FE', fg: '#6D28D9', filled: false },
  interested:     { label: 'Interested',     bg: '#D1FAE5', fg: '#047857', filled: false },
  visited:        { label: 'Visited',        bg: '#CCFBF1', fg: '#0F766E', filled: false },
  on_hold:        { label: 'On hold',        bg: '#E5E7EB', fg: '#4B5563', filled: false },
  admitted:       { label: 'Admitted',       bg: '#065F46', fg: '#FFFFFF', filled: true  },
  rejected:       { label: 'Rejected',       bg: '#991B1B', fg: '#FFFFFF', filled: true  },
  lost:           { label: 'Lost',           bg: '#374151', fg: '#FFFFFF', filled: true  },
};

const OUTCOMES = [
  { id: 'no_answer',          label: 'No answer' },
  { id: 'busy',               label: 'Busy' },
  { id: 'interested',         label: 'Interested' },
  { id: 'not_interested',     label: 'Not interested' },
  { id: 'callback_requested', label: 'Callback requested' },
  { id: 'visit_scheduled',    label: 'Visit scheduled' },
  { id: 'admitted',           label: 'Admitted' },
  { id: 'lost',               label: 'Lost' },
];

// Hand-crafted lead set — realistic Indian names, varied states
const LEADS = [
  {
    id: 'LD-2041', student: 'Aarav Sharma', parent: 'Rakesh Sharma', phone: '+91 98765 43210',
    class: '3', interest: 'Admission', location: 'Mandsaur',
    capturedAt: daysAgo(4), status: 'contacted', assignee: 'Priya',
    confidence: 0.94, nextFollowUp: daysFromNow(-1, 10), // OVERDUE
    source: 'Namaste, mera beta class 3 me admission lena chahta hai. Fee structure bhejiye. — Rakesh',
    sourceFrom: '+91 98765 43210', sourceAt: daysAgo(4),
    history: [
      { id: 'h1', at: daysAgo(1), outcome: 'no_answer',  by: 'Priya', notes: 'Rang 3 times, no answer. Will try evening.' },
      { id: 'h2', at: daysAgo(3), outcome: 'interested', by: 'Priya', notes: 'Shared fee PDF on WhatsApp. Father asked about transport from Garoth route.' },
    ],
  },
  {
    id: 'LD-2038', student: 'Ishita Verma', parent: 'Sunita Verma', phone: '+91 90123 45678',
    class: 'LKG', interest: 'Fee structure', location: 'Neemuch',
    capturedAt: daysAgo(6), status: 'interested', assignee: 'Priya',
    confidence: 0.91, nextFollowUp: daysFromNow(-2, 11), // OVERDUE
    source: 'LKG fees kitni hai? Aur transport Neemuch tak aata hai kya?',
    sourceFrom: '+91 90123 45678', sourceAt: daysAgo(6),
    history: [
      { id: 'h1', at: daysAgo(2), outcome: 'interested',         by: 'Priya', notes: 'Mother very keen. Will bring father on Saturday for visit.' },
      { id: 'h2', at: daysAgo(5), outcome: 'callback_requested', by: 'Priya', notes: 'Busy with work, asked to call after 6pm.' },
    ],
  },
  {
    id: 'LD-2045', student: 'Kabir Patel', parent: 'Manish Patel', phone: '+91 99887 66554',
    class: '6', interest: 'Hostel', location: 'Ratlam',
    capturedAt: daysAgo(2), status: 'new', assignee: 'Priya',
    confidence: 0.88, nextFollowUp: daysFromNow(0, 14), // DUE TODAY
    source: 'Hostel facility available hai class 6 ke liye? Ratlam se daily aana mushkil hai.',
    sourceFrom: '+91 99887 66554', sourceAt: daysAgo(2),
    history: [],
  },
  {
    id: 'LD-2046', student: 'Diya Jain', parent: 'Anita Jain', phone: '+91 87654 32109',
    class: '1', interest: 'Admission', location: 'Mandsaur',
    capturedAt: daysAgo(1), status: 'contacted', assignee: 'Priya',
    confidence: 0.96, nextFollowUp: daysFromNow(0, 16), // DUE TODAY
    source: 'Class 1 admission form bhejiye please. Meri beti ke liye.',
    sourceFrom: '+91 87654 32109', sourceAt: daysAgo(1),
    history: [
      { id: 'h1', at: daysAgo(0), outcome: 'interested', by: 'Priya', notes: 'Sent form. Asked to review and callback.' },
    ],
  },
  {
    id: 'LD-2047', student: 'Vihaan Kumar', parent: 'Deepak Kumar', phone: '+91 77665 44332',
    class: '8', interest: 'Curriculum', location: 'Nimbahera',
    capturedAt: daysAgo(0, 8), status: 'new', assignee: 'Priya',
    confidence: 0.82, nextFollowUp: daysFromNow(0, 15), // DUE TODAY
    source: 'Class 8 ke liye curriculum kaisa hai? CBSE hai ya state board?',
    sourceFrom: '+91 77665 44332', sourceAt: daysAgo(0),
    history: [],
  },
  {
    id: 'LD-2048', student: 'Meera Agarwal', parent: 'Pooja Agarwal', phone: '+91 98321 45678',
    class: 'UKG', interest: 'Visit', location: 'Mandsaur',
    capturedAt: daysAgo(0), status: 'new', assignee: 'Priya',
    confidence: 0.97, nextFollowUp: daysFromNow(0, 17),
    source: 'Kal school visit karna chahte hain. UKG ke liye.',
    sourceFrom: '+91 98321 45678', sourceAt: daysAgo(0),
    history: [],
  },
  {
    id: 'LD-2049', student: 'Arjun Singh', parent: 'Vikram Singh', phone: '+91 91234 56789',
    class: '4', interest: 'Scholarship', location: 'Pratapgarh',
    capturedAt: daysAgo(0), status: 'new', assignee: 'Priya',
    confidence: 0.79, nextFollowUp: daysFromNow(1, 10),
    source: 'Scholarship available hai kya merit ke basis pe? Beta 92% laya tha.',
    sourceFrom: '+91 91234 56789', sourceAt: daysAgo(0),
    history: [],
  },
  {
    id: 'LD-2050', student: 'Ananya Choudhary', parent: 'Ritu Choudhary', phone: '+91 96543 21098',
    class: '2', interest: 'Transport', location: 'Jawad',
    capturedAt: daysAgo(0), status: 'new', assignee: 'Priya',
    confidence: 0.93, nextFollowUp: daysFromNow(1, 11),
    source: 'Transport Jawad se milta hai? Beti class 2 me hai.',
    sourceFrom: '+91 96543 21098', sourceAt: daysAgo(0),
    history: [],
  },
  // Closed/pipeline leads (for All + Analytics)
  {
    id: 'LD-2030', student: 'Reyansh Mishra', parent: 'Suresh Mishra', phone: '+91 90909 10101',
    class: '5', interest: 'Admission', location: 'Mandsaur',
    capturedAt: daysAgo(18), status: 'admitted', assignee: 'Priya',
    confidence: 0.95, nextFollowUp: null,
    source: 'Admission confirm karna hai class 5 ke liye.',
    sourceFrom: '+91 90909 10101', sourceAt: daysAgo(18),
    history: [
      { id: 'h1', at: daysAgo(2),  outcome: 'admitted',        by: 'Priya', notes: 'Fees paid. Enrolled.' },
      { id: 'h2', at: daysAgo(7),  outcome: 'visit_scheduled', by: 'Priya', notes: 'Visited campus on Saturday.' },
      { id: 'h3', at: daysAgo(12), outcome: 'interested',      by: 'Priya', notes: 'Positive call. Asked for visit slot.' },
      { id: 'h4', at: daysAgo(16), outcome: 'interested',      by: 'Priya', notes: 'First contact. Interested.' },
    ],
  },
  {
    id: 'LD-2025', student: 'Saisha Malhotra', parent: 'Rohit Malhotra', phone: '+91 99998 88877',
    class: '7', interest: 'Admission', location: 'Ratlam',
    capturedAt: daysAgo(24), status: 'lost', assignee: 'Priya',
    confidence: 0.87, nextFollowUp: null,
    source: 'Class 7 admission chahiye.',
    sourceFrom: '+91 99998 88877', sourceAt: daysAgo(24),
    history: [
      { id: 'h1', at: daysAgo(5), outcome: 'lost', by: 'Priya', notes: 'Chose another school closer to home.' },
    ],
  },
  {
    id: 'LD-2022', student: 'Advik Yadav', parent: 'Neha Yadav', phone: '+91 97777 88888',
    class: '9', interest: 'Admission', location: 'Mandsaur',
    capturedAt: daysAgo(30), status: 'visited', assignee: 'Priya',
    confidence: 0.92, nextFollowUp: daysFromNow(2, 10),
    source: 'Class 9 admission possible hai mid-session me?',
    sourceFrom: '+91 97777 88888', sourceAt: daysAgo(30),
    history: [
      { id: 'h1', at: daysAgo(3), outcome: 'visit_scheduled', by: 'Priya', notes: 'Visited. Parents reviewing.' },
    ],
  },
  {
    id: 'LD-2015', student: 'Myra Gupta', parent: 'Kavita Gupta', phone: '+91 93456 78901',
    class: 'Nursery', interest: 'Fee structure', location: 'Neemuch',
    capturedAt: daysAgo(35), status: 'on_hold', assignee: 'Priya',
    confidence: 0.90, nextFollowUp: null,
    source: 'Nursery fees batayiye.',
    sourceFrom: '+91 93456 78901', sourceAt: daysAgo(35),
    history: [
      { id: 'h1', at: daysAgo(10), outcome: 'callback_requested', by: 'Priya', notes: 'Family relocating, will decide next month.' },
    ],
  },
  {
    id: 'LD-2012', student: 'Aryan Tiwari', parent: 'Ramesh Tiwari', phone: '+91 94567 89012',
    class: '10', interest: 'Admission', location: 'Mandsaur',
    capturedAt: daysAgo(40), status: 'admitted', assignee: 'Priya',
    confidence: 0.94, nextFollowUp: null, history: [],
    source: 'Class 10 admission.', sourceFrom: '+91 94567 89012', sourceAt: daysAgo(40),
  },
  {
    id: 'LD-2008', student: 'Navya Rathore', parent: 'Ajay Rathore', phone: '+91 95678 90123',
    class: '4', interest: 'Admission', location: 'Mandsaur',
    capturedAt: daysAgo(50), status: 'admitted', assignee: 'Priya',
    confidence: 0.91, nextFollowUp: null, history: [],
    source: 'Class 4 admission.', sourceFrom: '+91 95678 90123', sourceAt: daysAgo(50),
  },
  {
    id: 'LD-2005', student: 'Krish Chouhan', parent: 'Mahesh Chouhan', phone: '+91 96789 01234',
    class: '6', interest: 'Hostel', location: 'Pratapgarh',
    capturedAt: daysAgo(60), status: 'lost', assignee: 'Priya',
    confidence: 0.88, nextFollowUp: null, history: [],
    source: 'Hostel kitna hai?', sourceFrom: '+91 96789 01234', sourceAt: daysAgo(60),
  },
  {
    id: 'LD-2003', student: 'Riya Ahuja', parent: 'Seema Ahuja', phone: '+91 97890 12345',
    class: '2', interest: 'Admission', location: 'Nimbahera',
    capturedAt: daysAgo(70), status: 'admitted', assignee: 'Priya',
    confidence: 0.93, nextFollowUp: null, history: [],
    source: 'Class 2 admission.', sourceFrom: '+91 97890 12345', sourceAt: daysAgo(70),
  },
  {
    id: 'LD-2001', student: 'Dhruv Saxena', parent: 'Geeta Saxena', phone: '+91 98901 23456',
    class: '8', interest: 'Scholarship', location: 'Mandsaur',
    capturedAt: daysAgo(80), status: 'rejected', assignee: 'Priya',
    confidence: 0.85, nextFollowUp: null, history: [],
    source: 'Scholarship enquiry.', sourceFrom: '+91 98901 23456', sourceAt: daysAgo(80),
  },
];

// Review queue — low-confidence extractions
const REVIEW = [
  {
    id: 'RV-081', confidence: 0.52,
    rawMessage: 'kal baat ki thi admission ke liye…beta 4th me hai abhi 5th me jaana hai mandsaur se hai hum',
    sourceFrom: '+91 99001 12233', sourceAt: daysAgo(0),
    extracted: { student: '(unknown)', parent: '(unknown)', class: '5', interest: 'Admission', location: 'Mandsaur', phone: '+91 99001 12233' },
  },
  {
    id: 'RV-080', confidence: 0.61,
    rawMessage: 'fees ?',
    sourceFrom: '+91 98100 45566', sourceAt: daysAgo(1),
    extracted: { student: '(unknown)', parent: '(unknown)', class: '(unknown)', interest: 'Fee structure', location: '(unknown)', phone: '+91 98100 45566' },
  },
  {
    id: 'RV-079', confidence: 0.67,
    rawMessage: 'Sharma ji ne aapka number diya tha. Do bacche hai — ek 6th ek 9th. Neemuch se.',
    sourceFrom: '+91 97500 77889', sourceAt: daysAgo(1),
    extracted: { student: '(two children)', parent: 'Sharma ji referred', class: '6, 9', interest: 'Admission', location: 'Neemuch', phone: '+91 97500 77889' },
  },
];

// Analytics — weekly capture vs admitted, last 12 weeks
const WEEKLY = [
  { week: 'W-11', captured: 8,  admitted: 1 },
  { week: 'W-10', captured: 12, admitted: 2 },
  { week: 'W-9',  captured: 9,  admitted: 1 },
  { week: 'W-8',  captured: 14, admitted: 3 },
  { week: 'W-7',  captured: 11, admitted: 2 },
  { week: 'W-6',  captured: 17, admitted: 4 },
  { week: 'W-5',  captured: 15, admitted: 3 },
  { week: 'W-4',  captured: 21, admitted: 5 },
  { week: 'W-3',  captured: 19, admitted: 4 },
  { week: 'W-2',  captured: 24, admitted: 6 },
  { week: 'W-1',  captured: 22, admitted: 5 },
  { week: 'This', captured: 18, admitted: 3 },
];

Object.assign(window, { TODAY, CLASSES, INTERESTS, LOCATIONS, STATUS_META, OUTCOMES, LEADS, REVIEW, WEEKLY, daysAgo, daysFromNow });
