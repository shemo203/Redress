                      Product Requirements Document (PRD)
Product: Fashion Outfit Video App (Working Title: TBD)
Version: MVP v1
Market: Sweden
Platform: Cross-platform mobile app
Language: English only
Target Release: MVP / side-project launch

1. Executive Summary
This product is a mobile-first social media app for fashion and outfit sharing, built around short-form vertical videos. Users upload videos showcasing their outfits, tag the clothing items featured in the video, and publish them to a scrollable feed similar to TikTok. Other users can watch videos, reveal the tagged items, and click outbound links to the brand or retailer websites.
The product’s core differentiator is that it replaces traditional “likes” with a gamified outfit grading system. Instead of liking a post, users rate each outfit on a 1–10 scale, and the creator’s post displays the average outfit score (for example, 9.2). This makes the product more interactive, more fashion-native, and more opinion-driven than generic short-form video platforms.
This MVP is intended as a side-project validation launch, focused on proving three things:
Users are willing to upload and watch fashion-specific short-form content.
Users engage with a grading mechanic instead of likes.
Users are interested in revealing outfit tags and clicking product links.

2. Product Vision & Objectives
Product Vision
Create the go-to social platform for discovering, rating, and shopping outfits through short-form video. 
Core Value Proposition
For creators, the app offers a new way to showcase style and receive meaningful feedback beyond likes.
For viewers, it provides a fun way to discover fashion, rate outfits, and instantly explore the items being worn.
For creators, it is a way to market clothes that they have put out on second-hand marketplace apps such as Sellpy and Vinted. It also collects all clothes from different apps into one single app to scroll clothes from multiple sources.
MVP Objectives
Launch a functional cross-platform mobile app for fashion video posting.
Enable authenticated users to upload outfit videos and tag clothing items.
Deliver an engagement-based feed of outfit videos.
Introduce a 1–10 grading mechanic as the primary social interaction.
Enable viewers to reveal clothing tags and open external product links.
Validate early retention, grading participation, and outbound click behavior.
Non-Objectives for MVP
The following are intentionally out of scope for the first version:
In-app monetization
Revenue-sharing with creators
Advanced creator analytics
In-app checkout
Affiliate automation
Human-heavy moderation workflows
Advanced editing tools
Brand dashboards
Multi-language support
Mainstream background music

3. Target Audience
Primary User Segment 1: Creators
Users who want to post outfit videos and build visibility around their style.
Examples:
Fashion enthusiasts
Micro-creators
Students and young adults interested in style
Everyday users who enjoy outfit-of-the-day content
Teenagers just finding out about fashion and style
Primary User Segment 2: Viewers / Consumers
Users who browse short-form fashion content for inspiration, entertainment, and product discovery.
Examples:
Fashion-conscious Gen Z and Millennial users
Users who enjoy rating and comparing styles
Users looking for outfit inspiration and shopping links
Initial Demographic Focus
Geography: Sweden
Language: English
Minimum age: 13+
Platform behavior: mobile-native, short attention span, scroll-heavy usage

4. Problem Statement
Current platforms such as TikTok and Instagram support fashion content, but fashion is not the primary product structure. Users can post outfits, but:
outfit pieces are often hard to identify,
shopping journeys are fragmented,
feedback is mostly limited to likes/comments,
there is no native system for structured outfit rating.
This app solves that by combining:
short-form fashion content,
mandatory item tagging,
direct product exploration,
gamified outfit grading.

5. User Personas
Persona A: Creator
A 21-year-old university student who enjoys posting daily outfits and wants more meaningful feedback than likes.
Needs:
easy upload flow,
outfit tagging,
visible score validation,
simple profile presence.
Persona B: Casual Viewer
An 18-year-old user who enjoys scrolling fashion content and rating looks for fun.
Needs:
fast feed,
easy grading,
clear outfit score,
lightweight interaction.
Persona C: Shopper
A 24-year-old user who uses fashion content to discover products and brands.
Needs:
visible tags,
direct link-outs,
confidence that links are safe.

6. User Stories
Creator User Stories
As a creator, I want to upload a short vertical video of my outfit so I can share my style.
As a creator, I want to tag each clothing item with a title and URL so viewers can explore what I’m wearing.
As a creator, I want my outfit to receive a visible average score so I can understand how people rate my look.
As a creator, I want my posted outfits to appear on my profile so other users can browse my content.
Viewer User Stories
As a viewer, I want to scroll through outfit videos continuously so discovery feels frictionless.
As a viewer, I want to grade an outfit from 1 to 10 so I can express my opinion.
As a viewer, I want to reveal the tagged items in a video so I can identify the outfit pieces.
As a viewer, I want to tap a tagged item and open the external brand/product page.
As a viewer, I want there to be only one active grade per user so scores feel fair, while still being able to revise my own rating.
Platform/Admin Stories
As the platform, I want to prevent duplicate grading from the same account on the same post.
As the platform, I want to block explicit or offensive content.
As the platform, I want to validate outbound links before allowing them to be published.

