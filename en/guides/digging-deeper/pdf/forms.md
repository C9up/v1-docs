# Forms

This guide covers interactive forms and flattening:

- Interactive forms
- Flattening

## Interactive forms

`formFields` lists a document's AcroForm fields in declaration order; `name` is
the fully qualified name — every ancestor's partial name joined with dots —
which is the name a field is filled in by.

```ts
const fields = await vellum.formFields(mandate)

const filled = await vellum.fillForm(mandate, {
  'insured.name': 'Amélie Durand',
  accepted: 'Yes',
  country: 'CH',
})

// Close it: the answers become ink, the fields go away
const closed = await vellum.flattenForm(filled)
```

Three details of PDF 32000-1 §12.7.3 this resolves for the caller:

- A field's type, flags and value are **inherited** down `/Parent`, so a field
  commonly declares none of them itself.
- A checkbox or radio's "on" state is chosen by the **document** (`/Yes`,
  `/On`, `/1`, …), not fixed by the spec. Those accepted states are reported in
  `options`; writing anything else leaves the control untouched.
- For a choice field, `options` reports the **exported** values rather than the
  labels, since the export value is what gets written back.

`fillForm` regenerates each filled field's **appearance stream**. That half is
the one that matters: most readers paint a field from its appearance, not from
its value, so a document filled without it opens looking empty while holding
every answer.

Refusals are loud rather than silent, because a filled document quietly missing
an answer is worse than a failure. An unknown field name (the error lists the
names that do exist), a read-only field, a value over the declared maximum
length — or over 64 KiB when the form declares none — a choice the form does
not offer and a checkbox state the document does not accept are all errors.

### How the text is laid out

A standard font is referenced without being embedded, so the reader lays the
text out with the **published widths**. Filling measures with those same
widths, which is what lets it place text where the reader will:

- The field's `/Q` is honoured — left, centred or right.
- A **multiline** field wraps at the width of its box, on top of any line
  breaks you write yourself.
- A `/DA` asking for size **0** — "whatever fits" — gets a size chosen by
  stepping down until the answer fits the box. The specification does not
  define what auto means, so this is a heuristic.
- A word too long for its line is **broken across lines** rather than left to
  run past the edge, where the appearance's bounding box would clip it away.

The widths are generated from the URW base-35 metrics and cross-checked against
published Adobe values in the tests, so a table that had drifted could not
reach a release.

## Flattening

A filled form is still a form: anyone who opens it can edit the answers back.
`flattenForm` closes it. Every widget's appearance becomes ordinary page
content, the widget annotations are removed, and the form itself is dropped.
What comes back looks the same and is no longer interactive.

Where each appearance lands follows §12.5.5: its `/BBox` is transformed by its
`/Matrix`, and the box that results is mapped onto the annotation's `/Rect`.
Painting at the rectangle's corner instead would misplace every appearance
whose form matrix is not the identity — which is most of the ones a real form
ships. The page's own content is wrapped in `q`/`Q` first, because a `cm`
outside any such pair is legal and never restored, and appended content would
otherwise inherit a transform it never asked for.

Three things it deliberately does not do:

- Annotations that are **not form widgets** — links, notes — are left where
  they are. Flattening removes the form, not the document's other furniture.
- A **hidden** widget is dropped without being painted. Making visible what a
  document hid is not preservation.
- A field holding a value that ships **no appearance to paint** is an error,
  not a silent erasure: the answer would vanish from a document that still
  looks complete.
