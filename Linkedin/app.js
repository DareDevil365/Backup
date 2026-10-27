const defaultBrief =
  "I am a consultant from a student consultancy club in India. We are looking for startups, businesses, or larger corporations that might need services like market research, competitor analysis, go-to-market strategy, pricing, expansion planning, or student and youth insights.";

const demoLeads = [
  {
    company: "AsterGrid Labs",
    domain: "astergrid.example",
    location: "Bengaluru, India",
    market: "india-startup",
    industry: "B2B SaaS",
    employees: 42,
    funding: "seed",
    signal: "Hiring growth and product marketing roles after seed round",
    linkedinSignal: "Founder and Head of Growth posting weekly",
    poc: {
      name: "Riya Mehta",
      title: "Head of Growth",
      email: "growth@astergrid.example",
      phone: "Provider lookup required",
    },
    contactability: "Public role email and likely LinkedIn reference",
    tags: ["India", "Seed", "Growth hiring", "Founder active"],
    services: ["go-to-market", "competitor research", "pricing"],
  },
  {
    company: "CampusLoop",
    domain: "campusloop.example",
    location: "Delhi NCR, India",
    market: "india-startup",
    industry: "Student commerce",
    employees: 28,
    funding: "bootstrapped",
    signal: "Testing campus partnerships across Delhi, Pune, and Bengaluru",
    linkedinSignal: "CEO comments on college community posts",
    poc: {
      name: "Aarav Sinha",
      title: "Founder and CEO",
      email: "founders@campusloop.example",
      phone: "Provider lookup required",
    },
    contactability: "Founder-owned inbox visible on website",
    tags: ["Youth market", "Bootstrapped", "Campus expansion"],
    services: ["student insights", "market research", "partnership strategy"],
  },
  {
    company: "NammaFleet",
    domain: "nammafleet.example",
    location: "Chennai, India",
    market: "india-startup",
    industry: "Logistics tech",
    employees: 96,
    funding: "series-a",
    signal: "Opening operations in Hyderabad and Ahmedabad",
    linkedinSignal: "Operations lead shares hiring posts",
    poc: {
      name: "Kavya Rao",
      title: "VP Operations",
      email: "ops@nammafleet.example",
      phone: "Provider lookup required",
    },
    contactability: "Functional email plus leadership profile reference",
    tags: ["India", "Series A", "City expansion", "Ops hiring"],
    services: ["expansion planning", "pricing", "competitor research"],
  },
  {
    company: "Northstar Climate",
    domain: "northstarclimate.example",
    location: "Singapore with India launch",
    market: "foreign-india",
    industry: "Climate software",
    employees: 76,
    funding: "series-a",
    signal: "Announced pilot partnerships with Indian manufacturing exporters",
    linkedinSignal: "Country manager posted about India pilots",
    poc: {
      name: "Meera Iyer",
      title: "India Country Manager",
      email: "india@northstarclimate.example",
      phone: "Provider lookup required",
    },
    contactability: "Country inbox and named manager",
    tags: ["Entering India", "Series A", "Manufacturing", "Country manager"],
    services: ["India market research", "competitor mapping", "go-to-market"],
  },
  {
    company: "VedaWell",
    domain: "vedawell.example",
    location: "Mumbai, India",
    market: "india-startup",
    industry: "Health and wellness",
    employees: 58,
    funding: "seed",
    signal: "Launching student wellness product for private universities",
    linkedinSignal: "Co-founder posts about youth mental health",
    poc: {
      name: "Sana Kapoor",
      title: "Co-founder",
      email: "partnerships@vedawell.example",
      phone: "Provider lookup required",
    },
    contactability: "Partnerships inbox available",
    tags: ["Youth market", "Seed", "Partnerships"],
    services: ["student insights", "survey design", "go-to-market"],
  },
  {
    company: "OrbitOps AI",
    domain: "orbitops.example",
    location: "Pune, India",
    market: "india-startup",
    industry: "AI operations",
    employees: 18,
    funding: "bootstrapped",
    signal: "Founder-led team building industry-specific sales motion",
    linkedinSignal: "Founder posts product demos and asks for beta users",
    poc: {
      name: "Dev Nair",
      title: "Founder",
      email: "hello@orbitops.example",
      phone: "Provider lookup required",
    },
    contactability: "Generic inbox and active founder",
    tags: ["Small team", "Bootstrapped", "Founder active"],
    services: ["ICP research", "pricing", "sales research"],
  },
  {
    company: "KitePay",
    domain: "kitepay.example",
    location: "Ahmedabad, India",
    market: "india-startup",
    industry: "Fintech",
    employees: 210,
    funding: "growth",
    signal: "Expanding merchant acquisition in tier-2 cities",
    linkedinSignal: "Marketing director hiring campus ambassadors",
    poc: {
      name: "Nikhil Shah",
      title: "Director of Marketing",
      email: "marketing@kitepay.example",
      phone: "Provider lookup required",
    },
    contactability: "Department inbox and campaign owner",
    tags: ["Tier-2 expansion", "Growth", "Marketing hiring"],
    services: ["market research", "pricing", "merchant research"],
  },
  {
    company: "BazaarPilot",
    domain: "bazaarpilot.example",
    location: "Jaipur, India",
    market: "india-startup",
    industry: "Retail analytics",
    employees: 34,
    funding: "seed",
    signal: "Building playbooks for D2C brands entering offline retail",
    linkedinSignal: "CEO active in D2C founder conversations",
    poc: {
      name: "Ananya Bansal",
      title: "CEO",
      email: "hello@bazaarpilot.example",
      phone: "Provider lookup required",
    },
    contactability: "Founder-accessible company inbox",
    tags: ["D2C", "Seed", "Retail expansion", "CEO active"],
    services: ["competitor research", "distribution research", "go-to-market"],
  },
];

