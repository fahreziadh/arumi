import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAdmin } from "./admin";
import type { Platform } from "./personas";
import { vPlatform } from "./schema";

// Starter scenarios per platform. Like prompts, code is the seed: learners
// see these while the scenarioTemplates table is empty; "Load starter set"
// in the admin panel copies them into editable rows. Once any row exists,
// only rows are served, so an admin can also curate from scratch.

export interface TemplateDef {
	platform: Platform;
	title: string;
	description: string;
	topic: string;
	personaName: string;
	personaRole: string;
}

export const DEFAULT_TEMPLATES: TemplateDef[] = [
	{
		platform: "email",
		title: "Follow up after a job interview",
		description: "A polite nudge without sounding pushy",
		topic: "I interviewed for a marketing role ten days ago and haven't heard anything since, and I want to check where things stand without seeming impatient.",
		personaName: "Sarah Whitfield",
		personaRole: "The hiring manager who interviewed you",
	},
	{
		platform: "email",
		title: "Ask your manager for time off",
		description: "Request vacation during a busy stretch",
		topic: "I want to take two weeks off to visit my family abroad, but the dates overlap with our quarter-end crunch and I need my manager to approve it.",
		personaName: "Daniel Okafor",
		personaRole: "Your manager",
	},
	{
		platform: "email",
		title: "Apologize for a missed deadline",
		description: "Own a mistake professionally",
		topic: "I missed yesterday's deadline for a report my project lead was counting on, and I need to apologize, briefly explain what happened, and commit to a new date.",
		personaName: "Priya Raman",
		personaRole: "Your project lead",
	},
	{
		platform: "email",
		title: "Chase an unpaid invoice",
		description: "Ask for money owed, stay friendly",
		topic: "A client is thirty days late paying my invoice for design work, and I want to ask for the payment firmly without souring a relationship I depend on.",
		personaName: "Marcus Hale",
		personaRole: "Your freelance client",
	},
	{
		platform: "email",
		title: "Ask your landlord for repairs",
		description: "Get a broken heater fixed, fast",
		topic: "The heating in my rented flat stopped working three days ago, and I want my landlord to send someone to fix it this week.",
		personaName: "Robert Ellis",
		personaRole: "Your landlord",
	},
	{
		platform: "email",
		title: "Dispute a deposit deduction",
		description: "Push back on unfair deductions",
		topic: "I moved out a month ago and my former landlord wants to keep part of my deposit for damage that was already there, and I want to dispute it politely but firmly.",
		personaName: "Janet Morrow",
		personaRole: "Your former landlord",
	},
	{
		platform: "email",
		title: "Ask a professor for an extension",
		description: "Ask for more time without overexplaining",
		topic: "I've been ill this week and can't finish my essay by Friday, and I want to ask my professor for a one-week extension without sounding like I'm making excuses.",
		personaName: "Dr. Alan Reyes",
		personaRole: "Your course professor",
	},
	{
		platform: "email",
		title: "Chase up your visa application",
		description: "Query a delayed application politely",
		topic: "My residence permit renewal has been in process for four months with no update, and I want to ask the immigration office for a status update because my current permit expires soon.",
		personaName: "Ms. Lindgren",
		personaRole: "A caseworker at the immigration office",
	},
	{
		platform: "email",
		title: "Negotiate your job offer",
		description: "Ask for more without losing the offer",
		topic: "I just received a job offer I'm genuinely excited about, but the salary is lower than I expected, and I want to negotiate for more without putting the offer at risk.",
		personaName: "Hannah Cole",
		personaRole: "The recruiter who sent you the offer",
	},
	{
		platform: "email",
		title: "Turn down a job offer",
		description: "Say no and keep the door open",
		topic: "I've accepted another position and need to decline this company's offer graciously, because I may want to work with them in the future.",
		personaName: "Tom Becker",
		personaRole: "The hiring manager who made you an offer",
	},
	{
		platform: "email",
		title: "Push back on scope creep",
		description: "Extra requests need extra budget",
		topic: "My client keeps adding new requests beyond the project we agreed on, and I want to explain that the extra work needs extra budget without sounding difficult.",
		personaName: "Lena Fischer",
		personaRole: "Your freelance client",
	},
	{
		platform: "email",
		title: "Request a refund for a faulty item",
		description: "Complain firmly, not rudely",
		topic: "The laptop I ordered online arrived with a broken screen and the store's first reply brushed me off, and I want a replacement or a full refund.",
		personaName: "Aisha Rahman",
		personaRole: "A customer support agent at the store",
	},
	{
		platform: "email",
		title: "Tell a client the project is late",
		description: "Deliver bad news, keep their trust",
		topic: "A supplier problem means my client's website will launch two weeks late, and I need to break the news, explain my recovery plan, and keep their confidence.",
		personaName: "George Tanaka",
		personaRole: "Your agency's client",
	},
	{
		platform: "email",
		title: "Ask for a reference letter",
		description: "A big favor from a former boss",
		topic: "I'm applying to a master's program and want my former manager, whom I haven't spoken to in a year, to write me a recommendation letter by next month.",
		personaName: "Karen Liu",
		personaRole: "Your former manager",
	},
	{
		platform: "email",
		title: "Cancel a gym membership",
		description: "End a contract they want to keep",
		topic: "My gym contract auto-renews soon and I want to cancel it in writing before the notice deadline and get written confirmation that it's done.",
		personaName: "Stefan Berger",
		personaRole: "The gym's membership services agent",
	},
	{
		platform: "slack",
		title: "Give a standup update",
		description: "Short, clear async updates",
		topic: "I need to post my daily standup in the team channel covering what I finished yesterday, what I'm doing today, and a blocker I'm unsure how to phrase.",
		personaName: "Maya",
		personaRole: "Your team lead",
	},
	{
		platform: "slack",
		title: "Push back on scope creep",
		description: "Say no politely, offer an alternative",
		topic: "The product manager keeps adding requirements to the feature I'm building this sprint, and I want to push back without sounding difficult while offering to handle the extras later.",
		personaName: "Daniel",
		personaRole: "The product manager on your project",
	},
	{
		platform: "slack",
		title: "Ask for help when you're stuck",
		description: "The right context, no over-apologizing",
		topic: "I've been stuck on a bug for two hours and want to ask a senior engineer for help with enough context, without over-apologizing or looking incompetent.",
		personaName: "Priya",
		personaRole: "A senior engineer on your team",
	},
	{
		platform: "slack",
		title: "Admit a mistake before it's found",
		description: "Own it calmly, lead with the fix",
		topic: "I just realized my change from yesterday broke something in production, and I want to tell my team lead before anyone else notices, owning it calmly and proposing a fix.",
		personaName: "Tom\u00e1s",
		personaRole: "Your team lead",
	},
	{
		platform: "slack",
		title: "Nudge a stalled code review",
		description: "Friendly nudge, no guilt-tripping",
		topic: "My pull request has been waiting for review for three days and it's blocking my next task, so I want to nudge the reviewer without sounding pushy.",
		personaName: "Jake",
		personaRole: "The teammate assigned to review your PR",
	},
	{
		platform: "slack",
		title: "Disagree with review feedback",
		description: "Stand your ground, stay collegial",
		topic: "A reviewer asked me to rewrite part of my pull request in a way I think makes the code worse, and I want to explain my reasoning and reach agreement without a fight.",
		personaName: "Lena",
		personaRole: "A senior developer reviewing your code",
	},
	{
		platform: "slack",
		title: "Decline extra work gracefully",
		description: "Protect your time without guilt",
		topic: "An engineer from another team asked me to help with their project this week, but I'm already at capacity and need to say no without damaging the relationship.",
		personaName: "Omar",
		personaRole: "An engineer from another team",
	},
	{
		platform: "slack",
		title: "Ask for a deadline extension",
		description: "Flag it early, come with a plan",
		topic: "I've realized I won't finish my task by Friday's deadline, and I want to tell my manager early, explain why, and propose a realistic new date.",
		personaName: "Sarah",
		personaRole: "Your engineering manager",
	},
	{
		platform: "slack",
		title: "Report a production incident",
		description: "Calm, factual updates under pressure",
		topic: "Users are reporting errors and I'm first responder in the incident channel, so I need to post clear, factual status updates while I investigate.",
		personaName: "Chris",
		personaRole: "The on-call lead in the incident channel",
	},
	{
		platform: "slack",
		title: "Request help from another team",
		description: "Context first, easy to say yes to",
		topic: "I need the platform team to update an API endpoint for my feature, and I'm messaging their channel cold to explain what I need and by when.",
		personaName: "Ingrid",
		personaRole: "An engineer on the platform team",
	},
	{
		platform: "slack",
		title: "Introduce yourself to the team",
		description: "Warm, brief, easy to reply to",
		topic: "It's my first day and I want to introduce myself in the team channel in a way that's friendly and gives people something to respond to.",
		personaName: "Ben",
		personaRole: "A friendly teammate welcoming you",
	},
	{
		platform: "slack",
		title: "Join the small talk in #random",
		description: "Chime in casually, keep it light",
		topic: "A teammate posted about their weekend hiking trip in the random channel, and I want to join the casual conversation naturally instead of just lurking.",
		personaName: "Aisha",
		personaRole: "A chatty teammate",
	},
	{
		platform: "slack",
		title: "Clarify a vague request",
		description: "Sharp questions instead of guessing",
		topic: "My manager sent me a short, vague message asking me to 'look into the checkout thing', and I need to ask clarifying questions without seeming clueless.",
		personaName: "David",
		personaRole: "Your manager",
	},
	{
		platform: "slack",
		title: "Disagree in a team thread",
		description: "Make your case without the heat",
		topic: "The team is leaning toward a technical decision in a thread that I think is wrong, and I want to voice my disagreement clearly but respectfully before it's finalized.",
		personaName: "Marcus",
		personaRole: "A senior teammate driving the decision",
	},
	{
		platform: "slack",
		title: "Ask for last-minute time off",
		description: "Direct, no oversharing",
		topic: "Something personal came up and I need tomorrow off at short notice, so I'm messaging my manager to ask without oversharing the details.",
		personaName: "Hannah",
		personaRole: "Your manager",
	},
	{
		platform: "github",
		title: "Report a bug clearly",
		description: "Repro steps a maintainer can act on",
		topic: "You found a crash in an open-source library you use and want to file a clear bug report with steps the maintainer can reproduce.",
		personaName: "mkovacs",
		personaRole: "Maintainer of the library",
	},
	{
		platform: "github",
		title: "Respond to code review feedback",
		description: "Accept notes, defend one choice",
		topic: "A maintainer requested changes on your pull request and you want to accept most of the feedback while politely defending one design choice.",
		personaName: "jharden",
		personaRole: "Maintainer reviewing your pull request",
	},
	{
		platform: "github",
		title: "Propose a feature",
		description: "Pitch an idea before writing code",
		topic: "You want to open an issue asking whether the maintainers would accept a pull request adding a feature you need, before you spend time building it.",
		personaName: "ottodev",
		personaRole: "Core contributor",
	},
	{
		platform: "github",
		title: "Answer a 'needs more info' request",
		description: "Fill the gaps without getting defensive",
		topic: "A maintainer labeled your bug report 'needs more info' and asked questions you find a bit dismissive, and you want to provide the missing details without sounding defensive.",
		personaName: "akrause",
		personaRole: "Maintainer who triaged your issue",
	},
	{
		platform: "github",
		title: "Claim a good first issue",
		description: "Show you understand before you start",
		topic: "You found a 'good first issue' in a project you have never contributed to and want to ask to work on it while checking your planned approach makes sense.",
		personaName: "lgarrido",
		personaRole: "Maintainer of the project",
	},
	{
		platform: "github",
		title: "Disagree with a suggested approach",
		description: "Hold your ground with technical reasons",
		topic: "A reviewer wants you to rewrite your pull request using a different approach that you believe performs worse, and you want to disagree with technical arguments while staying open to being wrong.",
		personaName: "dnowak",
		personaRole: "Reviewer of your pull request",
	},
	{
		platform: "github",
		title: "Handle a harsh review",
		description: "Stay professional, take the useful parts",
		topic: "A senior contributor left blunt, borderline rude comments on your pull request and you want to respond professionally and act on the valid points.",
		personaName: "kszabo",
		personaRole: "Senior contributor reviewing your PR",
	},
	{
		platform: "github",
		title: "Nudge a quiet maintainer",
		description: "Follow up without sounding pushy",
		topic: "Your pull request has been sitting without a review for three weeks and you want to follow up politely without pressuring the maintainer.",
		personaName: "tbenoit",
		personaRole: "Maintainer of the library",
	},
	{
		platform: "github",
		title: "Report a security issue privately",
		description: "Responsible disclosure, no public details",
		topic: "You discovered a security vulnerability in an open-source project and want to contact the maintainer through a private advisory with enough detail to act on, without disclosing it publicly.",
		personaName: "ynakamura",
		personaRole: "Lead maintainer of the project",
	},
	{
		platform: "github",
		title: "Ask when a fix will be released",
		description: "Ask about timelines without demanding",
		topic: "A bug fix you depend on was merged months ago but never released, and you want to ask about the release timeline without sounding entitled.",
		personaName: "rmoreau",
		personaRole: "Maintainer who handles releases",
	},
	{
		platform: "github",
		title: "Own up to a breaking change",
		description: "Apologize, explain, propose a fix",
		topic: "A change you merged accidentally broke other people's builds and an affected user opened an angry issue, and you want to apologize, explain what happened, and offer a fix or workaround.",
		personaName: "dfarias",
		personaRole: "User whose build your change broke",
	},
	{
		platform: "github",
		title: "Ask if a behavior is intended",
		description: "Check before filing it as a bug",
		topic: "A library behaves differently from what the docs led you to expect and you want to ask whether it is a bug or intended behavior before filing a bug report.",
		personaName: "wliu",
		personaRole: "Maintainer of the library",
	},
	{
		platform: "github",
		title: "Request changes kindly",
		description: "Point out problems without discouraging",
		topic: "You are reviewing a first-time contributor's pull request that has real problems, and you want to request changes clearly without discouraging them from contributing again.",
		personaName: "matteoricci",
		personaRole: "First-time contributor whose PR you are reviewing",
	},
	{
		platform: "github",
		title: "Push back on a closed issue",
		description: "Ask for a second look, respectfully",
		topic: "A maintainer closed your issue as 'won't fix' but you believe your use case was misunderstood, and you want to make your case respectfully and ask them to reconsider.",
		personaName: "sbakker",
		personaRole: "Maintainer who closed your issue",
	},
	{
		platform: "github",
		title: "Offer to take over a stale PR",
		description: "Respect the original author's work",
		topic: "A pull request fixing a bug you need has been abandoned by its author for months, and you want to ask the maintainer if you can take it over while giving the original author credit.",
		personaName: "obrienk",
		personaRole: "Maintainer of the project",
	},
	{
		platform: "whatsapp",
		title: "Catch up with an old friend",
		description: "A year of news, kept casual",
		topic: "An old friend I haven't spoken to in about a year just messaged me out of the blue, and I want to catch up naturally, share my news, and ask about her life without it feeling like an interview.",
		personaName: "Maya",
		personaRole: "Your old friend from school",
	},
	{
		platform: "whatsapp",
		title: "Make weekend plans",
		description: "Agree on a day, time, and place",
		topic: "My friend and I keep saying we should hang out, and this time I want to actually pin down a day, a time, and a place before the weekend fills up.",
		personaName: "Daniel",
		personaRole: "Your friend",
	},
	{
		platform: "whatsapp",
		title: "Chat with a new neighbor",
		description: "Friendly small talk with a stranger",
		topic: "A new neighbor just added me on WhatsApp after we met in the hallway, and I want to make friendly small talk and offer help settling in without being pushy.",
		personaName: "Priya",
		personaRole: "Your new neighbor",
	},
	{
		platform: "whatsapp",
		title: "Decline a party invitation",
		description: "Say no warmly, keep the friendship",
		topic: "My friend invited me to her birthday party on Saturday, but I'm exhausted and really don't want to go, so I need to say no kindly without hurting her feelings.",
		personaName: "Sofia",
		personaRole: "Your friend who invited you",
	},
	{
		platform: "whatsapp",
		title: "Apologize for a missed birthday",
		description: "Own it without overdoing the guilt",
		topic: "I completely forgot my close friend's birthday yesterday, and I want to apologize sincerely and suggest making it up to him without drowning the chat in excuses.",
		personaName: "Leo",
		personaRole: "Your close friend",
	},
	{
		platform: "whatsapp",
		title: "Ask a friend to pay you back",
		description: "Raise money talk without the awkward",
		topic: "I covered my friend's share of a concert ticket three weeks ago and he hasn't mentioned it since, so I want to remind him to pay me back without making things weird.",
		personaName: "Tomas",
		personaRole: "Your friend who owes you money",
	},
	{
		platform: "whatsapp",
		title: "Check in on a struggling friend",
		description: "Offer support without prying",
		topic: "My friend just lost her job and has gone quiet, and I want to check in, show I care, and offer help without forcing her to talk about it.",
		personaName: "Hana",
		personaRole: "Your friend who just lost her job",
	},
	{
		platform: "whatsapp",
		title: "Report a leak to your landlord",
		description: "Polite but firm about repairs",
		topic: "There's a water leak under my kitchen sink that's getting worse, and I need to tell my landlord, get a repair scheduled soon, and stay polite but firm if he stalls.",
		personaName: "Robert",
		personaRole: "Your landlord",
	},
	{
		platform: "whatsapp",
		title: "Sort out chores with your flatmate",
		description: "Raise the dishes issue kindly",
		topic: "My flatmate keeps leaving dishes in the sink for days, and I want to bring it up and agree on a fair chore arrangement without turning it into a fight.",
		personaName: "Emma",
		personaRole: "Your flatmate",
	},
	{
		platform: "whatsapp",
		title: "Cancel dinner at the last minute",
		description: "Bail late without losing goodwill",
		topic: "I'm supposed to meet my friend for dinner in two hours but something urgent came up, so I need to cancel gracefully and reschedule so she knows I still want to see her.",
		personaName: "Nadia",
		personaRole: "Your friend expecting you tonight",
	},
	{
		platform: "whatsapp",
		title: "Congratulate a friend on a new job",
		description: "Be warm, not a greeting card",
		topic: "My former colleague just announced he landed a job he'd been chasing for months, and I want to congratulate him warmly, ask about the role, and suggest celebrating.",
		personaName: "Chris",
		personaRole: "Your former colleague",
	},
	{
		platform: "whatsapp",
		title: "Borrow a drill from your neighbor",
		description: "Ask a small favor politely",
		topic: "I need to hang some shelves this weekend and don't own a drill, so I want to ask my neighbor to lend me his and agree on when I'll pick it up and return it.",
		personaName: "Mark",
		personaRole: "Your neighbor",
	},
	{
		platform: "whatsapp",
		title: "Tell the babysitter you'll be late",
		description: "Update plans and share key details",
		topic: "I'm stuck in traffic and will be about forty minutes late getting home, so I need to let the babysitter know, apologize, and cover the kids' bedtime details.",
		personaName: "Lucy",
		personaRole: "Your babysitter",
	},
	{
		platform: "whatsapp",
		title: "Organize a potluck in the group",
		description: "Herd the chat toward one plan",
		topic: "I'm hosting a potluck for my friend group and the chat is all over the place, so I want to confirm who's coming and get everyone to commit to bringing one dish each.",
		personaName: "Diego",
		personaRole: "Your friend in the group chat",
	},
	{
		platform: "whatsapp",
		title: "Catch up with a friend abroad",
		description: "Bridge time zones and life updates",
		topic: "My friend from language exchange moved back to Japan last year, and I want to swap life updates, ask about her new city, and float the idea of visiting her someday.",
		personaName: "Yuki",
		personaRole: "Your friend who moved abroad",
	},
	{
		platform: "telegram",
		title: "Plan a trip together",
		description: "Transport, budget, where to stay",
		topic: "My friend and I are planning a weekend trip over Telegram and I want to agree on transport, budget and where to stay without it dragging on forever.",
		personaName: "Mateo",
		personaRole: "Friend you are planning the trip with",
	},
	{
		platform: "telegram",
		title: "Buy something second-hand",
		description: "Ask questions, negotiate the price",
		topic: "I found a used bike in a marketplace channel and I want to check its condition and get the price down a bit before agreeing to buy.",
		personaName: "Igor",
		personaRole: "Seller from a marketplace channel",
	},
	{
		platform: "telegram",
		title: "Reschedule a meetup",
		description: "Move plans without annoying anyone",
		topic: "I agreed to meet someone from my hobby group on Saturday but something came up, and I want to move it to another day without seeming flaky.",
		personaName: "Hana",
		personaRole: "Person from your hobby group you were meeting",
	},
	{
		platform: "telegram",
		title: "Sell your old phone",
		description: "Answer questions, hold your price",
		topic: "I posted my old phone in a buy-and-sell group and a buyer is messaging me with questions and a lowball offer, and I want to stay friendly but not drop too far below my price.",
		personaName: "Daniel",
		personaRole: "Interested buyer from a buy-and-sell group",
	},
	{
		platform: "telegram",
		title: "Back out of a deal politely",
		description: "Cancel without burning bridges",
		topic: "I told a seller I would buy their desk but I changed my mind, and I want to cancel politely before they hold it for me any longer.",
		personaName: "Petra",
		personaRole: "Seller who has been holding the item for you",
	},
	{
		platform: "telegram",
		title: "Ask to join a private group",
		description: "Convince the admin to let you in",
		topic: "I want to join a private expat group in my city and the admin is asking who I am and why I want in, so I need to introduce myself convincingly.",
		personaName: "Tomas",
		personaRole: "Admin of a private expat group",
	},
	{
		platform: "telegram",
		title: "Report a scammer to the admin",
		description: "Explain what happened, share proof",
		topic: "Someone in a marketplace group took my deposit and disappeared, and I want to report them to the group admin clearly with screenshots.",
		personaName: "Ayesha",
		personaRole: "Admin of the marketplace group",
	},
	{
		platform: "telegram",
		title: "Ask about a room for rent",
		description: "Check details before you visit",
		topic: "Someone posted a room for rent in a housing group and I want to ask about the price, deposit, flatmates and when I can come see it.",
		personaName: "Lucia",
		personaRole: "Tenant renting out a room in her flat",
	},
	{
		platform: "telegram",
		title: "Organize a group meetup",
		description: "Pick a day, place and headcount",
		topic: "I offered to organize this month's board game meetup for my Telegram group and I need to propose a date and venue and get people to actually confirm.",
		personaName: "Ben",
		personaRole: "Active member of your board game group",
	},
	{
		platform: "telegram",
		title: "Start a language exchange",
		description: "Break the ice, agree how to practice",
		topic: "I matched with a native English speaker in a language exchange group and I want to introduce myself and agree on how often and how we will practice.",
		personaName: "Emily",
		personaRole: "Native English speaker from a language exchange group",
	},
	{
		platform: "telegram",
		title: "Ask about a freelance gig",
		description: "Scope, deadline and your rate",
		topic: "A client posted a design gig in a freelance channel and I want to ask about the scope and deadline and quote my rate without underselling myself.",
		personaName: "Marcus",
		personaRole: "Client who posted the gig in a freelance channel",
	},
	{
		platform: "telegram",
		title: "Chase a late payment",
		description: "Firm but friendly reminder",
		topic: "A client from a freelance channel is two weeks late paying my invoice and I want to remind them firmly without ruining the relationship.",
		personaName: "Sofia",
		personaRole: "Client who has not paid your invoice",
	},
	{
		platform: "telegram",
		title: "Ask expats for local advice",
		description: "Banks, SIM cards, paperwork",
		topic: "I just moved to a new country and I want to ask the local expat group how to open a bank account and get a SIM card without sounding clueless.",
		personaName: "Ravi",
		personaRole: "Long-time member of the local expat group",
	},
	{
		platform: "telegram",
		title: "Arrange a pickup time and place",
		description: "Agree where, when and how to pay",
		topic: "I agreed to buy a jacket from someone in a local group and now we need to settle where and when to meet and whether I pay cash or by transfer.",
		personaName: "Karim",
		personaRole: "Seller you are meeting for the handover",
	},
	{
		platform: "discord",
		title: "Introduce yourself in a server",
		description: "First post in a new community",
		topic: "I just joined a gaming server and want to write my first message in the intros channel so people actually respond to me.",
		personaName: "modwren",
		personaRole: "Server moderator who welcomes newcomers",
	},
	{
		platform: "discord",
		title: "Ask a technical question",
		description: "Describe the error and what you tried",
		topic: "My project build keeps failing with an error I don't understand, and I want to ask in the help channel clearly, including what I already tried.",
		personaName: "stacksmith",
		personaRole: "Experienced developer who answers questions in the help channel",
	},
	{
		platform: "discord",
		title: "Join a casual conversation",
		description: "Jump into banter mid-thread",
		topic: "People in general chat are joking about a new game trailer and I want to jump into the banter without it feeling forced.",
		personaName: "pixelfox",
		personaRole: "Regular member joking around in general chat",
	},
	{
		platform: "discord",
		title: "Ask to join a game group",
		description: "Reply to an LFG post and get invited",
		topic: "Someone posted looking for one more player for ranked matches, and I want to reply so they pick me even though my rank is average.",
		personaName: "duoqueen",
		personaRole: "Player recruiting teammates for ranked",
	},
	{
		platform: "discord",
		title: "Thank someone who helped you",
		description: "Show gratitude without overdoing it",
		topic: "A member spent an hour helping me debug my code for free, and I want to thank them in a way that feels genuine, not over the top.",
		personaName: "kindcompiler",
		personaRole: "Helpful member who just solved your problem",
	},
	{
		platform: "discord",
		title: "Ask a busy expert a question",
		description: "One clear question, zero pressure",
		topic: "The maintainer of a library I use is active in this server, and I want to ask them one question without wasting their time or seeming pushy.",
		personaName: "corelena",
		personaRole: "Open-source maintainer with very little free time",
	},
	{
		platform: "discord",
		title: "Give feedback on someone's art",
		description: "Be honest and kind at the same time",
		topic: "A member posted their character drawing asking for critique, and I want to point out real problems while still being encouraging.",
		personaName: "inkling",
		personaRole: "Hobby artist who asked for honest critique",
	},
	{
		platform: "discord",
		title: "Clear up a misunderstanding",
		description: "Your joke landed wrong in chat",
		topic: "A joke I made in chat came across as an insult and another member is upset, so I want to explain what I meant and apologize properly.",
		personaName: "saltyowl",
		personaRole: "Member who took your joke the wrong way",
	},
	{
		platform: "discord",
		title: "Call out toxic behavior",
		description: "Push back without starting a war",
		topic: "Someone keeps mocking new players in the game channel and I want to ask them to stop without turning it into a flame war.",
		personaName: "fraglord",
		personaRole: "Long-time member being harsh to newcomers",
	},
	{
		platform: "discord",
		title: "Disagree in a debate channel",
		description: "Challenge the take, respect the person",
		topic: "Someone posted a hot take I strongly disagree with in the debate channel, and I want to argue my side with reasons while keeping it friendly.",
		personaName: "hottakehank",
		personaRole: "Confident member defending their hot take",
	},
	{
		platform: "discord",
		title: "Apply to be a moderator",
		description: "Make your case in a short application",
		topic: "The server opened moderator applications and I want to message the admin explaining why I'd be a good fit without bragging.",
		personaName: "serverdad",
		personaRole: "Server admin reviewing mod applications",
	},
	{
		platform: "discord",
		title: "Pitch a community event",
		description: "Propose a movie night to the mods",
		topic: "I want to propose a weekly movie night for the server and convince a moderator it's worth setting up.",
		personaName: "reelkeeper",
		personaRole: "Moderator who approves community events",
	},
	{
		platform: "discord",
		title: "Find a study partner",
		description: "Team up for daily practice",
		topic: "In a study server I want to ask if anyone will be my accountability partner for daily exam practice and agree on how we'll check in.",
		personaName: "studybun",
		personaRole: "Student also preparing for the same exam",
	},
	{
		platform: "discord",
		title: "Share your side project",
		description: "Self-promo that doesn't feel spammy",
		topic: "I built a small tool and want to post it in the showcase channel in a way that invites feedback instead of looking like spam.",
		personaName: "shipfast",
		personaRole: "Active developer who hangs out in the showcase channel",
	},
	{
		platform: "discord",
		title: "Ask a mod about a warning",
		description: "Understand the rule without arguing",
		topic: "I received a warning I don't fully understand, and I want to calmly ask the moderator what I did wrong and how to avoid it.",
		personaName: "modraven",
		personaRole: "Moderator who issued your warning",
	},
	{
		platform: "teams",
		title: "Give a project status update",
		description: "Progress, risks, next steps",
		topic: "My manager pinged me for a status update on the website redesign, and I want to summarize what's done, flag one risk, and lay out next steps without writing an essay.",
		personaName: "Sarah Whitmore",
		personaRole: "Your direct manager",
	},
	{
		platform: "teams",
		title: "Decline a meeting politely",
		description: "Bow out without being rude",
		topic: "I've been invited to a Thursday planning meeting that clashes with a deadline, and I want to decline gracefully while showing I still care about the project.",
		personaName: "Daniel Okafor",
		personaRole: "Project coordinator who organized the meeting",
	},
	{
		platform: "teams",
		title: "Welcome a new teammate",
		description: "Check in and offer help",
		topic: "A new developer joined my team this week, and I want to send a friendly first message, ask how they're settling in, and offer help with setup and questions.",
		personaName: "Mateo Alvarez",
		personaRole: "New teammate in their first week",
	},
	{
		platform: "teams",
		title: "Flag a project delay early",
		description: "Break the news and own the plan",
		topic: "A task I own is going to slip by two days because a vendor delivered late, and I want to tell the project manager early, explain why, and propose a recovery plan.",
		personaName: "Rachel Kim",
		personaRole: "Project manager on the client project",
	},
	{
		platform: "teams",
		title: "Report a laptop issue to IT",
		description: "Describe the problem clearly",
		topic: "My laptop keeps dropping the VPN connection during calls, and I want to describe the symptoms clearly to IT and get it fixed before a client demo on Friday.",
		personaName: "Priya Nair",
		personaRole: "IT service desk technician",
	},
	{
		platform: "teams",
		title: "Follow up on an unanswered message",
		description: "Nudge politely, get an answer",
		topic: "I asked a finance analyst for budget numbers a week ago and got no reply, and I want to follow up politely but firmly because my report is due soon.",
		personaName: "Tom\u00e1s Ferreira",
		personaRole: "Finance analyst in another department",
	},
	{
		platform: "teams",
		title: "Ask HR about leave policy",
		description: "Get clear answers on your options",
		topic: "I'm expecting a baby later this year, and I want to ask HR how parental leave works here and what I need to arrange, without sharing more than I'm ready to.",
		personaName: "Hannah Lindqvist",
		personaRole: "HR business partner",
	},
	{
		platform: "teams",
		title: "Ask about your promotion path",
		description: "Start the conversation with confidence",
		topic: "I've been in my role for two years and feel ready for the next level, and I want to ask my manager what it would take to be considered for a senior position.",
		personaName: "David Chen",
		personaRole: "Your direct manager",
	},
	{
		platform: "teams",
		title: "Clarify confusing instructions",
		description: "Ask without sounding critical",
		topic: "The brief I received for a quarterly report is vague about scope and audience, and I want to ask clarifying questions without sounding like I'm criticizing the author.",
		personaName: "Laura Bennett",
		personaRole: "Senior product manager who wrote the brief",
	},
	{
		platform: "teams",
		title: "Reschedule a meeting last minute",
		description: "Move it without causing friction",
		topic: "An urgent client call just landed on top of my weekly sync with a colleague, and I want to apologize, reschedule, and suggest two new times that work.",
		personaName: "Ahmed Hassan",
		personaRole: "Colleague you meet with weekly",
	},
	{
		platform: "teams",
		title: "Hand over work before your leave",
		description: "Brief your cover so nothing drops",
		topic: "I'm going on leave for two weeks starting Monday, and I want to hand over my open tasks to a teammate with enough context that nothing falls through the cracks.",
		personaName: "Julia Novak",
		personaRole: "Teammate covering your tasks",
	},
	{
		platform: "teams",
		title: "Handle a request while covering",
		description: "Help out without overpromising",
		topic: "I'm covering for a colleague on leave and someone from sales is asking about a report I know little about, and I want to be helpful without promising things I can't deliver.",
		personaName: "Megan O'Brien",
		personaRole: "Sales account manager",
	},
	{
		platform: "teams",
		title: "Request help from another team",
		description: "Make your ask easy to say yes to",
		topic: "I need the marketing design team to produce a banner for our product launch by Friday, and I want to make the request with clear context, specs, and a realistic deadline.",
		personaName: "Chloe Dubois",
		personaRole: "Design team lead in marketing",
	},
	{
		platform: "teams",
		title: "Prepare for your performance review",
		description: "Ask what to expect and how to prep",
		topic: "My annual performance review is next week, and I want to ask my manager what to prepare and briefly mention a couple of achievements I'd like discussed.",
		personaName: "Robert Ellison",
		personaRole: "Your direct manager",
	},
	{
		platform: "teams",
		title: "Call in sick on a busy day",
		description: "Notify your team and cover the gaps",
		topic: "I woke up too sick to work on the day of an important demo, and I need to tell my team lead quickly and help arrange cover for my urgent tasks.",
		personaName: "Emily Tan",
		personaRole: "Your team lead",
	},
	{
		platform: "linkedin",
		title: "Reply to a recruiter",
		description: "Ask the questions that matter",
		topic: "A recruiter just messaged me about a senior role at a company I don't know much about, and I want to learn what the job actually involves before agreeing to a call.",
		personaName: "Sarah Whitmore",
		personaRole: "Tech recruiter who just messaged you about an open role",
	},
	{
		platform: "linkedin",
		title: "Turn down a role gracefully",
		description: "Decline but keep the door open",
		topic: "I received an offer from a company I liked, but I've accepted a different position, and I want to decline without burning the bridge.",
		personaName: "Daniel Okafor",
		personaRole: "Hiring manager who just sent you an offer",
	},
	{
		platform: "linkedin",
		title: "Connect after a conference",
		description: "Turn a chat into a connection",
		topic: "I briefly met a product designer at a conference last week, and I want to follow up so the conversation becomes a real professional connection.",
		personaName: "Mei-Ling Chen",
		personaRole: "Product designer you briefly met at a conference",
	},
	{
		platform: "linkedin",
		title: "Ask a stranger for a referral",
		description: "Make the ask without being pushy",
		topic: "I'm applying to a company where I know no one, and I want to ask an engineer there for a referral without sounding entitled or pushy.",
		personaName: "Priya Raman",
		personaRole: "Software engineer at the company you're applying to, whom you've never met",
	},
	{
		platform: "linkedin",
		title: "Follow up after applying",
		description: "Nudge without sounding desperate",
		topic: "I applied for a role two weeks ago and heard nothing, and I want to message the hiring manager to show interest without seeming impatient.",
		personaName: "Tom\u00e1s Rivera",
		personaRole: "Hiring manager for the role you applied to",
	},
	{
		platform: "linkedin",
		title: "Reconnect with an old colleague",
		description: "Warm up a cold thread naturally",
		topic: "A former teammate I haven't spoken to in three years now works at a company I'd love to join, and I want to reconnect genuinely before ever mentioning jobs.",
		personaName: "Anna Kowalska",
		personaRole: "Former teammate you haven't spoken to in three years",
	},
	{
		platform: "linkedin",
		title: "Answer the salary question",
		description: "Name a number without underselling",
		topic: "A recruiter asked for my salary expectations over DM, and I want to give a confident answer that keeps room to negotiate.",
		personaName: "James Holloway",
		personaRole: "Agency recruiter asking for your salary expectations",
	},
	{
		platform: "linkedin",
		title: "Ask for a coffee chat",
		description: "Request 20 minutes respectfully",
		topic: "I admire the work of an engineering manager at another company, and I want to ask her for a short virtual coffee chat without making it awkward.",
		personaName: "Fatima Al-Sayed",
		personaRole: "Engineering manager at a company you admire",
	},
	{
		platform: "linkedin",
		title: "Respond to a rejection",
		description: "Stay gracious, stay on their radar",
		topic: "I was just rejected after a final-round interview, and I want to reply graciously so they think of me for future openings.",
		personaName: "Laura Bennett",
		personaRole: "Recruiter who just sent you a rejection message",
	},
	{
		platform: "linkedin",
		title: "Reschedule an interview",
		description: "Move the time without losing goodwill",
		topic: "Something urgent came up and I can't make my scheduled interview, so I need to ask for a new time without seeming unreliable.",
		personaName: "Kenji Nakamura",
		personaRole: "Recruiting coordinator who scheduled your interview",
	},
	{
		platform: "linkedin",
		title: "Cold-message a hiring manager",
		description: "Introduce yourself before applying",
		topic: "I'm about to apply for a role I really want, and I want to message the hiring manager directly so my application doesn't get lost in the pile.",
		personaName: "Sofia Marchetti",
		personaRole: "Hiring manager for a role you're about to apply for",
	},
	{
		platform: "linkedin",
		title: "Ask for more time on an offer",
		description: "Buy a few days without risking it",
		topic: "I received an offer with a tight deadline while I'm still finishing interviews elsewhere, and I want to ask for a few more days without losing the offer.",
		personaName: "Robert Ellison",
		personaRole: "Recruiter waiting on your decision about their offer",
	},
	{
		platform: "linkedin",
		title: "Decline a recruiter politely",
		description: "Say no now, stay open for later",
		topic: "A recruiter pitched me a role that isn't a fit right now, and I want to decline politely while keeping the relationship for the future.",
		personaName: "Hannah Schmidt",
		personaRole: "Recruiter pitching you a role that doesn't fit",
	},
	{
		platform: "linkedin",
		title: "Congratulate a former manager",
		description: "Turn good news into a catch-up",
		topic: "My former manager was just promoted to VP, and I want to congratulate her sincerely and use the moment to get back in touch.",
		personaName: "Marcus Webb",
		personaRole: "Former manager who was just promoted",
	},
	{
		platform: "support",
		title: "Get a refund",
		description: "Damaged order, clear ask",
		topic: "I ordered a ceramic coffee set online and it arrived with two cups broken, so I want a full refund without having to pay for the return shipping.",
		personaName: "Maya",
		personaRole: "Online store support agent",
	},
	{
		platform: "support",
		title: "Cancel a subscription",
		description: "Stay firm through the retention pitch",
		topic: "My streaming subscription renews next week and I want to cancel it today, staying firm even when the agent offers discounts to make me stay.",
		personaName: "Daniel",
		personaRole: "Streaming service retention agent",
	},
	{
		platform: "support",
		title: "Chase a late delivery",
		description: "Push past vague answers",
		topic: "My package was due five days ago and the tracking has not updated since, so I want a real answer about where it is and a firm delivery date.",
		personaName: "Priya",
		personaRole: "Courier company support agent",
	},
	{
		platform: "support",
		title: "Change your delivery address",
		description: "Simple ask, quick and polite",
		topic: "I accidentally ordered a jacket to my old address and I want the delivery address changed before the parcel ships out.",
		personaName: "Ben",
		personaRole: "Online store support agent",
	},
	{
		platform: "support",
		title: "Dispute a double charge",
		description: "Twice billed, show the proof",
		topic: "My gym billed my card twice this month and I want the duplicate charge refunded back to my card, not given to me as account credit.",
		personaName: "Sofia",
		personaRole: "Billing support agent",
	},
	{
		platform: "support",
		title: "Unblock your bank card",
		description: "Stranded abroad, explain and verify",
		topic: "My debit card got blocked while I am traveling abroad and I need it unblocked today because it is my only way to pay for my hotel.",
		personaName: "Marcus",
		personaRole: "Bank customer support agent",
	},
	{
		platform: "support",
		title: "Report an unknown card charge",
		description: "Possible fraud, act fast",
		topic: "There is a charge on my credit card from a company I have never heard of, and I want it investigated, my card protected, and the money refunded.",
		personaName: "Elena",
		personaRole: "Bank fraud team agent",
	},
	{
		platform: "support",
		title: "Rebook a changed flight",
		description: "Airline moved it, know your options",
		topic: "The airline moved my flight to a later time that makes me miss my connection, and I want to be rebooked on an earlier flight at no extra cost.",
		personaName: "Lucas",
		personaRole: "Airline support agent",
	},
	{
		platform: "support",
		title: "Claim flight delay compensation",
		description: "Four hours late, refuse the voucher",
		topic: "My flight arrived over four hours late and I want to claim the cash compensation I am entitled to, even if the agent keeps offering vouchers instead.",
		personaName: "Ingrid",
		personaRole: "Airline claims agent",
	},
	{
		platform: "support",
		title: "Fix a hotel booking mistake",
		description: "Wrong dates, fix it without a fee",
		topic: "My hotel confirmation shows the wrong check-in date compared to what I selected, and I want it corrected without paying a change fee.",
		personaName: "Amara",
		personaRole: "Travel booking site agent",
	},
	{
		platform: "support",
		title: "Get your internet outage fixed",
		description: "Third outage, demand a timeline",
		topic: "My home internet has been down for two days and the promised callback never came, so I want a technician appointment and a credit on my bill.",
		personaName: "Kevin",
		personaRole: "Internet provider support agent",
	},
	{
		platform: "support",
		title: "Report a confusing app bug",
		description: "Walk them through it step by step",
		topic: "My banking app crashes every time I try to send an international transfer, and I want to describe the exact steps so support can fix it or give me a workaround.",
		personaName: "Nadia",
		personaRole: "App technical support agent",
	},
	{
		platform: "support",
		title: "Claim a laptop warranty repair",
		description: "Eight months old, defend the defect",
		topic: "My eight-month-old laptop screen has started flickering on its own, and I want a free warranty repair even if the agent suggests I caused the damage.",
		personaName: "Omar",
		personaRole: "Laptop manufacturer support agent",
	},
	{
		platform: "support",
		title: "Escalate an ignored complaint",
		description: "Two weeks of silence, go higher",
		topic: "I have written to support twice about receiving the wrong item and heard nothing for two weeks, so now I want my case escalated to a supervisor and resolved this week.",
		personaName: "Grace",
		personaRole: "Customer support team lead",
	},
	{
		platform: "support",
		title: "Check what your insurance covers",
		description: "Cracked screen, get a clear answer",
		topic: "I cracked my phone screen and I want to know clearly whether my insurance covers it, how much the excess is, and how to file the claim.",
		personaName: "Hannah",
		personaRole: "Insurance support agent",
	},
];

