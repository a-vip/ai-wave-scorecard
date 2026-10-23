# Subdomain decision

**Recommendation: `aiwave.aviperera.com`**

## How the options compare

| Candidate | Verdict | Why |
|---|---|---|
| **aiwave.aviperera.com** | **Best** | Matches the product itself ("AI Wave Scorecard", "Where are you on the AI wave?"). Easy to say aloud and remember. Leaves room for the site to grow (cohort page, trends, community) without the name becoming wrong. |
| scorecard.aviperera.com | Good runner-up | Descriptive, but generic: "scorecard" could mean credit, sports or business. It also uses up a generic name you may want for a different tool later. |
| metalearning.aviperera.com | Good if the brand shifts | The site's own header says "MetaLearning AI". Pick this if the cohort/brand, not the quiz, becomes the main thing. |
| aiscorecard.aviperera.com | OK | Keyword-rich but 13 characters, redundant ("AI" + score), typo-prone and awkward to say. |
| wave.aviperera.com | Weak | Short, but ambiguous (audio? ocean? greeting?) and drops the "AI" that gives it meaning. |
| ais.aviperera.com | Avoid | Reads as "AIs" or a person's name, says nothing about the product, and is hard to share verbally. |

## Checks done

- DNS lookup for all candidates above: **no existing records**, so all are free under `aviperera.com`.
- Nothing in the app is hard-wired to a domain. The canonical, social-share and sitemap URLs come from `NEXT_PUBLIC_SITE_URL`, so changing your mind later is a one-variable change.

## If you later buy a standalone domain

Keep the subdomain alive as a permanent (301) redirect to the new domain so existing links and search results carry over. Update `NEXT_PUBLIC_SITE_URL` and redeploy.

## Honest caveat

Search engines generally treat a subdomain as somewhat separate from the main site, so it won't automatically share the main site's search authority. That's a fair trade for being able to host a separate app. Link to the scorecard prominently from `aviperera.com` to pass visitors (and some authority) across.
