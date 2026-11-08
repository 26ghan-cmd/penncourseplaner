// Requirement definitions. Sources: catalog.upenn.edu (2026-27 catalog), college.upenn.edu.
// Rule shapes:
//   {ids:[...]}                  explicit course ids (e.g. "ECON-0100")
//   {attr:[...]}                 Penn course attribute codes
//   {dept:[...], min, max}       department prefix + course-number range
//   {notDept:[...]}              any course outside these departments
//   {any:true}                   any course
//   {or:[rule, rule]}            union
// A requirement needs `count` courses, or `cu` course units when unit:'cu'.
// `pool`: a course can fill at most one requirement per pool inside a program.

const WH_DEPTS = ["ACCT","BEPP","FNCE","HCMG","LGST","MGMT","MKTG","OIDD","REAL","STAT","WH"];

const SCHOOLS = {
  COL: {
    name: "College of Arts & Sciences", short: "College", degree: "BA",
    totalCU: 32, totalNote: "32–36 c.u. depending on major (the planner uses your major's number when known).",
    applies: "Classes of 2027–2030. The Class of 2031+ follows the new College curriculum (Foundations + Distribution), which this planner doesn't map yet.",
    source: "https://www.college.upenn.edu/gen-ed",
    groups: [
      { name: "Foundational Approaches", reqs: [
        { id:"wr", name:"Writing Seminar", count:1, pool:"found", rule:{or:[{attr:["AUWR"]},{dept:["WRIT"],min:20,max:999}]}, note:"Critical Writing Seminar, letter grade." },
        { id:"fl", name:"Foreign Language", count:1, pool:"found", rule:{attr:["AULL"]}, note:"Completed through the 4th semester of one language (or placement/AP). Mark the final-semester course." },
        { id:"qda", name:"Quantitative Data Analysis", count:1, pool:"found", rule:{attr:["AUQD"]} },
        { id:"fra", name:"Formal Reasoning & Analysis", count:1, pool:"found", rule:{attr:["AUFR"]} },
        { id:"cca", name:"Cross-Cultural Analysis", count:1, pool:"found", rule:{attr:["AUCC"]} },
        { id:"cdus", name:"Cultural Diversity in the U.S.", count:1, pool:"found", rule:{attr:["AUCD"]} },
      ]},
      { name: "Sectors of Knowledge", reqs: [
        { id:"s1", name:"I · Society", count:1, pool:"sector", rule:{attr:["AUSO"]} },
        { id:"s2", name:"II · History & Tradition", count:1, pool:"sector", rule:{attr:["AUHT"]} },
        { id:"s3", name:"III · Arts & Letters", count:1, pool:"sector", rule:{attr:["AUAL"]} },
        { id:"s4", name:"IV · Humanities & Social Science", count:1, pool:"sector", rule:{attr:["AUHS"]} },
        { id:"s5", name:"V · Living World", count:1, pool:"sector", rule:{attr:["AULW"]} },
        { id:"s6", name:"VI · Physical World", count:1, pool:"sector", rule:{attr:["AUPW"]} },
        { id:"s7", name:"VII · Natural Science Across Disciplines", count:1, pool:"sector", rule:{attr:["AUNM"]} },
      ]},
    ],
    notes: [
      "16 c.u. must be Arts & Sciences courses outside your primary major.",
      "AP credit can only satisfy the Foreign Language requirement, not other General Education requirements.",
    ],
  },
  WH: {
    name: "The Wharton School", short: "Wharton", degree: "BS in Economics",
    totalCU: 37, source: "https://catalog.upenn.edu/undergraduate/wharton/curriculum/",
    applies: "Single-degree Wharton students (2026-27 catalog).",
    groups: [
      { name: "First-Year Foundations", reqs: [
        { id:"econ", name:"Economics: BEPP 1000 (or ECON 0100 + 0200)", count:1, pool:"core", rule:{ids:["BEPP-1000","ECON-0100","ECON-0200"]} },
        { id:"math", name:"Calculus: MATH 1400 or 1070", count:1, pool:"core", rule:{ids:["MATH-1400","MATH-1070"]} },
        { id:"wr", name:"Critical Writing Seminar", count:1, pool:"core", rule:{dept:["WRIT"],min:20,max:999} },
      ]},
      { name: "Leadership Journey", reqs: [
        { id:"wh1010", name:"WH 1010 Business and You", unit:"cu", cu:0.5, pool:"core", rule:{ids:["WH-1010"]} },
        { id:"wh2010", name:"WH 2010/2011 Business Communication", unit:"cu", cu:0.5, pool:"core", rule:{ids:["WH-2010","WH-2011"]} },
        { id:"mgmt3010", name:"MGMT 3010 Teamwork & Interpersonal Influence", unit:"cu", cu:0.5, pool:"core", rule:{ids:["MGMT-3010"]} },
        { id:"cap", name:"Senior Capstone (WUCP)", unit:"cu", cu:0.5, pool:"core", rule:{attr:["WUCP"]} },
      ]},
      { name: "Business Fundamentals", reqs: [
        { id:"acct1", name:"ACCT 1010 Accounting & Financial Reporting", count:1, pool:"core", rule:{ids:["ACCT-1010"]} },
        { id:"acct2", name:"ACCT 1020 Strategic Cost Analysis", count:1, pool:"core", rule:{ids:["ACCT-1020"]} },
        { id:"bepp", name:"BEPP 2500 Managerial Economics", count:1, pool:"core", rule:{ids:["BEPP-2500","BEPP-2508"]} },
        { id:"fnce1", name:"FNCE 1000 Corporate Finance", count:1, pool:"core", rule:{ids:["FNCE-1000","FNCE-1008"]} },
        { id:"fnce2", name:"FNCE 1010 Monetary Econ & the Global Economy", count:1, pool:"core", rule:{ids:["FNCE-1010","FNCE-1018"]} },
        { id:"lgst", name:"LGST 1000 or 1010", count:1, pool:"core", rule:{ids:["LGST-1000","LGST-1008","LGST-1010","LGST-1018"]} },
        { id:"mgmt", name:"MGMT 1010 Introduction to Management", count:1, pool:"core", rule:{ids:["MGMT-1010"]} },
        { id:"mktg", name:"MKTG 1010 Introduction to Marketing", count:1, pool:"core", rule:{ids:["MKTG-1010","MKTG-1018"]} },
        { id:"oidd", name:"OIDD 1010 Operations, Information & Decisions", count:1, pool:"core", rule:{ids:["OIDD-1010"]} },
        { id:"stat1", name:"STAT 1010 (or STAT 4300 / ESE 3010)", count:1, pool:"core", rule:{ids:["STAT-1010","STAT-1018","STAT-4300","ESE-3010"]} },
        { id:"stat2", name:"STAT 1020 (or STAT 4310 / ESE 4020)", count:1, pool:"core", rule:{ids:["STAT-1020","STAT-1028","STAT-4310","ESE-4020"]} },
      ]},
      { name: "Flex Fundamentals", reqs: [
        { id:"wuge", name:"Global Economy, Business & Society (WUGE)", count:1, pool:"core", rule:{attr:["WUGE"]} },
        { id:"wuti", name:"Technology, Innovation & Analytics (WUTI)", count:1, pool:"core", rule:{attr:["WUTI"]} },
      ]},
      { name: "Liberal Arts & Sciences", reqs: [
        { id:"lang", name:"Foreign Language (2 beginner semesters)", count:2, pool:"lang", rule:{attr:["AULG","AULL"]}, note:"Penn language courses may double-count as Humanities or Flexible Gen Ed." },
        { id:"wuhm", name:"Humanities (WUHM)", count:1, pool:"las", rule:{attr:["WUHM"]} },
        { id:"wunm", name:"Natural Science, Math & Engineering (WUNM)", count:1, pool:"las", rule:{attr:["WUNM"]} },
        { id:"wuss", name:"Social Science (WUSS)", count:1, pool:"las", rule:{attr:["WUSS"]} },
        { id:"flex", name:"Flexible Gen Ed (outside Wharton)", count:3, pool:"las", rule:{notDept:WH_DEPTS} },
        { id:"ccp", name:"Cross-Cultural Perspectives (WUCN/WUCU)", count:3, pool:"ccp", rule:{attr:["WUCN","WUCU"]}, note:"At most one may be U.S.-focused (WUCU). Two may double-count with LAS." },
      ]},
      { name: "Breadth & Electives", reqs: [
        { id:"breadth", name:"Business Breadth (upper-level, 3 Wharton depts)", count:3, pool:"core", rule:{dept:WH_DEPTS.filter(d=>d!=="WH"),min:2000,max:3999}, note:"Must come from three different Wharton departments outside your concentration." },
        { id:"unres", name:"Unrestricted Electives", count:5, pool:"core", rule:{any:true} },
      ]},
    ],
    notes: ["Students pursuing a second concentration may apply 3 concentration c.u. to Unrestricted Electives."],
  },
  SEAS: {
    name: "Penn Engineering (SEAS)", short: "Engineering", degree: "BSE / BAS",
    totalCU: 37, source: "https://ugrad.seas.upenn.edu/student-handbook/",
    applies: "Engineering requirements are defined by each major. Pick a major to see full tracking.",
    groups: [
      { name: "School-wide", reqs: [
        { id:"wr", name:"Writing Seminar (WRIT)", count:1, pool:"core", rule:{dept:["WRIT"],min:20,max:999} },
      ]},
    ],
    notes: ["Some courses (e.g. STAT below 4300, MATH 1300/1700, PHYS below 0140) don't count toward an Engineering degree."],
  },
  NUR: {
    name: "School of Nursing", short: "Nursing", degree: "BSN",
    totalCU: 36, source: "https://catalog.upenn.edu/undergraduate/programs/nursing-bsn/",
    applies: "Students entering Fall 2026 and later (2026-27 catalog).",
    groups: [
      { name: "Non-Nursing Requirements", reqs: [
        { id:"wr", name:"Writing Requirement (AUWR / WRIT)", count:1, pool:"core", rule:{or:[{attr:["AUWR"]},{dept:["WRIT"],min:0,max:991}]} },
        { id:"lang", name:"Language Requirement", count:1, pool:"core", rule:{attr:["AULG","AULL"]}, note:"Or a free elective if level II proficiency is met." },
      ]},
      { name: "Nursing Core (selected)", reqs: [
        { id:"n61", name:"NURS 0061 Biologically-Based Chemistry", unit:"cu", cu:0.5, pool:"core", rule:{ids:["NURS-0061"]} },
        { id:"n65", name:"NURS 0065 Fundamentals of Nutrition", count:1, pool:"core", rule:{ids:["NURS-0065"]} },
        { id:"n68", name:"NURS 0068 Integrated Cell Biology & Microbiology", count:1, pool:"core", rule:{ids:["NURS-0068"]} },
        { id:"n1650", name:"NURS 1650 Integrated Pathophysiology, Pharmacology & Therapeutics", unit:"cu", cu:2, pool:"core", rule:{ids:["NURS-1650"]} },
        { id:"n2150", name:"NURS 2150 Nursing of Women and Infants", unit:"cu", cu:1.5, pool:"core", rule:{ids:["NURS-2150"]} },
        { id:"n3820", name:"NURS 3820 Public Health Nursing Care in Communities", unit:"cu", cu:1.5, pool:"core", rule:{ids:["NURS-3820"]} },
        { id:"n3900", name:"NURS 3900 Leadership in the Complex Healthcare System", unit:"cu", cu:3, pool:"core", rule:{ids:["NURS-3900"]} },
        { id:"n3890", name:"NURS 3890 Research/Inquiry-Based Service Residency", unit:"cu", cu:0.5, pool:"core", rule:{ids:["NURS-3890"]} },
      ]},
    ],
    notes: ["Nursing sector requirements are listed in the BSN Handbook and aren't mapped here yet.", "This is a partial list of the Nursing core; see the catalog for the full sequence."],
  },
};