const state = {
  intent: {},
  leads: [],
};

const elements = {
  briefInput: document.querySelector("#briefInput"),
  resetBrief: document.querySelector("#resetBrief"),
  runDiscovery: document.querySelector("#runDiscovery"),
  marketFilter: document.querySelector("#marketFilter"),
  sizeFilter: document.querySelector("#sizeFilter"),
  fundingFilter: document.querySelector("#fundingFilter"),
  limitFilter: document.querySelector("#limitFilter"),
  sortFilter: document.querySelector("#sortFilter"),
  searchInput: document.querySelector("#searchInput"),
  exportCsv: document.querySelector("#exportCsv"),
  leadTable: document.querySelector("#leadTable"),
  matchedCount: document.querySelector("#matchedCount"),
  averageFit: document.querySelector("#averageFit"),
  contactableCount: document.querySelector("#contactableCount"),
  indiaSignalCount: document.querySelector("#indiaSignalCount"),
  intentSummary: document.querySelector("#intentSummary"),
  drawer: document.querySelector("#leadDrawer"),
  drawerTitle: document.querySelector("#drawerTitle"),
  drawerBody: document.querySelector("#drawerBody"),
  closeDrawer: document.querySelector("#closeDrawer"),
};

function extractIntent(text) {
  const lower = text.toLowerCase();
  const services = [];
  const addWhen = (condition, service) => {
    if (condition) services.push(service);
  };

  addWhen(/market|research|survey|insight/.test(lower), "market research");
  addWhen(/competitor|competition|mapping/.test(lower), "competitor research");
  addWhen(/go-to-market|gtm|sales/.test(lower), "go-to-market");
  addWhen(/pricing|price/.test(lower), "pricing");
  addWhen(/expand|expansion|launch|entering|new market/.test(lower), "expansion planning");
  addWhen(/student|youth|campus|college/.test(lower), "student insights");

  return {
    indiaRelevant: /india|indian|bharat|bangalore|bengaluru|mumbai|delhi|pune|chennai|hyderabad/.test(lower),
    wantsStartups: /startup|early-stage|founder|seed|series a/.test(lower),
    wantsCorporates: /corporation|corporate|enterprise|larger/.test(lower),
    wantsFundingSignal: /fund|raised|funding|investor|seed|series a/.test(lower),
    wantsHiringSignal: /hiring|recruit|roles|jobs|expand team/.test(lower),
    wantsYouthMarket: /student|youth|campus|college|university/.test(lower),
    wantsIndiaEntry: /foreign|international|entering india|india launch|global/.test(lower),
    services: [...new Set(services)],
  };
}

