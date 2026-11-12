# Evidence: the problem is real

## 1. AI images win photography contests

In April 2023, Boris Eldagsen won the Creative Open category of the **Sony World Photography Awards** with *Pseudomnesia: The Electrician*, an image made with AI. He then refused the prize on stage, saying competitions were not prepared for AI images. The organizer later said he had described it as "co-created" with AI.

- PetaPixel: https://petapixel.com/2023/04/14/artist-refuses-prize-after-his-ai-image-wins-at-top-photo-contest
- Engadget: https://www.engadget.com/german-artist-refuses-award-after-his-ai-image-wins-prestigious-photography-prize-071322551.html
- CBS News: https://www.cbsnews.com/news/artificial-intelligence-photo-competition-won-rejected-award-ai-boris-eldagsen-sony-world-photography-awards

**What APERTA changes:** a text-to-image result has no camera RAW file with a matching embedded preview, so the RAW check rejects it before any juror sees it, with the reason recorded on-chain.

## 2. AI detectors are not a reliable judge

Detectors produce false positives on genuine photographs. In a Bellingcat test, *AI or Not* labeled six of twenty real contest-winning photos (Canadian Geographic Photos of the Year) as AI-generated.

- Bellingcat: https://bellingcat.com/resources/2023/09/11/testing-ai-or-not-how-well-does-an-ai-image-detector-do-its-job
- DIY Photography on detector failures: https://www.diyphotography.net/?p=316917

**What APERTA changes:** the AI score is one signal. It rejects only together with empty camera metadata; on its own it can at most mark an entry "Needs review" for the organizer.

## 3. Stolen photos are hard to prove

Contest organizers usually discover a copied photo only when the real photographer complains, often after prizes are paid. The burden of proof sits on the victim.

**What APERTA changes:** every entry's SHA-256 and submission time are recorded on-chain, and its perceptual fingerprint joins a registry shared by all APERTA contests. A later copy (even cropped and recompressed) is flagged with the earliest owner's name and registration date.

## 4. Organizers can change the prize

Small contests announce a prize and pay late, less, or not at all.

**What APERTA changes:** the prize is deposited when the contest is created and can only leave through `finalize`, which pays the top three by the published split and returns any unused share to the organizer.
