'use client'

import React, { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { useGitHubAuth } from '@/lib/auth/github'
import { GithubIcon } from '@/components/icons'

interface ResearchPaper {
  id: number
  category: 'agent' | 'multiagent' | 'cloud'
  domain: string
  title: string
  authors: string
  citation: string
  url: string
  desc: string
}

const researchPapers: ResearchPaper[] = [
  {
    id: 1,
    category: 'agent',
    domain: 'Agentic AI & ACIs',
    title: 'SWE-agent: Agent-Computer Interfaces Enable Automated Software Engineering',
    authors: 'John Yang et al. (NeurIPS / arXiv)',
    citation: 'arXiv:2405.15793',
    url: 'https://arxiv.org/abs/2405.15793',
    desc: 'Introduces Agent-Computer Interfaces (ACIs) tailored for LLMs, demonstrating that simplified commands outperform raw terminal shell access.',
  },
  {
    id: 2,
    category: 'agent',
    domain: 'Software Benchmarks',
    title: 'SWE-bench: Can Language Models Resolve Real-World GitHub Issues?',
    authors: 'Carlos E. Jimenez et al. (ICLR / arXiv)',
    citation: 'arXiv:2310.06770',
    url: 'https://arxiv.org/abs/2310.06770',
    desc: 'Defines the standard benchmark suite for evaluating repository-level issue resolution using real GitHub pull requests.',
  },
  {
    id: 3,
    category: 'agent',
    domain: 'Agent Platforms',
    title: 'OpenHands: An Open Platform for AI Software Developers as Generalist Agents',
    authors: 'Xingyao Wang et al. (ICLR / arXiv)',
    citation: 'arXiv:2407.16741',
    url: 'https://arxiv.org/abs/2407.16741',
    desc: 'Proposes an open platform for autonomous software agents executing inside sandboxed container runtimes.',
  },
  {
    id: 4,
    category: 'multiagent',
    domain: 'Multi-Agent Systems',
    title: 'MetaGPT: Meta Programming for A Multi-Agent Collaborative Framework',
    authors: 'Sirui Hong et al. (NeurIPS / arXiv)',
    citation: 'arXiv:2308.00352',
    url: 'https://arxiv.org/abs/2308.00352',
    desc: 'Encodes Standard Operating Procedures (SOPs) into multi-agent prompt flows to generate structured code outputs.',
  },
  {
    id: 5,
    category: 'multiagent',
    domain: 'Communicative Agents',
    title: 'ChatDev: Communicative Agents for Software Development',
    authors: 'Chen Qian et al. (arXiv)',
    citation: 'arXiv:2307.07924',
    url: 'https://arxiv.org/abs/2307.07924',
    desc: 'Demonstrates multi-agent chat chains for collaborative software design, coding, and automated debugging.',
  },
  {
    id: 6,
    category: 'agent',
    domain: 'Agent Runtimes',
    title: 'SWE-World: Docker-Free Execution Environments for Agent Evaluation',
    authors: 'Yuxiang Wei et al. (arXiv)',
    citation: 'arXiv:2602.03419',
    url: 'https://arxiv.org/pdf/2602.03419',
    desc: 'Develops surrogate execution feedback models to eliminate container instantiation overhead during evaluation loops.',
  },
  {
    id: 7,
    category: 'agent',
    domain: 'Issue Resolution',
    title: 'SWE-Adept: Agentic Traversal and Structured Resolution for Repository Issues',
    authors: 'Anonymous Authors (arXiv)',
    citation: 'arXiv:2603.01327',
    url: 'https://arxiv.org/html/2603.01327v1',
    desc: 'Proposes depth-first dependency traversal and shared memory checkpoints for precise issue localization.',
  },
  {
    id: 8,
    category: 'agent',
    domain: 'Trajectory Distillation',
    title: 'Open-SWE-Traces: Advancing Dual-Mode Distillation for Software Agents',
    authors: 'Wasi Uddin Ahmad et al. (arXiv)',
    citation: 'arXiv:2606.16038',
    url: 'https://arxiv.org/abs/2606.16038',
    desc: 'Releases expansive multi-language agentic trajectory datasets for fine-tuning long-horizon software reasoning.',
  },
  {
    id: 9,
    category: 'agent',
    domain: 'Software Evolution',
    title: 'SWE-EVO: Benchmarking Autonomous Software Evolution',
    authors: 'Anonymous Authors (arXiv)',
    citation: 'arXiv:2512.18470',
    url: 'https://arxiv.org/html/2512.18470v6',
    desc: 'Evaluates multi-step release-sized software modifications across large versioned Python codebases.',
  },
  {
    id: 10,
    category: 'agent',
    domain: 'Code Auditing',
    title: 'RepoAudit: Autonomous LLM-Agent for Repository-Level Code Auditing',
    authors: 'Anonymous Authors (ICML)',
    citation: 'arXiv:2508.17343',
    url: 'https://arxiv.org/html/2508.17343v3',
    desc: 'Explores autonomous code auditing, static analysis, and bug detection in large repository structures.',
  },
  {
    id: 11,
    category: 'cloud',
    domain: 'Cloud Architecture',
    title: 'Microservices-Based Scalable Architectures for AI-Driven Systems in Cloud',
    authors: 'Researchgate Publication',
    citation: 'ResearchGate-404321670',
    url: 'https://www.researchgate.net/publication/404321670_Microservices-Based_Scalable_Architectures_for_AI-_Driven_NLP_Systems_in_the_Cloud',
    desc: 'Establishes design patterns for decoupling AI inference services using microservices and Redis caching.',
  },
  {
    id: 12,
    category: 'cloud',
    domain: 'Mobile Cloud',
    title: 'Lightweight Mobile Cloud Computing Environment for Mobile Applications',
    authors: 'Sarvesh Rai et al. (ResearchGate)',
    citation: 'ResearchGate-339723782',
    url: 'https://www.researchgate.net/publication/339723782_LIGHT_WEIGHT_MOBILE_CLOUD_COMPUTING_ENVIRONMENT_FOR_MOBILE_APPLICATIONS',
    desc: 'Investigates resource offloading frameworks from mobile terminals to cloud-assisted backend gateways.',
  },
  {
    id: 13,
    category: 'cloud',
    domain: 'Cloud Scheduling',
    title: 'Workflow Management and Scheduling in a Cloud Computing Context',
    authors: 'Zacharie Brodard (KTH / DiVA)',
    citation: 'DiVA-2:1305761',
    url: 'https://www.diva-portal.org/smash/get/diva2:1305761/FULLTEXT01.pdf',
    desc: 'Evaluates asynchronous message queues and elastic computing for workflow scheduling and batch processing.',
  },
  {
    id: 14,
    category: 'cloud',
    domain: 'Real-Time Protocols',
    title: 'Real-Time Collaboration Architecture via WebSocket Protocols',
    authors: 'IJERT Publication',
    citation: 'IJERT-Whiteboard',
    url: 'https://www.ijert.org/real-time-collaboration-whiteboard',
    desc: 'Details persistent, low-latency WebSocket connection handling for real-time bidirectional data exchange.',
  },
  {
    id: 15,
    category: 'cloud',
    domain: 'Async Messaging',
    title: 'Microservices Best Practices and Asynchronous Communication',
    authors: 'Microservice Study Group (arXiv)',
    citation: 'arXiv:2212.11758',
    url: 'https://arxiv.org/pdf/2212.11758',
    desc: 'Compares synchronous HTTP REST vs. asynchronous message queue protocols in distributed cloud gateways.',
  },
]

interface EditorialStep {
  number: string
  title: string
  subtitle: string
  desc: string
  pill1: string
  pill2: string
  img: string
}

const editorialStepsData: Record<number, EditorialStep> = {
  1: {
    number: '01',
    title: 'Mobile Prompt Capture & Intent Parsing',
    subtitle: 'Client Interaction Layer',
    desc: 'The developer submits a high-level intent prompt from any mobile browser. The request is structured into a normalized JSON payload containing repository target, branch name, prompt directives, and authorization signatures without triggering local compilation.',
    pill1: 'Mobile Web UI',
    pill2: 'HTTPS Post',
    img: '/images/step_01_intent.png',
  },
  2: {
    number: '02',
    title: 'Clerk PKCE OAuth & Scope Verification',
    subtitle: 'Security & Authentication',
    desc: 'The API Gateway validates JWT credentials and tenant permissions via Clerk PKCE authentication. It verifies repository write access and limits execution scope before allowing job creation.',
    pill1: 'Clerk OAuth',
    pill2: 'JWT Bearer',
    img: '/images/step_02_auth_1785155114214.png',
  },
  3: {
    number: '03',
    title: 'Asynchronous Redis Job Persistence',
    subtitle: 'Gateway Queue Manager',
    desc: 'Upon authentication, the request is written to a persistent Redis task queue. The gateway responds with a unique task ID, allowing the smartphone browser to disconnect safely while execution proceeds asynchronously.',
    pill1: 'Redis Engine',
    pill2: 'Job Queue',
    img: '/images/step_03_queue_1785155128176.png',
  },
  4: {
    number: '04',
    title: 'LLM Agentic Planning & Context Analysis',
    subtitle: 'AI Execution Plane',
    desc: 'A background cloud worker claims the queued task and invokes the LLM agent (e.g., SWE-agent/OpenHands). The agent parses the target codebase, builds a dependency graph, and formulates a step-by-step modification plan.',
    pill1: 'LLM Agent',
    pill2: 'AST Parser',
    img: '/images/step_04_agent_1785155142042.png',
  },
  5: {
    number: '05',
    title: 'Isolated Git Sandbox Workspace Modification',
    subtitle: 'Code Execution Environment',
    desc: 'The agent clones the repository into an isolated Docker container, creates a dedicated feature branch, and applies repository-level code edits to source files, dependencies, and configurations.',
    pill1: 'Docker Sandbox',
    pill2: 'Git Workspace',
    img: '/images/step_05_sandbox.png',
  },
  6: {
    number: '06',
    title: 'Automated Local Build & Verification Checks',
    subtitle: 'Quality Assurance Layer',
    desc: 'Before committing changes, the execution plane runs local build tools, static linters, and unit test suites inside the sandbox container to guarantee code correctness and prevent syntax regression.',
    pill1: 'NPM / Cargo',
    pill2: 'Unit Tests',
    img: '/images/step_06_verify_1785155154288.png',
  },
  7: {
    number: '07',
    title: 'Git Commit & Remote Branch Push',
    subtitle: 'Version Control Integration',
    desc: 'Once verification passes, the executor creates a signed Git commit with detailed change summaries and pushes the new branch directly to the upstream remote repository (GitHub/GitLab).',
    pill1: 'Git Push',
    pill2: 'SSH Signature',
    img: '/images/step_07_push_1785155183114.png',
  },
  8: {
    number: '08',
    title: 'CI/CD Webhook & Cloud Deployment Trigger',
    subtitle: 'Deployment Automation',
    desc: 'The remote push fires automated webhooks into the CI/CD pipeline (Vercel/GitHub Actions), building preview deployments and generating live preview URLs for instant verification.',
    pill1: 'Vercel Webhook',
    pill2: 'Preview Build',
    img: '/images/step_08_deploy_1785155199567.png',
  },
  9: {
    number: '09',
    title: 'WhatsApp Cloud Alert & Real-time Mobile Notification',
    subtitle: 'Notification Dispatcher',
    desc: "The gateway dispatches a push alert and WhatsApp message to the developer's mobile device containing task completion status, summary diffs, and live deployment links.",
    pill1: 'WhatsApp API',
    pill2: 'Mobile Alert',
    img: '/images/step_09_notify_1785155213353.png',
  },
}

const scenarioOutputs: Record<number, React.ReactNode> = {
  1: (
    <>
      <div><span className="text-gray-500">15:42:01</span> Request received</div>
      <div><span className="text-gray-500">15:42:01</span> Repository access verified</div>
      <div><span className="text-emerald-400">✓</span> Task created: TASK-4821</div>
      <div><span className="text-blue-400 font-bold">STATUS</span> QUEUED</div>
    </>
  ),
  2: (
    <>
      <div><span className="text-gray-500">15:42:02</span> Persisting task state...</div>
      <div><span className="text-gray-500">15:42:02</span> Adding TASK-4821 to execution queue</div>
      <div><span className="text-emerald-400">✓</span> Job safely queued</div>
      <div><span className="text-blue-400 font-bold">CLIENT</span> May disconnect safely</div>
    </>
  ),
  3: (
    <>
      <div><span className="text-gray-500">15:42:04</span> Worker claimed TASK-4821</div>
      <div>$ git clone repository</div>
      <div>$ git checkout -b agent/task-4821</div>
      <div><span className="text-purple-400 font-bold">AGENT</span> Analyzing project architecture...</div>
      <div><span className="text-purple-400 font-bold">AGENT</span> Implementing dashboard...</div>
    </>
  ),
  4: (
    <>
      <div>$ npm run build</div>
      <div><span className="text-gray-500">15:44:21</span> Running validation...</div>
      <div><span className="text-emerald-400">✓</span> Build successful</div>
      <div><span className="text-emerald-400">✓</span> Validation checks passed</div>
    </>
  ),
  5: (
    <>
      <div>$ git commit -m &quot;feat: add admin analytics dashboard&quot;</div>
      <div>$ git push origin agent/task-4821</div>
      <div><span className="text-blue-400 font-bold">CI/CD</span> Deployment pipeline triggered</div>
      <div><span className="text-emerald-400">✓</span> Deployment completed</div>
    </>
  ),
  6: (
    <>
      <div><span className="text-gray-500">15:46:10</span> Task state updated</div>
      <div><span className="text-emerald-400 font-bold">STATUS</span> COMPLETED</div>
      <div><span className="text-blue-400 font-bold">NOTIFY</span> Mobile notification dispatched</div>
      <div><span className="text-emerald-400">✓</span> TASK-4821 complete</div>
    </>
  ),
}

export function Landing() {
  const { signInWithGitHub } = useGitHubAuth()

  // Navigation scroll spy & progress
  const [scrollProgress, setScrollProgress] = useState(0)
  const [activeNav, setActiveNav] = useState('overview')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Architecture Explorer Layer
  const [selectedArch, setSelectedArch] = useState<'mobile' | 'gateway' | 'daemon'>('mobile')

  // Editorial Steps Carousel
  const [currentStep, setCurrentStep] = useState(1)
  const [slideDir, setSlideDir] = useState<'left' | 'right'>('right')
  const [isHoveringEditorial, setIsHoveringEditorial] = useState(false)

  // Lightbox Modal
  const [lightboxImg, setLightboxImg] = useState<string | null>(null)

  // Scenario Step
  const [currentScenario, setCurrentScenario] = useState(1)
  const [isHoveringScenario, setIsHoveringScenario] = useState(false)

  // Research Filter
  const [researchCategory, setResearchCategory] = useState<'all' | 'agent' | 'multiagent' | 'cloud'>('all')

  const navBarRef = useRef<HTMLDivElement | null>(null)

  const scrollTo = (id: string) => {
    setMobileMenuOpen(false)
    const el = document.getElementById(id)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  // Scroll Progress and Section Observer
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY
      const docHeight = document.documentElement.scrollHeight - window.innerHeight
      setScrollProgress(docHeight > 0 ? (scrollTop / docHeight) * 100 : 0)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    const sections = ['problem', 'architecture', 'workflow', 'research', 'roadmap']
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveNav(entry.target.id)
          }
        })
      },
      { rootMargin: '-30% 0px -50% 0px' }
    )

    sections.forEach((id) => {
      const el = document.getElementById(id)
      if (el) observer.observe(el)
    })

    return () => observer.disconnect()
  }, [])

  // Auto-slide Editorial Steps
  useEffect(() => {
    if (isHoveringEditorial || lightboxImg) return
    const timer = setInterval(() => {
      setSlideDir('right')
      setCurrentStep((prev) => (prev >= 9 ? 1 : prev + 1))
    }, 4000)
    return () => clearInterval(timer)
  }, [isHoveringEditorial, lightboxImg])

  // Auto-step Scenario
  useEffect(() => {
    if (isHoveringScenario) return
    const timer = setInterval(() => {
      setCurrentScenario((prev) => (prev >= 6 ? 1 : prev + 1))
    }, 3500)
    return () => clearInterval(timer)
  }, [isHoveringScenario])

  const nextEditorial = () => {
    setSlideDir('right')
    setCurrentStep((prev) => (prev >= 9 ? 1 : prev + 1))
  }

  const prevEditorial = () => {
    setSlideDir('left')
    setCurrentStep((prev) => (prev <= 1 ? 9 : prev - 1))
  }

  const filteredResearch = researchPapers.filter(
    (p) => researchCategory === 'all' || p.category === researchCategory
  )

  const domainThemes = {
    agent: {
      border: 'border-emerald-200/80 hover:border-emerald-400',
      bg: 'bg-emerald-50',
      badge: 'bg-emerald-100 text-emerald-800',
      accent: 'text-emerald-700',
      btn: 'bg-emerald-600 hover:bg-emerald-700 text-white',
    },
    multiagent: {
      border: 'border-purple-200/80 hover:border-purple-400',
      bg: 'bg-purple-50',
      badge: 'bg-purple-100 text-purple-800',
      accent: 'text-purple-700',
      btn: 'bg-purple-600 hover:bg-purple-700 text-white',
    },
    cloud: {
      border: 'border-blue-200/80 hover:border-blue-400',
      bg: 'bg-blue-50',
      badge: 'bg-blue-100 text-blue-800',
      accent: 'text-blue-700',
      btn: 'bg-blue-600 hover:bg-blue-700 text-white',
    },
  }

  const step = editorialStepsData[currentStep]

  return (
    <div className="min-h-screen bg-[#f5f5f7] text-[#1d1d1f] antialiased selection:bg-blue-500/20 font-sans">
      {/* Scroll Progress Bar */}
      <div
        className="fixed left-0 top-0 h-[3px] z-[9999] bg-gradient-to-r from-[#0071e3] to-[#00a896] transition-all duration-150 ease-out"
        style={{ width: `${scrollProgress}%` }}
      />

      {/* Floating Pill Navbar */}
      <nav className="fixed top-4 sm:top-5 left-0 right-0 z-50 px-4">
        <div className="max-w-5xl mx-auto h-14 rounded-full bg-white/95 backdrop-blur-2xl border border-white/80 shadow-[0_12px_40px_rgba(0,0,0,0.08)] px-3 flex items-center justify-between">
          {/* Brand Logo */}
          <button
            onClick={() => scrollTo('overview')}
            className="flex items-center gap-2.5 pl-1 pr-3 py-1 rounded-full hover:bg-gray-100/80 transition-all duration-300 group"
          >
            <div className="w-10 h-10 rounded-full bg-black text-white flex items-center justify-center shadow-md group-hover:scale-105 transition-transform p-2 shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/logo.svg" className="w-full h-full object-contain" alt="WayCode Logo" />
            </div>
            <span className="font-extrabold text-base tracking-tight text-gray-950">WayCode</span>
          </button>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center gap-1.5">
            {[
              { id: 'problem', label: 'Problem' },
              { id: 'architecture', label: 'Architecture' },
              { id: 'workflow', label: 'Workflow' },
              { id: 'research', label: 'Research' },
              { id: 'roadmap', label: 'Roadmap' },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => scrollTo(item.id)}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all duration-300 ${
                  activeNav === item.id
                    ? 'bg-[#1d1d1f] text-white shadow-md font-bold'
                    : 'text-gray-500 hover:text-black hover:bg-gray-100/80'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Right Action / Auth Button */}
          <div className="flex items-center gap-2">
            <button
              onClick={signInWithGitHub}
              className="px-4 py-2 rounded-full bg-black text-white text-xs font-bold hover:bg-gray-800 transition-all shadow-sm flex items-center gap-1.5"
            >
              <GithubIcon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Connect</span>
            </button>

            {/* Mobile Hamburger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden w-10 h-10 rounded-full bg-gray-100/80 hover:bg-gray-200 text-gray-900 flex items-center justify-center transition-colors"
              aria-label="Toggle menu"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden max-w-5xl mx-auto mt-2 p-4 rounded-3xl bg-white/95 backdrop-blur-2xl border border-gray-100 shadow-2xl space-y-1.5 text-center">
            {['problem', 'architecture', 'workflow', 'research', 'roadmap'].map((sec) => (
              <button
                key={sec}
                className="w-full py-2.5 rounded-2xl text-sm font-bold text-gray-800 hover:bg-gray-100/80 capitalize transition"
                onClick={() => scrollTo(sec)}
              >
                {sec}
              </button>
            ))}
          </div>
        )}
      </nav>

      <main className="w-full">
        {/* HERO SECTION */}
        <section
          id="overview"
          className="relative min-h-[92vh] pt-32 pb-20 px-4 sm:px-6 lg:px-10 flex items-center overflow-hidden border-b border-black/[0.06]"
          style={{
            backgroundImage: "url('/images/hero-bg.png')",
            backgroundSize: 'cover',
            backgroundPosition: 'center right',
            backgroundRepeat: 'no-repeat',
          }}
        >
          {/* Ambient Glow Orbs */}
          <div className="absolute w-[500px] h-[500px] rounded-full bg-blue-500/10 blur-[100px] -left-40 top-40 pointer-events-none" />
          <div className="absolute w-[500px] h-[500px] rounded-full bg-teal-500/10 blur-[100px] -right-40 top-20 pointer-events-none" />

          <div className="max-w-7xl mx-auto w-full relative z-10">
            <div className="grid lg:grid-cols-12 gap-10 items-center">
              {/* Left Column */}
              <div className="lg:col-span-7">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50/90 backdrop-blur-md border border-blue-100 text-blue-600 text-xs font-bold mb-6">
                  <span>Autonomous AI Software Engineering Agents</span>
                  <span>·</span>
                  <span className="font-mono">v2.4</span>
                </div>

                <h1 className="text-4xl sm:text-7xl lg:text-8xl font-black tracking-tighter text-gray-950 leading-[0.95]">
                  Build from<br />
                  <span className="text-[#0071e3]">anywhere.</span>
                </h1>

                <p className="text-gray-600 text-base md:text-xl font-medium mt-6 max-w-xl leading-relaxed">
                  An asynchronous mobile gateway that converts developer intent into production repository-level code commits using persistent cloud AI agents.
                </p>

                <div className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 md:gap-4">
                  <button
                    onClick={() => scrollTo('architecture')}
                    className="px-7 py-3.5 rounded-full bg-black text-white font-bold text-sm hover:bg-gray-800 transition shadow-xl shadow-black/10 flex items-center justify-center gap-2"
                  >
                    <span>Explore Architecture</span>
                    <span>↓</span>
                  </button>
                  <button
                    onClick={() => scrollTo('workflow')}
                    className="px-7 py-3.5 rounded-full bg-white/90 backdrop-blur-md border border-gray-300 font-bold text-sm text-gray-800 hover:bg-white transition shadow-sm flex items-center justify-center gap-2"
                  >
                    <span>See How It Works</span>
                    <span>→</span>
                  </button>
                </div>

                <div className="mt-10 pt-6 border-t border-gray-200/80 flex flex-wrap items-center gap-6 text-xs font-semibold text-gray-500">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Connection Independent</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                    <span>Redis Queue</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                    <span>Docker Sandbox</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Hero Flow Visual Card */}
            <div className="mt-16 relative p-6 md:p-12 rounded-[40px] bg-white/90 backdrop-blur-xl border border-blue-100 shadow-[0_30px_80px_-20px_rgba(0,113,227,0.15)]">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-5 items-center">
                {/* Node 1 */}
                <div className="p-7 rounded-3xl bg-white border border-blue-100 shadow-sm flex flex-col justify-between min-h-[150px] hover:-translate-y-1 transition duration-300">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 font-extrabold text-xs flex items-center justify-center">
                    01
                  </div>
                  <div className="mt-4">
                    <div className="font-bold text-gray-950 text-base">Mobile Control</div>
                    <div className="text-xs text-gray-500 mt-0.5">Intent Generation & Approvals</div>
                  </div>
                </div>

                {/* Arrow 1 */}
                <div className="hidden md:flex items-center justify-center">
                  <div className="w-full h-0.5 bg-gradient-to-r from-blue-500 to-teal-400 relative">
                    <div className="w-2 h-2 rounded-full bg-blue-600 absolute -top-[3px] left-1/2 -translate-x-1/2 animate-ping" />
                  </div>
                </div>

                {/* Node 2 */}
                <div className="p-7 rounded-3xl bg-white border border-blue-100 shadow-sm flex flex-col justify-between min-h-[150px] hover:-translate-y-1 transition duration-300">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 font-extrabold text-xs flex items-center justify-center">
                      02
                    </div>
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_#10b981]" />
                  </div>
                  <div className="mt-4">
                    <div className="font-bold text-gray-950 text-base">Async Gateway</div>
                    <div className="text-xs text-gray-500 mt-0.5">Redis Queue & Job State</div>
                  </div>
                </div>

                {/* Arrow 2 */}
                <div className="hidden md:flex items-center justify-center">
                  <div className="w-full h-0.5 bg-gradient-to-r from-blue-500 to-teal-400 relative">
                    <div className="w-2 h-2 rounded-full bg-blue-600 absolute -top-[3px] left-1/2 -translate-x-1/2 animate-ping" />
                  </div>
                </div>

                {/* Node 3 */}
                <div className="p-7 rounded-3xl bg-white border border-blue-100 shadow-sm flex flex-col justify-between min-h-[150px] hover:-translate-y-1 transition duration-300">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 font-extrabold text-xs flex items-center justify-center">
                      03
                    </div>
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_#10b981]" />
                  </div>
                  <div className="mt-4">
                    <div className="font-bold text-gray-950 text-base">AI Runtime</div>
                    <div className="text-xs text-gray-500 mt-0.5">Sandbox Execute & Push</div>
                  </div>
                </div>
              </div>

              {/* Bottom Flow Chips */}
              <div className="mt-8 pt-6 border-t border-gray-100 flex flex-wrap items-center justify-center gap-3 text-xs font-semibold text-gray-500">
                <span className="px-4 py-2 bg-[#f5f5f7] rounded-full border border-gray-200/60 shadow-sm">Git Repository</span>
                <span className="text-gray-300">→</span>
                <span className="px-4 py-2 bg-[#f5f5f7] rounded-full border border-gray-200/60 shadow-sm">CI/CD Pipeline</span>
                <span className="text-gray-300">→</span>
                <span className="px-4 py-2 bg-[#f5f5f7] rounded-full border border-gray-200/60 shadow-sm">Deployment</span>
                <span className="text-gray-300">→</span>
                <span className="px-4 py-2 bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100 font-bold">
                  Mobile Notification
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* THE PROBLEM SECTION */}
        <section id="problem" className="py-28 px-4 sm:px-6 lg:px-10">
          <div className="max-w-7xl mx-auto">
            <div className="text-center max-w-3xl mx-auto">
              <div className="text-xs font-bold uppercase tracking-[0.16em] text-[#0071e3] mb-4">The Problem</div>
              <h2 className="text-4xl sm:text-6xl font-black tracking-tight text-gray-950 leading-[1.05]">
                AI coding agents are powerful.
                <span className="block text-gray-400 font-normal">Their interfaces are still desktop-first.</span>
              </h2>
            </div>

            <div className="grid md:grid-cols-3 gap-7 mt-16">
              {[
                {
                  num: '01',
                  title: 'Desktop Dependency',
                  desc: 'Most agentic development workflows assume a persistent desktop, terminal, IDE, and local development environment.',
                },
                {
                  num: '02',
                  title: 'Mobile Constraints',
                  desc: 'Traditional IDEs become difficult to operate on small, touch-based mobile interfaces.',
                },
                {
                  num: '03',
                  title: 'Network Instability',
                  desc: 'Remote desktop and continuous browser sessions degrade when mobile connectivity becomes unstable.',
                },
              ].map((card) => (
                <div
                  key={card.num}
                  className="p-8 sm:p-10 rounded-[32px] bg-white border border-black/[0.06] shadow-[0_18px_50px_rgba(0,0,0,0.045)] hover:-translate-y-1.5 transition duration-300 flex flex-col justify-between min-h-[280px]"
                >
                  <div className="text-xs font-bold text-gray-400 tracking-wider">{card.num}</div>
                  <div>
                    <h3 className="text-2xl font-bold tracking-tight text-gray-900 mb-3">{card.title}</h3>
                    <p className="text-sm text-gray-500 leading-relaxed font-medium">{card.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="text-center mt-28">
              <p className="text-xl text-gray-400 mb-3 font-medium">The core limitation isn&apos;t compute.</p>
              <h3 className="text-5xl sm:text-7xl font-black tracking-tight text-gray-950">
                It&apos;s <span className="text-[#0071e3]">access.</span>
              </h3>
            </div>
          </div>
        </section>

        {/* RESEARCH GAP (Dark Duality Section) */}
        <section className="py-14 px-4 sm:px-6 lg:px-10">
          <div className="max-w-7xl mx-auto rounded-[46px] bg-[#0b0b0f] p-8 sm:p-14 lg:p-20 text-white relative overflow-hidden shadow-2xl border border-white/10">
            <div className="relative z-10">
              <div className="text-center max-w-3xl mx-auto">
                <div className="text-xs font-bold uppercase tracking-[0.18em] text-[#2997ff] mb-4">Research Gap</div>
                <h2 className="text-3xl sm:text-5xl font-black tracking-tight">The Resource Interface Duality</h2>
                <p className="text-gray-400 mt-4 text-base sm:text-lg">
                  The best device for interacting with an AI agent is not necessarily the best device for executing its work.
                </p>
              </div>

              <div className="grid md:grid-cols-[1fr_auto_1fr] gap-8 mt-16 items-center">
                {/* Mobile Device */}
                <div className="p-8 sm:p-10 rounded-3xl bg-white/[0.06] border border-white/10 shadow-inner">
                  <div className="text-xs text-gray-400 font-bold uppercase tracking-widest">Interface Plane</div>
                  <h3 className="text-2xl sm:text-3xl font-bold mt-2 text-white">Mobile Device</h3>
                  <div className="mt-6 space-y-3.5 text-sm font-medium">
                    <div className="flex justify-between"><span className="text-gray-400">Intent generation</span><span className="text-emerald-400 font-bold">Excellent</span></div>
                    <div className="flex justify-between"><span className="text-gray-400">Approvals</span><span className="text-emerald-400 font-bold">Excellent</span></div>
                    <div className="flex justify-between"><span className="text-gray-400">Monitoring</span><span className="text-emerald-400 font-bold">Excellent</span></div>
                    <div className="flex justify-between"><span className="text-gray-400">Large IDE workloads</span><span className="text-red-400 font-bold">Limited</span></div>
                  </div>
                </div>

                {/* Duality Divider */}
                <div className="hidden md:block w-px h-52 bg-gradient-to-b from-transparent via-[#2997ff] to-transparent" />

                {/* Cloud Runtime */}
                <div className="p-8 sm:p-10 rounded-3xl bg-white/[0.06] border border-white/10 shadow-inner">
                  <div className="text-xs text-gray-400 font-bold uppercase tracking-widest">Execution Plane</div>
                  <h3 className="text-2xl sm:text-3xl font-bold mt-2 text-white">Cloud Runtime</h3>
                  <div className="mt-6 space-y-3.5 text-sm font-medium">
                    <div className="flex justify-between"><span className="text-gray-400">Repository operations</span><span className="text-emerald-400 font-bold">Excellent</span></div>
                    <div className="flex justify-between"><span className="text-gray-400">AI agents</span><span className="text-emerald-400 font-bold">Excellent</span></div>
                    <div className="flex justify-between"><span className="text-gray-400">Build & testing</span><span className="text-emerald-400 font-bold">Excellent</span></div>
                    <div className="flex justify-between"><span className="text-gray-400">Direct interaction</span><span className="text-amber-400 font-bold">Indirect</span></div>
                  </div>
                </div>
              </div>

              <div className="mt-14 text-center">
                <div className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2">Proposed principle</div>
                <div className="text-2xl sm:text-4xl font-extrabold tracking-tight">
                  Separate <span className="text-[#2997ff]">intent</span> from <span className="text-[#bf5af2]">execution.</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* PROPOSED SOLUTION (Bento Grid) */}
        <section className="py-24 px-4 sm:px-6 lg:px-10">
          <div className="max-w-7xl mx-auto">
            <div className="max-w-3xl">
              <div className="text-xs font-bold uppercase tracking-[0.16em] text-[#0071e3] mb-4">Proposed Solution</div>
              <h2 className="text-4xl sm:text-5xl font-black tracking-tight text-gray-950">
                One gateway. <span className="text-gray-400 font-normal">Four core responsibilities.</span>
              </h2>
            </div>

            <div className="grid grid-cols-12 gap-7 mt-14">
              {/* Card 1: Asynchronous Execution */}
              <div className="col-span-12 lg:col-span-7 p-8 md:p-11 rounded-[36px] bg-white border border-blue-100 shadow-[0_16px_40px_-10px_rgba(0,113,227,0.08)] hover:-translate-y-1 transition duration-300">
                <div className="text-xs font-bold uppercase tracking-wider text-blue-600">Core Capability</div>
                <h3 className="text-3xl sm:text-4xl font-black tracking-tight mt-3 text-gray-950">Asynchronous Execution</h3>
                <p className="text-gray-500 text-sm md:text-base mt-3 leading-relaxed font-medium">
                  Requests become persistent Redis jobs. The mobile browser does not need to remain connected while an AI agent works autonomously on the cloud host.
                </p>

                <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: '01 · REQUEST', dot: 'bg-blue-500' },
                    { label: '02 · QUEUE', dot: 'bg-teal-500' },
                    { label: '03 · EXECUTE', dot: 'bg-indigo-500' },
                    { label: '04 · REPORT', dot: 'bg-emerald-500' },
                  ].map((q) => (
                    <div key={q.label} className="p-3.5 rounded-xl bg-gray-50 border border-gray-100 text-[11px] font-bold flex items-center justify-between">
                      <span>{q.label}</span>
                      <span className={`w-2 h-2 rounded-full ${q.dot}`} />
                    </div>
                  ))}
                </div>

                <div className="mt-6 p-4 rounded-2xl bg-white border border-blue-100 shadow-sm flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 font-mono font-bold text-xs flex items-center justify-center">RUN</div>
                    <div>
                      <div className="text-[10px] font-mono text-gray-400 font-bold">TASK-JOB-8942</div>
                      <div className="font-bold text-gray-900 text-xs sm:text-sm">Admin Analytics Dashboard Hotfix</div>
                    </div>
                  </div>
                  <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-3 py-1 rounded-full flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    ACTIVE WORKER
                  </span>
                </div>
              </div>

              {/* Card 2: Persistent AI Runtime */}
              <div className="col-span-12 lg:col-span-5 p-8 md:p-11 rounded-[36px] bg-white border border-blue-100 shadow-[0_16px_40px_-10px_rgba(0,113,227,0.08)] hover:-translate-y-1 transition duration-300 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-bold uppercase tracking-wider text-blue-600">Runtime</div>
                    <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> ONLINE
                    </span>
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-black tracking-tight mt-4 text-gray-950">Persistent AI Runtime</h3>
                  <p className="text-gray-500 mt-3 text-sm leading-relaxed font-medium">
                    The cloud executor remains available 24/7 independently of the developer&apos;s workstation or smartphone connection.
                  </p>
                </div>
                <div className="mt-8 pt-6 border-t border-gray-100 flex items-baseline justify-between">
                  <div className="text-6xl font-black tracking-tight text-gray-950">24<span className="text-blue-600 text-2xl font-bold">/7</span></div>
                  <div className="text-xs text-right font-medium">
                    <div className="text-gray-400">PM2 Background Daemon</div>
                    <div className="text-emerald-600 font-bold mt-0.5">Uptime 99.9%</div>
                  </div>
                </div>
              </div>

              {/* Card 3: Repository Native */}
              <div className="col-span-12 sm:col-span-6 p-8 md:p-10 rounded-[36px] bg-white border border-blue-100 shadow-[0_16px_40px_-10px_rgba(0,113,227,0.08)] hover:-translate-y-1 transition duration-300">
                <div className="text-xs font-bold uppercase tracking-wider text-blue-600">Repository Native</div>
                <h3 className="text-2xl sm:text-3xl font-black tracking-tight mt-3 text-gray-950">Work directly with Git.</h3>
                <p className="text-gray-500 mt-2 text-sm font-medium">Native version control workflow without exposing local uncommitted state.</p>
                <div className="mt-6 flex flex-wrap gap-2">
                  {['Git Clone', 'Checkout Branch', 'LLM Code Edit', 'Local Build', 'Test Check', 'Git Push'].map((p, idx) => (
                    <span
                      key={p}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-mono font-semibold ${
                        idx === 5
                          ? 'bg-emerald-50 text-emerald-600 border border-emerald-100 font-bold'
                          : 'bg-gray-100 text-gray-700 border border-gray-200/60'
                      }`}
                    >
                      {p}
                    </span>
                  ))}
                </div>
              </div>

              {/* Card 4: Mobile First */}
              <div className="col-span-12 sm:col-span-6 p-8 md:p-10 rounded-[36px] bg-white border border-blue-100 shadow-[0_16px_40px_-10px_rgba(0,113,227,0.08)] hover:-translate-y-1 transition duration-300">
                <div className="text-xs font-bold uppercase tracking-wider text-blue-600">Mobile First</div>
                <h3 className="text-2xl sm:text-3xl font-black tracking-tight mt-3 text-gray-950">Control plane, zero editing.</h3>
                <p className="text-gray-500 mt-2 text-sm font-medium">High-level intent inputs optimized for touch viewports.</p>
                <div className="mt-6 grid grid-cols-2 gap-3 text-xs font-bold">
                  {[
                    { label: 'Intent Prompting', ok: true },
                    { label: 'Clerk / OAuth Login', ok: true },
                    { label: 'Live Terminal Logs', ok: true },
                    { label: 'WhatsApp Alerts', ok: true, green: true },
                  ].map((item) => (
                    <div key={item.label} className="p-3.5 bg-gray-50 border border-gray-200/70 rounded-xl flex items-center justify-between">
                      <span className="text-gray-800">{item.label}</span>
                      <span className={item.green ? 'text-emerald-600 font-black' : 'text-blue-600'}>✓</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SYSTEM ARCHITECTURE & 9-STAGE TIMELINE */}
        <section id="architecture" className="py-28 px-4 sm:px-6 lg:px-10">
          <div className="max-w-7xl mx-auto">
            <div className="text-center max-w-3xl mx-auto">
              <div className="text-xs font-bold uppercase tracking-[0.16em] text-[#0071e3] mb-4">System Architecture</div>
              <h2 className="text-4xl sm:text-5xl font-black tracking-tight text-gray-950">Three independent layers.</h2>
              <p className="text-gray-500 mt-4 text-base sm:text-lg">
                Interaction, orchestration, and execution remain logically separated.
              </p>
            </div>

            {/* Layer Tabs */}
            <div className="mt-14 p-6 sm:p-10 md:p-12 rounded-[40px] bg-white border border-black/[0.06] shadow-xl">
              <div className="grid md:grid-cols-3 gap-6">
                {[
                  {
                    key: 'mobile' as const,
                    color: 'text-blue-600',
                    badge: 'LAYER 01',
                    title: 'Mobile Control Plane',
                    tags: ['PWA', 'OAuth', 'HTTPS', 'WebSocket'],
                  },
                  {
                    key: 'gateway' as const,
                    color: 'text-purple-600',
                    badge: 'LAYER 02',
                    title: 'Async Gateway',
                    tags: ['API', 'Redis', 'Job State', 'WSS'],
                  },
                  {
                    key: 'daemon' as const,
                    color: 'text-emerald-600',
                    badge: 'LAYER 03',
                    title: 'AI Execution Plane',
                    tags: ['Agent', 'Git', 'Sandbox', 'Build Runner'],
                  },
                ].map((layer) => (
                  <button
                    key={layer.key}
                    onClick={() => setSelectedArch(layer.key)}
                    className={`text-left p-7 rounded-2xl border transition-all duration-300 ${
                      selectedArch === layer.key
                        ? 'border-blue-500/40 bg-blue-50/50 shadow-md translate-y-[-2px]'
                        : 'border-gray-200/80 bg-white hover:border-gray-300'
                    }`}
                  >
                    <div className={`text-xs font-bold ${layer.color}`}>{layer.badge}</div>
                    <h3 className="text-xl font-bold mt-2 text-gray-900">{layer.title}</h3>
                    <div className="mt-5 flex flex-wrap gap-1.5">
                      {layer.tags.map((t) => (
                        <span key={t} className="px-2.5 py-1 rounded-full bg-gray-100 text-[11px] font-semibold text-gray-600">
                          {t}
                        </span>
                      ))}
                    </div>
                  </button>
                ))}
              </div>

              {/* Dynamic Architecture Detail */}
              <div className="mt-6 p-7 rounded-2xl bg-[#f5f5f7]">
                {selectedArch === 'mobile' && (
                  <div>
                    <div className="text-xs font-bold text-blue-600 tracking-wider uppercase">MOBILE CONTROL PLANE</div>
                    <h4 className="text-xl sm:text-2xl font-bold mt-1 text-gray-950">Developer interaction without a mobile IDE.</h4>
                    <p className="text-gray-600 mt-2 text-sm leading-relaxed font-medium">
                      The mobile client focuses on repository selection, high-level prompts, approvals, task monitoring, logs, and deployment state. Heavy development operations never execute on the phone.
                    </p>
                  </div>
                )}
                {selectedArch === 'gateway' && (
                  <div>
                    <div className="text-xs font-bold text-purple-600 tracking-wider uppercase">ASYNCHRONOUS GATEWAY</div>
                    <h4 className="text-xl sm:text-2xl font-bold mt-1 text-gray-950">Persistent state between the developer and executor.</h4>
                    <p className="text-gray-600 mt-2 text-sm leading-relaxed font-medium">
                      The gateway authenticates requests, creates persistent jobs, manages task state, queues execution, streams updates, and allows the mobile client to disconnect without cancelling the underlying work.
                    </p>
                  </div>
                )}
                {selectedArch === 'daemon' && (
                  <div>
                    <div className="text-xs font-bold text-emerald-600 tracking-wider uppercase">AI EXECUTION PLANE</div>
                    <h4 className="text-xl sm:text-2xl font-bold mt-1 text-gray-950">A persistent environment that performs the actual work.</h4>
                    <p className="text-gray-600 mt-2 text-sm leading-relaxed font-medium">
                      The execution plane prepares an isolated Git workspace, invokes the configured AI agent, applies repository changes, runs validation commands, records logs, and pushes approved changes back to the repository.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* 9-STAGE EDITORIAL TIMELINE */}
            <div className="mt-28">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
                <div>
                  <div className="text-xs font-bold uppercase tracking-[0.16em] text-[#0071e3] mb-2">From Start To Finish</div>
                  <h3 className="text-3xl sm:text-5xl font-black tracking-tight text-gray-950">What actually happens?</h3>
                </div>
                <div className="text-xs font-bold text-gray-700 bg-gray-100 px-4 py-2 rounded-full border border-gray-200 w-fit flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  9-Stage Interactive Workflow
                </div>
              </div>

              {/* Editorial Container */}
              <div
                className="bg-[#efeff1] border border-black/10 rounded-[40px] overflow-hidden shadow-2xl"
                onMouseEnter={() => setIsHoveringEditorial(true)}
                onMouseLeave={() => setIsHoveringEditorial(false)}
              >
                {/* Horizontal Step Tabs */}
                <div ref={navBarRef} className="flex items-center overflow-x-auto border-b border-black/10 bg-[#f8f8f9] px-6 py-1 no-scrollbar">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => {
                    const stepTitle = [
                      '01. Intent',
                      '02. Auth',
                      '03. Queue',
                      '04. Agent',
                      '05. Sandbox',
                      '06. Verify',
                      '07. Push',
                      '08. Deploy',
                      '09. Notify',
                    ][num - 1]

                    return (
                      <button
                        key={num}
                        onClick={() => {
                          setSlideDir(num > currentStep ? 'right' : 'left')
                          setCurrentStep(num)
                        }}
                        className={`px-5 py-4 text-xs font-bold whitespace-nowrap border-b-2 transition-all duration-200 ${
                          currentStep === num
                            ? 'text-gray-950 border-gray-950'
                            : 'text-gray-500 border-transparent hover:text-gray-900'
                        }`}
                      >
                        {stepTitle}
                      </button>
                    )
                  })}
                </div>

                {/* Editorial Stage Content */}
                <div className="grid grid-cols-1 lg:grid-cols-[140px_1fr_520px] min-h-[480px]">
                  {/* Number Column */}
                  <div className="border-b lg:border-b-0 lg:border-r border-black/10 p-8 flex lg:flex-col justify-between items-center lg:items-start">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Phase Index</div>
                    <div className="text-7xl sm:text-8xl font-black tracking-tighter text-gray-950">{step.number}</div>
                    <div className="text-xs font-bold text-gray-500">Step {currentStep} of 9</div>
                  </div>

                  {/* Text Column */}
                  <div className="p-8 sm:p-12 flex flex-col justify-between">
                    <div>
                      <div className="border-t-2 border-black pt-4 max-w-xl">
                        <h4 className="text-2xl sm:text-3xl font-extrabold text-gray-950 tracking-tight">{step.title}</h4>
                        <div className="text-sm font-bold text-blue-600 mt-1">{step.subtitle}</div>
                      </div>
                      <p className="text-gray-600 text-sm sm:text-base leading-relaxed mt-6 font-medium max-w-xl">{step.desc}</p>
                    </div>

                    <div className="mt-8 pt-6 border-t border-gray-200 flex flex-wrap items-center justify-between gap-4">
                      <div className="flex items-center gap-2">
                        <span className="px-3.5 py-1.5 bg-white border border-gray-200 text-gray-700 text-xs font-mono font-semibold rounded-md shadow-sm">
                          {step.pill1}
                        </span>
                        <span className="px-3.5 py-1.5 bg-white border border-gray-200 text-gray-700 text-xs font-mono font-semibold rounded-md shadow-sm">
                          {step.pill2}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={prevEditorial}
                          className="w-10 h-10 rounded-full border border-gray-300 bg-white flex items-center justify-center font-bold text-sm hover:bg-gray-50 transition shadow-sm"
                          aria-label="Previous step"
                        >
                          ←
                        </button>
                        <button
                          onClick={nextEditorial}
                          className="w-10 h-10 rounded-full border border-black bg-black text-white flex items-center justify-center font-bold text-sm hover:bg-gray-800 transition shadow-sm"
                          aria-label="Next step"
                        >
                          →
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Image Column */}
                  <div className="hidden lg:flex border-l border-black/10 p-5 bg-[#f4f4f6] items-center justify-center">
                    <div
                      onClick={() => setLightboxImg(step.img)}
                      className="w-full h-full min-h-[420px] rounded-2xl overflow-hidden bg-white border border-black/10 shadow-lg cursor-zoom-in hover:scale-[1.015] transition duration-300 p-2 flex items-center justify-center"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={step.img} alt={step.title} className="w-full h-full object-contain rounded-xl" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* LIGHTBOX MODAL */}
        {lightboxImg && (
          <div
            onClick={() => setLightboxImg(null)}
            className="fixed inset-0 z-[99999] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-8 cursor-zoom-out"
          >
            <div className="relative max-w-5xl w-full bg-white rounded-3xl p-3 shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => setLightboxImg(null)}
                className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-black/70 text-white flex items-center justify-center font-bold text-lg hover:bg-black transition"
              >
                ✕
              </button>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={lightboxImg} alt="Enlarged Diagram View" className="w-full h-auto max-h-[85vh] object-contain rounded-2xl" />
            </div>
          </div>
        )}

        {/* COMPARISON SECTION */}
        <section className="py-24 px-4 sm:px-6 lg:px-10 bg-gray-50">
          <div className="max-w-7xl mx-auto rounded-[46px] bg-[#0b0b0f] p-8 sm:p-14 lg:p-18 text-white shadow-2xl border border-white/10">
            <div className="text-center max-w-3xl mx-auto">
              <div className="text-xs font-bold uppercase tracking-[0.18em] text-[#2997ff] mb-4">Architectural Comparison</div>
              <h2 className="text-3xl sm:text-5xl font-black tracking-tight">
                Why not just use <span className="text-gray-400 font-normal">Remote Desktop?</span>
              </h2>
            </div>

            <div className="mt-14 overflow-x-auto rounded-[32px] border border-white/10 bg-white/[0.03]">
              <div className="min-w-[760px]">
                {/* Header */}
                <div className="grid grid-cols-12 text-xs font-bold border-b border-white/10 bg-white/[0.04]">
                  <div className="col-span-4 p-5 md:p-6 text-gray-400 uppercase tracking-wider">Capability Matrix</div>
                  <div className="col-span-3 p-5 md:p-6 bg-blue-500/20 text-blue-400 border-x border-white/10 flex items-center justify-between">
                    <span>Async Gateway</span>
                    <span className="text-[9px] font-black bg-blue-500 text-white px-2 py-0.5 rounded-full">PROPOSED</span>
                  </div>
                  <div className="col-span-3 p-5 md:p-6 text-gray-300">Cloud IDE</div>
                  <div className="col-span-2 p-5 md:p-6 text-gray-500">Remote Desktop</div>
                </div>

                {/* Rows */}
                {[
                  {
                    name: 'Mobile-first interaction',
                    us: 'Native Control',
                    usTag: '✓',
                    ide: 'Partial / Heavy',
                    rd: 'Touch Weak',
                  },
                  {
                    name: 'Connection-independent execution',
                    us: 'Persistent Jobs',
                    usTag: '✓',
                    ide: 'Varies by host',
                    rd: 'Requires Stream',
                  },
                  {
                    name: 'Background long-running tasks',
                    us: 'Cloud Workers',
                    usTag: '✓',
                    ide: 'Supported',
                    rd: 'Session Locked',
                  },
                  {
                    name: 'AI-native agent orchestration',
                    us: 'Core Design',
                    usTag: '✓',
                    ide: 'Plugin Based',
                    rd: 'External Tool',
                  },
                  {
                    name: 'Repository automation & push',
                    us: 'Automated Git',
                    usTag: '✓',
                    ide: 'Available',
                    rd: 'Manual Terminal',
                  },
                ].map((row, idx) => (
                  <div key={row.name} className={`grid grid-cols-12 text-sm ${idx !== 4 ? 'border-b border-white/5' : ''}`}>
                    <div className="col-span-4 p-5 md:p-6 font-bold text-gray-200">{row.name}</div>
                    <div className="col-span-3 p-5 md:p-6 bg-blue-500/10 border-x border-white/10 font-bold text-emerald-400 flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-xs font-bold">✓</span>
                      {row.us}
                    </div>
                    <div className="col-span-3 p-5 md:p-6 text-amber-400 font-semibold flex items-center gap-2">
                      <span>~</span> {row.ide}
                    </div>
                    <div className="col-span-2 p-5 md:p-6 text-gray-500 flex items-center gap-2">
                      <span>—</span> {row.rd}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* WORKFLOW / INTERACTIVE SCENARIO */}
        <section id="workflow" className="py-28 px-4 sm:px-6 lg:px-10">
          <div className="max-w-7xl mx-auto rounded-[46px] bg-[#0b0b0f] p-8 sm:p-14 lg:p-18 text-white shadow-2xl border border-white/10">
            <div className="max-w-3xl">
              <div className="text-xs font-bold uppercase tracking-[0.18em] text-[#2997ff] mb-4">Interactive Scenario</div>
              <h2 className="text-3xl sm:text-5xl font-black tracking-tight">
                From one mobile prompt <span className="text-gray-500">to production.</span>
              </h2>
            </div>

            {/* Prompt Quote */}
            <div className="mt-10 p-7 rounded-2xl bg-white/[0.05] border border-white/10">
              <div className="text-xs text-gray-400 font-bold tracking-wider mb-2">DEVELOPER PROMPT</div>
              <p className="text-lg sm:text-2xl font-semibold text-gray-100">
                “Add an analytics dashboard to the admin panel using Tailwind and the project&apos;s existing data hooks.”
              </p>
            </div>

            {/* Step Tabs */}
            <div
              className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-8"
              onMouseEnter={() => setIsHoveringScenario(true)}
              onMouseLeave={() => setIsHoveringScenario(false)}
            >
              {[
                { step: 1, num: '01', label: 'Submit' },
                { step: 2, num: '02', label: 'Queue' },
                { step: 3, num: '03', label: 'Execute' },
                { step: 4, num: '04', label: 'Verify' },
                { step: 5, num: '05', label: 'Deploy' },
                { step: 6, num: '06', label: 'Notify' },
              ].map((s) => (
                <button
                  key={s.step}
                  onClick={() => setCurrentScenario(s.step)}
                  className={`p-4 rounded-xl text-left border transition-all duration-200 ${
                    currentScenario === s.step
                      ? 'bg-white/10 border-blue-400/50 shadow-md'
                      : 'bg-white/[0.04] border-white/5 hover:bg-white/[0.08]'
                  }`}
                >
                  <div className="text-[10px] text-gray-500 font-mono">{s.num}</div>
                  <div className="font-bold text-sm mt-1">{s.label}</div>
                </button>
              ))}
            </div>

            {/* Terminal Log Output */}
            <div className="mt-8 rounded-2xl bg-[#111114] border border-white/10 overflow-hidden font-mono text-xs sm:text-sm">
              <div className="h-10 bg-white/[0.04] flex items-center px-4 gap-2 border-b border-white/5">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                <span className="text-gray-500 text-[11px] ml-2">gateway.log</span>
              </div>
              <div className="p-6 sm:p-8 leading-relaxed space-y-2 text-gray-300 min-h-[170px]">
                {scenarioOutputs[currentScenario]}
              </div>
            </div>
          </div>
        </section>

        {/* FAULT TOLERANCE SECTION */}
        <section className="py-20 px-4 sm:px-6 lg:px-10 bg-gray-50">
          <div className="max-w-7xl mx-auto rounded-[46px] bg-[#0b0b0f] p-8 sm:p-14 lg:p-18 text-white shadow-2xl border border-white/10">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <div className="text-xs font-bold uppercase tracking-[0.18em] text-[#2997ff] mb-4">Fault Tolerance</div>
                <h2 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
                  What happens when <span className="text-gray-400 block">the phone disconnects?</span>
                </h2>
                <p className="text-gray-300 text-sm sm:text-base leading-relaxed mt-5 font-medium">
                  Nothing happens to the execution job. The phone acts as a control interface, not the runtime. When connectivity returns, the client retrieves the latest persisted task state seamlessly.
                </p>
              </div>

              <div className="space-y-3.5">
                {[
                  { title: 'Mobile Client', sub: 'Network unavailable', status: 'OFFLINE', color: 'red' },
                  { title: 'Gateway', sub: 'Task state persisted', status: 'ONLINE', color: 'emerald' },
                  { title: 'AI Worker', sub: 'Processing TASK-4821', status: 'EXECUTING', color: 'blue' },
                  { title: 'Repository', sub: 'Workspace available', status: 'CONNECTED', color: 'emerald' },
                ].map((row) => (
                  <div key={row.title} className="p-4 sm:p-5 rounded-2xl bg-white/[0.04] border border-white/5 flex items-center justify-between">
                    <div>
                      <div className="font-extrabold text-white text-sm sm:text-base">{row.title}</div>
                      <div className="text-xs text-gray-400">{row.sub}</div>
                    </div>
                    <span
                      className={`text-xs font-mono font-bold px-3.5 py-1.5 rounded-full border flex items-center gap-1.5 ${
                        row.color === 'red'
                          ? 'text-red-400 bg-red-500/15 border-red-500/30'
                          : row.color === 'emerald'
                          ? 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30'
                          : 'text-blue-400 bg-blue-500/15 border-blue-500/30'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${row.color === 'red' ? 'bg-red-500 animate-pulse' : row.color === 'emerald' ? 'bg-emerald-400' : 'bg-blue-400'}`} />
                      {row.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* SECURITY SECTION */}
        <section className="py-28 px-4 sm:px-6 lg:px-10">
          <div className="max-w-7xl mx-auto">
            <div className="text-center max-w-3xl mx-auto">
              <div className="text-xs font-bold uppercase tracking-[0.16em] text-[#0071e3] mb-4">Security Model</div>
              <h2 className="text-4xl sm:text-5xl font-black tracking-tight text-gray-950">
                Automation without <span className="text-gray-400 font-normal">sacrificing control.</span>
              </h2>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-16">
              {[
                {
                  icon: '🔑',
                  badge: 'Clerk / GitHub Auth',
                  title: 'OAuth Authentication',
                  desc: 'Repository access is strictly linked to verified PKCE developer credentials.',
                  border: 'border-blue-100 hover:border-blue-500',
                },
                {
                  icon: '📦',
                  badge: 'Docker Sandbox',
                  title: 'Isolated Workspaces',
                  desc: 'Tasks execute inside ephemeral Docker containers without host exposure.',
                  border: 'border-emerald-100 hover:border-emerald-500',
                },
                {
                  icon: '🛡️',
                  badge: 'Zero Expose',
                  title: 'Secret Management',
                  desc: 'Sensitive API keys remain server-side and never reach the mobile browser.',
                  border: 'border-purple-100 hover:border-purple-500',
                },
                {
                  icon: '✋',
                  badge: 'Mobile Confirm',
                  title: 'Approval Gates',
                  desc: 'High-impact branch pushes and deployments require explicit mobile confirmation.',
                  border: 'border-amber-100 hover:border-amber-500',
                },
              ].map((card) => (
                <div
                  key={card.title}
                  className={`p-8 rounded-[32px] bg-white border-2 ${card.border} shadow-lg shadow-gray-200/50 hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between`}
                >
                  <div>
                    <div className="text-3xl mb-6">{card.icon}</div>
                    <h3 className="text-xl font-bold text-gray-950">{card.title}</h3>
                    <p className="text-xs sm:text-sm text-gray-500 mt-2.5 leading-relaxed font-medium">{card.desc}</p>
                  </div>
                  <div className="mt-6 pt-4 border-t border-gray-100 text-xs font-bold text-blue-600 flex items-center gap-1">
                    <span>{card.badge}</span>
                    <span>→</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* TECHNOLOGY STACK (UPDATED WITH DEVICONS) */}
        <section className="py-24 px-4 sm:px-6 lg:px-10">
          <div className="max-w-7xl mx-auto rounded-[46px] bg-[#0b0b0f] p-8 sm:p-14 lg:p-18 text-white shadow-2xl border border-white/10">
            <div className="text-center max-w-3xl mx-auto">
              <div className="text-xs font-bold uppercase tracking-[0.18em] text-blue-400 mb-4">Technology Stack</div>
              <h2 className="text-4xl sm:text-6xl font-black tracking-tight">Built as a system.</h2>
              <p className="text-gray-400 mt-4 text-sm sm:text-base leading-relaxed">
                Production-grade tools powering client interaction, persistent orchestration, agentic AI, and continuous delivery.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5 mt-14">
              {(
                [
                  {
                    cat: 'Interface',
                    color: 'text-blue-400',
                    hoverBorder: 'hover:border-blue-500/50',
                    iconBg: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
                    catIcon: (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                    ),
                    items: [
                      { name: 'Next.js', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/nextjs/nextjs-original.svg', invert: true },
                      { name: 'Tailwind CSS', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/tailwindcss/tailwindcss-original.svg' },
                      { name: 'PWA App', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/chrome/chrome-original.svg' },
                    ],
                  },
                  {
                    cat: 'Gateway',
                    color: 'text-purple-400',
                    hoverBorder: 'hover:border-purple-500/50',
                    iconBg: 'bg-purple-500/10 border-purple-500/20 text-purple-400',
                    catIcon: (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    ),
                    items: [
                      { name: 'Node.js', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/nodejs/nodejs-original.svg' },
                      { name: 'REST API', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/fastapi/fastapi-original.svg' },
                      { name: 'WebSocket', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/socketio/socketio-original.svg', whiteBg: true },
                    ],
                  },
                  {
                    cat: 'Infrastructure',
                    color: 'text-emerald-400',
                    hoverBorder: 'hover:border-emerald-500/50',
                    iconBg: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
                    catIcon: (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
                      </svg>
                    ),
                    items: [
                      { name: 'Redis Queue', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/redis/redis-original.svg' },
                      { name: 'Nginx Proxy', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/nginx/nginx-original.svg' },
                      { name: 'PM2 Process', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/docker/docker-original.svg' },
                    ],
                  },
                  {
                    cat: 'Intelligence',
                    color: 'text-amber-400',
                    hoverBorder: 'hover:border-amber-500/50',
                    iconBg: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
                    catIcon: (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    ),
                    items: [
                      { name: 'LLM API', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/python/python-original.svg' },
                      { name: 'Agent Runtime', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/wasm/wasm-original.svg' },
                      { name: 'Tool Execution', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/linux/linux-original.svg' },
                    ],
                  },
                  {
                    cat: 'DevOps',
                    color: 'text-rose-400',
                    hoverBorder: 'hover:border-rose-500/50',
                    iconBg: 'bg-rose-500/10 border-rose-500/20 text-rose-400',
                    catIcon: (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                      </svg>
                    ),
                    items: [
                      { name: 'Git SCM', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/git/git-original.svg' },
                      { name: 'GitHub', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/github/github-original.svg', whiteBg: true },
                      { name: 'CI/CD Actions', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/githubactions/githubactions-original.svg' },
                    ],
                  },
                ] as Array<{
                  cat: string
                  color: string
                  hoverBorder: string
                  iconBg: string
                  catIcon: React.ReactNode
                  items: Array<{ name: string; icon: string; whiteBg?: boolean; invert?: boolean }>
                }>
              ).map((group) => (
                <div
                  key={group.cat}
                  className={`bg-white/[0.05] rounded-3xl p-6 border border-white/10 ${group.hoverBorder} backdrop-blur-xl shadow-2xl hover:-translate-y-2 transition-all duration-300 group`}
                >
                  <div className="flex items-center gap-2.5 mb-6">
                    <div className={`w-9 h-9 rounded-2xl ${group.iconBg} border flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform`}>
                      {group.catIcon}
                    </div>
                    <span className={`text-xs font-black uppercase tracking-wider ${group.color} truncate`}>{group.cat}</span>
                  </div>

                  <div className="space-y-3">
                    {group.items.map((i) => (
                      <div
                        key={i.name}
                        className="p-3 rounded-2xl bg-white/[0.04] border border-white/5 flex items-center gap-3 hover:bg-white/[0.08] hover:border-white/20 transition duration-200"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={i.icon}
                          alt={i.name}
                          className={`w-5 h-5 shrink-0 object-contain ${
                            i.whiteBg ? 'bg-white rounded-full p-0.5' : ''
                          } ${i.invert ? 'brightness-0 invert' : ''}`}
                        />
                        <span className="font-extrabold text-xs text-white truncate">{i.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* RESEARCH FOUNDATION PAPERS */}
        <section id="research" className="py-24 px-4 sm:px-6 lg:px-10">
          <div className="max-w-7xl mx-auto rounded-[46px] bg-[#0b0b0f] p-8 sm:p-14 lg:p-18 text-white shadow-2xl border border-white/10">
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
              <div className="max-w-2xl">
                <div className="text-xs font-bold uppercase tracking-[0.18em] text-blue-400 mb-4">Literature Review</div>
                <h2 className="text-3xl sm:text-5xl font-black tracking-tight">Research foundation.</h2>
                <p className="text-gray-400 mt-4 text-sm sm:text-base">
                  State-of-the-art foundation research powering autonomous multi-agent systems and cloud runtimes.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-6 text-center border-t lg:border-t-0 lg:border-l border-white/10 pt-6 lg:pt-0 lg:pl-8">
                <div>
                  <div className="text-3xl sm:text-5xl font-extrabold text-white">15<span className="text-blue-400">+</span></div>
                  <div className="text-[11px] text-gray-400 font-semibold mt-1">Papers targeted</div>
                </div>
                <div>
                  <div className="text-3xl sm:text-5xl font-extrabold text-white">5</div>
                  <div className="text-[11px] text-gray-400 font-semibold mt-1">Domains</div>
                </div>
                <div>
                  <div className="text-3xl sm:text-5xl font-extrabold text-white">3</div>
                  <div className="text-[11px] text-gray-400 font-semibold mt-1">Core layers</div>
                </div>
              </div>
            </div>

            {/* Filter Buttons */}
            <div className="flex flex-wrap gap-2.5 mt-10">
              {[
                { id: 'all' as const, label: 'All Papers (15)' },
                { id: 'agent' as const, label: 'Agentic AI & ACIs' },
                { id: 'multiagent' as const, label: 'Multi-Agent SOPs' },
                { id: 'cloud' as const, label: 'Cloud & Runtimes' },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setResearchCategory(f.id)}
                  className={`px-5 py-2.5 rounded-full text-xs font-bold transition-all ${
                    researchCategory === f.id
                      ? 'bg-blue-500 text-white shadow-md'
                      : 'bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Paper Cards Grid */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-10">
              {filteredResearch.map((paper) => {
                const theme = domainThemes[paper.category] || domainThemes.agent
                return (
                  <div
                    key={paper.id}
                    className={`bg-white rounded-[32px] p-6 sm:p-8 border-2 ${theme.border} text-gray-900 shadow-2xl hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className={`px-3.5 py-1.5 rounded-full ${theme.badge} text-[10px] font-black uppercase tracking-wider truncate`}>
                          {paper.domain}
                        </span>
                        <span className="text-[10px] font-mono font-bold text-gray-500 bg-gray-100 px-3 py-1 rounded-full border border-gray-200 shrink-0">
                          #{paper.id}
                        </span>
                      </div>

                      <h3 className="text-lg font-black tracking-tight mt-4 text-gray-950 leading-snug">
                        {paper.title}
                      </h3>

                      <div className={`mt-3.5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl ${theme.bg} ${theme.accent} text-[11px] font-bold border border-gray-200/40`}>
                        <span className="truncate">{paper.authors}</span>
                      </div>

                      <p className="text-xs sm:text-sm text-gray-600 leading-relaxed mt-4 font-medium">{paper.desc}</p>
                    </div>

                    <div className="pt-4 mt-6 border-t border-gray-100 flex items-center justify-between gap-2">
                      <span className="font-mono text-[11px] font-bold text-gray-500 bg-gray-100 px-3 py-1.5 rounded-xl border border-gray-200">
                        {paper.citation}
                      </span>
                      <a
                        href={paper.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`px-4 py-2 rounded-full ${theme.btn} font-bold text-xs shadow transition-transform hover:scale-105 flex items-center gap-1.5`}
                      >
                        <span>Read</span>
                        <span>↗</span>
                      </a>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        {/* ROADMAP / IMPLEMENTATION STRATEGY */}
        <section id="roadmap" className="py-24 px-4 sm:px-6 lg:px-10">
          <div className="max-w-7xl mx-auto rounded-[46px] bg-[#0b0b0f] p-8 sm:p-14 lg:p-18 text-white shadow-2xl border border-white/10">
            <div className="text-center max-w-3xl mx-auto">
              <div className="text-xs font-bold uppercase tracking-[0.18em] text-blue-400 mb-4">Implementation Strategy</div>
              <h2 className="text-4xl sm:text-5xl font-black tracking-tight">
                12 weeks from <span className="text-gray-400 font-normal">concept to validation.</span>
              </h2>
              <p className="text-gray-400 mt-4 text-sm sm:text-base">
                Four structured phases delivering infrastructure, real-time transport, agentic execution, and empirical testing.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-16">
              {[
                {
                  num: '01',
                  time: 'WEEKS 01–03',
                  title: 'Foundation',
                  sub: 'Core Auth & Cloud Infra',
                  color: 'text-blue-400',
                  items: ['Clerk PKCE Authentication', 'Cloud Infrastructure', 'Redis Queue Architecture'],
                },
                {
                  num: '02',
                  time: 'WEEKS 04–06',
                  title: 'Communication',
                  sub: 'Real-Time State Sync',
                  color: 'text-purple-400',
                  items: ['WebSocket Stream Protocol', 'Persistent Task State', 'Mobile PWA Control'],
                },
                {
                  num: '03',
                  time: 'WEEKS 07–09',
                  title: 'Intelligence',
                  sub: 'LLM Agent & Sandbox',
                  color: 'text-amber-400',
                  items: ['Autonomous Agent Runtime', 'Isolated Git Sandbox', 'Automated Verification'],
                },
                {
                  num: '04',
                  time: 'WEEKS 10–12',
                  title: 'Validation',
                  sub: 'CI/CD & Benchmarking',
                  color: 'text-emerald-400',
                  items: ['Automated CI/CD Webhooks', 'Security Audit & Linters', 'Benchmark Report & Docs'],
                },
              ].map((phase) => (
                <div key={phase.num} className="p-8 rounded-3xl bg-white/[0.05] border border-white/10 hover:-translate-y-1.5 transition duration-300 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className={`w-11 h-11 rounded-2xl bg-white/10 ${phase.color} font-black text-sm flex items-center justify-center`}>
                        {phase.num}
                      </div>
                      <span className={`text-[10px] font-extrabold tracking-wider ${phase.color}`}>{phase.time}</span>
                    </div>
                    <h3 className="text-xl font-bold text-white">{phase.title}</h3>
                    <div className="text-xs text-gray-400 font-medium mt-1">{phase.sub}</div>
                  </div>
                  <div className="mt-6 pt-4 border-t border-white/10 space-y-2.5 text-xs font-semibold text-gray-300">
                    {phase.items.map((it) => (
                      <div key={it} className="flex items-center gap-2">
                        <span className={phase.color}>✓</span>
                        <span>{it}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* EVALUATION METRICS */}
        <section className="py-24 px-4 sm:px-6 lg:px-10">
          <div className="max-w-7xl mx-auto rounded-[46px] bg-[#0b0b0f] p-8 sm:p-14 lg:p-18 text-white shadow-2xl border border-white/10">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <div className="text-xs font-bold uppercase tracking-[0.18em] text-blue-400 mb-4">Project Evaluation</div>
                <h2 className="text-4xl sm:text-5xl font-black tracking-tight leading-tight">
                  How will we know <span className="text-gray-400 block">it actually works?</span>
                </h2>
                <p className="text-gray-400 text-sm sm:text-base leading-relaxed mt-5 font-medium">
                  The project is evaluated using measurable system outcomes and objective benchmark metrics, not only a manual demonstration.
                </p>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                {[
                  { num: '01', title: 'Task Completion Rate', target: 'Target: > 92% end-to-end pass', color: 'text-blue-400' },
                  { num: '02', title: 'Queue Latency', target: 'Sub-second Redis push & dispatch', color: 'text-purple-400' },
                  { num: '03', title: 'Build Success Rate', target: 'Isolated Sandbox verification', color: 'text-emerald-400' },
                  { num: '04', title: 'Reconnect Recovery', target: 'State sync after network drops', color: 'text-amber-400' },
                  { num: '05', title: 'Execution Time', target: 'Parallel LLM worker dispatch', color: 'text-rose-400' },
                  { num: '06', title: 'Change Accuracy', target: 'Repo diff validation & linting', color: 'text-cyan-400' },
                ].map((m) => (
                  <div key={m.num} className="p-6 rounded-2xl bg-white/[0.05] border border-white/10">
                    <span className={`text-[10px] font-mono font-bold px-2.5 py-1 rounded-full bg-white/10 ${m.color}`}>
                      {m.num}
                    </span>
                    <div className="font-bold text-white text-base mt-3">{m.title}</div>
                    <div className="text-xs text-gray-400 mt-1">{m.target}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* FINAL HERO CTA */}
        <section className="py-28 px-4 sm:px-6 lg:px-10">
          <div className="max-w-7xl mx-auto rounded-[48px] bg-[#0b0b0f] p-10 sm:p-16 lg:p-22 text-white text-center shadow-2xl border border-white/10 relative overflow-hidden">
            <div className="absolute w-[600px] h-[350px] bg-blue-600/20 blur-[130px] rounded-full top-0 left-1/2 -translate-x-1/2 pointer-events-none" />

            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-black uppercase tracking-wider mb-6">
                <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                <span>Asynchronous Mobile Gateway</span>
              </div>

              <h2 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight max-w-4xl mx-auto leading-[1.05]">
                Development shouldn&apos;t stop
                <span className="block bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent mt-2">
                  when the laptop closes.
                </span>
              </h2>

              <p className="text-gray-400 text-base sm:text-xl max-w-2xl mx-auto mt-6 font-medium">
                A mobile-first control plane for persistent AI software engineering agents — review diffs, approve pushes, and monitor builds anytime, anywhere.
              </p>

              <div className="mt-10 flex flex-wrap justify-center items-center gap-4">
                <button
                  onClick={signInWithGitHub}
                  className="px-8 py-4 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold text-sm shadow-xl shadow-blue-500/30 hover:scale-105 transition-all duration-300 flex items-center gap-2"
                >
                  <GithubIcon className="w-4 h-4" />
                  <span>Get Started with GitHub</span>
                </button>
                <button
                  onClick={() => scrollTo('architecture')}
                  className="px-8 py-4 rounded-full bg-white/10 hover:bg-white/15 border border-white/20 text-white font-extrabold text-sm backdrop-blur-md hover:scale-105 transition-all duration-300"
                >
                  Explore Architecture ↓
                </button>
              </div>

              <div className="mt-14 pt-8 border-t border-white/10 flex flex-wrap items-center justify-center gap-3 text-xs font-bold text-gray-400">
                <span className="px-4 py-1.5 rounded-full bg-white/[0.04] border border-white/10">Connection Independent</span>
                <span>•</span>
                <span className="px-4 py-1.5 rounded-full bg-white/[0.04] border border-white/10">Redis Persistent Queue</span>
                <span>•</span>
                <span className="px-4 py-1.5 rounded-full bg-white/[0.04] border border-white/10">Docker Security Sandbox</span>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-black/5 py-12 px-4 sm:px-6 lg:px-10 text-xs text-gray-500 font-medium">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          <div>WayCode — System Concept & Stakeholder Communication Framework</div>
          <div className="flex gap-4">
            <span>AI Systems</span>
            <span>•</span>
            <span>Distributed Computing</span>
            <span>•</span>
            <span>Software Engineering</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
