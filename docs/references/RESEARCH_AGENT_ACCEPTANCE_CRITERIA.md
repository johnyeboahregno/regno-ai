# Research Agent Pipeline - Acceptance Criteria

## Reference Architecture
Based on: `sandmine_research_workflow.html` - Claude's 8-step research process

---

## 1. PARSING QUALITY CRITERIA

### 1.1 Requirement Extraction
| Criterion | Target | Measurement |
|-----------|--------|-------------|
| Entity Identification | 100% | All mentioned products, models, quantities extracted |
| Question Decomposition | 100% | All user questions identified and categorized |
| Context Recognition | 100% | Application domain correctly identified |
| Search Query Generation | 5-10 queries | Covering all angles (specs, pricing, reviews, alternatives) |

### 1.2 Query Quality Metrics
- [ ] Each query is specific and searchable
- [ ] Queries cover: Overview, Technical Specs, Pricing, Reviews, Comparisons, Alternatives
- [ ] Include year/date for current information (e.g., "2025", "2026")
- [ ] Include domain-specific qualifiers
- [ ] Output is valid JSON with structured format

**Reference Example:**
```
User: "Battery: Sungrow ST2236UX, Inverters: sc2400udmv, 40 batteries and 5 inverters"

Expected Parsing:
- Entities: ST2236UX (battery), SC2400UD-MV (inverter)
- Quantities: 40 batteries, 5 inverters
- Questions: energy capacity, runtime, plant sizing, recommendations
- Domain: sand mine, construction supply
```

---

## 2. RESEARCH QUALITY CRITERIA

### 2.1 Search Coverage
| Criterion | Target | Reference |
|-----------|--------|-----------|
| Minimum Search Calls | 8-10 | Reference had 10 calls |
| Successful Results | ≥80% | Reference: 8/10 success |
| Source Diversity | ≥3 sources | Multiple authoritative sources |
| Data Freshness | Current year | 2025/2026 data prioritized |

### 2.2 Data Extraction Quality
| Metric | Standard |
|--------|----------|
| Specification Completeness | All key specs extracted (capacity, dimensions, power, efficiency) |
| Numerical Precision | Exact values with units |
| Source Attribution | URL/source for each data point |
| Conflict Resolution | Conflicting data noted and resolved |

### 2.3 Search Topics Coverage (for equipment research)
- [ ] Product specifications (capacity, dimensions, weight)
- [ ] Technical parameters (voltage, efficiency, ratings)
- [ ] Industry application data (consumption, load profiles)
- [ ] Pricing/cost information
- [ ] Installation requirements
- [ ] Competitor comparisons

**Reference Example:**
```
Search 1: "Sungrow ST2236UX battery specifications capacity kWh 2025"
Result: 2,236 kWh, dimensions, weight

Search 2: "Sungrow SC2400UD-MV inverter specifications power output MW 2025"
Result: Model variations, need follow-up

Search 3: "Sungrow SC2500UD-MV OR SC2400UD inverter datasheet specifications"
Result: Found manual source

Search 4: [WebFetch] manualslib.com manual page
Result: Full specs - 2.4 MW, 99% efficiency
```

---

## 3. ANALYSIS QUALITY CRITERIA

### 3.1 Data Synthesis
| Criterion | Standard |
|-----------|----------|
| Fact Extraction | All quantitative data in structured format |
| Pattern Recognition | Common themes identified across sources |
| Gap Identification | Missing information explicitly noted |
| Confidence Levels | Each fact tagged (verified/estimated/uncertain) |

### 3.2 Comparative Analysis
- [ ] Side-by-side comparison tables generated
- [ ] Ranking by relevant criteria
- [ ] Best-in-class options identified
- [ ] Trade-offs clearly articulated

### 3.3 Calculation Accuracy
| Type | Requirement |
|------|-------------|
| Formula Documentation | All formulas shown |
| Unit Consistency | All units explicit and consistent |
| Assumptions Stated | Every assumption documented |
| Verification | Results sanity-checked |

**Reference Example:**
```
E_total = N_batteries × C_battery
E_total = 40 × 2,236 kWh
E_total = 89,440 kWh = 89.44 MWh

Runtime = E_usable / P_load
Runtime = 71,552 kWh / 420 kW
Runtime = 170.4 hours = 7.1 days
```

---

## 4. OUTPUT QUALITY CRITERIA

### 4.1 Document Structure
| Section | Required | Reference |
|---------|----------|-----------|
| Executive Summary | Yes | 3-5 sentences with key findings |
| Research Overview | Yes | Methodology and sources |
| Detailed Findings | Yes | Organized by topic |
| Data Tables | Yes | Specifications, comparisons |
| Calculations | If applicable | With formulas and assumptions |
| Recommendations | Yes | Prioritized with justification |
| Source Citations | Yes | URLs for all sources |

### 4.2 Content Quality Metrics
| Metric | Target |
|--------|--------|
| Specific Numbers | Every claim has data |
| Source Citations | Every fact attributed |
| Tables for Comparisons | At least 1 comparative table |
| Actionable Recommendations | At least 3 specific recommendations |
| Executive Summary Length | 100-200 words |
| Total Content Length | 500-2000 words (or equivalent detail) |

### 4.3 Formatting Standards
- [ ] Markdown formatting throughout
- [ ] Clear section headers
- [ ] Bullet points for lists
- [ ] Tables for structured data
- [ ] Code blocks for technical specifications
- [ ] Emphasis (bold/italic) for key points