function sizeBand(employees) {
  if (employees <= 50) return "small";
  if (employees <= 250) return "mid";
  return "large";
}

function scoreLead(lead, intent) {
  let score = 40;
  const reasons = [];

  if (intent.indiaRelevant && lead.market.includes("india")) {
    score += 18;
    reasons.push("India relevance");
  }

  if (intent.wantsStartups && lead.market === "india-startup") {
    score += 12;
    reasons.push("startup fit");
  }

  if (intent.wantsIndiaEntry && lead.market === "foreign-india") {
    score += 18;
    reasons.push("India entry signal");
  }

  if (intent.wantsFundingSignal && ["seed", "series-a"].includes(lead.funding)) {
    score += 12;
    reasons.push("recent funding proxy");
  }

  if (intent.wantsHiringSignal && /hiring|roles|opening|acquisition/.test(lead.signal.toLowerCase())) {
    score += 10;
    reasons.push("hiring or expansion signal");
  }

  if (intent.wantsYouthMarket && /student|youth|campus|university/.test(`${lead.signal} ${lead.tags.join(" ")}`.toLowerCase())) {
    score += 14;
    reasons.push("student or youth market");
  }

  const serviceMatches = intent.services.filter((service) => {
    const normalized = service.replace("market research", "research");
    return lead.services.some((item) => item.includes(normalized) || normalized.includes(item));
  });

  if (serviceMatches.length > 0) {
    score += Math.min(18, serviceMatches.length * 6);
    reasons.push(`${serviceMatches.length} service match${serviceMatches.length > 1 ? "es" : ""}`);
  }

  if (lead.employees > 500) {
    score -= 15;
    reasons.push("larger team, harder entry");
  }

  return {
    ...lead,
    score: Math.min(score, 98),
    fitReasons: reasons.length ? reasons : ["baseline ICP match"],
  };
}

function applyFilters(leads) {
  const market = elements.marketFilter.value;
  const size = elements.sizeFilter.value;
  const funding = elements.fundingFilter.value;
  const query = elements.searchInput.value.trim().toLowerCase();
  const sort = elements.sortFilter.value;
  const limit = Number(elements.limitFilter.value);

  let filtered = leads.filter((lead) => {
    const marketOk = market === "all" || lead.market === market || (market === "india" && lead.market.includes("india"));
    const sizeOk = size === "all" || sizeBand(lead.employees) === size;
    const fundingOk = funding === "all" || lead.funding === funding;
    const queryText = `${lead.company} ${lead.industry} ${lead.location} ${lead.tags.join(" ")} ${lead.poc.title}`.toLowerCase();
    const queryOk = !query || queryText.includes(query);
    return marketOk && sizeOk && fundingOk && queryOk;
  });

  filtered.sort((a, b) => {
    if (sort === "employees") return a.employees - b.employees;
    if (sort === "company") return a.company.localeCompare(b.company);
    return b.score - a.score;
  });

  return filtered.slice(0, limit);
}

function renderMetrics(leads) {
  const average = leads.length
    ? Math.round(leads.reduce((sum, lead) => sum + lead.score, 0) / leads.length)
    : 0;

  elements.matchedCount.textContent = leads.length;
  elements.averageFit.textContent = average;
  elements.contactableCount.textContent = leads.filter((lead) => lead.poc.email).length;
  elements.indiaSignalCount.textContent = leads.filter((lead) => lead.market.includes("india")).length;
}

function renderIntent(intent) {
  const services = intent.services.length ? intent.services.join(", ") : "general consulting";
  const signalParts = [
    intent.indiaRelevant ? "India relevance" : null,
    intent.wantsFundingSignal ? "funding signals" : null,
    intent.wantsHiringSignal ? "hiring signals" : null,
    intent.wantsYouthMarket ? "student/youth market" : null,
    intent.wantsIndiaEntry ? "foreign India entry" : null,
  ].filter(Boolean);

  elements.intentSummary.textContent = `Parsed focus: ${services}. Priority signals: ${signalParts.join(", ") || "baseline ICP fit"}.`;
}

