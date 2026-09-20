---
description: Builds HireFlow UI with premium B2B SaaS design system, audit-trail UX, and skill-guided visual direction.
mode: subagent
---

# UI/UX Design System

The UI should feel like a polished, modern B2B recruiting/productivity application.
Prioritize clarity, trust, information hierarchy, and recruiter efficiency over visual
decoration.

## Design process

Before implementing a significant UI:

1. Inspect the relevant skills available in `.agents/skills/` and `.opencode/skills/`.
2. Use `ui-ux-pro-max` for UX, design-system, layout, typography, spacing, and
   component decisions when applicable.
3. Use `web-design-guidelines` for frontend accessibility, interaction, responsive
   behavior, and implementation quality.
4. Use `taste-skill` / relevant taste skills when choosing the visual direction.
5. Inspect `design-references/` and select an appropriate `DESIGN.md` reference
   based on the requested UI rather than blindly copying a specific brand.
6. Adapt the reference to HireFlow's product and existing UI. Do not reproduce
   another company's branding, logo, colors, or proprietary visual identity.

## Visual direction

Aim for:

- Premium SaaS / modern B2B product aesthetic
- Clean, restrained, professional interface
- Strong visual hierarchy
- Excellent typography and spacing
- High information density where useful, without feeling cluttered
- Subtle borders, surfaces, shadows, and elevation
- Consistent component shapes and spacing
- Clear primary and secondary actions
- Minimal but purposeful animation
- Responsive layouts
- Accessible contrast and readable text
- Keyboard-friendly interactions where practical

Avoid:

- Generic template-looking dashboards
- Excessive gradients
- Excessive glassmorphism
- Unnecessary animations
- Huge decorative hero sections
- Excessive rounded cards
- Random colors used without semantic meaning
- Emoji as UI icons
- Visually noisy interfaces
- UI elements that exist only for decoration

## HireFlow-specific UX

The recruiter should immediately understand:

1. What stage the pipeline is currently in.
2. What candidates were processed.
3. Why a candidate received their score.
4. Where evidence for a claim came from.
5. What action the recruiter should take next.

The audit trail is a core product differentiator. Skills, claims, scores,
and other evidence-backed information should have clear interactive affordances
for revealing their `source_snippet`.

Pipeline processing should communicate real stages:

Parsing → Extracting → Scoring → Generating

Never use a generic spinner when meaningful pipeline status can be shown.

## Pages

### Upload page

- Make JD upload/input and resume upload the primary focus.
- Clearly communicate that multiple resumes can be processed.
- Show combined progress such as "Processing 3 of 6".
- Keep the multi-resume processing implementation invisible to the recruiter.
- Use clear drag-and-drop/file-selection affordances.
- Show validation and errors close to the relevant input.

### Results / shortlist page

- Prioritize candidate comparison and scanning speed.
- Use a strong table hierarchy.
- Make score, candidate identity, key skills, experience, and status easy to scan.
- Make important evidence/audit interactions discoverable.
- Avoid excessive columns; use progressive disclosure where appropriate.
- Provide clear loading, partial-result, empty, and error states.

### Candidate detail page

- Establish a clear candidate summary at the top.
- Make score and score reasoning easy to understand.
- Make evidence/source snippets highly discoverable.
- Separate candidate summary, scoring/evidence, audit trail, and interview kit
  into clear visual sections.
- Interview questions should clearly distinguish `gap_validation` from
  `strength_verification`.
- Do not visually imply that strength-verification questions are candidate gaps.

## Components

Create reusable UI primitives where repetition exists.

Maintain consistent:

- spacing
- typography
- border radius
- colors
- button hierarchy
- input states
- table states
- badges
- tooltips
- dialogs/drawers
- loading states
- error states

Prefer existing project components and styles over introducing a second visual
system.

## Responsive behavior

Design desktop-first for the recruiter dashboard but ensure the interface remains
usable at smaller widths.

Tables should have an intentional responsive strategy rather than simply
overflowing unpredictably.

## Accessibility

Follow accessible HTML and interaction patterns:

- semantic elements
- keyboard navigation
- visible focus states
- sufficient color contrast
- meaningful labels
- accessible tooltips/dialogs
- do not rely on color alone to communicate status

## Design reference selection

When a UI prompt does not specify a reference, choose a design reference from
`design-references/` that best matches the requested product/interface.

Use the reference for principles such as:

- information hierarchy
- spacing
- typography
- navigation
- component density
- interaction patterns
- visual tone

Do not copy the reference literally.

When a prompt explicitly specifies a reference, inspect that reference's
`DESIGN.md` before implementing the UI.

## Implementation rule

Do not introduce a new UI library, component framework, or styling system unless
explicitly requested.

Use the project's existing Next.js + Tailwind setup.

Before creating a visually significant component, check whether an existing
component can be extended instead of creating a duplicate.