// Detailed majors. Others in the list show total c.u. and a catalog link.
const DETAILED = {
  "Economics, BA": {
    school:"COL", totalCU:32, source:"https://catalog.upenn.edu/undergraduate/programs/economics-ba/",
    groups:[
      { name:"Introductory", reqs:[
        { id:"e1", name:"ECON 0100 Intro Micro", count:1, rule:{ids:["ECON-0100"]} },
        { id:"e2", name:"ECON 0200 Intro Macro", count:1, rule:{ids:["ECON-0200"]} },
      ]},
      { name:"Intermediate & Methods", reqs:[
        { id:"e3", name:"ECON 2100 Intermediate Micro", count:1, rule:{ids:["ECON-2100"]} },
        { id:"e4", name:"ECON 2200 Intermediate Macro", count:1, rule:{ids:["ECON-2200"]} },
        { id:"e5", name:"ECON 2300 Statistics for Economists", count:1, rule:{ids:["ECON-2300"]} },
        { id:"e6", name:"ECON 2310 Econometric Methods & Models", count:1, rule:{ids:["ECON-2310"]} },
      ]},
      { name:"Electives", reqs:[
        { id:"e7", name:"ECON 4000-level electives", count:4, rule:{dept:["ECON"],min:4000,max:4999} },
      ]},
      { name:"Mathematics", reqs:[
        { id:"m1", name:"MATH 1400 or 1070", count:1, rule:{ids:["MATH-1400","MATH-1070"]} },
        { id:"m2", name:"MATH 1410, 1510 or 1080", count:1, rule:{ids:["MATH-1410","MATH-1510","MATH-1080","MATH-1610"]} },
      ]},
    ],
    notes:["Wharton students taking BEPP 1000 instead of ECON 0100/0200 need an additional 4000-level ECON course."],
  },
  "Computer Science, BA": {
    school:"COL", totalCU:null, second:true, source:"https://catalog.upenn.edu/undergraduate/programs/computer-science-ba/",
    groups:[
      { name:"Core", reqs:[
        { id:"c1", name:"CIS 1100 (or a CIS elective)", count:1, rule:{ids:["CIS-1100"]} },
        { id:"c2", name:"CIS 1200 Programming Languages & Techniques I", count:1, rule:{ids:["CIS-1200"]} },
        { id:"c3", name:"CIS 1600 Mathematical Foundations of CS", count:1, rule:{ids:["CIS-1600"]} },
        { id:"c4", name:"CIS 1210 Programming Languages & Techniques II", count:1, rule:{ids:["CIS-1210"]} },
        { id:"c5", name:"CIS 2400 Introduction to Computer Systems", count:1, rule:{ids:["CIS-2400"]} },
        { id:"c6", name:"CIS 2620 Automata, Computability & Complexity", count:1, rule:{ids:["CIS-2620"]} },
        { id:"c7", name:"CIS 3200 Introduction to Algorithms", count:1, rule:{ids:["CIS-3200"]} },
      ]},
      { name:"Electives", reqs:[
        { id:"c8", name:"Project electives", count:2, rule:{ids:["CIS-3500","CIS-4120","CIS-5120","CIS-4410","CIS-5410","CIS-4480","CIS-5480","CIS-4500","CIS-5500","CIS-4521","CIS-5521","CIS-4550","CIS-5550","CIS-4600","CIS-5600","CIS-4710","CIS-5710","CIS-5050","CIS-5530","NETS-2120"]} },
        { id:"c9", name:"CIS elective (CIS/NETS engineering course)", count:1, rule:{dept:["CIS","NETS"],min:1000,max:5999} },
        { id:"c10", name:"Advanced CIS electives (2000+)", count:2, rule:{dept:["CIS","NETS"],min:2000,max:5999} },
      ]},
    ],
    notes:["Second major only. Apply with a 3.0+ GPA and a B or better in CIS 1200, before fall of junior year."],
  },
  "Computer Science, BSE": {
    school:"SEAS", totalCU:37, source:"https://catalog.upenn.edu/undergraduate/programs/computer-science-bse/",
    groups:[
      { name:"Engineering", reqs:[
        { id:"c1", name:"CIS 1100 (or a CIS elective)", count:1, rule:{ids:["CIS-1100"]} },
        { id:"c2", name:"CIS 1200", count:1, rule:{ids:["CIS-1200"]} },
        { id:"c3", name:"CIS 1210", count:1, rule:{ids:["CIS-1210"]} },
        { id:"c4", name:"CIS 2400 Intro to Computer Systems", count:1, rule:{ids:["CIS-2400"]} },
        { id:"c5", name:"CIS 2620 Automata, Computability & Complexity", count:1, rule:{ids:["CIS-2620"]} },
        { id:"c6", name:"CIS 3200 Intro to Algorithms", count:1, rule:{ids:["CIS-3200"]} },
        { id:"c7", name:"CIS 4480/5480 Operating Systems", count:1, rule:{ids:["CIS-4480","CIS-5480"]} },
        { id:"c8", name:"CIS 4710/5710 Computer Organization & Design", count:1, rule:{ids:["CIS-4710","CIS-5710"]} },
        { id:"c9", name:"CIS electives", count:4, rule:{dept:["CIS","NETS"],min:1000,max:5999}, note:"At most 1 c.u. of 1000-level. CIS + technical electives must cover the Networking, Databases, Distributed Systems, ML/AI and Project lists." },
        { id:"c10", name:"Senior Project I: CIS 4000 or 4100", count:1, rule:{ids:["CIS-4000","CIS-4100"]} },
        { id:"c11", name:"Senior Project II: CIS 4010 or 4110", count:1, rule:{ids:["CIS-4010","CIS-4110"]} },
      ]},
      { name:"Math & Natural Science", reqs:[
        { id:"m1", name:"MATH 1400 Calculus I", count:1, rule:{ids:["MATH-1400"]} },
        { id:"m2", name:"MATH 1410 or 1610", count:1, rule:{ids:["MATH-1410","MATH-1610"]} },
        { id:"m3", name:"CIS 1600 Math Foundations of CS", count:1, rule:{ids:["CIS-1600"]} },
        { id:"m4", name:"Probability: CIS 2610, ESE 3010 or STAT 4300", count:1, rule:{ids:["CIS-2610","ESE-3010","STAT-4300"]} },
        { id:"m5", name:"Linear algebra: ESE/ENM 2030 or ENM 2400", count:1, rule:{ids:["ESE-2030","ENM-2030","ENM-2400"]} },
        { id:"m6", name:"Mechanics: PHYS 0150/0170 or MEAM 1100+1470", count:1, rule:{ids:["PHYS-0150","PHYS-0170","MEAM-1100"]} },
        { id:"m7", name:"E&M: PHYS 0151/0171 or ESE 1120", count:1, rule:{ids:["PHYS-0151","PHYS-0171","ESE-1120"]} },
        { id:"m8", name:"SEAS Math or Natural Science (EUMA/EUNS)", count:1, rule:{attr:["EUMA","EUNS"]} },
      ]},
      { name:"Technical Electives", reqs:[
        { id:"t1", name:"Technical electives (dept. approved list)", count:6, rule:{or:[{attr:["EUNG","EUMA","EUNS"]},{dept:["CIS","NETS","ESE","MATH","STAT"],min:2000,max:5999}]}, note:"Must come from the CIS department's approved technical-elective list." },
      ]},
      { name:"General Electives", reqs:[
        { id:"g1", name:"Ethics: EAS 2030, CIS 4230/5230 or LAWM 5060", count:1, rule:{ids:["EAS-2030","CIS-4230","CIS-5230","LAWM-5060"]} },
        { id:"g2", name:"Social Science or Humanities (EUSS/EUHS)", count:4, rule:{attr:["EUSS","EUHS"]}, note:"Must include one Writing Seminar." },
        { id:"g3", name:"SS, Humanities or Tech in Business & Society", count:2, rule:{attr:["EUSS","EUHS","EUTB"]} },
        { id:"g4", name:"Free elective", count:1, rule:{any:true} },
      ]},
    ],
    notes:["Optional concentrations: AI, Cognitive Science, Computational Biology, Computer Vision, Data Science, Software Foundations, Systems."],
  },
  "Finance, BS": {
    school:"WH", totalCU:37, source:"https://catalog.upenn.edu/undergraduate/programs/finance-bs/",
    groups:[{ name:"Finance Concentration", reqs:[
      { id:"f1", name:"Four FNCE electives from the approved list", count:4, rule:{ids:["FNCE-2020","FNCE-2030","FNCE-2050","FNCE-2070","FNCE-2090","FNCE-2170","FNCE-2190","FNCE-2250","FNCE-2300","FNCE-2310","FNCE-2320","FNCE-2370","FNCE-2380","FNCE-2390","FNCE-2400","FNCE-2450","FNCE-2500","FNCE-2510","FNCE-2530","FNCE-2540","FNCE-2560","FNCE-2570","FNCE-2610","FNCE-2680","FNCE-2800","FNCE-2830","FNCE-2910","FNCE-2970","FNCE-3900","FNCE-3990","FNCE-4010","FNCE-4020"]} },
    ]}],
  },
  "Management, BS: General Track": {
    school:"WH", totalCU:37, source:"https://catalog.upenn.edu/undergraduate/programs/management-general-track-bs/",
    groups:[{ name:"Management Concentration", reqs:[
      { id:"g1", name:"Four MGMT courses", count:4, rule:{dept:["MGMT"],min:2000,max:4999} },
    ]}],
  },
};

