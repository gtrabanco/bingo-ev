# Copywriting

## Writing style

- **Language: Spanish (es-ES) for all UI strings.** Code comments stay in English.
- **Tone: dry-sarcastic ("humor seco")** — resigned, deadpan, complicit with the
  long-suffering EV driver. **Never edgy, cruel, or punching down.** The joke is the
  situation, never a person or a company.
- **No brand names anywhere** — no charger networks, no car makers — in situations or
  copy. Situations are 100% generic ("aquí no se señala a nadie").
- Person/voice: speak to the player directly and informally (tú). Short, punchy lines.
- Sentence case for body; the title/section eyebrows use uppercase as a stylistic device
  (e.g. "GRAN SORTEO NACIONAL DE LA RECARGA").

## Patterns

Reusable wording already established (match the register when adding more):

- **Win moments**: "¡Línea! Enhorabuena, supongo." · "Cartón completo. Era cuestión de
  tiempo." · honorifics «Resignado Sufridor» / «Granujilla» / «Sinvergüenza».
- **Expiry**: a "CADUCADO" rubber stamp; "Caduca el <fecha>." / "Caducó el <fecha>. Toca
  regenerar."
- **Groups**: "Solo el primero en completar canta bingo. Los demás, a aplaudir." ·
  membership/kick copy reassures the cartón is never deleted ("No se borra: solo deja de
  jugar en el grupo.").
- **Mark modes**: Sinvergüenza / Mixto / Resignado EV, each with a one-line hint
  (e.g. "Un toque: la sufriste. Doble toque: la causaste tú, sinvergüenza.").
- **Tesla CTA**: "¿Pensando en comprar un Tesla?" — must not imply unequal benefit
  ("ganamos los dos por igual"). The raw referral code is hidden (0 engagement when shown).
- **Privacy disclaimer** at every email field, linking to `/privacidad`.

## Situations pool

All card content is in `src/data/situations.json` (`{ id, text }`). New entries must keep
the tone, stay generic (no brands), and be self-contained one-liners. The pool is the
single source of truth — never hardcode situation text elsewhere.