7. Core Features & Functional Requirements
7.1 Authentication & Onboarding
Requirements
Users must create an account before accessing the app.
Supported methods:
Email/password
Google sign-up / login
Minimum age must be 13+.
Users must accept Terms of Service and Privacy Policy during sign-up.
Email verification should be strongly preferred for abuse reduction.
MVP Notes
No anonymous browsing. This supports:
better moderation,
fairer grading,
anti-spam controls,
stronger community accountability.

7.2 Home Feed
Description
The home feed is the central experience of the app. It displays a vertically scrollable sequence of outfit videos.
Requirements
Full-screen vertical video feed
Infinite scroll behavior
Video autoplay on active item
Swipe up/down navigation
Display key metadata:
creator username
caption
visible average grade
button to grade
button to reveal tags
share/report options
Ranking Logic
Feed ranking should be engagement-based in MVP.
Initial ranking signals may include:
video completion rate,
number of grades submitted,
average outfit score,
click-through to tags,
recency,
report rate as a negative signal.
Rationale
This aligns with your decision that the app should feel like a fashion-only TikTok with gamified interaction.

7.3 Video Upload & Publishing Flow
Description
Creators upload or record a short-form video of their outfit and tag the items shown.
Requirements
Upload video from device
Optional in-app recording
Basic trim/crop support
Caption field
Mandatory clothing tagging before publishing
Publish button
Save draft button
Video Constraints
Recommended MVP constraints:
vertical orientation preferred
max length: 15–60 seconds
max file size limit enforced
accepted formats defined by engineering
Tagging Requirements
Each post must contain at least one clothing tag.
Each tag should include:
item name
category (e.g. shoes, jacket, pants, bag)
optional outbound URL
optional brand name
If an outbound URL is present, it must be validated and limited to safe `http://` or `https://` schemes.
UX Requirement
The tagging flow must be simple enough that a casual creator can finish it in under 1–2 minutes.
For MVP, the preferred compose flow keeps video selection, caption entry, and tag entry on one screen. Saving a draft should be a secondary fallback, not a mandatory navigation step.

7.4 Tag Reveal System
Description
Viewers can tap a “Reveal Items” button to display the tagged outfit pieces.
Requirements
“Reveal Items” CTA must be visible on the video screen
When tapped, show an overlay or bottom sheet listing the tagged items
Each item displays:
item name
brand name if available
outbound link button when a link exists
Tapping an item opens the external website in an in-app browser or external browser
MVP Rules
Links are manually entered by creators
No affiliate automation at launch
No in-app shopping cart
No price scraping required
Items without a link may still appear in Reveal Items but should be non-clickable.
Business Importance
This system validates whether fashion content can drive shopping behavior, even before monetization is enabled.

7.5 Outfit Grading System
Description
Instead of likes, users grade outfits on a 1–10 scale.
Requirements
Each authenticated user has one active grade for a specific outfit
Allowed values: integers 1 through 10
Public score displayed as average rating, rounded to one decimal place
Example visible score: 9.2
Users do not see rating distribution in MVP
Likes are not supported in MVP
Integrity Rules
no duplicate grades from same user on same post,
users may update their own existing grade,
anti-bot and rate-limiting rules apply,
suspicious grading behavior should be flagged.
Product Rationale
This is the app’s primary engagement mechanic and brand differentiator. It should feel:
simple,
fun,
competitive,
fair.

7.6 Profiles
Requirements
Each user profile should include:
profile photo
username
bio
posted outfit videos
follower/following counts if social graph is included in MVP
Recommendation
For MVP, keep profiles lightweight but include posted content history. Follow/following can be included if engineering capacity allows, but it is not essential to proving the core loop.

7.7 Reporting & Basic Moderation
Requirements
Users must be able to:
report a video,
report a profile,
report a link.
Report reasons should include:
offensive content
sexual/explicit content
harassment
spam
broken/malicious link
MVP Moderation Standard
The product should prohibit:
nudity / explicit sexual content
offensive/hate content
graphic violence
counterfeit promotion where legally risky
malicious or deceptive links
Moderation depth is TBD for MVP, but reporting capability is required from day one.

8. Security & Data Privacy Requirements
This section is critical.
8.1 Authentication Security
Passwords must never be stored in plain text.
Passwords must be hashed using strong modern hashing standards.
Secure session/token handling is required.
Google OAuth must use approved secure authentication flows.
Optional email verification should be implemented for trust and abuse prevention.
8.2 Data Encryption
All data in transit must be protected with HTTPS/TLS.
Sensitive user data must be encrypted at rest where applicable.
Access to production data must be restricted by role.
8.3 Privacy Compliance
GDPR
Because the initial market is Sweden, GDPR compliance is mandatory.
Requirements:
clear Privacy Policy,
lawful basis for data collection,
user consent where applicable,
ability to export/delete user data,
data minimization,
parental/age handling for 13+ users where legally relevant,
retention policy for user data and deleted content,
cookie/tracking disclosures if applicable.
CCPA/CPRA
Not required for initial Sweden-only MVP unless California residents are targeted, but architecture should be designed to support future compliance with:
data access rights,
deletion rights,
transparency around data sharing.
8.4 Content Moderation & Safety
All uploaded videos should pass basic automated screening where possible
Reported content must be reviewable by admins
Hashing or fingerprinting may be considered later for repeat abuse
Accounts with repeated violations should be suspendable
8.5 Outbound Link Safety
This is especially important because creators manually enter links.
Requirements:
validate URL format before publish,
block clearly malicious or non-http/https URLs,
maintain allow/block logic for unsafe domains,
optionally warn users before leaving app,
log outbound clicks for abuse analysis,
prevent javascript or disguised redirects.
8.6 Abuse Prevention
one active grade row per user per outfit,
rate limiting on grading and posting,
device/IP abuse detection where legally appropriate,
bot detection for suspicious account creation,
spam prevention in outbound links and captions.

