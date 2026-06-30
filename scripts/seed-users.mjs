#!/usr/bin/env node

/**
 * Atlas — Supabase User Seeding Script
 *
 * Creates auth users in Supabase for all Trumbull team members.
 * Run with: node scripts/seed-users.mjs
 *
 * Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars.
 * The service role key (NOT the anon key) is needed for admin user creation.
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("❌ Missing environment variables.");
  console.error("   Set NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY");
  console.error("");
  console.error("   You can find the service role key in your Supabase dashboard:");
  console.error("   Settings → API → service_role key (secret)");
  console.error("");
  console.error("   Usage:");
  console.error("   SUPABASE_SERVICE_ROLE_KEY=your_key node scripts/seed-users.mjs");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ── User data from Users.xlsx ─────────────────────────────────────────────
const USERS = [
  { first: "Joe", last: "Vingle" },
  { first: "Stephanie", last: "Schermer" },
  { first: "Shawn", last: "Allen" },
  { first: "Shawn", last: "Walker" },
  { first: "Colin", last: "Snelson" },
  { first: "Colin", last: "Temnick" },
  { first: "Alison", last: "Walton" },
  { first: "Emily", last: "Huston" },
  { first: "Colette", last: "Nichols" },
  { first: "Michael", last: "Nichols" },
  { first: "Abhi", last: "Shah" },
  { first: "Sabin", last: "Maharjan" },
  { first: "Yi-Ting", last: "Tsan" },
  { first: "Derek", last: "Menzies" },
  { first: "Alex", last: "Velicer" },
  { first: "Michelle", last: "Lawson" },
  { first: "Michelle", last: "Purcell" },
  { first: "Rita", last: "Stringham" },
  { first: "Jennifer", last: "Laws" },
  { first: "Andrew", last: "Toms" },
];

// Stable hue generator — distributes colors evenly across the wheel
function hueForIndex(i, total) {
  return Math.round((i / total) * 360);
}

async function seedUsers() {
  console.log(`\n🚀 Seeding ${USERS.length} users into Supabase...\n`);

  let created = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < USERS.length; i++) {
    const { first, last } = USERS[i];

    // Handle hyphenated first names (Yi-Ting → YTsan)
    const firstClean = first.replace(/-/g, "");
    const firstInitial = first.charAt(0).toUpperCase();
    const email = `${firstInitial.toLowerCase()}${last.toLowerCase()}@trumbull.com`;
    const password = `${firstInitial}${last}@1`;
    const initials = `${firstInitial}${last.charAt(0).toUpperCase()}`;
    const fullName = `${first} ${last}`;
    const hue = hueForIndex(i, USERS.length);

    process.stdout.write(`  ${fullName.padEnd(22)} → ${email.padEnd(35)}`);

    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Skip email verification
      user_metadata: {
        full_name: fullName,
        initials,
        hue,
        role: "member",
      },
    });

    if (error) {
      if (error.message?.includes("already been registered")) {
        console.log("⏭  already exists");
        skipped++;
      } else {
        console.log(`❌ ${error.message}`);
        failed++;
      }
    } else {
      console.log(`✅ created (${data.user?.id?.slice(0, 8)}...)`);
      created++;
    }
  }

  console.log(`\n────────────────────────────────────────`);
  console.log(`  ✅ Created: ${created}`);
  console.log(`  ⏭  Skipped: ${skipped}`);
  console.log(`  ❌ Failed:  ${failed}`);
  console.log(`  📊 Total:   ${USERS.length}`);
  console.log(`────────────────────────────────────────\n`);

  // Print a reference table
  console.log("📋 Login Reference:\n");
  console.log("Name".padEnd(22) + "Email".padEnd(35) + "Password");
  console.log("─".repeat(75));
  for (const { first, last } of USERS) {
    const firstInitial = first.charAt(0).toUpperCase();
    const email = `${firstInitial.toLowerCase()}${last.toLowerCase()}@trumbull.com`;
    const password = `${firstInitial}${last}@1`;
    console.log(`${first} ${last}`.padEnd(22) + email.padEnd(35) + password);
  }
  console.log("");
}

seedUsers().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