/** Well above any hand-curated set; keeps reads bounded. */
const MAX_TEMPLATES = 500;

function toCard(template: {
	title: string;
	description: string;
	topic: string;
	personaName: string;
	personaRole: string;
}) {
	return {
		title: template.title,
		description: template.description,
		topic: template.topic,
		personaName: template.personaName,
		personaRole: template.personaRole,
	};
}

/** Enabled templates for the prepare page; code defaults until seeded. */
export const forPlatform = query({
	args: { platform: vPlatform },
	handler: async (ctx, args) => {
		if (!(await getAuthUserId(ctx))) return [];
		const rows = await ctx.db
			.query("scenarioTemplates")
			.withIndex("by_platform", (q) => q.eq("platform", args.platform))
			.take(MAX_TEMPLATES);
		if (rows.length > 0) {
			return rows
				.filter((row) => row.enabled)
				.sort((a, b) => a.order - b.order)
				.map(toCard);
		}
		// No rows for this platform: defaults only while the whole table is
		// empty. Once an admin curates anything, an empty platform stays empty.
		const seeded = await ctx.db.query("scenarioTemplates").first();
		if (seeded) return [];
		return DEFAULT_TEMPLATES.filter((t) => t.platform === args.platform).map(
			toCard,
		);
	},
});

