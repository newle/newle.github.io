#!/usr/bin/env bash
repo_dir="$(pwd)"
exec 200>/tmp/newle_sync.lock
flock -n 200 || exit 0
branch="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo master)"
git checkout -q "$branch" || git checkout -q master
git config user.name "${GIT_USER_NAME:-AutoSync}"
git config user.email "${GIT_USER_EMAIL:-autosync@example.com}"
if git status --porcelain | grep -q .; then
  git add -A
  git commit -m "chore: autosync $(date -u +%Y-%m-%dT%H:%M:%SZ)"
fi
git fetch origin master || true
retries=3
i=0
while [ $i -lt $retries ]; do
  if git pull --rebase --autostash origin master; then
    if git push origin master; then
      exit 0
    fi
  else
    git rebase --abort || true
    if git push origin master --force-with-lease; then
      exit 0
    fi
  fi
  i=$((i+1))
  sleep 5
done
exit 1
