# AI Infrastructure Architecture Options

## Self-Hosted vs. Sovereign Cloud vs. Hybrid

A comparative analysis for deploying a private LLM inference environment at scale.

---

## 1. Architecture Options

### Option A: Fully Self-Hosted (On-Premises)

**Description:** Purchase and operate NVIDIA HGX B200 (8-GPU) nodes in your own data centre or colocation facility.

**Stack:**
- NVIDIA B200 / GB200 8-GPU nodes
- AMD EPYC 9004 or Intel Xeon w9-3595X CPUs
- 1.5TB+ DDR5 system RAM per node
- NVMe-oF storage tier for vector DB (Qdrant/Milvus)
- NVIDIA AI Enterprise + TensorRT-LLM + Triton Inference Server
- Direct liquid cooling (mandatory for B200 TDP ~1000W/GPU)

**Pros:**
- 100% data sovereignty - data never leaves your premises
- No recurring cloud costs after initial CapEx
- Full hardware control, upgradeable on your schedule
- No vendor lock-in on infrastructure layer
- Predictable latency (no network hops to cloud)
- Compliance-friendly for FCA, GDPR, ISO 27001

**Cons:**
- High upfront CapEx (~$300K-$400K per 8-GPU node)
- Requires data centre space with liquid cooling capability
- Need dedicated infrastructure team (DevOps, hardware, networking)
- 6-12 month lead time for B200 hardware (2026)
- Scaling requires new hardware procurement cycles
- Power costs: ~10-12kW per node continuous draw
- Risk of underutilisation during off-peak hours

---

### Option B: Sovereign Cloud (e.g., Nscale, Oracle Sovereign Cloud)

**Description:** Lease GPU capacity from a sovereign cloud provider with data residency guarantees (UK-only data centres).

**Stack:**
- Provider-managed B200/H100 clusters
- Managed Kubernetes / Triton endpoints
- Provider-managed networking, cooling, power
- Your software stack deployed on leased infrastructure

**Pros:**
- No CapEx - OpEx-only model
- Rapid scaling (add nodes in days, not months)
- Data sovereignty maintained (UK data centres, contractual guarantees)
- Provider handles hardware failures, cooling, power
- No data centre buildout required
- PoC/trial periods typically available
- Easier to scale down if demand drops

**Cons:**
- Higher long-term cost at sustained high utilisation
- Contractual data sovereignty (not physical control)
- Dependent on provider's availability and SLAs
- Potential egress costs for large data movement
- Limited hardware customisation
- Provider lock-in risk on orchestration layer

---

### Option C: Hybrid (Self-Hosted Base + Cloud Burst)

**Description:** Own a base capacity of on-premises nodes for steady-state load, burst to sovereign cloud for peak demand.

**Stack:**
- 2-4 owned B200 nodes on-premises (base capacity)
- Sovereign cloud burst capacity (Nscale/Oracle)
- Unified orchestration layer (Kubernetes + custom load balancer)
- Shared model registry and vector DB replication

**Pros:**
- Optimised cost: own hardware handles base load at low marginal cost
- Cloud burst handles peaks without over-provisioning
- Full data sovereignty on both tiers
- Resilience: failover between on-prem and cloud
- Gradual migration path in either direction
- Best of both worlds for compliance and flexibility

**Cons:**
- Most complex to architect and operate
- Requires unified orchestration across environments
- Model deployment must be synchronised across tiers
- Network latency between tiers during burst
- Two vendor relationships to manage
- Highest operational skill requirement

---

## 2. Cost Modelling at Scale

### Assumptions

| Parameter | Value |
|---|---|
| Model | Llama 3.1 70B (quantised INT8) or equivalent |
| Avg tokens per request | ~800 input + ~400 output |
| Avg requests per user/day | 5 |
| Peak concurrency multiplier | 3x average |
| Target latency | < 1 second TTFT, < 5s full response |
| B200 throughput (70B INT8) | ~2,500 req/hour/GPU sustained |
| B200 node (8 GPU) throughput | ~20,000 req/hour |

### Throughput Requirements

| Users | Requests/Day | Peak Req/Hour | B200 Nodes Needed (sustained) | B200 Nodes Needed (peak headroom) |
|---|---|---|---|---|
| 100,000 | 500,000 | 62,500 | 3-4 | 4-5 |
| 250,000 | 1,250,000 | 156,250 | 8-9 | 10-12 |
| 500,000 | 2,500,000 | 312,500 | 16-17 | 20-22 |
| 1,000,000 | 5,000,000 | 625,000 | 32-34 | 40-44 |

*Note: Actual throughput depends heavily on model size, quantisation, batch size, and request complexity. These are conservative estimates for a 70B parameter model.*

---

### Option A: Self-Hosted Cost Breakdown

| Cost Component | Per Node | Notes |
|---|---|---|
| B200 8-GPU Node (HGX) | $350,000 | Dell/Supermicro, includes CPU, RAM, NVMe |
| Networking (InfiniBand) | $25,000 | Per-node share of spine fabric |
| Data Centre (colo/rack) | $3,000/mo | Power, cooling, space, connectivity |
| Power (12kW @ $0.15/kWh) | $1,300/mo | UK commercial rate |
| Liquid Cooling Infrastructure | $50,000 | One-time, amortised across nodes |
| Staff (DevOps/Infra team) | $25,000/mo | Shared across cluster, 2-3 FTEs |
| NVIDIA AI Enterprise License | $4,500/yr/GPU | $36,000/yr per node |
| Support & Maintenance | $2,500/mo | Hardware warranty + spares |