/** Every row, ordered within each platform; grouping happens client-side. */
export const listForAdmin = query({
	args: {},
	handler: async (ctx) => {
		await requireAdmin(ctx);
		const rows = await ctx.db.query("scenarioTemplates").take(MAX_TEMPLATES);
		rows.sort(
			(a, b) => a.platform.localeCompare(b.platform) || a.order - b.order,
		);
		return rows;
	},
});

/** Copies the code defaults into rows so the admin can edit them. */
export const seedDefaults = mutation({
	args: {},
	handler: async (ctx) => {
		await requireAdmin(ctx);
		if (await ctx.db.query("scenarioTemplates").first()) {
			throw new Error("Templates already exist");
		}
		const nextOrder: Partial<Record<Platform, number>> = {};
		for (const template of DEFAULT_TEMPLATES) {
			const order = nextOrder[template.platform] ?? 0;
			nextOrder[template.platform] = order + 1;
			await ctx.db.insert("scenarioTemplates", {
				...template,
				enabled: true,
				order,
			});
		}
	},
});

export const save = mutation({
	args: {
		id: v.optional(v.id("scenarioTemplates")),
		platform: vPlatform,
		title: v.string(),
		description: v.string(),
		topic: v.string(),
		// Empty persona fields fall back to the per-platform default persona.
		personaName: v.string(),
		personaRole: v.string(),
	},
	handler: async (ctx, args) => {
		await requireAdmin(ctx);
		const fields = {
			title: args.title.trim(),
			description: args.description.trim(),
			topic: args.topic.trim(),
			personaName: args.personaName.trim(),
			personaRole: args.personaRole.trim(),
		};
		if (!fields.title) throw new Error("Title is required");
		if (!fields.topic) throw new Error("Scenario is required");
		if (args.id) {
			if (!(await ctx.db.get(args.id))) throw new Error("Template not found");
			// The platform is fixed at creation; edits only touch the content.
			await ctx.db.patch(args.id, fields);
			return args.id;
		}
		const siblings = await ctx.db
			.query("scenarioTemplates")
			.withIndex("by_platform", (q) => q.eq("platform", args.platform))
			.take(MAX_TEMPLATES);
		const order = siblings.reduce((max, row) => Math.max(max, row.order), -1);
		return await ctx.db.insert("scenarioTemplates", {
			platform: args.platform,
			...fields,
			enabled: true,
			order: order + 1,
		});
	},
});