9. Technical & Infrastructure Requirements
9.1 Product Architecture
Since this is a cross-platform MVP optimized for speed to market, the stack should prioritize fast iteration while avoiding dead-end decisions.
Recommended Approach
Mobile: React Native or Flutter
Backend/API: scalable cloud backend
Database: relational DB for users/posts/grades/tags
Storage: object storage for video assets
CDN: required for video delivery performance
React Native may be slightly more attractive for speed, ecosystem, and startup-style iteration, but either cross-platform route is valid.
9.2 Core Infrastructure Components
Authentication service
User service
Video upload/transcoding pipeline
Feed service
Tag/link service
Grading service
Moderation/reporting service
Analytics/event tracking
9.3 Data Model (High Level)
Core entities:
User
Profile
VideoPost
ClothingTag
Grade
Report
OutboundClick
9.4 Scalability Requirements
Even for an MVP, the system should be designed so that growth does not require a full rebuild.
Must support:
efficient feed reads,
high video bandwidth,
growing volume of grading writes,
async media processing,
CDN-backed media delivery.
9.5 Performance Requirements
app launch should feel fast,
feed videos should load with minimal delay,
grading action should complete near instantly,
tag reveal should open quickly,
publish flow should be resilient to upload failures.

10. Success Metrics (KPIs)
The MVP should be judged on validation, not revenue.
Acquisition
number of registered users
creator-to-viewer ratio
signup conversion rate
Engagement
daily active users (DAU)
weekly active users (WAU)
average session length
videos watched per session
grade participation rate
average number of grades per video
Content Supply
videos posted per day/week
percentage of new users who post at least one video
average number of tags per video
Commerce Intent
reveal-tags tap-through rate
outbound link click-through rate
percentage of videos generating at least one outbound click
Retention
Day 1 retention
Day 7 retention
creator repeat posting rate
Trust & Safety
report rate
moderation action rate
broken/malicious link rate
duplicate/fraudulent grade attempts blocked

11. MVP Scope Definition
In Scope
account creation
email/password + Google login
authenticated-only app access
video upload
mandatory tagging
vertical feed
engagement-based ranking
1–10 grading
average score display
reveal items flow
outbound links
profile page
reporting
basic moderation controls
GDPR-ready privacy foundations
Out of Scope
likes
comments
direct messages
creator analytics
affiliate revenue tracking
in-app checkout
advanced creator monetization
multi-language support
anonymous browsing
complex editing tools

12. Risks & Mitigations
Risk 1: Low content supply
If too few users post, the feed will feel empty.
Mitigation: seed content manually, recruit early creators, simplify upload flow.
Risk 2: Grading feels harsh or discouraging
A pure rating mechanic may discourage some creators.
Mitigation: keep UX stylish and playful, potentially add supportive feedback features later.
Risk 3: Unsafe or spammy links
Manual URLs create trust and security risk.
Mitigation: strong URL validation, blocklists, reporting, outbound warnings.
Risk 4: Moderation burden
Video platforms can quickly attract policy issues.
Mitigation: narrow category focus, clear rules, lightweight admin tools, reporting from day one.
Risk 5: Feed quality
Engagement-only ranking can amplify low-quality or manipulative behavior.
Mitigation: include negative signals such as reports, suspicious grading, and short watch times.

13. Roadmap Recommendation
Phase 1: MVP
auth
profile
upload
tags
feed
grading
outbound links
reporting
Phase 2: Validation Improvements
creator analytics
saved outfits
better feed personalization
improved moderation tooling
edit/delete post controls
follow system if not included in MVP
Phase 3: Monetization
affiliate integrations
click/revenue dashboard
creator revenue sharing
sponsored placements
brand partnerships

14. Launch Readiness Criteria
Before public MVP launch, the product should meet the following:
users can sign up and log in reliably,
videos upload and play correctly,
creators cannot publish without at least one tag,
users have one active grade per outfit and can update it,
average score displays correctly,
outbound links open safely,
report flow works,
privacy policy and terms are live,
GDPR basics are implemented,
app performance is acceptable on common devices.

15. Final Product Summary
This MVP is best understood as a fashion-only short-form social app with a gamified rating mechanic and product discovery layer.
Its strongest differentiators are:
fashion-specific short-form format,
mandatory outfit item tagging,
simple product exploration through outbound links,
1–10 grading instead of likes.
For an MVP, this is a strong and focused concept because it tests:
social behavior through scrolling and posting,
engagement behavior through grading,
commercial intent through tag reveals and outbound clicks.
