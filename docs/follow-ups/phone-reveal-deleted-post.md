# Phone reveal — deleted post (`fix/phone-reveal-deleted-post`, migrations 114 + 115, 2026-11-01)

From the PR review. Neither changes behaviour; both need a new migration, so they wait for the next change to
`get_contact_phone`.

## LOW — the function comment omits moderation
`COMMENT ON FUNCTION public.get_contact_phone(uuid)` (migration 115) says the post owner sees each freelancer who
proposed « unless the post is deleted ». The function also returns NULL while the post is hidden by moderation
(`jp.admin_hidden_at is not null`, unchanged since #113). Add « or hidden by moderation » the next time the comment
is rewritten.

## LOW — « on every order with them » describes the UI, not the function
Same comment: the function answers for a pair of accounts and checks that one qualifying order exists. « on every
order with them » is the effect on the order pages, not what the function computes. Reword with the item above.
