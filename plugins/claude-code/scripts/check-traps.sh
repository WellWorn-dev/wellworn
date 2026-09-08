#!/usr/bin/env bash
# Advisory only: when a dependency manifest is about to change, print the known traps for the
# libraries named in it. Never blocks the edit (always exits 0), never sends file contents.
set -u
input=$(cat)
path=$(printf '%s' "$input" | sed -n 's/.*"file_path"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -1)
case "$path" in
  */package.json|*/pyproject.toml|*/requirements.txt|*/composer.json|*/Cargo.toml|*/go.mod|*/Gemfile) ;;
  *) exit 0 ;;
esac
command -v curl >/dev/null || exit 0
libs=$(printf '%s' "$input" | grep -oE '"(new_string|content)"[[:space:]]*:[[:space:]]*"[^"]{0,4000}' | grep -oE '"[a-z@][a-z0-9@/._-]{1,60}"[[:space:]]*:[[:space:]]*"[~^]?[0-9]' | grep -oE '^"[^"]+"' | tr -d '"' | sort -u | head -8)
[ -n "$libs" ] || exit 0
out=""
for lib in $libs; do
  resp=$(curl -fsS -m 4 "https://mcp.wellworn.dev/api/traps?library=$(printf '%s' "$lib" | sed 's/@/%40/g; s#/#%2F#g')" 2>/dev/null) || continue
  [ -n "$resp" ] && out="$out$resp
"
done
[ -n "$out" ] || exit 0
esc=$(printf '%s' "$out" | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()))' 2>/dev/null || printf '"%s"' "$(printf '%s' "$out" | tr '\n' ' ' | sed 's/"/\\"/g')")
printf '{"hookSpecificOutput":{"hookEventName":"PreToolUse","additionalContext":%s}}\n' "$esc"
exit 0
