# Pilot page rewrite — 3 steps + submission form with file upload

Read this entire prompt before making any changes.

## Files to create or modify

1. **Modify:** `apps/site/app/pilot/page.tsx`
2. **Create:** `apps/site/app/api/pilot/route.ts`

## Governing rules

- Do not claim OTel support. The only data source is OpenClaw.
- Do not present future features (CPO, dashboards, governance) as current.
- Keep existing components: `CopyCommand`, `cn()`, Lucide icons, CSS variables, Tailwind v4, dark theme.
- The site uses Resend (already a dependency in `apps/site/package.json`). Use it for the form submission.

---

## Part 1: Rewrite `apps/site/app/pilot/page.tsx`

Replace the current page with a much shorter version. Three sections: hero, steps, form.

### Hero

Heading:
```
Xerg Pilot — OpenClaw waste audit
```

One-liner:
```
Install, run one audit, submit the results below. That's it.
```

Two CTAs:
- Primary: `Start the pilot →` (anchors to `#steps`)
- Secondary: `View npm package` (links to `https://www.npmjs.com/package/@xerg/cli`)

Subtext:
```
Free. No account. Works wherever your OpenClaw logs live. ~10 minutes.
```

No sidebar. No "what to expect." No "best fit." Cut all of that.

---

### Steps section (`id="steps"`)

Three steps only. Use a compact single-column layout — no 2-column grid. Each step gets a title, one sentence of body, and a `CopyCommand`.

Step 01:
- Title: `Install and check`
- Body: `Install globally, then confirm Xerg can see your OpenClaw logs.`
- Two commands stacked (two separate `CopyCommand` instances):
  - `npm install -g @xerg/cli`
  - `xerg doctor`

Step 02:
- Title: `Run the audit`
- Body: `Shows spend, structural waste, top drivers, and first recommended fix.`
- Command: `xerg audit`

Step 03:
- Title: `Submit your results`
- Body: `Export the report and upload it in the form below.`
- Command: `xerg audit --markdown > xerg-audit.md`
- Below the command, add a small note in dim text: `JSON works too: xerg audit --json > xerg-audit.json`

After the three steps, add a brief optional note styled in dim text:
```
Bonus: try one fix and run xerg audit --compare to see the before/after. Submit that report too if you have it.
```

---

### Submission form section (`id="submit"`)

Heading:
```
Send your results
```

Build a client component called `PilotForm` (can live inline in the page file or in `components/pilot-form.tsx` — your choice).

#### Form fields

1. **Email** — required. Use the same `Input` component from `@/components/ui/input`. Placeholder: `you@company.com`

2. **File upload** — required. Accept `.md`, `.json`, `.txt` files only. Max 1MB. Style it to match the dark theme. Show the selected filename after selection. Label: `Audit report (.md or .json)`

3. **Textarea** — optional. 3 rows. Placeholder: `What workflow did you test? Anything feel off?` Use a styled textarea matching the dark theme.

4. **Hidden field:** `source` with value `"pilot-form"`

5. **Submit button** — same accent style as the primary CTA elsewhere on the site. Label: `Submit pilot results →`. Show a loading spinner during submission (use `LoaderCircle` from lucide-react, same pattern as `SignupForm`).

#### States

- **Idle:** form visible
- **Submitting:** button shows spinner, fields disabled
- **Success:** replace form with a message: `Results received — I'll read them personally and follow up. Thank you.`
- **Error:** show error message below the button, keep form filled so they can retry

#### Submit handler

POST to `/api/pilot` as `FormData` (not JSON, because of the file). Handle the response.

---

### Founding tester callout

Below the form, keep this callout with accent-glow background:
```
Pilot participants will be credited as founding testers when Xerg goes public.
```

---

### Footer

Same as homepage:
```
Xerg — the unit economics engine for AI agents.
```
With GitHub and `jason@xerg.ai` links.

---

### Metadata

```ts
export const metadata: Metadata = {
  title: 'Xerg Pilot',
  description: 'Pilot invitation for OpenClaw users to test Xerg waste intelligence.',
};
```

---

## Part 2: Create `apps/site/app/api/pilot/route.ts`

This is a Next.js Route Handler that receives the form submission and emails it to jason@xerg.ai via Resend.

### Logic

1. Parse the incoming `FormData`:
   - `email` (string, required, validate as email)
   - `file` (File, required, validate: max 1MB, extension must be `.md`, `.json`, or `.txt`)
   - `notes` (string, optional)
   - `source` (string, should be `"pilot-form"`)

2. Read the file into a `Buffer`.

3. Send an email via Resend:
   - **From:** `Xerg Pilot <pilot@xerg.ai>` (or whatever sender domain is configured — check the existing waitlist route at `apps/site/app/api/waitlist/route.ts` for the correct from address pattern)
   - **To:** `jason@xerg.ai`
   - **Subject:** `Pilot submission from {email}`
   - **Body (text):** Include the email, the notes (if any), and the source field
   - **Attachments:** The uploaded file, using Resend's attachment API: `[{ filename: file.name, content: buffer }]`

4. Return `200 OK` with `{ success: true }` on success.

5. Return `400` with `{ error: "..." }` for validation failures.

6. Return `500` with `{ error: "Submission failed" }` if Resend throws.

### Reference

Look at `apps/site/app/api/waitlist/route.ts` for the existing Resend setup pattern (import, API key, from address). Follow the same style.

### Validation details

- Email: use zod or a basic regex — match whatever the waitlist route does
- File size: reject if `file.size > 1_048_576` (1MB)
- File extension: extract from `file.name`, reject if not `.md`, `.json`, or `.txt`
- If no file is attached, return 400

---

## After implementation

- [ ] Test the form locally with `pnpm --filter @xergai/site dev`
- [ ] Upload a real `.md` file and confirm the Resend email arrives with attachment
- [ ] Verify the page is scannable in under 15 seconds
- [ ] `pnpm typecheck` passes
- [ ] `pnpm lint` passes
- [ ] `pnpm build` passes
