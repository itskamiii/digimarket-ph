// Flip this back to false once Supabase's egress quota resets (billing cycle renews
// ~Oct 6, 2026) or the plan is upgraded — whichever happens first. While true, App.tsx
// skips the whole product-driven site entirely and shows Maintenance.tsx instead, so
// nothing here ever tries to hit the (currently 402'd) Supabase API.
export const MAINTENANCE_MODE = true;
