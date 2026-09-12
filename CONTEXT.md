# Ghim

Ghim helps Vietnamese learners retain useful English vocabulary encountered in real content through low-friction capture and scheduled review.

## Language

**Learner**:
A Vietnamese person around B1–B2 who regularly reads English content for a real study, work, or self-development goal and wants to understand useful vocabulary when encountering it again. The term describes behavior rather than occupation or age.
_Avoid_: End user, student (when referring to every learner)

**Capture**:
The learner intentionally saves a vocabulary encounter and its source context to Ghim while consuming English content.
_Avoid_: Import, create card, bookmark

**Vocabulary Encounter**:
An occurrence of a useful English word or phrase in an article, blog post, or study or work document, together with the context in which the Learner found it.
_Avoid_: Word entry, flashcard

**Learning Material**:
The contextually relevant meaning, pronunciation, examples, and recall prompts derived from a Vocabulary Encounter for later practice.
_Avoid_: Dictionary entry, card content

**Daily Review**:
A short, scheduled practice period in which the Learner recalls previously captured vocabulary without configuring the scheduler.
_Avoid_: Study session, deck management

**Core Learning Loop**:
The complete path from Capture through Learning Material to scheduled Daily Review and later recognition in real English content.
_Avoid_: Core features, flashcard workflow

**Free Core**:
Ghim's permanent commitment that the Core Learning Loop remains genuinely useful without payment, subject only to transparent Fair-use Limits on resource-consuming operations.
_Avoid_: Free trial, free beta

**Learner Data**:
The Learner's captures, decks, edits, learning history, review history, and derived personal progress. It remains exportable and deletable without a paid subscription.
_Avoid_: Ghim content, platform data

**Fair-use Limit**:
A transparent resource boundary that protects service sustainability without preventing Capture, due reviews, export, or access to existing Learner Data.
_Avoid_: Learning limit, paywall

**Successful Enrichment**:
One Capture for which Ghim has produced a usable set of Learning Material. Retries, provider fallbacks, and regeneration caused by system failure do not consume additional Learner quota.
_Avoid_: API call, generated card, token usage

**Enrichment Pending**:
A saved Capture that is safely retained but does not yet contain enough Learning Material to enter Daily Review. The Learner may wait for processing or complete it manually.
_Avoid_: Failed card, rejected capture

**Ghim Pro**:
The single paid subscription that adds scale, convenience, and personalization without making the Free Core less effective or restricting access to Learner Data.
_Avoid_: Premium tier, paid learner

**Starter Deck**:
A Ghim-curated vocabulary collection that lets a new Learner experience the Core Learning Loop before building a personal collection. Core Starter Decks are part of the Free Core.
_Avoid_: Marketplace deck, AI content pack

**Lexical Unit**:
An English word, phrasal verb, idiom, compound, or fixed expression treated as one learnable expression regardless of how many tokens it contains.
_Avoid_: Word, token, phrase (as the general term)

**Sense**:
One contextually distinct meaning of a Lexical Unit. Familiarity with one Sense does not imply familiarity with another Sense of the same spelling.
_Avoid_: Translation, definition

**Lexical Evidence**:
Versioned, source-attributed information about a Lexical Unit and its candidate Senses, pronunciation, forms, and licensing. It is shared evidence rather than Learner-owned material.
_Avoid_: Dictionary truth, vocabulary content

**Generated Enrichment**:
Model-produced candidate Learning Material grounded in a Vocabulary Encounter and Lexical Evidence, with its provider and generation provenance retained.
_Avoid_: AI truth, final card

**Vocabulary Item**:
A Learner-owned target representing one Lexical Unit in one Sense, linked to one or more Vocabulary Encounters and the Learning Material the Learner has accepted or edited.
_Avoid_: Word entry, flashcard, capture

**Practice Direction**:
The recall ability trained for a Vocabulary Item: Recognition by default, with Production enabled only when the Learner or deck explicitly chooses it.
_Avoid_: Card type, template

**Recognition**:
Recalling the contextually correct meaning when shown a Lexical Unit in context.
_Avoid_: Passive card, front-to-back

**Production**:
Recalling a Lexical Unit when shown its contextual meaning and a sentence with that unit omitted.
_Avoid_: Active card, reverse card