---

## 5. SCORING RUBRIC

### Overall Pipeline Score (0-100)

#### PARSING (20 points)
- Entity extraction accuracy: 0-5 pts
- Question decomposition: 0-5 pts
- Query quality: 0-5 pts
- JSON structure validity: 0-5 pts

#### RESEARCH (30 points)
- Search coverage (8+ calls): 0-10 pts
- Success rate (80%+): 0-10 pts
- Source diversity: 0-5 pts
- Data freshness: 0-5 pts

#### ANALYSIS (25 points)
- Data synthesis quality: 0-10 pts
- Calculation accuracy: 0-10 pts
- Gap identification: 0-5 pts

#### OUTPUT (25 points)
- Document structure: 0-5 pts
- Content completeness: 0-10 pts
- Formatting quality: 0-5 pts
- Actionable recommendations: 0-5 pts

### Score Interpretation
| Score | Grade | Status |
|-------|-------|--------|
| 90-100 | A | Excellent - Production ready |
| 80-89 | B | Good - Minor improvements needed |
| 70-79 | C | Acceptable - Some gaps to address |
| 60-69 | D | Below standard - Significant issues |
| <60 | F | Failing - Major rework required |

---

## 6. TEST SCENARIOS

### 6.1 Primary Test Case (Reference Scenario)
**Input:** Sandmine battery storage research
```
Battery: Sungrow ST2236UX
Inverters: SC2400UD-MV
Configuration: 40 batteries, 5 inverters

Questions:
- Energy capacity in MWh
- Runtime on battery power
- Plant sizing recommendations
- Battery/inverter combinations by site size

Application: Small sand mine (local construction supply)
```

**Expected Output Validation:**
- [ ] Battery specs: 2,236 kWh per unit extracted
- [ ] Inverter specs: 2.4 MW per unit extracted
- [ ] Total energy: 89.44 MWh calculated
- [ ] Runtime calculations with assumptions
- [ ] Equipment recommendation table
- [ ] Cost estimates (if available)
- [ ] At least 5 cited sources

### 6.2 Secondary Test Cases

#### Test Case A: Technology Comparison
**Input:** "Compare React vs Vue vs Svelte for a large enterprise dashboard application"

**Validation Points:**
- [ ] 3 frameworks identified
- [ ] Performance metrics researched
- [ ] Learning curve data
- [ ] Ecosystem comparison
- [ ] Recommendation with justification

#### Test Case B: Market Research
**Input:** "Research the electric vehicle charging infrastructure market in Europe 2025"

**Validation Points:**
- [ ] Market size data
- [ ] Key players identified
- [ ] Growth projections
- [ ] Regional breakdown
- [ ] Investment trends

#### Test Case C: Technical Specification Research
**Input:** "Research specifications for enterprise NAS solutions for 100TB storage with redundancy"

**Validation Points:**
- [ ] Product options identified
- [ ] Capacity and RAID configurations
- [ ] Performance metrics (IOPS, throughput)
- [ ] Price ranges
- [ ] Vendor comparisons

---

## 7. AUTOMATED VALIDATION CHECKS

### 7.1 Pipeline Execution Validation
```javascript
// Validation function for pipeline output
function validateResearchOutput(output) {
  const checks = {
    // Parsing validation
    hasSearchQueries: output.queries?.length >= 5,
    queriesHaveYear: output.queries?.every(q => /202[5-6]/.test(q)),

    // Research validation
    searchCallCount: output.toolCalls?.filter(t => t.type === 'web_search').length >= 8,
    successRate: (output.successfulSearches / output.totalSearches) >= 0.8,

    // Analysis validation
    hasCalculations: output.calculations?.length > 0,
    hasComparisons: output.tables?.length > 0,

    // Output validation
    hasExecutiveSummary: output.content?.includes('Executive Summary'),
    hasRecommendations: output.content?.includes('Recommendation'),
    hasCitations: output.sources?.length >= 3,

    // Format validation
    isMarkdown: /^#/.test(output.content),
    hasTables: /\|.*\|/.test(output.content),
    wordCount: output.content?.split(/\s+/).length >= 500
  };

  return {
    passed: Object.values(checks).filter(Boolean).length,
    total: Object.keys(checks).length,
    score: (Object.values(checks).filter(Boolean).length / Object.keys(checks).length) * 100,
    details: checks
  };
}
```

### 7.2 Quality Gates
| Gate | Requirement | Action if Fail |
|------|-------------|----------------|
| Parsing Gate | Valid JSON output | Retry parsing |
| Research Gate | ≥80% search success | Additional searches |
| Analysis Gate | All calculations verified | Manual review |
| Output Gate | Score ≥70 | Regenerate |

---

## 8. CONTINUOUS IMPROVEMENT

### 8.1 Metrics to Track
- Average search success rate
- Average output score
- User satisfaction (if feedback available)
- Time to completion
- Token usage efficiency

### 8.2 Improvement Actions
| Metric Below Target | Action |
|---------------------|--------|
| Search success <80% | Review query generation prompts |
| Output score <70 | Enhance synthesis prompts |
| Missing calculations | Add calculation templates |
| Poor formatting | Update output format instructions |

---

## Document Version
- Created: January 2026
- Pipeline: research-agent-template
- Reference: sandmine_research_workflow.html