// Generic Wharton concentrations: 4 c.u. in the department (approximate).
const WH_CONC_DEPT = {
  "Accounting, BS":["ACCT"], "Business Economics and Public Policy, BS":["BEPP"], "Health Care Management and Policy, BS":["HCMG"],
  "Legal Studies & Business Ethics, BS":["LGST"], "Marketing, BS":["MKTG"], "Real Estate, BS":["REAL"], "Statistics and Data Science, BS":["STAT"],
  "Operations, Information & Decisions, BS: General Track":["OIDD"], "Management, BS: Multinational Management Track":["MGMT"],
  "Management, BS: Organizational Effectiveness Track":["MGMT"], "Management, BS: Strategic Management Track":["MGMT"],
};

// Undergraduate programs from catalog.upenn.edu/undergraduate/programs (2026-27), excluding LPS (BAAS), certificates and post-bacc.
const PROGRAM_NAMES = ["Accounting, BS", "Africana Studies, BA: African American Studies", "Africana Studies, BA: African Diaspora Studies", "Africana Studies, BA: African Studies", "Africana Studies, Minor", "American Public Policy, Minor", "American Sign Language and Deaf Studies, Minor", "Ancient History, BA", "Ancient History, Minor", "Anthropology, BA: Archaeology", "Anthropology, BA: Biological Anthropology", "Anthropology, BA: Cultural and Linguistic Anthropology", "Anthropology, BA: Environmental Anthropology", "Anthropology, BA: General Anthropology", "Anthropology, BA: Medical Anthropology & Global Health", "Anthropology, Minor", "Archaeological Science, Minor", "Architectural History, Minor", "Architecture, BA: Design", "Architecture, BA: Intensive Design", "Architecture, Minor", "Artificial Intelligence for Business, BS", "Artificial Intelligence, BSE", "Asian American Studies, Minor", "Behavioral Economics, BS", "Biochemistry, BA", "Bioengineering, BSE", "Bioethics, Minor", "Biology, BA", "Biology, Minor", "Biomedical Science, BAS", "Biophysics, BA", "Biophysics, Minor", "Business Analytics, BS", "Business Economics and Public Policy, BS", "Chemical & Biomolecular Engineering, Minor", "Chemical and Biomolecular Engineering, BSE", "Chemistry, BA", "Chemistry, Minor", "Cinema and Media Studies, BA", "Cinema and Media Studies, Minor", "Classical Studies, BA: Classical Civilizations", "Classical Studies, BA: Classical Languages and Literature", "Classical Studies, BA: Mediterranean Archaeology", "Classical Studies, Minor", "Cognitive Science, BA: Cognitive Neuroscience", "Cognitive Science, BA: Computation and Cognition", "Cognitive Science, BA: Individualized", "Cognitive Science, BA: Language & Mind", "Cognitive Science, Minor", "Communication, BA: Communication & Public Service", "Communication, BA: Communication, Culture & Journalism Studies", "Communication, BA: Data & Network Science for Communication", "Communication, BA: General Communication", "Communication, BA: Media, Audiences & Persuasion", "Communication, BA: Politics, Policy & Advocacy", "Comparative Literature, BA: (Trans)national Literatures", "Comparative Literature, BA: Globalization", "Comparative Literature, BA: Theory", "Comparative Literature, Minor", "Computational Neuroscience, Minor", "Computer Engineering, BSE", "Computer Science, BA", "Computer Science, BAS", "Computer Science, BSE", "Computer Science, Minor", "Consumer Psychology, Minor", "Creative Writing, Minor", "Criminology, BA", "Data Science and Analytics, Minor", "Data Science, Minor", "Design, BA", "Design, Minor", "Digital Humanities, Minor", "Digital Media Design, BSE", "Digital Media Design, Minor", "Earth and Environmental Science, BA", "East Asian Area Studies, Minor", "East Asian Languages and Civilizations, BA: Dual Language", "East Asian Languages and Civilizations, BA: East Asian Area Studies", "East Asian Languages and Civilizations, BA: General East Asian Languages and Civilizations", "East Asian Languages and Civilizations: Chinese, Minor", "East Asian Languages and Civilizations: Japanese, Minor", "East Asian Languages and Civilizations: Korean, Minor", "Economic Policy, Minor", "Economics, BA", "Economics, Minor", "Electrical Engineering, BSE", "Electrical Engineering, Minor", "Energy & Sustainability, Minor", "Engineering Entrepreneurship, Minor", "English, BA: 18th/19th Centuries", "English, BA: 20th/21st Centuries", "English, BA: Africana Literatures & Culture", "English, BA: Cinema & Media Studies", "English, BA: Creative Writing", "English, BA: Drama", "English, BA: Gender/Sexuality", "English, BA: General English", "English, BA: Literary Theory & Cultural Studies", "English, BA: Literature, Journalism and Print Culture", "English, BA: Medieval/Renaissance", "English, BA: Poetry and Poetics", "English, BA: The Novel", "English, Minor", "Entrepreneurship and Innovation, BS", "Environmental Science, Minor", "Environmental Studies, BA: Environmental History and Regional Studies", "Environmental Studies, BA: Environmental Policy and Application", "Environmental Studies, BA: General Environmental Studies", "Environmental Studies, BA: Global Environmental Systems", "Environmental Studies, BA: Sustainability and Environmental Management", "Environmental Studies, Minor", "European Studies, Minor", "Finance, BS", "Fine Arts, BA", "Fine Arts, BFA", "Fine Arts, Minor", "Francophone, Italian and Germanic Studies, BA: Dual Language", "Francophone, Italian and Germanic Studies, BA: French and Francophone Studies", "Francophone, Italian and Germanic Studies, BA: Germanic Studies", "Francophone, Italian and Germanic Studies, BA: Italian Studies", "French and Francophone Studies, Minor", "Gender, Sexuality, & Women's Studies, BA: Feminist Studies", "Gender, Sexuality, & Women's Studies, BA: General", "Gender, Sexuality, & Women's Studies, BA: Global Gender and Sexuality Studies", "Gender, Sexuality, & Women's Studies, BA: Health and Disability Studies", "Gender, Sexuality, & Women's Studies, BA: LGBTQ Studies", "Gender, Sexuality, & Women's Studies, BA: Self Designed", "Gender, Sexuality, and Women's Studies, Minor", "Geology, Minor", "German, Minor", "Global Health, Minor", "Global Medieval Studies, Minor", "Health and Societies, BA: Bioethics and Society", "Health and Societies, BA: Disease and Culture", "Health and Societies, BA: Global Health", "Health and Societies, BA: Health Care Markets & Finance", "Health and Societies, BA: Health Policy & Law", "Health and Societies, BA: Public Health", "Health and Societies, BA: Race, Gender and Health", "Health Care Management and Policy, BS", "Health Communications, Minor", "Hispanic Studies, BA", "Hispanic Studies, Minor", "History of Art, BA", "History of Art, Minor", "History, BA: American History", "History, BA: Diplomatic History", "History, BA: Economic History", "History, BA: European History", "History, BA: Gender History", "History, BA: General History", "History, BA: Intellectual History", "History, BA: Jewish History", "History, BA: Political History", "History, BA: World History", "History, Health and the Humanities, Minor", "History, Minor", "Impact, Value and Sustainable Business, BS", "Individualized Major, BA", "Individualized, BS", "International Development, Minor", "International Relations, BA", "International Relations, Minor", "International Studies, BA", "Italian Studies, Minor", "Jewish Studies, BA", "Jewish Studies, Minor", "Journalistic Writing, Minor", "Landscape Studies, Minor", "Latin American & Latinx Studies, BA", "Latin American and Latinx Studies, Minor", "Law and Society, BA", "Law and Society, Minor", "Leading Across Differences, BS", "Legal Studies & Business Ethics, BS", "Legal Studies & History, Minor", "Linguistics, BA", "Linguistics, Minor", "Logic, Information, & Computation, BA", "Logic, Information, & Computation, Minor", "Management, BS: General Track", "Management, BS: Multinational Management Track", "Management, BS: Organizational Effectiveness Track", "Management, BS: Strategic Management Track", "Marketing & Communication, BS", "Marketing & Operations Management, BS", "Marketing, BS", "Materials Science and Engineering, BSE", "Materials Science and Engineering, Minor", "Mathematical Economics, BA", "Mathematics, BA: Biological Mathematics", "Mathematics, BA: General Mathematics", "Mathematics, Minor", "Mechanical Engineering and Applied Mechanics, BSE", "Mechanical Engineering and Applied Mechanics, Minor", "Medical Sociology, Minor", "Middle Eastern Languages & Cultures, BA: Ancient Middle East", "Middle Eastern Languages & Cultures, BA: Arabic & Hebrew Studies", "Middle Eastern Languages & Cultures, BA: Arabic Language and Literature", "Middle Eastern Languages & Cultures, BA: Cultures and Societies of the Middle East and North Africa", "Middle Eastern Languages & Cultures, BA: Hebrew and Judaic Studies", "Middle Eastern Languages & Cultures, BA: Persian Languages & Literature", "Modern Middle Eastern Studies, BA", "Modern Middle Eastern Studies, Minor", "Music, BA", "Music, Minor", "Native American and Indigenous Studies, Minor", "Neuroscience and Health Care Management, Minor", "Neuroscience, BA", "Neuroscience, Minor", "Nursing and Health Services Management, Minor", "Nursing, BSN", "Nutrition Science, BA", "Nutrition Science, BSN", "Nutrition, Minor", "Operations, Information & Decisions, BS: Decision Processes Track", "Operations, Information & Decisions, BS: General Track", "Operations, Information & Decisions, BS: Information Systems Track", "Operations, Information & Decisions, BS: Operations Management/Management Science Track", "Philosophy, BA: General Philosophy", "Philosophy, BA: Humanistic Philosophy", "Philosophy, BA: Moral and Political Philosophy", "Philosophy, BA: Philosophy of Science", "Philosophy, Minor", "Philosophy, Politics and Economics, BA: Choice & Behavior", "Philosophy, Politics and Economics, BA: Distributive Justice", "Philosophy, Politics and Economics, BA: Globalization", "Philosophy, Politics and Economics, BA: Public Policy & Governance", "Physics, BA: Astrophysics", "Physics, BA: Biological Science", "Physics, BA: Business & Technology", "Physics, BA: Chemical Principles", "Physics, BA: Computer Techniques", "Physics, BA: Physical Theory and Experimental Technique", "Physics, Minor", "Political Science, BA: American Politics", "Political Science, BA: Comparative Politics", "Political Science, BA: General Political Science", "Political Science, BA: Individualized", "Political Science, BA: International Relations", "Political Science, BA: Political Economy", "Political Science, BA: Political Theory", "Political Science, Minor", "Psychoanalytic Studies, Minor", "Psychology, BA", "Psychology, Minor", "Real Estate, BS", "Religious Studies, BA", "Religious Studies, Minor", "Retailing, BS", "Russian and East European Studies, BA", "Russian and East European Studies, Minor", "Russian Language, Literature and Culture, Minor", "Science, Technology and Society, BA: Biotechnology & Biomedicine", "Science, Technology and Society, BA: Energy and Environment", "Science, Technology and Society, BA: Global Science and Technology", "Science, Technology and Society, BA: Information and Organizations", "Science, Technology and Society, BA: Science/Nature/Culture", "Science, Technology and Society, Minor", "Secondary Education, Minor", "Sociology, BA: Applied Research and Data Analysis", "Sociology, BA: Cities, Markets, and the Global Economy", "Sociology, BA: Culture and Diversity", "Sociology, BA: Education and Society", "Sociology, BA: Family, Gender and Society", "Sociology, BA: Medical Sociology", "Sociology, BA: Structures of Opportunity and Inequality", "Sociology, Minor", "South Asia Studies, BA", "South Asia Studies, Minor", "Statistics and Data Science, BS", "Statistics and Data Science, Minor", "Survey Research and Data Analytics, Minor", "Sustainability and Environmental Management, Minor", "Theatre Arts, BA", "Theatre Arts, Minor", "Urban Education, Minor", "Urban Real Estate and Development, Minor", "Urban Studies, BA", "Urban Studies, Minor", "Visual and Interactive Computing, BSE", "Visual Studies, BA: Architecture Practice and Technology", "Visual Studies, BA: Art and Culture of Seeing", "Visual Studies, BA: Art, Practice and Technology", "Visual Studies, BA: Philosophy and Science of Seeing", "Yiddish, Minor"];