**Practice Prompt**:
The presentation of accepted Learning Material for one Practice Direction during a review. It is derived from the Vocabulary Item rather than an independently authored blob.
_Avoid_: Flashcard, card content

**Memory Track**:
The Learner's scheduling state and recall history for one Vocabulary Item in one Practice Direction, preserved independently of how its Practice Prompt is rendered.
_Avoid_: Card, progress

**Primary Encounter**:
The Learner-approved Vocabulary Encounter selected as the preferred source of a captured Vocabulary Item's Primary Context.
_Avoid_: Latest example, random context

**Primary Context**:
The stable, Learner-approved context used by a Vocabulary Item's scheduled Practice Prompts. It may come from a Vocabulary Encounter or from learner-written, curated, or generated material with its source type retained.
_Avoid_: Primary Encounter (when the context was not captured), random example

**Ready Item**:
A Vocabulary Item with a canonical Lexical Unit, POS, selected Sense, contextual Vietnamese meaning, Primary Context, valid Recognition prompt, and minimum provenance, making it eligible for Daily Review.
_Avoid_: Complete card, enriched word

**Deck**:
A collection used to organize Vocabulary Items without owning or duplicating their Memory Tracks. One Vocabulary Item may belong to multiple Decks.
_Avoid_: Learning state, card database

**Needs Confirmation**:
A Vocabulary Item state in which candidate Learning Material exists but the Sense, Lexical Unit boundary, or correction requires a short Learner decision before the item can become Ready.
_Avoid_: Enrichment Pending, failed item

**Archived Item**:
A reversible Vocabulary Item state that retains Learning Material, Vocabulary Encounters, and history while suspending all of its Memory Tracks.
_Avoid_: Deleted item, removed deck membership

**Surface Form**:
The exact inflected or written form of a Lexical Unit found in a Vocabulary Encounter and preserved in its Primary Context.
_Avoid_: Canonical form, lemma

**Deck Membership**:
The association placing one Vocabulary Item in a Deck without copying the item or its Memory Tracks. Removing it does not archive or delete the Vocabulary Item.
_Avoid_: Duplicate card, deck-owned item

**Review Outcome**:
The Learner's explicit judgment after attempting a Practice Prompt: Quên when recall failed before reveal, or Nhớ when recall succeeded. These map to the scheduler's Again and Good grades respectively.
_Avoid_: Difficulty button, interval choice, score

**Review Event**:
An immutable record of one scheduling-relevant Review Outcome, including the Memory Track's prior state, scheduling policy, timing, and resulting state. Corrections void or supersede events rather than silently rewriting them.
_Avoid_: Mutable review row, practice attempt

**Scheduler Policy**:
The versioned combination of scheduling algorithm, parameters, desired retention, and short-term rules used to project the next due time for a Memory Track.
_Avoid_: Deck settings, learner preference

**Due Track**:
A Memory Track whose scheduled review time has arrived. Overdue tracks remain due until honestly reviewed or explicitly suspended.
_Avoid_: Available card, today's deck

**Relearning Step**:
A short follow-up review scheduled after a failed Review Outcome before the Memory Track resumes its longer-term schedule.
_Avoid_: Retry button, punishment

**Learner Day**:
The calendar day determined in the Learner's IANA timezone and used for Daily Review completion and streak accounting.
_Avoid_: Server day, UTC day

**Daily Completion**:
The state reached when no Due Track remains due now or overdue for the Learner Day. A Relearning Step scheduled for later is shown separately and does not masquerade as completed work.
_Avoid_: Session ended, daily XP target

**Review Backlog**:
One or more overdue Memory Tracks. While a Review Backlog exists, Ghim prioritizes recovery and does not introduce new Vocabulary Items by default.
_Avoid_: Missed streak, failed learner

**Non-scheduling Practice**:
Optional practice performed before a Memory Track is due that does not create a Review Event, change memory state, or count toward streak and scheduler-derived rewards.
_Avoid_: Early review, bonus review

**At-risk Track**:
A Memory Track with repeated failed recall that should trigger repair of its Sense, Primary Context, or Practice Prompt before further scheduling. Persistent failure may pause the track without deleting Learner Data.
_Avoid_: Bad learner, deleted leech