| Scale | Nodes | Year 1 (CapEx + OpEx) | Year 2+ (OpEx/yr) | 3-Year TCO |
|---|---|---|---|---|
| **100K users** | 5 | $2,225,000 | $615,000 | $3,455,000 |
| **250K users** | 12 | $5,100,000 | $1,350,000 | $7,800,000 |
| **500K users** | 22 | $9,100,000 | $2,400,000 | $13,900,000 |
| **1M users** | 44 | $18,000,000 | $4,700,000 | $27,400,000 |

---

### Option B: Sovereign Cloud Cost Breakdown

| Cost Component | Rate | Notes |
|---|---|---|
| B200 GPU-hour (Nscale/equiv) | $3.50 - $5.00/GPU/hr | Reserved instance pricing |
| Reserved 1-year commitment | $2.50 - $3.50/GPU/hr | Significant discount |
| Reserved 3-year commitment | $1.80 - $2.80/GPU/hr | Best rate, less flexibility |
| Storage (NVMe) | $0.10/GB/mo | Vector DB + model weights |
| Networking/Egress | $0.05 - $0.10/GB | Internal traffic usually free |
| Managed K8s / Orchestration | $500 - $1,500/mo | Optional managed layer |

*Using 1-year reserved pricing at $3.00/GPU/hr median:*

| Scale | GPUs | Monthly Cost | Annual Cost | 3-Year TCO |
|---|---|---|---|---|
| **100K users** | 40 | $87,600 | $1,051,000 | $3,153,000 |
| **250K users** | 96 | $210,000 | $2,522,000 | $7,566,000 |
| **500K users** | 176 | $385,000 | $4,620,000 | $13,860,000 |
| **1M users** | 352 | $770,000 | $9,240,000 | $27,720,000 |

---

### Option C: Hybrid Cost Breakdown

*Assuming 60% base load on-prem, 40% cloud burst:*

| Scale | Owned Nodes | Cloud GPUs (burst) | Year 1 | Year 2+/yr | 3-Year TCO |
|---|---|---|---|---|---|
| **100K users** | 3 | 16 | $1,650,000 | $770,000 | $3,190,000 |
| **250K users** | 7 | 40 | $3,700,000 | $1,660,000 | $7,020,000 |
| **500K users** | 13 | 72 | $6,800,000 | $3,000,000 | $12,800,000 |
| **1M users** | 26 | 144 | $13,200,000 | $5,800,000 | $24,800,000 |

---

## 3. Comparison Summary

| Factor | Self-Hosted | Sovereign Cloud | Hybrid |
|---|---|---|---|
| **Data Sovereignty** | Physical control | Contractual | Physical + Contractual |
| **CapEx** | Very High | None | High |
| **OpEx (steady state)** | Low | High | Medium |
| **3-Year TCO (100K)** | $3.5M | $3.2M | $3.2M |
| **3-Year TCO (1M)** | $27.4M | $27.7M | $24.8M |
| **Time to Deploy** | 6-12 months | 2-4 weeks | 3-6 months |
| **Scaling Speed** | Weeks-months | Hours-days | Hours (cloud) / weeks (on-prem) |
| **Scaling Down** | Stranded assets | Cancel capacity | Partial flexibility |
| **Operational Complexity** | High | Low | Very High |
| **Team Required** | 3-5 infra engineers | 1-2 cloud engineers | 3-4 engineers |
| **Compliance (FCA/GDPR)** | Strongest | Strong | Strong |
| **Vendor Lock-in Risk** | Low | Medium | Medium |
| **Break-even vs Cloud** | ~18 months | N/A | ~24 months |

---

## 4. Recommendations by Stage

### Phase 1: Proof of Concept (0-3 months)
**Sovereign Cloud** - Lease 1-2 B200 nodes from Nscale. Validate throughput, latency, and model performance with real workloads. Cost: ~$15,000-$25,000/month.

### Phase 2: Initial Production (3-12 months, 100K users)
**Hybrid** - Procure 3 owned B200 nodes for base capacity. Keep sovereign cloud for burst and failover. Begin data centre preparation if going full self-hosted.

### Phase 3: Scale (12-24 months, 250K-500K users)
**Decision Point:**
- If utilisation is consistently >70%: transition to **self-hosted** for cost efficiency
- If demand is spiky/unpredictable: stay **hybrid** or go **sovereign cloud**
- If regulatory pressure increases: go **self-hosted**

### Phase 4: Enterprise Scale (24+ months, 1M users)
At 1M users with sustained demand, **hybrid** offers the best TCO ($24.8M vs $27M+ for pure plays) while maintaining operational resilience.

---

## 5. Key Vendor Contacts

| Vendor | Contact | Role |
|---|---|---|
| **Scan AI** | ai@scan.co.uk | UK-based B200 hardware supply |
| **Dell UK** | Enterprise Portal / 0800 085 4878 | Enterprise server configurations |
| **Nscale** | nscale.com/contact/sales | UK sovereign cloud GPU leasing |
| **NVIDIA** | Via channel partner | AI Enterprise licensing, NIM |

---

*Document prepared for internal evaluation. All pricing is estimated based on 2025-2026 market rates and should be validated with vendor quotes.*
