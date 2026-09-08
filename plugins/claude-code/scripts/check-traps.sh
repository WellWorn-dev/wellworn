#!/usr/bin/env bash
# Advisory only: before a package install command runs, or a dependency manifest is edited, print the
# known traps for the libraries involved. Never blocks (always exits 0), never sends file contents.
set -u
input=$(cat)
command -v curl >/dev/null || exit 0
libs=""
cmd=$(printf '%s' "$input" | sed -n 's/.*"command"[[:space:]]*:[[:space:]]*"\(.*\)".*/\1/p' | head -1)
if [ -n "$cmd" ]; then
  case "$cmd" in
    *"npm install"*|*"npm i "*|*"pnpm add"*|*"yarn add"*|*"bun add"*|*"pip install"*|*"uv add"*|*"composer require"*|*"cargo add"*) ;;
    *) exit 0 ;;
  esac
  libs=$(printf '%s' "$cmd" | sed 's/\\"/"/g' | tr ' ' '\n' | grep -E '^[@a-z][a-z0-9@/._-]{1,60}(@[~^]?[0-9][^ ]*)?$' | grep -vE '^(npm|pnpm|yarn|bun|pip|uv|composer|cargo|install|add|require|i|-D|--save-dev|--dev)$' | sed 's/@[~^]*[0-9].*$//' | sort -u | head -8)
else
  path=$(printf '%s' "$input" | sed -n 's/.*"file_path"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -1)
  case "$path" in
    */package.json|*/pyproject.toml|*/requirements.txt|*/composer.json|*/Cargo.toml|*/go.mod|*/Gemfile) ;;
    *) exit 0 ;;
  esac
  libs=$(printf '%s' "$input" | grep -oE '"(new_string|content)"[[:space:]]*:[[:space:]]*"[^"]{0,4000}' | grep -oE '"[a-z@][a-z0-9@/._-]{1,60}"[[:space:]]*:[[:space:]]*"[~^]?[0-9]' | grep -oE '^"[^"]+"' | tr -d '"' | sort -u | head -8)
fi
[ -n "$libs" ] || exit 0
out=""
for lib in $libs; do
  resp=$(curl -fsS -m 4 "https://mcp.wellworn.dev/api/traps?library=$(printf '%s' "$lib" | sed 's/@/%40/g; s#/#%2F#g')" 2>/dev/null) || continue
  [ -n "$resp" ] && out="$out$resp
"
done
[ -n "$out" ] || exit 0
esc=$(printf '%s' "$out" | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()))' 2>/dev/null) || exit 0
printf '{"hookSpecificOutput":{"hookEventName":"PreToolUse","additionalContext":%s}}\n' "$esc"
exit 0
