import type { Agent, AgentAvatar, AgentStatus } from '../agents/agent.types'

const av = (skin: string, hairStyle: string, hair: string, shirtStyle: string, shirt: string, pants: string, accessory?: string): AgentAvatar => ({
  skinVariant: skin, hairStyle, hairVariant: hair, shirtStyle, shirtVariant: shirt, pantsVariant: pants, accessory,
})

const a = (id: string, displayName: string, role: string, department: string, status: AgentStatus, homeDeskId: string | undefined, avatar: AgentAvatar): Agent => ({
  id, displayName, role, department, status, provider: 'mock', homeDeskId, deskId: undefined, avatar,
})

// Rollenbasierte Agenten, keine erfundenen Personas. Arbeitsplätze werden beim Start aus dem Status abgeleitet.
export const INITIAL_AGENTS: readonly Agent[] = [
  // HerkulesJobs
  a('hj-lead-research', 'Lead Research', 'Lead Research Agent', 'hj-sales', 'working', 'hj-sales-01', av('s2', 'short', 'h2', 'collar', 'c1', 'p1', 'glasses')),
  a('hj-sales', 'Sales', 'Sales Agent', 'hj-sales', 'waiting', 'hj-sales-02', av('s4', 'fauxhawk', 'h4', 'tee', 'c3', 'p2', 'headset')),
  a('hj-outreach', 'Outreach', 'Outreach Agent', 'hj-sales', 'idle', 'hj-sales-03', av('s1', 'long', 'h3', 'hoodie', 'c5', 'p1')),
  a('hj-employer-research', 'Employer Research', 'Employer Research Agent', 'hj-recruiting', 'working', 'hj-recruiting-01', av('s3', 'bun', 'h1', 'vest', 'c8', 'p3', 'badge')),
  a('hj-recruiting-content', 'Recruiting Content', 'Recruiting Content Agent', 'hj-recruiting', 'working', 'hj-recruiting-02', av('s5', 'curly', 'h4', 'tee', 'c4', 'p1')),
  a('hj-job-quality', 'Job Quality', 'Job Quality Agent', 'hj-recruiting', 'break', 'hj-recruiting-03', av('s2', 'short', 'h5', 'collar', 'c7', 'p4', 'glasses')),
  a('hj-customer-success', 'Customer Success', 'Customer Success Agent', 'hj-cs', 'working', 'hj-cs-01', av('s6', 'bald', 'h1', 'hoodie', 'c2', 'p2')),
  a('hj-support', 'Support', 'Support Agent', 'hj-cs', 'idle', 'hj-cs-02', av('s1', 'bun', 'h6', 'tee', 'c6', 'p3', 'headset')),
  // KasselMemes
  a('km-trend-scout', 'Trend Scout', 'Trend Scout', 'km-trends', 'working', 'km-trends-01', av('s3', 'fauxhawk', 'h2', 'hoodie', 'c2', 'p1', 'beanie')),
  a('km-local-research', 'Local Research', 'Local Research Agent', 'km-trends', 'working', 'km-trends-02', av('s2', 'long', 'h5', 'vest', 'c5', 'p3')),
  a('km-community-insights', 'Community Insights', 'Community Insights Agent', 'km-trends', 'meeting', 'km-trends-03', av('s4', 'curly', 'h1', 'tee', 'c8', 'p2', 'glasses')),
  a('km-editorial', 'Editorial', 'Editorial Agent', 'km-redaktion', 'working', 'km-redaktion-01', av('s1', 'short', 'h3', 'collar', 'c4', 'p1', 'badge')),
  a('km-caption', 'Caption', 'Caption Agent', 'km-redaktion', 'waiting', 'km-redaktion-02', av('s5', 'bun', 'h4', 'hoodie', 'c1', 'p4')),
  a('km-content-research', 'Content Research', 'Content Research Agent', 'km-redaktion', 'meeting', 'km-redaktion-03', av('s3', 'short', 'h6', 'tee', 'c3', 'p3', 'glasses')),
  a('km-creative', 'Creative', 'Creative Agent', 'km-creative', 'working', 'km-creative-01', av('s2', 'curly', 'h5', 'vest', 'c6', 'p2', 'cap')),
  a('km-visual', 'Visual', 'Visual Agent', 'km-creative', 'idle', 'km-creative-02', av('s6', 'long', 'h4', 'tee', 'c4', 'p1')),
  a('km-reel', 'Reel', 'Reel Agent', 'km-creative', 'break', 'km-creative-03', av('s4', 'fauxhawk', 'h3', 'hoodie', 'c7', 'p3', 'headset')),
  // Shared / Development
  a('dev-developer', 'Developer', 'Developer Agent', 'dev', 'working', 'dev-01', av('s3', 'short', 'h1', 'hoodie', 'c6', 'p1', 'glasses')),
  a('dev-frontend', 'Frontend Developer', 'Frontend Developer Agent', 'dev', 'working', 'dev-02', av('s1', 'bun', 'h2', 'tee', 'c2', 'p2')),
  a('dev-backend', 'Backend Developer', 'Backend Developer Agent', 'dev', 'working', 'dev-03', av('s5', 'bald', 'h1', 'hoodie', 'c3', 'p1', 'headset')),
  a('dev-code-review', 'Code Review', 'Code Review Agent', 'dev', 'waiting', 'dev-04', av('s2', 'curly', 'h6', 'collar', 'c8', 'p4', 'glasses')),
  a('dev-qa', 'QA', 'QA Agent', 'dev', 'idle', 'dev-05', av('s4', 'long', 'h5', 'vest', 'c1', 'p3', 'badge')),
  a('dev-research', 'Research', 'Research Agent', 'dev', 'idle', 'dev-06', av('s1', 'fauxhawk', 'h3', 'tee', 'c7', 'p2')),
  a('dev-automation', 'Automation', 'Automation Agent', 'dev', 'offline', 'dev-07', av('s6', 'short', 'h4', 'hoodie', 'c5', 'p1', 'beanie')),
]
