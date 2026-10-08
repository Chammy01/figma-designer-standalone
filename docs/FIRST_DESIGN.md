# Your first design

Open a new empty Figma design file, keep the development plugin and OpenCode open, and run `/figma/doctor` first. Enter slash commands in OpenCode chat.

```text
/figma/design

Create a clean personal portfolio landing page for a student designer.

Include:
- navigation
- hero
- three featured projects
- about
- contact call to action

Use a warm minimalist visual style.
Use clearly labeled sample copy rather than real personal details.
```

The result should have editable text, frames, and Auto Layout. Inspect the Figma layers and wording. Then copy:

```text
/figma/revise

Make the hero more compact and strengthen the typography hierarchy.
```

You can specify a section by name. The agent inspects that area and preserves unaffected content. A timed-out write may already have completed; ask for inspection and continuation of only missing work, never a blind full rerun.

Another beginner brief:

```text
/figma/design Create a small local library landing page with opening hours, featured books, membership information, and a contact section. Use calm editorial typography. Mark unknown facts as placeholders.
```

After the design is accepted, optional commands add states (`/figma/states`), supported interactions (`/figma/interactive`), motion checks (`/figma/motion`), and quality review (`/figma/qa`). Add real destinations and behavior to your brief rather than asking the system to invent them. Browser export is a later step; see [Commands](COMMANDS.md).