export const setEnabled = mutation({
	args: { id: v.id("scenarioTemplates"), enabled: v.boolean() },
	handler: async (ctx, args) => {
		await requireAdmin(ctx);
		if (!(await ctx.db.get(args.id))) throw new Error("Template not found");
		await ctx.db.patch(args.id, { enabled: args.enabled });
	},
});

export const remove = mutation({
	args: { id: v.id("scenarioTemplates") },
	handler: async (ctx, args) => {
		await requireAdmin(ctx);
		if (await ctx.db.get(args.id)) await ctx.db.delete(args.id);
	},
});

/** Drops a template at `toIndex` within its platform, shifting the rest. */
export const reorder = mutation({
	args: { id: v.id("scenarioTemplates"), toIndex: v.number() },
	handler: async (ctx, args) => {
		await requireAdmin(ctx);
		const doc = await ctx.db.get(args.id);
		if (!doc) throw new Error("Template not found");
		const rows = await ctx.db
			.query("scenarioTemplates")
			.withIndex("by_platform", (q) => q.eq("platform", doc.platform))
			.take(MAX_TEMPLATES);
		rows.sort((a, b) => a.order - b.order);
		const from = rows.findIndex((row) => row._id === args.id);
		const to = Math.min(Math.max(Math.round(args.toIndex), 0), rows.length - 1);
		if (from === -1 || from === to) return;
		rows.splice(to, 0, ...rows.splice(from, 1));
		// Sequential rewrite: also heals any duplicate order values.
		for (const [i, row] of rows.entries()) {
			if (row.order !== i) await ctx.db.patch(row._id, { order: i });
		}
	},
});