function renderLeads() {
  const visibleLeads = applyFilters(state.leads);
  renderMetrics(visibleLeads);

  if (!visibleLeads.length) {
    elements.leadTable.innerHTML = '<div class="empty-state">No leads match the current filters.</div>';
    return;
  }

  elements.leadTable.innerHTML = visibleLeads
    .map(
      (lead, index) => `
        <article class="lead-row" role="listitem">
          <div>
            <p class="company-name">${lead.company}</p>
            <p class="lead-meta">${lead.industry} · ${lead.location} · ${lead.employees} employees</p>
            <div class="tag-list">${lead.tags.map((tag) => `<span class="tag">${tag}</span>`).join("")}</div>
          </div>
          <div>
            <p class="lead-meta">${formatFunding(lead.funding)}</p>
            <p class="lead-reason">${lead.signal}</p>
          </div>
          <div>
            <p class="contact-line"><strong>${lead.poc.name}</strong></p>
            <p class="contact-line">${lead.poc.title}</p>
            <p class="contact-line">${lead.poc.email}</p>
          </div>
          <div><span class="score">${lead.score}</span></div>
          <button class="secondary-button details-button" type="button" data-index="${index}">Details</button>
        </article>
      `
    )
    .join("");

  document.querySelectorAll(".details-button").forEach((button) => {
    button.addEventListener("click", () => {
      openDrawer(visibleLeads[Number(button.dataset.index)]);
    });
  });
}

function formatFunding(funding) {
  const labels = {
    bootstrapped: "Bootstrapped",
    seed: "Seed",
    "series-a": "Series A",
    growth: "Growth",
  };
  return labels[funding] || funding;
}

function openDrawer(lead) {
  elements.drawerTitle.textContent = lead.company;
  elements.drawerBody.innerHTML = `
    <section class="detail-list">
      <p><strong>Why this lead</strong>${lead.fitReasons.join(", ")}</p>
      <p><strong>Signal to verify</strong>${lead.signal}</p>
      <p><strong>LinkedIn reference signal</strong>${lead.linkedinSignal}</p>
      <p><strong>Point of contact</strong>${lead.poc.name}, ${lead.poc.title}</p>
      <p><strong>Email path</strong>${lead.poc.email}</p>
      <p><strong>Phone path</strong>${lead.poc.phone}</p>
      <p><strong>Contactability</strong>${lead.contactability}</p>
    </section>
    <section class="callout">
      Next connector step: verify company domain, collect public business emails,
      then enrich work contact data through a compliant provider before outreach.
    </section>
  `;
  elements.drawer.classList.add("open");
  elements.drawer.setAttribute("aria-hidden", "false");
}

function runDiscovery() {
  state.intent = extractIntent(elements.briefInput.value);
  state.leads = demoLeads.map((lead) => scoreLead(lead, state.intent));
  renderIntent(state.intent);
  renderLeads();
}

function exportCsv() {
  const visibleLeads = applyFilters(state.leads);
  const headers = [
    "Company",
    "Domain",
    "Location",
    "Industry",
    "Employees",
    "Funding",
    "Score",
    "Signal",
    "POC Name",
    "POC Title",
    "Email",
    "Phone",
  ];
  const rows = visibleLeads.map((lead) => [
    lead.company,
    lead.domain,
    lead.location,
    lead.industry,
    lead.employees,
    formatFunding(lead.funding),
    lead.score,
    lead.signal,
    lead.poc.name,
    lead.poc.title,
    lead.poc.email,
    lead.poc.phone,
  ]);

  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "leadscope-india-leads.csv";
  link.click();
  URL.revokeObjectURL(url);
}

document.querySelectorAll("[data-brief]").forEach((button) => {
  button.addEventListener("click", () => {
    elements.briefInput.value = button.dataset.brief;
    runDiscovery();
  });
});

elements.resetBrief.addEventListener("click", () => {
  elements.briefInput.value = defaultBrief;
  runDiscovery();
});
elements.runDiscovery.addEventListener("click", runDiscovery);
elements.exportCsv.addEventListener("click", exportCsv);
elements.closeDrawer.addEventListener("click", () => {
  elements.drawer.classList.remove("open");
  elements.drawer.setAttribute("aria-hidden", "true");
});

[elements.marketFilter, elements.sizeFilter, elements.fundingFilter, elements.limitFilter, elements.sortFilter].forEach((control) => {
  control.addEventListener("change", renderLeads);
});
elements.searchInput.addEventListener("input", renderLeads);

runDiscovery();
